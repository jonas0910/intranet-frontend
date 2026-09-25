import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';
import { PermissionGuard } from '../../guards/permission.guard';

export const GESTION_DOCUMENTAL_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'lista',
    pathMatch: 'full'
  },
  {
    path: 'lista',
    loadComponent: () => import('./lista/lista-documentos.component').then(m => m.ListaDocumentosComponent),
    canActivate: [authGuard, PermissionGuard],
    data: { title: 'Bandeja de Documentos', breadcrumb: 'Documentos' }
  },
  {
    path: 'cargar',
    loadComponent: () => import('./cargar/cargar-documento.component').then(m => m.CargarDocumentoComponent),
    canActivate: [authGuard, PermissionGuard],
    data: { title: 'Cargar Documento', breadcrumb: 'Cargar' }
  },
  {
    path: 'cierres',
    loadComponent: () => import('./cierres/cierres.component').then(m => m.CierresComponent),
    canActivate: [authGuard, PermissionGuard],
    data: { title: 'Archivo Central - Cierres', breadcrumb: 'Cierres' }
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent),
    canActivate: [authGuard, PermissionGuard],
    data: { title: 'Reportes y Auditoría', breadcrumb: 'Reportes' }
  },
  {
    path: 'documento/:id',
    loadComponent: () => import('./detalle/detalle-documento.component').then(m => m.DetalleDocumentoComponent),
    canActivate: [authGuard, PermissionGuard],
    data: { title: 'Detalle de Documento', breadcrumb: 'Detalle' }
  },
];
