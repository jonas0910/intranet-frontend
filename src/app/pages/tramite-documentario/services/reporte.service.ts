import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReporteService {
  // NOTA: Usando endpoints públicos de demostración (módulo deshabilitado)
  private apiUrl = `${environment.apiUrl}/tramite-demo`;

  constructor(private http: HttpClient) {}

  obtenerDashboard(): Observable<any> {
    // Usar endpoint de estadísticas públicas
    return this.http.get<any>(`${this.apiUrl}/estadisticas`);
  }

  documentosPorArea(filtros?: any): Observable<any> {
    // Por ahora retornar datos mock, endpoint no disponible en demo
    return new Observable(observer => {
      observer.next({ success: true, data: [] });
      observer.complete();
    });
  }

  documentosPorTipo(filtros?: any): Observable<any> {
    // Por ahora retornar datos mock, endpoint no disponible en demo
    return new Observable(observer => {
      observer.next({ success: true, data: [] });
      observer.complete();
    });
  }

  documentosVencidos(): Observable<any> {
    // Filtrar documentos vencidos desde la lista de documentos
    return this.http.get<any>(`${this.apiUrl}/documentos`);
  }

  tiempoAtencion(): Observable<any> {
    // Por ahora retornar datos mock, endpoint no disponible en demo
    return new Observable(observer => {
      observer.next({ success: true, data: { promedio: 0 } });
      observer.complete();
    });
  }

  cargaTrabajo(unidadOrganicaId?: number): Observable<any> {
    // Por ahora retornar datos mock, endpoint no disponible en demo
    return new Observable(observer => {
      observer.next({ success: true, data: [] });
      observer.complete();
    });
  }

  eficienciaAreas(): Observable<any> {
    // Por ahora retornar datos mock, endpoint no disponible en demo
    return new Observable(observer => {
      observer.next({ success: true, data: [] });
      observer.complete();
    });
  }
}

