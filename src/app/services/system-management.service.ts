import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface System {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  url_base: string;
  activo: boolean;
  sso_habilitado: boolean;
  sso_force: boolean;
  patron_id?: string;
  menus_count?: number;
  active_menus_count?: number;
  created_at: string;
  updated_at: string;
}

export interface SystemMenu {
  id: number;
  nombre: string;
  ruta: string;
  tipo_ruta?: 'interna' | 'externa' | 'iframe';
  target?: string;
  abrir_nueva_pestana?: boolean;
  icono?: string;
  orden: number;
  activo: boolean;
  visible_en_intranet?: boolean;
  permisos_requeridos: string[];
  created_at: string;
  updated_at: string;
  children?: SystemMenu[];
}

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
}

export interface MenuPermissionAssignment {
  role_id: number;
  menu_id: number;
  permissions: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

export interface OrganizationSetting {
  id?: number;
  name: string;
  ruc?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  responsable_name?: string;
  responsable_cargo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemManagementService {
  private apiUrl = environment.apiUrl;
  private jsonHeaders = new HttpHeaders({
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  });

  constructor(private http: HttpClient) { }

  /** GESTIÓN DE ORGANIZACIÓN */
  getOrganizationSettings(): Observable<ApiResponse<OrganizationSetting>> {
    return this.http.get<ApiResponse<OrganizationSetting>>(
      `${this.apiUrl}/organization/settings`,
      { headers: this.jsonHeaders }
    );
  }

  updateOrganizationSettings(data: FormData): Observable<ApiResponse<OrganizationSetting>> {
    // Al enviar FormData no establecemos Content-Type, el navegador lo hará con el boundary correcto
    const headers = new HttpHeaders({ 'Accept': 'application/json' });
    return this.http.post<ApiResponse<OrganizationSetting>>(
      `${this.apiUrl}/organization/settings`,
      data,
      { headers }
    );
  }

  /** Obtener todos los sistemas integrados */
  getIntegratedSystems(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(
      `${this.apiUrl}/sistemas-integrados`,
      { headers: this.jsonHeaders }
    );
  }

  /** Alias para compatibilidad */
  getSystems(): Observable<ApiResponse<System[]>> {
    return this.http.get<ApiResponse<System[]>>(
      `${this.apiUrl}/sistemas-integrados`,
      { headers: this.jsonHeaders }
    );
  }

  /** Crear un nuevo sistema integrado */
  createSystem(systemData: Partial<System>): Observable<ApiResponse<System>> {
    return this.http.post<ApiResponse<System>>(
      `${this.apiUrl}/sistemas-integrados`,
      systemData,
      { headers: this.jsonHeaders }
    );
  }

  /** Obtener el resumen de la última integración (dependencias, migraciones, seeder) para mostrar en UI */
  getLastIntegrationSummary(): Observable<ApiResponse<{ summary: string; completed_at: string } | null>> {
    return this.http.get<ApiResponse<{ summary: string; completed_at: string } | null>>(
      `${this.apiUrl}/sistemas-integrados/last-integration-summary`,
      { headers: this.jsonHeaders }
    );
  }

  /** Actualizar un sistema integrado existente */
  updateSystem(id: number, systemData: Partial<System>): Observable<ApiResponse<System>> {
    return this.http.put<ApiResponse<System>>(
      `${this.apiUrl}/sistemas-integrados/${id}`,
      systemData,
      { headers: this.jsonHeaders }
    );
  }

  /** Eliminar un sistema integrado */
  deleteSystem(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(
      `${this.apiUrl}/sistemas-integrados/${id}`,
      { headers: this.jsonHeaders }
    );
  }

  /** Obtener menús de un sistema específico */
  getSystemMenus(systemId: number): Observable<ApiResponse<SystemMenu[]>> {
    return this.http.get<ApiResponse<SystemMenu[]>>(
      `${this.apiUrl}/sistema-integrado-menus/${systemId}`,
      { headers: this.jsonHeaders }
    ).pipe(
      map((res: any) => {
        if (res.success && res.data && res.data.menus) {
          return { ...res, data: res.data.menus };
        }
        return res;
      })
    );
  }

  /** Actualizar un menú (ej. visible_en_intranet) */
  updateMenu(menuId: number, data: Partial<SystemMenu>): Observable<ApiResponse<SystemMenu>> {
    return this.http.put<ApiResponse<SystemMenu>>(
      `${this.apiUrl}/menus-unificados/menu/${menuId}`,
      data,
      { headers: this.jsonHeaders }
    );
  }

  /** Crear un menú para un sistema */
  createSystemMenu(systemId: number, menuData: Partial<SystemMenu>): Observable<ApiResponse<SystemMenu>> {
    return this.http.post<ApiResponse<SystemMenu>>(
      `${this.apiUrl}/sistemas-integrados/${systemId}/menus`,
      menuData,
      { headers: this.jsonHeaders }
    );
  }

  /** Obtener roles y permisos disponibles */
  getRolesAndPermissions(): Observable<ApiResponse<{ roles: Role[]; permissions: Permission[] }>> {
    return this.http.get<ApiResponse<{ roles: Role[]; permissions: Permission[] }>>(
      `${this.apiUrl}/roles-permissions`,
      { headers: this.jsonHeaders }
    );
  }

  /** Asignar permisos a un rol para un menú específico */
  assignMenuPermissions(assignment: MenuPermissionAssignment): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${this.apiUrl}/assign-menu-permissions`,
      assignment,
      { headers: this.jsonHeaders }
    );
  }
}
