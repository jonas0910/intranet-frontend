import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Auditoria,
  ApiResponse,
  PaginatedResponse,
  EstadisticasAuditoria
} from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private readonly apiUrl = `${environment.apiUrl}/gestion-documental/auditoria`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener auditorías de accesos
   */
  obtenerAccesos(filtros?: any): Observable<PaginatedResponse<Auditoria>> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Auditoria>>(`${this.apiUrl}/accesos`, { params });
  }

  /**
   * Obtener auditorías de modificaciones
   */
  obtenerModificaciones(filtros?: any): Observable<PaginatedResponse<Auditoria>> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Auditoria>>(`${this.apiUrl}/modificaciones`, { params });
  }

  /**
   * Obtener historial de un documento
   */
  obtenerHistorialDocumento(documentoId: number): Observable<ApiResponse<Auditoria[]>> {
    return this.http.get<ApiResponse<Auditoria[]>>(`${this.apiUrl}/documentos/${documentoId}`);
  }

  /**
   * Obtener estadísticas
   */
  obtenerEstadisticas(filtros?: any): Observable<ApiResponse<EstadisticasAuditoria>> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<ApiResponse<EstadisticasAuditoria>>(
      `${this.apiUrl}/reportes/estadisticas`,
      { params }
    );
  }

  /**
   * Exportar reporte a Excel
   */
  exportarReporte(filtros?: any): Observable<Blob> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get(`${this.apiUrl}/reportes/exportar`, {
      params,
      responseType: 'blob'
    });
  }
}

