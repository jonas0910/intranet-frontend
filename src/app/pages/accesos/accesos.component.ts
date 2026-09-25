import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { RoleAccessService } from '../../services/role-access.service';
import { NotificationService } from '../../services/notification.service';
import { RoleAccess, RoleAccessStatistics } from '../../interfaces/role-access.interface';

// Interfaces
interface Sistema {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  menus: Menu[];
  color?: string;
}

interface Menu {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  permisos_requeridos: string[];
}

interface Permiso {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  activo: boolean;
}

interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions_count: number;
  users_count: number;
}

@Component({
  selector: 'app-accesos',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './accesos.component.html',
  styleUrls: ['./accesos.component.scss']
})
export class AccesosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Propiedades
  sistemas: Sistema[] = [];
  permisosDisponibles: Permiso[] = [];
  roles: Role[] = [];
  roleAccesses: RoleAccess[] = [];
  statistics: RoleAccessStatistics | null = null;
  
  // Estados de modales
  showMenuModal = false;
  showPermisosModal = false;
  showImportModal = false;
  showExportModal = false;
  showRoleAccessModal = false;
  showBulkUpdateModal = false;
  showStatisticsModal = false;
  
  // Selecciones
  selectedSistema: Sistema | null = null;
  selectedMenu: Menu | null = null;
  selectedRole: Role | null = null;
  selectedSistemaForExport: Sistema | null = null;
  
  // Formularios
  menuForm!: FormGroup;
  permisosForm!: FormGroup;
  roleAccessForm!: FormGroup;
  bulkUpdateForm!: FormGroup;
  
  // Paginación
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 15;
  
  // Estados de carga
  loading = false;
  saving = false;
  
  // Permisos disponibles
  availablePermissions = [
    'ver', 'crear', 'editar', 'eliminar', 'exportar', 'importar', 'aprobar', 'rechazar'
  ];

  constructor(
    private apiService: ApiService,
    private roleAccessService: RoleAccessService,
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
    this.menuForm = this.fb.group({
      nombre: ['', Validators.required],
      codigo: ['', Validators.required],
      permisos_requeridos: ['', Validators.required]
    });
    
    this.permisosForm = this.fb.group({
      nombre: ['', Validators.required],
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required]
    });

    this.roleAccessForm = this.fb.group({
      role_id: ['', Validators.required],
      sistema_menu_id: ['', Validators.required],
      permisos_adicionales: [[]],
      activo: [true],
      orden: [1]
    });

    this.bulkUpdateForm = this.fb.group({
      role_id: ['', Validators.required],
      sistema_id: ['', Validators.required],
      menu_ids: [[]],
      permisos_adicionales: [[]],
      activo: [true]
    });
  }

  private loadInitialData(): void {
    this.loading = true;
    
    // Cargar datos en paralelo
    Promise.all([
      this.loadSistemas(),
      this.loadRoles(),
      this.loadRoleAccesses(),
      this.loadStatistics()
    ]).finally(() => {
      this.loading = false;
    });
  }

  // Cargar sistemas
  loadSistemas(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Sistema[]>('sistemas-integrados')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const sistemasData = response.data.data || response.data;
              if (Array.isArray(sistemasData)) {
                this.sistemas = sistemasData;
                this.assignColors();
              } else {
                this.loadSampleSystems();
              }
            } else {
              this.loadSampleSystems();
            }
            resolve();
          },
          error: () => {
            this.loadSampleSystems();
            resolve();
          }
        });
    });
  }

  // Cargar roles
  loadRoles(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Role[]>('roles')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const rolesData = response.data.data || response.data;
              if (Array.isArray(rolesData)) {
                this.roles = rolesData;
              } else {
                this.loadSampleRoles();
              }
            } else {
              this.loadSampleRoles();
            }
            resolve();
          },
          error: () => {
            this.loadSampleRoles();
            resolve();
          }
        });
    });
  }

  // Cargar accesos de roles
  loadRoleAccesses(): Promise<void> {
    return new Promise((resolve) => {
      this.roleAccessService.getRoleAccesses(this.currentPage, this.itemsPerPage)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const accessData = response.data.data || response.data;
              if (Array.isArray(accessData)) {
                this.roleAccesses = accessData;
                this.totalItems = response.data.total || accessData.length;
                this.totalPages = response.data.last_page || 1;
              } else {
                this.roleAccesses = [];
              }
            } else {
              this.roleAccesses = [];
            }
            resolve();
          },
          error: () => {
            this.roleAccesses = [];
            resolve();
          }
        });
    });
  }

  // Cargar estadísticas
  loadStatistics(): Promise<void> {
    return new Promise((resolve) => {
      this.roleAccessService.getAccessStatistics()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.statistics = response.data;
            }
            resolve();
          },
          error: () => {
            resolve();
          }
        });
    });
  }

  // Cargar datos de muestra (fallback)
  private loadSampleSystems(): void {
    this.sistemas = [
      {
        id: 1,
        nombre: 'Sistema ERP',
        codigo: 'erp',
        activo: true,
        menus: [
          { id: 1, nombre: 'Dashboard', codigo: 'dashboard', activo: true, permisos_requeridos: ['ver'] },
          { id: 2, nombre: 'Ventas', codigo: 'ventas', activo: true, permisos_requeridos: ['ver', 'crear'] }
        ]
      },
      {
        id: 2,
        nombre: 'Recursos Humanos',
        codigo: 'rrhh',
        activo: true,
        menus: [
          { id: 3, nombre: 'Empleados', codigo: 'empleados', activo: true, permisos_requeridos: ['ver', 'editar'] }
        ]
      }
    ];
    this.assignColors();
  }

  private loadSampleRoles(): void {
    this.roles = [
      { id: 1, name: 'Super Admin', guard_name: 'web', permissions_count: 50, users_count: 2 },
      { id: 2, name: 'Admin', guard_name: 'web', permissions_count: 30, users_count: 5 },
      { id: 3, name: 'Jefe Departamento', guard_name: 'web', permissions_count: 20, users_count: 8 }
    ];
  }

  // Asignar colores a sistemas
  private assignColors(): void {
    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    this.sistemas.forEach((sistema, index) => {
      sistema.color = colors[index % colors.length];
    });
  }

  // Obtener estadísticas de menús para un sistema
  getMenuStatistics(sistema: Sistema): { total: number; activos: number; conPermisos: number } {
    const total = sistema.menus.length;
    const activos = sistema.menus.filter(m => m.activo).length;
    const conPermisos = sistema.menus.filter(m => m.permisos_requeridos.length > 0).length;
    
    return { total, activos, conPermisos };
  }

  // Abrir modal de acceso de rol
  openRoleAccessModal(): void {
    this.roleAccessForm.reset();
    this.showRoleAccessModal = true;
  }

  // Abrir modal de actualización masiva
  openBulkUpdateModal(): void {
    this.bulkUpdateForm.reset();
    this.showBulkUpdateModal = true;
  }

  // Abrir modal de estadísticas
  openStatisticsModal(): void {
    this.showStatisticsModal = true;
  }

  // Crear acceso de rol
  createRoleAccess(): void {
    if (this.roleAccessForm.valid) {
      this.saving = true;
      const accessData = this.roleAccessForm.value;
      
      this.roleAccessService.createRoleAccess(accessData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.notificationService.success('Acceso creado exitosamente');
              this.loadRoleAccesses();
              this.showRoleAccessModal = false;
              this.roleAccessForm.reset();
            } else {
              this.notificationService.error('Error al crear el acceso');
            }
          },
          error: (error) => {
            console.error('Error creating role access:', error);
            this.notificationService.error('Error al crear el acceso');
          },
          complete: () => {
            this.saving = false;
          }
        });
    }
  }

  // Cambiar estado de acceso
  toggleAccessStatus(access: RoleAccess): void {
    const newStatus = !access.activo;
    
    this.roleAccessService.toggleRoleAccessStatus(access.id!, newStatus)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            access.activo = newStatus;
            this.notificationService.success(`Acceso ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
          } else {
            this.notificationService.error('Error al cambiar el estado');
          }
        },
        error: (error) => {
          console.error('Error toggling access status:', error);
          this.notificationService.error('Error al cambiar el estado');
        }
      });
  }

  // Eliminar acceso
  deleteAccess(access: RoleAccess): void {
    if (confirm('¿Estás seguro de que quieres eliminar este acceso?')) {
      this.roleAccessService.deleteRoleAccess(access.id!)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.notificationService.success(response.message || 'Acceso eliminado exitosamente');
              this.loadRoleAccesses();
            } else {
              this.notificationService.error(response.message || 'Error al eliminar el acceso');
            }
          },
          error: (error) => {
            console.error('Error deleting access:', error);
            let errorMessage = 'Error al eliminar el acceso';
            
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            this.notificationService.error(errorMessage);
          }
        });
    }
  }

  // Cerrar modales
  closeModals(): void {
    this.showMenuModal = false;
    this.showPermisosModal = false;
    this.showImportModal = false;
    this.showExportModal = false;
    this.showRoleAccessModal = false;
    this.showBulkUpdateModal = false;
    this.showStatisticsModal = false;
  }

  // Manejar cambios en permisos del formulario de acceso individual
  onPermissionChange(event: any, permiso: string): void {
    const permisosActuales = this.roleAccessForm.get('permisos_adicionales')?.value || [];
    
    if (event.target.checked) {
      if (!permisosActuales.includes(permiso)) {
        permisosActuales.push(permiso);
      }
    } else {
      const index = permisosActuales.indexOf(permiso);
      if (index > -1) {
        permisosActuales.splice(index, 1);
      }
    }
    
    this.roleAccessForm.patchValue({ permisos_adicionales: permisosActuales });
  }
}
