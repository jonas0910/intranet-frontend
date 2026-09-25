import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const BASE = `${environment.apiUrl}/planillas/pdt-plame`;

export interface PlameArchivo {
  id: number;
  periodo: string;
  nombre_archivo: string;
  fecha_generacion: string;
  tamanio: string;
  registros: number;
  estado: string;
}

export interface PlameListResponse {
  success: boolean;
  data: PlameArchivo[];
  message: string;
}

export interface PlameGenerateResponse {
  success: boolean;
  data?: {
    file_path: string;
    download_url: string;
    filename: string;
    period: string;
  };
  message: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdtPlameService {

  constructor(private http: HttpClient) {}

  listar(filtros?: { anio?: number; mes?: number }): Observable<PlameListResponse> {
    let params = new HttpParams();
    if (filtros?.anio != null) params = params.set('anio', filtros.anio.toString());
    if (filtros?.mes != null) params = params.set('mes', filtros.mes.toString());
    return this.http.get<PlameListResponse>(BASE, { params });
  }

  generar(anio: number, mes: number): Observable<PlameGenerateResponse> {
    return this.http.post<PlameGenerateResponse>(`${BASE}/generate`, { anio, mes });
  }

  getDownloadUrl(nombreArchivo: string): string {
    const encoded = encodeURIComponent(nombreArchivo);
    return `${BASE}/download/${encoded}`;
  }

  descargar(nombreArchivo: string): Observable<Blob> {
    const url = this.getDownloadUrl(nombreArchivo);
    return this.http.get(url, { responseType: 'blob' });
  }
}
