import { Component, OnInit, OnDestroy, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface User {
  id?: number;
  name: string;
  email: string;
  password?: string;
  department_id?: number;
  position?: string;
  phone?: string;
  activo: boolean;
  is_admin: boolean;
  employee_id?: string;
  cost_center_id?: number;
  hire_date?: string;
  salary?: number;
  work_schedule?: string;
  emergency_contact?: string;
  notes?: string;
  roles?: Role[];
  systems?: System[];
  menus?: Menu[];
  permissions?: Permission[];
  // Campos para envío al backend
  role_ids?: number[];
  permission_ids?: number[];
  system_ids?: number[];
  menu_ids?: number[];
}

interface Role {
  id: number;
  name: string;
  description?: string;
}

interface Permission {
  id: number;
  name: string;
  description?: string;
}

interface System {
  id: number;
  nombre: string;
  descripcion?: string;
  icono?: string;
}

interface Menu {
  id: number;
  nombre: string;
  ruta: string;
  icono?: string;
  sistema_id: number;
}

interface Department {
  id: number;
  nombre: string;
}

interface CostCenter {
  id: number;
  nombre: string;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit, OnDestroy {
  @ViewChild('userFormModal', { static: true }) userFormModal!: TemplateRef<any>;

  private destroy$ = new Subject<void>();
  private apiUrl = environment.apiUrl;

  // Datos principales
  users: User[] = [];
  currentUser: User = this.getEmptyUser();
  
  // Datos de referencia
  availableRoles: Role[] = [];
  availablePermissions: Permission[] = [];
  availableSystems: System[] = [];
  availableMenus: Menu[] = [];
  departments: Department[] = [];
  costCenters: CostCenter[] = [];
  
  // Estado del componente
  showUserModal = false;
  isEditing = false;
  loading = false;
  
  // Asignaciones temporales
  assignedRoles: number[] = [];
  assignedPermissions: number[] = [];
  assignedSystems: number[] = [];
  assignedMenus: number[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getEmptyUser(): User {
    return {
      name: '',
      email: '',
      password: '',
      activo: true,
      is_admin: false
    };
  }

  private loadInitialData(): void {
    this.loadUsers();
    this.loadRoles();
    this.loadPermissions();
    this.loadSystems();
    this.loadMenus();
    this.loadDepartments();
    this.loadCostCenters();
  }

  /**
   * Extraer usuarios de la respuesta, manejando tanto arrays como objetos de paginación
   */
  private extractUsersFromResponse(data: any): User[] {
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    
    console.warn('Formato de datos inesperado:', data);
    return [];
  }

  private loadUsers(): void {
    this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Manejar tanto arrays como objetos de paginación
            this.users = this.extractUsersFromResponse(response.data);
          }
        },
        error: (error) => {
          console.error('Error loading users:', error);
          // Mock data para desarrollo
          this.users = [
            {
              id: 1,
              name: 'Juan Pérez',
              email: 'juan.perez@municipio.gob.pe',
              activo: true,
              is_admin: false,
              roles: [{ id: 1, name: 'Usuario' }],
              systems: [{ id: 1, nombre: 'Contabilidad' }]
            },
            {
              id: 2,
              name: 'María García',
              email: 'maria.garcia@municipio.gob.pe',
              activo: true,
              is_admin: true,
              roles: [{ id: 2, name: 'Administrador' }],
              systems: [{ id: 1, nombre: 'Contabilidad' }, { id: 2, nombre: 'Planillas' }]
            }
          ];
        }
      });
  }

  private loadRoles(): void {
    this.http.get<ApiResponse<Role[]>>(`${this.apiUrl}/roles`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availableRoles = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading roles:', error);
          // Mock data
          this.availableRoles = [
            { id: 1, name: 'Usuario', description: 'Usuario básico del sistema' },
            { id: 2, name: 'Administrador', description: 'Administrador del sistema' },
            { id: 3, name: 'Supervisor', description: 'Supervisor de departamento' }
          ];
        }
      });
  }

  private loadPermissions(): void {
    this.http.get<ApiResponse<Permission[]>>(`${this.apiUrl}/permissions`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availablePermissions = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading permissions:', error);
          // Mock data
          this.availablePermissions = [
            { id: 1, name: 'usuarios.ver' },
            { id: 2, name: 'usuarios.crear' },
            { id: 3, name: 'usuarios.editar' },
            { id: 4, name: 'usuarios.eliminar' },
            { id: 5, name: 'contabilidad.ver' },
            { id: 6, name: 'contabilidad.editar' }
          ];
        }
      });
  }

  private loadSystems(): void {
    this.http.get<ApiResponse<System[]>>(`${this.apiUrl}/sistemas-integrados`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availableSystems = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading systems:', error);
          // Mock data
          this.availableSystems = [
            { id: 1, nombre: 'Sistema de Contabilidad', descripcion: 'Gestión contable', icono: 'fas fa-calculator' },
            { id: 2, nombre: 'Sistema de Planillas', descripcion: 'Gestión de nómina', icono: 'fas fa-money-bill-wave' }
          ];
        }
      });
  }

  private loadMenus(): void {
    this.http.get<ApiResponse<Menu[]>>(`${this.apiUrl}/sistema-menus`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availableMenus = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading menus:', error);
          // Mock data
          this.availableMenus = [
            { id: 1, nombre: 'Dashboard Contable', ruta: '/contabilidad/dashboard', icono: 'fas fa-chart-line', sistema_id: 1 },
            { id: 2, nombre: 'Plan de Cuentas', ruta: '/contabilidad/plan-cuentas', icono: 'fas fa-list-alt', sistema_id: 1 },
            { id: 3, nombre: 'Dashboard Planillas', ruta: '/planillas/dashboard', icono: 'fas fa-chart-pie', sistema_id: 2 }
          ];
        }
      });
  }

  private loadDepartments(): void {
    this.http.get<ApiResponse<Department[]>>(`${this.apiUrl}/departamentos`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.departments = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading departments:', error);
          // Mock data
          this.departments = [
            { id: 1, nombre: 'Administración' },
            { id: 2, nombre: 'Contabilidad' },
            { id: 3, nombre: 'Recursos Humanos' }
          ];
        }
      });
  }

  private loadCostCenters(): void {
    this.http.get<ApiResponse<CostCenter[]>>(`${this.apiUrl}/cost-centers`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.costCenters = response.data;
          }
        },
        error: (error) => {
          console.error('Error loading cost centers:', error);
          // Mock data
          this.costCenters = [
            { id: 1, nombre: 'Centro de Costo 1' },
            { id: 2, nombre: 'Centro de Costo 2' }
          ];
        }
      });
  }

  // Métodos de gestión de usuarios
  openUserForm(): void {
    this.isEditing = false;
    this.currentUser = this.getEmptyUser();
    this.resetAssignments();
    this.showUserModal = true;
  }

  editUser(user: User): void {
    this.isEditing = true;
    this.currentUser = { ...user };
    this.loadUserAssignments(user);
    this.showUserModal = true;
  }

  viewUserDetails(user: User): void {
    // Implementar vista de detalles
    console.log('View user details:', user);
  }

  deleteUser(user: User): void {
    if (confirm(`¿Está seguro de eliminar al usuario ${user.name}?`)) {
      this.http.delete<ApiResponse<any>>(`${this.apiUrl}/users/${user.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.users = this.users.filter(u => u.id !== user.id);
            }
          },
          error: (error) => {
            console.error('Error deleting user:', error);
          }
        });
    }
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.resetAssignments();
  }

  saveUser(): void {
    if (!this.validateUser()) {
      return;
    }

    this.loading = true;
    const userData = this.prepareUserData();

    const request = this.isEditing 
      ? this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/${this.currentUser.id}`, userData)
      : this.http.post<ApiResponse<User>>(`${this.apiUrl}/users`, userData);

    request.pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            if (this.isEditing) {
              const index = this.users.findIndex(u => u.id === this.currentUser.id);
              if (index !== -1) {
                this.users[index] = response.data;
              }
            } else {
              this.users.push(response.data);
            }
            this.closeUserModal();
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error saving user:', error);
          this.loading = false;
        }
      });
  }

  private validateUser(): boolean {
    if (!this.currentUser.name || !this.currentUser.email) {
      alert('Por favor complete todos los campos requeridos');
      return false;
    }
    return true;
  }

  private prepareUserData(): any {
    const userData = { ...this.currentUser };
    
    // Remover password vacío si está editando
    if (this.isEditing && !userData.password) {
      delete userData.password;
    }

    // Agregar asignaciones
    userData.role_ids = this.assignedRoles;
    userData.permission_ids = this.assignedPermissions;
    userData.system_ids = this.assignedSystems;
    userData.menu_ids = this.assignedMenus;

    return userData;
  }

  private loadUserAssignments(user: User): void {
    this.assignedRoles = user.roles?.map(r => r.id) || [];
    this.assignedPermissions = user.permissions?.map(p => p.id) || [];
    this.assignedSystems = user.systems?.map(s => s.id) || [];
    this.assignedMenus = user.menus?.map(m => m.id) || [];
  }

  private resetAssignments(): void {
    this.assignedRoles = [];
    this.assignedPermissions = [];
    this.assignedSystems = [];
    this.assignedMenus = [];
  }

  // Métodos de asignación
  isRoleAssigned(roleId: number): boolean {
    return this.assignedRoles.includes(roleId);
  }

  toggleRole(roleId: number, event: any): void {
    if (event.target.checked) {
      this.assignedRoles.push(roleId);
    } else {
      this.assignedRoles = this.assignedRoles.filter(id => id !== roleId);
    }
  }

  isPermissionAssigned(permissionId: number): boolean {
    return this.assignedPermissions.includes(permissionId);
  }

  togglePermission(permissionId: number, event: any): void {
    if (event.target.checked) {
      this.assignedPermissions.push(permissionId);
    } else {
      this.assignedPermissions = this.assignedPermissions.filter(id => id !== permissionId);
    }
  }

  isSystemAssigned(systemId: number): boolean {
    return this.assignedSystems.includes(systemId);
  }

  toggleSystem(systemId: number, event: any): void {
    if (event.target.checked) {
      this.assignedSystems.push(systemId);
    } else {
      this.assignedSystems = this.assignedSystems.filter(id => id !== systemId);
      // Remover menús del sistema desasignado
      this.assignedMenus = this.assignedMenus.filter(menuId => {
        const menu = this.availableMenus.find(m => m.id === menuId);
        return menu?.sistema_id !== systemId;
      });
    }
  }

  isMenuAssigned(menuId: number): boolean {
    return this.assignedMenus.includes(menuId);
  }

  toggleMenu(menuId: number, event: any): void {
    if (event.target.checked) {
      this.assignedMenus.push(menuId);
    } else {
      this.assignedMenus = this.assignedMenus.filter(id => id !== menuId);
    }
  }

  getSystemMenus(systemId: number): Menu[] {
    return this.availableMenus.filter(menu => menu.sistema_id === systemId);
  }

  get assignedSystemsList(): System[] {
    return this.availableSystems.filter(system => this.assignedSystems.includes(system.id));
  }
}