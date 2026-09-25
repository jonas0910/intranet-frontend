import { Injectable } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthErrorOperator {
  
  constructor(private authService: AuthService) { }

  /**
   * Operador RxJS para manejar errores de autenticación
   * @param returnUrl URL a la que regresar después del login
   * @param autoRedirect Si debe redirigir automáticamente (default: false)
   */
  handleAuthError(returnUrl?: string, autoRedirect: boolean = false) {
    return catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        console.warn('🔒 Error 401 detectado en operador');
        
        // BYPASS completo en modo desarrollo si el interceptor está deshabilitado
        if (this.isDevelopmentMode() && !this.isInterceptorEnabled()) {
          console.log('🚀 BYPASS: No manejando error 401 en modo desarrollo (interceptor deshabilitado)');
          // Re-lanzar el error para que lo maneje el componente
          return throwError(() => error);
        }
        
        // BYPASS para rutas de administración
        if (this.isAdminRoute()) {
          console.log('🚀 BYPASS: No manejando error 401 en ruta de administración');
          // Re-lanzar el error para que lo maneje el componente
          return throwError(() => error);
        }
        
        // Solo redirigir automáticamente si se solicita explícitamente
        if (autoRedirect) {
          console.warn('🔒 Redirigiendo automáticamente al login...');
          this.authService.handleUnauthorizedError(returnUrl);
        } else {
          console.warn('🔒 Error 401 detectado pero no redirigiendo automáticamente');
          // Solo limpiar la sesión si el usuario no está realmente autenticado
          if (!this.authService.isLoggedIn()) {
            console.warn('🔒 Usuario no autenticado, limpiando sesión...');
            this.authService.logout();
          }
        }
      }
      
      // Re-lanzar el error para que lo maneje el componente
      return throwError(() => error);
    });
  }

  // Verificar si estamos en una ruta de administración
  private isAdminRoute(): boolean {
    try {
      const currentUrl = window.location.pathname;
      return currentUrl.includes('/admin-menu-management');
    } catch (error) {
      return false;
    }
  }

  /**
   * Verifica si estamos en modo desarrollo
   */
  private isDevelopmentMode(): boolean {
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
   * (Misma lógica que en el interceptor y AuthGuard)
   */
  private isInterceptorEnabled(): boolean {
    // En producción, siempre habilitado
    if (typeof window === 'undefined') {
      return true;
    }
    
    // Verificar si estamos en modo desarrollo
    const isDevelopment = this.isDevelopmentMode();
    
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
}
