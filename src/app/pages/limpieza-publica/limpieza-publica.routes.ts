import { Routes } from '@angular/router';

export const limpiezaPublicaRoutes: Routes = [
    {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.LpDashboardComponent),
        data: { title: 'Dashboard - Limpieza Pública' }
    },
    {
        path: 'monitoreo',
        loadComponent: () => import('./monitoreo/monitoreo.component').then(m => m.LpMonitoreoComponent),
        data: { title: 'Monitoreo GPS - Limpieza Pública' }
    },
    {
        path: 'personal',
        loadComponent: () => import('./personal/personal.component').then(m => m.LpPersonalComponent),
        data: { title: 'Gestión de Personal' }
    },
    {
        path: 'rutas',
        loadComponent: () => import('./rutas/rutas.component').then(m => m.LpRutasComponent),
        data: { title: 'Gestión de Rutas' }
    },
    {
        path: 'vehiculos',
        loadComponent: () => import('./vehiculos/vehiculos.component').then(m => m.LpVehiculosComponent),
        data: { title: 'Flota Vehicular' }
    },
    {
        path: 'recoleccion',
        loadComponent: () => import('./recoleccion/recoleccion.component').then(m => m.LpRecoleccionComponent),
        data: { title: 'Registro de Recolección' }
    },
    {
        path: 'alertas',
        loadComponent: () => import('./alertas/alertas.component').then(m => m.LpAlertasComponent),
        data: { title: 'Gestión de Residuos' }
    },
    {
        path: 'registro-trabajo',
        loadComponent: () => import('./registro-trabajo/registro-trabajo.component').then(m => m.LpRegistroTrabajoComponent),
        title: 'Registro de Trabajo'
    },
    {
        path: 'elementos',
        loadComponent: () => import('./elementos/elementos.component').then(m => m.LpElementosComponent),
        data: { title: 'Elementos Urbanos' }
    },
    {
        path: 'reportes',
        loadComponent: () => import('./reportes/reportes.component').then(m => m.LpReportesComponent),
        data: { title: 'Reportes e Indicadores' }
    },
    {
        path: 'campanas',
        loadComponent: () => import('./campanas/campanas.component').then(m => m.LpCampanasComponent),
        data: { title: 'Campañas de Limpieza Pública' }
    },
    {
        path: 'mantenimientos',
        loadComponent: () => import('./mantenimientos/lista-mantenimientos.component').then(m => m.LpListaMantenimientosComponent),
        data: { title: 'Mantenimiento de Vehículos' }
    },
    {
        path: 'control-mantenimiento',
        loadComponent: () => import('./control-mantenimiento/control-mantenimiento.component').then(m => m.LpControlMantenimientoComponent),
        data: { title: 'Control de Mantenimientos' }
    },
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    }
];
