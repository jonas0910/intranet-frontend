export interface Documento {
  id: number;
  codigo: string;
  titulo: string;
  descripcion?: string;
  tipo_documento_id: number;
  area_id: number;
  carpeta_id?: number; // carpeta actual (si aplica)
  clasificacion: 'publico' | 'reservado' | 'confidencial' | 'secreto';
  estado: 'borrador' | 'revision' | 'aprobado' | 'archivado' | 'eliminado';
  nombre_archivo: string;
  ruta_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string;
  extension: string;
  fecha_documento: string;
  numero_documento?: string;
  asunto?: string;
  palabras_clave?: string;
  contenido_ocr?: string;
  dpi?: number;
  paginas: number;
  comprimido: boolean;
  calidad?: number;
  firmado: boolean;
  firma_digital?: string;
  fecha_firma?: string;
  firmado_por_id?: number;
  propietario_id?: number;
  documento_padre_id?: number;
  expediente_id?: number;
  creado_por_id: number;
  modificado_por_id?: number;
  fecha_revision?: string;
  fecha_aprobacion?: string;
  fecha_archivado?: string;
  cierre_id?: number;
  fecha_retencion_hasta?: string;
  bloqueado: boolean;
  numero_versiones: number;
  numero_accesos: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
  
  // Relaciones
  tipo_documento?: TipoDocumento;
  area?: Area;
  cierre?: Cierre;
  versiones?: Version[];
  derivaciones?: Derivacion[];
}

export interface TipoDocumento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  clasificacion: 'publico' | 'reservado' | 'confidencial' | 'secreto';
  politica_retencion: string;
  meses_retencion?: number;
  requiere_firma: boolean;
  activo: boolean;
}

export interface Area {
  id: number;
  codigo: string;
  nombre: string;
  siglas?: string;
  area_padre_id?: number;
  responsable_id?: number;
  descripcion?: string;
  activo: boolean;
}

export interface Version {
  id: number;
  documento_id: number;
  numero_version: number;
  nombre_archivo: string;
  ruta_archivo: string;
  mime_type: string;
  tamano_bytes: number;
  hash_sha256: string;
  comentario?: string;
  tipo_cambio: 'menor' | 'mayor' | 'critico';
  creado_por_id: number;
  created_at: string;
  updated_at: string;
}

export interface Cierre {
  id: number;
  codigo: string;
  tipo_periodo: 'mensual' | 'trimestral' | 'anual';
  anio: number;
  mes?: number;
  trimestre?: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: 'pendiente' | 'en_proceso' | 'validado' | 'rechazado' | 'cerrado';
  total_documentos: number;
  total_tamano_bytes: number;
  area_id?: number;
  solicitado_por_id: number;
  validado_por_id?: number;
  cerrado_por_id?: number;
  fecha_solicitud: string;
  fecha_validacion?: string;
  fecha_cierre?: string;
  observaciones?: string;
  motivo_rechazo?: string;
  ruta_backup?: string;
  hash_consolidado?: string;
  created_at: string;
  updated_at: string;
  
  // Relaciones
  area?: Area;
  documentos?: Documento[];
}

export interface Derivacion {
  id: number;
  documento_id: number;
  area_origen_id: number;
  area_destino_id: number;
  usuario_origen_id: number;
  usuario_destino_id?: number;
  observaciones?: string;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  estado: 'pendiente' | 'recibido' | 'rechazado';
  fecha_derivacion: string;
  fecha_recepcion?: string;
  motivo_rechazo?: string;
  
  // Relaciones
  area_origen?: Area;
  area_destino?: Area;
}

export interface Auditoria {
  id: number;
  documento_id?: number;
  usuario_id: number;
  accion: 'crear' | 'ver' | 'descargar' | 'editar' | 'eliminar' | 'restaurar' | 'derivar' | 'firmar' | 'nueva_version' | 'cambio_estado' | 'bloquear' | 'desbloquear';
  modulo: string;
  descripcion?: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
  ip: string;
  user_agent?: string;
  metodo_http?: string;
  url?: string;
  fecha_hora: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
  message?: string;
}

export interface DocumentoFiltros {
  area_id?: number;
  tipo_documento_id?: number;
  estado?: string;
  clasificacion?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
  periodo?: string;
  q?: string;
  firmado?: boolean;
  per_page?: number;
  page?: number;
}

export interface CierreFiltros {
  estado?: string;
  anio?: number;
  mes?: number;
  tipo_periodo?: string;
  area_id?: number;
  per_page?: number;
  page?: number;
}

export interface EstadisticasAuditoria {
  total_acciones: number;
  acciones_por_tipo: Array<{ accion: string; total: number }>;
  usuarios_mas_activos: Array<{ usuario_id: number; total: number }>;
}

export interface Usuario {
  id: number;
  nombre: string;
  email: string;
}

export type TipoPermiso = 
  | 'solo-lectura' 
  | 'lectura-descarga' 
  | 'comentar' 
  | 'edicion' 
  | 'edicion-completa' 
  | 'administrar';

export interface DocumentoCompartido {
  id: number;
  usuario: Usuario;
  compartido_por: Usuario;
  permiso: TipoPermiso;
  mensaje?: string;
  leido_en?: string;
  compartido_en: string;
}

