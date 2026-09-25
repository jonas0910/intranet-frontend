import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AsesoriaLegalService {
  private apiUrl = `${environment.apiUrl}/asesoria-legal`;

  constructor(private http: HttpClient) {}

  getCatalogos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/catalogos`);
  }

  getBuzon(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/buzon`);
  }

  crearCasoDesdeTramite(tramiteId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/buzon/crear-caso/${tramiteId}`, {});
  }

  getSolicitudes(filtros?: { estado?: string; abogado_id?: number }): Observable<any> {
    let params = new HttpParams();
    if (filtros?.estado) params = params.set('estado', filtros.estado);
    if (filtros?.abogado_id) params = params.set('abogado_id', filtros.abogado_id.toString());
    return this.http.get<any>(`${this.apiUrl}/solicitudes`, { params });
  }

  getSolicitud(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/solicitudes/${id}`);
  }

  crearSolicitud(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes`, data);
  }

  asignar(solicitudId: number, abogadoId: number, fechaLimite: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/asignar`, { abogado_id: abogadoId, fecha_limite: fechaLimite });
  }

  crearVersion(solicitudId: number, contenidoHtml: string, estado?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/versiones`, { contenido_html: contenidoHtml, estado_version: estado });
  }

  enviarRevision(solicitudId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/enviar-revision`, {});
  }

  aprobar(solicitudId: number, versionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/aprobar/${versionId}`, {});
  }

  observar(solicitudId: number, versionId: number, comentarios: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/observar/${versionId}`, { comentarios_revision: comentarios });
  }

  registrarActo(solicitudId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/registrar-acto`, data);
  }

  updateInformeEmitido(solicitudId: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/solicitudes/${solicitudId}/informe-emitido`, data);
  }

  uploadPdfInforme(solicitudId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('pdf', file);
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/informe-emitido/pdf`, formData);
  }

  registrarGlosa(solicitudId: number, data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/solicitudes/${solicitudId}/glosa`, data);
  }

  getAbogados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/abogados`);
  }

  getUsuariosParaAbogados(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/abogados/usuarios-disponibles`);
  }

  crearAbogado(userId: number, esJefeLegal: boolean): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/abogados`, { user_id: userId, es_jefe_legal: esJefeLegal });
  }

  actualizarAbogado(id: number, data: { es_jefe_legal?: boolean; activo?: boolean }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/abogados/${id}`, data);
  }

  // Base de Conocimiento: Jurisprudencia
  getJurisprudencia(filtros?: { q?: string; tipo?: string }): Observable<any> {
    let params = new HttpParams();
    if (filtros?.q) params = params.set('q', filtros.q);
    if (filtros?.tipo) params = params.set('tipo', filtros.tipo);
    return this.http.get<any>(`${this.apiUrl}/jurisprudencia`, { params });
  }

  getJurisprudenciaTipos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/jurisprudencia/tipos`);
  }

  getJurisprudenciaById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/jurisprudencia/${id}`);
  }

  crearJurisprudencia(data: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/jurisprudencia`, data);
  }

  actualizarJurisprudencia(id: number, data: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/jurisprudencia/${id}`, data);
  }

  eliminarJurisprudencia(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/jurisprudencia/${id}`);
  }

  getReportes(filtros?: { anio?: number; mes?: number }): Observable<any> {
    let params = new HttpParams();
    if (filtros?.anio) params = params.set('anio', filtros.anio.toString());
    if (filtros?.mes) params = params.set('mes', filtros.mes.toString());
    return this.http.get<any>(`${this.apiUrl}/reportes`, { params });
  }
}
