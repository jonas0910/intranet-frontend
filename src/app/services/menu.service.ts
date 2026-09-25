import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, Subject } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface MenuItem {
  id?: number;
  nombre?: string;
  titulo?: string;
  url?: string;
  ruta?: string;
  route?: string;
  icono?: string;
  orden?: number;
  activo?: boolean;
  tipo?: 'interno' | 'externo';
  tipo_ruta?: 'interna' | 'externa';
  parent_id?: number | null;
  nivel?: number;
  color?: string;
  gradient?: string;
  hover_color?: string;
  primary_color?: string;
  secondary_color?: string;
  text_color?: string;
  border_color?: string;
  sistema_externo?: {
    id: number;
    nombre: string;
    codigo: string;
    url_base: string;
  };
  color_info?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    success?: string;
    gradient_start?: string;
    gradient_end?: string;
    gradient_direction?: string;
    hover_color?: string;
    text_color?: string;
    border_color?: string;
    background?: string;
    box_shadow?: string;
    border_radius?: string;
    transition?: string;
  };
  submenus?: MenuItem[];
  submenu?: MenuItem[];
  permisos_requeridos?: string[];
}

export interface MenuResponse {
  success: boolean;
  data: {
    menu: MenuItem[];
    usuario: any;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MenuService {
  private apiUrl = environment.apiUrl;
  private jsonHeaders = new HttpHeaders({
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  });

  /** Subject para forzar recarga de menús del sidebar (Subject evita emisión inicial que puede causar ciclos) */
  private menuRefreshSubject = new Subject<void>();

  /** Observable que emite cuando los menús deben recargarse */
  menuRefresh$ = this.menuRefreshSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Forzar recarga de menús en el sidebar.
   * Llamar después de agregar o eliminar un sistema integrado.
   */
  triggerMenuRefresh(): void {
    this.menuRefreshSubject.next();
  }

  /** Obtiene el menú personalizado del usuario (endpoint público) */
  obtenerMenuUsuario(): Observable<MenuItem[]> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/menu/public`, { headers: this.jsonHeaders }).pipe(
      map(response => {
        let menus: MenuItem[] = [];
        if (response.success && response.data) {
          menus = this.ordenarMenu(this.normalizeMenuData(response.data));
        }
        return menus;
      }),
      catchError(() => of([]))
    );
  }

  /** Obtiene todos los menús de la tabla menus (endpoint público) */
  obtenerMenusPublicos(): Observable<MenuItem[]> {
    return this.http.get<any>(`${this.apiUrl}/menus/public`, { headers: this.jsonHeaders }).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.ordenarMenu(this.normalizeMenuData(response.data));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /** Obtiene menús integrados de forma jerárquica (filtrados por accesos del usuario autenticado) */
  obtenerMenuIntegrado(): Observable<MenuItem[]> {
    return this.http.get<any>(`${this.apiUrl}/usuarios/menu-integrado`, { headers: this.jsonHeaders }).pipe(
      map(response => {
        if (response.success && response.data) {
          return this.ordenarMenu(this.normalizeMenuData(response.data));
        }
        return [];
      }),
      catchError(() => of([]))
    );
  }

  /** Normaliza los datos del menú del backend */
  private normalizeMenuData(menuData: any[]): MenuItem[] {
    if (!Array.isArray(menuData)) return [];
    return menuData.map((item, index) => this.normalizeMenuItem(item, index));
  }

  /** Normaliza un item de menú recursivamente (soporta N niveles) */
  private normalizeMenuItem(item: any, index: number): MenuItem {
    const menuItem: MenuItem = {
      id: item.id || index,
      nombre: item.titulo || item.nombre || item.name || item.display_name,
      url: item.ruta || item.url,
      icono: item.icono || item.icon,
      orden: item.orden || item.order || index,
      activo: item.activo !== false,
      tipo: item.tipo || 'interno',
      sistema_externo: item.sistema_externo,
      parent_id: item.parent_id,
      nivel: item.nivel,
      color_info: item.color_info,
      color: item.color,
      gradient: item.gradient,
      hover_color: item.hover_color,
      primary_color: item.primary_color,
      secondary_color: item.secondary_color,
      text_color: item.text_color,
      border_color: item.border_color,
      permisos_requeridos: item.permisos_requeridos
    };

    if (item.submenus && Array.isArray(item.submenus) && item.submenus.length > 0) {
      menuItem.submenus = item.submenus.map((sub: any, subIdx: number) =>
        this.normalizeMenuItem(sub, subIdx)
      );
    }

    return menuItem;
  }

  /** Ordena el menú por el campo orden */
  private ordenarMenu(menu: MenuItem[]): MenuItem[] {
    return [...menu].sort((a, b) => (a.orden || 999) - (b.orden || 999));
  }

  /** Verifica si un elemento del menú tiene submenús */
  tieneSubmenus(item: MenuItem): boolean {
    return !!(item.submenus && item.submenus.length > 0);
  }

  /** Obtiene la URL del elemento del menú */
  obtenerUrl(item: MenuItem): string {
    if ((item as any).ruta && (item as any).ruta !== '#') return (item as any).ruta;
    if (item.url && item.url !== '#') return item.url;
    if (item.tipo === 'externo' && item.sistema_externo) {
      return `/sistemas/${item.sistema_externo.codigo}`;
    }

    const nombre = (item as any).titulo || item.nombre;
    if (nombre) {
      const lower = nombre.toLowerCase();
      if (lower.includes('usuarios')) return '/usuarios';
      if (lower.includes('roles')) return '/roles';
      if (lower.includes('empleados')) return '/empleados';
      if (lower.includes('dashboard')) return '/dashboard';
    }

    return '#';
  }

  /** Obtiene el icono del elemento del menú */
  obtenerIcono(item: MenuItem): string {
    if (item.icono) return item.icono;
    if (item.tipo === 'externo') return 'fas fa-external-link-alt';
    return 'fas fa-circle';
  }

  /** Crea un nuevo menú */
  crearMenu(menuData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sistema-menus`, menuData, { headers: this.jsonHeaders }).pipe(
      catchError(error => { throw error; })
    );
  }

  /** Actualiza un menú existente */
  actualizarMenu(id: number, menuData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/sistema-menus/${id}`, menuData, { headers: this.jsonHeaders }).pipe(
      catchError(error => { throw error; })
    );
  }

  /** Elimina un menú */
  eliminarMenu(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/sistema-menus/${id}`, { headers: this.jsonHeaders }).pipe(
      catchError(error => { throw error; })
    );
  }

  /** Cambia el estado activo/inactivo de un menú */
  toggleMenu(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/sistema-menus/${id}/toggle`, {}, { headers: this.jsonHeaders }).pipe(
      catchError(error => { throw error; })
    );
  }

  /** Obtiene estadísticas de menús */
  obtenerEstadisticas(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/menus/statistics/public`, { headers: this.jsonHeaders }).pipe(
      catchError(() => of({ success: false, data: null }))
    );
  }

  /** Obtiene sistemas externos disponibles */
  obtenerSistemasExternos(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sistemas-externos`, { headers: this.jsonHeaders }).pipe(
      catchError(() => of({ success: false, data: [] }))
    );
  }

  /** Obtiene un menú específico por ID */
  obtenerMenuPorId(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/sistema-menus/${id}/public`, { headers: this.jsonHeaders }).pipe(
      catchError(() => of({ success: false, data: null }))
    );
  }

  /** Obtiene menús de un sistema específico */
  getMenusBySystem(sistemaId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/menus-unificados/sistema/${sistemaId}/estructura`, { headers: this.jsonHeaders }).pipe(
      catchError(() => of({ success: false, data: [] }))
    );
  }

  /**
   * Menús marcados como consumibles por toda la intranet (visible_en_intranet).
   * Para la sección "Para todo el personal" del sidebar.
   */
  getMenusIntranetConsumibles(): Observable<{ success: boolean; data: IntranetConsumibleMenuItem[] }> {
    return this.http.get<{ success: boolean; data: IntranetConsumibleMenuItem[]; message?: string }>(
      `${this.apiUrl}/menus/intranet-consumibles`,
      { headers: this.jsonHeaders }
    ).pipe(
      catchError(() => of({ success: false, data: [] }))
    );
  }

  /**
   * Menús dinámicos de INTRANET (desde menu_intranet).
   * Usado por el sidebar para la sección INTRANET.
   */
  getMenusIntranetDinamicos(): Observable<{ success: boolean; data: MenuIntranetSidebarItem[] }> {
    return this.http.get<{ success: boolean; data: MenuIntranetSidebarItem[]; message?: string }>(
      `${this.apiUrl}/menus/intranet`,
      { headers: this.jsonHeaders }
    ).pipe(
      catchError(() => of({ success: false, data: [] }))
    );
  }
}

export interface MenuIntranetSidebarItem {
  id: number;
  codigo: string;
  nombre: string;
  icono: string;
  ruta: string | null;
  orden: number;
  tiene_hijos: boolean;
  hijos: MenuIntranetSidebarHijo[];
}

export interface MenuIntranetSidebarHijo {
  id: number;
  nombre: string;
  ruta: string;
  query_params?: Record<string, string>;
  icono: string;
  orden: number;
  hijos: { id: number; nombre: string; ruta: string; query_params?: Record<string, string>; icono: string; orden: number }[];
}

export interface IntranetConsumibleMenuItem {
  id: number;
  nombre: string;
  ruta: string;
  route?: string;
  icono: string;
  orden: number;
  sistema_nombre?: string;
  sistema_codigo?: string;
}
