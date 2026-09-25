import { Routes } from '@angular/router';
import { AlmDashboardComponent } from './dashboard/alm-dashboard.component';
import { AlmBienesComponent } from './bienes/alm-bienes.component';
import { AlmKardexComponent } from './kardex/alm-kardex.component';
import { AlmActasComponent } from './actas/alm-actas.component';
import { AlmReportesComponent } from './reportes/alm-reportes.component';
import { AlmacenLayoutComponent } from './almacen-layout.component';

export const ALMACEN_ROUTES: Routes = [
    {
        path: '',
        component: AlmacenLayoutComponent,
        children: [
            { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
            { path: 'dashboard', component: AlmDashboardComponent },
            { path: 'bienes', component: AlmBienesComponent },
            { path: 'kardex', component: AlmKardexComponent },
            { path: 'actas', component: AlmActasComponent },
            { path: 'reportes', component: AlmReportesComponent }
        ]
    }
];
