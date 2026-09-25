import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject } from 'rxjs';

export interface ApiResponse<T> {
    success: boolean;
    message?: string;
    data: T;
    acta?: any;
}

@Injectable({
    providedIn: 'root'
})
export class AlmacenService {
    private apiUrl = `${environment.apiUrl}/v1/almacen`;
    private selectedUnitIdSubject = new BehaviorSubject<number | null>(this.getStoredUnitId());
    public selectedUnitId$ = this.selectedUnitIdSubject.asObservable();

    constructor(private http: HttpClient) { }

    private getStoredUnitId(): number | null {
        const id = localStorage.getItem('almacen_selected_unit_id');
        return id ? Number(id) : null;
    }

    setSelectedUnitId(id: number | null): void {
        if (id) {
            localStorage.setItem('almacen_selected_unit_id', id.toString());
        } else {
            localStorage.removeItem('almacen_selected_unit_id');
        }
        this.selectedUnitIdSubject.next(id);
    }

    getSelectedUnitId(): number | null {
        return this.selectedUnitIdSubject.value;
    }

    private getParamsWithFilter(params?: HttpParams): HttpParams {
        let httpParams = params || new HttpParams();
        const filterId = this.getSelectedUnitId();
        if (filterId) {
            httpParams = httpParams.set('id_filter_unit', filterId.toString());
        }
        return httpParams;
    }

    getDashboardStats(): Observable<ApiResponse<any>> {
        const params = this.getParamsWithFilter();
        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/dashboard/stats`, { params });
    }

    getCategorias(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/categorias`);
    }

    getUnidades(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/unidades`);
    }

    getStock(): Observable<ApiResponse<any[]>> {
        const params = this.getParamsWithFilter();
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/stock`, { params });
    }

    getBienes(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/bienes`);
    }

    getOrganizationalUnits(): Observable<ApiResponse<any[]>> {
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/organizational-units`);
    }

    storeBien(data: any): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/bienes`, data);
    }

    updateBien(id: number, data: any): Observable<ApiResponse<any>> {
        return this.http.put<ApiResponse<any>>(`${this.apiUrl}/bienes/${id}`, data);
    }

    toggleBien(id: number): Observable<ApiResponse<any>> {
        return this.http.patch<ApiResponse<any>>(`${this.apiUrl}/bienes/${id}/toggle`, {});
    }

    getKardex(idBien: number): Observable<ApiResponse<any[]>> {
        let params = this.getParamsWithFilter();
        params = params.set('id_bien', idBien.toString());
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/kardex`, { params });
    }

    getMovimientos(params: any): Observable<ApiResponse<any>> {
        let httpParams = this.getParamsWithFilter();
        Object.keys(params).forEach(key => {
            if (params[key] !== '' && params[key] !== null && params[key] !== undefined) {
                httpParams = httpParams.set(key, params[key]);
            }
        });
        return this.http.get<ApiResponse<any>>(`${this.apiUrl}/movimientos`, { params: httpParams });
    }

    registrarEntrada(data: any): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/movimientos/entrada`, data);
    }

    registrarSalida(data: any): Observable<ApiResponse<any>> {
        return this.http.post<ApiResponse<any>>(`${this.apiUrl}/movimientos/salida`, data);
    }

    getActas(): Observable<ApiResponse<any[]>> {
        const params = this.getParamsWithFilter();
        return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/actas`, { params });
    }

    downloadActaPdf(id: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/actas/${id}/pdf`, { responseType: 'blob' });
    }
}
