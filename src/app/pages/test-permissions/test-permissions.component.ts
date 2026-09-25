import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { PermissionService, Role, Permission } from '../../services/permission.service';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-test-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './test-permissions.component.html',
  styleUrls: ['./test-permissions.component.scss']
})
export class TestPermissionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Usuario actual
  currentUser: User | null = null;
  
  // Permisos y roles
  userPermissions: Permission[] = [];
  userRoles: Role[] = [];
  availableRoles: Role[] = [];
  availablePermissions: Permission[] = [];

  // Estados de prueba
  testResults: { [key: string]: boolean } = {};

  constructor(
    private permissionService: PermissionService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.subscribeToServices();
    this.runPermissionTests();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadCurrentUser(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  private subscribeToServices(): void {
    this.permissionService.currentUserPermissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.userPermissions = permissions;
        this.runPermissionTests();
      });

    this.permissionService.currentUserRoles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.userRoles = roles;
        this.runPermissionTests();
      });

    this.permissionService.availableRoles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.availableRoles = roles;
      });

    this.permissionService.availablePermissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.availablePermissions = permissions;
      });
  }

  private runPermissionTests(): void {
    // Pruebas de permisos específicos
    this.testResults = {
      'canManageMenus': this.permissionService.canManageMenus(),
      'canViewMenus': this.permissionService.canViewMenus(),
      'canCreateMenus': this.permissionService.canCreateMenus(),
      'canEditMenus': this.permissionService.canEditMenus(),
      'canDeleteMenus': this.permissionService.canDeleteMenus(),
      'canManageRoles': this.permissionService.canManageRoles(),
      'canManageUsers': this.permissionService.canManageUsers(),
      
      // Pruebas de permisos individuales
      'hasDashboardPermission': this.permissionService.hasPermission('dashboard.ver'),
      'hasMenusPermission': this.permissionService.hasPermission('menus.ver'),
      'hasAdminMenusPermission': this.permissionService.hasPermission('admin.menus'),
      'hasAdminRolesPermission': this.permissionService.hasPermission('admin.roles'),
      'hasAdminUsersPermission': this.permissionService.hasPermission('admin.usuarios'),
      
      // Pruebas de roles
      'hasSuperAdminRole': this.permissionService.hasRole('Super Admin'),
      'hasAdminRole': this.permissionService.hasRole('Admin'),
      'hasManagerRole': this.permissionService.hasRole('Manager'),
      'hasEmployeeRole': this.permissionService.hasRole('Employee'),
      
      // Pruebas de acceso a rutas
      'canAccessAdminMenuManagement': this.permissionService.canAccessRoute('/admin-menu-management'),
      'canAccessUsuarios': this.permissionService.canAccessRoute('/usuarios'),
      'canAccessRoles': this.permissionService.canAccessRoute('/roles'),
      'canAccessDashboard': this.permissionService.canAccessRoute('/dashboard'),
      
      // Pruebas de permisos múltiples
      'hasAnyAdminPermission': this.permissionService.hasAnyPermission(['admin.menus', 'admin.roles', 'admin.usuarios']),
      'hasAllMenuPermissions': this.permissionService.hasAllPermissions(['menus.ver', 'menus.crear', 'menus.editar']),
      'hasAnyAdminRole': this.permissionService.hasAnyRole(['Super Admin', 'Admin'])
    };
  }

  // Métodos para obtener información de permisos
  getPermissionStatus(permissionName: string): boolean {
    return this.permissionService.hasPermission(permissionName);
  }

  getRoleStatus(roleName: string): boolean {
    return this.permissionService.hasRole(roleName);
  }

  getTestResult(testName: string): boolean {
    return this.testResults[testName] || false;
  }

  getTestResultClass(testName: string): string {
    return this.getTestResult(testName) ? 'text-success' : 'text-danger';
  }

  getTestResultIcon(testName: string): string {
    return this.getTestResult(testName) ? 'fas fa-check-circle' : 'fas fa-times-circle';
  }

  // Métodos para estadísticas
  getTotalPermissions(): number {
    return this.userPermissions.length;
  }

  getGrantedPermissions(): number {
    return this.userPermissions.filter(p => p.granted).length;
  }

  getTotalRoles(): number {
    return this.userRoles.length;
  }

  getPermissionPercentage(): number {
    if (this.getTotalPermissions() === 0) return 0;
    return Math.round((this.getGrantedPermissions() / this.getTotalPermissions()) * 100);
  }

  // Métodos para refrescar datos
  refreshPermissions(): void {
    this.permissionService.refreshCurrentUserPermissions();
    this.runPermissionTests();
  }

  // Métodos para obtener información detallada
  getPermissionDetails(permissionName: string): Permission | undefined {
    return this.userPermissions.find(p => p.name === permissionName);
  }

  getRoleDetails(roleName: string): Role | undefined {
    return this.userRoles.find(r => r.name === roleName);
  }

  getModuleClass(module: string): string {
    const moduleClasses: { [key: string]: string } = {
      'Core': 'primary',
      'Planillas': 'info',
      'Reportes': 'warning',
      'Documentos': 'success',
      'Soporte': 'danger',
      'Administración': 'secondary'
    };
    return moduleClasses[module] || 'secondary';
  }

  // Métodos para verificar acceso a menús específicos
  canAccessMenu(menuId: number): boolean {
    return this.permissionService.canAccessMenu(menuId);
  }

  canManageMenu(menuId: number): boolean {
    return this.permissionService.canManageMenu(menuId);
  }
}
