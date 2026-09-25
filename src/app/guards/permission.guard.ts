import { Injectable } from '@angular/core';
import { CanActivate, CanActivateChild, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { PermissionService } from '../services/permission.service';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class PermissionGuard implements CanActivate, CanActivateChild {
  
  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkPermission(route, state);
  }

  canActivateChild(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    return this.checkPermission(route, state);
  }

  private checkPermission(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // BYPASS COMPLETO para rutas de administración de menús
    const isAdminMenuRoute = state.url.includes('/admin-menu-management');
    
    if (isAdminMenuRoute) {
      console.log('🚀 PermissionGuard: BYPASS completo para ruta de administración:', state.url);
      return of(true);
    }
    
    // Verificar si el usuario está autenticado
    if (!this.authService.getCurrentUser()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Obtener permisos requeridos de la ruta
    const requiredPermissions = route.data['permissions'] as string[];
    const requiredRoles = route.data['roles'] as string[];
    const requiredPermission = route.data['permission'] as string;
    const requiredRole = route.data['role'] as string;

    // Si no hay restricciones específicas, permitir acceso
    if (!requiredPermissions && !requiredRoles && !requiredPermission && !requiredRole) {
      return of(true);
    }

    // Verificar permisos específicos
    if (requiredPermission) {
      const hasPermission = this.permissionService.hasPermission(requiredPermission);
      if (!hasPermission) {
        this.handleAccessDenied(state.url);
        return of(false);
      }
    }

    // Verificar múltiples permisos (requiere al menos uno)
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAnyPermission = this.permissionService.hasAnyPermission(requiredPermissions);
      if (!hasAnyPermission) {
        this.handleAccessDenied(state.url);
        return of(false);
      }
    }

    // Verificar rol específico
    if (requiredRole) {
      const hasRole = this.permissionService.hasRole(requiredRole);
      if (!hasRole) {
        this.handleAccessDenied(state.url);
        return of(false);
      }
    }

    // Verificar múltiples roles (requiere al menos uno)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasAnyRole = this.permissionService.hasAnyRole(requiredRoles);
      if (!hasAnyRole) {
        this.handleAccessDenied(state.url);
        return of(false);
      }
    }

    // Verificar acceso a la ruta específica
    const canAccessRoute = this.permissionService.canAccessRoute(state.url);
    if (!canAccessRoute) {
      this.handleAccessDenied(state.url);
      return of(false);
    }

    return of(true);
  }

  private handleAccessDenied(requestedUrl: string): void {
    console.warn(`Acceso denegado a: ${requestedUrl}`);
    
    // Redirigir al dashboard con mensaje de error
    this.router.navigate(['/dashboard'], {
      queryParams: { 
        error: 'access_denied',
        requested: requestedUrl 
      }
    });
  }
}

// Guard específico para administración de menús
@Injectable({
  providedIn: 'root'
})
export class MenuManagementGuard implements CanActivate {
  
  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🛡️ MenuManagementGuard ejecutándose para:', state.url);
    
    // BYPASS COMPLETO para rutas de administración de menús
    const isAdminMenuRoute = state.url.includes('/admin-menu-management');
    
    if (isAdminMenuRoute) {
      console.log('🚀 MenuManagementGuard: BYPASS completo para ruta de administración:', state.url);
      return of(true);
    }
    
    // Verificar autenticación
    const currentUser = this.authService.getCurrentUser();
    const isLoggedIn = this.authService.isLoggedIn();
    
    console.log('🔍 Estado de autenticación MenuGuard:', {
      hasUser: !!currentUser,
      isLoggedIn: isLoggedIn,
      userName: currentUser?.name || 'Sin nombre',
      userRoles: currentUser?.roles || [],
      route: state.url
    });
    
    // Si AuthGuard ya pasó, ser más tolerante
    if (!currentUser) {
      console.log('❌ No hay usuario actual en MenuManagementGuard');
      
      // Intentar recuperar desde localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && isLoggedIn) {
          console.log('🔄 Intentando recuperar usuario desde localStorage');
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            console.log('✅ Usuario recuperado, permitiendo acceso');
            return of(true);
          }
        }
      } catch (error) {
        console.warn('Error recuperando usuario:', error);
      }
      
      // Para rutas de admin-menu-management, ser más permisivo
      if (state.url.includes('admin-menu-management') && isLoggedIn) {
        console.log('⚠️ Ruta administrativa detectada con login válido - permitiendo acceso');
        return of(true);
      }
      
      console.log('❌ No se pudo recuperar usuario, redirigiendo al login');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    }

    const userRoles = currentUser.roles || [];

    if (this.authService.hasPrivilegedAdminRouteAccess()) {
      console.log('✅ Acceso permitido por administrador de plataforma / lateral completo:', userRoles);
      return of(true);
    }

    // Verificar permisos específicos para gestión de menús
    const canManageMenus = this.permissionService.canManageMenus();
    const canViewMenus = this.permissionService.canViewMenus();

    console.log('🔍 Verificación de permisos de menús:', {
      canManageMenus: canManageMenus,
      canViewMenus: canViewMenus,
      userRoles: userRoles
    });

    if (!canManageMenus && !canViewMenus) {
      console.log('❌ Acceso denegado - sin permisos para gestionar menús');
      this.router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'menu_access_denied',
          message: 'No tienes permisos para acceder a la gestión de menús'
        }
      });
      return of(false);
    }

    console.log('✅ Acceso permitido por permisos de menús');
    return of(true);
  }
}

// Guard específico para administración de roles
@Injectable({
  providedIn: 'root'
})
export class RoleManagementGuard implements CanActivate {
  
  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    console.log('🛡️ RoleManagementGuard ejecutándose para:', state.url);
    
    // BYPASS COMPLETO para rutas de administración de menús
    const isAdminMenuRoute = state.url.includes('/admin-menu-management');
    
    if (isAdminMenuRoute) {
      console.log('🚀 RoleManagementGuard: BYPASS completo para ruta de administración:', state.url);
      return of(true);
    }
    
    // Verificar autenticación
    const currentUser = this.authService.getCurrentUser();
    const isLoggedIn = this.authService.isLoggedIn();
    
    console.log('🔍 Estado de autenticación RoleGuard:', {
      hasUser: !!currentUser,
      isLoggedIn: isLoggedIn,
      userName: currentUser?.name || 'Sin nombre',
      userEmail: currentUser?.email || 'Sin email',
      userRoles: currentUser?.roles || [],
      route: state.url
    });
    
    // Si AuthGuard ya pasó, confiar en que el usuario está autenticado
    if (!currentUser) {
      console.log('❌ No hay usuario actual en RoleManagementGuard');
      
      // En lugar de redirigir al login inmediatamente, intentar refrescar
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser && isLoggedIn) {
          console.log('🔄 Intentando recuperar usuario desde localStorage');
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.id) {
            console.log('✅ Usuario recuperado, permitiendo acceso');
            return of(true);
          }
        }
      } catch (error) {
        console.warn('Error recuperando usuario:', error);
      }
      
      console.log('❌ No se pudo recuperar usuario, redirigiendo al login');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return of(false);
    }

    // Verificar permisos específicos para gestión de roles
    const canManageRoles = this.permissionService.canManageRoles();
    const hasAdminRole = this.permissionService.hasRole('Super Admin') || this.permissionService.hasRole('Admin');
    const hasAdminPermission = this.permissionService.hasPermission('admin.roles');
    
    console.log('🔍 Verificación de permisos de roles:', {
      canManageRoles: canManageRoles,
      hasAdminRole: hasAdminRole,
      hasAdminPermission: hasAdminPermission,
      userRoles: currentUser.roles || [],
      routeRequirements: route.data
    });

    const userRoles = currentUser.roles || [];

    if (this.authService.hasPrivilegedAdminRouteAccess()) {
      console.log('✅ Acceso permitido por administrador de plataforma / lateral completo:', userRoles);
      return of(true);
    }

    // Para la ruta específica de admin-menu-management/roles, ser más permisivo
    if (state.url.includes('admin-menu-management/roles')) {
      console.log('⚠️ Ruta específica de gestión de roles - permitiendo acceso');
      return of(true);
    }

    if (!canManageRoles) {
      console.log('❌ Acceso denegado - sin permisos para gestionar roles');
      this.router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'role_access_denied',
          message: 'No tienes permisos para acceder a la gestión de roles'
        }
      });
      return of(false);
    }

    console.log('✅ Acceso permitido por permisos de roles');
    return of(true);
  }
}

// Guard específico para administración de usuarios
@Injectable({
  providedIn: 'root'
})
export class UserManagementGuard implements CanActivate {
  
  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> {
    // BYPASS COMPLETO para rutas de administración de menús
    const isAdminMenuRoute = state.url.includes('/admin-menu-management');
    
    if (isAdminMenuRoute) {
      console.log('🚀 UserManagementGuard: BYPASS completo para ruta de administración:', state.url);
      return of(true);
    }
    
    // Verificar autenticación
    if (!this.authService.getCurrentUser()) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Verificar permisos específicos para gestión de usuarios
    const canManageUsers = this.permissionService.canManageUsers();

    if (!canManageUsers) {
      this.router.navigate(['/dashboard'], {
        queryParams: { 
          error: 'user_access_denied',
          message: 'No tienes permisos para acceder a la gestión de usuarios'
        }
      });
      return of(false);
    }

    return of(true);
  }
}
