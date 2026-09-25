import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  Activo,
  Categoria,
  Ubicacion,
  Movimiento,
  Depreciacion,
  Inventario,
  ApiResponse,
  PaginatedResponse
} from '../models/activo.model';

@Injectable({
  providedIn: 'root'
})
export class ActivoService {
  private readonly apiUrl = `${environment.apiUrl}/activos-fijos`;

  constructor(private http: HttpClient) { }

  // ==================== ACTIVOS ====================
  listarActivos(filtros?: any): Observable<PaginatedResponse<Activo>> {
    let params = new HttpParams();

    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }

    return this.http.get<PaginatedResponse<Activo>>(`${this.apiUrl}/activos`, { params });
  }

  /** Bienes patrimoniales asignados al usuario actual (solo visualización). */
  listarMisBienes(filtros?: any): Observable<PaginatedResponse<Activo>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<PaginatedResponse<Activo>>(`${this.apiUrl}/mis-bienes`, { params });
  }

  crearActivo(datos: Partial<Activo>): Observable<ApiResponse<Activo>> {
    return this.http.post<ApiResponse<Activo>>(`${this.apiUrl}/activos`, datos);
  }

  obtenerActivo(id: number): Observable<ApiResponse<Activo>> {
    return this.http.get<ApiResponse<Activo>>(`${this.apiUrl}/activos/${id}`);
  }

  actualizarActivo(id: number, datos: Partial<Activo>): Observable<ApiResponse<Activo>> {
    return this.http.put<ApiResponse<Activo>>(`${this.apiUrl}/activos/${id}`, datos);
  }

  eliminarActivo(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/activos/${id}`);
  }

  obtenerKardex(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/activos/${id}/kardex`);
  }

  generarEtiqueta(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/activos/${id}/etiqueta`);
  }

  subirImagenes(id: number, imagenes: File[]): Observable<ApiResponse<any>> {
    const formData = new FormData();
    imagenes.forEach((imagen, index) => {
      formData.append(`imagenes[${index}]`, imagen, imagen.name);
    });
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/activos/${id}/imagenes`, formData);
  }

  eliminarImagen(id: number, imagen: string): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/activos/${id}/imagenes`, {
      body: { imagen }
    });
  }

  // ==================== CATEGORÍAS ====================
  listarCategorias(): Observable<ApiResponse<Categoria[]>> {
    return this.http.get<ApiResponse<Categoria[]>>(`${this.apiUrl}/categorias`);
  }

  crearCategoria(datos: Partial<Categoria>): Observable<ApiResponse<Categoria>> {
    return this.http.post<ApiResponse<Categoria>>(`${this.apiUrl}/categorias`, datos);
  }

  actualizarCategoria(id: number, datos: Partial<Categoria>): Observable<ApiResponse<Categoria>> {
    return this.http.put<ApiResponse<Categoria>>(`${this.apiUrl}/categorias/${id}`, datos);
  }

  eliminarCategoria(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/categorias/${id}`);
  }

  // ==================== UBICACIONES ====================
  listarUbicaciones(): Observable<ApiResponse<Ubicacion[]>> {
    return this.http.get<ApiResponse<Ubicacion[]>>(`${this.apiUrl}/ubicaciones`);
  }

  crearUbicacion(datos: Partial<Ubicacion>): Observable<ApiResponse<Ubicacion>> {
    return this.http.post<ApiResponse<Ubicacion>>(`${this.apiUrl}/ubicaciones`, datos);
  }

  actualizarUbicacion(id: number, datos: Partial<Ubicacion>): Observable<ApiResponse<Ubicacion>> {
    return this.http.put<ApiResponse<Ubicacion>>(`${this.apiUrl}/ubicaciones/${id}`, datos);
  }

  eliminarUbicacion(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/ubicaciones/${id}`);
  }

  // ==================== MOVIMIENTOS ====================
  listarMovimientos(filtros?: any): Observable<PaginatedResponse<Movimiento>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params = params.set(key, value.toString());
      });
    }
    return this.http.get<PaginatedResponse<Movimiento>>(`${this.apiUrl}/movimientos`, { params });
  }

  registrarAlta(datos: any): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(`${this.apiUrl}/movimientos/alta`, datos);
  }

  registrarBaja(datos: any): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(`${this.apiUrl}/movimientos/baja`, datos);
  }

  registrarTransferencia(datos: any): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(`${this.apiUrl}/movimientos/transferencia`, datos);
  }

  crearMovimiento(datos: Partial<Movimiento>): Observable<ApiResponse<Movimiento>> {
    return this.http.post<ApiResponse<Movimiento>>(`${this.apiUrl}/movimientos`, datos);
  }

  actualizarMovimiento(id: number, datos: Partial<Movimiento>): Observable<ApiResponse<Movimiento>> {
    return this.http.put<ApiResponse<Movimiento>>(`${this.apiUrl}/movimientos/${id}`, datos);
  }

  eliminarMovimiento(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/movimientos/${id}`);
  }

  // ==================== DEPRECIACIÓN ====================
  calcularDepreciacion(ano: number, mes: number): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/depreciacion/calcular`, {
      periodo_ano: ano,
      periodo_mes: mes
    });
  }

  obtenerHistorialDepreciacion(activoId: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/depreciacion/historial`, {
      params: { activo_id: activoId.toString() }
    });
  }

  listarDepreciaciones(filtros?: any): Observable<PaginatedResponse<Depreciacion>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params = params.set(key, value.toString());
      });
    }
    return this.http.get<PaginatedResponse<Depreciacion>>(`${this.apiUrl}/depreciacion`, { params });
  }

  // ==================== INVENTARIO ====================
  listarInventarios(): Observable<PaginatedResponse<Inventario>> {
    return this.http.get<PaginatedResponse<Inventario>>(`${this.apiUrl}/inventario`);
  }

  obtenerInventario(id: number): Observable<ApiResponse<Inventario>> {
    return this.http.get<ApiResponse<Inventario>>(`${this.apiUrl}/inventario/${id}`);
  }

  crearInventario(datos: any): Observable<ApiResponse<Inventario>> {
    return this.http.post<ApiResponse<Inventario>>(`${this.apiUrl}/inventario`, datos);
  }

  actualizarInventario(id: number, datos: any): Observable<ApiResponse<Inventario>> {
    return this.http.put<ApiResponse<Inventario>>(`${this.apiUrl}/inventario/${id}`, datos);
  }

  escanearActivo(inventarioId: number, codigoQR: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/inventario/${inventarioId}/escanear`, {
      codigo_qr: codigoQR
    });
  }

  cerrarInventario(id: number): Observable<ApiResponse<Inventario>> {
    return this.http.put<ApiResponse<Inventario>>(`${this.apiUrl}/inventario/${id}/cerrar`, {});
  }

  obtenerConciliacion(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/inventario/${id}/conciliacion`);
  }

  sincronizarInventarioMasivo(id: number, codigos: string[], origen: string = 'web'): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/inventario/${id}/escanear-masivo`, {
      codigos,
      origen
    });
  }

  // ==================== TRASLADOS DE ACTIVOS ====================
  listarTraslados(filtros?: any): Observable<PaginatedResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    return this.http.get<PaginatedResponse<any>>(`${this.apiUrl}/traslados`, { params });
  }

  crearTraslado(datos: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/traslados`, datos);
  }

  obtenerTraslado(id: number): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/traslados/${id}`);
  }

  actualizarTraslado(id: number, datos: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/traslados/${id}`, datos);
  }

  agregarActivoTraslado(trasladoId: number, activoId: number, datos?: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/traslados/${trasladoId}/activos`, {
      activo_id: activoId,
      ...datos
    });
  }

  eliminarActivoTraslado(trasladoId: number, detalleId: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/traslados/${trasladoId}/activos/${detalleId}`);
  }

  aprobarTraslado(id: number, comentario: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/traslados/${id}/aprobar`, { comentario });
  }

  rechazarTraslado(id: number, comentario: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/traslados/${id}/rechazar`, { comentario });
  }

  completarTraslado(id: number): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/traslados/${id}/completar`, {});
  }

  listarUsuarios(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/usuarios`);
  }

  // ==================== REPORTES ====================
  reporteGeneral(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params = params.set(key, value.toString());
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/general`, { params });
  }

  reporteDashboard(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/dashboard`);
  }

  reporteSBN(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/sbn`);
  }

  reporteDepreciacion(filtros?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    if (filtros) {
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params = params.set(key, value.toString());
      });
    }
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/reportes/depreciacion`, { params });
  }
}

