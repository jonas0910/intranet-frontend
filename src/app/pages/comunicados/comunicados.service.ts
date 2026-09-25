import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ComunicadosService {
  private baseUrl = `${environment.apiUrl}/comunicados`;

  constructor(private http: HttpClient) {}

  /**
   * Get all comunicados with optional filters
   */
  getComunicados(filters: any = {}): Observable<any> {
    let params = new HttpParams();

    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key].toString());
      }
    });

    return this.http.get<any>(this.baseUrl, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get comunicados vigentes (activos en la fecha actual).
   * Opcionalmente solo los públicos (visibles para todos los usuarios).
   */
  getComunicadosVigentes(soloPublicos: boolean = true): Observable<any> {
    const filters: any = { activos: '1' };
    if (soloPublicos) {
      filters.solo_publicos = '1';
    }
    return this.getComunicados(filters);
  }

  /**
   * Comunicados vigentes que deben mostrarse como modal emergente en todas las pantallas.
   */
  getComunicadosParaModal(): Observable<any> {
    return this.getComunicados({
      activos: '1',
      solo_publicos: '1',
      para_modal: '1'
    });
  }

  /**
   * Get a specific comunicado by ID
   */
  getComunicado(id: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Create a new comunicado
   */
  createComunicado(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update an existing comunicado
   */
  updateComunicado(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete a comunicado
   */
  deleteComunicado(id: number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Toggle anclar/desanclar
   */
  toggleAnclar(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/anclar`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Enviar comunicado como toast en tiempo real a todos los terminales conectados.
   */
  mostrarEnLinea(id: number): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/mostrar-en-linea`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('ComunicadosService error:', error);

    let errorMessage = 'Ha ocurrido un error inesperado';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    return throwError(() => errorMessage);
  }
}
