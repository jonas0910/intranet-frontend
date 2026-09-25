import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EmployeeService, Employee } from '../../../../services/employee.service';
import { MenuPermissionsService } from '../../../../services/menu-permissions.service';
import { DesignSystemService, ModalCrudConfig } from '../../../../services/design-system.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-employee-detail-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './employee-detail-modal.component.html',
  styleUrls: ['./employee-detail-modal.component.scss']
})
export class EmployeeDetailModalComponent implements OnInit, OnDestroy, OnChanges {
  @Input() employeeId: number | null = null;
  @Input() isVisible: boolean = false;
  @Output() modalClosed = new EventEmitter<void>();
  
  employee: Employee | null = null;
  loading = false;
  error: string | null = null;
  
  // Tabs
  activeTab: 'personal' | 'work' | 'contact' | 'payroll' | 'contracts' = 'personal';
  
  // Contracts
  contracts: any[] = [];
  loadingContracts = false;
  
  // Permissions
  canEditEmployee = false;
  canDeleteEmployee = false;
  canExportEmployee = false;
  
  mc!: ModalCrudConfig;
  private destroy$ = new Subject<void>();

  constructor(
    private employeeService: EmployeeService,
    private menuPermissionsService: MenuPermissionsService,
    private dsService: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initializePermissions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🔄 EmployeeDetailModal ngOnChanges:', {
      isVisible: this.isVisible,
      employeeId: this.employeeId,
      changes: changes
    });

    // Cargar empleado cuando el modal se hace visible y hay un employeeId
    if (changes['isVisible'] && changes['isVisible'].currentValue && this.employeeId) {
      console.log('📋 Modal se hizo visible, cargando empleado...');
      this.loadEmployee();
    }
    
    // También cargar cuando cambia el employeeId y el modal está visible
    if (changes['employeeId'] && this.isVisible && this.employeeId) {
      console.log('📋 EmployeeId cambió, cargando empleado...');
      this.loadEmployee();
    }
  }

  /**
   * Initialize user permissions for employee management
   */
  private initializePermissions(): void {
    console.log('🔐 Inicializando permisos para detalles de empleado...');
    const sistemaId = 52;
    const menuId = 258; // ID del menú de empleados
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
   * Load employee details
   */
  private loadEmployee(): void {
    if (!this.employeeId) {
      console.warn('⚠️ No hay employeeId para cargar');
      return;
    }

    console.log('🔄 Cargando empleado con ID:', this.employeeId);
    this.loading = true;
    this.error = null;
    this.employee = null; // Limpiar datos anteriores

    this.employeeService.getEmployee(this.employeeId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta del servicio:', response);
          if (response.success && response.data) {
            this.employee = response.data;
            console.log('✅ Empleado cargado exitosamente:', this.employee);
          } else {
            console.warn('⚠️ Respuesta sin datos válidos:', response);
            this.error = 'No se pudieron cargar los datos del empleado';
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error al cargar empleado:', error);
          this.error = `Error al cargar los datos del empleado: ${error.message || 'Error desconocido'}`;
          this.loading = false;
        }
      });
  }

  /**
   * Edit employee
   */
  editEmployee(): void {
    if (!this.canEditEmployee) {
      console.warn('⚠️ Usuario sin permisos para editar empleados');
      return;
    }
    
    if (!this.employee) return;
    
    console.log('✏️ Editando empleado:', this.employee);
    // TODO: Implementar edición en modal o navegación
    this.closeModal();
  }

  /**
   * Delete employee
   */
  deleteEmployee(): void {
    if (!this.canDeleteEmployee) {
      console.warn('⚠️ Usuario sin permisos para eliminar empleados');
      return;
    }
    
    if (!this.employee || !this.employee.id) {
      console.error('❌ Empleado sin ID válido');
      return;
    }
    
    if (this.employee.status === 'active') {
      console.warn('⚠️ No se puede eliminar un empleado activo');
      return;
    }
    
    if (confirm(`¿Está seguro de que desea eliminar al empleado ${this.employee.full_name || (this.employee.first_name + ' ' + this.employee.last_name)}?`)) {
      this.loading = true;
      
      this.employeeService.deleteEmployee(this.employee.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Empleado eliminado correctamente');
            this.closeModal();
          },
          error: (error) => {
            console.error('❌ Error al eliminar empleado:', error);
            this.error = 'Error al eliminar el empleado';
            this.loading = false;
          }
        });
    }
  }

  /**
   * Export employee data
   */
  exportEmployee(): void {
    if (!this.canExportEmployee) {
      console.warn('⚠️ Usuario sin permisos para exportar datos de empleados');
      return;
    }
    
    if (!this.employee) return;
    
    console.log('📤 Exportando datos del empleado:', this.employee);
    // TODO: Implementar exportación
  }

  /**
   * Print employee details
   */
  printEmployee(): void {
    if (!this.employee) return;
    
    console.log('🖨️ Imprimiendo detalles del empleado:', this.employee);
    window.print();
  }

  /**
   * Check if employee can be deleted by status
   */
  canDeleteEmployeeByStatus(): boolean {
    return this.employee?.status !== 'active';
  }

  /**
   * Close modal
   */
  closeModal(): void {
    console.log('🚪 Cerrando modal de empleado');
    this.modalClosed.emit();
  }

  /**
   * Handle backdrop click
   */
  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Debug method to check modal state
   */
  debugModalState(): void {
    console.log('🔍 Estado del modal:', {
      isVisible: this.isVisible,
      employeeId: this.employeeId,
      employee: this.employee,
      loading: this.loading,
      error: this.error,
      activeTab: this.activeTab,
      contracts: this.contracts
    });
  }

  /**
   * Switch between tabs
   */
  switchTab(tab: 'personal' | 'work' | 'contact' | 'payroll' | 'contracts'): void {
    console.log('🔄 Cambiando a tab:', tab);
    this.activeTab = tab;
    
    // Load contracts when switching to contracts tab
    if (tab === 'contracts' && this.contracts.length === 0 && this.employeeId) {
      this.loadContracts();
    }
  }

  /**
   * Load employee contracts
   */
  loadContracts(): void {
    if (!this.employeeId) {
      return;
    }

    console.log('📄 Cargando contratos del empleado:', this.employeeId);
    this.loadingContracts = true;

    // TODO: Crear servicio de contratos
    // Por ahora, simular datos
    setTimeout(() => {
      this.contracts = [
        {
          id: 1,
          contract_number: 'CONT-' + String(this.employeeId).padStart(4, '0') + '-1',
          contract_type: 'plazo_fijo',
          start_date: '2023-01-15',
          end_date: '2024-01-14',
          position: 'Analista',
          salary: 3500,
          weekly_hours: 48,
          work_schedule: 'diurno',
          has_benefits: true,
          has_bonus: false,
          status: 'vencido',
          signed_date: '2023-01-10',
          notes: 'Contrato inicial',
          days_until_expiration: 0
        },
        {
          id: 2,
          contract_number: 'CONT-' + String(this.employeeId).padStart(4, '0') + '-2',
          contract_type: 'indefinido',
          start_date: '2024-01-15',
          end_date: null,
          position: 'Analista Senior',
          salary: 4200,
          weekly_hours: 48,
          work_schedule: 'diurno',
          has_benefits: true,
          has_bonus: true,
          status: 'vigente',
          signed_date: '2024-01-10',
          notes: 'Renovación con incremento salarial',
          days_until_expiration: null
        }
      ];
      this.loadingContracts = false;
      console.log('✅ Contratos cargados:', this.contracts.length);
    }, 500);
  }

  /**
   * Get contract status label
   */
  getContractStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'vigente': 'Vigente',
      'vencido': 'Vencido',
      'renovado': 'Renovado',
      'rescindido': 'Rescindido',
      'suspendido': 'Suspendido'
    };
    return labels[status] || status;
  }

  /**
   * Get contract type label
   */
  getContractTypeLabel(type: string): string {
    const labels: { [key: string]: string } = {
      'indefinido': 'Contrato Indefinido',
      'plazo_fijo': 'Plazo Fijo',
      'temporal': 'Temporal',
      'locacion': 'Locación de Servicios',
      'cas': 'CAS',
      'practicas': 'Prácticas'
    };
    return labels[type] || type;
  }

  /**
   * Get work schedule label
   */
  getWorkScheduleLabel(schedule: string): string {
    const labels: { [key: string]: string } = {
      'diurno': 'Diurno',
      'nocturno': 'Nocturno',
      'mixto': 'Mixto',
      'rotativo': 'Rotativo'
    };
    return labels[schedule] || schedule;
  }

  /**
   * Add new contract
   */
  addContract(): void {
    console.log('➕ Agregar nuevo contrato');
    // TODO: Abrir modal de contrato
    alert('Funcionalidad de agregar contrato en desarrollo');
  }

  /**
   * Edit contract
   */
  editContract(contract: any): void {
    console.log('✏️ Editar contrato:', contract);
    // TODO: Abrir modal de edición de contrato
    alert('Funcionalidad de editar contrato en desarrollo');
  }

  /**
   * Delete contract
   */
  deleteContract(contract: any): void {
    if (confirm(`¿Está seguro de eliminar el contrato ${contract.contract_number}?`)) {
      console.log('🗑️ Eliminar contrato:', contract);
      // TODO: Implementar eliminación
      this.contracts = this.contracts.filter(c => c.id !== contract.id);
    }
  }

  /**
   * View contract document
   */
  viewContractDocument(contract: any): void {
    console.log('📄 Ver documento del contrato:', contract);
    // TODO: Abrir documento PDF
    alert('Documento del contrato no disponible');
  }
}
