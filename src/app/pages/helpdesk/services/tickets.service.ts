import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, from } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TicketsService {
  private baseUrl = `${environment.apiUrl}/helpdesk/tickets`;

  constructor(private http: HttpClient) {}

  getTickets(params: { estado?: string; prioridad?: string; categoria?: string; per_page?: number; page?: number } = {}): Observable<any> {
    let httpParams = new HttpParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null && v !== '') {
        httpParams = httpParams.set(k, String(v));
      }
    });
    return this.http.get<any>(this.baseUrl, { params: httpParams }).pipe(catchError(this.handleError));
  }

  getTicket(id: string | number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${id}`).pipe(catchError(this.handleError));
  }

  createTicket(data: {
    titulo: string;
    descripcion: string;
    prioridad?: string;
    categoria?: string;
    departamento_id?: number;
    asignado_a?: number | null;
    fecha_limite?: string | null;
    /** Imágenes/archivos como Base64 (evita multipart). */
    archivos_base64?: { nombre: string; data: string }[];
  }): Observable<any> {
    return this.http.post<any>(this.baseUrl, data).pipe(catchError(this.handleError));
  }

  /**
   * Crear ticket con adjuntos. Usa fetch nativo para evitar que HttpClient/interceptor
   * altere el multipart y pierda los archivos.
   */
  createTicketWithAttachments(formData: FormData): Observable<any> {
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return from(
      fetch(this.baseUrl, { method: 'POST', body: formData, headers })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data?.message || data?.error || res.statusText);
          return data;
        })
    ).pipe(catchError(this.handleError));
  }

  updateTicket(
    id: string | number,
    data: Partial<{
      titulo: string;
      descripcion: string;
      prioridad: string;
      categoria: string;
      departamento_id: number;
      asignado_a: number | null;
      fecha_limite: string | null;
      adjuntos_eliminar: string[];
      archivos_base64: { nombre: string; data: string }[];
    }>
  ): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, data).pipe(catchError(this.handleError));
  }

  /**
   * Actualizar ticket con adjuntos: FormData con titulo, descripcion, prioridad, categoria,
   * archivos[] (nuevos), adjuntos_eliminar[] (paths a borrar del disco).
   */
  updateTicketWithAttachments(id: string | number, formData: FormData): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/${id}`, formData).pipe(catchError(this.handleError));
  }

  deleteTicket(id: string | number): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/${id}`).pipe(catchError(this.handleError));
  }

  asignar(id: string | number, asignado_a: number | null): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/asignar`, { asignado_a }).pipe(catchError(this.handleError));
  }

  agregarComentario(id: string | number, comentario: string, es_interno?: boolean): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/comentario`, { comentario, es_interno: !!es_interno }).pipe(catchError(this.handleError));
  }

  /**
   * Respuesta al ticket con JSON + Base64 (mismo criterio que crear ticket; evita multipart).
   */
  agregarComentarioCompleto(
    id: string | number,
    body: { comentario: string; es_interno?: boolean; archivos_base64?: { nombre: string; data: string }[] }
  ): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/comentario`, body).pipe(catchError(this.handleError));
  }

  /** @deprecated Preferir agregarComentarioCompleto (Base64). */
  agregarComentarioConAdjuntos(id: string | number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/${id}/comentario`, formData).pipe(catchError(this.handleError));
  }

  cambiarEstado(id: string | number, estado: string): Observable<any> {
    return this.http.patch<any>(`${this.baseUrl}/${id}/estado`, { estado }).pipe(catchError(this.handleError));
  }

  getPendientes(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/pendientes`).pipe(catchError(this.handleError));
  }

  /** Lista de usuarios para asignar tickets (colaboradores). */
  getUsuariosParaAsignar(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/usuarios`, { params: { per_page: '200' } }).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    const msg = error?.error?.message || error?.message || 'Error en el servicio de tickets';
    return throwError(() => new Error(msg));
  }
}
