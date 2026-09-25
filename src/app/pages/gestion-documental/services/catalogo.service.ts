import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Area, TipoDocumento, Usuario, ApiResponse } from '../models/documento.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogoService {
  private readonly apiUrl = `${environment.apiUrl}/gestion-documental/catalogo`;

  constructor(private http: HttpClient) {}

  /**
   * Obtener listado de áreas activas
   */
  obtenerAreas(): Observable<Area[]> {
    return this.http.get<ApiResponse<Area[]>>(`${this.apiUrl}/areas`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener listado de tipos de documento activos
   */
  obtenerTiposDocumento(): Observable<TipoDocumento[]> {
    return this.http.get<ApiResponse<TipoDocumento[]>>(`${this.apiUrl}/tipos-documento`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener clasificaciones disponibles
   */
  obtenerClasificaciones(): Observable<Array<{ value: string; label: string }>> {
    return this.http.get<ApiResponse<Array<{ value: string; label: string }>>>(`${this.apiUrl}/clasificaciones`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener estados de documento
   */
  obtenerEstados(): Observable<Array<{ value: string; label: string }>> {
    return this.http.get<ApiResponse<Array<{ value: string; label: string }>>>(`${this.apiUrl}/estados`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener prioridades de derivación
   */
  obtenerPrioridades(): Observable<Array<{ value: string; label: string }>> {
    return this.http.get<ApiResponse<Array<{ value: string; label: string }>>>(`${this.apiUrl}/prioridades`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener tipos de periodo para cierres
   */
  obtenerTiposPeriodo(): Observable<Array<{ value: string; label: string }>> {
    return this.http.get<ApiResponse<Array<{ value: string; label: string }>>>(`${this.apiUrl}/tipos-periodo`)
      .pipe(map(response => response.data || []));
  }

  /**
   * Obtener listado de usuarios activos de la intranet
   */
  obtenerUsuarios(): Observable<Usuario[]> {
    return this.http.get<ApiResponse<Usuario[]>>(`${this.apiUrl}/usuarios`)
      .pipe(map(response => response.data || []));
  }

  // Carpetas API
  listarCarpetas(areaId?: number, parentId?: number | null) {
    let url = `${environment.apiUrl}/gestion-documental/carpetas`;
    const params: string[] = [];
    if (areaId) params.push(`area_id=${areaId}`);
    // Solo enviar parent_id cuando NO es null ni undefined; null implica raíz
    if (parentId !== undefined && parentId !== null) params.push(`parent_id=${parentId}`);
    if (params.length) url += `?${params.join('&')}`;
    return this.http.get<ApiResponse<any[]>>(url).pipe(map(r => r.data || []));
  }

  crearCarpeta(nombre: string, parentId?: number | null, areaId?: number | null) {
    return this.http.post<ApiResponse<any>>(`${environment.apiUrl}/gestion-documental/carpetas`, {
      nombre,
      parent_id: parentId ?? null,
      area_id: areaId ?? null
    });
  }

  renombrarCarpeta(carpetaId: number, nombre: string) {
    return this.http.put<ApiResponse<any>>(`${environment.apiUrl}/gestion-documental/carpetas/${carpetaId}`, { nombre });
  }

  eliminarCarpeta(carpetaId: number) {
    return this.http.delete<ApiResponse<any>>(`${environment.apiUrl}/gestion-documental/carpetas/${carpetaId}`);
  }
}

