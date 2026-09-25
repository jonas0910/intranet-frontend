import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Documento,
  ApiResponse,
  PaginatedResponse,
  DocumentoFiltros,
  Version,
  Derivacion,
  DocumentoCompartido
} from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class DocumentoService {
  private readonly apiUrl = `${environment.apiUrl}/gestion-documental/documentos`;

  constructor(private http: HttpClient) {}

  /**
   * Listar documentos con filtros
   */
  listar(filtros?: DocumentoFiltros): Observable<PaginatedResponse<Documento>> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Documento>>(this.apiUrl, { params });
  }

  /**
   * Obtener documento por ID
   */
  obtener(id: number): Observable<ApiResponse<Documento>> {
    return this.http.get<ApiResponse<Documento>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Crear nuevo documento
   */
  crear(formData: FormData): Observable<ApiResponse<Documento>> {
    return this.http.post<ApiResponse<Documento>>(this.apiUrl, formData);
  }

  /**
   * Actualizar documento
   */
  actualizar(id: number, datos: Partial<Documento>): Observable<ApiResponse<Documento>> {
    return this.http.put<ApiResponse<Documento>>(`${this.apiUrl}/${id}`, datos);
  }

  /**
   * Eliminar documento
   */
  eliminar(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Descargar documento
   */
  descargar(id: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${id}/descargar`, {
      responseType: 'blob'
    });
  }

  /**
   * Derivar documento
   */
  derivar(id: number, datos: any): Observable<ApiResponse<Derivacion>> {
    return this.http.post<ApiResponse<Derivacion>>(`${this.apiUrl}/${id}/derivar`, datos);
  }

  /**
   * Mover documento a carpeta
   */
  mover(id: number, carpetaId: number | null): Observable<ApiResponse<any>> {
    const base = this.apiUrl.replace('/documentos', '');
    return this.http.post<ApiResponse<any>>(`${base}/documentos/${id}/mover`, { carpeta_id: carpetaId });
  }

  /**
   * Listar versiones del documento
   */
  listarVersiones(documentoId: number): Observable<ApiResponse<Version[]>> {
    return this.http.get<ApiResponse<Version[]>>(`${this.apiUrl}/${documentoId}/versiones`);
  }

  /**
   * Crear nueva versión
   */
  crearVersion(documentoId: number, formData: FormData): Observable<ApiResponse<Version>> {
    return this.http.post<ApiResponse<Version>>(
      `${this.apiUrl}/${documentoId}/versiones`,
      formData
    );
  }

  /**
   * Firmar documento
   */
  firmar(documentoId: number, datos?: any): Observable<ApiResponse<Documento>> {
    return this.http.post<ApiResponse<Documento>>(
      `${this.apiUrl}/${documentoId}/firma`,
      datos || {}
    );
  }

  /**
   * Verificar firma digital
   */
  verificarFirma(documentoId: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/${documentoId}/firma/verificar`,
      {}
    );
  }

  /**
   * Compartir documento con un usuario
   */
  compartir(documentoId: number, usuarioId: number, permiso: string = 'solo-lectura', mensaje?: string): Observable<ApiResponse<DocumentoCompartido>> {
    return this.http.post<ApiResponse<DocumentoCompartido>>(
      `${this.apiUrl}/${documentoId}/compartir`,
      {
        usuario_id: usuarioId,
        atributos: {
          permiso: permiso,
          mensaje: mensaje
        }
      }
    );
  }

  /**
   * Obtener lista de usuarios con quienes se compartió el documento
   */
  obtenerCompartidos(documentoId: number): Observable<ApiResponse<DocumentoCompartido[]>> {
    return this.http.get<ApiResponse<DocumentoCompartido[]>>(
      `${this.apiUrl}/${documentoId}/compartidos`
    );
  }

  /**
   * Cambiar estado de bloqueo del documento
   */
  toggleBloqueo(documentoId: number): Observable<ApiResponse<Documento>> {
    return this.http.put<ApiResponse<Documento>>(
      `${this.apiUrl}/${documentoId}/toggle-bloqueo`,
      {}
    );
  }

  /**
   * Listar documentos compartidos conmigo
   */
  listarCompartidosConmigo(filtros?: any): Observable<any> {
    let params = new HttpParams();
    
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    const baseUrl = this.apiUrl.replace('/documentos', '');
    return this.http.get(`${baseUrl}/compartidos-conmigo`, { params });
  }
}

