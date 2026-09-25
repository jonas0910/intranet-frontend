import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  /** Misma base que AuthService (`/api` con proxy o URL absoluta). */
  private readonly apiUrl = String(environment.apiUrl || '/api').replace(/\/+$/, '');
  private static readonly OFFLINE_MODE = false; // Modo ONLINE - conectado al backend real

  constructor(private http: HttpClient) {}

  private buildUrl(endpoint: string): string {
    const ep = String(endpoint).replace(/^\/+/, '');
    return `${this.apiUrl}/${ep}`;
  }

  // Método principal que intenta conectar al backend real
  get<T>(endpoint: string): Observable<ApiResponse<T>> {
    if (ApiService.OFFLINE_MODE) {
      return of(this.getMockResponse<T>(endpoint));
    }

    console.log(`🌐 Intentando conectar a: ${this.buildUrl(endpoint)}`);
    
    return this.http.get<ApiResponse<T>>(this.buildUrl(endpoint))
      .pipe(
        tap(response => console.log(`✅ Respuesta exitosa de ${endpoint}:`, response)),
        catchError(error => {
          console.error(`❌ Error conectando al backend ${endpoint}:`, error);
          if (ApiService.OFFLINE_MODE) {
            console.warn(`🔄 Usando modo offline para ${endpoint}`);
            return of(this.getMockResponse<T>(endpoint));
          } else {
            console.error(`🚫 Modo online activado, no se puede usar fallback para ${endpoint}`);
            throw error;
          }
        })
      );
  }

  // Método POST que intenta conectar al backend real
  post<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    console.log('📡 ApiService.post llamado:', { endpoint, data });
    
    if (ApiService.OFFLINE_MODE) {
      console.log('🔌 Modo offline activado, usando respuesta mock');
      const mockResponse = this.getMockResponse<T>(endpoint, 'POST', data);
      console.log('📦 Respuesta mock generada:', mockResponse);
      return of(mockResponse);
    }

    console.log(`🌐 Intentando POST a: ${this.buildUrl(endpoint)}`);

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.post<ApiResponse<T>>(this.buildUrl(endpoint), data, { headers })
      .pipe(
        tap(response => console.log(`✅ POST exitoso a ${endpoint}:`, response)),
        catchError(error => {
          console.error(`❌ Error en POST al backend ${endpoint}:`, error);
          if (ApiService.OFFLINE_MODE) {
            console.warn(`🔄 Usando modo offline para POST ${endpoint}`);
            return of(this.getMockResponse<T>(endpoint, 'POST', data));
          } else {
            console.error(`🚫 Modo online activado, no se puede usar fallback para POST ${endpoint}`);
            throw error;
          }
        })
      );
  }

  // Método PUT que intenta conectar al backend real
  put<T>(endpoint: string, data: any): Observable<ApiResponse<T>> {
    if (ApiService.OFFLINE_MODE) {
      return of(this.getMockResponse<T>(endpoint, 'PUT', data));
    }

    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    return this.http.put<ApiResponse<T>>(this.buildUrl(endpoint), data, { headers })
      .pipe(
        tap((response) => console.log(`✅ PUT exitoso a ${endpoint}:`, response)),
        catchError((error) => {
          console.error(`❌ Error en PUT al backend ${endpoint}:`, error);
          if (ApiService.OFFLINE_MODE) {
            return of(this.getMockResponse<T>(endpoint, 'PUT', data));
          }
          return throwError(() => error);
        })
      );
  }

  // Método DELETE que intenta conectar al backend real
  delete<T>(endpoint: string): Observable<ApiResponse<T>> {
    if (ApiService.OFFLINE_MODE) {
      return of(this.getMockResponse<T>(endpoint, 'DELETE'));
    }

    return this.http.delete<ApiResponse<T>>(this.buildUrl(endpoint))
      .pipe(
        catchError((error) => {
          console.error(`❌ Error en DELETE al backend ${endpoint}:`, error);
          if (ApiService.OFFLINE_MODE) {
            return of(this.getMockResponse<T>(endpoint, 'DELETE'));
          }
          return throwError(() => error);
        })
      );
  }

  // Método para verificar conectividad al backend
  checkBackendConnection(): Observable<boolean> {
    return this.http.get(`${this.buildUrl('health')}`, { observe: 'response' })
      .pipe(
        map(response => response.status === 200),
        catchError(() => of(false))
      );
  }

  private getMockResponse<T>(endpoint: string, method: string = 'GET', data?: any): ApiResponse<T> {
    
    // Dashboard Stats
    if (endpoint.includes('dashboard/stats')) {
      return {
        success: true,
        message: 'Estadísticas del dashboard (offline)',
        data: {
          totalUsuarios: 150,
          usuariosActivos: 120,
          documentosSubidos: 45,
          sistemasConectados: 8,
          ticketsPendientes: 12,
          comunicadosNuevos: 3,
          actividadReciente: 85
        } as T
      };
    }
    
    // Sistemas Externos
    if (endpoint.includes('sistemas-externos') || endpoint.includes('sistemas')) {
      if (method === 'GET' && endpoint.includes('sistemas-integrados')) {
        // Obtener sistemas integrados
        return {
          success: true,
          message: 'Sistemas integrados cargados (offline)',
          data: [
            {
              id: 1,
              nombre: 'Sistema de Prueba',
              codigo: 'PRUEBA',
              descripcion: 'Sistema de prueba creado',
              url_base: 'https://prueba.com',
              activo: true,
              sso_habilitado: false,
              sso_force: false,
              patron_id: 'basic_prueba',
              patron_data: {
                id: 'basic_prueba',
                nombre: 'Patrón Básico - Sistema de Prueba',
                codigo: 'PRUEBA',
                descripcion: 'Patrón básico generado automáticamente',
                categoria: 'sistema_interno',
                prioridad: 'media',
                estado_default: true,
                keywords: ['básico', 'automático', 'prueba'],
                sso_config: {
                  habilitado: false,
                  force: false,
                  provider: 'basic'
                },
                menus: [
                  {
                    id: 'menu_principal_prueba',
                    nombre: 'Menú Principal',
                    codigo: 'menu_principal',
                    descripcion: 'Menú principal del sistema',
                    icono: 'fas fa-home',
                    orden: 1,
                    estado_default: true,
                    keywords: ['principal', 'inicio'],
                    permisos_requeridos: ['sistema.read'],
                    submenus: []
                  }
                ],
                configuracion: {
                  url_base: 'https://prueba.com',
                  timeout: 30000,
                  retry_attempts: 3,
                  cache_enabled: true
                }
              },
              fecha_creacion: new Date().toISOString(),
              fecha_actualizacion: new Date().toISOString(),
              creado_por: 1
            }
          ] as T
        };
      } else if (method === 'POST' && endpoint.includes('sistemas-integrados')) {
        // Crear sistema integrado
        return {
          success: true,
          message: 'Sistema integrado creado exitosamente (offline)',
          data: {
            id: Date.now(),
            nombre: data.nombre,
            codigo: data.codigo,
            descripcion: data.descripcion,
            url_base: data.url_base,
            activo: data.activo,
            sso_habilitado: data.sso_habilitado,
            sso_force: data.sso_force,
            patron_id: data.patron_id,
            patron_data: data.patron_data,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            creado_por: 1
          } as T
        };
      } else if (method === 'PUT' && endpoint.includes('sistemas-integrados')) {
        // Actualizar sistema integrado
        return {
          success: true,
          message: 'Sistema integrado actualizado exitosamente (offline)',
          data: {
            id: parseInt(endpoint.split('/').pop() || '1'),
            nombre: data.nombre,
            codigo: data.codigo,
            descripcion: data.descripcion,
            url_base: data.url_base,
            activo: data.activo,
            sso_habilitado: data.sso_habilitado,
            sso_force: data.sso_force,
            patron_id: data.patron_id,
            patron_data: data.patron_data,
            fecha_creacion: new Date().toISOString(),
            fecha_actualizacion: new Date().toISOString(),
            creado_por: 1
          } as T
        };
      } else {
        // Listar sistemas
        return {
          success: true,
          message: 'Sistemas externos (offline)',
          data: [
            { 
              id: 1, 
              nombre: 'Sistema ERP', 
              codigo: 'erp', 
              icono: 'fas fa-chart-bar',
              url_base: '#',
              modo_ejecucion: 'iframe',
              activo: true
            },
            { 
              id: 2, 
              nombre: 'Recursos Humanos', 
              codigo: 'rrhh', 
              icono: 'fas fa-users',
              url_base: '#',
              modo_ejecucion: 'external',
              activo: true
            },
            { 
              id: 3, 
              nombre: 'Contabilidad', 
              codigo: 'contabilidad', 
              icono: 'fas fa-calculator',
              url_base: '#',
              modo_ejecucion: 'iframe',
              activo: true
            }
          ] as T
        };
      }
    }

    // Roles
    if (endpoint.includes('roles')) {
      return {
        success: true,
        message: 'Roles del sistema (offline)',
        data: [
          {
            id: 1,
            name: 'Super Admin',
            guard_name: 'web',
            permissions_count: 50,
            users_count: 2
          },
          {
            id: 2,
            name: 'Admin',
            guard_name: 'web',
            permissions_count: 30,
            users_count: 5
          },
          {
            id: 3,
            name: 'Jefe Departamento',
            guard_name: 'web',
            permissions_count: 20,
            users_count: 8
          },
          {
            id: 4,
            name: 'Empleado',
            guard_name: 'web',
            permissions_count: 10,
            users_count: 135
          }
        ] as T
      };
    }

    // Menús del Sistema
    if (endpoint.includes('sistema-menus') || endpoint.includes('menus')) {
      return {
        success: true,
        message: 'Menús del sistema (offline)',
        data: {
          data: [
            {
              id: 1,
              nombre: 'Dashboard',
              ruta: '/dashboard',
              icono: 'fas fa-tachometer-alt',
              orden: 1,
              activo: true,
              sistema: { id: 1, nombre: 'Sistema Principal' }
            },
            {
              id: 2,
              nombre: 'Usuarios',
              ruta: '/usuarios',
              icono: 'fas fa-users',
              orden: 2,
              activo: true,
              sistema: { id: 1, nombre: 'Sistema Principal' }
            },
            {
              id: 3,
              nombre: 'Reportes',
              ruta: '/reportes',
              icono: 'fas fa-chart-bar',
              orden: 3,
              activo: true,
              sistema: { id: 1, nombre: 'Sistema Principal' }
            }
          ],
          current_page: 1,
          last_page: 1,
          per_page: 15,
          total: 3
        } as T
      };
    }

    // Accesos de Roles a Menús
    if (endpoint.includes('rol-menus')) {
      if (method === 'GET') {
        return {
          success: true,
          message: 'Accesos de roles (offline)',
          data: {
            data: [
              {
                id: 1,
                role_id: 1,
                sistema_menu_id: 1,
                permisos_adicionales: ['ver', 'editar'],
                activo: true,
                orden: 1,
                role: { id: 1, name: 'Super Admin' },
                sistema_menu: {
                  id: 1,
                  nombre: 'Dashboard',
                  sistema: { id: 1, nombre: 'Sistema Principal' }
                }
              },
              {
                id: 2,
                role_id: 2,
                sistema_menu_id: 2,
                permisos_adicionales: ['ver'],
                activo: true,
                orden: 1,
                role: { id: 2, name: 'Admin' },
                sistema_menu: {
                  id: 2,
                  nombre: 'Usuarios',
                  sistema: { id: 1, nombre: 'Sistema Principal' }
                }
              }
            ],
            current_page: 1,
            last_page: 1,
            per_page: 15,
            total: 2
          } as T
        };
      } else if (method === 'POST') {
        return {
          success: true,
          message: 'Acceso creado exitosamente',
          data: data as T
        };
      } else if (method === 'PUT') {
        return {
          success: true,
          message: 'Acceso actualizado exitosamente',
          data: data as T
        };
      } else if (method === 'DELETE') {
        return {
          success: true,
          message: 'Acceso eliminado exitosamente',
          data: null as T
        };
      }
    }

    // Estadísticas de Accesos
    if (endpoint.includes('rol-menus/statistics')) {
      return {
        success: true,
        message: 'Estadísticas de accesos (offline)',
        data: {
          total_accesos: 25,
          accesos_activos: 22,
          accesos_por_rol: [
            { name: 'Super Admin', rol_menus_count: 8 },
            { name: 'Admin', rol_menus_count: 6 },
            { name: 'Jefe Departamento', rol_menus_count: 4 },
            { name: 'Empleado', rol_menus_count: 7 }
          ],
          accesos_por_sistema: [
            { nombre: 'Sistema Principal', menus_count: 15 },
            { nombre: 'Sistema ERP', menus_count: 8 },
            { nombre: 'Recursos Humanos', menus_count: 12 }
          ]
        } as T
      };
    }

    // Usuarios
    if (endpoint.includes('usuarios')) {
      return {
        success: true,
        message: 'Usuarios del sistema (offline)',
        data: {
          data: [
            {
              id: 1,
              name: 'Administrador',
              email: 'admin@municipio.gob.pe',
              roles: [{ name: 'Super Admin' }],
              activo: true
            },
            {
              id: 2,
              name: 'Alcalde',
              email: 'alcalde@municipio.gob.pe',
              roles: [{ name: 'Admin' }],
              activo: true
            }
          ],
          current_page: 1,
          last_page: 1,
          per_page: 15,
          total: 2
        } as T
      };
    }

    // Respuesta por defecto
    return {
      success: true,
      message: `Operación ${method} completada (offline)`,
      data: data || null as T
    };
  }

  // ENDPOINTS ESPECÍFICOS PARA EL PERFIL
  getProfileData(): Observable<ApiResponse<any>> {
    return this.get('auth/me');
  }

  /** Establece el departamento operativo (`employees.department_id`) entre los asignados al usuario. */
  setActiveDepartment(departmentId: number): Observable<ApiResponse<any>> {
    return this.put('auth/active-department', { department_id: departmentId });
  }

  updateProfile(userId: string | number, profileData: any): Observable<ApiResponse<any>> {
    return this.put(`usuarios/${userId}`, profileData);
  }

  changePassword(userId: string | number, passwordData: any): Observable<ApiResponse<any>> {
    const payload = {
      // El backend (UsuariosController@update) acepta 'password' opcionalmente
      password: passwordData?.new_password ?? passwordData?.password
    };
    return this.put(`usuarios/${userId}`, payload);
  }

  // ENDPOINTS ESPECÍFICOS PARA EL DASHBOARD
  getDashboardStats(): Observable<ApiResponse<any>> {
    return this.get('dashboard/stats');
  }
}