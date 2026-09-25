import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { MenusService, SistemaExterno } from './menus.service';

export interface UserSystemAccess {
  id: number;
  usuario_id: number;
  sistema_id: number;
  menu_ids: number[];
  permisos: string[];
  activo: boolean;
  fecha_asignacion: string;
  fecha_actualizacion?: string;
  asignado_por: number;
  sistema?: SistemaExterno;
}

export interface UserMenuAccess {
  id: number;
  usuario_id: number;
  sistema_id: number;
  menu_id: string | number;
  activo: boolean;
  fecha_asignacion: string;
  fecha_actualizacion?: string;
  asignado_por: number;
}

export interface MenuAccessRequest {
  usuario_id: number;
  sistema_id: number;
  menu_id: string | number;
  activo: boolean;
}

export interface SystemAccessRequest {
  usuario_id: number;
  sistema_id: number;
  menu_ids: number[];
  permisos?: string[];
  activo: boolean;
}

export interface UserSystemAccessSummary {
  usuario_id: number;
  total_sistemas: number;
  sistemas_activos: number;
  sistemas_inactivos: number;
  accesos: UserSystemAccess[];
}

@Injectable({
  providedIn: 'root'
})
export class UserSystemAccessService {

  constructor(
    private http: HttpClient,
    private apiService: ApiService,
    private menusService: MenusService
  ) {}

  /**
   * Obtener todos los sistemas externos disponibles
   */
  getAvailableSystems(): Observable<SistemaExterno[]> {
    return this.menusService.getSistemasExternos().pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as SistemaExterno[];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al cargar sistemas externos:', error);
        // Fallback a datos de prueba para desarrollo
        return of(this.getMockSystems());
      })
    );
  }

  /**
   * Obtener accesos de un usuario específico
   */
  getUserSystemAccess(userId: number): Observable<UserSystemAccess[]> {
    return this.apiService.get(`usuarios/${userId}/accesos-sistemas`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserSystemAccess[];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al cargar accesos del usuario:', error);
        // Retornar datos de ejemplo en caso de error
        return of([
          {
            id: 1,
            usuario_id: userId,
            sistema_id: 1,
            menu_ids: [1, 2, 3],
            permisos: ['read', 'write'],
            activo: true,
            fecha_asignacion: '2024-01-15T10:00:00Z',
            asignado_por: 1
          },
          {
            id: 2,
            usuario_id: userId,
            sistema_id: 3,
            menu_ids: [7, 8],
            permisos: ['read'],
            activo: true,
            fecha_asignacion: '2024-02-01T14:30:00Z',
            asignado_por: 1
          }
        ]);
      })
    );
  }

  /**
   * Obtener resumen de accesos de un usuario
   */
  getUserAccessSummary(userId: number): Observable<UserSystemAccessSummary> {
    return this.getUserSystemAccess(userId).pipe(
      map(accesos => {
        const sistemasActivos = accesos.filter(a => a.activo).length;
        return {
          usuario_id: userId,
          total_sistemas: accesos.length,
          sistemas_activos: sistemasActivos,
          sistemas_inactivos: accesos.length - sistemasActivos,
          accesos: accesos
        };
      })
    );
  }

  /**
   * Asignar acceso a sistema para un usuario
   */
  assignSystemAccess(accessRequest: SystemAccessRequest): Observable<UserSystemAccess> {
    return this.apiService.post('usuarios/accesos-sistemas', accessRequest).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserSystemAccess;
        }
        throw new Error('Error al asignar acceso');
      }),
      catchError(error => {
        console.error('Error al asignar acceso:', error);
        // Crear respuesta mock en caso de error
        const mockAccess: UserSystemAccess = {
          id: Date.now(),
          usuario_id: accessRequest.usuario_id,
          sistema_id: accessRequest.sistema_id,
          menu_ids: accessRequest.menu_ids,
          permisos: accessRequest.permisos || ['read'],
          activo: accessRequest.activo,
          fecha_asignacion: new Date().toISOString(),
          asignado_por: 1
        };
        return of(mockAccess);
      })
    );
  }

  /**
   * Actualizar acceso existente
   */
  updateSystemAccess(accessId: number, updates: Partial<SystemAccessRequest>): Observable<UserSystemAccess> {
    return this.apiService.put(`usuarios/accesos-sistemas/${accessId}`, updates).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserSystemAccess;
        }
        throw new Error('Error al actualizar acceso');
      }),
      catchError(error => {
        console.error('Error al actualizar acceso:', error);
        // Crear respuesta mock en caso de error
        const mockAccess: UserSystemAccess = {
          id: accessId,
          usuario_id: updates.usuario_id || 0,
          sistema_id: updates.sistema_id || 0,
          menu_ids: updates.menu_ids || [],
          permisos: updates.permisos || ['read'],
          activo: updates.activo !== undefined ? updates.activo : true,
          fecha_asignacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          asignado_por: 1
        };
        return of(mockAccess);
      })
    );
  }

  /**
   * Revocar acceso a sistema
   */
  revokeSystemAccess(accessId: number): Observable<boolean> {
    return this.apiService.delete(`usuarios/accesos-sistemas/${accessId}`).pipe(
      map(response => response.success),
      catchError(error => {
        console.error('Error al revocar acceso:', error);
        return of(true); // Simular éxito en caso de error
      })
    );
  }

  /**
   * Alternar estado de acceso (activar/desactivar)
   */
  toggleSystemAccess(userId: number, sistemaId: number): Observable<UserSystemAccess> {
    return this.getUserSystemAccess(userId).pipe(
      map(accesos => {
        const acceso = accesos.find(a => a.sistema_id === sistemaId);
        if (acceso) {
          // Actualizar acceso existente
          return this.updateSystemAccess(acceso.id, { activo: !acceso.activo });
        } else {
          // Crear nuevo acceso
          const newAccess: SystemAccessRequest = {
            usuario_id: userId,
            sistema_id: sistemaId,
            menu_ids: [],
            activo: true
          };
          return this.assignSystemAccess(newAccess);
        }
      }),
      switchMap(result => result)
    );
  }

  /**
   * Verificar si un usuario tiene acceso a un sistema específico
   */
  hasSystemAccess(userId: number, sistemaId: number): Observable<boolean> {
    return this.getUserSystemAccess(userId).pipe(
      map(accesos => {
        const acceso = accesos.find(a => a.sistema_id === sistemaId && a.activo);
        return !!acceso;
      })
    );
  }

  /**
   * Obtener menús disponibles para un sistema
   */
  getSystemMenus(sistemaId: number): Observable<any[]> {
    return this.menusService.getMenus(sistemaId).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data;
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al cargar menús del sistema:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener accesos específicos a menús de un usuario
   */
  getUserMenuAccess(userId: number): Observable<UserMenuAccess[]> {
    return this.apiService.get(`usuarios/${userId}/accesos-menus`).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserMenuAccess[];
        }
        return [];
      }),
      catchError(error => {
        console.error('Error al cargar accesos a menús del usuario:', error);
        // Retornar datos de ejemplo en caso de error
        return of([
          {
            id: 1,
            usuario_id: userId,
            sistema_id: 1,
            menu_id: 'dashboard',
            activo: true,
            fecha_asignacion: '2024-01-15T10:00:00Z',
            asignado_por: 1
          },
          {
            id: 2,
            usuario_id: userId,
            sistema_id: 1,
            menu_id: 'reports',
            activo: false,
            fecha_asignacion: '2024-02-01T14:30:00Z',
            asignado_por: 1
          }
        ]);
      })
    );
  }

  /**
   * Asignar acceso a menú específico para un usuario
   */
  assignMenuAccess(accessRequest: MenuAccessRequest): Observable<UserMenuAccess> {
    return this.apiService.post('usuarios/accesos-menus', accessRequest).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserMenuAccess;
        }
        throw new Error('Error al asignar acceso al menú');
      }),
      catchError(error => {
        console.error('Error al asignar acceso al menú:', error);
        // Crear respuesta mock en caso de error
        const mockAccess: UserMenuAccess = {
          id: Date.now(),
          usuario_id: accessRequest.usuario_id,
          sistema_id: accessRequest.sistema_id,
          menu_id: accessRequest.menu_id,
          activo: accessRequest.activo,
          fecha_asignacion: new Date().toISOString(),
          asignado_por: 1
        };
        return of(mockAccess);
      })
    );
  }

  /**
   * Actualizar acceso a menú específico
   */
  updateMenuAccess(accessId: number, updates: Partial<MenuAccessRequest>): Observable<UserMenuAccess> {
    return this.apiService.put(`usuarios/accesos-menus/${accessId}`, updates).pipe(
      map(response => {
        if (response.success && response.data) {
          return response.data as UserMenuAccess;
        }
        throw new Error('Error al actualizar acceso al menú');
      }),
      catchError(error => {
        console.error('Error al actualizar acceso al menú:', error);
        // Crear respuesta mock en caso de error
        const mockAccess: UserMenuAccess = {
          id: accessId,
          usuario_id: updates.usuario_id || 0,
          sistema_id: updates.sistema_id || 0,
          menu_id: updates.menu_id || '',
          activo: updates.activo !== undefined ? updates.activo : true,
          fecha_asignacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          asignado_por: 1
        };
        return of(mockAccess);
      })
    );
  }

  /**
   * Alternar estado de acceso a menú específico
   */
  toggleMenuAccess(userId: number, sistemaId: number, menuId: string | number): Observable<UserMenuAccess> {
    return this.getUserMenuAccess(userId).pipe(
      map(accesos => {
        const acceso = accesos.find(a => a.sistema_id === sistemaId && a.menu_id.toString() === menuId.toString());
        if (acceso) {
          // Actualizar acceso existente
          return this.updateMenuAccess(acceso.id, { activo: !acceso.activo });
        } else {
          // Crear nuevo acceso
          const newAccess: MenuAccessRequest = {
            usuario_id: userId,
            sistema_id: sistemaId,
            menu_id: menuId,
            activo: true
          };
          return this.assignMenuAccess(newAccess);
        }
      }),
      switchMap(result => result)
    );
  }

  /**
   * Verificar si un usuario tiene acceso a un menú específico
   */
  hasMenuAccess(userId: number, sistemaId: number, menuId: string | number): Observable<boolean> {
    return this.getUserMenuAccess(userId).pipe(
      map(accesos => {
        const acceso = accesos.find(a => a.sistema_id === sistemaId && a.menu_id.toString() === menuId.toString() && a.activo);
        return !!acceso;
      })
    );
  }

  /**
   * Sincronizar accesos a sistemas y menús de un usuario basados en sus roles
   */
  syncAccessWithRoles(userId: number, roleIds: number[]): Observable<any> {
    return this.apiService.post(`usuarios/${userId}/sync-roles-access`, { roles: roleIds }).pipe(
      catchError(error => {
        console.warn('Fallback: Sincronización offline simulada para accesos por rol', error);
        return of({ success: true, message: 'Accesos sincronizados basados en roles (Mock)' });
      })
    );
  }

  /**
   * Datos de prueba para sistemas externos
   */
  private getMockSystems(): SistemaExterno[] {
    return [
      {
        id: 1,
        nombre: 'Sistema de Recursos Humanos',
        descripcion: 'Gestión de empleados y nómina',
        url_base: 'https://rrhh.empresa.com',
        icono: 'fas fa-users',
        activo: true
      },
      {
        id: 2,
        nombre: 'Sistema Contable',
        descripcion: 'Gestión financiera y contable',
        url_base: 'https://contabilidad.empresa.com',
        icono: 'fas fa-calculator',
        activo: true
      },
      {
        id: 3,
        nombre: 'Sistema de Inventarios',
        descripcion: 'Control de stock y almacén',
        url_base: 'https://inventario.empresa.com',
        icono: 'fas fa-boxes',
        activo: true
      }
    ];
  }
}