import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';

@Injectable({
    providedIn: 'root'
})
export class ComercializacionService {

    constructor(private api: ApiService) { }

    // Dashboard
    getDashboardStats(): Observable<any> {
        return this.api.get('comercializacion/dashboard/stats');
    }

    /** Reporte de totales: recibos pagados agrupados por áreas, conceptos, trámites. */
    getReporteTotales(filtros: { fecha_inicio?: string; fecha_fin?: string; concepto_id?: number | string; centro_costos_id?: string }): Observable<any> {
        const hoy = new Date().toISOString().split('T')[0];
        const params = new URLSearchParams();
        params.set('fecha_inicio', filtros.fecha_inicio || hoy);
        params.set('fecha_fin', filtros.fecha_fin || hoy);
        if (filtros.concepto_id) params.set('concepto_id', String(filtros.concepto_id));
        if (filtros.centro_costos_id) params.set('centro_costos_id', filtros.centro_costos_id);
        return this.api.get('comercializacion/recibos/reporte-totales?' + params.toString());
    }

    // Conceptos
    getConceptos(): Observable<any> {
        return this.api.get('comercializacion/conceptos');
    }
    getConcepto(id: number): Observable<any> {
        return this.api.get(`comercializacion/conceptos/${id}`);
    }
    createConcepto(data: any): Observable<any> {
        return this.api.post('comercializacion/conceptos', data);
    }
    updateConcepto(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/conceptos/${id}`, data);
    }
    deleteConcepto(id: number): Observable<any> {
        return this.api.delete(`comercializacion/conceptos/${id}`);
    }

    // Tramites
    getTramites(): Observable<any> {
        return this.api.get('comercializacion/tramites');
    }
    getTramite(id: number): Observable<any> {
        return this.api.get(`comercializacion/tramites/${id}`);
    }
    createTramite(data: any): Observable<any> {
        return this.api.post('comercializacion/tramites', data);
    }
    updateTramite(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/tramites/${id}`, data);
    }
    deleteTramite(id: number): Observable<any> {
        return this.api.delete(`comercializacion/tramites/${id}`);
    }

    // Padron
    getPadron(): Observable<any> {
        return this.api.get('comercializacion/padron');
    }
    getPadronItem(id: number): Observable<any> {
        return this.api.get(`comercializacion/padron/${id}`);
    }
    createPadron(data: any): Observable<any> {
        return this.api.post('comercializacion/padron', data);
    }
    updatePadron(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/padron/${id}`, data);
    }
    deletePadron(id: number): Observable<any> {
        return this.api.delete(`comercializacion/padron/${id}`);
    }
    getPadronHistorial(id: number): Observable<any> {
        return this.api.get(`comercializacion/padron/${id}/historial`);
    }

    // Sanciones
    getSanciones(): Observable<any> {
        return this.api.get('comercializacion/sanciones');
    }
    getSancion(id: number): Observable<any> {
        return this.api.get(`comercializacion/sanciones/${id}`);
    }
    createSancion(data: any): Observable<any> {
        return this.api.post('comercializacion/sanciones', data);
    }
    updateSancion(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/sanciones/${id}`, data);
    }
    deleteSancion(id: number): Observable<any> {
        return this.api.delete(`comercializacion/sanciones/${id}`);
    }

    // Inspecciones
    getInspecciones(): Observable<any> {
        return this.api.get('comercializacion/inspecciones');
    }
    getInspeccion(id: number): Observable<any> {
        return this.api.get(`comercializacion/inspecciones/${id}`);
    }
    createInspeccion(data: any): Observable<any> {
        return this.api.post('comercializacion/inspecciones', data);
    }
    updateInspeccion(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/inspecciones/${id}`, data);
    }
    deleteInspeccion(id: number): Observable<any> {
        return this.api.delete(`comercializacion/inspecciones/${id}`);
    }

    // ITSE
    getItse(): Observable<any> {
        return this.api.get('comercializacion/itse');
    }
    getItseItem(id: number): Observable<any> {
        return this.api.get(`comercializacion/itse/${id}`);
    }
    createItse(data: any): Observable<any> {
        return this.api.post('comercializacion/itse', data);
    }
    updateItse(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/itse/${id}`, data);
    }
    deleteItse(id: number): Observable<any> {
        return this.api.delete(`comercializacion/itse/${id}`);
    }

    // Constancias y Ceses
    getConstancias(): Observable<any> {
        return this.api.get('comercializacion/constancias');
    }
    getConstancia(id: number): Observable<any> {
        return this.api.get(`comercializacion/constancias/${id}`);
    }
    createConstancia(data: any): Observable<any> {
        return this.api.post('comercializacion/constancias', data);
    }
    updateConstancia(id: number, data: any): Observable<any> {
        return this.api.put(`comercializacion/constancias/${id}`, data);
    }
    deleteConstancia(id: number): Observable<any> {
        return this.api.delete(`comercializacion/constancias/${id}`);
    }
}

