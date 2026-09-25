/**
 * Permisos Spatie por entrada del menú lateral «ADMINISTRACIÓN» (sidebar).
 * `ADMIN_SIDEBAR_MENU_MATRIX` define Ver / CRUD / Gestionar por ítem; `ADMIN_SIDEBAR_LINK_PERMS`
 * es la unión (cualquiera muestra el enlace en el lateral).
 *
 * Visibilidad del bloque: permisos por ítem; solo **Super Admin** ignora la matriz (`hasAdminSidebarSuperAdminBypass`).
 *
 * Mantener alineado con `sidebar.component.html` y `app.routes.ts`.
 */

export type AdminSidebarLinkKey =
  | 'perfil'
  | 'panelAdmin'
  | 'usuarios'
  | 'roles'
  | 'auditoria'
  | 'patrones'
  | 'organizacion'
  | 'tramiteAreas'
  | 'tramiteTipos'
  | 'tramiteUsuarios';

/** Operaciones por menú fijo (columnas en Gestión de roles). */
export type SidebarMenuOpKey = 'view' | 'create' | 'edit' | 'delete' | 'manage';

export const SIDEBAR_MENU_OP_COLUMNS: ReadonlyArray<{
  key: SidebarMenuOpKey;
  label: string;
  hint: string;
}> = [
  { key: 'view', label: 'Ver', hint: 'Ver el enlace y pantallas de consulta' },
  { key: 'create', label: 'Crear', hint: 'Alta' },
  { key: 'edit', label: 'Editar', hint: 'Modificación' },
  { key: 'delete', label: 'Eliminar', hint: 'Baja' },
  { key: 'manage', label: 'Gestionar', hint: 'Administración total (admin.* y permisos de módulo)' },
];

function flattenMatrixEntry(entry: Partial<Record<SidebarMenuOpKey, readonly string[]>>): string[] {
  const out: string[] = [];
  for (const v of Object.values(entry)) {
    if (v?.length) {
      out.push(...v);
    }
  }
  return [...new Set(out)];
}

/**
 * Por cada ítem del menú fijo: qué permisos Spatie asignar por columna.
 * Varias cadenas en una celda = se asignan/desasignan juntas al marcar la casilla.
 */
export const ADMIN_SIDEBAR_MENU_MATRIX: Record<
  AdminSidebarLinkKey,
  Partial<Record<SidebarMenuOpKey, readonly string[]>>
> = {
  perfil: {
    view: ['perfil.ver'],
    create: ['perfil.editar'],
    edit: ['perfil.editar'],
    delete: ['perfil.editar'],
    manage: ['perfil.editar'],
  },
  panelAdmin: {
    view: ['dashboard.ver', 'menus.ver'],
    create: ['menus.crear'],
    edit: ['menus.editar', 'menus.gestionar'],
    delete: ['menus.eliminar'],
    manage: ['admin.menus'],
  },
  usuarios: {
    view: ['usuarios.ver'],
    create: ['usuarios.crear'],
    edit: ['usuarios.editar', 'usuarios.actividad', 'usuarios.accesos'],
    delete: ['usuarios.eliminar'],
    manage: ['admin.usuarios'],
  },
  roles: {
    view: ['roles.ver'],
    create: ['roles.crear'],
    edit: ['roles.editar'],
    delete: ['roles.eliminar'],
    manage: ['admin.roles', 'roles.asignar', 'admin.permisos', 'permisos.gestionar'],
  },
  auditoria: {
    view: ['admin.auditoria'],
    create: ['admin.auditoria'],
    edit: ['admin.auditoria'],
    delete: ['admin.auditoria'],
    manage: ['admin.auditoria'],
  },
  patrones: {
    view: ['patrones.ver'],
    create: ['patrones.crear'],
    edit: ['patrones.editar'],
    delete: ['patrones.eliminar'],
    manage: ['patrones.editar'],
  },
  organizacion: {
    view: ['organizacion.ver'],
    create: ['organizacion.editar'],
    edit: ['organizacion.editar'],
    delete: ['organizacion.editar'],
    manage: ['organizacion.editar'],
  },
  tramiteAreas: {
    view: ['tramite.admin.areas'],
    create: ['tramite.admin.areas'],
    edit: ['tramite.admin.areas'],
    delete: ['tramite.admin.areas'],
    manage: ['tramite.admin.areas'],
  },
  tramiteTipos: {
    view: ['tramite.admin.tipos'],
    create: ['tramite.admin.tipos'],
    edit: ['tramite.admin.tipos'],
    delete: ['tramite.admin.tipos'],
    manage: ['tramite.admin.tipos'],
  },
  tramiteUsuarios: {
    view: ['tramite.admin.usuarios'],
    create: ['tramite.admin.usuarios'],
    edit: ['tramite.admin.usuarios'],
    delete: ['tramite.admin.usuarios'],
    manage: ['tramite.admin.usuarios'],
  },
};

/** Unión por ítem (sidebar: visible si el usuario tiene al menos uno). */
export const ADMIN_SIDEBAR_LINK_PERMS = {
  perfil: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.perfil),
  panelAdmin: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.panelAdmin),
  usuarios: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.usuarios),
  roles: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.roles),
  auditoria: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.auditoria),
  patrones: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.patrones),
  organizacion: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.organizacion),
  tramiteAreas: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.tramiteAreas),
  tramiteTipos: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.tramiteTipos),
  tramiteUsuarios: flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX.tramiteUsuarios),
} as const;

/** Todos los nombres Spatie usados en la matriz (filtro catálogo / modal). */
export function getAllSidebarMatrixPermissionNames(): string[] {
  const s = new Set<string>();
  for (const key of Object.keys(ADMIN_SIDEBAR_MENU_MATRIX) as AdminSidebarLinkKey[]) {
    for (const n of flattenMatrixEntry(ADMIN_SIDEBAR_MENU_MATRIX[key])) {
      s.add(n);
    }
  }
  return [...s].sort((a, b) => a.localeCompare(b, 'es'));
}

/**
 * Misma jerarquía que `sidebar.component.html` (ADMINISTRACIÓN → ramas e ítems).
 */
export const ADMIN_SIDEBAR_FIXED_MENU_SECTIONS: ReadonlyArray<{
  branch: string;
  branchIcon: string;
  items: ReadonlyArray<{ key: AdminSidebarLinkKey; label: string }>;
}> = [
  {
    branch: 'Configuración',
    branchIcon: 'fas fa-cogs',
    items: [
      { key: 'perfil', label: 'Mi Perfil' },
      { key: 'panelAdmin', label: 'Panel Principal' },
      { key: 'usuarios', label: 'Usuarios' },
      { key: 'roles', label: 'Gestión de Roles' },
      { key: 'auditoria', label: 'Sistema de Auditoría' },
      { key: 'patrones', label: 'Patrones de Diseño' },
    ],
  },
  {
    branch: 'Maestro',
    branchIcon: 'fas fa-database',
    items: [
      { key: 'organizacion', label: 'Gestión de Organización' },
      { key: 'tramiteAreas', label: 'Áreas / Oficinas' },
      { key: 'tramiteTipos', label: 'Tipos de Trámite' },
      { key: 'tramiteUsuarios', label: 'Usuarios (trámite documentario)' },
    ],
  },
];
