/**
 * Bypass amplio para **rutas** de administración (guards, `PermissionService`):
 * roles administrativos o trío de permisos pilar.
 *
 * El **sidebar** fijo ADMINISTRACIÓN no usa esta lista: solo la matriz Spatie por ítem,
 * salvo **Super Admin** (`AuthService.hasAdminSidebarSuperAdminBypass()`).
 */
export const ADMIN_LATERAL_FULL_ACCESS_ROLES = [
  'Super Admin',
  'Admin',
  'Administrador del Sistema',
  'admin',
  'super_admin',
] as const;

/** Tres permisos que suelen ir juntos en roles administradores completos. */
export const ADMIN_LATERAL_FULL_ACCESS_PERMISSION_TRIPLE = [
  'admin.menus',
  'admin.roles',
  'admin.usuarios',
] as const;
