import { Routes } from '@angular/router';

export const ACTIVOS_FIJOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard-activos.component').then(m => m.DashboardActivosComponent),
    data: { title: 'Dashboard de Activos Fijos' }
  },
  // Rutas específicas ANTES de las paramétricas
  {
    path: 'activos/crear',
    loadComponent: () => import('./activos/crear-activo.component').then(m => m.CrearActivoComponent),
    data: { title: 'Nuevo Activo' }
  },
  {
    path: 'activos',
    loadComponent: () => import('./activos/lista-activos.component').then(m => m.ListaActivosComponent),
    data: { title: 'Lista de Activos' }
  },
  {
    path: 'activos/:id/editar',
    loadComponent: () => import('./activos/editar-activo.component').then(m => m.EditarActivoComponent),
    data: { title: 'Editar Activo' }
  },
  {
    path: 'activos/:id',
    loadComponent: () => import('./activos/detalle-activo.component').then(m => m.DetalleActivoComponent),
    data: { title: 'Detalle de Activo' }
  },
  {
    path: 'categorias',
    loadComponent: () => import('./categorias/categorias.component').then(m => m.CategoriasComponent),
    data: { title: 'Categorías de Activos' }
  },
  {
    path: 'ubicaciones',
    loadComponent: () => import('./ubicaciones/ubicaciones.component').then(m => m.UbicacionesComponent),
    data: { title: 'Ubicaciones' }
  },
  // ==================== NUEVAS RUTAS SIMPLIFICADAS ====================
  {
    path: 'movimientos',
    loadComponent: () => import('./movimientos/movimientos.component').then(m => m.MovimientosComponent),
    data: { title: 'Movimientos y Control' }
  },
  {
    path: 'depreciacion',
    loadComponent: () => import('./depreciacion/depreciacion.component').then(m => m.DepreciacionComponent),
    data: { title: 'Depreciación de Activos' }
  },
  {
    path: 'inventario',
    loadComponent: () => import('./inventario/inventario.component').then(m => m.InventarioComponent),
    data: { title: 'Inventario Físico' }
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard-activos.component').then(m => m.DashboardActivosComponent),
    data: { title: 'Dashboard de Activos Fijos' }
  },
  {
    path: 'reportes',
    loadComponent: () => import('./reportes/reportes.component').then(m => m.ReportesComponent),
    data: { title: 'Reportes' }
  },
  {
    path: 'configuracion',
    loadComponent: () => import('./configuracion/configuracion.component').then(m => m.ConfiguracionComponent),
    data: { title: 'Configuración del Sistema' }
  },
  {
    path: 'bienes-patrimoniales',
    loadComponent: () => import('./bienes-patrimoniales/bienes-patrimoniales.component').then(m => m.BienesPatrimonialesComponent),
    data: { title: 'Mis bienes patrimoniales' }
  },
  {
    path: 'vehiculos-servicios',
    loadComponent: () => import('./vehiculos-servicios/vehiculos-servicios.component').then(m => m.VehiculosServiciosComponent),
    data: { title: 'Vehículos de servicio por departamento' }
  }
];

