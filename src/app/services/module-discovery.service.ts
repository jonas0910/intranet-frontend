import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ModuleInfo {
  name: string;
  path: string;
  display_name: string;
  description: string;
  version: string;
  status: string;
  menus: MenuItem[];
  has_menu_config: boolean;
  patron_data?: any; // ✅ Agregado para compatibilidad con el sistema de jerarquía
}

export interface MenuItem {
  name: string;
  route: string;
  icon: string;
  order: number;
  active: boolean;
  permissions: string[];
}

export interface RouteInfo {
  method: string;
  path: string;
}

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  modified: string;
}

export interface ModuleRegistration {
  module_name: string;
  display_name: string;
  description?: string;
  url_base?: string;
  icon?: string;
  color?: string;
  menus?: MenuItem[]; // ✅ NUEVO - Incluir menús del módulo (con campo 'route')
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ModuleDiscoveryService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Descubrir todos los módulos disponibles (timeout 45s para evitar cuelgues)
   */
  discoverModules(): Observable<ApiResponse<ModuleInfo[]>> {
    return this.http.get<ApiResponse<ModuleInfo[]>>(`${this.apiUrl}/modules/discover`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(timeout(45000));
  }

  /**
   * Obtener menús de un módulo específico
   */
  getModuleMenus(moduleName: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/modules/${moduleName}/menus`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Registrar un módulo como sistema integrado
   */
  registerModule(moduleData: ModuleRegistration): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/modules/register`, moduleData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * ✅ NUEVO: Registrar módulo usando el servicio unificado del backend
   */
  registerModuleDirect(moduleData: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/modules/register`, moduleData, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }
}
