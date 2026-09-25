import { Injectable } from '@angular/core';
import { ApiService, ApiResponse } from '../../../services/api.service';
import { Observable } from 'rxjs';

export interface ReporteResumen {
    total_ciudadanos: number;
    promedio_edad: number;
    por_sexo: {
        Masculino: number;
        Femenino: number;
        [key: string]: number;
    };
    rangos_edad: {
        menor_18: number;
        '18_30': number;
        '30_60': number;
        mayor_60: number;
        [key: string]: number;
    };
    por_situacion_laboral: { [key: string]: number };
}

export interface ReporteVulnerables {
    resumen: {
        discapacitados: number;
        porcentaje_discapacitados: number;
        adultos_mayores: number;
        porcentaje_mayores: number;
        padres_madres: number;
        porcentaje_padres: number;
        menores_edad: number;
        porcentaje_menores: number;
        desempleados: number;
        porcentaje_desempleados: number;
    };
}

export interface ReporteCobertura {
    resumen: {
        total_sectores: number;
        total_ciudadanos: number;
    };
    sectores: {
        nombre_sector: string;
        total_ciudadanos: number;
    }[];
}

export interface ReporteDemografico {
    total: number;
    piramide_edad: { [key: string]: number };
}

@Injectable({
    providedIn: 'root'
})
export class CensusReportesService {
    constructor(private api: ApiService) { }

    getResumenPadron(): Observable<ApiResponse<ReporteResumen>> {
        return this.api.get<ReporteResumen>('v1/censo/reportes/resumen-padron');
    }

    getGruposVulnerables(): Observable<ApiResponse<ReporteVulnerables>> {
        return this.api.get<ReporteVulnerables>('v1/censo/reportes/grupos-vulnerables');
    }

    getCoberturaSector(): Observable<ApiResponse<ReporteCobertura>> {
        return this.api.get<ReporteCobertura>('v1/censo/reportes/cobertura-sector');
    }

    getEstadisticasDemograficas(): Observable<ApiResponse<ReporteDemografico>> {
        return this.api.get<ReporteDemografico>('v1/censo/reportes/demografico');
    }

    getCiudadanos(filtros: any = {}): Observable<ApiResponse<any[]>> {
        let query = 'v1/censo/reportes/ciudadanos?';
        if (filtros.id_sector) query += `&id_sector=${filtros.id_sector}`;
        if (filtros.sexo) query += `&sexo=${filtros.sexo}`;
        return this.api.get<any[]>(query);
    }

    getEntregasPorEvento(idEvento: number): Observable<ApiResponse<any[]>> {
        return this.api.get<any[]>(`v1/censo/reportes/entregas-evento/${idEvento}`);
    }

    getAvanceEntregas(): Observable<ApiResponse<any[]>> {
        return this.api.get<any[]>('v1/censo/reportes/avance-entregas');
    }
}
