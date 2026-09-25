import { Routes } from '@angular/router';

export const EQUIPO_MECANICO_ROUTES: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'equipos',
    loadComponent: () => import('./equipos/lista-equipos.component').then(m => m.ListaEquiposComponent)
  },
  {
    path: 'operadores',
    loadComponent: () => import('./operadores/lista-operadores.component').then(m => m.ListaOperadoresComponent)
  },
  {
    path: 'asignaciones',
    loadComponent: () => import('./asignaciones/lista-asignaciones.component').then(m => m.ListaAsignacionesComponent)
  },
  {
    path: 'partes',
    loadComponent: () => import('./partes/lista-partes.component').then(m => m.ListaPartesComponent)
  },
  {
    path: 'mantenimientos',
    loadComponent: () => import('./mantenimientos/lista-mantenimientos.component').then(m => m.ListaMantenimientosComponent)
  },
  {
    path: 'control-mantenimiento',
    loadComponent: () => import('./control-mantenimiento/control-mantenimiento.component').then(m => m.ControlMantenimientoComponent)
  },
  {
    path: 'gps',
    loadComponent: () => import('./gps/monitoreo-gps.component').then(m => m.MonitoreoGpsComponent)
  },
  {
    path: 'gps/alertas',
    loadComponent: () => import('./gps/alertas/lista-alertas.component').then(m => m.ListaAlertasGpsComponent)
  },
  {
    path: 'valorizaciones',
    loadComponent: () => import('./valorizaciones/lista-valorizaciones.component').then(m => m.ListaValorizacionesComponent)
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent)
  },
  // Rutas de Servicios (Modo Servicio con Centro de Costo Fijo)
  {
    path: 'servicios/partes',
    loadComponent: () => import('./partes/lista-partes.component').then(m => m.ListaPartesComponent)
  },
  {
    path: 'servicios/mantenimientos',
    loadComponent: () => import('./mantenimientos/lista-mantenimientos.component').then(m => m.ListaMantenimientosComponent)
  },
  {
    path: 'servicios/control-mantenimiento',
    loadComponent: () => import('./control-mantenimiento/control-mantenimiento.component').then(m => m.ControlMantenimientoComponent)
  }
];

