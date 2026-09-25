import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

export interface MenuPermission {
  sistema_id: number;
  menu_id: number;
  permisos: {
    lectura: boolean;
    escritura: boolean;
    eliminacion: boolean;
    configuracion: boolean;
    exportacion: boolean;
    auditoria: boolean;
  };
  activo: boolean;
}

export interface UserMenuPermissions {
  usuario_id: number;
  permisos: MenuPermission[];
}

@Injectable({
  providedIn: 'root'
})
export class MenuPermissionsService {
  private apiUrl = 'http://localhost:8000/api';
  private userPermissionsSubject = new BehaviorSubject<UserMenuPermissions | null>(null);
  public userPermissions$ = this.userPermissionsSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los permisos del usuario actual
   */
  getUserPermissions(userId?: number): Observable<UserMenuPermissions> {
    const currentUserId = userId || this.getCurrentUserId();

    if (!currentUserId || currentUserId === 0 || isNaN(currentUserId)) {
      return of({ usuario_id: 0, permisos: [] });
    }

    return this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/usuarios/${currentUserId}/permisos-con-menus`)
      .pipe(
        map(response => {
          const permisos: MenuPermission[] = [];

          if (response.success && response.data) {
            const rawPermisos = response.data.permisos?.totales;
            const permisosUsuario: string[] = Array.isArray(rawPermisos) ? rawPermisos : [];

            const sistemaPlanillasId = 116;
            const tienePermisosPlanillas = permisosUsuario.some((p: string) =>
              typeof p === 'string' && p.includes('planillas')
            );

            if (tienePermisosPlanillas) {
              permisos.push({
                sistema_id: sistemaPlanillasId,
                menu_id: 0,
                permisos: {
                  lectura: true, escritura: true, eliminacion: true,
                  configuracion: true, exportacion: true, auditoria: true
                },
                activo: true
              });
            }
          }

          return { usuario_id: currentUserId, permisos } as UserMenuPermissions;
        }),
        tap(permissions => this.userPermissionsSubject.next(permissions)),
        catchError(() => of({ usuario_id: currentUserId, permisos: [] as MenuPermission[] }))
      );
  }

  /**
   * Obtener el ID del usuario actual
   */
  private getCurrentUserId(): number | null {
    try {
      // Buscar en localStorage (currentUser)
      const userStr = localStorage.getItem('currentUser');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user?.id) return user.id;
        } catch { /* ignore */ }
      }

      // Intentar decodificar token JWT
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const parts = token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            const uid = payload.sub || payload.user_id || payload.id;
            if (uid) return uid;
          }
        } catch { /* ignore */ }
      }

      // Buscar en authUser
      const authUser = localStorage.getItem('authUser');
      if (authUser) {
        try {
          const user = JSON.parse(authUser);
          if (user?.id) return user.id;
        } catch { /* ignore */ }
      }

      // Fallback: ID 1 en desarrollo
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 1;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Verificar si el usuario tiene un permiso específico en un menú
   */
  hasMenuPermission(sistemaId: number, menuId: number, permission: string): boolean {
    const userPermissions = this.userPermissionsSubject.value;
    if (!userPermissions) return false;

    const menuPermission = userPermissions.permisos.find(p =>
      p.sistema_id === sistemaId && p.menu_id === menuId && p.activo
    );

    if (!menuPermission) return false;
    return menuPermission.permisos[permission as keyof typeof menuPermission.permisos] || false;
  }

  /**
   * Verificar si el usuario puede ver un menú (permiso de lectura)
   */
  canViewMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'lectura');
  }

  /**
   * Verificar si el usuario puede editar un menú (permiso de escritura)
   */
  canEditMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'escritura');
  }

  /**
   * Verificar si el usuario puede eliminar un menú (permiso de eliminación)
   */
  canDeleteMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'eliminacion');
  }

  /**
   * Verificar si el usuario puede configurar un menú (permiso de configuración)
   */
  canConfigureMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'configuracion');
  }

  /**
   * Verificar si el usuario puede exportar datos de un menú (permiso de exportación)
   */
  canExportMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'exportacion');
  }

  /**
   * Verificar si el usuario puede auditar un menú (permiso de auditoría)
   */
  canAuditMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'auditoria');
  }

  /**
   * Verificar si el usuario puede gestionar un menú (permiso de configuración + escritura)
   * Un usuario puede gestionar si tiene permisos de configuración Y escritura
   */
  canManageMenu(sistemaId: number, menuId: number): boolean {
    const canConfigure = this.hasMenuPermission(sistemaId, menuId, 'configuracion');
    const canEdit = this.hasMenuPermission(sistemaId, menuId, 'escritura');
    return canConfigure && canEdit;
  }

  /**
   * Verificar si el usuario puede aprobar un menú (permiso de configuración)
   * La aprobación requiere permisos de configuración
   */
  canApproveMenu(sistemaId: number, menuId: number): boolean {
    return this.hasMenuPermission(sistemaId, menuId, 'configuracion');
  }

  /**
   * Verificar si el usuario tiene permisos administrativos completos
   * Requiere todos los permisos: lectura, escritura, configuración, eliminación
   */
  canAdminMenu(sistemaId: number, menuId: number): boolean {
    const permissions = this.getMenuPermissions(sistemaId, menuId);
    if (!permissions) return false;
    
    return permissions.lectura && 
           permissions.escritura && 
           permissions.configuracion && 
           permissions.eliminacion;
  }

  /**
   * Verificar si el usuario puede supervisar un menú
   * Requiere permisos de lectura, escritura y configuración (sin eliminación)
   */
  canSuperviseMenu(sistemaId: number, menuId: number): boolean {
    const permissions = this.getMenuPermissions(sistemaId, menuId);
    if (!permissions) return false;
    
    return permissions.lectura && 
           permissions.escritura && 
           permissions.configuracion;
  }

  /**
   * Obtener todos los permisos para un menú específico
   */
  getMenuPermissions(sistemaId: number, menuId: number): MenuPermission['permisos'] | null {
    const userPermissions = this.userPermissionsSubject.value;
    if (!userPermissions) {
      return null;
    }

    const menuPermission = userPermissions.permisos.find(p => 
      p.sistema_id === sistemaId && p.menu_id === menuId && p.activo
    );

    return menuPermission ? menuPermission.permisos : null;
  }

  /**
   * Filtrar menús según los permisos del usuario
   */
  filterMenusByPermissions(menus: any[], sistemaId: number): any[] {
    const userPermissions = this.userPermissionsSubject.value;
    if (!userPermissions) return [];
    return menus.filter(menu => this.canViewMenu(sistemaId, menu.id));
  }

  /**
   * Asignar permisos a un menú para el usuario actual
   */
  assignMenuPermissions(sistemaId: number, menuId: number, permisos: MenuPermission['permisos']): Observable<any> {
    return this.http.post(`${this.apiUrl}/user/menu-permissions`, {
      sistema_id: sistemaId,
      menu_id: menuId,
      permisos: permisos
    }).pipe(
      tap(() => {
        // Recargar permisos después de asignar
        this.getUserPermissions().subscribe();
      })
    );
  }

  /**
   * Revocar permisos de un menú para el usuario actual
   */
  revokeMenuPermissions(sistemaId: number, menuId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/user/menu-permissions/${sistemaId}/${menuId}`)
      .pipe(
        tap(() => {
          // Recargar permisos después de revocar
          this.getUserPermissions().subscribe();
        })
      );
  }

  /**
   * Obtener el estado actual de los permisos
   */
  getCurrentPermissions(): UserMenuPermissions | null {
    return this.userPermissionsSubject.value;
  }

  /**
   * Limpiar permisos (útil para logout)
   */
  clearPermissions(): void {
    this.userPermissionsSubject.next(null);
  }
}
