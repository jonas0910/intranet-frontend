import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';
import { RoleAccess, RoleAccessStatistics } from '../interfaces/role-access.interface';

@Injectable({
  providedIn: 'root'
})
export class RoleAccessService {
  constructor(private apiService: ApiService) {}

  /**
   * Obtener todos los accesos de roles
   */
  getRoleAccesses(page: number = 1, perPage: number = 15): Observable<ApiResponse<any>> {
    return this.apiService.get(`rol-menus?page=${page}&per_page=${perPage}`);
  }

  /**
   * Obtener un acceso específico por ID
   */
  getRoleAccess(id: number): Observable<ApiResponse<RoleAccess>> {
    return this.apiService.get(`rol-menus/${id}`);
  }

  /**
   * Crear un nuevo acceso de rol
   */
  createRoleAccess(access: RoleAccess): Observable<ApiResponse<RoleAccess>> {
    return this.apiService.post('rol-menus', access);
  }

  /**
   * Actualizar un acceso de rol existente
   */
  updateRoleAccess(id: number, access: Partial<RoleAccess>): Observable<ApiResponse<RoleAccess>> {
    return this.apiService.put(`rol-menus/${id}`, access);
  }

  /**
   * Eliminar un acceso de rol
   */
  deleteRoleAccess(id: number): Observable<ApiResponse<any>> {
    return this.apiService.delete(`rol-menus/${id}`);
  }

  /**
   * Cambiar el estado activo/inactivo de un acceso
   */
  toggleRoleAccessStatus(id: number, activo: boolean): Observable<ApiResponse<RoleAccess>> {
    return this.apiService.put(`rol-menus/${id}`, { activo });
  }

  /**
   * Sincronizar accesos para un rol y sistema específicos
   */
  syncRoleAccess(roleId: number, sistemaId: number, menuIds: number[]): Observable<ApiResponse<any>> {
    return this.apiService.post('rol-menus/sync-role-access', {
      role_id: roleId,
      sistema_id: sistemaId,
      menu_ids: menuIds
    });
  }

  /**
   * Obtener estadísticas de accesos
   */
  getAccessStatistics(): Observable<ApiResponse<RoleAccessStatistics>> {
    return this.apiService.get('rol-menus/statistics');
  }

  /**
   * Obtener accesos por rol específico
   */
  getAccessesByRole(roleId: number): Observable<ApiResponse<RoleAccess[]>> {
    return this.apiService.get(`roles/${roleId}/accesos`);
  }

  /**
   * Obtener accesos por sistema específico
   */
  getAccessesBySystem(sistemaId: number): Observable<ApiResponse<RoleAccess[]>> {
    return this.apiService.get(`sistemas-externos/${sistemaId}/accesos`);
  }

  /**
   * Verificar si un rol tiene acceso a un menú específico
   */
  checkRoleMenuAccess(roleId: number, menuId: number): Observable<ApiResponse<boolean>> {
    return this.apiService.get(`roles/${roleId}/menus/${menuId}/access`);
  }

  /**
   * Obtener permisos adicionales disponibles
   */
  getAvailablePermissions(): Observable<ApiResponse<string[]>> {
    return this.apiService.get('permisos/disponibles');
  }
}
