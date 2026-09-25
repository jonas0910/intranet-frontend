import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { EmployeeService, Employee } from '../../../../services/employee.service';
import { MenuPermissionsService } from '../../../../services/menu-permissions.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-employee-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-detail.component.html',
  styleUrls: ['./employee-detail.component.scss']
})
export class EmployeeDetailComponent implements OnInit, OnDestroy {
  employee: Employee | null = null;
  employeeId: number | null = null;
  loading = false;
  error: string | null = null;
  
  // Permissions
  canEditEmployee = false;
  canDeleteEmployee = false;
  canExportEmployee = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private router: Router,
    private route: ActivatedRoute,
    private menuPermissionsService: MenuPermissionsService
  ) {}

  ngOnInit(): void {
    this.getEmployeeId();
    this.initializePermissions();
    if (this.employeeId) {
      this.loadEmployee();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize user permissions for employee management
   */
  private initializePermissions(): void {
    console.log('🔐 Inicializando permisos para detalles de empleado...');
    
    // Sistema de planillas ID: 52, Menú de empleados ID: 258
    const sistemaId = 52;
    const menuId = 258;
    
    // Verificar permisos específicos
    this.canEditEmployee = this.menuPermissionsService.canEditMenu(sistemaId, menuId);
    this.canDeleteEmployee = this.menuPermissionsService.canDeleteMenu(sistemaId, menuId);
    this.canExportEmployee = this.menuPermissionsService.canExportMenu(sistemaId, menuId);
    
    console.log('🔐 Permisos inicializados:', {
      canEdit: this.canEditEmployee,
      canDelete: this.canDeleteEmployee,
      canExport: this.canExportEmployee
    });
  }

  /**
   * Get employee ID from route parameters
   */
  private getEmployeeId(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.employeeId = parseInt(id, 10);
    } else {
      this.router.navigate(['/planillas/empleados']);
    }
  }

  /**
   * Load employee data
   */
  private loadEmployee(): void {
    if (!this.employeeId) return;
    
    this.loading = true;
    this.error = null;
    
    this.employeeService.getEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.employee = response.data;
          } else {
            this.error = 'No se pudo cargar la información del empleado';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading employee:', error);
          this.error = 'Error al cargar la información del empleado';
          this.loading = false;
        }
      });
  }

  /**
   * Navigate back to employee list
   */
  goBack(): void {
    this.router.navigate(['/planillas/empleados']);
  }

  /**
   * Navigate to edit employee
   */
  editEmployee(): void {
    if (!this.canEditEmployee) {
      console.warn('⚠️ Usuario no tiene permisos para editar empleados');
      return;
    }
    
    if (this.employeeId) {
      this.router.navigate(['/planillas/empleados/editar', this.employeeId]);
    }
  }

  /**
   * Delete employee with confirmation
   */
  deleteEmployee(): void {
    if (!this.canDeleteEmployee) {
      console.warn('⚠️ Usuario no tiene permisos para eliminar empleados');
      return;
    }
    
    if (!this.employee || !this.employeeId) return;

    const confirmMessage = `¿Está seguro de que desea eliminar al empleado ${this.employee.first_name} ${this.employee.last_name}?`;
    
    if (confirm(confirmMessage)) {
      this.employeeService.deleteEmployee(this.employeeId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.router.navigate(['/planillas/empleados']);
            } else {
              alert('No se pudo eliminar el empleado');
            }
          },
          error: (error) => {
            console.error('Error deleting employee:', error);
            alert('Error al eliminar el empleado');
          }
        });
    }
  }

  /**
   * Reload employee data
   */
  reloadEmployee(): void {
    this.loadEmployee();
  }

  /**
   * Get employee full name
   */
  getEmployeeFullName(): string {
    if (!this.employee) return '';
    return `${this.employee.first_name} ${this.employee.last_name}`;
  }

  /**
   * Get employee age from birth date
   */
  getEmployeeAge(): number | null {
    if (!this.employee?.birth_date) return null;
    
    const birthDate = new Date(this.employee.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  /**
   * Get years of service
   */
  getYearsOfService(): number | null {
    if (!this.employee?.hire_date) return null;
    
    const hireDate = new Date(this.employee.hire_date);
    const today = new Date();
    let years = today.getFullYear() - hireDate.getFullYear();
    const monthDiff = today.getMonth() - hireDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < hireDate.getDate())) {
      years--;
    }
    
    return years;
  }

  /**
   * Format currency
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(amount);
  }

  /**
   * Format date
   */
  formatDate(date: string | null): string {
    if (!date) return 'No especificado';
    
    return new Intl.DateTimeFormat('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(date));
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(): string {
    if (!this.employee) return 'badge-secondary';
    
    switch (this.employee.status) {
      case 'active':
        return 'badge-success';
      case 'inactive':
        return 'badge-danger';
      case 'suspended':
        return 'badge-warning';
      default:
        return 'badge-secondary';
    }
  }

  /**
   * Get status text
   */
  getStatusText(): string {
    if (!this.employee) return 'Desconocido';
    
    switch (this.employee.status) {
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
      case 'suspended':
        return 'Suspendido';
      default:
        return 'Desconocido';
    }
  }

  /**
   * Get gender text
   */
  getGenderText(): string {
    if (!this.employee?.gender) return 'No especificado';
    
    switch (this.employee.gender) {
      case 'M':
        return 'Masculino';
      case 'F':
        return 'Femenino';
      default:
        return 'No especificado';
    }
  }

  /**
   * Get marital status text
   */
  getMaritalStatusText(): string {
    if (!this.employee?.marital_status) return 'No especificado';
    
    switch (this.employee.marital_status) {
      case 'soltero':
        return 'Soltero(a)';
      case 'casado':
        return 'Casado(a)';
      case 'divorciado':
        return 'Divorciado(a)';
      case 'viudo':
        return 'Viudo(a)';
      default:
        return this.employee.marital_status;
    }
  }

  /**
   * Get labor regime text
   */
  getLaborRegimeText(): string {
    if (!this.employee?.labor_regime) return 'No especificado';
    
    switch (this.employee.labor_regime) {
      case '728':
        return 'Régimen Laboral 728';
      case '276':
        return 'Régimen Laboral 276';
      case '1057':
        return 'CAS';
      case 'cas':
        return 'Contrato CAS';
      default:
        return this.employee.labor_regime;
    }
  }

  /**
   * Get pension system text
   */
  getPensionSystemText(): string {
    if (!this.employee?.pension_system) return 'No especificado';
    
    switch (this.employee.pension_system) {
      case 'afp':
        return 'AFP';
      case 'onp':
        return 'ONP';
      default:
        return this.employee.pension_system;
    }
  }

  /**
   * Get account type text
   */
  getAccountTypeText(): string {
    if (!this.employee?.account_type) return 'No especificado';
    
    switch (this.employee.account_type) {
      case 'ahorros':
        return 'Cuenta de Ahorros';
      case 'corriente':
        return 'Cuenta Corriente';
      default:
        return this.employee.account_type;
    }
  }

  /**
   * Check if employee can be deleted based on status
   */
  canDeleteEmployeeByStatus(): boolean {
    return this.employee?.status !== 'active';
  }

  /**
   * Get employee initials for avatar
   */
  getEmployeeInitials(): string {
    if (!this.employee) return 'NN';
    
    const firstInitial = this.employee.first_name.charAt(0).toUpperCase();
    const lastInitial = this.employee.last_name.charAt(0).toUpperCase();
    
    return `${firstInitial}${lastInitial}`;
  }

  /**
   * Print employee details
   */
  printEmployee(): void {
    window.print();
  }

  /**
   * Export employee data
   */
  exportEmployee(): void {
    if (!this.canExportEmployee) {
      console.warn('⚠️ Usuario no tiene permisos para exportar empleados');
      return;
    }
    
    if (!this.employee) return;
    
    const data = {
      employee: this.employee,
      exported_at: new Date().toISOString(),
      exported_by: 'Sistema de Planillas'
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `empleado_${this.employee.employee_code}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    window.URL.revokeObjectURL(url);
  }
}