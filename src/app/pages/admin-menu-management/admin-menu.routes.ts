import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { MenuManagementGuard, RoleManagementGuard, UserManagementGuard } from '../../guards/permission.guard';

export const ADMIN_MENU_ROUTES: Routes = [
  // Dashboard
  {
    path: '',
    loadComponent: () => import('./admin-menu-management.component').then(m => m.AdminMenuManagementComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },

  // Menús
  {
    path: 'menus',
    loadComponent: () => import('./menu-list/menu-list.component').then(m => m.MenuListComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },
  {
    path: 'menus/create',
    loadComponent: () => import('./menu-form/menu-form.component').then(m => m.MenuFormComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },
  {
    path: 'menus/edit/:id',
    loadComponent: () => import('./menu-form/menu-form.component').then(m => m.MenuFormComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },

  // Roles
  {
    path: 'roles',
    loadComponent: () => import('./role-permissions/role-permissions.component').then(m => m.RolePermissionsComponent),
    canActivate: [authGuard, RoleManagementGuard]
  },

  // Auditoría
  {
    path: 'audit',
    loadComponent: () => import('./audit-system/audit-system.component').then(m => m.AuditSystemComponent),
    canActivate: [authGuard],
    data: { title: 'Sistema de Auditoría', permissions: ['admin.auditoria'] }
  },

  // Jerarquía y Sistemas
  {
    path: 'hierarchy',
    loadComponent: () => import('./menu-hierarchy/menu-hierarchy.component').then(m => m.MenuHierarchyComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },
  {
    path: 'systems',
    loadComponent: () => import('./system-management/system-management.component').then(m => m.SystemManagementComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },
  {
    path: 'module-discovery',
    loadComponent: () => import('./module-discovery-public/module-discovery-public.component').then(m => m.ModuleDiscoveryPublicComponent),
    canActivate: [authGuard, MenuManagementGuard]
  },

  // Gestión de Usuarios
  {
    path: 'users',
    loadComponent: () => import('./user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard, UserManagementGuard],
    data: { permissions: ['admin.usuarios', 'usuarios.ver'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'users/create',
    loadComponent: () => import('./user-create/user-create.component').then(m => m.UserCreateComponent),
    canActivate: [authGuard, UserManagementGuard],
    data: { permissions: ['usuarios.crear'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'users/roles',
    loadComponent: () => import('./user-roles/user-roles.component').then(m => m.UserRolesComponent),
    canActivate: [authGuard, RoleManagementGuard],
    data: { permissions: ['admin.roles', 'roles.asignar'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'users/permissions',
    loadComponent: () => import('./user-permissions/user-permissions.component').then(m => m.UserPermissionsComponent),
    canActivate: [authGuard, UserManagementGuard],
    data: { permissions: ['admin.permisos', 'permisos.gestionar'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'users/activity',
    loadComponent: () => import('./user-activity/user-activity.component').then(m => m.UserActivityComponent),
    canActivate: [authGuard, UserManagementGuard],
    data: { permissions: ['admin.auditoria', 'usuarios.actividad'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'user-access',
    loadComponent: () => import('./user-menu-access/user-menu-access.component').then(m => m.UserMenuAccessComponent),
    canActivate: [authGuard, UserManagementGuard],
    data: { permissions: ['admin.accesos', 'usuarios.accesos'], roles: ['Super Admin', 'Admin'] }
  },
];
