import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

export interface MenuIntranetItem {
  id: number;
  nombre: string;
  codigo: string;
  icono: string | null;
  ruta: string | null;
  orden: number;
  sistema_integrado_id: number | null;
  activo: boolean;
  created_at: string;
  updated_at: string;
  todos_detalles?: MenuIntranetDetailItem[];
  todosDetalles?: MenuIntranetDetailItem[];
  sistema_integrado?: { id: number; nombre: string; codigo: string };
  expanded?: boolean;
}

export interface MenuIntranetDetailItem {
  id: number;
  menu_intranet_id: number;
  nombre: string;
  ruta: string;
  query_params?: Record<string, string>;
  icono: string | null;
  orden: number;
  parent_id: number | null;
  activo: boolean;
  hijos?: MenuIntranetDetailItem[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuIntranetService {
  private apiUrl = `${environment.apiUrl}/menu-intranet`;
  private jsonHeaders = new HttpHeaders({ 'Content-Type': 'application/json' });

  constructor(private http: HttpClient) {}

  fromSistema(sistemaId: number, menuIds?: number[]): Observable<{ success: boolean; data: MenuIntranetItem; message?: string }> {
    const body = menuIds && menuIds.length > 0 ? { menu_ids: menuIds } : {};
    return this.http.post<{ success: boolean; data: MenuIntranetItem; message?: string }>(
      `${this.apiUrl}/from-sistema/${sistemaId}`,
      body,
      { headers: this.jsonHeaders }
    ).pipe(
      timeout(15000),
      catchError(() => of({ success: false, data: null as any, message: 'Error al agregar a INTRANET' }))
    );
  }

  list(): Observable<{ success: boolean; data: MenuIntranetItem[] }> {
    return this.http.get<{ success: boolean; data: MenuIntranetItem[] }>(
      this.apiUrl,
      { headers: this.jsonHeaders }
    ).pipe(
      timeout(15000),
      catchError(() => of({ success: false, data: [] }))
    );
  }

  create(data: Partial<MenuIntranetItem>): Observable<{ success: boolean; data: MenuIntranetItem; message?: string }> {
    return this.http.post<{ success: boolean; data: MenuIntranetItem; message?: string }>(
      this.apiUrl,
      data,
      { headers: this.jsonHeaders }
    );
  }

  update(id: number, data: Partial<MenuIntranetItem>): Observable<{ success: boolean; data: MenuIntranetItem; message?: string }> {
    return this.http.put<{ success: boolean; data: MenuIntranetItem; message?: string }>(
      `${this.apiUrl}/${id}`,
      data,
      { headers: this.jsonHeaders }
    );
  }

  delete(id: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/${id}`,
      { headers: this.jsonHeaders }
    );
  }

  reorder(ids: number[]): Observable<{ success: boolean; message?: string }> {
    return this.http.put<{ success: boolean; message?: string }>(
      `${this.apiUrl}/reorder`,
      { ids },
      { headers: this.jsonHeaders }
    );
  }

  createDetail(menuIntranetId: number, data: Partial<MenuIntranetDetailItem>): Observable<{ success: boolean; data: MenuIntranetDetailItem; message?: string }> {
    return this.http.post<{ success: boolean; data: MenuIntranetDetailItem; message?: string }>(
      `${this.apiUrl}/${menuIntranetId}/detalles`,
      data,
      { headers: this.jsonHeaders }
    );
  }

  updateDetail(menuIntranetId: number, detailId: number, data: Partial<MenuIntranetDetailItem>): Observable<{ success: boolean; data: MenuIntranetDetailItem; message?: string }> {
    return this.http.put<{ success: boolean; data: MenuIntranetDetailItem; message?: string }>(
      `${this.apiUrl}/${menuIntranetId}/detalles/${detailId}`,
      data,
      { headers: this.jsonHeaders }
    );
  }

  deleteDetail(menuIntranetId: number, detailId: number): Observable<{ success: boolean; message?: string }> {
    return this.http.delete<{ success: boolean; message?: string }>(
      `${this.apiUrl}/${menuIntranetId}/detalles/${detailId}`,
      { headers: this.jsonHeaders }
    );
  }
}
