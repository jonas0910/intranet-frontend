import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuService } from '../../../services/menu.service';

export interface Menu {
  id?: number;
  nombre: string;
  url: string;
  icono: string;
  orden: number;
  activo: boolean;
  modulo: string;
  padre_id?: number;
}

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu-form.component.html',
  styleUrl: './menu-form.component.scss'
})
export class MenuFormComponent implements OnInit {
  
  menu: Menu = {
    nombre: '',
    url: '',
    icono: 'fas fa-circle',
    orden: 1,
    activo: true,
    modulo: 'Core',
    padre_id: undefined
  };

  isEditMode = false;
  menuId: number | null = null;

  // Opciones para el formulario
  modulos = [
    { value: 'Core', label: 'Core' },
    { value: 'Planillas', label: 'Planillas' },
    { value: 'RRHH', label: 'Recursos Humanos' },
    { value: 'Contabilidad', label: 'Contabilidad' },
    { value: 'Inventarios', label: 'Inventarios' }
  ];

  iconos = [
    { value: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { value: 'fas fa-users', label: 'Usuarios' },
    { value: 'fas fa-money-check-alt', label: 'Planillas' },
    { value: 'fas fa-file-alt', label: 'Documentos' },
    { value: 'fas fa-chart-bar', label: 'Reportes' },
    { value: 'fas fa-cog', label: 'Configuración' },
    { value: 'fas fa-sitemap', label: 'Menús' },
    { value: 'fas fa-key', label: 'Permisos' },
    { value: 'fas fa-shield-alt', label: 'Seguridad' },
    { value: 'fas fa-tools', label: 'Herramientas' },
    { value: 'fas fa-circle', label: 'Círculo' },
    { value: 'fas fa-square', label: 'Cuadrado' }
  ];

  menusPadre = [
    { value: undefined, label: 'Menú Principal' },
    { value: 1, label: 'Dashboard' },
    { value: 2, label: 'Planillas' },
    { value: 5, label: 'Gestión Documental' }
  ];

  constructor(
    private route: ActivatedRoute,
    private menuService: MenuService
  ) { }

  ngOnInit(): void {
    // Verificar si es modo edición
    this.route.params.subscribe(params => {
      if (params['id']) {
        this.isEditMode = true;
        this.menuId = +params['id'];
        this.loadMenu(this.menuId);
      }
    });
  }

  loadMenu(id: number): void {
    console.log('Cargando menú con ID:', id);
    
    // Cargar menú real desde la API
    this.menuService.obtenerMenuPorId(id).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const menuData = response.data;
          this.menu = {
            id: menuData.id,
            nombre: menuData.nombre,
            url: menuData.ruta,
            icono: menuData.icono,
            orden: menuData.orden,
            activo: menuData.activo,
            modulo: menuData.modulo || 'Core',
            padre_id: menuData.padre_id
          };
          console.log('✅ Menú cargado:', this.menu);
        } else {
          console.error('❌ Error cargando menú:', response.message);
          this.loadDefaultMenu(id);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando menú:', error);
        this.loadDefaultMenu(id);
      }
    });
  }

  private loadDefaultMenu(id: number): void {
    // Datos por defecto si falla la carga
    this.menu = {
      id: id,
      nombre: 'Menú',
      url: '/menu',
      icono: 'fas fa-circle',
      orden: 1,
      activo: true,
      modulo: 'Core',
      padre_id: undefined
    };
  }

  onSubmit(): void {
    if (this.isEditMode) {
      this.updateMenu();
    } else {
      this.createMenu();
    }
  }

  createMenu(): void {
    console.log('Creando menú:', this.menu);
    
    const menuData = {
      sistema_id: 1, // Sistema por defecto (Core)
      nombre: this.menu.nombre,
      ruta: this.menu.url,
      icono: this.menu.icono,
      orden: this.menu.orden,
      activo: this.menu.activo,
      permisos_requeridos: []
    };

    this.menuService.crearMenu(menuData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Menú creado exitosamente!');
          this.resetForm();
          window.history.back();
        } else {
          alert('Error al crear menú: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error creando menú:', error);
        alert('Error al crear menú: ' + (error.error?.message || error.message));
      }
    });
  }

  updateMenu(): void {
    console.log('Actualizando menú:', this.menu);
    
    if (!this.menu.id) {
      alert('Error: ID de menú no encontrado');
      return;
    }

    const menuData = {
      nombre: this.menu.nombre,
      ruta: this.menu.url,
      icono: this.menu.icono,
      orden: this.menu.orden,
      activo: this.menu.activo,
      permisos_requeridos: []
    };

    this.menuService.actualizarMenu(this.menu.id, menuData).subscribe({
      next: (response) => {
        if (response.success) {
          alert('Menú actualizado exitosamente!');
          window.history.back();
        } else {
          alert('Error al actualizar menú: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error actualizando menú:', error);
        alert('Error al actualizar menú: ' + (error.error?.message || error.message));
      }
    });
  }

  resetForm(): void {
    this.menu = {
      nombre: '',
      url: '',
      icono: 'fas fa-circle',
      orden: 1,
      activo: true,
      modulo: 'Core',
      padre_id: undefined
    };
  }

  onCancel(): void {
    if (this.isEditMode) {
      // Volver a la lista
      window.history.back();
    } else {
      this.resetForm();
    }
  }

}
