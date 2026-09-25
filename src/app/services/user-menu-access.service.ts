import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

export interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Sistema {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  url_base: string;
  activo: boolean;
  sso_habilitado: boolean;
  patron_data: any;
  menus: Menu[];
  created_at: string;
  updated_at: string;
}

export interface Menu {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  tipo_ruta: string;
  target: string;
  abrir_nueva_pestana: boolean;
  descripcion: string;
  icono: string;
  orden: number;
  activo: boolean;
  permisos_requeridos: string[];
  submenus: Submenu[];
  created_at: string;
  updated_at: string;
}

export interface Submenu {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  tipo_ruta: string;
  target: string;
  abrir_nueva_pestana: boolean;
  descripcion: string;
  icono: string;
  orden: number;
  activo: boolean;
  permisos: string[];
  created_at: string;
  updated_at: string;
}

export interface UserAccess {
  id: number;
  usuario_id: number;
  sistema_id: number;
  menu_id: number;
  permisos: string[];
  activo: boolean;
  usuario?: User;
  sistema?: Sistema;
  menu?: Menu;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessRequest {
  usuario_id: number;
  sistema_id: number;
  menu_id: number;
  permisos: string[];
  activo: boolean;
}

export interface UpdateAccessRequest {
  permisos?: string[];
  activo?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class UserMenuAccessService {
  private apiUrl = `${environment.apiUrl}/api`;

  constructor(private http: HttpClient) {}

  // Users
  getUsuarios(): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/usuarios`);
  }

  getUsuario(id: number): Observable<ApiResponse<User>> {
    return this.http.get<ApiResponse<User>>(`${this.apiUrl}/usuarios/${id}`);
  }

  // Systems
  getSistemas(): Observable<ApiResponse<Sistema[]>> {
    return this.http.get<ApiResponse<Sistema[]>>(`${this.apiUrl}/sistemas-integrados`);
  }

  getSistema(id: number): Observable<ApiResponse<Sistema>> {
    return this.http.get<ApiResponse<Sistema>>(`${this.apiUrl}/sistemas-integrados/${id}`);
  }

  // User Accesses
  getAccesos(params?: any): Observable<ApiResponse<UserAccess[]>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<ApiResponse<UserAccess[]>>(`${this.apiUrl}/accesos-usuarios`, { params: httpParams });
  }

  getAcceso(id: number): Observable<ApiResponse<UserAccess>> {
    return this.http.get<ApiResponse<UserAccess>>(`${this.apiUrl}/accesos-usuarios/${id}`);
  }

  createAccess(data: CreateAccessRequest): Observable<ApiResponse<UserAccess>> {
    return this.http.post<ApiResponse<UserAccess>>(`${this.apiUrl}/accesos-usuarios`, data);
  }

  updateAccess(id: number, data: UpdateAccessRequest): Observable<ApiResponse<UserAccess>> {
    return this.http.put<ApiResponse<UserAccess>>(`${this.apiUrl}/accesos-usuarios/${id}`, data);
  }

  deleteAccess(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/accesos-usuarios/${id}`);
  }

  // User-specific accesses
  getUserAccesses(userId: number): Observable<ApiResponse<UserAccess[]>> {
    return this.http.get<ApiResponse<UserAccess[]>>(`${this.apiUrl}/accesos-usuarios/usuario/${userId}`);
  }

  getUserPermissionsWithMenus(userId: number): Observable<ApiResponse<UserAccess[]>> {
    return this.http.get<ApiResponse<UserAccess[]>>(`${this.apiUrl}/accesos-usuarios/usuario/${userId}/permisos-con-menus`);
  }

  // Access verification
  verifyAccess(userId: number, sistemaId: number, menuId: number): Observable<ApiResponse<{tiene_acceso: boolean}>> {
    return this.http.post<ApiResponse<{tiene_acceso: boolean}>>(`${this.apiUrl}/accesos-usuarios/verificar/${userId}`, {
      sistema_id: sistemaId,
      menu_id: menuId
    });
  }

  // Bulk operations
  deleteUserAccesses(userId: number): Observable<ApiResponse<{deleted_count: number}>> {
    return this.http.delete<ApiResponse<{deleted_count: number}>>(`${this.apiUrl}/accesos-usuarios/usuario/${userId}/eliminar-todos`);
  }

  // System and menu management
  getSistemaMenus(sistemaId: number): Observable<ApiResponse<Menu[]>> {
    return this.http.get<ApiResponse<Menu[]>>(`${this.apiUrl}/sistemas-integrados/${sistemaId}/menus`);
  }

  getMenuSubmenus(menuId: number): Observable<ApiResponse<Submenu[]>> {
    return this.http.get<ApiResponse<Submenu[]>>(`${this.apiUrl}/sistema-integrado-menus/${menuId}/submenus`);
  }

  // Permission management
  getAvailablePermissions(): Observable<ApiResponse<string[]>> {
    return this.http.get<ApiResponse<string[]>>(`${this.apiUrl}/permisos-disponibles`);
  }

  // Statistics
  getAccessStatistics(): Observable<ApiResponse<{
    total_users: number;
    total_systems: number;
    total_menus: number;
    total_accesses: number;
    active_accesses: number;
    inactive_accesses: number;
  }>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/accesos-usuarios/estadisticas`);
  }

  // Search and filter
  searchUsers(query: string): Observable<ApiResponse<User[]>> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/usuarios/buscar`, {
      params: { q: query }
    });
  }

  searchSystems(query: string): Observable<ApiResponse<Sistema[]>> {
    return this.http.get<ApiResponse<Sistema[]>>(`${this.apiUrl}/sistemas-integrados/buscar`, {
      params: { q: query }
    });
  }

  searchMenus(sistemaId: number, query: string): Observable<ApiResponse<Menu[]>> {
    return this.http.get<ApiResponse<Menu[]>>(`${this.apiUrl}/sistemas-integrados/${sistemaId}/menus/buscar`, {
      params: { q: query }
    });
  }

  // Export and import
  exportUserAccesses(userId?: number): Observable<Blob> {
    let url = `${this.apiUrl}/accesos-usuarios/exportar`;
    if (userId) {
      url += `?usuario_id=${userId}`;
    }
    return this.http.get(url, { responseType: 'blob' });
  }

  importUserAccesses(file: File): Observable<ApiResponse<{imported_count: number, errors: any[]}>> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse<{imported_count: number, errors: any[]}>>(`${this.apiUrl}/accesos-usuarios/importar`, formData);
  }

  // Audit and logs
  getAccessLogs(userId?: number, sistemaId?: number): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (userId) params = params.set('usuario_id', userId.toString());
    if (sistemaId) params = params.set('sistema_id', sistemaId.toString());
    
    return this.http.get<ApiResponse<any[]>>(`${this.apiUrl}/accesos-usuarios/logs`, { params });
  }

  // Validation helpers
  validateAccessData(data: CreateAccessRequest): {valid: boolean, errors: string[]} {
    const errors: string[] = [];

    if (!data.usuario_id || data.usuario_id <= 0) {
      errors.push('ID de usuario es requerido');
    }

    if (!data.sistema_id || data.sistema_id <= 0) {
      errors.push('ID de sistema es requerido');
    }

    if (!data.menu_id || data.menu_id <= 0) {
      errors.push('ID de menú es requerido');
    }

    if (!data.permisos || data.permisos.length === 0) {
      errors.push('Al menos un permiso es requerido');
    }

    if (data.permisos && data.permisos.some(p => !p || p.trim() === '')) {
      errors.push('Los permisos no pueden estar vacíos');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  // Utility methods
  formatPermissionsForDisplay(permisos: string[]): string {
    const permissionNames: {[key: string]: string} = {
      'lectura': 'Lectura',
      'escritura': 'Escritura',
      'configuracion': 'Configuración',
      'eliminacion': 'Eliminación',
      'exportacion': 'Exportación',
      'importacion': 'Importación',
      'aprobacion': 'Aprobación',
      'supervision': 'Supervisión'
    };

    return permisos.map(p => permissionNames[p] || p).join(', ');
  }

  getPermissionDescription(permission: string): string {
    const descriptions: {[key: string]: string} = {
      'lectura': 'Ver el menú y su contenido',
      'escritura': 'Crear y modificar contenido',
      'configuracion': 'Configurar opciones del menú',
      'eliminacion': 'Eliminar contenido',
      'exportacion': 'Exportar datos',
      'importacion': 'Importar datos',
      'aprobacion': 'Aprobar cambios',
      'supervision': 'Supervisar operaciones'
    };

    return descriptions[permission] || 'Permiso no definido';
  }
}
