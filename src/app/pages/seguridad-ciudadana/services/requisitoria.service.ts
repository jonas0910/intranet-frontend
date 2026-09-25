import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface VehiculoRequisitoriado {
  id: number;
  placa: string;
  marca?: string;
  modelo?: string;
  color?: string;
  motivo: string;
  descripcion_motivo: string;
  institucion_solicita: string;
  fecha_requisitoria: string;
  estado: string;
}

export interface PersonaRequisitoriada {
  id: number;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  alias?: string;
  foto?: string;
  delito: string;
  descripcion_delito: string;
  peligrosidad: string;
  armado: boolean;
  estado: string;
}

@Injectable({
  providedIn: 'root'
})
export class RequisitoriaService {
  private apiUrl = `${environment.apiUrl}/seguridad-ciudadana/requisitorias`;

  constructor(private http: HttpClient) {}

  // Consultas rápidas
  consultarVehiculo(placa: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultar-vehiculo`, { placa });
  }

  consultarPersona(dni: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/consultar-persona`, { dni });
  }

  buscar(termino: string): Observable<any> {
    const params = new HttpParams().set('termino', termino);
    return this.http.get<any>(`${this.apiUrl}/buscar`, { params });
  }

  // Vehículos requisitoriados
  obtenerVehiculos(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/vehiculos`, { params });
  }

  registrarVehiculo(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehiculos`, datos);
  }

  marcarVehiculoEncontrado(id: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehiculos/${id}/marcar-encontrado`, datos);
  }

  // Personas requisitoriadas
  obtenerPersonas(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
      Object.keys(filtros).forEach(key => {
        if (filtros[key]) {
          params = params.set(key, filtros[key]);
        }
      });
    }
    return this.http.get<any>(`${this.apiUrl}/personas`, { params });
  }

  registrarPersona(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/personas`, datos);
  }

  marcarPersonaCapturada(id: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/personas/${id}/marcar-capturada`, datos);
  }

  // Estadísticas y alertas
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/estadisticas`);
  }

  obtenerAlertasPeligrosas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/alertas-peligrosas`);
  }
}

