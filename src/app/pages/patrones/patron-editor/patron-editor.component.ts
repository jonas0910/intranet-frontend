import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PatternService, SistemaPattern, MenuPattern, SubMenuPattern } from '../../../services/pattern.service';
import { NotificationService } from '../../../services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-patron-editor',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './patron-editor.component.html',
  styleUrls: ['./patron-editor.component.css']
})
export class PatronEditorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Propiedades
  patronForm!: FormGroup;
  isEditing = false;
  patronId: string | null = null;
  loading = false;
  saving = false;
  previewMode = false;
  
  // Opciones disponibles
  categorias = ['gestión_interna', 'finanzas', 'logistica', 'comercial'];
  prioridades = ['alta', 'media', 'baja'];
  providersSSO = ['saml2', 'oauth2', 'basic'];
  iconosDisponibles = [
    'fas fa-users', 'fas fa-money-bill-wave', 'fas fa-graduation-cap',
    'fas fa-file-invoice', 'fas fa-chart-line', 'fas fa-boxes',
    'fas fa-exchange-alt', 'fas fa-bell', 'fas fa-user-tie',
    'fas fa-shopping-cart', 'fas fa-chart-bar', 'fas fa-truck',
    'fas fa-file-contract', 'fas fa-cogs', 'fas fa-database'
  ];

  constructor(
    private fb: FormBuilder,
    private patternService: PatternService,
    private notificationService: NotificationService,
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadPatronData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicializar formulario
  initializeForm(): void {
    this.patronForm = this.fb.group({
      id: ['', [Validators.required, Validators.minLength(2)]],
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      codigo: ['', [Validators.required, Validators.minLength(2)]],
      descripcion: ['', [Validators.required, Validators.minLength(10)]],
      categoria: ['', Validators.required],
      prioridad: ['', Validators.required],
      estado_default: [true],
      keywords: this.fb.array([]),
      sso_config: this.fb.group({
        habilitado: [false],
        force: [false],
        provider: ['saml2']
      }),
      menus: this.fb.array([]),
      configuracion: this.fb.group({
        url_base: ['', [Validators.required, Validators.pattern('https?://.+')]],
        timeout: [30000, [Validators.required, Validators.min(1000), Validators.max(120000)]],
        retry_attempts: [3, [Validators.required, Validators.min(0), Validators.max(10)]],
        cache_enabled: [true]
      })
    });
  }

  // Cargar datos del patrón si es edición
  loadPatronData(): void {
    this.patronId = this.route.snapshot.paramMap.get('id');
    
    if (this.patronId) {
      this.isEditing = true;
      this.loading = true;
      
      this.patternService.getPatternById(this.patronId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (patron) => {
            if (patron) {
              this.populateForm(patron);
            } else {
              this.notificationService.error('Patrón no encontrado');
              this.router.navigate(['/patrones']);
            }
          },
          error: (error) => {
            console.error('Error al cargar patrón:', error);
            this.notificationService.error('Error al cargar el patrón');
            this.router.navigate(['/patrones']);
          },
          complete: () => {
            this.loading = false;
          }
        });
    }
  }

  // Poblar formulario con datos existentes
  populateForm(patron: SistemaPattern): void {
    this.patronForm.patchValue({
      id: patron.id,
      nombre: patron.nombre,
      codigo: patron.codigo,
      descripcion: patron.descripcion,
      categoria: patron.categoria,
      prioridad: patron.prioridad,
      estado_default: patron.estado_default,
      sso_config: patron.sso_config,
      configuracion: patron.configuracion
    });

    // Poblar keywords del sistema
    const keywordsArray = this.patronForm.get('keywords') as FormArray;
    keywordsArray.clear();
    if (patron.keywords) {
      patron.keywords.forEach(keyword => {
        keywordsArray.push(this.fb.control(keyword, Validators.required));
      });
    }

    // Limpiar menús existentes y agregar los del patrón
    const menusArray = this.patronForm.get('menus') as FormArray;
    menusArray.clear();
    
    patron.menus.forEach(menu => {
      menusArray.push(this.createMenuFormGroup(menu));
    });
  }

  // Crear grupo de formulario para menú
  createMenuFormGroup(menu?: MenuPattern): FormGroup {
    return this.fb.group({
      id: [menu?.id || '', [Validators.required, Validators.minLength(2)]],
      nombre: [menu?.nombre || '', [Validators.required, Validators.minLength(3)]],
      codigo: [menu?.codigo || '', [Validators.required, Validators.minLength(2)]],
      descripcion: [menu?.descripcion || '', [Validators.required, Validators.minLength(5)]],
      icono: [menu?.icono || 'fas fa-cog', Validators.required],
      orden: [menu?.orden || 1, [Validators.required, Validators.min(1)]],
      estado_default: [menu?.estado_default ?? true],
      keywords: this.fb.array(
        menu?.keywords?.map(keyword => this.fb.control(keyword, Validators.required)) || []
      ),
      permisos_requeridos: this.fb.array(
        menu?.permisos_requeridos?.map(permiso => this.fb.control(permiso, Validators.required)) || []
      ),
      submenus: this.fb.array(
        menu?.submenus?.map(submenu => this.createSubMenuFormGroup(submenu)) || []
      )
    });
  }

  // Crear grupo de formulario para submenú
  createSubMenuFormGroup(submenu?: SubMenuPattern): FormGroup {
    return this.fb.group({
      id: [submenu?.id || '', [Validators.required, Validators.minLength(2)]],
      nombre: [submenu?.nombre || '', [Validators.required, Validators.minLength(3)]],
      codigo: [submenu?.codigo || '', [Validators.required, Validators.minLength(2)]],
      descripcion: [submenu?.descripcion || '', [Validators.minLength(5)]],
      icono: [submenu?.icono || 'fas fa-cog', Validators.required],
      permisos: this.fb.array(
        submenu?.permisos?.map(permiso => this.fb.control(permiso, Validators.required)) || []
      )
    });
  }

  // Getters para acceder a FormArrays
  get menusArray(): FormArray {
    return this.patronForm.get('menus') as FormArray;
  }

  get keywordsArray(): FormArray {
    return this.patronForm.get('keywords') as FormArray;
  }

  getMenusArray(menuIndex: number): FormArray {
    return this.menusArray.at(menuIndex).get('permisos_requeridos') as FormArray;
  }

  getSubmenusArray(menuIndex: number): FormArray {
    return this.menusArray.at(menuIndex).get('submenus') as FormArray;
  }

  getMenuKeywordsArray(menuIndex: number): FormArray {
    return this.menusArray.at(menuIndex).get('keywords') as FormArray;
  }

  getSubmenuPermisosArray(menuIndex: number, submenuIndex: number): FormArray {
    return this.getSubmenusArray(menuIndex).at(submenuIndex).get('permisos') as FormArray;
  }

  // Agregar keyword al sistema
  addKeyword(): void {
    this.keywordsArray.push(this.fb.control('', Validators.required));
  }

  // Eliminar keyword del sistema
  removeKeyword(index: number): void {
    this.keywordsArray.removeAt(index);
  }

  // Agregar keyword a menú
  addKeywordToMenu(menuIndex: number): void {
    this.getMenuKeywordsArray(menuIndex).push(this.fb.control('', Validators.required));
  }

  // Eliminar keyword de menú
  removeKeywordFromMenu(menuIndex: number, keywordIndex: number): void {
    this.getMenuKeywordsArray(menuIndex).removeAt(keywordIndex);
  }

  // Agregar menú
  addMenu(): void {
    this.menusArray.push(this.createMenuFormGroup());
  }

  // Eliminar menú
  removeMenu(index: number): void {
    this.menusArray.removeAt(index);
  }

  // Agregar permiso a menú
  addPermisoToMenu(menuIndex: number): void {
    this.getMenusArray(menuIndex).push(this.fb.control('', Validators.required));
  }

  // Eliminar permiso de menú
  removePermisoFromMenu(menuIndex: number, permisoIndex: number): void {
    this.getMenusArray(menuIndex).removeAt(permisoIndex);
  }

  // Agregar submenú
  addSubmenu(menuIndex: number): void {
    this.getSubmenusArray(menuIndex).push(this.createSubMenuFormGroup());
  }

  // Eliminar submenú
  removeSubmenu(menuIndex: number, submenuIndex: number): void {
    this.getSubmenusArray(menuIndex).removeAt(submenuIndex);
  }

  // Agregar permiso a submenú
  addPermisoToSubmenu(menuIndex: number, submenuIndex: number): void {
    this.getSubmenuPermisosArray(menuIndex, submenuIndex).push(this.fb.control('', Validators.required));
  }

  // Eliminar permiso de submenú
  removePermisoFromSubmenu(menuIndex: number, submenuIndex: number, permisoIndex: number): void {
    this.getSubmenuPermisosArray(menuIndex, submenuIndex).removeAt(permisoIndex);
  }

  // Generar ID automático
  generateId(): void {
    const nombre = this.patronForm.get('nombre')?.value;
    if (nombre) {
      const id = nombre.toLowerCase()
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      this.patronForm.patchValue({ id });
    }
  }

     // Generar código automático
   generateCode(): void {
     const nombre = this.patronForm.get('nombre')?.value;
     if (nombre) {
       const codigo = nombre.split(' ')
         .map((word: string) => word.charAt(0).toUpperCase())
         .join('')
         .substring(0, 6);
       this.patronForm.patchValue({ codigo });
     }
   }

  // Validar formulario
  validateForm(): boolean {
    if (this.patronForm.invalid) {
      this.markFormGroupTouched(this.patronForm);
      this.notificationService.error('Por favor, completa todos los campos requeridos');
      return false;
    }
    return true;
  }

  // Marcar todos los campos como touched
  markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      } else if (control instanceof FormArray) {
        control.controls.forEach((ctrl: any) => {
          if (ctrl instanceof FormGroup) {
            this.markFormGroupTouched(ctrl);
          } else {
            ctrl.markAsTouched();
          }
        });
      } else {
        control?.markAsTouched();
      }
    });
  }

  // Guardar patrón
  savePatron(): void {
    if (!this.validateForm()) return;

    this.saving = true;
    const patronData = this.patronForm.value;

    // Validar que el ID sea único (excepto si es edición)
    if (!this.isEditing) {
      this.patternService.patternExists(patronData.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (exists) => {
            if (exists) {
              this.notificationService.error('Ya existe un patrón con ese ID');
              this.saving = false;
            } else {
              this.savePatronToService(patronData);
            }
          },
          error: () => {
            this.savePatronToService(patronData);
          }
        });
    } else {
      this.savePatronToService(patronData);
    }
  }

  // Guardar patrón en el servicio
  private savePatronToService(patronData: any): void {
    if (this.isEditing) {
      // Actualizar patrón existente
      this.patternService.updatePattern(this.patronId!, patronData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Patrón actualizado correctamente');
            this.saving = false;
            this.router.navigate(['/patrones']);
          },
          error: (error) => {
            this.notificationService.error('Error al actualizar el patrón: ' + (error?.message || error?.error?.message || 'Error de conexión'));
            this.saving = false;
          }
        });
    } else {
      // Crear nuevo patrón (dinámico en API)
      this.patternService.savePattern(patronData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.notificationService.success('Patrón creado correctamente');
            this.saving = false;
            this.router.navigate(['/patrones']);
          },
          error: (error) => {
            this.notificationService.error('Error al crear el patrón: ' + (error?.message || error?.error?.message || 'Error de conexión'));
            this.saving = false;
          }
        });
    }
  }

  // Exportar patrón como JSON
  exportPatron(): void {
    if (!this.validateForm()) return;

    const patronData = this.patronForm.value;
    const dataStr = JSON.stringify(patronData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patron_${patronData.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
    
    this.notificationService.success('Patrón exportado correctamente');
  }

  // Importar patrón desde JSON
  importPatron(event: any): void {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const patronData = JSON.parse(e.target.result);
        this.populateForm(patronData);
        this.notificationService.success('Patrón importado correctamente');
      } catch (error) {
        this.notificationService.error('Error al importar el archivo JSON');
      }
    };
    reader.readAsText(file);
  }

  // Cambiar modo preview
  togglePreview(): void {
    this.previewMode = !this.previewMode;
  }

  cancel(): void {
    if (this.patronForm.dirty) {
      const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
      ref.componentInstance.title = 'Cancelar Edición';
      ref.componentInstance.message = '¿Estás seguro de que quieres cancelar?';
      ref.componentInstance.detail = 'Se perderán todos los cambios no guardados.';
      ref.componentInstance.type = 'warning';
      ref.componentInstance.confirmText = 'Sí, cancelar';
      ref.componentInstance.confirmIcon = 'fas fa-sign-out-alt';
      ref.componentInstance.confirmClass = 'btn-warning';

      ref.result.then(
        () => this.router.navigate(['/patrones']),
        () => {}
      );
    } else {
      this.router.navigate(['/patrones']);
    }
  }

  // Obtener datos del formulario para preview
  getPreviewData(): any {
    if (this.patronForm.valid) {
      return this.patronForm.value;
    }
    return null;
  }

  // Validar campo específico
  isFieldInvalid(fieldName: string): boolean {
    const field = this.patronForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.patronForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
      if (field.errors['minlength']) return `Mínimo ${field.errors['minlength'].requiredLength} caracteres`;
      if (field.errors['pattern']) return 'Formato inválido';
      if (field.errors['min']) return `Valor mínimo: ${field.errors['min'].min}`;
      if (field.errors['max']) return `Valor máximo: ${field.errors['max'].max}`;
    }
    return '';
  }
}
