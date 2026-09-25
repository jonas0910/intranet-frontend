import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeBaseService {
  private baseUrl = `${environment.apiUrl}/helpdesk/kb`;

  constructor(private http: HttpClient) {}

  getCategorias(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/categorias`).pipe(catchError(this.handleError));
  }

  getArticulos(params: { categoria_id?: number; q?: string; per_page?: number; page?: number } = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });
    return this.http.get<any>(`${this.baseUrl}/articulos`, { params: httpParams }).pipe(catchError(this.handleError));
  }

  getArticulo(idOrSlug: string, categoriaId?: number): Observable<any> {
    let params = new HttpParams();
    if (categoriaId != null) {
      params = params.set('categoria_id', String(categoriaId));
    }
    return this.http.get<any>(`${this.baseUrl}/articulos/${encodeURIComponent(idOrSlug)}`, { params }).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    const msg = error?.error?.message || error?.message || 'Error en la base de conocimientos';
    return throwError(() => new Error(msg));
  }
}
