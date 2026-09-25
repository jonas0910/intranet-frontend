import { Routes } from '@angular/router';

export const tramiteDocumentarioRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.TramiteDashboardComponent),
    data: { title: 'Dashboard - Trámite Documentario' }
  },
  {
    path: 'crear',
    loadComponent: () => import('./registro/registro-documento.component').then(m => m.RegistroDocumentoComponent),
    data: { title: 'Crear Documento' }
  },
  {
    path: 'documentos-creados',
    loadComponent: () => import('./documentos-creados/documentos-creados.component').then(m => m.DocumentosCreadosComponent),
    data: { title: 'Bandeja Generados' }
  },
  {
    path: 'documentos-recibidos',
    loadComponent: () => import('./documentos-recibidos/documentos-recibidos.component').then(m => m.DocumentosRecibidosComponent),
    data: { title: 'Bandeja de Entrada' }
  },
  {
    path: 'bandeja-enviados',
    loadComponent: () => import('./bandeja-enviados/bandeja-enviados.component').then(m => m.BandejaEnviadosComponent),
    data: { title: 'Bandeja de Enviados' }
  },
  {
    path: 'bandeja-archivados',
    loadComponent: () => import('./bandeja-archivados/bandeja-archivados.component').then(m => m.BandejaArchivadosComponent),
    data: { title: 'Bandeja de Archivados' }
  },
  {
    path: 'detalle/:id',
    loadComponent: () => import('./detalle/detalle.component').then(m => m.DetalleComponent),
    data: { title: 'Detalle Expediente' }
  },
  {
    path: 'editar/:id',
    loadComponent: () => import('./registro/registro-documento.component').then(m => m.RegistroDocumentoComponent),
    data: { title: 'Editar Documento' }
  },
  {
    path: 'buscar',
    loadComponent: () => import('./documentos/lista-documentos.component').then(m => m.ListaDocumentosComponent),
    data: { title: 'Buscar Expedientes' }
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent),
    data: { title: 'Reportes' }
  },
  {
    path: 'consulta-publica',
    loadComponent: () => import('./consulta-publica/consulta-publica.component').then(m => m.ConsultaPublicaComponent),
    data: { title: 'Consulta Pública' }
  },
  {
    path: 'admin/tipos',
    loadComponent: () => import('./admin/tipos-tramite/tipos-tramite.component').then(m => m.TiposTramiteComponent),
    data: { title: 'Tipos de Trámite' }
  },
  /** Compatibilidad: URLs antiguas → rutas en raíz `/areas` (app.routes.ts). */
  {
    path: 'admin/areas',
    redirectTo: '/areas',
    pathMatch: 'full',
  },
  {
    path: 'admin/areas/:id/usuarios',
    redirectTo: '/areas/:id/usuarios',
    pathMatch: 'full',
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
