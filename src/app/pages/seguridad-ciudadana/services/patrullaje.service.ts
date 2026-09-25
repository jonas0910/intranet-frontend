import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PatrullajeService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/seguridad-ciudadana/rutas-patrullaje`;

  getCatalogos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/catalogos`);
  }

  getRutas(params: any = {}): Observable<any> {
    return this.http.get(this.apiUrl, { params });
  }

  getRuta(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  crearRuta(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  actualizarRuta(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  eliminarRuta(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  getAsignaciones(idRuta: number, fecha: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${idRuta}/programacion`, { params: { fecha } });
  }

  asignar(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/asignar`, data);
  }

  eliminarAsignacion(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/asignacion/${id}`);
  }
}
