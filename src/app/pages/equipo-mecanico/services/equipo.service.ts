import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Equipo, PaginatedResponse, ApiResponse } from '../models/equipo.model';

@Injectable({
  providedIn: 'root'
})
export class EquipoService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) { }

  listar(filtros: any = {}, perPage: number = 15, page?: number): Observable<PaginatedResponse<Equipo>> {
    let params = new HttpParams().set('per_page', perPage.toString());
    if (page != null && page > 0) {
      params = params.set('page', String(page));
    }

    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Equipo>>(`${this.apiUrl}/equipos`, { params });
  }

  /**
   * Listado completo sin paginar (API: GET equipos?todos=1). Usado en combos y vistas que deben mostrar todos los equipos.
   */
  listarTodos(filtros: any = {}): Observable<Equipo[]> {
    let params = new HttpParams().set('todos', '1');

    Object.keys(filtros).forEach((key) => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http
      .get<{ success: boolean; data: Equipo[] }>(`${this.apiUrl}/equipos`, { params })
      .pipe(map((res) => (res.success && Array.isArray(res.data) ? res.data : [])));
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Equipo>> {
    return this.http.get<ApiResponse<Equipo>>(`${this.apiUrl}/equipos/${id}`);
  }

  crear(equipo: any): Observable<ApiResponse<Equipo>> {
    return this.http.post<ApiResponse<Equipo>>(`${this.apiUrl}/equipos`, equipo);
  }

  actualizar(id: number, equipo: any): Observable<ApiResponse<Equipo>> {
    return this.http.post<ApiResponse<Equipo>>(`${this.apiUrl}/equipos/${id}?_method=PUT`, equipo);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/equipos/${id}`);
  }

  sincronizarDesdeActivosFijos(): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/equipos/sincronizar`, {});
  }
}

