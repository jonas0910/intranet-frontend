import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { RolesService, Role, Permission, SistemaExterno, RolMenu, MenuAccess } from '../../services/roles.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.scss']
})
export class RolesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos
  roles: Role[] = [];
  permissions: Permission[] = [];
  selectedRole: Role | null = null;
  sistemasExternos: SistemaExterno[] = [];
  accesosMenus: RolMenu[] = [];

  // Estados
  loading = false;
  showCreateModal = false;
  showEditModal = false;
  showAccessModal = false;
  showPermissionsModal = false;

  // Formularios
  roleForm: FormGroup;
  accessForm: FormGroup;

  // Estadísticas
  statistics: any = null;

  constructor(
    private rolesService: RolesService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      guard_name: ['web', Validators.required],
      permissions: [[]]
    });

    this.accessForm = this.fb.group({
      accesos: [[]]
    });
  }

  ngOnInit(): void {
    this.loadRoles();
    this.loadPermissions();
    this.loadStatistics();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Cargar roles
  loadRoles(): void {
    this.loading = true;
    this.rolesService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.roles = response.data;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando roles:', error);
          this.loading = false;
        }
      });
  }

  // Cargar permisos
  loadPermissions(): void {
    this.rolesService.getPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.permissions = response.data;
        },
        error: (error) => {
          console.error('Error cargando permisos:', error);
        }
      });
  }

  // Cargar estadísticas
  loadStatistics(): void {
    this.rolesService.getStatistics()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.statistics = response.data;
        },
        error: (error) => {
          console.error('Error cargando estadísticas:', error);
        }
      });
  }

  // Abrir modal de creación
  openCreateModal(): void {
    this.roleForm.reset({ guard_name: 'web', permissions: [] });
    this.showCreateModal = true;
  }

  // Abrir modal de edición
  openEditModal(role: Role): void {
    this.selectedRole = role;
    this.roleForm.patchValue({
      name: role.name,
      guard_name: role.guard_name,
      permissions: role.permissions?.map(p => p.name) || []
    });
    this.showEditModal = true;
  }

  // Abrir modal de permisos
  openPermissionsModal(role: Role): void {
    this.selectedRole = role;
    this.roleForm.patchValue({
      permissions: role.permissions?.map(p => p.name) || []
    });
    this.showPermissionsModal = true;
  }

  // Abrir modal de accesos
  openAccessModal(role: Role): void {
    this.selectedRole = role;
    this.loadRoleAccess(role.id);
  }

  // Cargar accesos de un rol
  loadRoleAccess(roleId: number): void {
    this.loading = true;
    this.rolesService.getRole(roleId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sistemasExternos = this.rolesService.groupMenusBySistema(response.data.sistemas_externos);
          this.accesosMenus = response.data.accesos_menus;
          
          // Generar estructura de accesos para el formulario
          const accessStructure = this.rolesService.generateAccessStructure(
            response.data.sistemas_externos, 
            this.accesosMenus
          );
          
          this.accessForm.patchValue({ accesos: accessStructure });
          this.showAccessModal = true;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando accesos:', error);
          this.loading = false;
        }
      });
  }

  // Crear rol
  createRole(): void {
    if (this.roleForm.valid) {
      this.loading = true;
      const roleData = this.roleForm.value;
      
      this.rolesService.createRole(roleData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.showCreateModal = false;
            this.loadRoles();
            this.loadStatistics();
            // Mostrar mensaje de éxito
          },
          error: (error) => {
            console.error('Error creando rol:', error);
            this.loading = false;
          }
        });
    }
  }

  // Actualizar rol
  updateRole(): void {
    if (this.roleForm.valid && this.selectedRole) {
      this.loading = true;
      const roleData = this.roleForm.value;
      
      this.rolesService.updateRole(this.selectedRole.id, roleData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.showEditModal = false;
            this.loadRoles();
            this.loadStatistics();
            // Mostrar mensaje de éxito
          },
          error: (error) => {
            console.error('Error actualizando rol:', error);
            this.loading = false;
          }
        });
    }
  }

  // Actualizar permisos
  updatePermissions(): void {
    if (this.roleForm.valid && this.selectedRole) {
      this.loading = true;
      const permissions = this.roleForm.get('permissions')?.value || [];
      
      this.rolesService.assignPermissions(this.selectedRole.id, permissions)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.showPermissionsModal = false;
            this.loadRoles();
            this.loadStatistics();
            // Mostrar mensaje de éxito
          },
          error: (error) => {
            console.error('Error actualizando permisos:', error);
            this.loading = false;
          }
        });
    }
  }

  // Actualizar accesos a menús
  updateMenuAccess(menuId: number, isActive: boolean): void {
    if (this.selectedRole) {
      this.loading = true;
      
      // Buscar el acceso existente o crear uno nuevo
      let acceso = this.accesosMenus.find(a => a.sistema_menu_id === menuId);
      
      if (!acceso) {
        acceso = {
          id: 0,
          role_id: this.selectedRole.id,
          sistema_menu_id: menuId,
          permisos_adicionales: [],
          activo: isActive,
          orden: 0
        };
        this.accesosMenus.push(acceso);
      } else {
        acceso.activo = isActive;
      }
      
      // Actualizar en el backend
      this.rolesService.updateMenuAccess(this.selectedRole.id, this.accesosMenus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            // Mostrar mensaje de éxito
          },
          error: (error) => {
            console.error('Error actualizando accesos:', error);
            this.loading = false;
          }
        });
    }
  }

  // Eliminar rol
  deleteRole(role: Role): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el rol "${role.name}"?`)) {
      this.loading = true;
      
      this.rolesService.deleteRole(role.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              // Mostrar mensaje de éxito del servidor
              console.log(response.message || 'Rol eliminado exitosamente');
              this.loadRoles();
              this.loadStatistics();
            } else {
              console.error(response.message || 'Error al eliminar el rol');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('Error eliminando rol:', error);
            let errorMessage = 'Error al eliminar el rol';
            
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            console.error(errorMessage);
            this.loading = false;
          }
        });
    }
  }

  // Verificar si un menú está activo
  isMenuActive(menuId: number): boolean {
    return this.rolesService.isMenuActiveForRole(menuId, this.accesosMenus);
  }

  // Obtener acceso de un menú
  getMenuAccess(menuId: number): RolMenu | null {
    return this.rolesService.getMenuAccessForRole(menuId, this.accesosMenus);
  }

  // Método auxiliar para manejar cambios en checkboxes
  onMenuAccessChange(menuId: number, event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target) {
      this.updateMenuAccess(menuId, target.checked);
    }
  }

  // Guardar todos los accesos a menús
  saveMenuAccess(): void {
    if (this.selectedRole) {
      this.loading = true;
      
      this.rolesService.updateMenuAccess(this.selectedRole.id, this.accesosMenus)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.showAccessModal = false;
            this.loading = false;
            // Mostrar mensaje de éxito
          },
          error: (error) => {
            console.error('Error actualizando accesos:', error);
            this.loading = false;
          }
        });
    }
  }

  // Cerrar modales
  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showAccessModal = false;
    this.showPermissionsModal = false;
    this.selectedRole = null;
  }

  // Obtener permisos agrupados por categoría
  getPermissionsByCategory(): { [key: string]: Permission[] } {
    const grouped: { [key: string]: Permission[] } = {};
    
    this.permissions.forEach(permission => {
      const category = permission.name.split('.')[0];
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(permission);
    });
    
    return grouped;
  }

  // Obtener icono para sistema
  getSystemIcon(sistema: SistemaExterno): string {
    return sistema.icono || 'fas fa-cogs';
  }

  // Obtener clase CSS para sistema
  getSystemClass(sistema: SistemaExterno): string {
    const baseClass = 'system-card';
    return sistema.activo ? `${baseClass} active` : `${baseClass} inactive`;
  }
}
