export interface Activo {
  id: number;
  codigo_patrimonial: string;
  codigo_sbn?: string;
  categoria_id: number;
  categoria?: Categoria;
  descripcion: string;
  detalle?: string;
  
  // Características
  marca?: string;
  modelo?: string;
  serie?: string;
  color?: string;
  dimensiones?: string;
  
  // Valores
  valor_adquisicion: number;
  valor_residual: number;
  depreciacion_acumulada: number;
  valor_neto: number;
  
  // Adquisición
  tipo_adquisicion: string;
  fecha_adquisicion: string;
  documento_adquisicion?: string;
  proveedor?: string;
  orden_compra?: string;
  
  // Ubicación
  ubicacion_id: number;
  ubicacion?: Ubicacion;
  unidad_organica_id?: number | null;
  unidad_organica?: UnidadOrganica;
  responsable_id?: number;
  responsable?: Responsable;
  fecha_asignacion?: string;
  
  // Estado
  estado: 'activo' | 'baja' | 'transferido' | 'extraviado';
  condicion: 'bueno' | 'regular' | 'malo' | 'obsoleto';
  observaciones?: string;
  
  // Códigos
  codigo_qr?: string;
  codigo_barras?: string;
  
  // Imágenes
  imagenes?: string[];
  imagen_principal?: string;
  
  // Depreciación
  depreciable: boolean;
  fecha_inicio_depreciacion?: string;
  fecha_fin_depreciacion?: string;
  
  created_at: string;
  updated_at: string;

  /** Historial de movimientos (viene en detalle del activo) */
  movimientos?: Movimiento[];
}

export interface Categoria {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: 'mobiliario' | 'computo' | 'vehiculos' | 'inmuebles' | 'otros';
  vida_util_anos: number;
  vida_util?: number;
  tasa_depreciacion: number;
  cuenta_contable?: string;
  depreciable: boolean;
  activo: boolean;
}

export interface Ubicacion {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo: 'edificio' | 'piso' | 'oficina' | 'almacen' | 'otro';
  ubicacion_padre_id?: number;
  ubicacion_padre?: Ubicacion;
  direccion?: string;
  responsable?: Responsable | string;
  activo: boolean;
}

export interface Responsable {
  id: number;
  name: string; // Backend usa 'name' (tabla users)
  nombre?: string; // Alias opcional
  email: string;
  documento?: string;
}

/** Unidad orgánica (Planillas) - determina en qué área/órgano se encuentra el activo */
export interface UnidadOrganica {
  id: number;
  code: string;
  name: string;
  description?: string;
  level?: number;
  parent_id?: number;
  is_active?: boolean;
}

export type TipoMovimiento = 'alta' | 'baja' | 'transferencia' | 'asignacion';

export interface Movimiento {
  id: number;
  activo_id: number;
  activo?: Activo;
  tipo_movimiento: TipoMovimiento;
  fecha_movimiento: string;
  documento_sustento?: string;
  motivo?: string;
  ubicacion_origen_id?: number;
  ubicacion_destino_id?: number;
  ubicacion_origen?: Ubicacion;
  ubicacion_destino?: Ubicacion;
  unidad_organica_origen_id?: number | null;
  unidad_organica_destino_id?: number | null;
  unidad_organica_origen?: { id: number; code?: string; name: string };
  unidad_organica_destino?: { id: number; code?: string; name: string };
  responsable_origen?: Responsable;
  responsable_destino?: Responsable;
  responsable?: Responsable;
  motivo_baja?: string;
  valor_baja?: number;
  observaciones?: string;
  documento_respaldo?: string;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  aprobado_por?: Responsable;
  fecha_aprobacion?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Depreciacion {
  id: number;
  activo_id: number;
  activo?: Activo;
  periodo_ano: number;
  periodo_mes: number;
  fecha_calculo: string;
  valor_inicial: number;
  depreciacion_acumulada_anterior: number;
  depreciacion_periodo: number;
  depreciacion_acumulada_nueva: number;
  valor_neto_final: number;
  metodo: string;
  tasa_depreciacion: number;
  estado: 'calculado' | 'contabilizado' | 'anulado';
}

export interface Inventario {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin?: string;
  estado: 'en_proceso' | 'cerrado' | 'cancelado';
  total_activos_sistema: number;
  total_activos_escaneados: number;
  total_faltantes: number;
  total_sobrantes: number;
  porcentaje_avance: number;
  efectividad: number;
  responsable?: Responsable;
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
    from?: number;
    to?: number;
  };
  message?: string;
}

