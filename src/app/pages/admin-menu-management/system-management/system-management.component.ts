import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SystemManagementService, System, SystemMenu, Role, Permission } from '../../../services/system-management.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-system-management',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './system-management.component.html',
  styleUrls: ['./system-management.component.scss']
})
export class SystemManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados
  loading = false;
  currentTab = 'systems';
  
  // Datos
  systems: System[] = [];
  selectedSystem: System | null = null;
  systemMenus: SystemMenu[] = [];
  roles: Role[] = [];
  permissions: Permission[] = [];

  // Formularios
  systemForm!: FormGroup;
  menuForm!: FormGroup;
  permissionForm!: FormGroup;

  // Estados de modales
  showSystemModal = false;
  showMenuModal = false;
  showPermissionModal = false;
  editingSystem: System | null = null;
  editingMenu: SystemMenu | null = null;

  constructor(
    private systemManagementService: SystemManagementService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.systemForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      codigo: ['', [Validators.required, Validators.maxLength(50)]],
      descripcion: ['', [Validators.maxLength(500)]],
      url_base: ['', [Validators.required, Validators.maxLength(255)]],
      activo: [true],
      sso_habilitado: [false],
      sso_force: [false],
      patron_id: ['']
    });

    this.menuForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.maxLength(255)]],
      ruta: ['', [Validators.required, Validators.maxLength(500)]],
      tipo_ruta: ['interna', [Validators.required]],
      target: ['_self', [Validators.required]],
      abrir_nueva_pestana: [false],
      icono: ['', [Validators.maxLength(100)]],
      orden: [1, [Validators.required, Validators.min(1)]],
      activo: [true],
      visible_en_intranet: [false],
      permisos_requeridos: [[]]
    });

    this.permissionForm = this.fb.group({
      role_id: ['', [Validators.required]],
      menu_id: ['', [Validators.required]],
      permissions: [[], [Validators.required]]
    });
  }

  private loadInitialData(): void {
    this.loadSystems();
    this.loadRolesAndPermissions();
  }

  loadSystems(): void {
    this.loading = true;
    this.systemManagementService.getSystems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.systems = response.data;
            this.loading = false;
          } else {
            this.notificationService.error('Error al cargar sistemas: ' + response.message);
            this.loading = false;
          }
        },
        error: (error) => {
          console.error('Error cargando sistemas:', error);
          this.notificationService.error('Error al cargar sistemas');
          this.loading = false;
        }
      });
  }

  loadRolesAndPermissions(): void {
    this.systemManagementService.getRolesAndPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.roles = response.data.roles;
            this.permissions = response.data.permissions;
          } else {
            this.notificationService.error('Error al cargar roles y permisos: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error cargando roles y permisos:', error);
          this.notificationService.error('Error al cargar roles y permisos');
        }
      });
  }

  loadSystemMenus(systemId: number): void {
    this.systemManagementService.getSystemMenus(systemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.systemMenus = this.flattenMenus(Array.isArray(response.data) ? response.data : []);
          } else {
            this.notificationService.error('Error al cargar menús del sistema: ' + (response as any).message);
          }
        },
        error: (error) => {
          console.error('Error cargando menús del sistema:', error);
          this.notificationService.error('Error al cargar menús del sistema');
        }
      });
  }

  /** Aplana la jerarquía de menús (raíz + children) para listar todos */
  private flattenMenus(menus: SystemMenu[], level = 0): SystemMenu[] {
    const out: SystemMenu[] = [];
    for (const m of menus) {
      out.push({ ...m, orden: m.orden ?? 0 });
      if (m.children && m.children.length > 0) {
        out.push(...this.flattenMenus(m.children, level + 1));
      }
    }
    return out;
  }

  toggleVisibleEnIntranet(menu: SystemMenu, event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    this.systemManagementService.updateMenu(menu.id, { visible_en_intranet: checked })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            menu.visible_en_intranet = checked;
            this.notificationService.success(
              checked ? 'Menú visible en "Para todo el personal"' : 'Menú quitado de "Para todo el personal"'
            );
          } else {
            this.notificationService.error((response as any).message || 'Error al actualizar');
            (event.target as HTMLInputElement).checked = !!menu.visible_en_intranet;
          }
        },
        error: (error) => {
          console.error('Error actualizando menú:', error);
          this.notificationService.error('Error al actualizar menú');
          (event.target as HTMLInputElement).checked = !!menu.visible_en_intranet;
        }
      });
  }

  // Métodos para gestión de sistemas
  openSystemModal(system?: System): void {
    this.editingSystem = system || null;
    
    if (system) {
      this.systemForm.patchValue({
        nombre: system.nombre,
        codigo: system.codigo,
        descripcion: system.descripcion,
        url_base: system.url_base,
        activo: system.activo,
        sso_habilitado: system.sso_habilitado,
        sso_force: system.sso_force,
        patron_id: system.patron_id
      });
    } else {
      this.systemForm.reset({
        activo: true,
        sso_habilitado: false,
        sso_force: false
      });
    }
    
    this.showSystemModal = true;
  }

  closeSystemModal(): void {
    this.showSystemModal = false;
    this.editingSystem = null;
    this.systemForm.reset();
  }

  saveSystem(): void {
    if (this.systemForm.valid) {
      const systemData: any = { ...this.systemForm.value };
      if (systemData.patron_id === '' || systemData.patron_id == null) {
        delete systemData.patron_id;
      }

      const operation = this.editingSystem 
        ? this.systemManagementService.updateSystem(this.editingSystem.id, systemData)
        : this.systemManagementService.createSystem(systemData);

      operation
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success(
                this.editingSystem ? 'Sistema actualizado exitosamente' : 'Sistema creado exitosamente'
              );
              this.closeSystemModal();
              this.loadSystems();
            } else {
              this.notificationService.error('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error guardando sistema:', error);
            const errs = error?.error?.errors;
            const msg = errs
              ? Object.values(errs).flat().join(' ')
              : (error?.error?.message || error?.message || 'Error al guardar sistema');
            this.notificationService.error(msg);
          }
        });
    } else {
      this.notificationService.error('Por favor, complete todos los campos requeridos');
    }
  }

  deleteSystem(system: System): void {
    if (confirm(`¿Estás seguro de eliminar el sistema "${system.nombre}"?`)) {
      this.systemManagementService.deleteSystem(system.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Sistema eliminado exitosamente');
              this.loadSystems();
            } else {
              this.notificationService.error('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error eliminando sistema:', error);
            this.notificationService.error('Error al eliminar sistema');
          }
        });
    }
  }

  // Métodos para gestión de menús
  selectSystem(system: System): void {
    this.selectedSystem = system;
    this.loadSystemMenus(system.id);
    this.currentTab = 'menus';
  }

  openMenuModal(menu?: SystemMenu): void {
    if (!this.selectedSystem) {
      this.notificationService.error('Seleccione un sistema primero');
      return;
    }

    this.editingMenu = menu || null;
    
    if (menu) {
      this.menuForm.patchValue({
        nombre: menu.nombre,
        ruta: menu.ruta,
        tipo_ruta: menu.tipo_ruta || 'interna',
        target: menu.target || '_self',
        abrir_nueva_pestana: menu.abrir_nueva_pestana || false,
        icono: menu.icono,
        orden: menu.orden,
        activo: menu.activo,
        visible_en_intranet: menu.visible_en_intranet || false,
        permisos_requeridos: menu.permisos_requeridos
      });
    } else {
      this.menuForm.reset({
        tipo_ruta: 'interna',
        target: '_self',
        abrir_nueva_pestana: false,
        orden: this.systemMenus.length + 1,
        activo: true,
        visible_en_intranet: false,
        permisos_requeridos: []
      });
    }
    
    this.showMenuModal = true;
  }

  closeMenuModal(): void {
    this.showMenuModal = false;
    this.editingMenu = null;
    this.menuForm.reset();
  }

  saveMenu(): void {
    if (this.menuForm.valid && this.selectedSystem) {
      const menuData = this.menuForm.value;
      
      this.systemManagementService.createSystemMenu(this.selectedSystem.id, menuData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Menú creado exitosamente');
              this.closeMenuModal();
              this.loadSystemMenus(this.selectedSystem!.id);
            } else {
              this.notificationService.error('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error guardando menú:', error);
            this.notificationService.error('Error al guardar menú');
          }
        });
    } else {
      this.notificationService.error('Por favor, complete todos los campos requeridos');
    }
  }

  // Métodos para gestión de permisos
  openPermissionModal(menu: SystemMenu): void {
    this.permissionForm.patchValue({
      menu_id: menu.id,
      permissions: []
    });
    this.showPermissionModal = true;
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.permissionForm.reset();
  }

  savePermissions(): void {
    if (this.permissionForm.valid) {
      const assignmentData = this.permissionForm.value;
      
      this.systemManagementService.assignMenuPermissions(assignmentData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Permisos asignados exitosamente');
              this.closePermissionModal();
            } else {
              this.notificationService.error('Error: ' + response.message);
            }
          },
          error: (error) => {
            console.error('Error asignando permisos:', error);
            this.notificationService.error('Error al asignar permisos');
          }
        });
    } else {
      this.notificationService.error('Por favor, complete todos los campos requeridos');
    }
  }

  // Métodos de utilidad
  setActiveTab(tab: string): void {
    this.currentTab = tab;
  }

  getTabClass(tab: string): string {
    return this.currentTab === tab ? 'nav-link active' : 'nav-link';
  }

  getSystemStatusClass(activo: boolean): string {
    return activo ? 'badge-success' : 'badge-danger';
  }

  getSystemStatusText(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  getMenuStatusClass(activo: boolean): string {
    return activo ? 'badge-success' : 'badge-danger';
  }

  getMenuStatusText(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

  // Métodos para manejo de permisos en formularios
  togglePermission(permission: string, event: any): void {
    const currentPermissions = this.menuForm.get('permisos_requeridos')?.value || [];
    
    if (event.target.checked) {
      if (!currentPermissions.includes(permission)) {
        currentPermissions.push(permission);
      }
    } else {
      const index = currentPermissions.indexOf(permission);
      if (index > -1) {
        currentPermissions.splice(index, 1);
      }
    }
    
    this.menuForm.patchValue({
      permisos_requeridos: currentPermissions
    });
  }

  togglePermissionAssignment(permission: string, event: any): void {
    const currentPermissions = this.permissionForm.get('permissions')?.value || [];
    
    if (event.target.checked) {
      if (!currentPermissions.includes(permission)) {
        currentPermissions.push(permission);
      }
    } else {
      const index = currentPermissions.indexOf(permission);
      if (index > -1) {
        currentPermissions.splice(index, 1);
      }
    }
    
    this.permissionForm.patchValue({
      permissions: currentPermissions
    });
  }

  // Métodos para manejo de campos de ruta
  onTipoRutaChange(): void {
    const tipoRuta = this.menuForm.get('tipo_ruta')?.value;
    
    if (tipoRuta === 'externa') {
      // Para rutas externas, sugerir _blank
      this.menuForm.patchValue({
        target: '_blank',
        abrir_nueva_pestana: true
      });
    } else {
      // Para rutas internas, usar _self
      this.menuForm.patchValue({
        target: '_self',
        abrir_nueva_pestana: false
      });
    }
  }

  onAbrirNuevaPestanaChange(): void {
    const abrirNuevaPestana = this.menuForm.get('abrir_nueva_pestana')?.value;
    
    if (abrirNuevaPestana) {
      this.menuForm.patchValue({
        target: '_blank'
      });
    } else {
      this.menuForm.patchValue({
        target: '_self'
      });
    }
  }

  // Método para obtener sugerencias de ruta basadas en el tipo
  getRutaPlaceholder(): string {
    const tipoRuta = this.menuForm.get('tipo_ruta')?.value;
    
    switch (tipoRuta) {
      case 'interna':
        return '/dashboard, /empleados, /reportes';
      case 'externa':
        return 'https://ejemplo.com/sistema';
      case 'iframe':
        return '/iframe/sistema';
      default:
        return '/ruta';
    }
  }

  // Método para obtener sugerencias de target basadas en el tipo
  getTargetOptions(): string[] {
    const tipoRuta = this.menuForm.get('tipo_ruta')?.value;
    
    if (tipoRuta === 'iframe') {
      return ['_self'];
    }
    
    return ['_self', '_blank', '_parent', '_top'];
  }

  // Métodos para mostrar tipos de ruta en la tabla
  getTipoRutaClass(tipoRuta?: string): string {
    switch (tipoRuta) {
      case 'interna':
        return 'badge-primary';
      case 'externa':
        return 'badge-success';
      case 'iframe':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getTipoRutaText(tipoRuta?: string): string {
    switch (tipoRuta) {
      case 'interna':
        return 'Interna';
      case 'externa':
        return 'Externa';
      case 'iframe':
        return 'Iframe';
      default:
        return 'Interna';
    }
  }
}
