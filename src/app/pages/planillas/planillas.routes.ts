import { Routes } from '@angular/router';
import { authGuard } from '../../guards/auth.guard';

export const PLANILLAS_ROUTES: Routes = [
  // Dashboard Personal
  {
    path: 'dashboard-personal',
    loadComponent: () => import('./dashboard-personal/dashboard-personal.component').then(m => m.DashboardPersonalComponent),
    canActivate: [authGuard]
  },

  // GESTIÓN DE TABLAS
  { path: 'unidades-organicas', loadComponent: () => import('./unidades-organicas/unidades-organicas.component').then(m => m.UnidadesOrganicasComponent), canActivate: [authGuard] },
  { path: 'departamentos', loadComponent: () => import('./departamentos/departamentos.component').then(m => m.DepartamentosComponent), canActivate: [authGuard] },
  { path: 'fuentes-financiamiento', loadComponent: () => import('./fuentes-financiamiento/fuentes-financiamiento.component').then(m => m.FuentesFinanciamientoComponent), canActivate: [authGuard] },
  { path: 'fuente-financiamiento', loadComponent: () => import('./fuentes-financiamiento/fuentes-financiamiento.component').then(m => m.FuentesFinanciamientoComponent), canActivate: [authGuard] },
  { path: 'cargos', loadComponent: () => import('./cargos/cargos.component').then(m => m.CargosComponent), canActivate: [authGuard] },
  { path: 'centro-costos', loadComponent: () => import('./centro-costos/centro-costos.component').then(m => m.CentroCostosComponent), canActivate: [authGuard] },
  { path: 'partidas-gasto', loadComponent: () => import('./partidas-gasto/partidas-gasto.component').then(m => m.PartidasGastoComponent), canActivate: [authGuard] },
  { path: 'boleta-salida', loadComponent: () => import('./boleta-salida/boleta-salida.component').then(m => m.BoletaSalidaComponent), canActivate: [authGuard] },
  { path: 'afp', loadComponent: () => import('./afp/afp.component').then(m => m.AfpComponent), canActivate: [authGuard] },
  { path: 'aportes', loadComponent: () => import('./aportes/aportes.component').then(m => m.AportesComponent), canActivate: [authGuard] },
  { path: 'conceptos', loadComponent: () => import('./conceptos/conceptos.component').then(m => m.ConceptosComponent), canActivate: [authGuard] },
  { path: 'escala', loadComponent: () => import('./escala/escala.component').then(m => m.EscalaComponent), canActivate: [authGuard] },
  { path: 'tipo-planilla', loadComponent: () => import('./tipo-planilla/tipo-planilla.component').then(m => m.TipoPlanillaComponent), canActivate: [authGuard] },
  { path: 'descuentos', loadComponent: () => import('./descuentos/descuentos.component').then(m => m.DescuentosComponent), canActivate: [authGuard] },

  // Períodos
  { path: 'periodos', loadComponent: () => import('./periodos/periodos.component').then(m => m.PeriodosComponent), canActivate: [authGuard] },

  // Empleados
  { path: 'empleados', loadComponent: () => import('./empleados/employee-list/employee-list.component').then(m => m.EmployeeListComponent), canActivate: [authGuard] },
  { path: 'empleados/crear', loadComponent: () => import('./empleados/employee-form/employee-form.component').then(m => m.EmployeeFormComponent), canActivate: [authGuard] },
  { path: 'empleados/editar/:id', loadComponent: () => import('./empleados/employee-form/employee-form.component').then(m => m.EmployeeFormComponent), canActivate: [authGuard] },
  { path: 'empleados/detalle/:id', loadComponent: () => import('./empleados/employee-detail/employee-detail.component').then(m => m.EmployeeDetailComponent), canActivate: [authGuard] },

  // Procesamiento
  { path: 'procesar', loadComponent: () => import('./procesar-planillas/procesar-planillas.component').then(m => m.ProcesarPlanillasComponent), canActivate: [authGuard] },
  {
    path: 'procesar-tardanzas-faltas',
    loadComponent: () => import('./procesar-tardanzas-faltas/procesar-tardanzas-faltas.component').then(m => m.ProcesarTardanzasFaltasComponent),
    canActivate: [authGuard],
    data: { title: 'Procesar Tardanzas y Faltas', description: 'Gestión de asistencias, tardanzas y faltas de empleados' }
  },
  { path: 'cabecera', loadComponent: () => import('./cabecera-planilla/cabecera-planilla.component').then(m => m.CabeceraPlanillaComponent), canActivate: [authGuard] },
  { path: 'historial', loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // Reportes
  {
    path: 'reporte-planillas',
    loadComponent: () => import('./reporte-planillas/reporte-planillas.component').then(m => m.ReportePlanillasComponent),
    canActivate: [authGuard],
    data: { title: 'Reporte de Planillas', description: 'Reporte general de planillas procesadas' }
  },
  {
    path: 'reporte-boletas',
    loadComponent: () => import('./reporte-boletas/reporte-boletas.component').then(m => m.ReporteBoletasComponent),
    canActivate: [authGuard],
    data: { title: 'Reporte de Boletas', description: 'Reporte de boletas de pago' }
  },
  {
    path: 'reporte-descuentos',
    loadComponent: () => import('./reporte-descuentos/reporte-descuentos.component').then(m => m.ReporteDescuentosComponent),
    canActivate: [authGuard],
    data: { title: 'Reporte de Descuentos', description: 'Reporte de descuentos aplicados' }
  },
  {
    path: 'pdt-plame',
    loadComponent: () => import('./pdt-plame/pdt-plame.component').then(m => m.PdtPlameComponent),
    canActivate: [authGuard],
    data: { title: 'PDT PLAME', description: 'Exportar PDT PLAME para SUNAT' }
  },
  {
    path: 'afp-net',
    loadComponent: () => import('./afp-net/afp-net.component').then(m => m.AfpNetComponent),
    canActivate: [authGuard],
    data: { title: 'AFP NET', description: 'Exportar archivos AFP NET' }
  },

  // Configuración
  { path: 'configuracion', loadComponent: () => import('../dashboard/dashboard.component').then(m => m.DashboardComponent), canActivate: [authGuard] },

  // Parámetros y Reglas
  { path: 'parametros-legales', loadComponent: () => import('./parametros-legales/parametros-legales.component').then(m => m.ParametrosLegalesComponent), canActivate: [authGuard] },
  { path: 'reglas-asistencia', loadComponent: () => import('./reglas-asistencia/reglas-asistencia.component').then(m => m.ReglasAsistenciaComponent), canActivate: [authGuard] },
];
