import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Mantenimiento, PaginatedResponse, ApiResponse } from '../models/equipo.model';

@Injectable({
  providedIn: 'root'
})
export class MantenimientoService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) {}

  listar(filtros: any = {}, perPage: number = 15): Observable<PaginatedResponse<Mantenimiento>> {
    let params = new HttpParams().set('per_page', perPage.toString());
    
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Mantenimiento>>(`${this.apiUrl}/mantenimientos`, { params });
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Mantenimiento>> {
    return this.http.get<ApiResponse<Mantenimiento>>(`${this.apiUrl}/mantenimientos/${id}`);
  }

  crear(mantenimiento: Partial<Mantenimiento>): Observable<ApiResponse<Mantenimiento>> {
    return this.http.post<ApiResponse<Mantenimiento>>(`${this.apiUrl}/mantenimientos`, mantenimiento);
  }

  actualizar(id: number, mantenimiento: Partial<Mantenimiento>): Observable<ApiResponse<Mantenimiento>> {
    return this.http.put<ApiResponse<Mantenimiento>>(`${this.apiUrl}/mantenimientos/${id}`, mantenimiento);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/mantenimientos/${id}`);
  }

  completar(id: number, datos: any): Observable<ApiResponse<Mantenimiento>> {
    return this.http.post<ApiResponse<Mantenimiento>>(`${this.apiUrl}/mantenimientos/${id}/completar`, datos);
  }

  /** Ficha de mantenimiento en PDF (formato Notaria). */
  descargarFichaPdf(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/mantenimientos/${id}/ficha-pdf`, {
      responseType: 'blob',
    });
  }
}


