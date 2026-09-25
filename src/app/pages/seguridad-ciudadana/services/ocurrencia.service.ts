import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Ocurrencia {
  id: number;
  codigo_ocurrencia: string;
  tipo: string;
  prioridad: string;
  descripcion: string;
  direccion: string;
  latitud?: number;
  longitud?: number;
  distrito: string;
  zona?: string;
  fecha_hora_ocurrencia: string;
  fecha_hora_reporte: string;
  estado: string;
  tiempo_respuesta_minutos?: number;
  personal_atendio?: any;
  vehiculo?: any;
}

export interface MapaCalorPunto {
  lat: number;
  lng: number;
  tipo: string;
  prioridad: string;
  distrito: string;
  peso: number;
}

@Injectable({
  providedIn: 'root'
})
export class OcurrenciaService {
  private apiUrl = `${environment.apiUrl}/seguridad-ciudadana/ocurrencias`;

  constructor(private http: HttpClient) {}

  obtenerOcurrencias(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  obtenerOcurrencia(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }

  crearOcurrencia(datos: any): Observable<any> {
    return this.http.post<any>(this.apiUrl, datos);
  }

  actualizarOcurrencia(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${id}`, datos);
  }

  asignarPersonal(id: number, personalId: number, vehiculoId?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/asignar-personal`, {
      personal_id: personalId,
      vehiculo_id: vehiculoId
    });
  }

  marcarLlegada(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/marcar-llegada`, {});
  }

  cerrarOcurrencia(id: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${id}/cerrar`, datos);
  }

  obtenerEstadisticas(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/stats/estadisticas`, { params });
  }

  obtenerDatosMapaCalor(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<MapaCalorPunto[]>(`${this.apiUrl}/stats/mapa-calor`, { params });
  }
}

