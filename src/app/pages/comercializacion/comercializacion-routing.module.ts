import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { DashboardComponent } from './dashboard/dashboard.component';
import { PreRecibosComponent } from './caja/pre-recibos/pre-recibos.component';
import { CajaVentanillaComponent } from './caja/caja-ventanilla/caja-ventanilla.component';
import { ConfiguracionComponent } from './caja/configuracion/configuracion.component';
import { ReportesComponent } from './caja/reportes/reportes.component';
import { TramitesComponent } from './licencias/tramites/tramites.component';
import { ItseComponent } from './licencias/itse/itse.component';
import { ConstanciasComponent } from './licencias/constancias/constancias.component';
import { PadronComponent } from './fiscalizacion/padron/padron.component';
import { InspeccionesComponent } from './fiscalizacion/inspecciones/inspecciones.component';
import { SancionesComponent } from './fiscalizacion/sanciones/sanciones.component';
import { MapaCalorComponent } from './fiscalizacion/mapa-calor/mapa-calor.component';
import { LayoutComponent } from './layout/layout.component';

const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        component: DashboardComponent,
        data: { title: 'Dashboard Comercialización' }
      },
      {
        path: 'caja/pre-recibos',
        component: PreRecibosComponent,
        data: { title: 'Emisión de Pre recibos' }
      },
      {
        path: 'caja/cobro',
        component: CajaVentanillaComponent,
        data: { title: 'Cobro en caja', tab: 'cobro' }
      },
      {
        path: 'caja/recibos',
        component: CajaVentanillaComponent,
        data: { title: 'Listado de Recibos', tab: 'recibos' }
      },
      {
        path: 'caja/cierre',
        component: CajaVentanillaComponent,
        data: { title: 'Cierre de Caja', tab: 'cierre' }
      },
      {
        path: 'caja/configuracion',
        component: ConfiguracionComponent,
        data: { title: 'Configuración de Ingresos' }
      },
      {
        path: 'caja/reportes',
        component: ReportesComponent,
        data: { title: 'Reportes de Caja' }
      },
      {
        path: 'licencias/tramites',
        component: TramitesComponent,
        data: { title: 'Gestión de Trámites' }
      },
      {
        path: 'licencias/itse',
        component: ItseComponent,
        data: { title: 'Integración ITSE y Zonificación' }
      },
      {
        path: 'licencias/constancias',
        component: ConstanciasComponent,
        data: { title: 'Constancias y Liquidación' }
      },
      {
        path: 'fiscalizacion/padron',
        component: PadronComponent,
        data: { title: 'Padrón de Comerciantes' }
      },
      {
        path: 'fiscalizacion/inspecciones',
        component: InspeccionesComponent,
        data: { title: 'Inspecciones Sanitarias' }
      },
      {
        path: 'fiscalizacion/sanciones',
        component: SancionesComponent,
        data: { title: 'Sanciones (CUIS/RAS)' }
      },
      {
        path: 'fiscalizacion/mapa-calor',
        component: MapaCalorComponent,
        data: { title: 'Mapa de Calor de Infracciones' }
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ComercializacionRoutingModule { }
