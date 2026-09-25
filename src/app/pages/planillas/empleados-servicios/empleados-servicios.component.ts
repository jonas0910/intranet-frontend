import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { debounceTime, distinctUntilChanged, Subject, takeUntil, forkJoin } from 'rxjs';
import { EmployeeService, Employee, EmployeeFilters, Department, Position, CostCenter } from '../../../services/employee.service';
import { ServiciosModalComponent } from './servicios-modal/servicios-modal.component';
import { ServiciosDetailModalComponent } from './servicios-detail-modal/servicios-detail-modal.component';
import { AuthService } from '../../../services/auth.service';
import { MenuPermissionsService } from '../../../services/menu-permissions.service';
import { StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterModule,
    ServiciosModalComponent, ServiciosDetailModalComponent,
    SystemLayoutComponent
  ],
  templateUrl: './empleados-servicios.component.html',
  styleUrls: ['./empleados-servicios.component.scss']
})
export class EmpleadosServiciosComponent implements OnInit {
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
    labor_regime: undefined,
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
  isFiltersCollapsed = false;
  
  Math = Math;
  employeeToDelete: Employee | null = null;
  userDepartmentId: number | null = null;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Empleados Servicios' }
  ];

  cv!: CrudViewConfig;
  
  // Status options
  statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' }
  ];
  
  laborRegimeOptions = [
    { value: '', label: 'Todos los regímenes' },
    { value: '728', label: 'Régimen 728' },
    { value: '276', label: 'Régimen 276' },
    { value: '1057', label: 'CAS' },
    { value: 'servicio', label: 'Servicio' }
  ];
  
  // Pension system options
  pensionSystemOptions = [
    { value: '', label: 'Todos los sistemas' },
    { value: 'afp', label: 'AFP' },
    { value: 'onp', label: 'ONP' }
  ];

  // Modal properties
  showEmployeeModal: boolean = false;
  employeeModalData: any = { mode: 'create' };

  // Permissions
  canCreateEmployee = true;
  canEditEmployee = true; 
  canDeleteEmployee = false; // Por seguridad, deshabilitar borrado directo en este módulo
  canExportEmployees = true;

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
    
    // Obtener departamento del usuario logueado
    const user = this.authService.getCurrentUser();
    if (user && user.empleado && user.empleado.departamento) {
      this.userDepartmentId = user.empleado.departamento.id;
      this.filters.department_id = this.userDepartmentId;
    }

    this.setupSearchDebounce();
    this.loadDropdownData();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
      page: this.currentPage,
      assigned_to_me: true
    };

    this.employeeService.getEmployees(searchFilters).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.employees = response.data.employees;
          this.currentPage = response.data.pagination.current_page;
          this.totalPages = response.data.pagination.last_page;
          this.totalItems = response.data.pagination.total;
          this.itemsPerPage = response.data.pagination.per_page;
        }
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading employees:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Load dropdown data in parallel
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
   * Handle "registros por página" change
   */
  onPageSizeChange(size: number): void {
    this.itemsPerPage = size;
    this.filters.per_page = size;
    this.currentPage = 1;
    this.loadEmployees();
  }

  /** Opciones del selector "Mostrar X registros" */
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
      department_id: this.userDepartmentId || undefined,
      position_id: undefined,
      cost_center_id: undefined,
      labor_regime: undefined,
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
    this.employeeModalData = { 
        mode: 'create',
        employee: {
            department_id: this.userDepartmentId,
            labor_regime: 'servicio',
            status: 'active'
        }
    };
    this.showEmployeeModal = true;
  }

  /**
   * Check if employee can be edited
   */
  canEdit(employee: Employee): boolean {
    return employee.labor_regime === 'servicio';
  }

  /**
   * Open modal to edit employee
   */
  editEmployee(employee: Employee): void {
    if (!this.canEdit(employee)) {
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

  /**
   * Export employees
   */
  exportEmployees(): void {
    const exportFilters = { ...this.filters };
    this.employeeService.exportEmployees(exportFilters).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `servicios_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: any) => {
        console.error('Error exporting employees:', error);
      }
    });
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
