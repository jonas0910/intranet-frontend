import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TipoAlerta {
  id: number;
  codigo: string;
  nombre: string;
  color_hex: string;
  descripcion?: string;
  orden: number;
  activo: number;
  created_at?: string;
  updated_at?: string;
}

export interface Alerta {
  id: number;
  id_personal: number;
  id_tipo_alerta: number;
  latitud?: number;
  longitud?: number;
  mensaje?: string;
  leida_at?: string | null;
  created_at: string;
  codigo_personal?: string;
  personal_nombres?: string;
  personal_apellidos?: string;
  tipo_codigo?: string;
  tipo_nombre?: string;
  tipo_color_hex?: string;
  estado?: 'pendiente' | 'resuelta' | 'rechazada';
  observacion_resolucion?: string;
  id_ocurrencia?: number;
  evidencias?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private baseUrl = `${environment.apiUrl}/seguridad-ciudadana`;

  constructor(private http: HttpClient) { }

  // --- Tipos de alerta (CRUD) ---
  listarTiposAlerta(activosOnly = false): Observable<{ success: boolean; data: TipoAlerta[] }> {
    const params = activosOnly ? new HttpParams().set('activos', '1') : undefined;
    return this.http.get<{ success: boolean; data: TipoAlerta[] }>(`${this.baseUrl}/tipos-alerta`, { params });
  }

  obtenerTipoAlerta(id: number): Observable<{ success: boolean; data: TipoAlerta }> {
    return this.http.get<{ success: boolean; data: TipoAlerta }>(`${this.baseUrl}/tipos-alerta/${id}`);
  }

  crearTipoAlerta(datos: Partial<TipoAlerta>): Observable<{ success: boolean; data: TipoAlerta }> {
    return this.http.post<{ success: boolean; data: TipoAlerta }>(`${this.baseUrl}/tipos-alerta`, datos);
  }

  actualizarTipoAlerta(id: number, datos: Partial<TipoAlerta>): Observable<{ success: boolean; data: TipoAlerta }> {
    return this.http.put<{ success: boolean; data: TipoAlerta }>(`${this.baseUrl}/tipos-alerta/${id}`, datos);
  }

  eliminarTipoAlerta(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/tipos-alerta/${id}`);
  }

  // --- Alertas del personal ---
  listarAlertas(filtros?: {
    id_personal?: number;
    id_tipo_alerta?: number;
    solo_no_leidas?: boolean;
    fecha_desde?: string;
    fecha_hasta?: string;
    per_page?: number;
    page?: number;
  }): Observable<{ success: boolean; data: Alerta[]; meta?: any }> {
    let params = new HttpParams();
    if (filtros?.id_personal != null) params = params.set('id_personal', String(filtros.id_personal));
    if (filtros?.id_tipo_alerta != null) params = params.set('id_tipo_alerta', String(filtros.id_tipo_alerta));
    if (filtros?.solo_no_leidas) params = params.set('solo_no_leidas', '1');
    if (filtros?.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros?.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros?.per_page != null) params = params.set('per_page', String(filtros.per_page));
    if (filtros?.page != null) params = params.set('page', String(filtros.page));
    return this.http.get<{ success: boolean; data: Alerta[]; meta?: any }>(`${this.baseUrl}/alertas`, { params });
  }

  obtenerAlerta(id: number): Observable<{ success: boolean; data: Alerta }> {
    return this.http.get<{ success: boolean; data: Alerta }>(`${this.baseUrl}/alertas/${id}`);
  }

  marcarAlertaLeida(id: number): Observable<{ success: boolean; data: Alerta }> {
    return this.http.patch<{ success: boolean; data: Alerta }>(`${this.baseUrl}/alertas/${id}/marcar-leida`, {});
  }

  resolverAlerta(id: number, datos: { observacion: string, crear_ocurrencia: boolean }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/alertas/${id}/resolver`, datos);
  }

  rechazarAlerta(id: number, datos: { observacion: string }): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/alertas/${id}/rechazar`, datos);
  }
}
