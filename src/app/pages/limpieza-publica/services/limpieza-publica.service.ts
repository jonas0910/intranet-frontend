import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class LimpiezaPublicaService {
    private apiUrl = `${environment.apiUrl}/v1/limpieza-publica`;

    constructor(private http: HttpClient) { }

    // ── Dashboard ──────────────────────────────────────────────────────────
    getDashboardResumen(fecha?: string): Observable<any> {
        let params = new HttpParams();
        if (fecha) params = params.set('fecha', fecha);
        return this.http.get(`${this.apiUrl}/dashboard/resumen`, { params });
    }

    // ── Monitoreo y Ubicación GPS ──────────────────────────────────────────
    getUbicacionesPersonal(): Observable<any> {
        return this.http.get(`${this.apiUrl}/personal-ubicacion`);
    }

    getHistorialUbicacion(personalId: number, perPage: number = 50): Observable<any> {
        return this.http.get(`${this.apiUrl}/personal-ubicacion/${personalId}/historial`, {
            params: new HttpParams().set('per_page', perPage.toString())
        });
    }

    // ── Alertas ────────────────────────────────────────────────────────────
    getAlertas(filtros: any = {}): Observable<any> {
        let params = new HttpParams();
        Object.keys(filtros).forEach(key => {
            if (filtros[key]) params = params.set(key, filtros[key]);
        });
        return this.http.get(`${this.apiUrl}/alertas`, { params });
    }

    marcarAlertaLeida(id: number): Observable<any> {
        return this.http.patch(`${this.apiUrl}/alertas/${id}/marcar-leida`, {});
    }

    resolverAlerta(id: number, datos: { observacion: string, crear_ocurrencia?: boolean }): Observable<any> {
        return this.http.patch(`${this.apiUrl}/alertas/${id}/resolver`, datos);
    }

    rechazarAlerta(id: number, datos: { observacion: string }): Observable<any> {
        return this.http.patch(`${this.apiUrl}/alertas/${id}/rechazar`, datos);
    }

    // --- Tipos de Alerta (CRUD Catálogo) ---
    getTiposAlerta(): Observable<any> {
        return this.http.get(`${this.apiUrl}/catalogos/all`);
    }

    createTipoAlerta(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/catalogos/tipo_alerta`, data);
    }

    updateTipoAlerta(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/catalogos/tipo_alerta/${id}`, data);
    }

    eliminarTipoAlerta(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/catalogos/tipo_alerta/${id}`);
    }

    // ── Rutas ──────────────────────────────────────────────────────────────
    getRutas(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.apiUrl}/rutas`, { params: httpParams });
    }

    getRuta(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/rutas/${id}`);
    }

    createRuta(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/rutas`, data);
    }

    updateRuta(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/rutas/${id}`, data);
    }

    eliminarRuta(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rutas/${id}`);
    }

    // ── Asignaciones de Ruta ──────────────────────────────────────────────
    getAsignacionesRuta(id_ruta: number, fecha?: string): Observable<any> {
        let params = new HttpParams();
        if (fecha) params = params.set('fecha', fecha);
        return this.http.get(`${this.apiUrl}/rutas/${id_ruta}/asignaciones`, { params });
    }

    getRutasPorPersonal(id_personal: number, params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        if (params.fecha_desde) httpParams = httpParams.set('fecha_desde', params.fecha_desde);
        if (params.fecha_hasta) httpParams = httpParams.set('fecha_hasta', params.fecha_hasta);
        return this.http.get(`${this.apiUrl}/rutas/personal/${id_personal}`, { params: httpParams });
    }

    asignarPersonalARuta(data: { id_ruta: number, id_personal: number, fecha: string, turno?: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/rutas/asignar-personal`, data);
    }

    asignarVehiculoARutaNueva(data: { id_ruta: number, id_vehiculo: number, fecha: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/rutas/asignar-vehiculo`, data);
    }

    eliminarAsignacionPersonal(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rutas/asignacion-personal/${id}`);
    }

    eliminarAsignacionVehiculo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/rutas/asignacion-vehiculo/${id}`);
    }

    // ── Tipos de Mantenimiento ────────────────────────────────────────────
    getTiposMantenimiento(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.apiUrl}/tipos-mantenimiento`, { params: httpParams });
    }

    createTipoMantenimiento(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/tipos-mantenimiento`, data);
    }

    updateTipoMantenimiento(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/tipos-mantenimiento/${id}`, data);
    }

    eliminarTipoMantenimiento(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/tipos-mantenimiento/${id}`);
    }

    // ── Vehículos ─────────────────────────────────────────────────────────
    getVehiculos(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.apiUrl}/vehiculos`, { params: httpParams });
    }

    createVehiculo(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/vehiculos`, data);
    }

    updateVehiculo(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/vehiculos/${id}`, data);
    }

    eliminarVehiculo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/vehiculos/${id}`);
    }

    asignarVehiculoARuta(data: { id_vehiculo: number, id_ruta: number, fecha: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/vehiculos/asignar-ruta`, data);
    }

    // ── Recolección ────────────────────────────────────────────────────────
    getRecolecciones(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.apiUrl}/recoleccion`, { params: httpParams });
    }

    registrarRecoleccion(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/recoleccion`, data);
    }

    updateRecoleccion(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/recoleccion/${id}`, data);
    }

    eliminarRecoleccion(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/recoleccion/${id}`);
    }

    // ── Catálogos ──────────────────────────────────────────────────────────
    getCatalogos(): Observable<any> {
        return this.http.get(`${this.apiUrl}/catalogos/all`);
    }

    // ── Elementos Urbanos ──────────────────────────────────────────────────
    getElementosUrbanos(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                httpParams = httpParams.set(key, params[key]);
            }
        });
        return this.http.get(`${this.apiUrl}/elementos-urbanos`, { params: httpParams });
    }

    createElementoUrbano(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/elementos-urbanos`, data);
    }

    updateElementoUrbano(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/elementos-urbanos/${id}`, data);
    }

    eliminarElementoUrbano(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/elementos-urbanos/${id}`);
    }

    // ── Tipos de Elemento Urbano (Catálogos) ──────────────────────────────
    getTiposElemento(): Observable<any> {
        return this.http.get(`${this.apiUrl}/catalogos/all`);
    }

    createTipoElemento(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/catalogos/tipo_elemento`, data);
    }

    updateTipoElemento(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/catalogos/tipo_elemento/${id}`, data);
    }

    eliminarTipoElemento(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/catalogos/tipo_elemento/${id}`);
    }

    // ── Sectores ──────────────────────────────────────────────────────────
    getSectores(): Observable<any> {
        return this.http.get(`${environment.apiUrl}/v1/censo-poblacional/sectores`);
    }

    // ── Campañas de Limpieza ────────────────────────────────────────────────
    getCampanas(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
                httpParams = httpParams.set(key, params[key]);
            }
        });
        return this.http.get(`${this.apiUrl}/campanas`, { params: httpParams });
    }

    getCampana(id: number): Observable<any> {
        return this.http.get(`${this.apiUrl}/campanas/${id}`);
    }

    createCampana(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/campanas`, data);
    }

    updateCampana(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/campanas/${id}`, data);
    }

    eliminarCampana(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/campanas/${id}`);
    }

    getParticipantesCampana(idCampana: number, params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key]) httpParams = httpParams.set(key, params[key]);
        });
        return this.http.get(`${this.apiUrl}/campanas/${idCampana}/participantes`, { params: httpParams });
    }

    agregarParticipante(idCampana: number, datos: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/campanas/${idCampana}/participantes`, datos);
    }

    quitarParticipante(idCampana: number, idParticipante: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/campanas/${idCampana}/participantes/${idParticipante}`);
    }

    // ── Catálogos de Residuos (CRUD) ──────────────────────────────────────
    getTiposResiduo(): Observable<any> {
        return this.http.get(`${this.apiUrl}/catalogos/all`);
    }

    createTipoResiduo(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/catalogos/tipo_residuo`, data);
    }

    updateTipoResiduo(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/catalogos/tipo_residuo/${id}`, data);
    }

    eliminarTipoResiduo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/catalogos/tipo_residuo/${id}`);
    }

    getOrigenesResiduo(): Observable<any> {
        return this.http.get(`${this.apiUrl}/catalogos/all`);
    }

    createOrigenResiduo(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/catalogos/origen_residuo`, data);
    }

    updateOrigenResiduo(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/catalogos/origen_residuo/${id}`, data);
    }

    eliminarOrigenResiduo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/catalogos/origen_residuo/${id}`);
    }

    buscarCiudadanos(q: string): Observable<any> {
        return this.http.get(`${this.apiUrl}/campanas/ciudadanos/buscar`, {
            params: new HttpParams().set('q', q)
        });
    }

    // ── Registro de Trabajo ──────────────────────────────────────────────
    getRegistrosTrabajo(params: any = {}): Observable<any> {
        let httpParams = new HttpParams();
        Object.keys(params).forEach(key => {
            if (params[key] !== null && params[key] !== undefined) {
                httpParams = httpParams.set(key, params[key]);
            }
        });
        return this.http.get(`${this.apiUrl}/registro-trabajo`, { params: httpParams });
    }

    createRegistroTrabajo(data: any): Observable<any> {
        return this.http.post(`${this.apiUrl}/registro-trabajo`, data);
    }

    updateRegistroTrabajo(id: number, data: any): Observable<any> {
        return this.http.put(`${this.apiUrl}/registro-trabajo/${id}`, data);
    }

    eliminarRegistroTrabajo(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/registro-trabajo/${id}`);
    }
}
