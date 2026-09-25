import { Routes } from '@angular/router';

export const CENSO_POBLACIONAL_ROUTES: Routes = [
    { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    { path: 'dashboard', loadComponent: () => import('./dashboard/censo-dashboard.component').then(m => m.CensoDashboardComponent) },
    { path: 'padron', loadComponent: () => import('./padron/censo-padron.component').then(m => m.CensoPadronComponent) },
    { path: 'eventos', loadComponent: () => import('./eventos/censo-eventos.component').then(m => m.CensoEventosComponent) },
    { path: 'entregas', loadComponent: () => import('./entregas/censo-entregas.component').then(m => m.CensoEntregasComponent) },
    { path: 'sectores', loadComponent: () => import('./sectores/censo-sectores.component').then(m => m.CensoSectoresComponent) },
    { path: 'reportes', loadComponent: () => import('./reportes/censo-reportes.component').then(m => m.CensusReportesComponent) },
];
