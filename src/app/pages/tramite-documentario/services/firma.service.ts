import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class FirmaService {
  private apiUrl = `${environment.apiUrl}/tramite-documentario/firmas`;

  constructor(private http: HttpClient) {}

  solicitarFirma(documentoId: number, firmantes: any[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documento/${documentoId}/solicitar`, {
      firmantes
    });
  }

  firmar(firmaId: number, pin: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${firmaId}/firmar`, { pin });
  }

  rechazar(firmaId: number, motivo: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${firmaId}/rechazar`, { motivo });
  }

  obtenerPendientes(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/pendientes`);
  }

  verificarIntegridad(firmaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${firmaId}/verificar`);
  }
}

