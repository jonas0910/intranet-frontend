import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehiculoServicioService {
  private readonly apiUrl = `${environment.apiUrl}/activos-fijos/activos-servicio`;

  constructor(private http: HttpClient) { }

  /** Listar todos los activos del departamento */
  listarActivos(filtros?: any): Observable<any> {
    let params = new HttpParams();
    if (filtros) {
        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                params = params.set(key, value.toString());
            }
        });
    }
    return this.http.get<any>(this.apiUrl, { params });
  }

  /** Registrar vehículo (solo externa) */
  registrarVehiculo(datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/vehiculos`, datos);
  }

  /** Actualizar vehículo */
  actualizarVehiculo(id: number, datos: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/vehiculos/${id}`, datos);
  }

  /** Eliminar vehículo */
  eliminarVehiculo(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/vehiculos/${id}`);
  }

  /** Obtener categorías */
  listarCategorias(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/activos-fijos/categorias`);
  }


  /** MANTENIMIENTO: Tipos de mantenimiento activos (Reutiliza Equipo Mecánico) */
  listarTiposMantenimiento(): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/equipo-mecanico/tipos-mantenimiento/activos`);
  }

  /** MANTENIMIENTO: Controles programados de un activo */
  listarControlesMantenimiento(activoId: number): Observable<any> {
    const params = new HttpParams()
      .set('equipo_id', activoId.toString())
      .set('per_page', '100');
    return this.http.get<any>(`${environment.apiUrl}/equipo-mecanico/controles-mantenimiento`, { params });
  }

  /** Sincronizar programación (catálogo + planes personalizados km/horas/días); aplica a activos propios y externos del departamento */
  syncProgramacionMantenimiento(activoId: number, body: { controles_manuales: number[]; programacion_personalizada: ProgramacionPlanPersonalizado[] }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/vehiculos/${activoId}/programacion-mantenimiento`, body);
  }
}

/** Actividad a realizar o repuesto/elemento a cambiar en cada periodo del plan */
export interface PlanItemMantenimiento {
  tipo_item: 'actividad' | 'elemento_cambio';
  descripcion: string;
  cantidad?: number | null;
  unidad?: string | null;
}

export interface ProgramacionPlanPersonalizado {
  nombre: string;
  frecuencia_kilometros?: number | null;
  frecuencia_horas?: number | null;
  frecuencia_dias?: number | null;
  /** Actividades y elementos de cambio asociados a este nombre de mantenimiento */
  items?: PlanItemMantenimiento[];
}
