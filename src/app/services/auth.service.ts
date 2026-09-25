import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { catchError, tap, shareReplay, map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { AuthRedirectService } from './auth-redirect.service';
import { AuditService } from './audit.service';
import { environment } from '../../environments/environment';
import {
  ADMIN_LATERAL_FULL_ACCESS_PERMISSION_TRIPLE,
  ADMIN_LATERAL_FULL_ACCESS_ROLES,
} from '../config/admin-lateral-access.config';

export interface User {
  id: number;
  name: string;
  email: string;
  empleado?: {
    id: number;
    codigo_empleado: string;
    nombres: string;
    apellidos: string;
    cargo: string;
    departamento?: {
      id: number;
      nombre: string;
      codigo: string;
    };
    foto?: string;
    telefono?: string;
    direccion?: string;
    fecha_nacimiento?: string;
    genero?: string;
    estado_civil?: string;
    fecha_ingreso?: string;
  };
  /** Empleado módulo Planillas (`auth/me`). */
  employee?: {
    photo?: string | null;
    position?: { name?: string | null };
    department?: { name?: string | null };
    full_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  };
  roles?: string[];
  /** Detalle Spatie por rol (nombre + guard_name = «tipo»). */
  roles_detail?: Array<{ id: number; name: string; guard_name: string }>;
  permissions?: string[];
  /** Departamento derivado del empleado Planillas (`employees.department_id`). */
  department?: { id: number; name?: string | null; nombre?: string | null };
  /** Áreas de trámite documentario asignadas (`td_muni_area_tramite_user` → `departments`). */
  areas_tramite?: AreaTramiteAsignada[];
}

/** Área de intranet (mesa/dependencia) para contexto de bandejas y trámite. */
export interface AreaTramiteAsignada {
  id: number;
  nombre?: string | null;
  codigo?: string | null;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    token: string;
    token_type: string;
  } | null;
}

/** TTL de caché para validación de token (ms). Evita peticiones HTTP en cada navegación. */
const VALIDATE_TOKEN_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Área activa elegida al iniciar sesión (varias áreas asignadas). */
const LS_ACTIVE_AREA_ID = 'intranet_active_area_id';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  /** Caché de validación de token para evitar peticiones en cada navegación/refresh */
  private validateTokenCache: { result: Observable<any>; timestamp: number } | null = null;


  constructor(
    private http: HttpClient,
    private router: Router,
    private authRedirectService: AuthRedirectService,
    private auditService: AuditService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    
    // Sin bypass - usar datos reales siempre
    
    // Limpiar datos corruptos al inicio si es necesario
    this.cleanupCorruptedData();
    
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    if (this.isBrowser) {
      try {
        const storedUser = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        // Solo cargar si ambos valores existen y son válidos
        if (storedUser && isLoggedIn && storedUser !== 'null' && storedUser !== 'undefined') {
          const user = JSON.parse(storedUser);
          // Validar que el usuario tenga la estructura mínima requerida (consistente con isLoggedIn)
          if (user && user.id && user.email) {
            this.currentUserSubject.next(user);
          } else {
            // Limpiar datos corruptos
            this.clearAuthData();
          }
        } else {
          // Limpiar datos inconsistentes
          this.clearAuthData();
        }
      } catch (error) {
        console.warn('Error loading user from storage:', error);
        this.clearAuthData();
      }
    }
  }

  private clearAuthData(): void {
    if (this.isBrowser) {
      // Limpiar localStorage
      localStorage.removeItem('user');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('token');
      localStorage.removeItem(LS_ACTIVE_AREA_ID);
      
      // Limpiar sessionStorage también por si acaso
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('token');
      
      this.currentUserSubject.next(null);
    }
  }

  private cleanupCorruptedData(): void {
    if (!this.isBrowser) return;
    
    try {
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      const storedUser = localStorage.getItem('user');
      
      // Solo limpiar si hay datos realmente corruptos (null/undefined explícitos)
      if (isLoggedIn === 'true' && (storedUser === 'null' || storedUser === 'undefined')) {
        if (!environment.production) console.warn('Limpiando datos corruptos al inicio');
        this.clearAuthData();
        return;
      }
      
      // Solo limpiar si hay usuario pero está marcado como no logueado Y el usuario es null/undefined
      if (storedUser === 'null' || storedUser === 'undefined') {
        if (isLoggedIn !== 'true') {
          if (!environment.production) console.warn('Limpiando datos inconsistentes');
          this.clearAuthData();
        }
      }
      
      if (isLoggedIn === 'true' && !storedUser && !environment.production) {
        console.warn('Inconsistencia: isLoggedIn=true pero no hay usuario');
      }
      if (storedUser && storedUser !== 'null' && storedUser !== 'undefined' && isLoggedIn !== 'true' && !environment.production) {
        console.warn('Inconsistencia: hay usuario pero isLoggedIn=false');
      }
    } catch (error) {
      console.warn('Error durante verificación de datos:', error);
      // NO limpiar automáticamente en caso de error
    }
  }

  getCurrentUser(): User | null {
    let currentUser = this.currentUserSubject.value;
    
    // Si no hay usuario en memoria pero hay indicios de login, intentar recuperar
    if (!currentUser && this.isBrowser) {
      try {
        const storedUser = localStorage.getItem('user');
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        
        if (storedUser && isLoggedIn && storedUser !== 'null' && storedUser !== 'undefined') {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && (parsedUser.id || parsedUser.email || parsedUser.name)) {
            this.currentUserSubject.next(parsedUser);
            currentUser = parsedUser;
          }
        }
      } catch (error) {
        console.warn('Error recuperando usuario en getCurrentUser():', error);
        // NO limpiar automáticamente en caso de error
      }
    }
    
    return currentUser;
  }


  isLoggedIn(): boolean {
    if (!this.isBrowser) return false;
    
    try {
      // Sin bypass - verificar autenticación real
      
      const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
      const user = this.getCurrentUser();
      
      const hasValidUser = user && user.id && user.email;

      if (isLoggedIn && !hasValidUser) {
        return false;
      }
      
      return Boolean(isLoggedIn && hasValidUser);
    } catch (error) {
      console.warn('🔍 Error en isLoggedIn():', error);
      this.clearAuthData();
      return false;
    }
  }

  // Método público para limpiar la sesión
  logout(): void {
    console.log('🔒 AuthService: Cerrando sesión...');
    
    // Registrar log de auditoría antes de limpiar datos (si hay usuario)
    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.auditService.logAction(
        'Logout', 
        'Autenticación', 
        `Cierre de sesión para ${currentUser.email}`, 
        'success', 
        currentUser.id
      );
    }

    this.invalidateValidateTokenCache();
    this.clearAuthData();

    if (this.isBrowser && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('sidebarSessionUserRefreshed');
    }
    
    // Resetear clases del body antes de navegar para evitar que section.content se distorsione al volver a iniciar sesión
    if (this.isBrowser && typeof document !== 'undefined' && document.body) {
      document.body.className = 'hold-transition login-page';
    }
    
    this.router.navigate(['/login']).then(() => {
      console.log('✅ AuthService: Redirigido a login');
    });
  }

  // Método eliminado - ya no se usan bypasses para rutas de administración

  // Método temporal para debug completo
  debugCompleteAuthState(): void {
    if (!this.isBrowser) {
      console.log('🔍 Debug: No en browser');
      return;
    }

    const localStorageData = {
      isLoggedIn: localStorage.getItem('isLoggedIn'),
      user: localStorage.getItem('user'),
      token: localStorage.getItem('token')
    };

    const parsedUser = localStorageData.user ? JSON.parse(localStorageData.user) : null;

    console.log('🔍 DEBUG COMPLETO:', {
      localStorage: localStorageData,
      parsedUser: parsedUser,
      currentUserSubject: this.currentUserSubject.value,
      isLoggedInResult: this.isLoggedIn(),
      hasValidUser: parsedUser && parsedUser.id && parsedUser.email,
      timestamp: new Date().toISOString()
    });
  }

  // Método de debug para verificar estado completo
  debugAuthState(): any {
    const state = {
      isLoggedIn: this.isLoggedIn(),
      currentUser: this.getCurrentUser(),
      localStorage: {
        isLoggedIn: localStorage.getItem('isLoggedIn'),
        user: localStorage.getItem('user'),
        token: localStorage.getItem('token')
      },
      behaviorSubject: {
        value: this.currentUserSubject.value
      }
    };
    
    console.log('🔍 AuthService Debug State:', state);
    
    // Verificar consistencia
    const localStorageSaysLoggedIn = state.localStorage.isLoggedIn === 'true';
    const hasValidUser = !!(state.currentUser && state.currentUser.id && state.currentUser.name);
    const behaviorSubjectHasUser = !!state.behaviorSubject.value;
    const isConsistent = localStorageSaysLoggedIn === hasValidUser && hasValidUser === behaviorSubjectHasUser;
    
    console.log('🔍 Consistencia:', {
      localStorageSaysLoggedIn,
      hasValidUser,
      behaviorSubjectHasUser,
      isConsistent: isConsistent
    });
    
    if (!isConsistent) {
      console.warn('⚠️ INCONSISTENCIA DETECTADA - Limpiando datos');
      this.clearAuthData();
    }
    
    return state;
  }

  getToken(): string | null {
    if (!this.isBrowser) return null;
    
    try {
      return localStorage.getItem('token');
    } catch (error) {
      return null;
    }
  }

  private isProduction(): boolean {
    return window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  }

  login(email: string, password: string): Observable<LoginResponse> {
    const loginData = { email, password };
    
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, loginData)
      .pipe(
        tap(response => {
          if (response.success && response.data) {
            this.invalidateValidateTokenCache();
            this.applyAreaContextAfterLogin(response.data.user);
            this.currentUserSubject.next(response.data.user);
            if (this.isBrowser) {
              try {
                localStorage.setItem('user', JSON.stringify(response.data.user));
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('isLoggedIn', 'true');
              } catch (error) {
                console.warn('No se pudo guardar en localStorage:', error);
              }
            }

            // Registrar log de auditoría
            if (response.data.user && response.data.user.id) {
              this.auditService.logAction(
                'Login', 
                'Autenticación', 
                `Inicio de sesión exitoso para ${response.data.user.email}`, 
                'success', 
                response.data.user.id
              );
            }
          }
        }),
        catchError(error => {
          if (!environment.production) console.error('Error en login:', error);
          throw error;
        })
      );
  }
  

  validateToken(): Observable<any> {
    const token = this.getToken();

    if (!token) {
      return of({
        success: false,
        message: 'No token found',
        data: { valid: false, user: null }
      });
    }

    const now = Date.now();
    if (this.validateTokenCache && (now - this.validateTokenCache.timestamp) < VALIDATE_TOKEN_CACHE_TTL_MS) {
      return this.validateTokenCache.result;
    }

    const request$ = this.http.get(`${this.apiUrl}/auth/validate-token`).pipe(
      tap((response: any) => {
        if (response.success && response.data?.user) {
          this.updateCurrentUser(response.data.user);
        }
      }),
      catchError(error => {
        if (!environment.production) {
          console.error('Token validation failed:', error);
        }
        this.invalidateValidateTokenCache();
        this.logout();
        return of({
          success: false,
          message: 'Token inválido',
          data: { valid: false, user: null }
        });
      }),
      shareReplay(1)
    );

    this.validateTokenCache = { result: request$, timestamp: now };
    return request$;
  }

  /** Invalida la caché de validación de token (p.ej. tras logout o cambio de sesión) */
  invalidateValidateTokenCache(): void {
    this.validateTokenCache = null;
  }

  updateCurrentUser(updatedUser: User): void {
    this.currentUserSubject.next(updatedUser);
    
    if (this.isBrowser) {
      try {
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } catch (error) {
        // LocalStorage not available
      }
    }
  }

  /**
   * Tras login HTTP: una sola área se fija sola; ninguna limpia contexto; varias solo invalidan id guardado si ya no aplica.
   */
  private applyAreaContextAfterLogin(user: User): void {
    const areas = user.areas_tramite || [];
    if (areas.length === 0) {
      if (this.isBrowser) {
        try {
          localStorage.removeItem(LS_ACTIVE_AREA_ID);
        } catch { /* noop */ }
      }
      return;
    }
    if (areas.length === 1) {
      this.setActiveAreaId(areas[0].id);
      return;
    }
    const stored = this.getActiveAreaId();
    if (stored != null && !areas.some((a) => a.id === stored)) {
      if (this.isBrowser) {
        try {
          localStorage.removeItem(LS_ACTIVE_AREA_ID);
        } catch { /* noop */ }
      }
    }
  }

  /** Área activa elegida al iniciar sesión (contexto bandejas / trámite documentario). */
  getActiveAreaId(): number | null {
    if (!this.isBrowser) return null;
    try {
      const raw = localStorage.getItem(LS_ACTIVE_AREA_ID);
      if (raw == null || raw === '') return null;
      const n = parseInt(raw, 10);
      return Number.isFinite(n) ? n : null;
    } catch {
      return null;
    }
  }

  setActiveAreaId(id: number): void {
    if (!this.isBrowser) return;
    try {
      localStorage.setItem(LS_ACTIVE_AREA_ID, String(id));
    } catch { /* noop */ }
  }

  /** Indica si debe mostrarse el modal de selección de área (dos o más asignadas). */
  userNeedsAreaSelection(user: User | null): boolean {
    return (user?.areas_tramite?.length ?? 0) >= 2;
  }

  /** Valor inicial del combo: área guardada si sigue siendo válida, si no la primera de la lista. */
  getSuggestedAreaIdForModal(areas: AreaTramiteAsignada[]): number {
    if (!areas.length) return 0;
    const stored = this.getActiveAreaId();
    if (stored != null && areas.some((a) => a.id === stored)) {
      return stored;
    }
    return areas[0].id;
  }

  /**
   * Recarga permisos Spatie desde el servidor (getAllPermissions) y actualiza sesión.
   * Útil tras editar roles: el lateral usa `hasPermission()` sobre esta lista.
   */
  refreshSessionUser(): Observable<User | null> {
    if (!this.isLoggedIn()) {
      return of(null);
    }
    return this.http.get<{ success: boolean; data: { user: User } }>(`${this.apiUrl}/auth/me`).pipe(
      map((response) => {
        const user = response?.data?.user;
        if (user) {
          this.updateCurrentUser(user);
        }
        return user ?? null;
      }),
      catchError(() => of(null))
    );
  }

  /**
   * Super Admin por nombre de rol (sin distinguir mayúsculas; acepta variantes comunes).
   */
  isSuperAdmin(): boolean {
    return this.matchesSuperAdminRoleName();
  }

  /**
   * Bypass para **rutas** y comprobaciones de módulo (guards, `PermissionService`):
   * roles administrativos, Super Admin o trío pilar.
   */
  hasPrivilegedAdminRouteAccess(): boolean {
    if (!this.isLoggedIn()) return false;
    if (this.matchesPrivilegedAdminRoleName()) return true;
    if (this.matchesSuperAdminRoleName()) return true;
    return ADMIN_LATERAL_FULL_ACCESS_PERMISSION_TRIPLE.every((p) => this.hasPermission(p));
  }

  /**
   * Solo **Super Admin**: ve todos los ítems del lateral ADMINISTRACIÓN sin mirar la matriz.
   * Roles «Admin» u otros administrativos siguen el catálogo Spatie por enlace (`admin-sidebar.config.ts`).
   */
  hasAdminSidebarSuperAdminBypass(): boolean {
    return this.isLoggedIn() && this.matchesSuperAdminRoleName();
  }

  /** @deprecated Usar `hasPrivilegedAdminRouteAccess()` o `hasAdminSidebarSuperAdminBypass()` según contexto. */
  hasFullAdminSidebarAccess(): boolean {
    return this.hasPrivilegedAdminRouteAccess();
  }

  hasPermission(permission: string): boolean {
    const currentUser = this.getCurrentUser();
    return currentUser?.permissions?.includes(permission) || false;
  }

  hasRole(role: string): boolean {
    const want = role.trim().toLowerCase();
    return this.getUserRoleNames().some((n) => n.toLowerCase() === want);
  }

  hasAnyRole(roles: string[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  /** Nombres de rol desde `roles` y `roles_detail` (Spatie). */
  private getUserRoleNames(): string[] {
    const u = this.getCurrentUser();
    if (!u) return [];
    const names: string[] = [];
    const raw = (u.roles ?? []) as unknown[];
    for (const r of raw) {
      if (typeof r === 'string') names.push(r);
      else if (r && typeof r === 'object' && 'name' in (r as Record<string, unknown>)) {
        const n = (r as { name?: string }).name;
        if (n) names.push(n);
      }
    }
    for (const d of u.roles_detail ?? []) {
      if (d?.name) names.push(d.name);
    }
    return [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  }

  /** Alineado con `ADMIN_LATERAL_FULL_ACCESS_ROLES` / permission.guard (comparación sin mayúsculas). */
  private matchesPrivilegedAdminRoleName(): boolean {
    const privileged = new Set(
      ADMIN_LATERAL_FULL_ACCESS_ROLES.map((r) => r.trim().toLowerCase())
    );
    return this.getUserRoleNames().some((n) => privileged.has(n.toLowerCase()));
  }

  private matchesSuperAdminRoleName(): boolean {
    return this.getUserRoleNames().some((n) => {
      const x = n.trim().toLowerCase();
      return (
        x === 'super admin' ||
        x === 'super_admin' ||
        x === 'superadmin' ||
        x.replace(/[\s_-]/g, '') === 'superadmin'
      );
    });
  }

  /**
   * Maneja errores 401 redirigiendo al login
   * @param returnUrl URL a la que regresar después del login
   */
  handleUnauthorizedError(returnUrl?: string): void {
    this.logout();
    this.authRedirectService.redirectToLogin(returnUrl);
  }
}