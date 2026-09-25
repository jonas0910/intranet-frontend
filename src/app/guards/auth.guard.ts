import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, catchError, timeout } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../environments/environment';

const isDev = () => !environment.production;

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const isAdminMenuRoute = state.url.includes('/admin-menu-management');
  if (isAdminMenuRoute) return true;

  // In development, allow gestor-contenidos without token validation to prevent hangs
  if (isDevelopmentMode() && state.url.includes('/gestor-contenidos')) {
    const isLoggedIn = authService.isLoggedIn();
    if (isLoggedIn) return true;
  }

  if (isDevelopmentMode() && !isInterceptorEnabled()) return true;

  const isLoggedIn = authService.isLoggedIn();
  const currentUser = authService.getCurrentUser();

  if (isLoggedIn && currentUser) {
    return authService.validateToken().pipe(
      timeout(5000),
      map((response: any) => {
        if (response.success && response.data?.valid) {
          return true;
        }
        if (isDev()) console.warn('AuthGuard: Token inválido, redirigiendo a login');
        authService.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return false;
      }),
      catchError((error) => {
        if (isDev()) console.error('AuthGuard: Error validando token:', error);
        // In development, allow navigation even when validation fails
        if (isDevelopmentMode()) {
          console.warn('AuthGuard: Permitiendo acceso en modo desarrollo a pesar del error');
          return of(true);
        }
        authService.logout();
        router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      })
    );
  }

  if (isDev()) {
    console.warn('AuthGuard: Usuario no autenticado - redirigiendo a login');
  }
  
  // Solo redirigir si no estamos ya en login
  if (state.url !== '/login') {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return false;
};

/**
 * Verifica si estamos en modo desarrollo
 */
function isDevelopmentMode(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1' ||
         window.location.hostname.includes('dev') ||
         window.location.port === '4200' ||
         window.location.port === '8001';
}

/**
 * Verifica si el interceptor de autenticación está habilitado
 * (Misma lógica que en el interceptor)
 */
function isInterceptorEnabled(): boolean {
  // En producción, siempre habilitado
  if (typeof window === 'undefined') {
    return true;
  }
  
  // Verificar si estamos en modo desarrollo
  const isDevelopment = isDevelopmentMode();
  
  // En desarrollo, verificar parámetros de URL
  if (isDevelopment) {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Si se especifica explícitamente disable-interceptor=true, deshabilitar
    if (urlParams.get('disable-interceptor') === 'true') {
      return false;
    }
    
    // Si se especifica explícitamente enable-interceptor=true, habilitar
    if (urlParams.get('enable-interceptor') === 'true') {
      return true;
    }
    
    // Por defecto en desarrollo, HABILITADO para SaaS
    return true;
  }
  
  // En producción, siempre habilitado
  return true;
}
