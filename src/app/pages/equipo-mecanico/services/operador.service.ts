import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Operador {
  id: number;
  first_name: string;
  last_name: string;
  dni: string;
  employee_code?: string;
  license?: string;
  license_category?: string;
  license_expiration?: string;
  labor_regime?: string;
  status: string; // active, inactive
  hire_date?: string;
  is_planilla?: boolean;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  asignacion_actual?: any;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OperadorService {
  private readonly apiUrl = `${environment.apiUrl}/equipo-mecanico`;

  constructor(private http: HttpClient) {}

  listar(filtros: any = {}, perPage: number = 15): Observable<PaginatedResponse<Operador>> {
    let params = new HttpParams().set('per_page', perPage.toString());
    
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });

    return this.http.get<PaginatedResponse<Operador>>(`${this.apiUrl}/operadores`, { params });
  }

  obtenerDetalle(id: number): Observable<ApiResponse<Operador>> {
    return this.http.get<ApiResponse<Operador>>(`${this.apiUrl}/operadores/${id}`);
  }

  crear(datos: Partial<Operador>): Observable<ApiResponse<Operador>> {
    return this.http.post<ApiResponse<Operador>>(`${this.apiUrl}/operadores`, datos);
  }

  actualizar(id: number, datos: Partial<Operador>): Observable<ApiResponse<Operador>> {
    return this.http.put<ApiResponse<Operador>>(`${this.apiUrl}/operadores/${id}`, datos);
  }

  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/operadores/${id}`);
  }

  obtenerDisponibles(): Observable<ApiResponse<Operador[]>> {
    return this.http.get<ApiResponse<Operador[]>>(`${this.apiUrl}/operadores/disponibles`);
  }
}

