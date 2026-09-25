import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Valorizacion, PaginatedResponse, ApiResponse } from '../models/equipo.model';

@Injectable({
  providedIn: 'root'
})
export class ValorizacionService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) { }

  listar(filtros: any = {}, perPage: number = 15): Observable<PaginatedResponse<Valorizacion>> {
    let params = new HttpParams().set('per_page', perPage.toString());

    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones`, { params });
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Valorizacion>> {
    return this.http.get<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones/${id}`);
  }

  crear(valorizacion: Partial<Valorizacion>): Observable<ApiResponse<Valorizacion>> {
    return this.http.post<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones`, valorizacion);
  }

  actualizar(id: number, valorizacion: Partial<Valorizacion>): Observable<ApiResponse<Valorizacion>> {
    return this.http.put<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones/${id}`, valorizacion);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/valorizaciones/${id}`);
  }

  generar(datos: any): Observable<ApiResponse<Valorizacion>> {
    return this.http.post<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones/generar`, datos);
  }

  aprobar(id: number): Observable<ApiResponse<Valorizacion>> {
    return this.http.post<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones/${id}/aprobar`, {});
  }

  rechazar(id: number, motivo: string): Observable<ApiResponse<Valorizacion>> {
    return this.http.post<ApiResponse<Valorizacion>>(`${this.apiUrl}/valorizaciones/${id}/rechazar`, { motivo });
  }

  exportarPDF(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/valorizaciones/${id}/pdf`, { responseType: 'blob' });
  }
}


