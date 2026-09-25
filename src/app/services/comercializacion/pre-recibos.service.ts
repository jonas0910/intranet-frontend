import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from '../api.service';
import { environment } from '../../../environments/environment';

export interface PreRecibo {
    id?: number;
    numero_correlativo?: string;
    numero_recibo?: string;
    contribuyente_id: string;
    centro_costos_id: string;
    fecha_emision: string;
    monto_total: number;
    estado?: string;
    observaciones?: string;
    created_at?: string;
}

@Injectable({
    providedIn: 'root'
})
export class PreReciboService {
    private apiUrl = `${environment.apiUrl}/comercializacion/prerecibos`;

    constructor(private api: ApiService, private http: HttpClient) { }

    getDataTablesUrl(): string {
        return `${this.apiUrl}/dt`;
    }

    /** URL DataTables para listado de recibos (tabla com_recibos, solo pagos). */
    getRecibosDataTablesUrl(): string {
        return `${environment.apiUrl}/comercializacion/recibos/dt`;
    }

    getReporteRecibosUrl(): string {
        return `${environment.apiUrl}/comercializacion/recibos/reporte`;
    }

    get(id: number): Observable<any> {
        return this.api.get(`comercializacion/prerecibos/${id}`);
    }

    create(data: PreRecibo): Observable<any> {
        return this.api.post('comercializacion/prerecibos', data);
    }

    update(id: number, data: Partial<PreRecibo>): Observable<any> {
        return this.api.put(`comercializacion/prerecibos/${id}`, data);
    }

    delete(id: number): Observable<any> {
        return this.api.delete(`comercializacion/prerecibos/${id}`);
    }

    pagar(id: number): Observable<any> {
        return this.api.post(`comercializacion/prerecibos/${id}/pagar`, {});
    }

    anularPago(id: number, motivo: string, tipo: 'ANULADO' | 'REEMBOLSADO'): Observable<any> {
        return this.api.post(`comercializacion/prerecibos/${id}/anular-pago`, { motivo, tipo });
    }

    getReporte(fechaInicio: string, fechaFin: string): Observable<any> {
        return this.api.get(`comercializacion/prerecibos/reporte?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
    }

    /** Reporte / cierre de caja desde tabla de recibos (solo pagos). */
    getReporteRecibos(fechaInicio: string, fechaFin: string): Observable<any> {
        return this.api.get(`comercializacion/recibos/reporte?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`);
    }

    /** Listar cierres de caja. */
    listarCierresCaja(): Observable<any> {
        return this.api.get('comercializacion/cierres-caja');
    }

    /** Guardar cierre de caja en BD. */
    guardarCierreCaja(data: { fecha_inicio: string; fecha_fin: string; total_recaudado: number; cantidad_recibos: number; observaciones?: string }): Observable<any> {
        return this.api.post('comercializacion/cierres-caja', data);
    }

    /** Eliminar cierre de caja (permite regenerar para ese rango). */
    eliminarCierreCaja(id: number): Observable<any> {
        return this.api.delete(`comercializacion/cierres-caja/${id}`);
    }

    /** POST para DataTables de recibos (usa HttpClient para pasar por interceptor de auth). */
    postRecibosDt(payload: any): Observable<any> {
        return this.http.post<any>(`${environment.apiUrl}/comercializacion/recibos/dt`, payload);
    }
}
