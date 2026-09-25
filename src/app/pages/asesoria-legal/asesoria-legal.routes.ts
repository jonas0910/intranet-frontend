import { Routes } from '@angular/router';

export const asesoriaLegalRoutes: Routes = [
  {
    path: 'buzon',
    loadComponent: () => import('./buzon/buzon.component').then(m => m.BuzonComponent),
    data: { title: 'Buzón de Entrada - Asesoría Jurídica' }
  },
  {
    path: 'casos',
    loadComponent: () => import('./casos/casos.component').then(m => m.CasosComponent),
    data: { title: 'Mis Casos - Asesoría Jurídica' }
  },
  {
    path: 'casos/:id',
    loadComponent: () => import('./caso-detalle/caso-detalle.component').then(m => m.CasoDetalleComponent),
    data: { title: 'Detalle Caso Legal' }
  },
  {
    path: 'jurisprudencia',
    loadComponent: () => import('./jurisprudencia/jurisprudencia.component').then(m => m.JurisprudenciaComponent),
    data: { title: 'Base de Conocimiento' }
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent),
    data: { title: 'Reportes - Asesoría Jurídica' }
  },
  {
    path: 'abogados',
    loadComponent: () => import('./abogados/abogados.component').then(m => m.AbogadosComponent),
    data: { title: 'Abogados - Asesoría Jurídica' }
  },
  {
    path: '',
    redirectTo: 'buzon',
    pathMatch: 'full'
  }
];
