import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { NotificationService } from './notification.service';

export interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  is_active: boolean;
  is_system: boolean;
  permissions_count: number;
  users_count: number;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string;
  module: string;
  category: string;
  is_active: boolean;
  is_system: boolean;
  roles_count: number;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  username: string;
  avatar?: string;
  is_active: boolean;
  last_login?: string;
  roles: Role[];
  permissions: Permission[];
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: number;
  name: string;
  display_name: string;
  url: string;
  icon: string;
  parent_id?: number;
  order: number;
  is_active: boolean;
  is_system: boolean;
  permissions: MenuPermission[];
  children?: MenuItem[];
  created_at: string;
  updated_at: string;
}

export interface MenuPermission {
  id: number;
  menu_id: number;
  role_id?: number;
  user_id?: number;
  permission_type: 'role' | 'user';
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage: boolean;
  can_export: boolean;
  can_import: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by?: number;
  updated_by?: number;
}

export interface RolePermission {
  id: number;
  role_id: number;
  permission_id: number;
  granted: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: number;
  user_id: number;
  role_id: number;
  assigned_at: string;
  assigned_by: number;
  expires_at?: string;
  is_active: boolean;
}

export interface PermissionStats {
  total_roles: number;
  active_roles: number;
  total_permissions: number;
  active_permissions: number;
  total_users: number;
  active_users: number;
  total_menus: number;
  active_menus: number;
  permissions_by_module: { [key: string]: number };
  roles_by_permission: { [key: string]: number };
}

@Injectable({
  providedIn: 'root'
})
export class RolePermissionManagementService {
  private rolesSubject = new BehaviorSubject<Role[]>([]);
  private permissionsSubject = new BehaviorSubject<Permission[]>([]);
  private usersSubject = new BehaviorSubject<User[]>([]);
  private menusSubject = new BehaviorSubject<MenuItem[]>([]);
  private menuPermissionsSubject = new BehaviorSubject<MenuPermission[]>([]);
  private statsSubject = new BehaviorSubject<PermissionStats | null>(null);

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService
  ) {
    this.loadInitialData();
  }

  // Observables públicos
  get roles$(): Observable<Role[]> {
    return this.rolesSubject.asObservable();
  }

  get permissions$(): Observable<Permission[]> {
    return this.permissionsSubject.asObservable();
  }

  get users$(): Observable<User[]> {
    return this.usersSubject.asObservable();
  }

  get menus$(): Observable<MenuItem[]> {
    return this.menusSubject.asObservable();
  }

  get menuPermissions$(): Observable<MenuPermission[]> {
    return this.menuPermissionsSubject.asObservable();
  }

  get stats$(): Observable<PermissionStats | null> {
    return this.statsSubject.asObservable();
  }

  // Métodos para cargar datos iniciales
  private loadInitialData(): void {
    this.loadRoles();
    this.loadPermissions();
    this.loadUsers();
    this.loadMenus();
    this.loadMenuPermissions();
    this.loadStats();
  }

  // Gestión de Roles
  loadRoles(): Observable<Role[]> {
    return this.apiService.get<Role[]>('roles').pipe(
      map(response => response.data || []),
      tap(roles => this.rolesSubject.next(roles)),
      catchError(error => {
        console.error('Error loading roles:', error);
        this.notificationService.error('Error al cargar los roles');
        return throwError(error);
      })
    );
  }

  createRole(roleData: Partial<Role>): Observable<Role> {
    return this.apiService.post<Role>('roles', roleData).pipe(
      map(response => response.data),
      tap(newRole => {
        const currentRoles = this.rolesSubject.value;
        this.rolesSubject.next([...currentRoles, newRole]);
        this.notificationService.success('Rol creado exitosamente');
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error creating role:', error);
        this.notificationService.error('Error al crear el rol');
        return throwError(error);
      })
    );
  }

  updateRole(id: number, roleData: Partial<Role>): Observable<Role> {
    return this.apiService.put<Role>(`roles/${id}`, roleData).pipe(
      map(response => response.data),
      tap(updatedRole => {
        const currentRoles = this.rolesSubject.value;
        const index = currentRoles.findIndex(r => r.id === id);
        if (index !== -1) {
          currentRoles[index] = updatedRole;
          this.rolesSubject.next([...currentRoles]);
        }
        this.notificationService.success('Rol actualizado exitosamente');
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error updating role:', error);
        this.notificationService.error('Error al actualizar el rol');
        return throwError(error);
      })
    );
  }

  deleteRole(id: number): Observable<boolean> {
    return this.apiService.delete(`roles/${id}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          const currentRoles = this.rolesSubject.value;
          this.rolesSubject.next(currentRoles.filter(r => r.id !== id));
          this.notificationService.success('Rol eliminado exitosamente');
          this.loadStats();
        }
      }),
      catchError(error => {
        console.error('Error deleting role:', error);
        this.notificationService.error('Error al eliminar el rol');
        return throwError(error);
      })
    );
  }

  // Gestión de Permisos
  loadPermissions(): Observable<Permission[]> {
    return this.apiService.get<Permission[]>('roles/permissions/public').pipe(
      map(response => response.data || []),
      tap(permissions => this.permissionsSubject.next(permissions)),
      catchError(error => {
        console.error('Error loading permissions:', error);
        this.notificationService.error('Error al cargar los permisos');
        return throwError(error);
      })
    );
  }

  createPermission(permissionData: Partial<Permission>): Observable<Permission> {
    return this.apiService.post<Permission>('permissions', permissionData).pipe(
      map(response => response.data),
      tap(newPermission => {
        const currentPermissions = this.permissionsSubject.value;
        this.permissionsSubject.next([...currentPermissions, newPermission]);
        this.notificationService.success('Permiso creado exitosamente');
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error creating permission:', error);
        this.notificationService.error('Error al crear el permiso');
        return throwError(error);
      })
    );
  }

  updatePermission(id: number, permissionData: Partial<Permission>): Observable<Permission> {
    return this.apiService.put<Permission>(`permissions/${id}`, permissionData).pipe(
      map(response => response.data),
      tap(updatedPermission => {
        const currentPermissions = this.permissionsSubject.value;
        const index = currentPermissions.findIndex(p => p.id === id);
        if (index !== -1) {
          currentPermissions[index] = updatedPermission;
          this.permissionsSubject.next([...currentPermissions]);
        }
        this.notificationService.success('Permiso actualizado exitosamente');
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error updating permission:', error);
        this.notificationService.error('Error al actualizar el permiso');
        return throwError(error);
      })
    );
  }

  deletePermission(id: number): Observable<boolean> {
    return this.apiService.delete(`permissions/${id}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          const currentPermissions = this.permissionsSubject.value;
          this.permissionsSubject.next(currentPermissions.filter(p => p.id !== id));
          this.notificationService.success('Permiso eliminado exitosamente');
          this.loadStats();
        }
      }),
      catchError(error => {
        console.error('Error deleting permission:', error);
        this.notificationService.error('Error al eliminar el permiso');
        return throwError(error);
      })
    );
  }

  // Gestión de Usuarios
  loadUsers(): Observable<User[]> {
    return this.apiService.get<User[]>('users').pipe(
      map(response => response.data || []),
      tap(users => this.usersSubject.next(users)),
      catchError(error => {
        console.error('Error loading users:', error);
        this.notificationService.error('Error al cargar los usuarios');
        return throwError(error);
      })
    );
  }

  assignRoleToUser(userId: number, roleId: number, expiresAt?: string): Observable<UserRole> {
    return this.apiService.post<UserRole>('user-roles', {
      user_id: userId,
      role_id: roleId,
      expires_at: expiresAt
    }).pipe(
      map(response => response.data),
      tap(() => {
        this.notificationService.success('Rol asignado al usuario exitosamente');
        this.loadUsers();
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error assigning role to user:', error);
        this.notificationService.error('Error al asignar el rol al usuario');
        return throwError(error);
      })
    );
  }

  removeRoleFromUser(userId: number, roleId: number): Observable<boolean> {
    return this.apiService.delete(`user-roles/${userId}/${roleId}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          this.notificationService.success('Rol removido del usuario exitosamente');
          this.loadUsers();
          this.loadStats();
        }
      }),
      catchError(error => {
        console.error('Error removing role from user:', error);
        this.notificationService.error('Error al remover el rol del usuario');
        return throwError(error);
      })
    );
  }

  // Gestión de Menús
  loadMenus(): Observable<MenuItem[]> {
    return this.apiService.get<MenuItem[]>('menus').pipe(
      map(response => response.data || []),
      tap(menus => this.menusSubject.next(menus)),
      catchError(error => {
        console.error('Error loading menus:', error);
        this.notificationService.error('Error al cargar los menús');
        return throwError(error);
      })
    );
  }

  // Gestión de Permisos de Menús
  loadMenuPermissions(): Observable<MenuPermission[]> {
    return this.apiService.get<MenuPermission[]>('rol-menus').pipe(
      map(response => response.data || []),
      tap(permissions => this.menuPermissionsSubject.next(permissions)),
      catchError(error => {
        console.error('Error loading menu permissions:', error);
        this.notificationService.error('Error al cargar los permisos de menús');
        return throwError(error);
      })
    );
  }

  createMenuPermission(permissionData: Partial<MenuPermission>): Observable<MenuPermission> {
    return this.apiService.post<MenuPermission>('rol-menus', permissionData).pipe(
      map(response => response.data),
      tap(newPermission => {
        const currentPermissions = this.menuPermissionsSubject.value;
        this.menuPermissionsSubject.next([...currentPermissions, newPermission]);
        this.notificationService.success('Permiso de menú creado exitosamente');
      }),
      catchError(error => {
        console.error('Error creating menu permission:', error);
        this.notificationService.error('Error al crear el permiso de menú');
        return throwError(error);
      })
    );
  }

  updateMenuPermission(id: number, permissionData: Partial<MenuPermission>): Observable<MenuPermission> {
    return this.apiService.put<MenuPermission>(`rol-menus/${id}`, permissionData).pipe(
      map(response => response.data),
      tap(updatedPermission => {
        const currentPermissions = this.menuPermissionsSubject.value;
        const index = currentPermissions.findIndex(p => p.id === id);
        if (index !== -1) {
          currentPermissions[index] = updatedPermission;
          this.menuPermissionsSubject.next([...currentPermissions]);
        }
        this.notificationService.success('Permiso de menú actualizado exitosamente');
      }),
      catchError(error => {
        console.error('Error updating menu permission:', error);
        this.notificationService.error('Error al actualizar el permiso de menú');
        return throwError(error);
      })
    );
  }

  deleteMenuPermission(id: number): Observable<boolean> {
    return this.apiService.delete(`rol-menus/${id}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          const currentPermissions = this.menuPermissionsSubject.value;
          this.menuPermissionsSubject.next(currentPermissions.filter(p => p.id !== id));
          this.notificationService.success('Permiso de menú eliminado exitosamente');
        }
      }),
      catchError(error => {
        console.error('Error deleting menu permission:', error);
        this.notificationService.error('Error al eliminar el permiso de menú');
        return throwError(error);
      })
    );
  }

  // Gestión de Permisos de Roles
  assignPermissionToRole(roleId: number, permissionId: number): Observable<RolePermission> {
    return this.apiService.post<RolePermission>('role-permissions', {
      role_id: roleId,
      permission_id: permissionId,
      granted: true
    }).pipe(
      map(response => response.data),
      tap(() => {
        this.notificationService.success('Permiso asignado al rol exitosamente');
        this.loadRoles();
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error assigning permission to role:', error);
        this.notificationService.error('Error al asignar el permiso al rol');
        return throwError(error);
      })
    );
  }

  removePermissionFromRole(roleId: number, permissionId: number): Observable<boolean> {
    return this.apiService.delete(`role-permissions/${roleId}/${permissionId}`).pipe(
      map(response => response.success),
      tap(success => {
        if (success) {
          this.notificationService.success('Permiso removido del rol exitosamente');
          this.loadRoles();
          this.loadStats();
        }
      }),
      catchError(error => {
        console.error('Error removing permission from role:', error);
        this.notificationService.error('Error al remover el permiso del rol');
        return throwError(error);
      })
    );
  }

  // Estadísticas
  loadStats(): Observable<PermissionStats> {
    return this.apiService.get<PermissionStats>('permission-stats').pipe(
      map(response => response.data),
      tap(stats => this.statsSubject.next(stats)),
      catchError(error => {
        console.error('Error loading stats:', error);
        return throwError(error);
      })
    );
  }

  // Métodos de utilidad
  getRoleById(id: number): Role | undefined {
    return this.rolesSubject.value.find(r => r.id === id);
  }

  getPermissionById(id: number): Permission | undefined {
    return this.permissionsSubject.value.find(p => p.id === id);
  }

  getUserById(id: number): User | undefined {
    return this.usersSubject.value.find(u => u.id === id);
  }

  getMenuById(id: number): MenuItem | undefined {
    return this.menusSubject.value.find(m => m.id === id);
  }

  getMenuPermissionsByRole(roleId: number): MenuPermission[] {
    return this.menuPermissionsSubject.value.filter(mp => 
      mp.permission_type === 'role' && mp.role_id === roleId
    );
  }

  getMenuPermissionsByUser(userId: number): MenuPermission[] {
    return this.menuPermissionsSubject.value.filter(mp => 
      mp.permission_type === 'user' && mp.user_id === userId
    );
  }

  getMenuPermissionsByMenu(menuId: number): MenuPermission[] {
    return this.menuPermissionsSubject.value.filter(mp => mp.menu_id === menuId);
  }

  // Métodos de búsqueda y filtrado
  searchRoles(query: string): Role[] {
    const roles = this.rolesSubject.value;
    if (!query) return roles;
    
    return roles.filter(role => 
      role.name.toLowerCase().includes(query.toLowerCase()) ||
      role.display_name.toLowerCase().includes(query.toLowerCase()) ||
      role.description.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchPermissions(query: string): Permission[] {
    const permissions = this.permissionsSubject.value;
    if (!query) return permissions;
    
    return permissions.filter(permission => 
      permission.name.toLowerCase().includes(query.toLowerCase()) ||
      permission.display_name.toLowerCase().includes(query.toLowerCase()) ||
      permission.description.toLowerCase().includes(query.toLowerCase()) ||
      permission.module.toLowerCase().includes(query.toLowerCase())
    );
  }

  searchUsers(query: string): User[] {
    const users = this.usersSubject.value;
    if (!query) return users;
    
    return users.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      user.username.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Métodos de validación
  validateRoleData(roleData: Partial<Role>): string[] {
    const errors: string[] = [];
    
    if (!roleData.name || roleData.name.trim().length < 2) {
      errors.push('El nombre del rol debe tener al menos 2 caracteres');
    }
    
    if (!roleData.display_name || roleData.display_name.trim().length < 2) {
      errors.push('El nombre de visualización debe tener al menos 2 caracteres');
    }
    
    if (!roleData.description || roleData.description.trim().length < 5) {
      errors.push('La descripción debe tener al menos 5 caracteres');
    }
    
    return errors;
  }

  validatePermissionData(permissionData: Partial<Permission>): string[] {
    const errors: string[] = [];
    
    if (!permissionData.name || permissionData.name.trim().length < 2) {
      errors.push('El nombre del permiso debe tener al menos 2 caracteres');
    }
    
    if (!permissionData.display_name || permissionData.display_name.trim().length < 2) {
      errors.push('El nombre de visualización debe tener al menos 2 caracteres');
    }
    
    if (!permissionData.module || permissionData.module.trim().length < 2) {
      errors.push('El módulo debe tener al menos 2 caracteres');
    }
    
    return errors;
  }

  // Métodos de exportación/importación
  exportRoles(): Observable<any> {
    return this.apiService.get('roles/export');
  }

  exportPermissions(): Observable<any> {
    return this.apiService.get('roles/permissions/export');
  }

  exportMenuPermissions(): Observable<any> {
    return this.apiService.get('rol-menus/export');
  }

  importRoles(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.apiService.post('roles/import', formData).pipe(
      tap(() => {
        this.notificationService.success('Roles importados exitosamente');
        this.loadRoles();
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error importing roles:', error);
        this.notificationService.error('Error al importar los roles');
        return throwError(error);
      })
    );
  }

  importPermissions(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.apiService.post('permissions/import', formData).pipe(
      tap(() => {
        this.notificationService.success('Permisos importados exitosamente');
        this.loadPermissions();
        this.loadStats();
      }),
      catchError(error => {
        console.error('Error importing permissions:', error);
        this.notificationService.error('Error al importar los permisos');
        return throwError(error);
      })
    );
  }
}
