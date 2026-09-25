import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthRedirectService {
  
  constructor(private router: Router) { }

  /**
   * Redirige al login cuando hay un error 401
   * @param returnUrl URL a la que regresar después del login
   */
  redirectToLogin(returnUrl?: string): void {
    console.log('🔄 Redirigiendo al login por error 401');
    
    // BYPASS para rutas de administración
    if (this.isAdminRoute()) {
      console.log('🚀 BYPASS: No redirigiendo al login en ruta de administración');
      return;
    }
    
    const queryParams = returnUrl ? { returnUrl } : {};
    this.router.navigate(['/login'], { queryParams });
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
   * Verifica si el usuario está autenticado y redirige si no
   * @param returnUrl URL a la que regresar después del login
   */
  checkAuthAndRedirect(returnUrl?: string): boolean {
    const token = localStorage.getItem('token');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    
    if (!token || !isLoggedIn) {
      this.redirectToLogin(returnUrl);
      return false;
    }
    
    return true;
  }
}
