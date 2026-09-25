import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Cierre,
  ApiResponse,
  PaginatedResponse,
  CierreFiltros
} from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class CierreService {
  private readonly apiUrl = `${environment.apiUrl}/gestion-documental/cierres`;

  constructor(private http: HttpClient) {}

  /**
   * Listar cierres con filtros
   */
  listar(filtros?: CierreFiltros): Observable<PaginatedResponse<Cierre>> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Cierre>>(this.apiUrl, { params });
  }

  /**
   * Obtener cierre por ID
   */
  obtener(id: number): Observable<ApiResponse<Cierre>> {
    return this.http.get<ApiResponse<Cierre>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo cierre
   */
  crear(datos: Partial<Cierre>): Observable<ApiResponse<Cierre>> {
    return this.http.post<ApiResponse<Cierre>>(this.apiUrl, datos);
  }

  /**
   * Actualizar cierre existente
   */
  actualizar(id: number, datos: Partial<Cierre>): Observable<ApiResponse<Cierre>> {
    return this.http.put<ApiResponse<Cierre>>(`${this.apiUrl}/${id}`, datos);
  }

  /**
   * Aprobar cierre
   */
  aprobar(id: number, observaciones?: string): Observable<ApiResponse<Cierre>> {
    return this.http.put<ApiResponse<Cierre>>(
      `${this.apiUrl}/${id}/aprobar`,
      { observaciones }
    );
  }

  /**
   * Rechazar cierre
   */
  rechazar(id: number, motivo_rechazo: string): Observable<ApiResponse<Cierre>> {
    return this.http.put<ApiResponse<Cierre>>(
      `${this.apiUrl}/${id}/rechazar`,
      { motivo_rechazo }
    );
  }
}

