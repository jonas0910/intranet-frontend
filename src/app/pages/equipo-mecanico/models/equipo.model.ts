export interface Equipo {
  id: number;
  activo_id?: number;
  codigo_interno: string;
  codigo_patrimonial?: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  anio?: number;
  tipo: 'vehiculo' | 'maquinaria' | 'equipo';
  odometro_actual: number;
  horas_motor_actual: number;
  area_id?: number;
  estado: 'operativo' | 'mantenimiento' | 'fuera_servicio';
  observaciones?: string;
  department_id?: number;
  activo: boolean;
  foto?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  activo_fijo?: any;
  area?: { id: number; nombre: string };
  asignacion_actual?: AsignacionActual;
}

export interface AsignacionActual {
  id: number;
  equipo_id: number;
  operador_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  operador?: {
    id: number;
    user?: {
      id: number;
      name: string;
      email: string;
    };
  };
}

export interface Parte {
  id: number;
  fecha: string;
  equipo_id: number;
  operador_id?: number;
  centro_costo_id?: number;
  turno: 'diurno' | 'nocturno';
  kilometraje_inicio: number;
  kilometraje_fin: number;
  horas_inicio: number;
  horas_fin: number;
  observaciones?: string;
  estado: 'borrador' | 'aprobado' | 'rechazado';
  fecha_aprobacion?: string;
  aprobado_por?: number;
  firma_digital?: string;
  motivo_rechazo?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  equipo?: Equipo;
  operador?: any;
  centro_costo?: { id: number; nombre: string };
  detalles?: ParteDetalle[];
  consumos_combustible?: ConsumoCombustible[];
  consumos_repuestos?: ConsumoRepuesto[];
}

export interface ParteDetalle {
  id?: number;
  parte_id?: number;
  centro_costo_id?: number;
  tipo: 'trabajo' | 'traslado' | 'espera' | 'otro';
  descripcion: string;
  horas: number;
  centro_costo?: { id: number; nombre: string };
}

export interface ConsumoCombustible {
  id?: number;
  parte_id?: number;
  equipo_id: number;
  tipo: 'diesel' | 'gasolina_84' | 'gasolina_90' | 'gasolina_95' | 'glp' | 'gnc';
  litros: number;
  costo_unitario: number;
  costo_total: number;
  vale?: string;
  proveedor?: string;
}

export interface ConsumoRepuesto {
  id?: number;
  parte_id?: number;
  equipo_id: number;
  codigo?: string;
  descripcion: string;
  cantidad: number;
  costo_unitario: number;
  costo_total: number;
  origen: 'almacen' | 'compra_directa' | 'otro';
}

export interface Mantenimiento {
  id: number;
  equipo_id: number;
  tipo_mantenimiento_preventivo_id?: number;
  control_mantenimiento_id?: number;
  tipo: 'preventivo' | 'correctivo';
  fecha_programada: string;
  fecha_inicio?: string;
  fecha_cierre?: string;
  odometro?: number;
  horas_motor?: number;
  descripcion: string;
  estado: 'programado' | 'en_proceso' | 'cerrado' | 'cancelado';
  responsable?: string;
  costo_estimado?: number;
  costo_real?: number;
  costo_total?: number;
  centro_costo_id?: number;
  observaciones?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  equipo?: Equipo;
  centro_costo?: { id: number; name: string; code: string };
  detalles?: MantenimientoDetalle[];
}

export interface MantenimientoDetalle {
  id?: number;
  mantenimiento_id?: number;
  centro_costo_id?: number;
  descripcion: string;
  mano_obra_horas: number;
  mano_obra_costo: number;
  repuestos_costo: number;
  total: number;
  centro_costo?: { id: number; name: string };
}

export interface Valorizacion {
  id: number;
  periodo_desde: string;
  periodo_hasta: string;
  centro_costo_id?: number;
  estado: 'generado' | 'aprobado' | 'rechazado';
  total_horas: number;
  total_costo: number;
  generado_por?: number;
  aprobado_por?: number;
  generado_en: string;
  aprobado_en?: string;
  created_at: string;
  updated_at: string;

  // Relaciones
  centro_costo?: { id: number; name: string };
  generado_por_usuario?: { id: number; name: string };
  aprobado_por_usuario?: { id: number; name: string };
  detalles?: ValorizacionDetalle[];
}

export interface ValorizacionDetalle {
  id?: number;
  valorizacion_id?: number;
  equipo_id: number;
  horas_trabajadas: number;
  tarifa_hora: number;
  costo_total: number;
  observaciones?: string;

  // Relaciones
  equipo?: Equipo;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
  message?: string;
}

