import { Routes } from '@angular/router';

export const seguridadCiudadanaRoutes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard.component').then(m => m.SeguridadDashboardComponent),
    data: { title: 'Dashboard - Seguridad Ciudadana' }
  },
  {
    path: 'ocurrencias',
    loadComponent: () => import('./ocurrencias/ocurrencias.component').then(m => m.OcurrenciasComponent),
    data: { title: 'Ocurrencias' }
  },
  {
    path: 'requisitorias',
    loadComponent: () => import('./requisitorias/requisitorias.component').then(m => m.RequisitoriasComponent),
    data: { title: 'Requisitorias' }
  },
  {
    path: 'requisitorias-vehiculos',
    loadComponent: () => import('./requisitorias-vehiculos/requisitorias-vehiculos.component').then(m => m.RequisitoriasVehiculosComponent),
    data: { title: 'Vehículos Requisitoriados' }
  },
  {
    path: 'requisitorias-personas',
    loadComponent: () => import('./requisitorias-personas/requisitorias-personas.component').then(m => m.RequisitoriasPersonasComponent),
    data: { title: 'Personas Requisitoriadas' }
  },
  {
    path: 'mapa',
    loadComponent: () => import('./mapa/mapa.component').then(m => m.SeguridadMapaComponent),
    data: { title: 'Mapa Interactivo' }
  },
  {
    path: 'mapa-personal',
    loadComponent: () => import('./mapa-personal/mapa-personal.component').then(m => m.SeguridadMapaPersonalComponent),
    data: { title: 'Ubicación del Personal' }
  },
  {
    path: 'personal',
    loadComponent: () => import('./personal/personal.component').then(m => m.PersonalComponent),
    data: { title: 'Personal de Seguridad' }
  },
  {
    path: 'vehiculos',
    loadComponent: () => import('./vehiculos/vehiculos.component').then(m => m.VehiculosComponent),
    data: { title: 'Vehículos de Seguridad' }
  },
  {
    path: 'rutas',
    loadComponent: () => import('./rutas-patrullaje/rutas-patrullaje.component').then(m => m.PatrullajeRutasComponent),
    data: { title: 'Rutas de Patrullaje' }
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes-diarios/reportes-diarios.component').then(m => m.ReportesDiariosComponent),
    data: { title: 'Reportes Diarios' }
  },
  {
    path: 'mantenimientos',
    loadComponent: () => import('./mantenimientos/lista-mantenimientos.component').then(m => m.ScListaMantenimientosComponent),
    data: { title: 'Mantenimiento de Vehículos' }
  },
  {
    path: 'control-mantenimiento',
    loadComponent: () => import('./control-mantenimiento/control-mantenimiento.component').then(m => m.ScControlMantenimientoComponent),
    data: { title: 'Control de Mantenimientos' }
  },
  // Rutas de Servicios (Modo Servicio)
  {
    path: 'servicios/monitoreo',
    loadComponent: () => import('./mapa-personal/mapa-personal.component').then(m => m.SeguridadMapaPersonalComponent),
    data: { title: 'Monitoreo de Mi Personal' }
  },
  {
    path: 'servicios/ocurrencias',
    loadComponent: () => import('./ocurrencias/ocurrencias.component').then(m => m.OcurrenciasComponent),
    data: { title: 'Ocurrencias del Área' }
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];
