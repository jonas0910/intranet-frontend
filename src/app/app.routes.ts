import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { RoleManagementGuard } from './guards/permission.guard';

export const routes: Routes = [
  // ===== PÚBLICO =====
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    data: { title: 'Inicio', description: 'Página de bienvenida del sistema' }
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/auth/login/login.component').then(m => m.LoginComponent),
  },

  // ===== CORE =====
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'perfil',
    loadComponent: () => import('./pages/perfil/perfil.component').then(m => m.PerfilComponent),
    canActivate: [authGuard]
  },

  // ===== USUARIOS Y ROLES =====
  {
    path: 'usuarios',
    loadComponent: () => import('./pages/usuarios/usuarios.component').then(m => m.UsuariosComponent),
    canActivate: [authGuard],
    data: { permissions: ['admin.usuarios', 'usuarios.ver'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'user-management',
    loadComponent: () => import('./pages/user-management/user-management.component').then(m => m.UserManagementComponent),
    canActivate: [authGuard],
    data: { permissions: ['admin.usuarios', 'usuarios.ver'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'usuarios/crear',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    data: { permissions: ['usuarios.crear'], roles: ['Super Admin', 'Admin'] }
  },
  {
    path: 'roles',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard, RoleManagementGuard],
    data: { permissions: ['admin.roles', 'roles.ver'], roles: ['Super Admin', 'Admin'] }
  },

  // ===== EMPLEADOS (acceso directo) =====
  {
    path: 'empleados',
    loadComponent: () => import('./pages/planillas/empleados/employee-list/employee-list.component').then(m => m.EmployeeListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'empleados/crear',
    loadComponent: () => import('./pages/planillas/empleados/employee-form/employee-form.component').then(m => m.EmployeeFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'empleados/editar/:id',
    loadComponent: () => import('./pages/planillas/empleados/employee-form/employee-form.component').then(m => m.EmployeeFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'empleados/detalle/:id',
    loadComponent: () => import('./pages/planillas/empleados/employee-detail/employee-detail.component').then(m => m.EmployeeDetailComponent),
    canActivate: [authGuard]
  },
  {
    path: 'empleados/organigrama',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'empleados/cumpleanos',
    loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },

  // Tablas auxiliares (acceso directo — alias)
  {
    path: 'departamentos',
    loadComponent: () => import('./pages/planillas/departamentos/departamentos.component').then(m => m.DepartamentosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'fuentes-financiamiento',
    loadComponent: () => import('./pages/planillas/fuentes-financiamiento/fuentes-financiamiento.component').then(m => m.FuentesFinanciamientoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'fuente-financiamiento',
    loadComponent: () => import('./pages/planillas/fuentes-financiamiento/fuentes-financiamiento.component').then(m => m.FuentesFinanciamientoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'cargos',
    loadComponent: () => import('./pages/planillas/cargos/cargos.component').then(m => m.CargosComponent),
    canActivate: [authGuard]
  },

  // ===== SISTEMAS EXTERNOS =====
  {
    path: 'sistemas',
    loadComponent: () => import('./pages/sistemas/sistemas.component').then(m => m.SistemasComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sistemas/agregar',
    loadComponent: () => import('./pages/sistemas/sistema-integrado-form/sistema-integrado-form.component').then(m => m.SistemaIntegradoFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sistemas/editar/:id',
    loadComponent: () => import('./pages/sistemas/sistema-integrado-form/sistema-integrado-form.component').then(m => m.SistemaIntegradoFormComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sistemas/accesos',
    loadComponent: () => import('./pages/sistemas/accesos-nuevo/accesos-nuevo.component').then(m => m.AccesosNuevoComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sistemas/menus',
    loadComponent: () => import('./pages/gestion-menus/gestion-menus.component').then(m => m.GestionMenusComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sistemas/permisos',
    loadComponent: () => import('./pages/accesos/accesos.component').then(m => m.AccesosComponent),
    canActivate: [authGuard]
  },

  // ===== ACCESOS Y MENÚS =====
  {
    path: 'accesos',
    loadComponent: () => import('./pages/accesos/accesos.component').then(m => m.AccesosComponent),
    canActivate: [authGuard]
  },
  {
    path: 'gestion-menus',
    loadComponent: () => import('./pages/gestion-menus/gestion-menus.component').then(m => m.GestionMenusComponent),
    canActivate: [authGuard]
  },
  {
    path: 'organizacion',
    loadComponent: () => import('./pages/organizacion/organizacion.component').then(m => m.OrganizacionComponent),
    canActivate: [authGuard],
    data: { title: 'Gestión de Organización' }
  },

  // ===== ADMIN MENU MANAGEMENT (lazy child routes) =====
  {
    path: 'admin-menu-management',
    loadChildren: () => import('./pages/admin-menu-management/admin-menu.routes').then(m => m.ADMIN_MENU_ROUTES),
  },

  // ===== TEST =====
  {
    path: 'test-permissions',
    loadComponent: () => import('./pages/test-permissions/test-permissions.component').then(m => m.TestPermissionsComponent),
    canActivate: [authGuard],
    data: { permissions: ['dashboard.ver'], roles: ['Super Admin', 'Admin', 'Manager', 'Employee'] }
  },

  // ===== PATRONES DE DISEÑO =====
  {
    path: 'patrones',
    loadComponent: () => import('./pages/patrones/patrones.component').then(m => m.PatronesComponent),
    canActivate: [authGuard]
  },
  {
    path: 'patrones/crear',
    loadComponent: () => import('./pages/patrones/patron-editor/patron-editor.component').then(m => m.PatronEditorComponent),
    canActivate: [authGuard]
  },
  {
    path: 'patrones/editar/:id',
    loadComponent: () => import('./pages/patrones/patron-editor/patron-editor.component').then(m => m.PatronEditorComponent),
    canActivate: [authGuard]
  },

  // ===== DOCUMENTOS (placeholder) =====
  { path: 'documentos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'documentos/compartidos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'documentos/publicos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'documentos/subir', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'documentos/papelera', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== TICKETS → HELPDESK =====
  { path: 'tickets', redirectTo: 'helpdesk/tickets', pathMatch: 'full' },
  { path: 'tickets/crear', redirectTo: 'helpdesk/tickets/nuevo', pathMatch: 'full' },
  { path: 'tickets/asignados', redirectTo: 'helpdesk/tickets', pathMatch: 'full' },
  { path: 'tickets/estadisticas', redirectTo: 'helpdesk', pathMatch: 'full' },

  // ===== CHAT (placeholder) =====
  { path: 'chat', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== MENSAJERÍA =====
  {
    path: 'mensajeria',
    loadChildren: () => import('./pages/mensajeria/mensajeria.module').then(m => m.MensajeriaModule),
    canActivate: [authGuard],
    data: { permissions: ['messaging.read'], roles: ['Super Admin', 'Admin', 'Manager', 'Employee'] }
  },

  // ===== COMUNICADOS =====
  {
    path: 'comunicados',
    loadChildren: () => import('./pages/comunicados-institucional/comunicados-institucional.routes').then(m => m.COMUNICADOS_INSTITUCIONAL_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Comunicados' }
  },

  // ===== CALENDARIO (placeholder) =====
  { path: 'calendario', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'calendario/evento', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== ACTIVOS (placeholder) =====
  { path: 'activos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'activos/asignados', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'activos/registrar', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'activos/mantenimiento', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== PLANILLAS (lazy child routes) =====
  {
    path: 'planillas',
    loadChildren: () => import('./pages/planillas/planillas.routes').then(m => m.PLANILLAS_ROUTES),
    canActivate: [authGuard],
  },

  // ===== REPORTES (placeholder) =====
  { path: 'reportes/dashboard', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'reportes/empleados', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'reportes/actividad', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'reportes/documentos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== CONFIGURACIÓN =====
  { path: 'configuracion', redirectTo: 'configuracion/general', pathMatch: 'full' },
  { path: 'configuracion/general', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'configuracion/sistemas', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'configuracion/auditoria', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'configuracion/backup', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== OTROS =====
  { path: 'favoritos', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'ayuda', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'contacto', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'notificaciones', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },
  { path: 'mensajes', redirectTo: '/mensajeria', pathMatch: 'full' },
  { path: 'tareas', loadComponent: () => import('./pages/dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // ===== GESTIÓN DOCUMENTAL =====
  {
    path: 'gestion-documental',
    loadChildren: () => import('./pages/gestion-documental/gestion-documental.routes').then(m => m.GESTION_DOCUMENTAL_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Gestión Documental' }
  },

  // ===== ACTIVOS FIJOS =====
  {
    path: 'activos-fijos',
    loadChildren: () => import('./pages/activos-fijos/activos-fijos.routes').then(m => m.ACTIVOS_FIJOS_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Sistema de Activos Fijos', permissions: ['activos.view'] }
  },

  // ===== EQUIPO MECÁNICO (SIGEM) =====
  {
    path: 'equipo-mecanico',
    loadChildren: () => import('./pages/equipo-mecanico/equipo-mecanico.routes').then(m => m.EQUIPO_MECANICO_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Sistema de Equipo Mecánico', permissions: ['sigem.equipos.view'] }
  },

  // ===== SEGURIDAD CIUDADANA =====
  {
    path: 'seguridad-ciudadana',
    loadChildren: () => import('./pages/seguridad-ciudadana/seguridad-ciudadana.routes').then(m => m.seguridadCiudadanaRoutes),
    canActivate: [authGuard],
    data: { title: 'Seguridad Ciudadana', permissions: ['seguridad.dashboard.ver'] }
  },

  // ===== TRÁMITE DOCUMENTARIO =====
  {
    path: 'areas',
    loadComponent: () => import('./pages/tramite-documentario/admin/areas').then(m => m.AreasComponent),
    canActivate: [authGuard],
    data: { title: 'Áreas / Oficinas', permissions: ['tramite.admin.areas'] },
  },
  {
    path: 'areas/:id/usuarios',
    loadComponent: () => import('./pages/tramite-documentario/admin/areas').then(m => m.AreasUsuariosComponent),
    canActivate: [authGuard],
    data: { title: 'Usuarios del Área' },
  },
  {
    path: 'tramite-documentario',
    loadChildren: () => import('./pages/tramite-documentario/tramite-documentario.routes').then(m => m.tramiteDocumentarioRoutes),
    canActivate: [authGuard],
    data: { title: 'Trámite Documentario', permissions: ['tramite.dashboard.ver'] }
  },

  // ===== ASESORÍA JURÍDICA =====
  {
    path: 'asesoria-legal',
    loadChildren: () => import('./pages/asesoria-legal/asesoria-legal.routes').then(m => m.asesoriaLegalRoutes),
    canActivate: [authGuard],
    data: { title: 'Asesoría Jurídica' }
  },

  // ===== CENSO POBLACIONAL =====
  {
    path: 'censo-poblacional',
    loadChildren: () => import('./pages/censo-poblacional/censo-poblacional.routes').then(m => m.CENSO_POBLACIONAL_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Censo Poblacional', permissions: ['censo.ver'] }
  },

  // ===== COMERCIALIZACIÓN =====
  {
    path: 'comercializacion',
    loadChildren: () => import('./pages/comercializacion/comercializacion.module').then(m => m.ComercializacionModule),
    canActivate: [authGuard],
    data: { title: 'Comercialización', permissions: ['comercializacion.view'] }
  },

  // ===== HELPDESK =====
  {
    path: 'helpdesk',
    loadChildren: () => import('./pages/helpdesk/helpdesk.routes').then(m => m.HELPDESK_ROUTES),
    canActivate: [authGuard],
    data: { title: 'Helpdesk' }
  },

  // ===== GESTOR DE CONTENIDOS (CMS) =====
  {
    path: 'gestor-contenidos',
    loadChildren: () => import('./pages/gestor-contenidos/gestor-contenidos.routes').then(m => m.gestorContenidosRoutes),
    canActivate: [authGuard],
    data: { title: 'Gestor de Contenidos', permissions: ['gc.dashboard.ver'] }
  },

  // ===== CATCH-ALL =====
  { path: '**', redirectTo: '/login' }
];