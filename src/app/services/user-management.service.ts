import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable, BehaviorSubject, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap, timeout } from 'rxjs/operators';

export interface User {
  id: number;
  name: string;
  email: string;
  activo: boolean;
  is_admin: boolean;
  department_id?: number;
  position?: string;
  phone?: string;
  employee_id?: string;
  cost_center_id?: number;
  hire_date?: string;
  salary?: number;
  work_schedule?: string;
  emergency_contact?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
  roles?: Role[];
  permissions?: Permission[];
  systems?: System[];
  menus?: Menu[];
  department?: Department;
  cost_center?: CostCenter;
  /** Empleado Planillas vinculado (relación `employee`) */
  employee?: {
    id: number;
    full_name?: string;
    employee_code?: string;
    dni?: string;
  };
  selected?: boolean; // Para selección múltiple en la UI
}

export interface UserUpdateData {
  name?: string;
  email?: string;
  password?: string;
  department_id?: number | null;
  position?: string;
  phone?: string;
  activo?: boolean;
  is_admin?: boolean;
  employee_id?: string;
  cost_center_id?: number;
  hire_date?: string;
  salary?: number;
  work_schedule?: string;
  emergency_contact?: string;
  notes?: string;
  role_ids?: number[];
  permission_ids?: number[];
  system_ids?: number[];
  menu_ids?: number[];
}

export interface Role {
  id: number;
  name: string;
  description?: string;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
}

export interface System {
  id: number;
  nombre: string;
  codigo?: string;
  descripcion?: string;
  url_base?: string;
  icono?: string;
  activo?: boolean;
  menus?: Menu[];
}

export interface UserMenuPermissions {
  ver?: boolean;
  crear?: boolean;
  editar?: boolean;
  eliminar?: boolean;
  exportar?: boolean;
  lectura?: boolean;
  escritura?: boolean;
  eliminacion?: boolean;
  configuracion?: boolean;
  exportacion?: boolean;
  auditoria?: boolean;
}

export interface Menu {
  id: number;
  nombre: string;
  route?: string;
  icono?: string;
  sistema_id?: number;
  activo?: boolean;
  permisos_requeridos?: string[];
  expanded?: boolean; // Propiedad para controlar expansión de submenús
  submenus?: Menu[]; // Submenús del menú principal
  // Atributos de permisos para el usuario
  usuario_permisos?: UserMenuPermissions;
}

export interface Department {
  id: number;
  nombre: string;
}

export interface CostCenter {
  id: number;
  nombre: string;
}

export interface ReferenceEmployee {
  id: string;
  text: string;
}

export interface UserReferenceData {
  roles: Role[];
  permissions: Permission[];
  systems: System[];
  menus: Menu[];
  departments: Department[];
  employees: ReferenceEmployee[];
  cost_centers: CostCenter[];
}

export interface UserStats {
  total_users: number;
  active_users: number;
  admin_users: number;
  inactive_users: number;
  recent_users: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

@Injectable({
  providedIn: 'root'
})
export class UserManagementService {
  private apiUrl = environment.apiUrl;
  private usersSubject = new BehaviorSubject<User[]>([]);
  private statsSubject = new BehaviorSubject<UserStats | null>(null);
  private referenceDataSubject = new BehaviorSubject<UserReferenceData | null>(null);

  public users$ = this.usersSubject.asObservable();
  public stats$ = this.statsSubject.asObservable();
  public referenceData$ = this.referenceDataSubject.asObservable();

  constructor(private http: HttpClient) {}

  /**
   * Obtener todos los usuarios
   */
  getUsers(): Observable<User[]> {
    console.log('🔍 UserManagementService: Iniciando petición GET a /users');
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, {
      params: { per_page: '9999' }
    })
      .pipe(
        tap(response => {
          console.log('📡 UserManagementService: Respuesta recibida del backend:', response);
        }),
        map(response => {
          if (response.success) {
            // Manejar tanto arrays como objetos de paginación
            const users = this.extractUsersFromResponse(response.data);
            console.log('✅ UserManagementService: Datos de usuarios procesados:', users.length, 'usuarios');
            this.usersSubject.next(users);
            return users;
          }
          console.error('❌ UserManagementService: Error en respuesta del backend:', response.message);
          throw new Error(response.message);
        }),
        tap(users => {
          console.log('📊 UserManagementService: Calculando estadísticas para', users.length, 'usuarios');
          // Calcular estadísticas
          this.calculateStats(users);
        })
      );
  }

  /**
   * Normaliza GET /users/:id: `UsuariosController::show` devuelve
   * `{ data: { usuario, permisos, menus_accesibles } }`; otras rutinas pueden devolver `data` como usuario plano.
   */
  private normalizeUserFromApiPayload(data: unknown): User {
    if (data === null || data === undefined) {
      throw new Error('Respuesta sin datos de usuario');
    }
    const payload = data as Record<string, unknown>;
    const raw =
      payload['usuario'] !== undefined ? (payload['usuario'] as User) : (data as User);
    const user = raw as User & { empleado?: User['employee'] };
    if (user.empleado && !user.employee) {
      user.employee = user.empleado as User['employee'];
    }
    return user;
  }

  /**
   * Obtener un usuario por ID
   */
  getUser(id: number): Observable<User> {
    return this.http.get<ApiResponse<unknown>>(`${this.apiUrl}/users/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            return this.normalizeUserFromApiPayload(response.data);
          }
          throw new Error(response.message);
        })
      );
  }

  /**
   * Crear un nuevo usuario
   */
  createUser(userData: UserUpdateData): Observable<User> {
    return this.http.post<ApiResponse<User>>(`${this.apiUrl}/users`, userData)
      .pipe(
        map(response => {
          if (response.success) {
            // Actualizar la lista de usuarios
            const currentUsers = this.usersSubject.value;
            this.usersSubject.next([...currentUsers, response.data]);
            this.calculateStats([...currentUsers, response.data]);
            return response.data;
          }
          throw new Error(response.message);
        })
      );
  }

  /**
   * Actualizar un usuario
   */
  updateUser(id: number, userData: UserUpdateData): Observable<User> {
    return this.http.put<ApiResponse<User>>(`${this.apiUrl}/users/${id}`, userData)
      .pipe(
        map(response => {
          if (response.success) {
            // Actualizar la lista de usuarios
            const currentUsers = this.usersSubject.value;
            const updatedUsers = currentUsers.map(user => 
              user.id === id ? response.data : user
            );
            this.usersSubject.next(updatedUsers);
            this.calculateStats(updatedUsers);
            return response.data;
          }
          throw new Error(response.message);
        })
      );
  }

  /**
   * Eliminar un usuario
   */
  deleteUser(id: number): Observable<boolean> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/users/${id}`)
      .pipe(
        map(response => {
          if (response.success) {
            // Actualizar la lista de usuarios
            const currentUsers = this.usersSubject.value;
            const filteredUsers = currentUsers.filter(user => user.id !== id);
            this.usersSubject.next(filteredUsers);
            this.calculateStats(filteredUsers);
            return true;
          }
          throw new Error(response.message);
        })
      );
  }

  /**
   * Obtener datos de referencia para formularios
   */
  getReferenceData(): Observable<UserReferenceData> {
    return this.http.get<ApiResponse<UserReferenceData>>(`${this.apiUrl}/users-reference-data`)
      .pipe(
        map(response => {
          if (response.success) {
            // Proporcionar datos por defecto si algunos están vacíos
            const referenceData: UserReferenceData = {
              roles: response.data.roles || [],
              permissions: response.data.permissions || [],
              systems: response.data.systems || [],
              menus: response.data.menus || [],
              departments: response.data.departments || [],
              employees: response.data.employees || [],
              cost_centers: response.data.cost_centers || []
            };
            
            this.referenceDataSubject.next(referenceData);
            return referenceData;
          }
          throw new Error(response.message);
        }),
        catchError(error => {
          console.error('Error al obtener datos de referencia:', error);
          
          // Proporcionar datos por defecto en caso de error
          const defaultData: UserReferenceData = {
            roles: [],
            permissions: [],
            systems: [],
            menus: [],
            departments: [],
            employees: [],
            cost_centers: []
          };
          
          this.referenceDataSubject.next(defaultData);
          return of(defaultData);
        })
      );
  }

  /**
   * Extraer usuarios de la respuesta, manejando tanto arrays como objetos de paginación
   */
  private extractUsersFromResponse(data: any): User[] {
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data && typeof data === 'object' && Array.isArray(data.data)) {
      return data.data;
    }
    
    console.warn('UserManagementService: Formato de datos inesperado:', data);
    return [];
  }

  /**
   * Calcular estadísticas de usuarios
   */
  private calculateStats(users: User[]): void {
    const stats: UserStats = {
      total_users: users.length,
      active_users: users.filter(user => user.activo).length,
      admin_users: users.filter(user => user.is_admin).length,
      inactive_users: users.filter(user => !user.activo).length,
      recent_users: users.filter(user => {
        const createdDate = new Date(user.created_at);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return createdDate >= thirtyDaysAgo;
      }).length
    };
    this.statsSubject.next(stats);
  }

  /**
   * Buscar usuarios
   */
  searchUsers(query: string): Observable<User[]> {
    const params = new HttpParams().set('search', query);
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, { params })
      .pipe(
        map(response => {
          if (response.success) {
            return response.data;
          }
          throw new Error(response.message);
        })
      );
  }

  /**
   * Activar/Desactivar usuario
   */
  toggleUserStatus(id: number, active: boolean): Observable<User> {
    return this.updateUser(id, { activo: active });
  }

  /**
   * Cambiar contraseña de usuario
   */
  changePassword(id: number, newPassword: string): Observable<User> {
    return this.updateUser(id, { password: newPassword });
  }

  /**
   * Asignar roles a usuario
   */
  assignRoles(id: number, roleIds: number[]): Observable<User> {
    return this.updateUser(id, { role_ids: roleIds });
  }

  /**
   * Asignar permisos a usuario
   */
  assignPermissions(id: number, permissionIds: number[]): Observable<User> {
    return this.updateUser(id, { permission_ids: permissionIds });
  }

  /**
   * Obtener usuarios por departamento
   */
  getUsersByDepartment(departmentId: number): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, {
      params: new HttpParams().set('department_id', departmentId.toString())
    }).pipe(
      map(response => {
        if (response.success) {
          // Manejar tanto arrays como objetos de paginación
          return this.extractUsersFromResponse(response.data);
        }
        throw new Error(response.message);
      })
    );
  }

  /**
   * Obtener usuarios administradores
   */
  getAdminUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, {
      params: new HttpParams().set('is_admin', 'true')
    }).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message);
      })
    );
  }

  /**
   * Obtener usuarios activos
   */
  getActiveUsers(): Observable<User[]> {
    return this.http.get<ApiResponse<User[]>>(`${this.apiUrl}/users`, {
      params: new HttpParams().set('activo', 'true')
    }).pipe(
      map(response => {
        if (response.success) {
          return response.data;
        }
        throw new Error(response.message);
      })
    );
  }

  /**
   * Obtener sistemas integrados disponibles
   */
  getAvailableSystems(): Observable<System[]> {
    return this.http.get<any>(`${this.apiUrl}/sistemas-integrados`).pipe(
      timeout(10000), // 10 segundos de timeout
      map(response => {
        console.log('Respuesta completa de sistemas integrados:', response);
        
        if (response.success) {
          // Verificar diferentes estructuras posibles de respuesta
          let sistemasData = null;
          
          if (response.data && Array.isArray(response.data)) {
            // Estructura directa: response.data es un array
            sistemasData = response.data;
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            // Estructura paginada: response.data.data es un array
            sistemasData = response.data.data;
          } else if (Array.isArray(response)) {
            // Respuesta directa sin wrapper
            sistemasData = response;
          }
          
          if (sistemasData) {
            return sistemasData.map((sistema: any) => ({
              id: sistema.id,
              nombre: sistema.nombre,
              codigo: sistema.codigo,
              descripcion: sistema.descripcion,
              url_base: sistema.url_base,
              icono: sistema.icono || 'fas fa-server', // Usar icono por defecto si no existe
              activo: sistema.activo,
              menus: sistema.menus || [] // Incluir menús del sistema
            }));
          }
        }
        
        console.warn('No se encontraron sistemas integrados en la respuesta:', response);
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener sistemas integrados:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener menús agregados disponibles
   */
  getAvailableMenus(): Observable<Menu[]> {
    // CORRECCIÓN: Usar sistemas-integrados que incluye los menús de sistema_integrado_menus
    return this.http.get<any>(`${this.apiUrl}/sistemas-integrados`).pipe(
      timeout(10000), // 10 segundos de timeout
      map(response => {
        console.log('🔍 DIAGNÓSTICO - Respuesta completa de menús agregados:', response);
        console.log('🔍 Estructura de la respuesta:', {
          success: response.success,
          hasData: !!response.data,
          dataType: typeof response.data,
          isDataArray: Array.isArray(response.data),
          dataLength: response.data ? (Array.isArray(response.data) ? response.data.length : 'N/A') : 'N/A'
        });
        
        if (response.success) {
          // CORRECCIÓN: Extraer menús de sistemas integrados
          let menusData = null;
          
          if (response.data && Array.isArray(response.data)) {
            // Estructura de sistemas integrados: response.data es un array de sistemas
            console.log('🔍 Procesando sistemas integrados:', response.data.length);
            
            // Extraer todos los menús de todos los sistemas
            const allMenus: any[] = [];
            response.data.forEach((sistema: any) => {
              if (sistema.menus && Array.isArray(sistema.menus)) {
                console.log(`🔍 Sistema ${sistema.id} (${sistema.nombre}) tiene ${sistema.menus.length} menús`);
                sistema.menus.forEach((menu: any) => {
                  console.log(`🔍 Menú ${menu.id} (${menu.nombre}) - Submenús:`, menu.submenus?.length || 0);
                  console.log(`🔍 Estructura completa del menú:`, {
                    id: menu.id,
                    nombre: menu.nombre,
                    hasSubmenus: !!menu.submenus,
                    submenusLength: menu.submenus?.length || 0,
                    submenusType: typeof menu.submenus,
                    submenusContent: menu.submenus
                  });
                  if (menu.submenus && menu.submenus.length > 0) {
                    console.log(`🔍 Submenús del menú ${menu.nombre}:`, menu.submenus);
                  }
                  // Agregar sistema_id al menú
                  allMenus.push({
                    ...menu,
                    sistema_id: sistema.id
                  });
                });
              }
            });
            
            menusData = allMenus;
            console.log('🔍 Total de menús extraídos de sistemas:', allMenus.length);
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            // Estructura paginada: response.data.data es un array
            menusData = response.data.data;
          } else if (Array.isArray(response)) {
            // Respuesta directa sin wrapper
            menusData = response;
          }
          
          if (menusData) {
            console.log('🔍 Menús encontrados en la respuesta:', menusData.length);
            console.log('🔍 IDs de menús encontrados:', menusData.map((m: any) => m.id));
            console.log('🔍 Detalles de menús:', menusData.map((m: any) => ({id: m.id, nombre: m.nombre, sistema_id: m.sistema_id})));
            
            return menusData.map((menu: any) => {
              console.log('🔍 Mapeando menú:', menu.nombre, 'Submenús originales:', menu.submenus?.length || 0);
              
              // Procesar submenús si existen
              const submenus = menu.submenus ? menu.submenus.map((submenu: any) => ({
                id: submenu.id,
                nombre: submenu.nombre,
                route: submenu.route,
                icono: submenu.icono,
                activo: submenu.activo,
                permisos: submenu.permisos || []
              })) : [];
              
              console.log('🔍 Submenús procesados:', submenus.length);
              
              return {
                id: menu.id,
                nombre: menu.nombre,
                route: menu.route,
                icono: menu.icono,
                sistema_id: menu.sistema_id,
                parent_id: menu.parent_id,
                orden: menu.orden,
                activo: menu.activo,
                permisos_requeridos: menu.permisos_requeridos || [],
                submenus: submenus, // Submenús procesados
                expanded: false // Inicializar contraído
              };
            });
          }
        }
        
        console.warn('No se encontraron menús agregados en la respuesta:', response);
        return [];
      }),
      catchError(error => {
        console.error('Error al obtener menús agregados:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtener acceso completo de un usuario (sistemas + menús)
   */
  getUserAccess(userId: number): Observable<{systems: number[], menus: number[]}> {
    return this.http.get<any>(`${this.apiUrl}/accesos-usuarios?usuario_id=${userId}`).pipe(
      timeout(10000), // 10 segundos de timeout
      map(response => {
        if (response.success && response.data && Array.isArray(response.data.data)) {
          const accessData = response.data.data as any[];
          const systems: number[] = [...new Set(accessData.map((acceso: any) => Number(acceso.sistema_id)))];
          const menus: number[] = [...new Set(accessData.map((acceso: any) => Number(acceso.menu_id)))];
          return { systems, menus };
        }
        return { systems: [], menus: [] };
      }),
      catchError(error => {
        console.error('Error al obtener acceso del usuario:', error);
        return of({ systems: [], menus: [] });
      })
    );
  }

  /**
   * Obtener permisos detallados de un usuario
   */
  getUserDetailedAccess(userId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/accesos-usuarios?usuario_id=${userId}`).pipe(
      timeout(10000), // 10 segundos de timeout
      map(response => {
        console.log('🔍 Respuesta de getUserDetailedAccess:', response);
        
        if (response.success && response.data && Array.isArray(response.data.data)) {
          console.log('✅ Datos de permisos encontrados:', response.data.data.length, 'registros');
          return response.data.data as any[];
        } else if (response.data && Array.isArray(response.data)) {
          // Estructura directa sin wrapper
          console.log('✅ Datos directos encontrados:', response.data.length, 'registros');
          return response.data as any[];
        }
        
        console.log('⚠️ No se encontraron datos de permisos válidos');
        return [];
      }),
      catchError(error => {
        console.error('❌ Error al obtener permisos detallados del usuario:', error);
        
        // Re-lanzar el error para que se maneje en el componente
        throw error;
      })
    );
  }

  /**
   * Actualizar acceso completo de un usuario
   */
  updateUserAccess(userId: number, systemIds: number[], menuIds: number[]): Observable<any> {
    // Primero eliminar todos los accesos existentes del usuario
    return this.http.delete(`${this.apiUrl}/accesos-usuarios/usuario/${userId}`).pipe(
      switchMap(() => {
        // Crear nuevos accesos para cada sistema y menú seleccionado
        const accessObservables: Observable<any>[] = [];
        
        systemIds.forEach(systemId => {
          menuIds.forEach(menuId => {
            accessObservables.push(
              this.http.post(`${this.apiUrl}/accesos-usuarios`, {
                usuario_id: userId,
                sistema_id: systemId,
                menu_id: menuId,
                permisos: ['ver'], // Permiso básico
                activo: true
              })
            );
          });
        });

        // Si no hay accesos que crear, retornar éxito
        if (accessObservables.length === 0) {
          return of({ success: true });
        }

        // Combinar todos los observables usando forkJoin
        return forkJoin(accessObservables);
      }),
      map(() => ({ success: true })),
      catchError(error => {
        console.error('Error al actualizar acceso del usuario:', error);
        return of({ success: false, error: error.message });
      })
    );
  }

  /**
   * Actualizar acceso con permisos granulares de un usuario
   */
  updateUserAccessWithPermissions(userId: number, systems: number[], menus: number[], menuPermissions: { [menuId: number]: UserMenuPermissions }, availableMenus: Menu[]): Observable<any> {
    
    console.log('🔧 DIAGNÓSTICO - Parámetros recibidos:');
    console.log('- userId:', userId);
    console.log('- systems:', systems);
    console.log('- menus:', menus);
    console.log('- menuPermissions:', menuPermissions);
    console.log('- availableMenus length:', availableMenus.length);
    
    // CORRECCIÓN: Obtener accesos existentes y eliminar solo los de sistemas modificados
    return this.getUserDetailedAccess(userId).pipe(
      switchMap((existingAccesses) => {
        console.log('🔧 Accesos existentes del usuario:', existingAccesses);
        
        // Identificar sistemas que se están modificando
        const modifiedSystems = systems;
        console.log('🔧 Sistemas modificados:', modifiedSystems);
        
        // Crear observables para eliminar accesos de sistemas modificados
        const deleteObservables: Observable<any>[] = [];
        
        existingAccesses.forEach(access => {
          if (modifiedSystems.includes(access.sistema_id)) {
            console.log(`🔧 Eliminando acceso existente: Sistema ${access.sistema_id}, Menú ${access.menu_id}`);
            deleteObservables.push(
              this.http.delete(`${this.apiUrl}/accesos-usuarios/${access.id}`)
            );
          }
        });
        
        // Si no hay accesos para eliminar, usar un observable vacío
        const deleteOperation = deleteObservables.length > 0 
          ? forkJoin(deleteObservables) 
          : of([]);
        
        return deleteOperation.pipe(
          switchMap((results) => {
            console.log('🔧 Accesos de sistemas modificados eliminados, creando nuevos...');
            
            // Crear nuevos accesos con permisos granulares
            const accessObservables: Observable<any>[] = [];
        
        // Crear solo accesos específicos por menú (eliminando menu_id="all")

        console.log('🔧 DIAGNÓSTICO - Iniciando creación de accesos...');
        console.log('🔧 Total de menús a procesar:', menus.length);
        
        // DIAGNÓSTICO: Mostrar todos los menús disponibles
        console.log('📊 AvailableMenus completos:', availableMenus.map(m => ({id: m.id, nombre: m.nombre, sistema_id: m.sistema_id})));
        console.log('📊 IDs en availableMenus:', availableMenus.map(m => m.id));
        
        // CORRECCIÓN: Filtrar solo los menús que existen en availableMenus
        const validMenus = menus.filter(menuId => {
          const menu = availableMenus.find(m => m.id === menuId);
          const isValid = menu && menu.sistema_id;
          if (!isValid) {
            console.log(`⚠️ Menú ${menuId} será omitido - no existe en availableMenus o sin sistema_id`);
            console.log(`🔍 Búsqueda del menú ${menuId}:`, menu ? `Encontrado pero sin sistema_id (${menu.sistema_id})` : 'No encontrado');
            console.log(`🔍 AvailableMenus IDs:`, availableMenus.map(m => m.id));
            console.log(`🔍 AvailableMenus con sistema_id:`, availableMenus.filter(m => m.sistema_id).map(m => ({id: m.id, sistema_id: m.sistema_id})));
          }
          return isValid;
        });
        
        console.log(`🔧 Menús válidos para procesar: ${validMenus.length}/${menus.length}`);
        console.log(`🔧 IDs válidos:`, validMenus);
        
        // Crear accesos para menús específicos con permisos granulares
        validMenus.forEach((menuId, index) => {
          console.log(`🔧 Procesando menú ${index + 1}/${validMenus.length}: ID ${menuId}`);
          
          // Obtener permisos específicos para este menú
          const permissions = menuPermissions[menuId] || {};
          const permisosArray: string[] = [];
          
          // Convertir permisos booleanos a array de strings
          if (permissions.lectura) permisosArray.push('lectura');
          if (permissions.escritura) permisosArray.push('escritura');
          if (permissions.eliminacion) permisosArray.push('eliminacion');
          if (permissions.configuracion) permisosArray.push('configuracion');
          if (permissions.exportacion) permisosArray.push('exportacion');
          if (permissions.auditoria) permisosArray.push('auditoria');
          
          // Si no hay permisos específicos, asignar lectura por defecto
          if (permisosArray.length === 0) {
            permisosArray.push('lectura');
          }

          console.log(`🔧 Menú ${menuId} - Permisos configurados:`, permissions);
          console.log(`🔧 Menú ${menuId} - Permisos array:`, permisosArray);

          // Buscar el sistema del menú en los menús disponibles
          const menu = availableMenus.find(m => m.id === menuId);
          console.log(`🔧 Menú ${menuId} - Menú encontrado:`, menu ? `SÍ (sistema_id: ${menu.sistema_id})` : 'NO');
          
          if (menu && menu.sistema_id) {
            const accessData = {
              usuario_id: userId,
              sistema_id: menu.sistema_id,
              menu_id: menuId.toString(),
              permisos: permisosArray,
              activo: true
            };
            
            console.log(`🔧 Creando acceso para menú ${menuId}:`, accessData);
            
            accessObservables.push(
              this.http.post(`${this.apiUrl}/accesos-usuarios`, accessData).pipe(
                tap(response => {
                  console.log(`✅ Acceso creado exitosamente para menú ${menuId}:`, response);
                }),
                catchError(error => {
                  console.error('❌ Error al crear acceso para menú:', menuId, error);
                  console.error('❌ Datos enviados:', accessData);
                  console.error('❌ Respuesta del servidor:', error);
                  return of({ success: false, error: error.message || 'Error desconocido' });
                })
              )
            );
          }
        });
        
        console.log('🔧 Total de observables creados:', accessObservables.length);

        // Si no hay accesos que crear, mostrar advertencia pero retornar éxito
        if (accessObservables.length === 0) {
          console.log('⚠️ ADVERTENCIA: No se crearon accesos porque no hay menús válidos');
          console.log('⚠️ Menús solicitados:', menus);
          console.log('⚠️ Menús disponibles:', availableMenus.map(m => m.id));
          return of({ success: true, warning: 'No se crearon accesos - no hay menús válidos' });
        }

        // Combinar todos los observables usando forkJoin
        console.log('🔧 Ejecutando forkJoin con', accessObservables.length, 'observables...');
        return forkJoin(accessObservables);
          })
        );
      }),
      map(results => {
        console.log('🔧 Resultados del forkJoin:', results);
        const successCount = Array.isArray(results) ? results.filter(r => r.success !== false).length : 1;
        console.log('✅ Accesos con permisos granulares creados:', successCount);
        return { success: true, created: successCount };
      }),
      catchError(error => {
        console.error('❌ Error general al actualizar accesos con permisos:', error);
        return of({ success: false, error: error.message });
      })
    );
  }
}
