import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: Permission[];
  users_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at?: string;
  updated_at?: string;
}

export interface RolePermission {
  role: Role;
  permissions: Permission[];
}

export interface MenuAccess {
  id: number;
  role_id: number;
  sistema_menu_id: number;
  permisos_adicionales: string[];
  activo: boolean;
  orden: number;
  sistema_menu?: {
    id: number;
    nombre: string;
    ruta: string;
    icono: string;
    sistema?: {
      id: number;
      nombre: string;
      codigo: string;
    };
  };
}

export interface RoleStatistics {
  total_roles: number;
  total_permissions: number;
  total_users: number;
  roles_with_users: Array<{
    id: number;
    name: string;
    users_count: number;
  }>;
  roles_with_permissions: Array<{
    id: number;
    name: string;
    permissions_count: number;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class RoleService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene todos los roles con sus permisos
   */
  obtenerRoles(): Observable<Role[]> {
    return this.http.get<any>(`${this.apiUrl}/roles`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error obteniendo roles:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene un rol específico con sus permisos y accesos a menús
   */
  obtenerRol(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/roles/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error obteniendo rol:', error);
        return of(null);
      })
    );
  }

  /**
   * Crea un nuevo rol
   */
  crearRol(roleData: { name: string; guard_name?: string; permissions?: string[] }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roles`, roleData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error creando rol:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza un rol existente
   */
  actualizarRol(id: number, roleData: { name: string; guard_name?: string; permissions?: string[] }): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/roles/${id}`, roleData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error actualizando rol:', error);
        throw error;
      })
    );
  }

  /**
   * Elimina un rol
   */
  eliminarRol(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/roles/${id}`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error eliminando rol:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene todos los permisos disponibles
   */
  obtenerPermisos(): Observable<Permission[]> {
    return this.http.get<any>(`${this.apiUrl}/roles/permissions`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error obteniendo permisos:', error);
        // Propagar para que la UI muestre el error (no simular catálogo vacío)
        throw error;
      })
    );
  }

  /**
   * Asigna permisos a un rol
   */
  asignarPermisos(roleId: number, permissions: string[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roles/${roleId}/assign-permissions`, {
      permissions: permissions
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error asignando permisos:', error);
        throw error;
      })
    );
  }

  /**
   * Actualiza accesos a menús de un rol
   */
  actualizarAccesosMenus(roleId: number, accesos: MenuAccess[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/roles/${roleId}/update-menu-access`, {
      accesos: accesos
    }, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      catchError(error => {
        console.error('Error actualizando accesos a menús:', error);
        throw error;
      })
    );
  }

  /**
   * Obtiene resumen de accesos a menús de todos los roles
   */
  obtenerResumenAccesosMenus(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/roles/menu-access-summary`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error obteniendo resumen de accesos:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtiene estadísticas de roles
   */
  obtenerEstadisticas(): Observable<RoleStatistics | null> {
    return this.http.get<any>(`${this.apiUrl}/roles/statistics/public`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return null;
      }),
      catchError(error => {
        console.error('Error obteniendo estadísticas de roles:', error);
        return of(null);
      })
    );
  }

  /**
   * Agrupa permisos por módulo
   */
  agruparPermisosPorModulo(permissions: Permission[]): { [key: string]: Permission[] } {
    const grupos: { [key: string]: Permission[] } = {};
    
    permissions.forEach(permission => {
      const modulo = this.obtenerModuloDePermiso(permission.name);
      if (!grupos[modulo]) {
        grupos[modulo] = [];
      }
      grupos[modulo].push(permission);
    });
    
    return grupos;
  }

  /**
   * Determina el módulo de un permiso basado en su nombre
   */
  private obtenerModuloDePermiso(permissionName: string): string {
    if (permissionName.startsWith('perfil.')) return 'Configuración lateral';
    if (permissionName.startsWith('patrones.')) return 'Configuración lateral';
    if (permissionName.startsWith('organizacion.')) return 'Maestro';
    if (permissionName.startsWith('tramite.admin.')) return 'Maestro';
    if (permissionName.includes('tramite')) return 'Trámite Documentario';
    if (permissionName.includes('dashboard')) return 'Dashboard';
    if (permissionName.includes('empleados')) return 'Empleados';
    if (permissionName.includes('documentos')) return 'Documentos';
    if (permissionName.includes('tickets')) return 'Tickets';
    if (permissionName.includes('chat')) return 'Chat';
    if (permissionName.includes('comunicados')) return 'Comunicados';
    if (permissionName.includes('activos')) return 'Activos Fijos';
    if (permissionName.includes('admin')) return 'Administración';
    if (permissionName.includes('departamentos')) return 'Departamentos';
    if (permissionName.includes('usuarios')) return 'Usuarios';
    if (permissionName.includes('roles')) return 'Roles';
    if (permissionName.includes('menus')) return 'Menús';
    if (permissionName.includes('planillas')) return 'Planillas';
    
    return 'General';
  }

  /**
   * Obtiene el nombre legible de un permiso
   */
  obtenerNombreLegiblePermiso(permissionName: string): string {
    const nombres: { [key: string]: string } = {
      'dashboard.ver': 'Ver Dashboard',
      'empleados.ver': 'Ver Empleados',
      'empleados.crear': 'Crear Empleados',
      'empleados.editar': 'Editar Empleados',
      'empleados.eliminar': 'Eliminar Empleados',
      'documentos.ver': 'Ver Documentos',
      'documentos.crear': 'Crear Documentos',
      'documentos.editar': 'Editar Documentos',
      'documentos.eliminar': 'Eliminar Documentos',
      'documentos.aprobar': 'Aprobar Documentos',
      'documentos.descargar': 'Descargar Documentos',
      'tickets.ver': 'Ver Tickets',
      'tickets.crear': 'Crear Tickets',
      'tickets.editar': 'Editar Tickets',
      'tickets.eliminar': 'Eliminar Tickets',
      'tickets.asignar': 'Asignar Tickets',
      'tickets.resolver': 'Resolver Tickets',
      'chat.ver': 'Ver Chat',
      'chat.crear_canal': 'Crear Canales de Chat',
      'chat.moderar': 'Moderar Chat',
      'comunicados.ver': 'Ver Comunicados',
      'comunicados.crear': 'Crear Comunicados',
      'comunicados.editar': 'Editar Comunicados',
      'comunicados.eliminar': 'Eliminar Comunicados',
      'comunicados.publicar': 'Publicar Comunicados',
      'activos.ver': 'Ver Activos Fijos',
      'activos.crear': 'Crear Activos Fijos',
      'activos.editar': 'Editar Activos Fijos',
      'activos.eliminar': 'Eliminar Activos Fijos',
      'activos.asignar': 'Asignar Activos Fijos',
      'admin.usuarios': 'Administrar Usuarios',
      'admin.roles': 'Administrar Roles',
      'admin.sistemas': 'Administrar Sistemas',
      'admin.auditoria': 'Ver Auditoría',
      'departamentos.ver': 'Ver Departamentos',
      'departamentos.crear': 'Crear Departamentos',
      'departamentos.editar': 'Editar Departamentos',
      'departamentos.eliminar': 'Eliminar Departamentos',
      'perfil.ver': 'Ver mi perfil',
      'perfil.editar': 'Editar mi perfil',
      'patrones.ver': 'Ver patrones de diseño',
      'patrones.crear': 'Crear patrones de diseño',
      'patrones.editar': 'Editar patrones de diseño',
      'patrones.eliminar': 'Eliminar patrones de diseño',
      'organizacion.ver': 'Ver datos de organización',
      'organizacion.editar': 'Editar datos de organización',
      'tramite.admin.areas': 'Trámite: administrar áreas / oficinas',
      'tramite.admin.tipos': 'Trámite: administrar tipos de trámite',
      'tramite.admin.usuarios': 'Trámite: administrar usuarios del módulo',
      'tramite.dashboard.ver': 'Trámite: ver panel del módulo',
      'tramite.documento.crear': 'Trámite: crear documento',
      'tramite.documento.ver': 'Trámite: ver documentos generados',
      'tramite.bandeja.entrada': 'Trámite: bandeja de entrada',
      'tramite.bandeja.salida': 'Trámite: bandeja de enviados',
      'tramite.bandeja.archivados': 'Trámite: bandeja archivados',
      'tramite.documento.buscar': 'Trámite: buscar expedientes',
      'tramite.reportes.ver': 'Trámite: ver reportes',
      'tramite.consulta.ver': 'Trámite: consulta pública',
    };
    
    return nombres[permissionName] || permissionName;
  }
}
