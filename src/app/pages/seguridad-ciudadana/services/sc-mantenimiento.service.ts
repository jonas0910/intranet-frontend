import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ScMantenimientoService {
  private readonly apiUrl = `${environment.apiUrl}/seguridad-ciudadana`;

  constructor(private http: HttpClient) {}

  // ── Mantenimientos ──────────────────────────────────────────────────────
  listarMantenimientos(filtros: any = {}, perPage: number = 15): Observable<any> {
    let params = new HttpParams().set('per_page', perPage.toString());
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });
    return this.http.get(`${this.apiUrl}/mantenimientos`, { params });
  }

  obtenerMantenimiento(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/mantenimientos/${id}`);
  }

  crearMantenimiento(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mantenimientos`, data);
  }

  actualizarMantenimiento(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/mantenimientos/${id}`, data);
  }

  eliminarMantenimiento(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/mantenimientos/${id}`);
  }

  completarMantenimiento(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/mantenimientos/${id}/completar`, data);
  }

  // ── Controles de Mantenimiento ──────────────────────────────────────────
  listarControles(filtros: any = {}, perPage: number = 15): Observable<any> {
    let params = new HttpParams().set('per_page', perPage.toString());
    Object.keys(filtros).forEach(key => {
      if (filtros[key] !== null && filtros[key] !== undefined && filtros[key] !== '') {
        params = params.set(key, filtros[key].toString());
      }
    });
    return this.http.get(`${this.apiUrl}/controles-mantenimiento`, { params });
  }

  obtenerAlertas(filtros: any = {}): Observable<any> {
    let params = new HttpParams();
    Object.keys(filtros).forEach(key => {
      if (filtros[key]) params = params.set(key, filtros[key]);
    });
    return this.http.get(`${this.apiUrl}/controles-mantenimiento/alertas`, { params });
  }

  obtenerEstadisticasControles(): Observable<any> {
    return this.http.get(`${this.apiUrl}/controles-mantenimiento/estadisticas`);
  }

  crearControl(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/controles-mantenimiento`, data);
  }

  actualizarControl(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/controles-mantenimiento/${id}`, data);
  }

  eliminarControl(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/controles-mantenimiento/${id}`);
  }

  marcarControlRealizado(id: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/controles-mantenimiento/${id}/marcar-realizado`, data);
  }

  generarControlesParaVehiculo(vehiculoId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/controles-mantenimiento/generar-equipo/${vehiculoId}`, {});
  }

  // ── Tipos de Mantenimiento Preventivo ──────────────────────────────────
  listarTiposMantenimiento(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tipos-mantenimiento`);
  }

  obtenerTiposActivos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/tipos-mantenimiento/activos`);
  }

  // ── Vehículos ──────────────────────────────────────────────────────────
  getVehiculos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/vehiculos?per_page=-1`);
  }
}
