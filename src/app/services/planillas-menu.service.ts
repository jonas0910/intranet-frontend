import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface PlanillasMenuItem {
  id: number;
  nombre: string;
  url: string;
  icono: string;
  orden: number;
  activo: boolean;
  permisos_requeridos: string[];
  submenus?: PlanillasMenuItem[];
}

export interface PlanillasMenuResponse {
  success: boolean;
  data: {
    menu: PlanillasMenuItem[];
    usuario: any;
  };
  message?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PlanillasMenuService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene el menú específico del módulo de Planillas (endpoint público)
   */
  obtenerMenuPlanillas(): Observable<PlanillasMenuItem[]> {
    console.log('🔄 Cargando menú de Planillas desde:', `${this.apiUrl}/planillas/menu/public`);
    
    return this.http.get<any>(`${this.apiUrl}/planillas/menu/public`, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }).pipe(
      map(response => {
        console.log('✅ Respuesta del backend:', response);
        if (response.success && response.data?.menu) {
          const menuNormalizado = this.normalizePlanillasMenuData(response.data.menu);
          console.log('📋 Menú normalizado:', menuNormalizado);
          return menuNormalizado;
        }
        console.log('⚠️ Usando menú de ejemplo - respuesta no válida');
        return this.obtenerMenuPlanillasEjemplo();
      }),
      catchError(error => {
        console.error('❌ Error obteniendo menú de Planillas:', error);
        console.log('🔄 Usando menú de ejemplo como fallback');
        return of(this.obtenerMenuPlanillasEjemplo());
      })
    );
  }

  /**
   * Menú de ejemplo para Planillas cuando el backend no está disponible
   */
  private obtenerMenuPlanillasEjemplo(): PlanillasMenuItem[] {
    return [
      {
        id: 1,
        nombre: 'Dashboard Personal',
        url: '/planillas/dashboard-personal',
        icono: 'fas fa-tachometer-alt',
        orden: 1,
        activo: true,
        permisos_requeridos: ['planillas.dashboard.view']
      },
      {
        id: 2,
        nombre: 'Empleados',
        url: '/planillas/empleados',
        icono: 'fas fa-users',
        orden: 2,
        activo: true,
        permisos_requeridos: ['planillas.empleados.view']
      },
      {
        id: 3,
        nombre: 'Nóminas ***',
        url: '/planillas/nominas',
        icono: 'fas fa-file-invoice-dollar',
        orden: 3,
        activo: true,
        permisos_requeridos: ['planillas.nominas.view']
      },
      {
        id: 4,
        nombre: 'Procesar Planillas',
        url: '/planillas/procesar',
        icono: 'fas fa-calculator',
        orden: 4,
        activo: true,
        permisos_requeridos: ['planillas.procesar.manage']
      },
      {
        id: 5,
        nombre: 'Reportes',
        url: '/planillas/reportes',
        icono: 'fas fa-chart-bar',
        orden: 5,
        activo: true,
        permisos_requeridos: ['planillas.reportes.view']
      },
      {
        id: 6,
        nombre: 'Configuración',
        url: '/planillas/configuracion',
        icono: 'fas fa-cogs',
        orden: 6,
        activo: true,
        permisos_requeridos: ['planillas.configuracion.manage']
      },
      {
        id: 7,
        nombre: 'Historial',
        url: '/planillas/historial',
        icono: 'fas fa-history',
        orden: 7,
        activo: true,
        permisos_requeridos: ['planillas.historial.view']
      },
      {
        id: 8,
        nombre: 'Generar Planilla',
        url: '/planillas/generar',
        icono: 'fas fa-plus-circle',
        orden: 8,
        activo: true,
        permisos_requeridos: ['planillas.generar.manage']
      }
    ];
  }

  /**
   * Normaliza los datos del menú de Planillas del backend
   */
  private normalizePlanillasMenuData(menuData: any[]): PlanillasMenuItem[] {
    return menuData.map((item, index) => ({
      id: item.id || index,
      nombre: item.titulo || item.nombre,
      url: item.ruta || item.url,
      icono: item.icono || 'fas fa-circle',
      orden: item.orden || index,
      activo: item.activo !== false,
      permisos_requeridos: item.permisos_requeridos || []
    }));
  }

  /**
   * Verifica si el usuario tiene permisos para acceder a un elemento del menú
   */
  tienePermiso(item: PlanillasMenuItem, permisosUsuario: string[]): boolean {
    if (!item.permisos_requeridos || item.permisos_requeridos.length === 0) {
      return true;
    }

    return item.permisos_requeridos.some(permiso => 
      permisosUsuario.includes(permiso) || 
      permisosUsuario.includes('planillas.*') ||
      permisosUsuario.includes('super.admin')
    );
  }

  /**
   * Filtra el menú según los permisos del usuario
   */
  filtrarMenuPorPermisos(menu: PlanillasMenuItem[], permisosUsuario: string[]): PlanillasMenuItem[] {
    return menu.filter(item => this.tienePermiso(item, permisosUsuario));
  }
}
