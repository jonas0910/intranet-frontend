import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { DesignSystemService } from '../../services/design-system.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss'
})
export class PerfilComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  perfilForm: FormGroup;
  passwordForm: FormGroup;
  isLoading = false;
  isEditing = false;
  isPasswordChanging = false;
  isSettingDepartment = false;
  /** Departamento operativo persistido (`department_id` / empleado Planillas). */
  establishedDepartmentId = '';
  /** Selección actual del combo (puede diferir hasta pulsar «Establecer departamento»). */
  selectedDepartmentId = '';
  message = '';
  messageType = 'info';
  private destroy$ = new Subject<void>();

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private fb: FormBuilder,
    private designSystem: DesignSystemService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.perfilForm = this.fb.group({
      nombres: [{value: '', disabled: true}, [Validators.required, Validators.minLength(2)]],
      apellidos: [{value: '', disabled: true}, [Validators.required, Validators.minLength(2)]],
      email: [{value: '', disabled: true}, [Validators.required, Validators.email]],
      cargo: [{value: '', disabled: true}],
      departamento: [{value: '', disabled: true}],
      telefono: [{value: '', disabled: true}, [Validators.pattern(/^$|^[\d\s\-\+\(\)]+$/)]],
      direccion: [{value: '', disabled: true}],
      fecha_nacimiento: [{value: '', disabled: true}],
      genero: [{value: '', disabled: true}],
      estado_civil: [{value: '', disabled: true}],
      fecha_ingreso: [{value: '', disabled: true}],
      foto: [{value: '', disabled: true}]
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required, Validators.minLength(6)]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    this.loadUserProfile();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUserProfile(): void {
    // Cargar desde almacenamiento local inicialmente
    this.currentUser = this.authService.getCurrentUser();
    if (this.currentUser) {
      console.log('🔎 PerfilComponent: Usuario cargado desde localStorage', this.currentUser);
      this.syncDepartmentSelectionFromUser();
      this.populateForm();
    } else {
      console.log('🔎 PerfilComponent: No hay usuario en localStorage, se intentará cargar desde backend');
    }

    // Siempre intentar refrescar desde el backend
    this.apiService.getProfileData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ PerfilComponent: Datos de perfil desde backend', response);
          const backendUser = (response as any)?.data?.user;
          if (backendUser) {
            this.currentUser = backendUser;
            // Actualizar usuario en AuthService para mantener consistencia
            this.authService.updateCurrentUser(backendUser);
            this.syncDepartmentSelectionFromUser();
            this.populateForm();
          }
        },
        error: (error) => {
          console.error('❌ PerfilComponent: Error al obtener perfil desde backend', error);
        }
      });
  }

  /** Prioridad: `user.department` (asignación en BD) → employee → empleado legacy. */
  private resolveDepartmentLabel(u: any): string {
    if (!u) {
      return '';
    }
    const ud = u.department;
    if (ud && (ud.nombre || ud.name)) {
      return String(ud.nombre ?? ud.name ?? '').trim();
    }
    if (u.employee?.department?.name) {
      return String(u.employee.department.name).trim();
    }
    if (u.empleado?.departamento?.nombre) {
      return String(u.empleado.departamento.nombre).trim();
    }
    return '';
  }

  /** Valor texto del campo departamento en el formulario (lista completa si hay varias fuentes). */
  private resolveDepartmentFormValue(u: any): string {
    const list = this.assignedDepartments;
    if (this.showDepartmentsCombo) {
      const id = this.establishedDepartmentId;
      if (id) {
        const hit = list.find((d) => d.id === id);
        if (hit) {
          return hit.label;
        }
      }
      return this.resolveDepartmentLabel(u);
    }
    if (list.length > 0) {
      return list.map((d) => d.label).join(', ');
    }
    return this.resolveDepartmentLabel(u);
  }

  /** Sincroniza combo y `establishedDepartmentId` con el usuario cargado. */
  syncDepartmentSelectionFromUser(): void {
    const u = this.currentUser as any;
    const raw = u?.department_id ?? u?.employee?.department?.id;
    const id = raw != null && raw !== '' ? String(raw) : '';
    this.establishedDepartmentId = id;
    if (!this.showDepartmentsCombo) {
      return;
    }
    if (id && this.assignedDepartments.some((d) => d.id === id)) {
      this.selectedDepartmentId = id;
      return;
    }
    if (this.assignedDepartments.length > 0) {
      this.selectedDepartmentId = this.assignedDepartments[0].id;
      return;
    }
    this.selectedDepartmentId = '';
  }

  get showEstablishDepartmentButton(): boolean {
    return (
      this.showDepartmentsCombo &&
      !!this.selectedDepartmentId &&
      this.selectedDepartmentId !== this.establishedDepartmentId
    );
  }

  get activeDepartmentLabel(): string {
    const id = this.establishedDepartmentId;
    if (id) {
      const hit = this.assignedDepartments.find((d) => d.id === id);
      if (hit) {
        return hit.label;
      }
    }
    return this.resolveDepartmentLabel(this.currentUser as any) || '—';
  }

  establishActiveDepartment(): void {
    const id = parseInt(this.selectedDepartmentId, 10);
    if (!id || Number.isNaN(id)) {
      return;
    }
    this.isSettingDepartment = true;
    this.message = '';
    this.apiService
      .setActiveDepartment(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const user = (res as any)?.data?.user;
          if (res.success && user) {
            this.currentUser = user;
            this.authService.updateCurrentUser(user);
            this.syncDepartmentSelectionFromUser();
            this.populateForm();
            this.message = 'Departamento operativo actualizado correctamente.';
            this.messageType = 'success';
          } else {
            this.message = res.message || 'No se pudo actualizar el departamento.';
            this.messageType = 'error';
          }
        },
        error: (err) => {
          const msg =
            err?.error?.errors?.department_id?.[0] ||
            err?.error?.message ||
            'No se pudo actualizar el departamento.';
          this.message = msg;
          this.messageType = 'error';
        },
        complete: () => {
          this.isSettingDepartment = false;
        }
      });
  }

  /** Empleado Planillas (`employees`): Laravel suele serializarlo como `empleado` con first_name/last_name. */
  private isPlanillasEmployeeShape(e: any): boolean {
    return !!e && typeof e === 'object' && ('first_name' in e || 'last_name' in e);
  }

  private formatDateForInput(v: unknown): string {
    if (v == null || v === '') {
      return '';
    }
    const s = String(v);
    return s.length >= 10 ? s.substring(0, 10) : s;
  }

  private patchFormFromPlanillasEmployee(u: any, e: any): void {
    this.perfilForm.patchValue({
      nombres: (e.first_name || '').trim() || (e.full_name ? String(e.full_name).trim().split(/\s+/)[0] : '') || '',
      apellidos: (e.last_name || '').trim() || '',
      email: u.email || e.email || '',
      cargo: e.position?.name || '',
      departamento: this.resolveDepartmentFormValue(u),
      telefono: e.phone || '',
      direccion: e.address || '',
      fecha_nacimiento: this.formatDateForInput(e.birth_date),
      genero: e.gender || '',
      estado_civil: e.marital_status || '',
      fecha_ingreso: this.formatDateForInput(e.hire_date),
      foto: e.photo || ''
    });
  }

  private populateForm(): void {
    const u: any = this.currentUser as any;
    if (!u) {
      return;
    }

    // Preferir `empleado` si es fila Planillas (PUT / relación Laravel = datos completos en BD).
    // `employee` del login suele traer solo un subconjunto; si va primero, vacía dirección/fecha/género.
    let planillas: any = null;
    if (u.empleado && this.isPlanillasEmployeeShape(u.empleado)) {
      planillas = u.empleado;
    } else if (u.employee) {
      planillas = u.employee;
    }
    if (planillas) {
      this.patchFormFromPlanillasEmployee(u, planillas);
      return;
    }

    // Legado Notaria: nombres / apellidos en español
    if (u.empleado) {
      const empleado = u.empleado;
      this.perfilForm.patchValue({
        nombres: empleado.nombres || '',
        apellidos: empleado.apellidos || '',
        email: u.email || '',
        cargo: empleado.cargo || '',
        departamento: this.resolveDepartmentFormValue(u),
        telefono: empleado.telefono || '',
        direccion: empleado.direccion || '',
        fecha_nacimiento: empleado.fecha_nacimiento || '',
        genero: empleado.genero || '',
        estado_civil: empleado.estado_civil || '',
        fecha_ingreso: empleado.fecha_ingreso || '',
        foto: empleado.foto || ''
      });
      return;
    }

    console.warn('⚠️ PerfilComponent: No se encontró información de empleado/employee en el usuario');
  }

  private passwordMatchValidator(form: FormGroup): {[key: string]: any} | null {
    const newPassword = form.get('newPassword');
    const confirmPassword = form.get('confirmPassword');
    
    if (newPassword && confirmPassword && newPassword.value !== confirmPassword.value) {
      return { 'passwordMismatch': true };
    }
    return null;
  }

  toggleEdit(): void {
    this.isEditing = !this.isEditing;
    
    if (this.isEditing) {
      // Enable form controls for editing
      this.perfilForm.get('nombres')?.enable();
      this.perfilForm.get('apellidos')?.enable();
      this.perfilForm.get('email')?.enable();
      this.perfilForm.get('telefono')?.enable();
      this.perfilForm.get('cargo')?.enable();
      if (!this.showDepartmentsCombo) {
        this.perfilForm.get('departamento')?.enable();
      } else {
        this.perfilForm.get('departamento')?.disable();
      }
      this.perfilForm.get('direccion')?.enable();
      this.perfilForm.get('fecha_nacimiento')?.enable();
      this.perfilForm.get('genero')?.enable();
      this.perfilForm.get('estado_civil')?.enable();
    } else {
      // Disable form controls for read-only mode
      this.perfilForm.get('nombres')?.disable();
      this.perfilForm.get('apellidos')?.disable();
      this.perfilForm.get('email')?.disable();
      this.perfilForm.get('telefono')?.disable();
      this.perfilForm.get('cargo')?.disable();
      this.perfilForm.get('departamento')?.disable();
      this.perfilForm.get('direccion')?.disable();
      this.perfilForm.get('fecha_nacimiento')?.disable();
      this.perfilForm.get('genero')?.disable();
      this.perfilForm.get('estado_civil')?.disable();
      
      this.syncDepartmentSelectionFromUser();
      this.populateForm(); // Restaurar valores originales
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // En un entorno real, aquí subirías el archivo al servidor
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.perfilForm.patchValue({ foto: e.target.result });
      };
      reader.readAsDataURL(file);
    }
  }

  saveProfile(): void {
    if (!this.perfilForm.valid) {
      this.perfilForm.markAllAsTouched();
      this.message = 'Complete o corrija los campos obligatorios antes de guardar.';
      this.messageType = 'error';
      return;
    }

    this.isLoading = true;
    this.message = '';

    const raw = this.perfilForm.getRawValue();
    const cu: any = this.currentUser;
    const userId = cu?.id;

    const updatePayload: any = {
      name: `${raw.nombres || ''} ${raw.apellidos || ''}`.trim(),
      email: raw.email || cu?.email
    };

    // Misma lógica que populateForm: Planillas puede venir solo como `empleado` en JSON (sin clave `employee`).
    const planillasRef =
      cu?.employee || (cu?.empleado && this.isPlanillasEmployeeShape(cu.empleado) ? cu.empleado : null);

    if (planillasRef) {
      updatePayload.employee = {
        first_name: (raw.nombres || '').trim(),
        last_name: (raw.apellidos || '').trim(),
        phone: (raw.telefono || '').trim() || null,
        email: (raw.email || '').trim() || null,
        address: (raw.direccion || '').trim() || null,
        birth_date: raw.fecha_nacimiento || null,
        gender: raw.genero || null,
        marital_status: raw.estado_civil || null
      };
    } else if (cu?.empleado) {
      updatePayload.empleado = {
        id: cu.empleado?.id,
        codigo_empleado: cu.empleado?.codigo_empleado,
        nombres: raw.nombres,
        apellidos: raw.apellidos,
        cargo: raw.cargo,
        telefono: raw.telefono,
        direccion: raw.direccion,
        fecha_nacimiento: raw.fecha_nacimiento,
        genero: raw.genero,
        estado_civil: raw.estado_civil,
        fecha_ingreso: raw.fecha_ingreso,
        foto: raw.foto
      };
    }

    this.apiService.updateProfile(userId, updatePayload).subscribe({
      next: (response) => {
        if (response.success) {
          this.message = 'Perfil actualizado exitosamente';
          this.messageType = 'success';
          this.isEditing = false;
          const updated = (response as any)?.data;
          if (updated && typeof updated === 'object' && updated.id) {
            this.mergeUserFromServerResponse(updated);
          } else {
            this.updateLocalUser(updatePayload);
          }
          this.syncDepartmentSelectionFromUser();
          this.populateForm();
        } else {
          this.message = response.message || 'Error al actualizar el perfil';
          this.messageType = 'error';
        }
      },
      error: (error) => {
        const msg =
          error?.error?.errors &&
          Object.values(error.error.errors).flat().join(' ');
        this.message =
          msg || error?.error?.message || 'Error de conexión al guardar el perfil.';
        this.messageType = 'error';
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  /** Tras PUT usuarios/:id, el backend devuelve el modelo User actualizado. */
  private mergeUserFromServerResponse(serverUser: any): void {
    const su: any = { ...serverUser };
    const em = su.empleado ?? su.employee;
    if (em && typeof em === 'object') {
      const full = { ...em };
      su.empleado = full;
      su.employee = { ...full };
    }
    this.currentUser = { ...this.currentUser, ...su } as User;
    this.authService.updateCurrentUser(this.currentUser);
  }

  private updateLocalUser(profileData: any): void {
    if (this.currentUser) {
      const u: any = this.currentUser;
      u.name = profileData?.name ?? u.name;
      u.email = profileData?.email ?? u.email;

      if (u.empleado && profileData?.empleado) {
        u.empleado = { ...u.empleado, ...profileData.empleado };
      }
      if (u.employee && profileData?.employee) {
        const pe = profileData.employee;
        u.employee = {
          ...u.employee,
          first_name: pe.first_name,
          last_name: pe.last_name,
          full_name: [pe.first_name, pe.last_name].filter(Boolean).join(' ').trim(),
          phone: pe.phone,
          email: pe.email ?? u.employee.email,
          address: pe.address ?? u.employee.address,
          birth_date: pe.birth_date ?? u.employee.birth_date,
          gender: pe.gender ?? u.employee.gender,
          marital_status: pe.marital_status ?? u.employee.marital_status
        };
        if (u.empleado && this.isPlanillasEmployeeShape(u.empleado)) {
          u.empleado = { ...u.empleado, ...u.employee };
        }
      }

      this.authService.updateCurrentUser(this.currentUser);
    }
  }

  changePassword(): void {
    if (this.passwordForm.valid) {
      this.isPasswordChanging = true;
      this.message = '';

      const userId = (this.currentUser as any)?.id;
      const passwordData = {
        current_password: this.passwordForm.value.currentPassword,
        new_password: this.passwordForm.value.newPassword
      };

      this.apiService.changePassword(userId, passwordData).subscribe({
        next: (response) => {
          if (response.success) {
            this.message = 'Contraseña cambiada exitosamente';
            this.messageType = 'success';
            this.passwordForm.reset();
          } else {
            this.message = response.message || 'Error al cambiar la contraseña';
            this.messageType = 'error';
          }
        },
        error: (error) => {
          this.message = 'Error de conexión. Intenta más tarde.';
          this.messageType = 'error';
        },
        complete: () => {
          this.isPasswordChanging = false;
        }
      });
    }
  }

  getErrorMessage(controlName: string): string {
    const control = this.perfilForm.get(controlName);
    if (control?.errors) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      if (control.errors['email']) return 'Email inválido';
      if (control.errors['pattern']) return 'Formato inválido';
    }
    return '';
  }

  getPasswordErrorMessage(controlName: string): string {
    const control = this.passwordForm.get(controlName);
    if (control?.errors) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
    }
    return '';
  }

  getPasswordMismatchError(): string {
    if (this.passwordForm.errors?.['passwordMismatch']) {
      return 'Las contraseñas no coinciden';
    }
    return '';
  }

  /** Configuración global del design system (Mi Perfil no pertenece a un subsistema). */
  get cv() {
    return this.designSystem.crudView;
  }

  /**
   * Departamentos / áreas distintas asignadas al usuario (usuario, empleado Planillas, legacy, trámite).
   * Se deduplica por id.
   */
  get assignedDepartments(): Array<{ id: string; label: string }> {
    const u = this.currentUser as any;
    if (!u) {
      return [];
    }
    const byId = new Map<string, string>();

    const add = (id: unknown, label: unknown) => {
      if (id === null || id === undefined || id === '') {
        return;
      }
      const text = String(label ?? '')
        .trim();
      if (!text) {
        return;
      }
      const key = String(id);
      if (!byId.has(key)) {
        byId.set(key, text);
      }
    };

    const ud = u.department;
    if (ud?.id != null) {
      add(ud.id, ud.nombre ?? ud.name);
    }
    if (u.employee?.department?.id != null) {
      add(u.employee.department.id, u.employee.department.name);
    }
    if (u.empleado?.departamento?.id != null) {
      add(u.empleado.departamento.id, u.empleado.departamento.nombre);
    }
    if (Array.isArray(u.areas_tramite)) {
      for (const a of u.areas_tramite) {
        if (a?.id != null) {
          add(a.id, a.nombre);
        }
      }
    }

    return Array.from(byId.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }

  /** Más de un departamento/área asignada: combo para elegir el operativo. */
  get showDepartmentsCombo(): boolean {
    return this.assignedDepartments.length > 1;
  }

  /** Departamento mostrado en tarjeta y formulario (prioriza asignación en usuario). */
  get departmentLabel(): string {
    const list = this.assignedDepartments;
    if (list.length === 0) {
      const label = this.resolveDepartmentLabel(this.currentUser as any);
      return label || '—';
    }
    if (list.length <= 1) {
      return list.map((d) => d.label).join(', ');
    }
    return '';
  }

  /** Nombres de todos los roles asignados (separados por coma). */
  get userRolesLabel(): string {
    const u = this.currentUser as any;
    const detail = u?.roles_detail as Array<{ name: string }> | undefined;
    if (detail?.length) {
      return detail.map((r) => r.name).join(', ');
    }
    const roles = u?.roles;
    if (Array.isArray(roles) && roles.length) {
      return roles.map((r: any) => (typeof r === 'string' ? r : r?.name)).filter(Boolean).join(', ');
    }
    return 'Sin rol asignado';
  }

  /**
   * Guard Spatie asociado a los roles («tipo» de aplicación del rol, p. ej. web).
   * Si hay varios guards distintos, se listan separados por coma.
   */
  get userRolesGuardLabel(): string {
    const u = this.currentUser as any;
    const detail = u?.roles_detail as Array<{ guard_name?: string }> | undefined;
    if (!detail?.length) {
      return '—';
    }
    const guards = [...new Set(detail.map((r) => (r.guard_name || 'web').trim()).filter(Boolean))];
    return guards.length ? guards.join(', ') : '—';
  }

  /** Nombre para mostrar en la tarjeta (empleado legacy, módulo Planillas o usuario). */
  get profileDisplayName(): string {
    const u = this.currentUser as any;
    if (u?.employee) {
      const e = u.employee;
      const full = e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ');
      if (full) {
        return full;
      }
    }
    if (u?.empleado && this.isPlanillasEmployeeShape(u.empleado)) {
      const e = u.empleado;
      const full = e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ');
      if (full) {
        return full;
      }
    }
    if (u?.empleado?.nombres || u?.empleado?.apellidos) {
      return `${u.empleado.nombres || ''} ${u.empleado.apellidos || ''}`.trim();
    }
    return u?.name || 'Usuario';
  }

  /** Texto «Acerca de Mí»: Planillas usa `address` / `phone` / `hire_date`. */
  get aboutMeAddressLabel(): string {
    const u = this.currentUser as any;
    const s = (u?.empleado?.address ?? u?.employee?.address ?? u?.empleado?.direccion ?? '') as string;
    return String(s).trim();
  }

  get aboutMePhoneLabel(): string {
    const u = this.currentUser as any;
    const s = (u?.empleado?.phone ?? u?.employee?.phone ?? u?.empleado?.telefono ?? '') as string;
    return String(s).trim();
  }

  get aboutMeHireDateLabel(): string {
    const u = this.currentUser as any;
    const raw = u?.empleado?.hire_date ?? u?.employee?.hire_date ?? u?.empleado?.fecha_ingreso;
    if (raw == null || raw === '') {
      return '';
    }
    const iso = this.formatDateForInput(raw);
    if (!iso) {
      return '';
    }
    try {
      const d = new Date(iso + 'T12:00:00');
      return isNaN(d.getTime()) ? iso : d.toLocaleDateString('es-PE');
    } catch {
      return iso;
    }
  }
}
