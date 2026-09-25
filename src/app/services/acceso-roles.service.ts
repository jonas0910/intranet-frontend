import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AccesoRolPlantilla {
  id: number;
  role_id: number;
  sistema_id: number;
  menu_id: string;
  permisos: Record<string, boolean> | string[] | null;
  activo: boolean;
  sistema?: { id: number; nombre: string; codigo: string };
}

export interface AccesoRolBulkItem {
  sistema_id: number;
  menu_id: number | string;
  permisos: Record<string, boolean>;
  activo?: boolean;
}

@Injectable({ providedIn: 'root' })
export class AccesoRolesService {
  private apiUrl = environment.apiUrl;
  private jsonHeaders = new HttpHeaders({
    Accept: 'application/json',
    'Content-Type': 'application/json',
  });

  constructor(private http: HttpClient) {}

  listByRole(roleId: number): Observable<AccesoRolPlantilla[]> {
    const params = new HttpParams().set('role_id', String(roleId));
    return this.http
      .get<{ success: boolean; data: AccesoRolPlantilla[] }>(`${this.apiUrl}/accesos-roles`, {
        headers: this.jsonHeaders,
        params,
      })
      .pipe(map((r) => (r.success && r.data ? r.data : [])));
  }

  bulkReplace(roleId: number, items: AccesoRolBulkItem[]): Observable<{ success: boolean; message?: string; usuarios_sincronizados?: number }> {
    return this.http.post<{ success: boolean; message?: string; usuarios_sincronizados?: number }>(
      `${this.apiUrl}/accesos-roles/bulk-replace`,
      { role_id: roleId, items },
      { headers: this.jsonHeaders }
    );
  }

  syncUsuariosForRole(roleId: number): Observable<{ success: boolean; message?: string; usuarios_procesados?: number }> {
    return this.http.post<{ success: boolean; message?: string; usuarios_procesados?: number }>(
      `${this.apiUrl}/accesos-roles/${roleId}/sync-usuarios`,
      {},
      { headers: this.jsonHeaders }
    );
  }
}
