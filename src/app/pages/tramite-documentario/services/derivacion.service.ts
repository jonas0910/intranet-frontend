import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DerivacionService {
  private apiUrl = `${environment.apiUrl}/tramite-documentario/derivaciones`;

  constructor(private http: HttpClient) {}

  derivar(documentoId: number, datos: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/documento/${documentoId}/derivar`, datos);
  }

  recibir(derivacionId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${derivacionId}/recibir`, {});
  }

  obtenerHistorial(documentoId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/documento/${documentoId}/historial`);
  }
}

