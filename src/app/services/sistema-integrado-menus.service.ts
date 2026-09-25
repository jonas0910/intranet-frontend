import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService, ApiResponse } from './api.service';

export interface MenuHierarchy {
  id?: number;
  name: string;
  route: string;
  icon: string;
  order: number;
  active: boolean;
  permissions: string[];
  level: number;
  nivel: number;
  description?: string;
  badge?: string;
  parent_name?: string | null;
  parent_id?: number | null;
  children?: MenuHierarchy[];
}

export interface PatronData {
  categoria: string;
  menus: MenuHierarchy[];
  ultima_actualizacion: string;
  archivo_config?: string;
  modulo?: string;
}

export interface SaveMenusResponse {
  sistema_id: number;
  menus_guardados: number;
  menus: MenuHierarchy[];
}

export interface GetMenusResponse {
  sistema_id: number;
  menus: MenuHierarchy[];
  total_menus: number;
}

@Injectable({
  providedIn: 'root'
})
export class SistemaIntegradoMenusService {

  constructor(
    private http: HttpClient,
    private apiService: ApiService
  ) {}

  /**
   * Guardar menús desde patron_data con jerarquía completa
   */
  saveMenusFromPatronData(sistemaId: number, patronData: PatronData): Observable<ApiResponse<SaveMenusResponse>> {
    console.log('🔄 Guardando menús desde patron_data', {
      sistema_id: sistemaId,
      total_menus: patronData.menus.length,
      patron_data: patronData
    });

    return this.apiService.post<SaveMenusResponse>('sistema-integrado-menus/save-from-patron-data', {
      sistema_id: sistemaId,
      patron_data: patronData
    });
  }

  /**
   * Obtener menús de un sistema con jerarquía
   */
  getSystemMenus(sistemaId: number): Observable<ApiResponse<GetMenusResponse>> {
    console.log('🔍 Obteniendo menús del sistema', { sistema_id: sistemaId });

    return this.apiService.get<GetMenusResponse>(`sistema-integrado-menus/${sistemaId}`);
  }

  /**
   * Actualizar orden de menús
   */
  updateMenuOrder(sistemaId: number, menuOrders: { [menuId: number]: number }): Observable<ApiResponse<any>> {
    console.log('🔄 Actualizando orden de menús', {
      sistema_id: sistemaId,
      menu_orders: menuOrders
    });

    return this.apiService.put('sistema-integrado-menus/update-order', {
      sistema_id: sistemaId,
      menu_orders: menuOrders
    });
  }

  /**
   * Eliminar todos los menús de un sistema
   */
  deleteSystemMenus(sistemaId: number): Observable<ApiResponse<any>> {
    console.log('🗑️ Eliminando menús del sistema', { sistema_id: sistemaId });

    return this.apiService.delete(`sistema-integrado-menus/${sistemaId}`);
  }

  /**
   * Procesar patron_data del frontend para enviar al backend
   */
  processPatronDataForBackend(patronData: any): PatronData {
    console.log('🔄 Procesando patron_data para backend', { patron_data: patronData });

    const processedMenus: MenuHierarchy[] = [];

    if (patronData.menus && Array.isArray(patronData.menus)) {
      patronData.menus.forEach((menu: any) => {
        const processedMenu: MenuHierarchy = {
          name: menu.name || 'Sin nombre',
          route: menu.route || '#',
          icon: menu.icon || 'fas fa-circle',
          order: menu.order || 1,
          active: menu.active !== false,
          permissions: menu.permissions || [],
          level: menu.level || menu.nivel || 1,
          nivel: menu.nivel || menu.level || 1,
          description: menu.description || null,
          badge: menu.badge || null,
          parent_name: menu.parent_name || null,
          parent_id: menu.parent_id || null
        };

        processedMenus.push(processedMenu);
      });
    }

    const processedPatronData: PatronData = {
      categoria: patronData.categoria || 'sistema_integrado',
      menus: processedMenus,
      ultima_actualizacion: patronData.ultima_actualizacion || new Date().toISOString(),
      archivo_config: patronData.archivo_config || null,
      modulo: patronData.modulo || null
    };

    console.log('✅ patron_data procesado para backend', {
      total_menus: processedMenus.length,
      menus_nivel_1: processedMenus.filter(m => m.nivel === 1).length,
      menus_nivel_2: processedMenus.filter(m => m.nivel === 2).length
    });

    return processedPatronData;
  }

  /**
   * Convertir menús del formulario a estructura jerárquica
   */
  convertFormMenusToHierarchy(formMenus: any[]): MenuHierarchy[] {
    console.log('🔄 Convirtiendo menús del formulario a jerarquía', { form_menus: formMenus });

    const hierarchicalMenus: MenuHierarchy[] = [];
    const menuMap = new Map<string, MenuHierarchy>();

    // Primero procesar menús principales (nivel 1)
    formMenus.forEach(menu => {
      if (menu.level === 1 || menu.nivel === 1) {
        const hierarchicalMenu: MenuHierarchy = {
          name: menu.name || 'Sin nombre',
          route: menu.route || '#',
          icon: menu.icon || 'fas fa-circle',
          order: menu.order || 1,
          active: menu.active !== false,
          permissions: menu.permissions || [],
          level: 1,
          nivel: 1,
          description: menu.description || null,
          badge: menu.badge || null,
          parent_name: null,
          parent_id: null
        };

        hierarchicalMenus.push(hierarchicalMenu);
        menuMap.set(menu.name, hierarchicalMenu);
      }
    });

    // Luego procesar submenús (nivel 2)
    formMenus.forEach(menu => {
      if (menu.level === 2 || menu.nivel === 2) {
        const hierarchicalMenu: MenuHierarchy = {
          name: menu.name || 'Sin nombre',
          route: menu.route || '/',
          icon: menu.icon || 'fas fa-circle',
          order: menu.order || 1,
          active: menu.active !== false,
          permissions: menu.permissions || [],
          level: 2,
          nivel: 2,
          description: menu.description || null,
          badge: menu.badge || null,
          parent_name: menu.parent_name || null,
          parent_id: null // Se asignará después cuando se cree en BD
        };

        hierarchicalMenus.push(hierarchicalMenu);
      }
    });

    console.log('✅ Menús convertidos a jerarquía', {
      total_menus: hierarchicalMenus.length,
      menus_nivel_1: hierarchicalMenus.filter(m => m.nivel === 1).length,
      menus_nivel_2: hierarchicalMenus.filter(m => m.nivel === 2).length
    });

    return hierarchicalMenus;
  }

  /**
   * Validar estructura de patron_data
   */
  validatePatronData(patronData: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!patronData) {
      errors.push('patron_data es requerido');
      return { valid: false, errors };
    }

    if (!patronData.menus || !Array.isArray(patronData.menus)) {
      errors.push('patron_data.menus debe ser un array');
      return { valid: false, errors };
    }

    if (patronData.menus.length === 0) {
      errors.push('patron_data.menus no puede estar vacío');
      return { valid: false, errors };
    }

    // Validar cada menú
    patronData.menus.forEach((menu: any, index: number) => {
      if (!menu.name) {
        errors.push(`Menú ${index + 1}: name es requerido`);
      }
      if (!menu.route) {
        errors.push(`Menú ${index + 1}: route es requerido`);
      }
      if (!menu.icon) {
        errors.push(`Menú ${index + 1}: icon es requerido`);
      }
      if (menu.nivel !== 1 && menu.nivel !== 2 && menu.level !== 1 && menu.level !== 2) {
        errors.push(`Menú ${index + 1}: nivel debe ser 1 o 2`);
      }
    });

    return { valid: errors.length === 0, errors };
  }
}
