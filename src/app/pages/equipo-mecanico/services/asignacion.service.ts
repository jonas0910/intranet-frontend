import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { ApiResponse, PaginatedResponse, Operador } from './operador.service';

export interface Asignacion {
  id: number;
  equipo_id: number;
  operador_id: number;
  fecha_inicio: string;
  fecha_fin?: string;
  observaciones?: string;
  created_at: string;
  updated_at: string;
  equipo?: {
    id: number;
    codigo_interno: string;
    placa?: string;
    marca?: string;
    modelo?: string;
  };
  operador?: Operador;
}

@Injectable({
  providedIn: 'root'
})
export class AsignacionService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) {}

  listar(filtros: any = {}, perPage: number = 15, page?: number): Observable<PaginatedResponse<Asignacion>> {
    let params = new HttpParams().set('per_page', perPage.toString());
    if (page != null && page > 0) {
      params = params.set('page', String(page));
    }

    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Asignacion>>(`${this.apiUrl}/asignaciones`, { params });
  }

  listarTodos(filtros: any = {}, perPage: number = 500): Observable<Asignacion[]> {
    return this.listar(filtros, perPage, 1).pipe(
      expand((response) => {
        const d = response.data as unknown;
        if (!d || Array.isArray(d)) {
          return EMPTY;
        }
        const p = d as { current_page?: number; last_page?: number };
        const current = p.current_page ?? 1;
        const last = p.last_page ?? 1;
        if (current >= last) {
          return EMPTY;
        }
        return this.listar(filtros, perPage, current + 1);
      }),
      map((response) => {
        if (!response.success || response.data == null) {
          return [];
        }
        const d = response.data as unknown;
        if (Array.isArray(d)) {
          return d as Asignacion[];
        }
        return (d as { data?: Asignacion[] }).data ?? [];
      }),
      reduce((acc, items) => acc.concat(items), [] as Asignacion[])
    );
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Asignacion>> {
    return this.http.get<ApiResponse<Asignacion>>(`${this.apiUrl}/asignaciones/${id}`);
  }

  crear(datos: Partial<Asignacion>): Observable<ApiResponse<Asignacion>> {
    return this.http.post<ApiResponse<Asignacion>>(`${this.apiUrl}/asignaciones`, datos);
  }

  actualizar(id: number, datos: Partial<Asignacion>): Observable<ApiResponse<Asignacion>> {
    return this.http.put<ApiResponse<Asignacion>>(`${this.apiUrl}/asignaciones/${id}`, datos);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/asignaciones/${id}`);
  }

  finalizar(id: number, datos: any): Observable<ApiResponse<Asignacion>> {
    return this.http.post<ApiResponse<Asignacion>>(`${this.apiUrl}/asignaciones/${id}/finalizar`, datos);
  }

  obtenerActivas(): Observable<ApiResponse<Asignacion[]>> {
    return this.http.get<ApiResponse<Asignacion[]>>(`${this.apiUrl}/asignaciones/activas`);
  }
}

