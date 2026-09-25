import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-routerlink-example',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './routerlink-example.component.html',
  styleUrls: ['./routerlink-example.component.scss']
})
export class RouterlinkExampleComponent {

  // ✅ Datos para navegación con routerLink
  navigationMenu = [
    { path: '/dashboard', label: 'Dashboard', icon: 'fas fa-tachometer-alt' },
    { path: '/empleados', label: 'Empleados', icon: 'fas fa-users' },
    { path: '/configuracion', label: 'Configuración', icon: 'fas fa-cog' },
  ];

  // ✅ Datos para acciones (sin navegación)
  quickActions = [
    { action: 'export', label: 'Exportar Datos', icon: 'fas fa-download' },
    { action: 'print', label: 'Imprimir', icon: 'fas fa-print' },
    { action: 'refresh', label: 'Actualizar', icon: 'fas fa-sync-alt' },
  ];

  // ✅ Métodos para acciones
  onQuickAction(action: string): void {
    console.log(`Acción ejecutada: ${action}`);
    
    switch (action) {
      case 'export':
        this.exportData();
        break;
      case 'print':
        this.printData();
        break;
      case 'refresh':
        this.refreshData();
        break;
    }
  }

  private exportData(): void {
    // Lógica para exportar datos
    alert('Exportando datos...');
  }

  private printData(): void {
    // Lógica para imprimir
    alert('Imprimiendo...');
  }

  private refreshData(): void {
    // Lógica para actualizar
    alert('Datos actualizados');
  }
}
