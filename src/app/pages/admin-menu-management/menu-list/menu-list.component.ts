import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MenuService, MenuItem } from '../../../services/menu.service';

declare var $: any;

export interface Menu {
  id: number;
  nombre: string;
  url: string;
  icono: string;
  orden: number;
  activo: boolean;
  modulo: string;
  padre_id?: number;
  hijos?: Menu[];
}

@Component({
  selector: 'app-menu-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu-list.component.html',
  styleUrl: './menu-list.component.scss'
})
export class MenuListComponent implements OnInit, AfterViewInit {
  
  @ViewChild('menuTable', { static: false }) menuTable!: ElementRef;
  
  menus: Menu[] = [];
  isLoading = true;
  error: string | null = null;
  dataTable: any = null;
  
  // Modal states
  showEditModal = false;
  showCreateModal = false;
  showDeleteModal = false;
  
  // Form data
  selectedMenu: Menu | null = null;
  editForm = {
    id: 0,
    nombre: '',
    url: '',
    icono: '',
    orden: 0,
    activo: true,
    modulo: ''
  };

  constructor(private menuService: MenuService) { }

  ngOnInit(): void {
    this.loadMenus();
    this.checkLibrariesAvailability();
  }

  checkLibrariesAvailability(): void {
    console.log('🔍 Verificando disponibilidad de librerías...');
    console.log('jQuery disponible:', typeof $ !== 'undefined');
    console.log('DataTables disponible:', typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined');
    
    if (typeof $ !== 'undefined') {
      console.log('jQuery versión:', $.fn.jquery);
    }
  }

  ngAfterViewInit(): void {
    // DataTable se inicializará después de cargar los datos
  }

  loadMenus(): void {
    this.isLoading = true;
    this.error = null;
    
    // Usar el endpoint de sistema-menus para obtener todos los menús
    this.menuService.obtenerMenusPublicos().subscribe({
      next: (menuItems: MenuItem[]) => {
        this.menus = this.convertMenuItemToMenu(menuItems);
        this.isLoading = false;
        // Esperar a que las librerías estén cargadas antes de inicializar DataTable
        this.waitForLibrariesAndInitDataTable();
      },
      error: (error) => {
        console.error('Error cargando menús:', error);
        this.error = 'No se encontraron menús';
        this.isLoading = false;
        this.menus = []; // Limpiar menús en caso de error
        // Esperar a que las librerías estén cargadas antes de inicializar DataTable
        this.waitForLibrariesAndInitDataTable();
      }
    });
  }

  waitForLibrariesAndInitDataTable(): void {
    let attempts = 0;
    const maxAttempts = 50; // 5 segundos máximo
    
    const checkLibraries = () => {
      attempts++;
      
      if (typeof $ !== 'undefined' && typeof $.fn.DataTable !== 'undefined') {
        console.log('✅ jQuery y DataTables cargados, inicializando DataTable...');
        this.initDataTable();
      } else if (attempts < maxAttempts) {
        console.log(`⚠️ Intento ${attempts}/${maxAttempts}: Esperando jQuery y DataTables...`);
        setTimeout(checkLibraries, 100);
      } else {
        console.log('❌ Timeout: jQuery o DataTables no se cargaron, usando tabla simple...');
        this.initSimpleTable();
      }
    };
    
    // Esperar un poco más para asegurar que las librerías estén cargadas
    setTimeout(checkLibraries, 500);
  }

  initDataTable(): void {
    // Verificar que jQuery y DataTables estén disponibles
    if (typeof $ === 'undefined') {
      console.error('jQuery no está disponible');
      this.initSimpleTable();
      return;
    }
    
    if (typeof $.fn.DataTable === 'undefined') {
      console.error('DataTables no está disponible');
      this.initSimpleTable();
      return;
    }
    
    if (this.dataTable) {
      this.dataTable.destroy();
    }
    
    this.dataTable = $(this.menuTable.nativeElement).DataTable({
      data: this.menus,
      columns: [
        { data: 'id' },
        { 
          data: 'nombre',
          render: (data: any, type: any, row: any) => {
            return `<strong>${data}</strong>${row.hijos && row.hijos.length > 0 ? '<span class="badge badge-info ml-2">' + row.hijos.length + ' submenús</span>' : ''}`;
          }
        },
        { data: 'url' },
        { 
          data: 'icono',
          render: (data: any) => `<i class="${data}"></i> <span class="ml-2">${data}</span>`
        },
        { 
          data: 'modulo',
          render: (data: any) => `<span class="badge badge-secondary">${data}</span>`
        },
        { data: 'orden' },
        { 
          data: 'activo',
          render: (data: any) => {
            const badgeClass = data ? 'badge-success' : 'badge-danger';
            const text = data ? 'Activo' : 'Inactivo';
            return `<span class="badge ${badgeClass}">${text}</span>`;
          }
        },
        { 
          data: null,
          orderable: false,
          render: (data: any, type: any, row: any) => {
            return `
              <div class="btn-group">
                <button type="button" class="btn btn-sm btn-warning" onclick="window.editMenu(${row.id})">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-info" onclick="window.toggleMenu(${row.id})">
                  <i class="fas fa-power-off"></i>
                </button>
                <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteMenu(${row.id})">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `;
          }
        }
      ],
      language: {
        emptyTable: 'No se encontraron menús en el sistema',
        loadingRecords: 'Cargando menús del sistema...',
        processing: 'Procesando...',
        zeroRecords: 'No se encontraron registros que coincidan',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ registros',
        infoEmpty: 'Mostrando 0 a 0 de 0 registros',
        infoFiltered: '(filtrado de _MAX_ registros totales)',
        lengthMenu: 'Mostrar _MENU_ registros',
        search: 'Buscar:',
        paginate: {
          first: 'Primero',
          last: 'Último',
          next: 'Siguiente',
          previous: 'Anterior'
        }
      },
      pageLength: 10,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
      responsive: true,
      processing: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      buttons: [
        {
          text: '<i class="fas fa-plus"></i> Crear Menú',
          className: 'btn btn-primary',
          action: () => this.openCreateModal()
        },
        {
          text: '<i class="fas fa-download"></i> Exportar Excel',
          className: 'btn btn-success',
          extend: 'excel',
          title: 'Menús del Sistema'
        }
      ],
      initComplete: () => {
        // DataTable inicializado completamente
        console.log('DataTable inicializado con', this.menus.length, 'menús');
      }
    });

    // Hacer las funciones globales disponibles
    (window as any).editMenu = (id: number) => this.editMenuById(id);
    (window as any).toggleMenu = (id: number) => this.toggleMenuById(id);
    (window as any).deleteMenu = (id: number) => this.deleteMenuById(id);
    
    // Hacer DataTable globalmente accesible
    (window as any).dataTable = this.dataTable;
  }

  editMenuById(id: number): void {
    const menu = this.menus.find(m => m.id === id);
    if (menu) {
      this.openEditModal(menu);
    }
  }

  toggleMenuById(id: number): void {
    this.menuService.toggleMenu(id).subscribe({
      next: (response) => {
        if (response.success) {
          // Recargar la lista de menús desde el backend
          this.loadMenus();
          alert('Estado del menú actualizado exitosamente');
        } else {
          alert('Error al cambiar estado: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error cambiando estado del menú:', error);
        alert('Error al cambiar estado: ' + (error.error?.message || error.message));
      }
    });
  }

  deleteMenuById(id: number): void {
    const menu = this.menus.find(m => m.id === id);
    if (menu) {
      this.openDeleteModal(menu);
    }
  }

  refreshDataTable(): void {
    if (this.dataTable) {
      this.dataTable.clear();
      this.dataTable.rows.add(this.menus);
      this.dataTable.draw();
    }
  }

  reloadDataFromBackend(): void {
    this.loadMenus();
  }

  initSimpleTable(): void {
    console.log('🔄 Inicializando tabla simple con', this.menus.length, 'menús');
    
    // Fallback: crear tabla simple sin DataTables
    const tbody = this.menuTable.nativeElement.querySelector('tbody');
    if (tbody) {
      tbody.innerHTML = '';
      
      if (this.menus.length === 0) {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td colspan="8" class="text-center text-muted">
            <i class="fas fa-info-circle"></i> No se encontraron menús
          </td>
        `;
        tbody.appendChild(row);
        return;
      }
      
      this.menus.forEach(menu => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${menu.id}</td>
          <td><strong>${menu.nombre}</strong>${menu.hijos && menu.hijos.length > 0 ? '<span class="badge badge-info ml-2">' + menu.hijos.length + ' submenús</span>' : ''}</td>
          <td>${menu.url}</td>
          <td><i class="${menu.icono}"></i> <span class="ml-2">${menu.icono}</span></td>
          <td><span class="badge badge-secondary">${menu.modulo}</span></td>
          <td>${menu.orden}</td>
          <td><span class="badge ${menu.activo ? 'badge-success' : 'badge-danger'}">${menu.activo ? 'Activo' : 'Inactivo'}</span></td>
          <td>
            <div class="btn-group">
              <button type="button" class="btn btn-sm btn-warning" onclick="window.editMenu(${menu.id})">
                <i class="fas fa-edit"></i>
              </button>
              <button type="button" class="btn btn-sm btn-info" onclick="window.toggleMenu(${menu.id})">
                <i class="fas fa-power-off"></i>
              </button>
              <button type="button" class="btn btn-sm btn-danger" onclick="window.deleteMenu(${menu.id})">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
      
      // Hacer las funciones globales disponibles
      (window as any).editMenu = (id: number) => this.editMenuById(id);
      (window as any).toggleMenu = (id: number) => this.toggleMenuById(id);
      (window as any).deleteMenu = (id: number) => this.deleteMenuById(id);
      
      console.log('✅ Tabla simple inicializada correctamente');
    } else {
      console.error('❌ No se encontró el elemento tbody');
    }
  }


  private convertMenuItemToMenu(menuItems: MenuItem[]): Menu[] {
    return menuItems.map(item => ({
      id: item.id || Math.floor(Math.random() * 10000), // Generar ID si no existe
      nombre: (item as any).titulo || item.nombre || 'Sin nombre',
      url: (item as any).ruta || item.url || '#',
      icono: item.icono || 'fas fa-circle',
      orden: item.orden || 999, // Valor por defecto para elementos sin orden
      activo: item.activo || false,
      modulo: this.getModuleFromMenuItem(item),
      hijos: item.submenus ? this.convertMenuItemToMenu(item.submenus) : []
    }));
  }

  private getModuleFromMenuItem(item: MenuItem): string {
    // Determinar el módulo basado en el tipo y nombre
    if (item.tipo === 'externo' && item.sistema_externo) {
      return item.sistema_externo.nombre;
    }
    
    // Usar nombre o titulo con verificación de null/undefined
    const nombre = (item as any).titulo || item.nombre;
    if (nombre) {
      const nombreLower = nombre.toLowerCase();
      
      if (nombreLower.includes('planilla')) {
        return 'Planillas';
      }
      
      if (nombreLower.includes('usuario') || nombreLower.includes('rol')) {
        return 'Core';
      }
      
      if (nombreLower.includes('empleado')) {
        return 'RRHH';
      }
    }
    
    return 'Core';
  }


  toggleMenu(menu: Menu): void {
    menu.activo = !menu.activo;
    // Aquí podrías hacer una petición al backend para actualizar el estado
  }

  // Modal methods
  openCreateModal(): void {
    this.editForm = {
      id: 0,
      nombre: '',
      url: '',
      icono: 'fas fa-circle',
      orden: this.menus.length + 1,
      activo: true,
      modulo: 'Core'
    };
    this.showCreateModal = true;
  }

  openEditModal(menu: Menu): void {
    this.selectedMenu = menu;
    this.editForm = {
      id: menu.id,
      nombre: menu.nombre,
      url: menu.url,
      icono: menu.icono,
      orden: menu.orden,
      activo: menu.activo,
      modulo: menu.modulo
    };
    this.showEditModal = true;
  }

  openDeleteModal(menu: Menu): void {
    this.selectedMenu = menu;
    this.showDeleteModal = true;
  }

  closeModals(): void {
    this.showEditModal = false;
    this.showCreateModal = false;
    this.showDeleteModal = false;
    this.selectedMenu = null;
  }

  saveMenu(): void {
    if (this.showCreateModal) {
      this.createMenu();
    } else if (this.showEditModal) {
      this.updateMenu();
    }
  }

  createMenu(): void {
    const menuData = {
      sistema_id: 1, // Sistema por defecto (Core)
      nombre: this.editForm.nombre,
      ruta: this.editForm.url,
      icono: this.editForm.icono,
      orden: this.editForm.orden,
      activo: this.editForm.activo,
      permisos_requeridos: []
    };

    this.menuService.crearMenu(menuData).subscribe({
      next: (response) => {
        if (response.success) {
          // Recargar la lista de menús desde el backend
          this.loadMenus();
          this.closeModals();
          alert('Menú creado exitosamente');
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
    if (this.selectedMenu) {
      const menuData = {
        nombre: this.editForm.nombre,
        ruta: this.editForm.url,
        icono: this.editForm.icono,
        orden: this.editForm.orden,
        activo: this.editForm.activo,
        permisos_requeridos: []
      };

      this.menuService.actualizarMenu(this.selectedMenu.id, menuData).subscribe({
        next: (response) => {
          if (response.success) {
            // Recargar la lista de menús desde el backend
            this.loadMenus();
            this.closeModals();
            alert('Menú actualizado exitosamente');
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
  }

  deleteMenu(): void {
    if (this.selectedMenu) {
      this.menuService.eliminarMenu(this.selectedMenu.id).subscribe({
        next: (response) => {
          if (response.success) {
            // Recargar la lista de menús desde el backend
            this.loadMenus();
            this.closeModals();
            alert('Menú eliminado exitosamente');
          } else {
            alert('Error al eliminar menú: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error eliminando menú:', error);
          alert('Error al eliminar menú: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  getMenuStatusClass(activo: boolean): string {
    return activo ? 'badge-success' : 'badge-danger';
  }

  getMenuStatusText(activo: boolean): string {
    return activo ? 'Activo' : 'Inactivo';
  }

}
