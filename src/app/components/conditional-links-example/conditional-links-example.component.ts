import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-conditional-links-example',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conditional-links-example.component.html',
  styleUrls: ['./conditional-links-example.component.scss']
})
export class ConditionalLinksExampleComponent {

  // ✅ Datos de ejemplo para mostrar el patrón
  navigationItems = [
    { 
      nombre: 'Dashboard', 
      url: '/dashboard',
      icon: 'fas fa-tachometer-alt',
      activo: true 
    },
    { 
      nombre: 'Empleados', 
      url: '/empleados',
      icon: 'fas fa-users',
      activo: true 
    },
    { 
      nombre: 'Configuración', 
      url: '/configuracion',
      icon: 'fas fa-cog',
      activo: true 
    },
    { 
      nombre: 'Reportes', 
      url: null, // ❌ Sin URL - será disabled
      icon: 'fas fa-chart-bar',
      activo: false 
    },
    { 
      nombre: 'Mantenimiento', 
      url: '', // ❌ URL vacía - será disabled
      icon: 'fas fa-tools',
      activo: false 
    },
    { 
      nombre: 'Perfil', 
      url: '/perfil',
      icon: 'fas fa-user',
      activo: true 
    }
  ];

  // ✅ Métodos para acciones sin navegación
  onDisabledAction(menuItem: any): void {
    console.log(`⚠️ Acción deshabilitada: ${menuItem.nombre}`);
    
    // Mostrar mensaje de información
    this.showMessage(`"${menuItem.nombre}" aún está en desarrollo`);
  }

  private showMessage(message: string): void {
    // En una aplicación real, aquí usarías un servicio de notificaciones
    alert(`ℹ️ ${message}`);
  }

  // ✅ Métodos adicionales para demostraciones
  viewDashboard(): void {
    console.log('📊 Navegando al dashboard');
  }

  viewEmployees(): void {
    console.log('👥 Navegando a empleados');
  }

  viewConfiguration(): void {
    console.log('⚙️ Navegando a configuración');
  }

  viewProfile(): void {
    console.log('👤 Navegando al perfil');
  }
}
