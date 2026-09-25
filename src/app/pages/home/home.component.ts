import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('🏠 HomeComponent: Página inicial cargada');
    
    // Verificar si el usuario está autenticado
    const isLoggedIn = this.authService.isLoggedIn();
    const currentUser = this.authService.getCurrentUser();
    
    console.log('🔍 Estado de autenticación en Home:', {
      isLoggedIn,
      hasUser: !!currentUser,
      userEmail: currentUser?.email || 'Sin email',
      timestamp: new Date().toISOString()
    });
    
    // Si ya está autenticado, redirigir al dashboard
    if (isLoggedIn && currentUser) {
      console.log('✅ Usuario autenticado - redirigiendo al dashboard');
      this.router.navigate(['/dashboard']);
      return;
    }
    
    // Si no está autenticado, mostrar página de inicio
    console.log('📄 Mostrando página de inicio para usuario no autenticado');
  }

  navigateToLogin(): void {
    console.log('🔑 Usuario dirigiéndose a login');
    this.router.navigate(['/login']);
  }
}
