import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PersonalUbicacion {
  id: number;
  nombre_completo: string;
  department_id: number;
  photo?: string;
  latitud: number;
  longitud: number;
  tipo_seguimiento: 'personal' | 'vehicular';
  velocidad_actual: number;
  direccion?: string;
  ultima_actualizacion?: string;
  equipo_id?: number;
  equipo_codigo?: string;
  equipo_placa?: string;
  equipo_tipo?: string;
}

export interface AlertaGPS {
  id: number;
  employee_id: number;
  personal_nombre: string;
  equipo_id?: number;
  equipo_codigo?: string;
  equipo_placa?: string;
  tipo_alerta_id: number;
  tipo_nombre: string;
  tipo_color_hex: string;
  lat: number;
  lng: number;
  estado: 'pendiente' | 'resuelta' | 'rechazada';
  mensaje?: string;
  observaciones?: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class EquipoGpsService {
  private apiUrl = `${environment.apiUrl}/equipo-mecanico/gps`;

  constructor(private http: HttpClient) { }

  obtenerPersonalConUbicacion(params?: { department_id?: number }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.department_id) {
      httpParams = httpParams.set('department_id', String(params.department_id));
    }
    return this.http.get<any>(`${this.apiUrl}/ubicaciones`, { params: httpParams });
  }

  obtenerHistorialUbicacion(personalId: number, params?: { limite?: number; fecha_desde?: string; fecha_hasta?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.limite != null) httpParams = httpParams.set('limite', String(params.limite));
    if (params?.fecha_desde) httpParams = httpParams.set('fecha_desde', params.fecha_desde);
    if (params?.fecha_hasta) httpParams = httpParams.set('fecha_hasta', params.fecha_hasta);
    return this.http.get<any>(`${this.apiUrl}/ubicacion/${personalId}/historial`, { params: httpParams });
  }

  // Alertas
  listarAlertas(params?: any): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/alertas`, { params });
  }

  resolverAlerta(id: number, datos: any): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/alertas/${id}/resolver`, datos);
  }

  // Tipos Alerta
  listarTiposAlerta(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tipos-alerta`);
  }

  crearTipoAlerta(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tipos-alerta`, datos);
  }

  actualizarTipoAlerta(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tipos-alerta/${id}`, datos);
  }

  eliminarTipoAlerta(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tipos-alerta/${id}`);
  }
}
