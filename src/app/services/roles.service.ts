import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Role {
  id: number;
  name: string;
  guard_name: string;
  permissions?: Permission[];
  users_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  name: string;
  guard_name: string;
}

export interface SistemaExterno {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  url_base: string;
  modo_ejecucion: 'iframe' | 'enlace_externo';
  usa_sso: boolean;
  activo: boolean;
  icono: string;
  orden: number;
  menus: SistemaMenu[];
}

export interface SistemaMenu {
  id: number;
  sistema_id: number;
  nombre: string;
  ruta: string;
  icono: string;
  parent_id?: number;
  orden: number;
  permisos_requeridos: string[];
  activo: boolean;
  children?: SistemaMenu[];
}

export interface RolMenu {
  id: number;
  role_id: number;
  sistema_menu_id: number;
  permisos_adicionales: string[];
  activo: boolean;
  orden: number;
  sistemaMenu?: SistemaMenu;
}

export interface MenuAccess {
  sistema_menu_id: number;
  activo: boolean;
  permisos_adicionales: string[];
  orden: number;
}

export interface RoleStatistics {
  total_roles: number;
  total_permissions: number;
  total_users: number;
  roles_with_users: Array<{id: number, name: string, users_count: number}>;
  roles_with_permissions: Array<{id: number, name: string, permissions_count: number}>;
}

@Injectable({
  providedIn: 'root'
})
export class RolesService {
  private apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) { }

  // Obtener todos los roles
  getRoles(): Observable<{success: boolean, data: Role[]}> {
    return this.http.get<{success: boolean, data: Role[]}>(this.apiUrl);
  }

  // Obtener un rol específico con sus accesos
  getRole(id: number): Observable<{success: boolean, data: {role: Role, accesos_menus: RolMenu[], sistemas_externos: SistemaExterno[]}}> {
    return this.http.get<{success: boolean, data: {role: Role, accesos_menus: RolMenu[], sistemas_externos: SistemaExterno[]}}>(`${this.apiUrl}/${id}/accesos`);
  }

  // Crear un nuevo rol
  createRole(role: {name: string, guard_name?: string, permissions?: string[]}): Observable<{success: boolean, message: string, data: Role}> {
    return this.http.post<{success: boolean, message: string, data: Role}>(this.apiUrl, role);
  }

  // Actualizar un rol
  updateRole(id: number, role: {name: string, guard_name?: string, permissions?: string[]}): Observable<{success: boolean, message: string, data: Role}> {
    return this.http.put<{success: boolean, message: string, data: Role}>(`${this.apiUrl}/${id}`, role);
  }

  // Eliminar un rol
  deleteRole(id: number): Observable<{success: boolean, message: string}> {
    return this.http.delete<{success: boolean, message: string}>(`${this.apiUrl}/${id}`);
  }

  // Obtener todos los permisos
  getPermissions(): Observable<{success: boolean, data: Permission[]}> {
    return this.http.get<{success: boolean, data: Permission[]}>(`${environment.apiUrl}/permisos`);
  }

  // Asignar permisos a un rol
  assignPermissions(roleId: number, permissions: string[]): Observable<{success: boolean, message: string, data: Role}> {
    return this.http.put<{success: boolean, message: string, data: Role}>(`${this.apiUrl}/${roleId}/permisos`, { permissions });
  }

  // Actualizar accesos a menús de un rol
  updateMenuAccess(roleId: number, accesos: MenuAccess[]): Observable<{success: boolean, message: string}> {
    return this.http.put<{success: boolean, message: string}>(`${this.apiUrl}/${roleId}/accesos`, { accesos });
  }

  // Obtener resumen de accesos por rol
  getMenuAccessSummary(): Observable<{success: boolean, data: any[]}> {
    return this.http.get<{success: boolean, data: any[]}>(`${this.apiUrl}/accesos/resumen`);
  }

  // Obtener estadísticas del sistema
  getStatistics(): Observable<{success: boolean, data: RoleStatistics}> {
    return this.http.get<{success: boolean, data: RoleStatistics}>(`${this.apiUrl}/estadisticas`);
  }

  // Agrupar menús por sistema para facilitar la gestión
  groupMenusBySistema(sistemas: SistemaExterno[]): SistemaExterno[] {
    return sistemas.map(sistema => ({
      ...sistema,
      menus: this.buildMenuTree(sistema.menus)
    }));
  }

  // Construir árbol de menús (padre-hijo)
  private buildMenuTree(menus: SistemaMenu[]): SistemaMenu[] {
    const menuMap = new Map<number, SistemaMenu>();
    const rootMenus: SistemaMenu[] = [];

    // Crear mapa de menús
    menus.forEach(menu => {
      menuMap.set(menu.id, { ...menu, children: [] });
    });

    // Construir jerarquía
    menus.forEach(menu => {
      if (menu.parent_id) {
        const parent = menuMap.get(menu.parent_id);
        if (parent) {
          parent.children!.push(menuMap.get(menu.id)!);
        }
      } else {
        rootMenus.push(menuMap.get(menu.id)!);
      }
    });

    return rootMenus.sort((a, b) => a.orden - b.orden);
  }

  // Verificar si un menú está activo para un rol
  isMenuActiveForRole(menuId: number, accesos: RolMenu[]): boolean {
    return accesos.some(acceso => 
      acceso.sistema_menu_id === menuId && acceso.activo
    );
  }

  // Obtener acceso de un menú para un rol
  getMenuAccessForRole(menuId: number, accesos: RolMenu[]): RolMenu | null {
    return accesos.find(acceso => acceso.sistema_menu_id === menuId) || null;
  }

  // Generar estructura de accesos para actualización
  generateAccessStructure(sistemas: SistemaExterno[], accesos: RolMenu[]): MenuAccess[] {
    const accessStructure: MenuAccess[] = [];

    sistemas.forEach(sistema => {
      sistema.menus.forEach(menu => {
        const existingAccess = this.getMenuAccessForRole(menu.id, accesos);
        accessStructure.push({
          sistema_menu_id: menu.id,
          activo: existingAccess ? existingAccess.activo : false,
          permisos_adicionales: existingAccess ? existingAccess.permisos_adicionales : [],
          orden: existingAccess ? existingAccess.orden : menu.orden
        });

        // Agregar menús hijos
        if (menu.children) {
          menu.children.forEach(childMenu => {
            const existingChildAccess = this.getMenuAccessForRole(childMenu.id, accesos);
            accessStructure.push({
              sistema_menu_id: childMenu.id,
              activo: existingChildAccess ? existingChildAccess.activo : false,
              permisos_adicionales: existingChildAccess ? existingChildAccess.permisos_adicionales : [],
              orden: existingChildAccess ? existingChildAccess.orden : childMenu.orden
            });
          });
        }
      });
    });

    return accessStructure;
  }
}
