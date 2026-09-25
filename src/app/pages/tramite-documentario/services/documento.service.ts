import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface TramiteFiltros {
  estado?: string;
  buscar?: string;
  vista?: string;
  area_id?: number;
  area_actual_id?: number;
  pendiente_recepcion?: boolean;
  tipo_tramite_id?: number;
  prioridad?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

@Injectable({ providedIn: 'root' })
export class TramiteService {
  private apiUrl = `${environment.apiUrl}/tramite-documentario`;

  constructor(private http: HttpClient) {}

  // Catálogos. areasSoloAsignadas=true: solo departamentos asignados al usuario (para bandejas)
  getCatalogos(areasSoloAsignadas = false): Observable<any> {
    let params = new HttpParams();
    if (areasSoloAsignadas) params = params.set('areas_solo_asignadas', '1');
    return this.http.get<any>(`${this.apiUrl}/catalogos`, { params });
  }

  getMeta(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/meta`);
  }

  // Dashboard
  getResumen(areaId?: number): Observable<any> {
    let params = new HttpParams();
    if (areaId) params = params.set('area_id', areaId.toString());
    return this.http.get<any>(`${this.apiUrl}/resumen`, { params });
  }

  // Trámites
  listar(filtros: TramiteFiltros = {}): Observable<any> {
    let params = new HttpParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });
    return this.http.get<any>(`${this.apiUrl}/tramites`, { params });
  }

  obtener(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tramites/${id}`);
  }

  crear(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites`, datos);
  }

  actualizar(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tramites/${id}`, datos);
  }

  previewNumero(areaId: number, tipoDocumento: string, nombreRegistrador?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/preview-numero`, {
      area_id: areaId,
      tipo_documento: tipoDocumento,
      nombre_registrador: nombreRegistrador || ''
    });
  }

  // Workflow
  derivar(id: number, areaDestinoId: number, observacion?: string, areasCopia?: number[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/derivar`, {
      area_destino_id: areaDestinoId,
      observacion,
      areas_copia: areasCopia || []
    });
  }

  recibir(id: number, areaRecibeId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/recibir`, { area_recibe_id: areaRecibeId });
  }

  rechazar(id: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/rechazar`, { motivo });
  }

  recuperar(id: number, areaUsuarioId: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/recuperar`, { area_usuario_id: areaUsuarioId, motivo });
  }

  archivar(id: number, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/archivar`, { motivo });
  }

  desarchivar(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/desarchivar`, {});
  }

  atender(id: number, datos?: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/atender`, datos || {});
  }

  rechazarDefinitivo(id: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/rechazar-definitivo`, { motivo });
  }

  retornarBandeja(id: number, areaUsuarioId: number, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/retornar-bandeja`, { area_usuario_id: areaUsuarioId, motivo });
  }

  retornarEstadoInicial(id: number, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/retornar-estado-inicial`, { motivo });
  }

  // Copias
  enviarCopias(id: number, areasCopia: number[], observacion?: string, areaOrigenId?: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/copias`, {
      areas_copia: areasCopia,
      observacion,
      area_origen_id: areaOrigenId
    });
  }

  recibirCopia(copiaId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/copias/${copiaId}/recibir`, {});
  }

  // Comentarios
  agregarComentario(id: number, texto: string, visibleCiudadano: boolean = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/comentario`, { texto, visible_ciudadano: visibleCiudadano });
  }

  // Documentos
  subirDocumento(id: number, archivo: File, nombre?: string): Observable<any> {
    const formData = new FormData();
    formData.append('archivo', archivo);
    if (nombre) formData.append('nombre', nombre);
    return this.http.post<any>(`${this.apiUrl}/tramites/${id}/documentos`, formData);
  }

  descargarDocumento(tramiteId: number, docId: number): string {
    return `${this.apiUrl}/tramites/${tramiteId}/documentos/${docId}/descargar`;
  }

  eliminarDocumento(tramiteId: number, docId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tramites/${tramiteId}/documentos/${docId}`);
  }

  // Trazabilidad
  getTrazabilidad(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tramites/${id}/trazabilidad`);
  }

  // Admin: Áreas
  getAreas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas`);
  }

  getArbol(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/arbol`);
  }

  getArbolPlano(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/arbol-plano`);
  }

  moverArea(areaId: number, parentId: number | null, orden: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/areas/${areaId}/mover`, { parent_id: parentId, orden });
  }

  getUsuariosDisponibles(areaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/${areaId}/usuarios-disponibles`);
  }


  getArea(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/${id}`);
  }

  crearArea(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/areas`, datos);
  }

  actualizarArea(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/areas/${id}`, datos);
  }

  eliminarArea(id: number, confirmarExpedientes = false): Observable<any> {
    let url = `${this.apiUrl}/areas/${id}`;
    if (confirmarExpedientes) {
      url += '?confirmar_eliminar_con_expedientes=1';
    }
    return this.http.delete<any>(url);
  }

  getUsuariosArea(areaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/areas/${areaId}/usuarios`);
  }

  asignarUsuarioArea(areaId: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/areas/${areaId}/usuarios`, datos);
  }

  actualizarUsuarioArea(areaId: number, userId: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/areas/${areaId}/usuarios/${userId}`, datos);
  }

  desasignarUsuarioArea(areaId: number, userId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/areas/${areaId}/usuarios/${userId}`);
  }

  establecerMesaPartes(areaId: number, esMesa = true): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/areas/${areaId}/mesa-partes`, { es_mesa_partes: esMesa });
  }

  // Admin: Tipos de Trámite
  getTipos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tipos`);
  }

  getTipo(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tipos/${id}`);
  }

  crearTipo(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tipos`, datos);
  }

  actualizarTipo(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/tipos/${id}`, datos);
  }

  eliminarTipo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tipos/${id}`);
  }

  // Consulta pública
  consultaPublica(codigo: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/publico/consultar/${codigo}`);
  }
}
