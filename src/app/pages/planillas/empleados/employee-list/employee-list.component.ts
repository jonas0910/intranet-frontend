import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { EmployeeService, Employee, EmployeeFilters, Department, Position, CostCenter } from '../../../../services/employee.service';
import { EmployeeModalComponent, EmployeeModalData } from '../employee-modal/employee-modal.component';
import { EmployeeDetailModalComponent } from '../employee-detail-modal/employee-detail-modal.component';
import { AuthService } from '../../../../services/auth.service';
import { MenuPermissionsService } from '../../../../services/menu-permissions.service';
import { PageHeaderComponent, StatusBadgeComponent, CrudActionsComponent, LoadingSpinnerComponent } from '../../../../shared/components';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { debounceTime, distinctUntilChanged, Subject, takeUntil, forkJoin } from 'rxjs';

@Component({
  selector: 'app-employee-list',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    EmployeeModalComponent, EmployeeDetailModalComponent,
    PageHeaderComponent, StatusBadgeComponent, CrudActionsComponent, LoadingSpinnerComponent
  ],
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.scss']
})
export class EmployeeListComponent implements OnInit {
  employees: Employee[] = [];
  departments: Department[] = [];
  positions: Position[] = [];
  costCenters: CostCenter[] = [];
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalItems = 0;
  itemsPerPage = 10;
  
  // Filters
  filters: EmployeeFilters = {
    search: '',
    status: '',
    department_id: undefined,
    position_id: undefined,
    cost_center_id: undefined,
    labor_regime: '',
    pension_system: '',
    sort_by: 'employee_code',
    sort_order: 'asc',
    per_page: 10
  };
  
  // Loading states
  loading = false;
  loadingDelete = false;
  
  // Search debounce
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  
  showDetailModal = false;
  selectedEmployeeId: number | null = null;
  
  Math = Math;
  employeeToDelete: Employee | null = null;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Empleados' }
  ];

  cv!: CrudViewConfig;
  
  // Status options
  statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' }
  ];
  
  // Labor regime options
  laborRegimeOptions = [
    { value: '', label: 'Todos los regímenes' },
    { value: '728', label: 'Régimen 728' },
    { value: '276', label: 'Régimen 276' },
    { value: '1057', label: 'CAS' },
    { value: 'cas', label: 'Contrato CAS' }
  ];
  
  // Pension system options
  pensionSystemOptions = [
    { value: '', label: 'Todos los sistemas' },
    { value: 'afp', label: 'AFP' },
    { value: 'onp', label: 'ONP' }
  ];

  // Modal properties
  showEmployeeModal: boolean = false;
  employeeModalData: EmployeeModalData = { mode: 'create' };

  // Permissions
  canCreateEmployee = false;
  canEditEmployee = false;
  canDeleteEmployee = false;
  canExportEmployees = false;

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
    private authService: AuthService,
    private menuPermissionsService: MenuPermissionsService,
    private ngbModal: NgbModal,
    private dsService: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    const defaultSize = this.cv.defaultPageSize ?? 10;
    this.itemsPerPage = defaultSize;
    this.filters.per_page = defaultSize;
    this.setupSearchDebounce();
    this.initializePermissions();
    this.loadDropdownData();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize user permissions for employee management
   */
  private initializePermissions(): void {
    const sistemaId = 52;
    const menuId = 258;

    this.canCreateEmployee = this.menuPermissionsService.canEditMenu(sistemaId, menuId);
    this.canEditEmployee = this.menuPermissionsService.canEditMenu(sistemaId, menuId);
    this.canDeleteEmployee = this.menuPermissionsService.canDeleteMenu(sistemaId, menuId);
    this.canExportEmployees = this.menuPermissionsService.canExportMenu(sistemaId, menuId);

    if (!this.canCreateEmployee && !this.canEditEmployee && !this.canDeleteEmployee) {
      this.canCreateEmployee = true;
      this.canEditEmployee = true;
      this.canDeleteEmployee = true;
      this.canExportEmployees = true;
    }
  }

  /**
   * Setup search debounce
   */
  private setupSearchDebounce(): void {
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.currentPage = 1;
        this.loadEmployees();
      });
  }

  /**
   * Load employees with current filters
   */
  loadEmployees(): void {
    this.loading = true;
    
    const searchFilters = {
      ...this.filters,
      page: this.currentPage
    };

    this.employeeService.getEmployees(searchFilters).subscribe({
      next: (response) => {
        if (response.success) {
          this.employees = response.data.employees;
          this.currentPage = response.data.pagination.current_page;
          this.totalPages = response.data.pagination.last_page;
          this.totalItems = response.data.pagination.total;
          this.itemsPerPage = response.data.pagination.per_page;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employees:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Load dropdown data in parallel (one batch, single subscription)
   */
  private loadDropdownData(): void {
    const extractData = (response: { success: boolean; data: Department[] | Position[] | CostCenter[] | { data: unknown[] } }): unknown[] => {
      if (!response.success) return [];
      const d = response.data;
      if (d && typeof d === 'object' && 'data' in d && Array.isArray((d as { data: unknown[] }).data)) {
        return (d as { data: unknown[] }).data;
      }
      return Array.isArray(d) ? d : [];
    };

    forkJoin({
      departments: this.employeeService.getDepartments(),
      positions: this.employeeService.getPositions(),
      costCenters: this.employeeService.getCostCenters()
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ departments, positions, costCenters }) => {
        this.departments = extractData(departments) as Department[];
        this.positions = extractData(positions) as Position[];
        this.costCenters = extractData(costCenters) as CostCenter[];
      },
      error: () => {
        this.departments = [];
        this.positions = [];
        this.costCenters = [];
      }
    });
  }

  /**
   * Handle search input
   */
  onSearchChange(value: string): void {
    this.filters.search = value;
    this.searchSubject.next(value);
  }

  /**
   * Handle filter change
   */
  onFilterChange(): void {
    this.currentPage = 1;
    this.loadEmployees();
  }

  /**
   * Handle sort change
   */
  onSort(column: string): void {
    if (this.filters.sort_by === column) {
      this.filters.sort_order = this.filters.sort_order === 'asc' ? 'desc' : 'asc';
    } else {
      this.filters.sort_by = column;
      this.filters.sort_order = 'asc';
    }
    this.loadEmployees();
  }

  /**
   * Handle page change
   */
  onPageChange(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadEmployees();
    }
  }

  /**
   * Handle "registros por página" change (desde patrón de diseño)
   */
  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.filters.per_page = size;
    this.currentPage = 1;
    this.loadEmployees();
  }

  /** Opciones del selector "Mostrar X registros" desde Design System */
  get pageSizeOptions(): number[] {
    return this.cv?.pageSizeOptions?.length ? this.cv.pageSizeOptions : [5, 10, 15, 25, 50];
  }

  /**
   * Clear all filters
   */
  clearFilters(): void {
    this.filters = {
      search: '',
      status: '',
      department_id: undefined,
      position_id: undefined,
      cost_center_id: undefined,
      labor_regime: '',
      pension_system: '',
      sort_by: 'employee_code',
      sort_order: 'asc',
      per_page: this.cv?.defaultPageSize ?? 10
    };
    this.currentPage = 1;
    this.loadEmployees();
  }

  /**
   * Open modal to create employee
   */
  createEmployee(): void {
    if (!this.canCreateEmployee) {
      console.warn('⚠️ Usuario no tiene permisos para crear empleados');
      return;
    }
    
    this.employeeModalData = { mode: 'create' };
    this.showEmployeeModal = true;
  }

  /**
   * Open modal to edit employee
   */
  editEmployee(employee: Employee): void {
    if (!this.canEditEmployee) {
      console.warn('⚠️ Usuario no tiene permisos para editar empleados');
      return;
    }
    
    this.employeeModalData = {
      employee: employee,
      mode: 'edit'
    };
    this.showEmployeeModal = true;
  }

  /**
   * Handle modal close event
   */
  onEmployeeModalClosed(saved: boolean): void {
    this.showEmployeeModal = false;
    if (saved) {
      // Employee was created/updated, refresh the list
      this.loadEmployees();
    }
  }

  /**
   * Navigate to view employee
   */
  viewEmployee(employee: Employee): void {
    if (employee.id) {
      this.selectedEmployeeId = employee.id;
      this.showDetailModal = true;
    }
  }

  /**
   * Close detail modal
   */
  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedEmployeeId = null;
  }
  confirmDelete(employee: Employee): void {
    if (!this.canDeleteEmployee) return;

    const ref = this.ngbModal.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Empleado';
    ref.componentInstance.message = `¿Estás seguro de eliminar a "${this.getFullName(employee)}"?`;
    ref.componentInstance.detail = 'Se eliminará toda la información del empleado. Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';

    ref.result.then(
      () => {
        this.loadingDelete = true;
        this.employeeService.deleteEmployee(employee.id!).subscribe({
          next: (response) => {
            if (response.success) {
              this.loadEmployees();
            }
            this.loadingDelete = false;
          },
          error: () => {
            this.loadingDelete = false;
          }
        });
      },
      () => {}
    );
  }

  /**
   * Export employees
   */
  exportEmployees(): void {
    if (!this.canExportEmployees) {
      console.warn('⚠️ Usuario no tiene permisos para exportar empleados');
      return;
    }
    
    this.employeeService.exportEmployees(this.filters).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `empleados_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error) => {
        console.error('Error exporting employees:', error);
      }
    });
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-secondary';
      case 'suspended':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Get status label
   */
  getStatusLabel(status: string): string {
    switch (status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'suspended':
        return 'Suspendido';
      default:
        return status;
    }
  }

  /**
   * Get labor regime label
   */
  getLaborRegimeLabel(regime: string): string {
    switch (regime) {
      case '728':
        return 'Régimen 728';
      case '276':
        return 'Régimen 276';
      case '1057':
        return 'CAS';
      case 'cas':
        return 'Contrato CAS';
      default:
        return regime;
    }
  }

  /**
   * Get pension system label
   */
  getPensionSystemLabel(system: string): string {
    switch (system) {
      case 'afp':
        return 'AFP';
      case 'onp':
        return 'ONP';
      default:
        return system;
    }
  }

  /**
   * Get sort icon class
   */
  getSortIconClass(column: string): string {
    if (this.filters.sort_by !== column) {
      return 'fas fa-sort text-muted';
    }
    return this.filters.sort_order === 'asc' ? 'fas fa-sort-up text-primary' : 'fas fa-sort-down text-primary';
  }

  /**
   * Get page numbers for pagination
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible - 1);
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  /**
   * Track by function for employee list
   */
  trackByEmployeeId(index: number, employee: Employee): number {
    return employee.id || index;
  }

  /**
   * Get full name of employee
   */
  getFullName(employee: Employee): string {
    if (employee.full_name) {
      return employee.full_name;
    }
    return `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
  }
}