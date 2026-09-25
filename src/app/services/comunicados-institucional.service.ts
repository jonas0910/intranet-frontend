import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ModalMensaje {
  id: number;
  titulo: string;
  contenido?: string;
  imagen?: string;
  tipo_evento: string;
  prioridad: 'baja' | 'normal' | 'alta';
  fecha_inicio: string;
  fecha_fin: string;
  mostrar_una_vez: boolean;
  activo: boolean;
}

export interface CategoriaDocumento {
  id: number;
  nombre: string;
  slug: string;
  descripcion?: string;
  orden: number;
  documentos?: Documento[];
}

export interface Documento {
  id: number;
  titulo: string;
  descripcion?: string;
  categoria_id?: number;
  categoria?: CategoriaDocumento;
  tipo: string;
  archivo_path: string;
  archivo_nombre?: string;
  archivo_mime?: string;
  orden: number;
  activo: boolean;
}

@Injectable({ providedIn: 'root' })
export class ComunicadosInstitucionalService {
  private base = `${environment.apiUrl}/comunicados`;

  constructor(private http: HttpClient) {}

  /** Mensajes modales vigentes (para mostrar al login) */
  getModalesActivos(): Observable<{ success: boolean; data: ModalMensaje[] }> {
    return this.http.get<{ success: boolean; data: ModalMensaje[] }>(`${this.base}/modales/activos`);
  }

  /** CRUD Modales */
  getModales(params?: { activo?: boolean; tipo_evento?: string }): Observable<{ success: boolean; data: any }> {
    let url = `${this.base}/modales`;
    if (params) {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, String(v)); });
      const q = p.toString();
      if (q) url += '?' + q;
    }
    return this.http.get<any>(url);
  }
  getModal(id: number): Observable<{ success: boolean; data: ModalMensaje }> {
    return this.http.get<any>(`${this.base}/modales/${id}`);
  }
  createModal(data: Partial<ModalMensaje>): Observable<{ success: boolean; data: ModalMensaje }> {
    return this.http.post<any>(`${this.base}/modales`, data);
  }
  updateModal(id: number, data: Partial<ModalMensaje>): Observable<{ success: boolean; data: ModalMensaje }> {
    return this.http.put<any>(`${this.base}/modales/${id}`, data);
  }
  deleteModal(id: number): Observable<{ success: boolean }> {
    return this.http.delete<any>(`${this.base}/modales/${id}`);
  }

  /** Categorías documento */
  getCategorias(soloActivos = true): Observable<{ success: boolean; data: CategoriaDocumento[] }> {
    const q = soloActivos ? '?solo_activos=1' : '';
    return this.http.get<any>(`${this.base}/categorias-documento${q}`);
  }
  createCategoria(data: Partial<CategoriaDocumento>): Observable<{ success: boolean; data: CategoriaDocumento }> {
    return this.http.post<any>(`${this.base}/categorias-documento`, data);
  }
  updateCategoria(id: number, data: Partial<CategoriaDocumento>): Observable<any> {
    return this.http.put<any>(`${this.base}/categorias-documento/${id}`, data);
  }
  deleteCategoria(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/categorias-documento/${id}`);
  }

  /** Documentos */
  getDocumentos(params?: { categoria_id?: number; solo_activos?: boolean; tipo?: string }): Observable<{ success: boolean; data: Documento[] }> {
    let url = `${this.base}/documentos`;
    if (params) {
      const p = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v != null) p.set(k, String(v)); });
      const q = p.toString();
      if (q) url += '?' + q;
    }
    return this.http.get<any>(url);
  }
  getDocumento(id: number): Observable<{ success: boolean; data: Documento }> {
    return this.http.get<any>(`${this.base}/documentos/${id}`);
  }
  createDocumento(formData: FormData): Observable<{ success: boolean; data: Documento }> {
    return this.http.post<any>(`${this.base}/documentos`, formData);
  }
  updateDocumento(id: number, data: FormData | Partial<Documento>): Observable<any> {
    if (data instanceof FormData) {
      return this.http.post<any>(`${this.base}/documentos/${id}`, data);
    }
    return this.http.put<any>(`${this.base}/documentos/${id}`, data);
  }
  deleteDocumento(id: number): Observable<any> {
    return this.http.delete<any>(`${this.base}/documentos/${id}`);
  }
  /** Descargar documento (usa token de auth) */
  descargarDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.base}/documentos/${id}/descargar`, {
      responseType: 'blob',
    });
  }
}
