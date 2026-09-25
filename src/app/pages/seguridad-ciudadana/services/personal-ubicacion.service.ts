import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PersonalUbicacion {
  id: number;
  id_personal: number;
  nombres?: string;
  apellidos?: string;
  codigo_personal?: string;
  tipo?: string;
  estado?: string;
  latitud: number;
  longitud: number;
  tipo_ubicacion?: string;
  ultima_ubicacion?: string;
  vehiculo_id?: number | null;
  nombre_vehiculo?: string | null;
  placa_vehiculo?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class PersonalUbicacionService {
  private apiUrl = `${environment.apiUrl}/seguridad-ciudadana/personal-ubicacion`;

  constructor(private http: HttpClient) { }

  obtenerPersonalConUbicacion(): Observable<any> {
    return this.http.get<any>(this.apiUrl);
  }

  obtenerUbicacionPorPersonal(personalId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${personalId}`);
  }

  crearActualizarUbicacion(datos: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, datos);
  }

  actualizarUbicacion(personalId: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${personalId}`, datos);
  }

  obtenerHistorialUbicacion(personalId: number, params?: { limite?: number; fecha_desde?: string; fecha_hasta?: string }): Observable<any> {
    let httpParams = new HttpParams();
    if (params?.limite != null) httpParams = httpParams.set('limite', String(params.limite));
    if (params?.fecha_desde) httpParams = httpParams.set('fecha_desde', params.fecha_desde);
    if (params?.fecha_hasta) httpParams = httpParams.set('fecha_hasta', params.fecha_hasta);
    return this.http.get<any>(`${this.apiUrl}/${personalId}/historial`, { params: httpParams });
  }
}
