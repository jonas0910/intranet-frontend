import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { PatternService, SistemaPattern } from './pattern.service';
import { ApiService } from './api.service';

// Interfaces para la integración
export interface SistemaIntegrado {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  url_base: string;
  activo: boolean;
  sso_habilitado: boolean;
  sso_force: boolean;
  patron_id: string;
  patron_data: SistemaPattern;
  fecha_creacion: string;
  fecha_actualizacion: string;
  creado_por: number;
}

export interface SistemaFormData {
  nombre: string;
  codigo: string;
  descripcion: string;
  url_base: string;
  activo: boolean;
  sso_habilitado: boolean;
  sso_force: boolean;
  patron_file?: File; // Archivo JSON del patrón
  patron_id?: string; // ID del patrón existente
}

export interface AccesoUsuario {
  id: number;
  usuario_id: number;
  sistema_id: number;
  menu_id: string;
  permisos: string[];
  activo: boolean;
  fecha_asignacion: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemPatternIntegrationService {
  private apiUrl = 'http://localhost:8000/api';

  constructor(
    private http: HttpClient,
    private patternService: PatternService,
    private apiService: ApiService
  ) {}

  /**
   * Crear sistema integrado con patrón
   */
  createIntegratedSystem(sistemaData: SistemaFormData): Observable<SistemaIntegrado> {
    console.log('🚀 SystemPatternIntegrationService.createIntegratedSystem iniciado');
    console.log('📊 Datos recibidos:', sistemaData);
    
    // Simplificar el flujo para evitar problemas de concurrencia
    if (sistemaData.patron_file) {
      console.log('📁 Procesando archivo de patrón...');
      return this.processPatternFile(sistemaData.patron_file).pipe(
        switchMap(patronData => {
          console.log('✅ Patrón procesado desde archivo:', patronData);
          return this.createSystemWithPattern(sistemaData, patronData);
        })
      );
    } else if (sistemaData.patron_id) {
      console.log('📋 Usando patrón existente:', sistemaData.patron_id);
      return this.patternService.getPatternById(sistemaData.patron_id).pipe(
        switchMap(patronData => {
          console.log('✅ Patrón existente cargado:', patronData);
          if (!patronData) {
            console.warn('⚠️ Patrón no encontrado, creando patrón básico...');
            const patronBasico = this.createBasicPattern(sistemaData);
            return this.createSystemWithPattern(sistemaData, patronBasico);
          }
          return this.createSystemWithPattern(sistemaData, patronData);
        }),
        catchError(error => {
          console.warn('⚠️ Error al cargar patrón, creando patrón básico:', error);
          const patronBasico = this.createBasicPattern(sistemaData);
          return this.createSystemWithPattern(sistemaData, patronBasico);
        })
      );
    } else {
      console.log('🔧 Creando patrón básico...');
      const patronBasico = this.createBasicPattern(sistemaData);
      console.log('✅ Patrón básico creado:', patronBasico);
      return this.createSystemWithPattern(sistemaData, patronBasico);
    }
  }

  /**
   * Procesar jerarquía de menús para asegurar niveles y parent_id correctos
   */
  private processMenuHierarchy(menus: any[]): any[] {
    console.log('🔄 Procesando jerarquía de menús:', menus);
    
    const processedMenus: any[] = [];
    
    menus.forEach((menu, index) => {
      // Procesar menú principal (nivel 1)
      const mainMenu = {
        ...menu,
        nivel: 1,
        parent_id: null,
        orden: index + 1
      };
      
      processedMenus.push(mainMenu);
      console.log('📋 Menú principal procesado:', mainMenu);
      
      // Procesar submenús si existen (nivel 2)
      if (menu.submenus && Array.isArray(menu.submenus)) {
        menu.submenus.forEach((submenu: any, subIndex: number) => {
          const processedSubmenu = {
            ...submenu,
            nivel: 2,
            parent_id: menu.id,
            orden: subIndex + 1
          };
          
          processedMenus.push(processedSubmenu);
          console.log('📋 Submenú procesado:', processedSubmenu);
        });
      }
    });
    
    console.log('✅ Jerarquía de menús procesada completamente:', processedMenus);
    return processedMenus;
  }

  /**
   * Procesar archivo JSON del patrón
   */
  private processPatternFile(file: File): Observable<SistemaPattern> {
    return new Observable(observer => {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        try {
          const patronData = JSON.parse(e.target.result);
          
          // Validar estructura del patrón
          if (this.validatePatternStructure(patronData)) {
            observer.next(patronData);
          } else {
            observer.error(new Error('Estructura de patrón inválida'));
          }
        } catch (error) {
          observer.error(new Error('Error al procesar archivo JSON'));
        }
      };
      reader.onerror = () => observer.error(new Error('Error al leer archivo'));
      reader.readAsText(file);
    });
  }

  /**
   * Crear sistema con patrón en la base de datos
   */
  private createSystemWithPattern(sistemaData: SistemaFormData, patronData: SistemaPattern): Observable<SistemaIntegrado> {
    console.log('🔨 Creando sistema con patrón...');
    console.log('📋 Datos del sistema:', sistemaData);
    console.log('🎨 Datos del patrón:', patronData);
    
    // Procesar menús para asegurar jerarquía correcta
    const menusProcessed = this.processMenuHierarchy(patronData.menus || []);
    console.log('🔄 Menús procesados con jerarquía:', menusProcessed);
    
    const patronDataProcessed = {
      ...patronData,
      menus: menusProcessed
    };
    
    const sistemaIntegrado = {
      ...sistemaData,
      patron_id: patronData.id,
      patron_data: patronDataProcessed,
      fecha_creacion: new Date().toISOString(),
      fecha_actualizacion: new Date().toISOString(),
      creado_por: 1 // ID del usuario actual
    };

    console.log('💾 Sistema integrado preparado:', sistemaIntegrado);
    console.log('📋 Menús en sistema integrado:', sistemaIntegrado.patron_data.menus);

    // Usar ApiService que maneja fallback automáticamente
    return this.apiService.post<SistemaIntegrado>('sistemas-integrados', sistemaIntegrado).pipe(
      map(response => {
        console.log('📡 Respuesta del API:', response);
        return response.data;
      }),
      tap(sistema => console.log('✅ Sistema integrado creado exitosamente:', sistema)),
      catchError(error => {
        console.error('❌ Error al crear sistema integrado:', error);
        console.log('🔄 Creando sistema mock para modo offline...');
        
        // Crear sistema mock para modo offline
        const mockSistema: SistemaIntegrado = {
          id: Date.now(),
          nombre: sistemaData.nombre,
          codigo: sistemaData.codigo,
          descripcion: sistemaData.descripcion,
          url_base: sistemaData.url_base,
          activo: sistemaData.activo,
          sso_habilitado: sistemaData.sso_habilitado,
          sso_force: sistemaData.sso_force,
          patron_id: patronData.id,
          patron_data: patronDataProcessed,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          creado_por: 1
        };
        
        console.log('✅ Sistema mock creado:', mockSistema);
        return of(mockSistema);
      })
    );
  }

  /**
   * Crear patrón básico para sistema sin patrón
   */
  private createBasicPattern(sistemaData: SistemaFormData): SistemaPattern {
    return {
      id: `patron_${sistemaData.codigo.toLowerCase()}`,
      nombre: `Patrón ${sistemaData.nombre}`,
      codigo: sistemaData.codigo,
      descripcion: sistemaData.descripcion,
      categoria: 'sistema_interno',
      prioridad: 'media',
      estado_default: true,
      keywords: [sistemaData.codigo.toLowerCase(), 'sistema', 'interno'],
      sso_config: {
        habilitado: sistemaData.sso_habilitado,
        force: sistemaData.sso_force,
        provider: 'basic'
      },
      menus: [
        {
          id: 'menu_principal',
          nombre: 'Menú Principal',
          codigo: 'MAIN',
          descripcion: 'Menú principal del sistema',
          icono: 'fas fa-home',
          orden: 1,
          estado_default: true,
          keywords: ['principal', 'inicio'],
          permisos_requeridos: ['sistema.view'],
          submenus: []
        }
      ],
      configuracion: {
        url_base: sistemaData.url_base,
        timeout: 30000,
        retry_attempts: 3,
        cache_enabled: true
      }
    };
  }

  /**
   * Validar estructura del patrón
   */
  private validatePatternStructure(patron: any): boolean {
    console.log('🔍 Validando estructura del patrón:', patron);
    
    // Validar campos requeridos básicos
    const requiredFields = ['id', 'nombre', 'codigo'];
    const hasRequiredFields = requiredFields.every(field => 
      patron.hasOwnProperty(field) && patron[field] !== null && patron[field] !== undefined
    );
    
    if (!hasRequiredFields) {
      console.error('❌ Faltan campos requeridos en el patrón');
      return false;
    }
    
    // Validar estructura de menús si existe
    if (patron.menus && !Array.isArray(patron.menus)) {
      console.error('❌ El campo menus debe ser un array');
      return false;
    }
    
    // Validar configuración si existe
    if (patron.configuracion && typeof patron.configuracion !== 'object') {
      console.error('❌ El campo configuracion debe ser un objeto');
      return false;
    }
    
    console.log('✅ Estructura del patrón válida');
    return true;
  }

  /**
   * Obtener todos los sistemas integrados
   */
  getIntegratedSystems(): Observable<SistemaIntegrado[]> {
    console.log('🔄 Cargando sistemas integrados...');
    
    // Usar ApiService que maneja fallback automáticamente
    return this.apiService.get<SistemaIntegrado[]>('sistemas-integrados').pipe(
      map(response => {
        console.log('📡 Respuesta del API para sistemas integrados:', response);
        return response.data || [];
      }),
      tap(sistemas => console.log('✅ Sistemas integrados cargados:', sistemas.length)),
      catchError(error => {
        console.error('❌ Error al cargar sistemas integrados:', error);
        // Retornar array vacío en caso de error
        return of([]);
      })
    );
  }

  /**
   * Obtener sistema integrado por ID
   */
  getIntegratedSystemById(id: number): Observable<SistemaIntegrado | null> {
    return this.http.get<SistemaIntegrado>(`${this.apiUrl}/sistemas-integrados/${id}`).pipe(
      catchError(error => {
        console.error('❌ Error al cargar sistema integrado:', error);
        return of(null);
      })
    );
  }

  /**
   * Actualizar sistema integrado
   */
  updateIntegratedSystem(id: number, sistemaData: Partial<SistemaIntegrado>): Observable<SistemaIntegrado> {
    return this.apiService.put<SistemaIntegrado>(`sistemas-integrados/${id}`, sistemaData).pipe(
      map(response => response.data),
      tap(sistema => console.log('✅ Sistema integrado actualizado:', sistema)),
      catchError(error => {
        console.error('❌ Error al actualizar sistema integrado:', error);
        // Crear sistema mock para modo offline
        const mockSistema: SistemaIntegrado = {
          id: id,
          nombre: sistemaData.nombre || 'Sistema Actualizado',
          codigo: sistemaData.codigo || 'SYS',
          descripcion: sistemaData.descripcion || 'Sistema actualizado',
          url_base: sistemaData.url_base || 'https://ejemplo.com',
          activo: sistemaData.activo !== undefined ? sistemaData.activo : true,
          sso_habilitado: sistemaData.sso_habilitado || false,
          sso_force: sistemaData.sso_force || false,
          patron_id: sistemaData.patron_id || 'patron_basico',
          patron_data: sistemaData.patron_data || {} as SistemaPattern,
          fecha_creacion: new Date().toISOString(),
          fecha_actualizacion: new Date().toISOString(),
          creado_por: 1
        };
        return of(mockSistema);
      })
    );
  }

  /**
   * Eliminar sistema integrado
   */
  deleteIntegratedSystem(id: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/sistemas-integrados/${id}`).pipe(
      map(() => true),
      tap(() => console.log('✅ Sistema integrado eliminado')),
      catchError(error => {
        console.error('❌ Error al eliminar sistema integrado:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Gestionar accesos de usuarios a menús del sistema
   */
  assignUserAccess(acceso: Omit<AccesoUsuario, 'id' | 'fecha_asignacion'>): Observable<AccesoUsuario> {
    const accesoCompleto = {
      ...acceso,
      fecha_asignacion: new Date().toISOString()
    };

    return this.http.post<AccesoUsuario>(`${this.apiUrl}/accesos-usuarios`, accesoCompleto).pipe(
      tap(acceso => console.log('✅ Acceso asignado:', acceso)),
      catchError(error => {
        console.error('❌ Error al asignar acceso:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Obtener accesos de un usuario
   */
  getUserAccesses(userId: number): Observable<AccesoUsuario[]> {
    return this.http.get<AccesoUsuario[]>(`${this.apiUrl}/usuarios/${userId}/accesos`).pipe(
      catchError(error => {
        console.error('❌ Error al cargar accesos del usuario:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener accesos de un sistema
   */
  getSystemAccesses(sistemaId: number): Observable<AccesoUsuario[]> {
    return this.http.get<AccesoUsuario[]>(`${this.apiUrl}/sistemas-integrados/${sistemaId}/accesos`).pipe(
      catchError(error => {
        console.error('❌ Error al cargar accesos del sistema:', error);
        return of([]);
      })
    );
  }

  /**
   * Revocar acceso de usuario
   */
  revokeUserAccess(accesoId: number): Observable<boolean> {
    return this.http.delete(`${this.apiUrl}/accesos-usuarios/${accesoId}`).pipe(
      map(() => true),
      tap(() => console.log('✅ Acceso revocado')),
      catchError(error => {
        console.error('❌ Error al revocar acceso:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Verificar si usuario tiene acceso a menú específico
   */
  checkUserMenuAccess(userId: number, sistemaId: number, menuId: string): Observable<boolean> {
    return this.http.get<{ tiene_acceso: boolean }>(`${this.apiUrl}/usuarios/${userId}/accesos/verificar`, {
      params: { sistema_id: sistemaId.toString(), menu_id: menuId }
    }).pipe(
      map(response => response.tiene_acceso),
      catchError(error => {
        console.error('❌ Error al verificar acceso:', error);
        return of(false);
      })
    );
  }

  /**
   * Generar URL de acceso al sistema con parámetros de seguridad
   */
  generateSystemAccessUrl(sistema: SistemaIntegrado, menuId: string, userId: number): string {
    const baseUrl = sistema.url_base;
    const params = new URLSearchParams({
      menu_id: menuId,
      user_id: userId.toString(),
      timestamp: Date.now().toString(),
      // Aquí podrías agregar más parámetros de seguridad
    });
    
    return `${baseUrl}?${params.toString()}`;
  }
}
