import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SistemaExterno {
  id: number;
  nombre: string;
  descripcion?: string;
  url_base: string;
  icono?: string;
  activo: boolean;
  menus?: SistemaMenu[];
}

export interface SistemaMenu {
  id: number;
  sistema_externo_id: number;
  nombre: string;
  descripcion?: string;
  url: string;
  icono?: string;
  orden: number;
  activo: boolean;
  menu_padre_id?: number;
  submenus?: SistemaMenu[];
}

export interface RolMenu {
  id: number;
  role_id: number;
  sistema_menu_id: number;
  permisos_adicionales: string[];
  activo: boolean;
  orden: number;
  role?: any;
  sistemaMenu?: any;
}

@Injectable({
  providedIn: 'root'
})
export class MenusService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Sistemas Externos
  getSistemasExternos(): Observable<any> {
    return this.http.get(`${this.apiUrl}/sistemas-externos`);
  }

  getSistemaExterno(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/sistemas-externos/${id}`);
  }

  createSistemaExterno(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sistemas-externos`, data);
  }

  updateSistemaExterno(id: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sistemas-externos/${id}`, data);
  }

  deleteSistemaExterno(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sistemas-externos/${id}`);
  }

  // Menús
  getMenus(sistemaId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus`);
  }

  createMenu(sistemaId: number, data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus`, data);
  }

  updateMenu(sistemaId: number, menuId: number, data: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus/${menuId}`, data);
  }

  deleteMenu(sistemaId: number, menuId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus/${menuId}`);
  }

  // Accesos
  getMenuAccess(sistemaId: number, menuId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus/${menuId}/accesos`);
  }

  updateMenuAccess(sistemaId: number, menuId: number, accesos: any[]): Observable<any> {
    return this.http.put(`${this.apiUrl}/sistemas-externos/${sistemaId}/menus/${menuId}/accesos`, { accesos });
  }

  // Utilidades
  generarUrlConSSO(sistema: SistemaExterno, userId: number): string {
    const baseUrl = sistema.url_base;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}user_id=${userId}&sistema=${sistema.id}`;
  }

  obtenerIcono(menu: SistemaMenu): string {
    return menu.icono || 'fas fa-link';
  }

  obtenerUrl(menu: SistemaMenu): string {
    if (menu.url.startsWith('http')) {
      return menu.url;
    }
    return `/${menu.url.replace(/^\//, '')}`;
  }
}
