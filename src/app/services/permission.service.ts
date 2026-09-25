import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService, User } from './auth.service';
import { ApiService } from './api.service';

export interface Permission {
  id: number;
  name: string;
  description: string;
  module: string;
  granted: boolean;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  users_count: number;
  created_at: string;
  updated_at?: string;
  is_active?: boolean;
}

export interface MenuPermission {
  id: number;
  menu_id: number;
  role_id: number;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
  created_at: string;
  updated_at?: string;
}

export interface MenuItem {
  id: number;
  name: string;
  url: string;
  icon: string;
  parent_id?: number;
  order: number;
  is_active: boolean;
  permissions: MenuPermission[];
  children?: MenuItem[];
}

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private currentUserPermissions = new BehaviorSubject<Permission[]>([]);
  private currentUserRoles = new BehaviorSubject<Role[]>([]);
  private availableRoles = new BehaviorSubject<Role[]>([]);
  private availablePermissions = new BehaviorSubject<Permission[]>([]);
  private menuPermissions = new BehaviorSubject<MenuPermission[]>([]);

  constructor(
    private authService: AuthService,
    private apiService: ApiService
  ) {
    this.initializePermissions();
  }

  private initializePermissions(): void {
    // Cargar permisos del usuario actual
    this.loadCurrentUserPermissions();
    // Cargar roles y permisos disponibles
    this.loadAvailableRoles();
    this.loadAvailablePermissions();
    this.loadMenuPermissions();
  }

  // Observables públicos
  get currentUserPermissions$(): Observable<Permission[]> {
    return this.currentUserPermissions.asObservable();
  }

  get currentUserRoles$(): Observable<Role[]> {
    return this.currentUserRoles.asObservable();
  }

  get availableRoles$(): Observable<Role[]> {
    return this.availableRoles.asObservable();
  }

  get availablePermissions$(): Observable<Permission[]> {
    return this.availablePermissions.asObservable();
  }

  get menuPermissions$(): Observable<MenuPermission[]> {
    return this.menuPermissions.asObservable();
  }

  // Métodos para verificar permisos
  hasPermission(permissionName: string): boolean {
    const permissions = this.currentUserPermissions.value;
    const hasPermission = permissions.some(p => p.name === permissionName && p.granted);
    console.log('🔍 hasPermission check:', {
      permissionName: permissionName,
      availablePermissions: permissions.filter(p => p.granted).map(p => p.name),
      hasPermission: hasPermission
    });
    return hasPermission;
  }

  hasAnyPermission(permissionNames: string[]): boolean {
    return permissionNames.some(name => this.hasPermission(name));
  }

  hasAllPermissions(permissionNames: string[]): boolean {
    return permissionNames.every(name => this.hasPermission(name));
  }

  hasRole(roleName: string): boolean {
    const roles = this.currentUserRoles.value;
    const hasRole = roles.some(r => r.name === roleName);
    console.log('🔍 hasRole check:', {
      roleName: roleName,
      availableRoles: roles.map(r => r.name),
      hasRole: hasRole
    });
    return hasRole;
  }

  hasAnyRole(roleNames: string[]): boolean {
    return roleNames.some(name => this.hasRole(name));
  }

  // Métodos específicos para administración de menús
  canManageMenus(): boolean {
    return (
      this.authService.hasPrivilegedAdminRouteAccess() ||
      this.hasPermission('admin.menus')
    );
  }

  canViewMenus(): boolean {
    return this.hasPermission('menus.ver') || this.canManageMenus() || this.hasPermission('dashboard.ver');
  }

  canCreateMenus(): boolean {
    return this.hasPermission('menus.crear') || this.canManageMenus();
  }

  canEditMenus(): boolean {
    return this.hasPermission('menus.editar') || this.canManageMenus();
  }

  canDeleteMenus(): boolean {
    return this.hasPermission('menus.eliminar') || this.canManageMenus();
  }

  canManageRoles(): boolean {
    return (
      this.authService.hasPrivilegedAdminRouteAccess() ||
      this.hasPermission('admin.roles')
    );
  }

  canManageUsers(): boolean {
    return (
      this.authService.hasPrivilegedAdminRouteAccess() ||
      this.hasPermission('admin.usuarios')
    );
  }

  // Métodos para gestión de permisos de menús específicos
  canAccessMenu(menuId: number): boolean {
    const menuPermissions = this.menuPermissions.value;
    const userRoles = this.currentUserRoles.value;
    
    // Super Admin puede acceder a todo
    if (this.hasRole('Super Admin')) {
      return true;
    }

    // Verificar permisos específicos del menú
    return menuPermissions.some(mp => 
      mp.menu_id === menuId && 
      mp.can_view && 
      userRoles.some(role => role.id === mp.role_id)
    );
  }

  canManageMenu(menuId: number): boolean {
    const menuPermissions = this.menuPermissions.value;
    const userRoles = this.currentUserRoles.value;
    
    // Super Admin puede gestionar todo
    if (this.hasRole('Super Admin')) {
      return true;
    }

    // Verificar permisos de gestión específicos del menú
    return menuPermissions.some(mp => 
      mp.menu_id === menuId && 
      mp.can_manage && 
      userRoles.some(role => role.id === mp.role_id)
    );
  }

  // Métodos para cargar datos
  private loadCurrentUserPermissions(): void {
    const currentUser = this.authService.getCurrentUser();
    console.log('🔄 Cargando permisos para usuario:', currentUser?.name || 'Sin usuario');
    
    if (currentUser) {
      // Simular carga de permisos del usuario actual
      const userRoles = currentUser.roles || [];
      const isAdmin = userRoles.includes('Super Admin') || userRoles.includes('Admin') || userRoles.includes('Administrador del Sistema');
      
      console.log('👤 Usuario encontrado:', {
        name: currentUser.name,
        email: currentUser.email,
        roles: userRoles,
        isAdmin: isAdmin
      });
      
      const mockPermissions: Permission[] = [
        { id: 1, name: 'dashboard.ver', description: 'Ver dashboard', module: 'Core', granted: true },
        { id: 2, name: 'menus.ver', description: 'Ver menús', module: 'Core', granted: true },
        { id: 3, name: 'menus.crear', description: 'Crear menús', module: 'Core', granted: isAdmin },
        { id: 4, name: 'menus.editar', description: 'Editar menús', module: 'Core', granted: isAdmin },
        { id: 5, name: 'menus.eliminar', description: 'Eliminar menús', module: 'Core', granted: isAdmin },
        { id: 6, name: 'admin.menus', description: 'Administrar menús', module: 'Core', granted: isAdmin },
        { id: 7, name: 'admin.roles', description: 'Administrar roles', module: 'Core', granted: isAdmin },
        { id: 8, name: 'admin.usuarios', description: 'Administrar usuarios', module: 'Core', granted: isAdmin },
        { id: 9, name: 'menus.gestionar', description: 'Gestionar menús', module: 'Core', granted: isAdmin },
        { id: 10, name: 'roles.ver', description: 'Ver roles', module: 'Core', granted: isAdmin },
        { id: 11, name: 'roles.crear', description: 'Crear roles', module: 'Core', granted: isAdmin },
        { id: 12, name: 'roles.editar', description: 'Editar roles', module: 'Core', granted: isAdmin },
        { id: 13, name: 'roles.eliminar', description: 'Eliminar roles', module: 'Core', granted: isAdmin },
        { id: 14, name: 'usuarios.ver', description: 'Ver usuarios', module: 'Core', granted: isAdmin },
        { id: 15, name: 'usuarios.crear', description: 'Crear usuarios', module: 'Core', granted: isAdmin },
        { id: 16, name: 'usuarios.editar', description: 'Editar usuarios', module: 'Core', granted: isAdmin },
        { id: 17, name: 'usuarios.eliminar', description: 'Eliminar usuarios', module: 'Core', granted: isAdmin },
        { id: 18, name: 'empleados.ver', description: 'Ver empleados', module: 'Core', granted: true },
        { id: 19, name: 'admin.sistemas', description: 'Administrar sistemas', module: 'Core', granted: isAdmin }
      ];
      
      this.currentUserPermissions.next(mockPermissions);
      
      // Cargar roles del usuario actual
      const mockRoles: Role[] = userRoles.map(roleName => ({
        id: roleName === 'Super Admin' ? 1 : roleName === 'Admin' ? 2 : roleName === 'Administrador del Sistema' ? 2 : 3,
        name: roleName,
        description: roleName === 'Super Admin' ? 'Administrador principal del sistema' : 
                    roleName === 'Admin' || roleName === 'Administrador del Sistema' ? 'Administrador del sistema' : 'Usuario estándar',
        permissions: mockPermissions.filter(p => p.granted),
        users_count: 1,
        created_at: new Date().toISOString()
      }));
      
      this.currentUserRoles.next(mockRoles);
      
      console.log('✅ Permisos cargados:', {
        permissionsCount: mockPermissions.filter(p => p.granted).length,
        rolesCount: mockRoles.length,
        grantedPermissions: mockPermissions.filter(p => p.granted).map(p => p.name),
        userRoles: mockRoles.map(r => r.name)
      });
    } else {
      console.log('❌ No hay usuario actual, limpiando permisos');
      this.currentUserPermissions.next([]);
      this.currentUserRoles.next([]);
    }
  }

  private loadAvailableRoles(): void {
    // Simular carga de roles disponibles
    const mockRoles: Role[] = [
      {
        id: 1,
        name: 'Super Admin',
        description: 'Administrador principal con acceso completo al sistema',
        permissions: [],
        users_count: 1,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        name: 'Admin',
        description: 'Administrador con acceso a gestión de usuarios y menús',
        permissions: [],
        users_count: 3,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 3,
        name: 'Manager',
        description: 'Gerente con acceso limitado a gestión',
        permissions: [],
        users_count: 5,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 4,
        name: 'Employee',
        description: 'Empleado con acceso básico',
        permissions: [],
        users_count: 25,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    
    this.availableRoles.next(mockRoles);
  }

  private loadAvailablePermissions(): void {
    // Simular carga de permisos disponibles
    const mockPermissions: Permission[] = [
      // Permisos de Dashboard
      { id: 1, name: 'dashboard.ver', description: 'Ver dashboard principal', module: 'Dashboard', granted: false },
      
      // Permisos de Menús
      { id: 2, name: 'menus.ver', description: 'Ver menús del sistema', module: 'Menús', granted: false },
      { id: 3, name: 'menus.crear', description: 'Crear nuevos menús', module: 'Menús', granted: false },
      { id: 4, name: 'menus.editar', description: 'Editar menús existentes', module: 'Menús', granted: false },
      { id: 5, name: 'menus.eliminar', description: 'Eliminar menús', module: 'Menús', granted: false },
      { id: 6, name: 'menus.gestionar', description: 'Gestionar estructura de menús', module: 'Menús', granted: false },
      
      // Permisos de Usuarios
      { id: 7, name: 'usuarios.ver', description: 'Ver lista de usuarios', module: 'Usuarios', granted: false },
      { id: 8, name: 'usuarios.crear', description: 'Crear nuevos usuarios', module: 'Usuarios', granted: false },
      { id: 9, name: 'usuarios.editar', description: 'Editar usuarios existentes', module: 'Usuarios', granted: false },
      { id: 10, name: 'usuarios.eliminar', description: 'Eliminar usuarios', module: 'Usuarios', granted: false },
      
      // Permisos de Roles
      { id: 11, name: 'roles.ver', description: 'Ver roles del sistema', module: 'Roles', granted: false },
      { id: 12, name: 'roles.crear', description: 'Crear nuevos roles', module: 'Roles', granted: false },
      { id: 13, name: 'roles.editar', description: 'Editar roles existentes', module: 'Roles', granted: false },
      { id: 14, name: 'roles.eliminar', description: 'Eliminar roles', module: 'Roles', granted: false },
      
      // Permisos de Administración
      { id: 15, name: 'admin.menus', description: 'Administración completa de menús', module: 'Administración', granted: false },
      { id: 16, name: 'admin.usuarios', description: 'Administración completa de usuarios', module: 'Administración', granted: false },
      { id: 17, name: 'admin.roles', description: 'Administración completa de roles', module: 'Administración', granted: false },
      { id: 18, name: 'admin.sistemas', description: 'Administración de sistemas integrados', module: 'Administración', granted: false },
      { id: 19, name: 'admin.auditoria', description: 'Acceso a auditoría del sistema', module: 'Administración', granted: false },
      
      // Permisos de Planillas
      { id: 20, name: 'planillas.ver', description: 'Ver módulo de planillas', module: 'Planillas', granted: false },
      { id: 21, name: 'planillas.crear', description: 'Crear nuevas planillas', module: 'Planillas', granted: false },
      { id: 22, name: 'planillas.editar', description: 'Editar planillas existentes', module: 'Planillas', granted: false },
      { id: 23, name: 'planillas.aprobar', description: 'Aprobar planillas', module: 'Planillas', granted: false }
    ];
    
    this.availablePermissions.next(mockPermissions);
  }

  private loadMenuPermissions(): void {
    // Simular carga de permisos específicos de menús
    const mockMenuPermissions: MenuPermission[] = [
      {
        id: 1,
        menu_id: 1,
        role_id: 1, // Super Admin
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_manage: true,
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 2,
        menu_id: 2,
        role_id: 2, // Admin
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: false,
        can_manage: false,
        created_at: '2024-01-01T00:00:00Z'
      }
    ];
    
    this.menuPermissions.next(mockMenuPermissions);
  }

  // Métodos para gestión de roles y permisos
  async getRoles(): Promise<Role[]> {
    try {
      const response = await this.apiService.get<Role[]>('roles').toPromise();
      return response?.data || [];
    } catch (error: any) {
      console.error('Error cargando roles:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente
    }
  }

  private getMockRoles(): Role[] {
    return [
      {
        id: 1,
        name: 'Super Admin',
        description: 'Administrador principal del sistema',
        permissions: [
          { id: 1, name: 'admin.menus', description: 'Administrar menús', module: 'Core', granted: true },
          { id: 2, name: 'admin.roles', description: 'Administrar roles', module: 'Core', granted: true },
          { id: 3, name: 'admin.usuarios', description: 'Administrar usuarios', module: 'Core', granted: true }
        ],
        users_count: 1,
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Admin',
        description: 'Administrador del sistema',
        permissions: [
          { id: 1, name: 'admin.menus', description: 'Administrar menús', module: 'Core', granted: true },
          { id: 2, name: 'admin.roles', description: 'Administrar roles', module: 'Core', granted: true }
        ],
        users_count: 2,
        is_active: true,
        created_at: new Date().toISOString()
      }
    ];
  }

  async getPermissions(): Promise<Permission[]> {
    try {
      const response = await this.apiService.get<Permission[]>('roles/permissions/public').toPromise();
      return response?.data || [];
    } catch (error: any) {
      console.error('Error cargando permisos:', error);
      throw error; // Re-lanzar el error para que lo maneje el componente
    }
  }

  private getMockPermissions(): Permission[] {
    return [
      { id: 1, name: 'admin.menus', description: 'Administrar menús', module: 'Core', granted: true },
      { id: 2, name: 'menus.gestionar', description: 'Gestionar menús', module: 'Core', granted: true },
      { id: 3, name: 'menus.ver', description: 'Ver menús', module: 'Core', granted: true },
      { id: 4, name: 'menus.crear', description: 'Crear menús', module: 'Core', granted: true },
      { id: 5, name: 'menus.editar', description: 'Editar menús', module: 'Core', granted: true },
      { id: 6, name: 'menus.eliminar', description: 'Eliminar menús', module: 'Core', granted: true },
      { id: 7, name: 'admin.roles', description: 'Administrar roles', module: 'Core', granted: true },
      { id: 8, name: 'roles.ver', description: 'Ver roles', module: 'Core', granted: true },
      { id: 9, name: 'roles.crear', description: 'Crear roles', module: 'Core', granted: true },
      { id: 10, name: 'roles.editar', description: 'Editar roles', module: 'Core', granted: true },
      { id: 11, name: 'roles.eliminar', description: 'Eliminar roles', module: 'Core', granted: true },
      { id: 12, name: 'admin.usuarios', description: 'Administrar usuarios', module: 'Core', granted: true },
      { id: 13, name: 'usuarios.ver', description: 'Ver usuarios', module: 'Core', granted: true },
      { id: 14, name: 'usuarios.crear', description: 'Crear usuarios', module: 'Core', granted: true },
      { id: 15, name: 'usuarios.editar', description: 'Editar usuarios', module: 'Core', granted: true },
      { id: 16, name: 'usuarios.eliminar', description: 'Eliminar usuarios', module: 'Core', granted: true },
      { id: 17, name: 'dashboard.ver', description: 'Ver dashboard', module: 'Core', granted: true },
      { id: 18, name: 'empleados.ver', description: 'Ver empleados', module: 'Core', granted: true },
      { id: 19, name: 'admin.sistemas', description: 'Administrar sistemas', module: 'Core', granted: true }
    ];
  }

  async updateRolePermissions(roleId: number, permissions: Permission[]): Promise<boolean> {
    try {
      const response = await this.apiService.put(`roles/${roleId}/permissions`, {
        permissions: permissions.map(p => ({
          permission_id: p.id,
          granted: p.granted
        }))
      }).toPromise();
      
      return response?.success || false;
    } catch (error) {
      console.error('Error actualizando permisos del rol:', error);
      return false;
    }
  }

  async updateMenuPermissions(menuId: number, roleId: number, permissions: Partial<MenuPermission>): Promise<boolean> {
    try {
      const response = await this.apiService.put(`menus/${menuId}/permissions/${roleId}`, permissions).toPromise();
      return response?.success || false;
    } catch (error) {
      console.error('Error actualizando permisos del menú:', error);
      return false;
    }
  }

  // Método para refrescar permisos del usuario actual
  refreshCurrentUserPermissions(): void {
    this.loadCurrentUserPermissions();
  }

  // Método para verificar si el usuario puede acceder a una ruta específica
  canAccessRoute(route: string): boolean {
    const routePermissions: { [key: string]: string[] } = {
      '/admin-menu-management': ['admin.menus', 'menus.gestionar'],
      '/usuarios': ['admin.usuarios', 'usuarios.ver'],
      '/roles': ['admin.roles', 'roles.ver'],
      '/planillas': ['planillas.ver'],
      '/dashboard': ['dashboard.ver']
    };

    const requiredPermissions = routePermissions[route];
    if (!requiredPermissions) {
      return true; // Si no hay restricciones específicas, permitir acceso
    }

    return this.hasAnyPermission(requiredPermissions);
  }
}
