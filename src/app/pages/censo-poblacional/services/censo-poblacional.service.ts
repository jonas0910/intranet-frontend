import { Injectable } from '@angular/core';
import { ApiService, ApiResponse } from '../../../services/api.service';
import { Observable } from 'rxjs';

export interface Sector {
    id_sector: number;
    nombre_sector: string;
    codigo_postal: string;
}

export interface Organizacion {
    id_organizacion: number;
    nombre: string;
    tipo: string;
}

export interface Ciudadano {
    id_ciudadano: number;
    nombres: string;
    dni: string;
    fecha_nacimiento?: string;
    direccion: string;
    edad: number;
    sexo: string;
    estado_civil: string;
    id_sector: number;
    sector?: Sector;
    situacion_laboral: string;
    es_padre_madre?: boolean;
    cantidad_hijos?: number;
    tiene_discapacidad?: boolean;
    tipo_discapacidad?: string;
    organizaciones?: Organizacion[];
    activo: boolean;
}

export interface Evento {
    id_evento: number;
    nombre_evento: string;
    fecha: string;
    estado: string;
    activo: boolean;
    responsables?: Responsable[];
}

@Injectable({
    providedIn: 'root'
})
export class CensoPoblacionalService {
    constructor(private api: ApiService) { }

    // Dashboard
    getDashboardStats(): Observable<ApiResponse<any>> {
        return this.api.get<any>('v1/censo/dashboard');
    }

    // Ciudadanos
    getCiudadanos(params: any = {}): Observable<ApiResponse<Ciudadano[]>> {
        let query = 'v1/censo/ciudadanos?per_page=1000';
        if (params.dni) query += `&dni=${params.dni}`;
        return this.api.get<Ciudadano[]>(query);
    }

    saveCiudadano(data: any): Observable<ApiResponse<Ciudadano>> {
        return data.id_ciudadano
            ? this.api.put<Ciudadano>(`v1/censo/ciudadanos/${data.id_ciudadano}`, data)
            : this.api.post<Ciudadano>('v1/censo/ciudadanos', data);
    }

    buscarCiudadano(dni: string): Observable<ApiResponse<Ciudadano>> {
        return this.api.get<Ciudadano>(`v1/censo/ciudadanos/buscar/${dni}`);
    }

    deleteCiudadano(idCiudadano: number): Observable<ApiResponse<any>> {
        return this.api.delete(`v1/censo/ciudadanos/${idCiudadano}`);
    }

    importarCiudadanos(ciudadanos: any[]): Observable<ApiResponse<any>> {
        return this.api.post('v1/censo/ciudadanos/importar', { ciudadanos });
    }

    // Eventos
    getEventos(): Observable<ApiResponse<Evento[]>> {
        return this.api.get<Evento[]>('v1/censo/eventos');
    }

    saveEvento(data: any): Observable<ApiResponse<Evento>> {
        return data.id_evento
            ? this.api.put<Evento>(`v1/censo/eventos/${data.id_evento}`, data)
            : this.api.post<Evento>('v1/censo/eventos', data);
    }

    deleteEvento(id: number): Observable<ApiResponse<any>> {
        return this.api.delete(`v1/censo/eventos/${id}`);
    }

    // Entregas
    registrarEntrega(data: any): Observable<ApiResponse<any>> {
        return this.api.post('v1/censo/entregas/registrar', data);
    }

    getCiudadanosPorEvento(idEvento: number): Observable<ApiResponse<any[]>> {
        return this.api.get<any[]>(`v1/censo/entregas/evento/${idEvento}/ciudadanos`);
    }

    asignacionMasiva(data: any): Observable<ApiResponse<any>> {
        return this.api.post('v1/censo/entregas/asignacion-masiva', data);
    }

    eliminarEntrega(idEntrega: number): Observable<ApiResponse<any>> {
        return this.api.delete(`v1/censo/entregas/${idEntrega}`);
    }

    // Catalogos y Sectores CRUD
    getSectores(): Observable<ApiResponse<Sector[]>> {
        return this.api.get<Sector[]>('v1/censo/catalogos/sectores');
    }

    getAllSectores(): Observable<ApiResponse<any[]>> {
        return this.api.get<any[]>('v1/censo/sectores');
    }

    saveSector(data: any): Observable<ApiResponse<any>> {
        if (data.id_sector) {
            return this.api.put(`v1/censo/sectores/${data.id_sector}`, data);
        }
        return this.api.post('v1/censo/sectores', data);
    }

    deleteSector(id_sector: number): Observable<ApiResponse<any>> {
        return this.api.delete(`v1/censo/sectores/${id_sector}`);
    }

    getOrganizaciones(): Observable<ApiResponse<Organizacion[]>> {
        return this.api.get<Organizacion[]>('v1/censo/catalogos/organizaciones');
    }

    getResponsables(): Observable<ApiResponse<Responsable[]>> {
        return this.api.get<Responsable[]>('v1/censo/catalogos/responsables');
    }
}

export interface Responsable {
    id: number;
    first_name: string;
    last_name: string;
    dni: string;
}
