import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ConsultaPublicaService {
  private apiUrl = `${environment.apiUrl}/tramite-documentario/publico`;

  constructor(private http: HttpClient) {}

  consultarExpediente(numeroExpediente: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/consultar/${numeroExpediente}`);
  }

  misTramites(dni: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/mis-tramites/${dni}`);
  }
}

