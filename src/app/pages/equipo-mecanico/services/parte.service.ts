import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Parte, PaginatedResponse, ApiResponse } from '../models/equipo.model';

@Injectable({
  providedIn: 'root'
})
export class ParteService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) {}

  listar(filtros: any = {}, perPage: number = 15): Observable<PaginatedResponse<Parte>> {
    let params = new HttpParams().set('per_page', perPage.toString());
    
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Parte>>(`${this.apiUrl}/partes`, { params });
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Parte>> {
    return this.http.get<ApiResponse<Parte>>(`${this.apiUrl}/partes/${id}`);
  }

  crear(datos: Partial<Parte>): Observable<ApiResponse<Parte>> {
    return this.http.post<ApiResponse<Parte>>(`${this.apiUrl}/partes`, datos);
  }

  actualizar(id: number, datos: Partial<Parte>): Observable<ApiResponse<Parte>> {
    return this.http.put<ApiResponse<Parte>>(`${this.apiUrl}/partes/${id}`, datos);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/partes/${id}`);
  }

  aprobar(id: number): Observable<ApiResponse<Parte>> {
    return this.http.post<ApiResponse<Parte>>(`${this.apiUrl}/partes/${id}/aprobar`, {});
  }

  rechazar(id: number, motivo: string): Observable<ApiResponse<Parte>> {
    return this.http.post<ApiResponse<Parte>>(`${this.apiUrl}/partes/${id}/rechazar`, { motivo });
  }
}

