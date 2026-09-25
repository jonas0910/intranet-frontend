import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';

// Interfaces
interface SistemaMenu {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
  url?: string;
  icono?: string;
  orden: number;
  activo: boolean;
  padre_id: number | null;
  sistema_id: number;
  permisos_requeridos: string[];
  sistema?: {
    id: number;
    nombre: string;
    codigo: string;
  };
  padre?: {
    id: number;
    nombre: string;
  };
  hijos?: SistemaMenu[];
}

interface Sistema {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
}

interface Permiso {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
}

@Component({
  selector: 'app-gestion-menus',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './gestion-menus.component.html',
  styleUrls: ['./gestion-menus.component.scss']
})
export class GestionMenusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Propiedades
  menus: SistemaMenu[] = [];
  sistemas: Sistema[] = [];
  permisos: Permiso[] = [];
  menusArbol: SistemaMenu[] = [];
  
  // Estados de modales
  showMenuModal = false;
  showDeleteModal = false;
  showPermisosModal = false;
  
  // Selecciones
  selectedMenu: SistemaMenu | null = null;
  selectedSistema: Sistema | null = null;
  menuToDelete: SistemaMenu | null = null;
  
  // Formularios
  menuForm!: FormGroup;
  permisosForm!: FormGroup;
  
  // Estados de carga
  loading = false;
  saving = false;
  
  // Filtros
  filtroSistema = '';
  filtroActivo = '';
  filtroBusqueda = '';
  
  // Permisos disponibles
  availablePermissions = [
    'ver', 'crear', 'editar', 'eliminar', 'exportar', 'importar', 'aprobar', 'rechazar'
  ];

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.menuForm = this.fb.group({
      nombre: ['', Validators.required],
      codigo: ['', Validators.required],
      descripcion: [''],
      url: [''],
      icono: [''],
      orden: [1, [Validators.required, Validators.min(1)]],
      activo: [true],
      padre_id: [null],
      sistema_id: ['', Validators.required],
      permisos_requeridos: [[]]
    });

    this.permisosForm = this.fb.group({
      nombre: ['', Validators.required],
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required]
    });
  }

  private loadInitialData(): void {
    this.loading = true;
    
    Promise.all([
      this.loadSistemas(),
      this.loadMenus(),
      this.loadPermisos()
    ]).finally(() => {
      this.loading = false;
    });
  }

  // Cargar sistemas
  loadSistemas(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Sistema[]>('sistemas-integrados')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const sistemasData = response.data.data || response.data;
              if (Array.isArray(sistemasData)) {
                this.sistemas = sistemasData;
              } else {
                this.loadSampleSistemas();
              }
            } else {
              this.loadSampleSistemas();
            }
            resolve();
          },
          error: () => {
            this.loadSampleSistemas();
            resolve();
          }
        });
    });
  }

  // Cargar menús
  loadMenus(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<SistemaMenu[]>('sistema-menus')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const menusData = response.data.data || response.data;
              if (Array.isArray(menusData)) {
                this.menus = menusData;
                this.buildMenuTree();
              } else {
                this.loadSampleMenus();
              }
            } else {
              this.loadSampleMenus();
            }
            resolve();
          },
          error: () => {
            this.loadSampleMenus();
            resolve();
          }
        });
    });
  }

  // Cargar permisos
  loadPermisos(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Permiso[]>('permisos')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const permisosData = response.data.data || response.data;
              if (Array.isArray(permisosData)) {
                this.permisos = permisosData;
              } else {
                this.loadSamplePermisos();
              }
            } else {
              this.loadSamplePermisos();
            }
            resolve();
          },
          error: () => {
            this.loadSamplePermisos();
            resolve();
          }
        });
    });
  }

  // Construir árbol de menús
  private buildMenuTree(): void {
    const menuMap = new Map<number, SistemaMenu>();
    const rootMenus: SistemaMenu[] = [];

    // Crear mapa de menús
    this.menus.forEach(menu => {
      menu.hijos = [];
      menuMap.set(menu.id, menu);
    });

    // Construir jerarquía
    this.menus.forEach(menu => {
      if (menu.padre_id !== null && menuMap.has(menu.padre_id)) {
        const padre = menuMap.get(menu.padre_id)!;
        padre.hijos!.push(menu);
      } else {
        rootMenus.push(menu);
      }
    });

    this.menusArbol = rootMenus.sort((a, b) => a.orden - b.orden);
  }

  // Cargar datos de muestra
  private loadSampleSistemas(): void {
    this.sistemas = [
      { id: 1, nombre: 'Sistema ERP', codigo: 'erp', activo: true },
      { id: 2, nombre: 'Recursos Humanos', codigo: 'rrhh', activo: true },
      { id: 3, nombre: 'Contabilidad', codigo: 'cont', activo: true }
    ];
  }

  private loadSampleMenus(): void {
    this.menus = [
      {
        id: 1,
        nombre: 'Dashboard',
        codigo: 'dashboard',
        descripcion: 'Panel principal del sistema',
        url: '/dashboard',
        icono: 'fas fa-tachometer-alt',
        orden: 1,
        activo: true,
        padre_id: null,
        sistema_id: 1,
        permisos_requeridos: ['ver'],
        sistema: { id: 1, nombre: 'Sistema ERP', codigo: 'erp' }
      },
      {
        id: 2,
        nombre: 'Ventas',
        codigo: 'ventas',
        descripcion: 'Gestión de ventas',
        url: '/ventas',
        icono: 'fas fa-shopping-cart',
        orden: 2,
        activo: true,
        padre_id: null,
        sistema_id: 1,
        permisos_requeridos: ['ver', 'crear'],
        sistema: { id: 1, nombre: 'Sistema ERP', codigo: 'erp' }
      },
      {
        id: 3,
        nombre: 'Empleados',
        codigo: 'empleados',
        descripcion: 'Gestión de empleados',
        url: '/empleados',
        icono: 'fas fa-users',
        orden: 1,
        activo: true,
        padre_id: null,
        sistema_id: 2,
        permisos_requeridos: ['ver', 'editar'],
        sistema: { id: 2, nombre: 'Recursos Humanos', codigo: 'rrhh' }
      }
    ];
    this.buildMenuTree();
  }

  private loadSamplePermisos(): void {
    this.permisos = [
      { id: 1, nombre: 'Ver', codigo: 'ver', descripcion: 'Permite visualizar información' },
      { id: 2, nombre: 'Crear', codigo: 'crear', descripcion: 'Permite crear nuevos registros' },
      { id: 3, nombre: 'Editar', codigo: 'editar', descripcion: 'Permite modificar registros' },
      { id: 4, nombre: 'Eliminar', codigo: 'eliminar', descripcion: 'Permite eliminar registros' }
    ];
  }

  // Abrir modal de menú
  openMenuModal(menu?: SistemaMenu): void {
    this.selectedMenu = menu || null;
    
    if (menu) {
      // Modo edición
      this.menuForm.patchValue({
        nombre: menu.nombre,
        codigo: menu.codigo,
        descripcion: menu.descripcion || '',
        url: menu.url || '',
        icono: menu.icono || '',
        orden: menu.orden,
        activo: menu.activo,
        padre_id: menu.padre_id,
        sistema_id: menu.sistema_id,
        permisos_requeridos: menu.permisos_requeridos || []
      });
    } else {
      // Modo creación
      this.menuForm.reset({
        activo: true,
        orden: 1,
        padre_id: null,
        permisos_requeridos: []
      });
    }
    
    this.showMenuModal = true;
  }

  // Abrir modal de eliminación
  openDeleteModal(menu: SistemaMenu): void {
    this.menuToDelete = menu;
    this.showDeleteModal = true;
  }

  // Guardar menú
  saveMenu(): void {
    if (this.menuForm.valid) {
      this.saving = true;
      const menuData = this.menuForm.value;
      
      if (this.selectedMenu) {
        // Actualizar menú existente
        this.apiService.put(`sistema-menus/${this.selectedMenu.id}`, menuData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Menú actualizado exitosamente');
                this.loadMenus();
                this.showMenuModal = false;
                this.selectedMenu = null;
              } else {
                this.notificationService.error('Error al actualizar el menú');
              }
            },
            error: (error) => {
              console.error('Error updating menu:', error);
              this.notificationService.error('Error al actualizar el menú');
            },
            complete: () => {
              this.saving = false;
            }
          });
      } else {
        // Crear nuevo menú
        this.apiService.post('sistema-menus', menuData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Menú creado exitosamente');
                this.loadMenus();
                this.showMenuModal = false;
              } else {
                this.notificationService.error('Error al crear el menú');
              }
            },
            error: (error) => {
              console.error('Error creating menu:', error);
              this.notificationService.error('Error al crear el menú');
            },
            complete: () => {
              this.saving = false;
            }
          });
      }
    }
  }

  // Eliminar menú
  deleteMenu(): void {
    if (this.menuToDelete) {
      this.apiService.delete(`sistema-menus/${this.menuToDelete.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.notificationService.success(response.message || 'Menú eliminado exitosamente');
              this.loadMenus();
              this.showDeleteModal = false;
              this.menuToDelete = null;
            } else {
              this.notificationService.error(response.message || 'Error al eliminar el menú');
            }
          },
          error: (error) => {
            console.error('Error deleting menu:', error);
            let errorMessage = 'Error al eliminar el menú';
            
            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }
            
            this.notificationService.error(errorMessage);
          }
        });
    }
  }

  // Cambiar estado del menú
  toggleMenuStatus(menu: SistemaMenu): void {
    const newStatus = !menu.activo;
    
    this.apiService.put(`sistema-menus/${menu.id}`, { activo: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            menu.activo = newStatus;
            this.notificationService.success(`Menú ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
          } else {
            this.notificationService.error('Error al cambiar el estado');
          }
        },
        error: (error) => {
          console.error('Error toggling menu status:', error);
          this.notificationService.error('Error al cambiar el estado');
        }
      });
  }

  // Obtener menús filtrados
  get filteredMenus(): SistemaMenu[] {
    let filtered = this.menus;

    // Filtro por sistema
    if (this.filtroSistema) {
      filtered = filtered.filter(menu => menu.sistema_id.toString() === this.filtroSistema);
    }

    // Filtro por estado
    if (this.filtroActivo !== '') {
      const activo = this.filtroActivo === 'true';
      filtered = filtered.filter(menu => menu.activo === activo);
    }

    // Filtro por búsqueda
    if (this.filtroBusqueda) {
      const search = this.filtroBusqueda.toLowerCase();
      filtered = filtered.filter(menu => 
        menu.nombre.toLowerCase().includes(search) ||
        menu.codigo.toLowerCase().includes(search) ||
        (menu.descripcion && menu.descripcion.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  // Obtener menús padre disponibles
  get availableParentMenus(): SistemaMenu[] {
    if (!this.selectedMenu) {
      return this.menus.filter(menu => menu.activo);
    }
    
    // Excluir el menú actual y sus hijos para evitar referencias circulares
    return this.menus.filter(menu => 
      menu.activo && 
      menu.id !== this.selectedMenu!.id &&
      !this.isDescendant(menu, this.selectedMenu!.id)
    );
  }

  // Verificar si un menú es descendiente de otro
  private isDescendant(menu: SistemaMenu, targetId: number): boolean {
    if (menu.padre_id === targetId) return true;
    if (menu.padre_id !== null) {
      const padre = this.menus.find(m => m.id === menu.padre_id);
      return padre ? this.isDescendant(padre, targetId) : false;
    }
    return false;
  }

  // Obtener nombre del sistema
  getSistemaNombre(sistemaId: number): string {
    const sistema = this.sistemas.find(s => s.id === sistemaId);
    return sistema ? sistema.nombre : 'N/A';
  }

  // Obtener nombre del menú padre
  getPadreNombre(padreId: number | null): string {
    if (!padreId) return 'Menú Principal';
    const padre = this.menus.find(m => m.id === padreId);
    return padre ? padre.nombre : 'N/A';
  }

  // Cerrar modales
  closeModals(): void {
    this.showMenuModal = false;
    this.showDeleteModal = false;
    this.showPermisosModal = false;
    this.selectedMenu = null;
    this.menuToDelete = null;
  }

  // Limpiar filtros
  clearFilters(): void {
    this.filtroSistema = '';
    this.filtroActivo = '';
    this.filtroBusqueda = '';
  }

  // Manejar cambios en permisos
  onPermissionChange(event: any, permiso: string): void {
    const permisosActuales = this.menuForm.get('permisos_requeridos')?.value || [];
    
    if (event.target.checked) {
      if (!permisosActuales.includes(permiso)) {
        permisosActuales.push(permiso);
      }
    } else {
      const index = permisosActuales.indexOf(permiso);
      if (index > -1) {
        permisosActuales.splice(index, 1);
      }
    }
    
    this.menuForm.patchValue({ permisos_requeridos: permisosActuales });
  }
}
