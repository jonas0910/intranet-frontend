import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const COMUNICADOS_INSTITUCIONAL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./comunicados-portal/comunicados-portal.component').then(
        (m) => m.ComunicadosPortalComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Comunicados', breadcrumb: 'Portal' },
  },
  {
    path: 'documentos',
    loadComponent: () =>
      import('./comunicados-documentos/comunicados-documentos.component').then(
        (m) => m.ComunicadosDocumentosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Documentos', breadcrumb: 'Documentos' },
  },
  {
    path: 'admin/modales',
    loadComponent: () =>
      import('./admin-modales/admin-modales.component').then(
        (m) => m.AdminModalesComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Mensajes modales', breadcrumb: 'Modales' },
  },
  {
    path: 'admin/documentos',
    loadComponent: () =>
      import('./admin-documentos/admin-documentos.component').then(
        (m) => m.AdminDocumentosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Documentos PDF', breadcrumb: 'Documentos' },
  },
  {
    path: 'admin/comunicados',
    loadComponent: () =>
      import('../../pages/comunicados/comunicados.component').then(
        (m) => m.ComunicadosComponent
      ),
    canActivate: [authGuard],
    data: { title: 'Comunicados', breadcrumb: 'Comunicados' },
  },
];
