import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { SystemPatternIntegrationService, SistemaIntegrado } from '../../services/system-pattern-integration.service';
import { MenuPattern } from '../../services/pattern.service';

// Interfaces
interface Sistema {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  menus: Menu[];
  color?: string;
  url?: string;
  descripcion?: string;
  sso_habilitado?: boolean;
  sso_force?: boolean;
}

interface Menu {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  permisos_requeridos: string[];
  url?: string;
  orden?: number;
}

@Component({
  selector: 'app-sistemas',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule],
  templateUrl: './sistemas.component.html',
  styleUrls: ['./sistemas.component.css']
})
export class SistemasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Propiedades
  sistemas: Sistema[] = [];
  filteredSistemas: Sistema[] = [];
  showDetailsModal = false;
  selectedSistema: Sistema | null = null;
  loading = false;
  error = false;
  errorMessage = '';
  
  // Propiedades para gestión de sistemas
  showSystemFormModal = false;
  showDeleteModal = false;
  isEditing = false;
  saving = false;
  deleting = false;
  sistemaToDelete: Sistema | null = null;
  systemForm!: FormGroup;
  
  // Propiedades para la tabla
  viewMode: 'cards' | 'table' = 'cards';
  searchTerm: string = '';
  statusFilter: string = '';
  sortField: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  
  // Propiedades para filtrado de menús
  filteredMenus: any[] = [];
  menuSearchTerm: string = '';
  menuStatusFilter: string = '';
  menuSortField: string = '';
  menuSortDirection: 'asc' | 'desc' = 'asc';
  
  // Propiedades para paginación
  paginatedSistemas: Sistema[] = [];
  currentPage: number = 1;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  

  
  constructor(
    private apiService: ApiService,
    private router: Router,
    private fb: FormBuilder,
    private notificationService: NotificationService,
    private systemPatternService: SystemPatternIntegrationService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadSistemas();
    
    // Fallback de seguridad: si después de 10 segundos sigue cargando, forzar carga de datos de ejemplo
    setTimeout(() => {
      if (this.loading) {
        console.log('⚠️ Timeout de seguridad: forzando carga de datos de ejemplo');
        this.loading = false;
        this.error = true;
        this.errorMessage = 'Timeout al cargar sistemas. Se muestran datos de ejemplo.';
        this.loadSampleSystems();
      }
    }, 10000);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Cargar sistemas únicamente desde la tabla sistemas_integrados
  loadSistemas(): void {
    console.log('🔄 Cargando sistemas desde tabla sistemas_integrados...');
    this.loading = true;
    this.error = false;
    
    // Cargar únicamente sistemas integrados desde la tabla sistemas_integrados
    this.systemPatternService.getIntegratedSystems()
      .pipe(
        takeUntil(this.destroy$),
        timeout(10000),
        catchError(error => {
          console.error('❌ Error al cargar sistemas integrados:', error);
          return of([]);
        })
      )
      .subscribe({
        next: (integratedSystems: SistemaIntegrado[]) => {
          console.log('✅ Sistemas integrados cargados desde tabla sistemas_integrados:', integratedSystems.length);
          
          // Convertir sistemas integrados a formato de sistema
          this.sistemas = integratedSystems.map(sistema => this.convertIntegratedSystemToSistema(sistema));
          this.filteredSistemas = [...this.sistemas];
          this.updatePagination();
          
          if (this.sistemas.length === 0) {
            console.log('⚠️ No hay sistemas disponibles en tabla sistemas_integrados - cargando datos de ejemplo');
            this.loadSampleSystems();
            this.error = true;
            this.errorMessage = 'No se encontraron sistemas en la tabla sistemas_integrados. Se muestran datos de ejemplo.';
          } else {
            this.assignColors();
            console.log('✅ Total de sistemas cargados desde sistemas_integrados:', this.sistemas.length);
          }
          
          this.loading = false;
          console.log('🏁 Carga de sistemas completada desde tabla sistemas_integrados');
        },
        error: (error) => {
          console.error('❌ Error crítico al cargar sistemas integrados:', error);
          console.log('⚠️ Cargando datos de ejemplo por error en sistemas integrados');
          this.loadSampleSystems();
          this.error = true;
          this.errorMessage = 'Error al conectar con la tabla sistemas_integrados. Se muestran datos de ejemplo.';
          this.loading = false;
          console.log('🏁 Carga de sistemas completada (datos de ejemplo)');
        }
      });
  }

  // Convertir patrón de menú a menú
  convertMenuPatternToMenu(menuPattern: MenuPattern): Menu {
    return {
      id: Date.now() + Math.random(), // ID único
      nombre: menuPattern.nombre,
      codigo: menuPattern.codigo,
      activo: menuPattern.estado_default,
      permisos_requeridos: menuPattern.permisos_requeridos
    };
  }

  // Convertir sistema integrado a sistema
  convertIntegratedSystemToSistema(sistemaIntegrado: SistemaIntegrado): Sistema {
    return {
      id: sistemaIntegrado.id,
      nombre: sistemaIntegrado.nombre,
      codigo: sistemaIntegrado.codigo,
      activo: sistemaIntegrado.activo,
      url: sistemaIntegrado.url_base,
      descripcion: sistemaIntegrado.descripcion,
      sso_habilitado: sistemaIntegrado.sso_habilitado,
      sso_force: sistemaIntegrado.sso_force,
      menus: sistemaIntegrado.patron_data?.menus?.map(menu => this.convertMenuPatternToMenu(menu)) || [],
      color: this.getColorByCategory(sistemaIntegrado.patron_data?.categoria || 'sistema_interno')
    };
  }

  // Obtener color por categoría
  getColorByCategory(categoria: string): string {
    const colorMap: { [key: string]: string } = {
      'gestión_interna': 'primary',
      'finanzas': 'success',
      'logistica': 'info',
      'comercial': 'warning'
    };
    return colorMap[categoria] || 'secondary';
  }

  // Crear sistema por defecto (fallback)
  createDefaultSistema(): Sistema {
    return {
      id: Date.now(),
      nombre: 'Sistema por Defecto',
      codigo: 'DEFAULT',
      activo: true,
      menus: [],
      color: 'primary'
    };
  }

  // Cargar datos de ejemplo
  loadSampleSystems(): void {
    console.log('🔄 Cargando sistemas de ejemplo...');
    
    this.sistemas = [
      {
        id: 1,
        nombre: 'Sistema de Recursos Humanos',
        codigo: 'RRHH',
        activo: true,
        menus: [
          { id: 1, nombre: 'Gestión de Empleados', codigo: 'empleados', activo: true, permisos_requeridos: ['rrhh.empleados.read', 'rrhh.empleados.write'] },
          { id: 2, nombre: 'Nóminas y Salarios', codigo: 'nominas', activo: true, permisos_requeridos: ['rrhh.nominas.read'] },
          { id: 3, nombre: 'Capacitación', codigo: 'capacitacion', activo: false, permisos_requeridos: ['rrhh.capacitacion.read'] }
        ]
      },
      {
        id: 2,
        nombre: 'Sistema de Contabilidad',
        codigo: 'CONTAB',
        activo: true,
        menus: [
          { id: 4, nombre: 'Facturación', codigo: 'facturacion', activo: true, permisos_requeridos: ['contab.facturacion.read', 'contab.facturacion.write'] },
          { id: 5, nombre: 'Reportes Financieros', codigo: 'reportes', activo: true, permisos_requeridos: ['contab.reportes.read'] }
        ]
      },
      {
        id: 3,
        nombre: 'Sistema de Inventarios',
        codigo: 'INV',
        activo: true,
        menus: [
          { id: 6, nombre: 'Control de Stock', codigo: 'stock', activo: true, permisos_requeridos: ['inv.stock.read', 'inv.stock.write'] },
          { id: 7, nombre: 'Movimientos', codigo: 'movimientos', activo: true, permisos_requeridos: ['inv.movimientos.read'] },
          { id: 8, nombre: 'Alertas', codigo: 'alertas', activo: false, permisos_requeridos: ['inv.alertas.read'] }
        ]
      },
      {
        id: 4,
        nombre: 'Sistema de Ventas',
        codigo: 'VENTAS',
        activo: true,
        menus: [
          { id: 9, nombre: 'Clientes', codigo: 'clientes', activo: true, permisos_requeridos: ['ventas.clientes.read', 'ventas.clientes.write'] },
          { id: 10, nombre: 'Pedidos', codigo: 'pedidos', activo: true, permisos_requeridos: ['ventas.pedidos.read', 'ventas.pedidos.write'] },
          { id: 11, nombre: 'Reportes de Ventas', codigo: 'reportes-ventas', activo: true, permisos_requeridos: ['ventas.reportes.read'] }
        ]
      },
      {
        id: 5,
        nombre: 'Sistema de Compras',
        codigo: 'COMPRAS',
        activo: true,
        menus: [
          { id: 12, nombre: 'Proveedores', codigo: 'proveedores', activo: true, permisos_requeridos: ['compras.proveedores.read', 'compras.proveedores.write'] },
          { id: 13, nombre: 'Órdenes de Compra', codigo: 'ordenes', activo: true, permisos_requeridos: ['compras.ordenes.read', 'compras.ordenes.write'] }
        ]
      }
    ];
    
    console.log('✅ Sistemas de ejemplo cargados:', this.sistemas.length);
    this.filteredSistemas = [...this.sistemas];
    this.updatePagination();
    this.assignColors();
  }

  // Asignar colores a los sistemas
  assignColors(): void {
    const colors = ['primary', 'success', 'info', 'warning', 'danger', 'secondary'];
    this.sistemas.forEach((sistema, index) => {
      sistema.color = colors[index % colors.length];
    });
  }

  // Abrir modal de detalles del sistema
  viewSystemDetails(sistema: Sistema) {
    this.selectedSistema = sistema;
    this.filteredMenus = [...(sistema.menus || [])];
    this.menuSearchTerm = '';
    this.menuStatusFilter = '';
    this.showDetailsModal = true;
  }

  // Cerrar modal de detalles
  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedSistema = null;
  }

  // Abrir gestor de accesos
  openAccessManager(): void {
    this.router.navigate(['/accesos']);
  }

  // Exportar información del sistema
  exportSystemInfo(sistema: Sistema): void {
    const dataStr = JSON.stringify(sistema, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sistema_${sistema.codigo}_info.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Estadísticas
  getMenuStatistics(sistema: Sistema): { total: number; activos: number; conPermisos: number } {
    return {
      total: sistema.menus.length,
      activos: sistema.menus.filter(m => m.activo).length,
      conPermisos: sistema.menus.filter(m => m.permisos_requeridos.length > 0).length
    };
  }

  getTotalMenus(): number {
    return this.sistemas.reduce((total, sistema) => total + sistema.menus.length, 0);
  }

  getTotalActiveMenus(): number {
    return this.sistemas.reduce((total, sistema) => total + sistema.menus.filter(m => m.activo).length, 0);
  }

  getTotalMenusWithPermissions(): number {
    return this.sistemas.reduce((total, sistema) => total + sistema.menus.filter(m => m.permisos_requeridos.length > 0).length, 0);
  }

  // Obtener sistemas activos
  getActiveSistemas(): number {
    return this.sistemas.filter(s => s.activo).length;
  }

  // ===== MÉTODOS DE GESTIÓN DE SISTEMAS =====



  // Inicializar formulario
  initializeForm(): void {
    this.systemForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      codigo: ['', [Validators.required, Validators.minLength(2)]],
      url: [''],
      descripcion: [''],
      activo: [true],
      sso_habilitado: [false],
      sso_force: [false]
    });
  }

  // Abrir modal para agregar sistema
  openAddSystemModal(): void {
    this.isEditing = false;
    this.systemForm.reset({
      activo: true,
      sso_habilitado: false,
      sso_force: false
    });
    this.showSystemFormModal = true;
  }

  // Abrir modal para editar sistema
  editSystem(sistema: Sistema): void {
    this.isEditing = true;
    this.selectedSistema = sistema;
    this.systemForm.patchValue({
      nombre: sistema.nombre,
      codigo: sistema.codigo,
      url: sistema.url || '',
      descripcion: sistema.descripcion || '',
      activo: sistema.activo,
      sso_habilitado: sistema.sso_habilitado || false,
      sso_force: sistema.sso_force || false
    });
    this.showSystemFormModal = true;
  }

  // Cerrar modal de formulario
  closeSystemFormModal(): void {
    this.showSystemFormModal = false;
    this.selectedSistema = null;
    this.systemForm.reset();
  }

  // Guardar sistema
  saveSystem(): void {
    if (this.systemForm.invalid) {
      this.notificationService.error('Por favor, completa todos los campos requeridos');
      return;
    }

    this.saving = true;
    const systemData = this.systemForm.value;

    if (this.isEditing && this.selectedSistema) {
      // Actualizar sistema existente
      this.apiService.put(`sistemas-externos/${this.selectedSistema.id}`, systemData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.notificationService.success('Sistema actualizado correctamente');
            this.closeSystemFormModal();
            this.loadSistemas();
          },
          error: (error) => {
            console.error('Error al actualizar sistema:', error);
            this.notificationService.error('Error al actualizar el sistema');
          },
          complete: () => {
            this.saving = false;
          }
        });
    } else {
      // Crear nuevo sistema
      this.apiService.post('sistemas-externos', systemData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            this.notificationService.success('Sistema creado correctamente');
            this.closeSystemFormModal();
            this.loadSistemas();
          },
          error: (error) => {
            console.error('Error al crear sistema:', error);
            this.notificationService.error('Error al crear el sistema');
          },
          complete: () => {
            this.saving = false;
          }
        });
    }
  }

  // Confirmar eliminación de sistema
  confirmDeleteSystem(sistema: Sistema): void {
    this.sistemaToDelete = sistema;
    this.showDeleteModal = true;
  }

  // Cerrar modal de eliminación
  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.sistemaToDelete = null;
  }

  // Eliminar sistema
  deleteSystem(): void {
    if (!this.sistemaToDelete) return;

    this.deleting = true;
    this.apiService.delete(`sistemas-externos/${this.sistemaToDelete.id}`)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Sistema eliminado correctamente');
            this.closeDeleteModal();
            this.loadSistemas();
          } else {
            this.notificationService.error(response.message || 'Error al eliminar el sistema');
          }
        },
        error: (error) => {
          console.error('Error al eliminar sistema:', error);
          let errorMessage = 'Error al eliminar el sistema';
          
          if (error.error && error.error.message) {
            errorMessage = error.error.message;
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          this.notificationService.error(errorMessage);
        },
        complete: () => {
          this.deleting = false;
        }
      });
  }

  // ===== MÉTODOS PARA LA TABLA =====

  // Cambiar modo de vista
  toggleViewMode(): void {
    this.viewMode = this.viewMode === 'cards' ? 'table' : 'cards';
  }

  // Filtrar sistemas
   filterSistemas(): void {
     let filtered = [...this.sistemas];

     // Filtro por término de búsqueda
     if (this.searchTerm) {
       const term = this.searchTerm.toLowerCase();
       filtered = filtered.filter(sistema => 
         sistema.nombre.toLowerCase().includes(term) ||
         sistema.codigo.toLowerCase().includes(term) ||
         (sistema.descripcion && sistema.descripcion.toLowerCase().includes(term))
       );
     }

     // Filtro por estado
     if (this.statusFilter) {
       if (this.statusFilter === 'true') {
         filtered = filtered.filter(sistema => sistema.activo);
       } else if (this.statusFilter === 'false') {
         filtered = filtered.filter(sistema => !sistema.activo);
       }
     }

     this.filteredSistemas = filtered;
     this.sortSistemas();
     this.updatePagination();
   }

  // Ordenar sistemas
   sortSistemas(): void {
     if (!this.sortField) return;

     this.filteredSistemas.sort((a, b) => {
       let valueA: any = a[this.sortField as keyof Sistema];
       let valueB: any = b[this.sortField as keyof Sistema];

       // Manejar valores nulos o undefined
       if (valueA == null) valueA = '';
       if (valueB == null) valueB = '';

       // Convertir a string para comparación
       if (typeof valueA === 'string') {
         valueA = valueA.toLowerCase();
       }
       if (typeof valueB === 'string') {
         valueB = valueB.toLowerCase();
       }

       let comparison = 0;
       if (valueA > valueB) {
         comparison = 1;
       } else if (valueA < valueB) {
         comparison = -1;
       }

       return this.sortDirection === 'desc' ? comparison * -1 : comparison;
     });
     
     this.updatePagination();
   }

  // Cambiar ordenamiento
   changeSorting(field: string): void {
     if (this.sortField === field) {
       this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
     } else {
       this.sortField = field;
       this.sortDirection = 'asc';
     }
     this.sortSistemas();
   }

   // Método para ordenar desde el template
   sortBy(field: string): void {
     this.changeSorting(field);
   }

  // Limpiar filtros
   clearFilters(): void {
     this.searchTerm = '';
     this.statusFilter = '';
     this.sortField = '';
     this.sortDirection = 'asc';
     this.filteredSistemas = [...this.sistemas];
     this.updatePagination();
   }

  // Eventos de filtros
  onSearchChange(): void {
    this.filterSistemas();
  }

  onStatusFilterChange(): void {
    this.filterSistemas();
  }

  // ===== MÉTODOS PARA FILTRADO DE MENÚS =====

  // Filtrar menús
  filterMenus(): void {
    if (!this.selectedSistema?.menus) {
      this.filteredMenus = [];
      return;
    }

    let filtered = [...this.selectedSistema.menus];

    // Filtro por término de búsqueda
    if (this.menuSearchTerm) {
      const term = this.menuSearchTerm.toLowerCase();
      filtered = filtered.filter(menu => 
        menu.nombre.toLowerCase().includes(term) ||
        (menu.url && menu.url.toLowerCase().includes(term))
      );
    }

    // Filtro por estado
    if (this.menuStatusFilter) {
      if (this.menuStatusFilter === 'true') {
        filtered = filtered.filter(menu => menu.activo);
      } else if (this.menuStatusFilter === 'false') {
        filtered = filtered.filter(menu => !menu.activo);
      }
    }

    this.filteredMenus = filtered;
    this.sortMenus();
  }

  // Ordenar menús
  sortMenus(): void {
    if (!this.menuSortField) return;

    this.filteredMenus.sort((a, b) => {
      let valueA: any = a[this.menuSortField];
      let valueB: any = b[this.menuSortField];

      // Manejar valores nulos o undefined
      if (valueA == null) valueA = '';
      if (valueB == null) valueB = '';

      // Convertir a string para comparación
      if (typeof valueA === 'string') {
        valueA = valueA.toLowerCase();
      }
      if (typeof valueB === 'string') {
        valueB = valueB.toLowerCase();
      }

      let comparison = 0;
      if (valueA > valueB) {
        comparison = 1;
      } else if (valueA < valueB) {
        comparison = -1;
      }

      return this.menuSortDirection === 'desc' ? comparison * -1 : comparison;
    });
  }

  // Cambiar ordenamiento de menús
  sortMenusBy(field: string): void {
    if (this.menuSortField === field) {
      this.menuSortDirection = this.menuSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.menuSortField = field;
      this.menuSortDirection = 'asc';
    }
    this.sortMenus();
  }

  // Limpiar filtros de menús
  clearMenuFilters(): void {
    this.menuSearchTerm = '';
    this.menuStatusFilter = '';
    this.menuSortField = '';
    this.menuSortDirection = 'asc';
    if (this.selectedSistema?.menus) {
       this.filteredMenus = [...this.selectedSistema.menus];
     }
   }

   // ===== MÉTODOS PARA PAGINACIÓN =====

   // Actualizar paginación
   updatePagination(): void {
     this.totalPages = Math.ceil(this.filteredSistemas.length / this.itemsPerPage);
     
     // Ajustar página actual si es necesario
     if (this.currentPage > this.totalPages && this.totalPages > 0) {
       this.currentPage = this.totalPages;
     }
     if (this.currentPage < 1) {
       this.currentPage = 1;
     }
     
     this.updatePaginatedData();
   }

   // Actualizar datos paginados
   updatePaginatedData(): void {
     const startIndex = (this.currentPage - 1) * this.itemsPerPage;
     const endIndex = startIndex + this.itemsPerPage;
     this.paginatedSistemas = this.filteredSistemas.slice(startIndex, endIndex);
   }

   // Ir a página específica
   goToPage(page: number): void {
     if (page >= 1 && page <= this.totalPages) {
       this.currentPage = page;
       this.updatePaginatedData();
     }
   }

   // Obtener páginas visibles
   getVisiblePages(): number[] {
     const pages: number[] = [];
     const maxVisiblePages = 5;
     
     let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
     let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);
     
     // Ajustar si no hay suficientes páginas al final
     if (endPage - startPage + 1 < maxVisiblePages) {
       startPage = Math.max(1, endPage - maxVisiblePages + 1);
     }
     
     for (let i = startPage; i <= endPage; i++) {
       pages.push(i);
     }
     
     return pages;
   }

   // Obtener índice de inicio
   getStartIndex(): number {
     return (this.currentPage - 1) * this.itemsPerPage + 1;
   }

   // Obtener índice de fin
   getEndIndex(): number {
     return Math.min(this.currentPage * this.itemsPerPage, this.filteredSistemas.length);
   }

   // Cambiar elementos por página
   onItemsPerPageChange(): void {
     this.currentPage = 1;
     this.updatePagination();
   }
 }
