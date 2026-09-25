import { Component, OnInit, OnDestroy, ViewChildren, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { PayrollPeriodService, PayrollPeriod } from '../../../services/payroll-period.service';
import { PayrollTemplateService, PayrollTemplate } from '../../../services/payroll-template.service';

/** Stub mínimo para vista previa cuando la plantilla no viene en la lista filtrada (p. ej. only_with_employees). */
function stubTemplateForPreview(id: number): PayrollTemplate {
  return {
    id,
    name: 'Plantilla',
    type: 'monthly',
    category: 'monthly',
    is_default: false,
    is_active: true
  };
}
import { EmployeeContractService } from '../../../services/employee-contract.service';
import { EmployeeService, Employee } from '../../../services/employee.service';
import { AuthService } from '../../../services/auth.service';
import { MenuPermissionsService } from '../../../services/menu-permissions.service';
import { NotificationService } from '../../../services/notification.service';
import { FundingSourceService, FundingSource } from '../../../services/funding-source.service';

@Component({
  selector: 'app-procesar-planillas',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DataTablesModule],
  templateUrl: './procesar-planillas.component.html',
  styleUrls: ['./procesar-planillas.component.scss']
})
export class ProcesarPlanillasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  periods: PayrollPeriod[] = [];
  templates: PayrollTemplate[] = []; // ✅ Plantillas disponibles
  templateProcesses: any[] = []; // ✅ Procesos de plantilla (período + plantilla + estado)
  employees: Employee[] = [];
  selectedPeriod: PayrollPeriod | null = null;
  selectedTemplate: PayrollTemplate | null = null; // ✅ Plantilla seleccionada
  selectedEmployees: number[] = [];
  
  // Loading states
  loading = false;
  loadingPeriods = false;
  loadingTemplates = false; // ✅ Estado de carga de plantillas
  loadingEmployees = false;
  processing = false;
  
  // Filters
  yearFilter = new Date().getFullYear();
  monthFilter = '';
  statusFilter = '';
  searchFilter = '';
  
  // Processing options
  autoApprove = false;
  autoClose = false;
  notifyEmployees = true;
  
  // Results
  processingResults: any = null;
  showResults = false;
  
  // View processed payroll
  showProcessedModal = false;
  processedPayrollData: any = null;
  loadingProcessedData = false;
  fundingSources: FundingSource[] = [];
  /** Al abrir desde reporte con queryParams period_id y template_id */
  private openViewTemplateId: number | null = null;
  /** Modo solo previsualización: llegada desde reporte-planillas (ojito), sin mostrar wizard */
  soloPreviewMode = false;

  /** Evita que un clic “fantasma” tras la navegación cierre el modal al instante (sensación de bucle / parpadeo). */
  private modalBackdropIgnoreUntil = 0;

  /**
   * Cachés para el modal de planilla procesada: los métodos getUnique* devuelven un array nuevo en cada llamada;
   * usarlos en *ngFor provoca referencias distintas en cada ciclo de detección de cambios y puede colgar el navegador.
   */
  uniqueIncomeConceptsForView: any[] = [];
  uniqueDeductionConceptsForView: any[] = [];
  uniqueContributionConceptsForView: any[] = [];
  afpSummaryDeductionColumnsForView: any[] = [];

  private static readonly EMPTY_ROWS: any[] = [];
  
  // Editable concepts
  editingConcepts: Map<string, boolean> = new Map();
  editedValues: Map<string, number> = new Map();
  savingConcept: Map<string, boolean> = new Map();
  
  // Permissions
  canProcessPayroll = false;
  canApprovePayroll = false;
  canManagePayroll = false;
  
  // DataTables (períodos, plantillas, empleados)
  dtOptionsPeriods: any = {};
  dtTriggerPeriods: Subject<any> = new Subject<any>();
  dtOptionsTemplates: any = {};
  dtTriggerTemplates: Subject<any> = new Subject<any>();
  dtOptionsEmployees: any = {};
  dtTriggerEmployees: Subject<any> = new Subject<any>();
  dtOptionsResults: any = {};
  dtTriggerResults: Subject<any> = new Subject<any>();
  @ViewChildren(DataTableDirective) dtElements!: QueryList<DataTableDirective>;
  
  // Status options
  statusOptions = [
    { value: '', label: 'Todos los estados' },
    { value: 'draft', label: 'Borrador' },
    { value: 'calculated', label: 'Calculado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'closed', label: 'Cerrado' }
  ];
  
  // Year options
  availableYears: number[] = [];
  
  // Month options
  availableMonths = [
    { value: '01', label: 'Enero' },
    { value: '02', label: 'Febrero' },
    { value: '03', label: 'Marzo' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Mayo' },
    { value: '06', label: 'Junio' },
    { value: '07', label: 'Julio' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  constructor(
    private payrollPeriodService: PayrollPeriodService,
    private templateService: PayrollTemplateService,
    private contractService: EmployeeContractService, // ✅ Servicio de contratos
    private employeeService: EmployeeService,
    private authService: AuthService,
    private menuPermissionsService: MenuPermissionsService,
    private notificationService: NotificationService,
    private fundingSourceService: FundingSourceService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.initializePermissions();
    this.initDataTables();

    const periodId = this.route.snapshot.queryParamMap.get('period_id');
    const templateId = this.route.snapshot.queryParamMap.get('template_id');
    this.soloPreviewMode = this.route.snapshot.queryParamMap.get('solo_preview') === '1';

    if (periodId && templateId) {
      this.openViewTemplateId = +templateId;
      this.payrollPeriodService.getPeriod(+periodId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res) => {
            if (res.success && res.data) {
              this.selectedPeriod = res.data;
              this.loadTemplateProcesses(res.data.id!);
              this.loadTemplatesWithEmployees();
            }
          }
        });
    } else {
      this.loadPeriods();
    }
    if (!this.soloPreviewMode) {
      this.loadAvailableYears();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize user permissions
   */
  private initializePermissions(): void {
    console.log('🔐 Inicializando permisos para procesar planillas...');
    
    // Sistema de planillas ID: 52, Menú de procesar ID: 259
    const sistemaId = 52;
    const menuId = 259;
    
    this.canProcessPayroll = this.menuPermissionsService.canEditMenu(sistemaId, menuId);
    this.canApprovePayroll = this.menuPermissionsService.canApproveMenu(sistemaId, menuId);
    this.canManagePayroll = this.menuPermissionsService.canManageMenu(sistemaId, menuId);
    
    console.log('🔐 Permisos inicializados:', {
      canProcess: this.canProcessPayroll,
      canApprove: this.canApprovePayroll,
      canManage: this.canManagePayroll
    });
  }

  /**
   * Initialize DataTables options for periods, templates and employees
   */
  private initDataTables(): void {
    const commonOptions = {
      pagingType: 'full_numbers' as const,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'Todos']],
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']]
    };
    this.dtOptionsPeriods = {
      ...commonOptions,
      columnDefs: [{ targets: -1, orderable: false, searchable: false }]
    };
    this.dtOptionsTemplates = {
      ...commonOptions,
      columnDefs: [{ targets: -1, orderable: false, searchable: false }]
    };
    this.dtOptionsEmployees = {
      ...commonOptions,
      columnDefs: [{ targets: 0, orderable: false, searchable: false }, { targets: -1, orderable: false, searchable: false }]
    };
    this.dtOptionsResults = {
      ...commonOptions,
      pagingType: 'simple_numbers',
      pageLength: 10
    };
  }

  /**
   * Load templates with active employees (NEW)
   */
  loadTemplatesWithEmployees(): void {
    this.loadingTemplates = true;
    
    this.templateService.getTemplates({
      paginate: false,
      only_with_employees: true, // Solo plantillas con empleados
      with_employee_count: true  // Incluir contador de empleados
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.templates = Array.isArray(response.data) 
              ? response.data 
              : (response.data?.data || []);
            console.log('✅ Plantillas con empleados cargadas:', this.templates.length);
            if (this.openViewTemplateId != null && this.selectedPeriod) {
              const tid = Number(this.openViewTemplateId);
              const template = this.templates.find(
                t => t.id != null && Number(t.id) === tid
              );
              if (template) {
                this.selectedTemplate = template;
                this.viewProcessedPayroll(this.selectedPeriod, template);
              } else {
                // La API de listado puede excluir plantillas sin empleados vigentes; la vista procesada sí existe.
                const stub = stubTemplateForPreview(tid);
                this.selectedTemplate = stub;
                this.viewProcessedPayroll(this.selectedPeriod, stub);
              }
              this.openViewTemplateId = null;
            }
          }
          this.loadingTemplates = false;
          if (!this.soloPreviewMode) {
            setTimeout(() => this.dtTriggerTemplates.next(null), 0);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando plantillas:', error);
          this.loadingTemplates = false;
        }
      });
  }

  /**
   * Load payroll periods
   */
  loadPeriods(): void {
    this.loadingPeriods = true;
    
    const filters: any = {
      year: this.yearFilter,
      status: this.statusFilter,
      search: this.searchFilter,
      per_page: 1000
    };
    
    // Add month filter only if selected
    if (this.monthFilter) {
      filters.month = parseInt(this.monthFilter, 10);
    }

    this.payrollPeriodService.getPeriods(filters)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Handle both paginated and non-paginated responses
            this.periods = Array.isArray(response.data) 
              ? response.data 
              : response.data.data;
            console.log('✅ Períodos cargados:', this.periods.length);
          }
          this.loadingPeriods = false;
          setTimeout(() => this.dtTriggerPeriods.next(null), 0);
        },
        error: (error) => {
          console.error('❌ Error cargando períodos:', error);
          this.loadingPeriods = false;
        }
      });
  }

  /**
   * Load employees with active contracts of the selected template type
   */
  loadEmployees(): void {
    if (!this.selectedTemplate) {
      console.log('⚠️ No hay plantilla seleccionada, no se pueden cargar empleados');
      return;
    }

    this.loadingEmployees = true;
    this.employees = [];
    
    console.log('👥 Cargando empleados con contratos vigentes tipo:', this.selectedTemplate.type);
    
    // Obtener contratos vigentes del tipo de la plantilla
    this.contractService.getContracts({ 
      contract_type: this.selectedTemplate.type, 
      status: 'vigente',
      per_page: 1000
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            // Extraer contratos de la respuesta
            let contracts = [];
            if (Array.isArray(response.data)) {
              contracts = response.data;
            } else if (response.data?.contracts) {
              contracts = response.data.contracts;
            } else if (response.data?.data) {
              contracts = response.data.data;
            }
            
            console.log('📋 Contratos vigentes encontrados:', contracts.length);
            
            // Mapear contratos a empleados con información completa
            this.employees = contracts
              .filter((contract: any) => contract.employee && contract.employee.status === 'active')
              .map((contract: any) => {
                const emp = contract.employee;
                return {
                  ...emp,
                  full_name: emp.full_name || `${emp.first_name} ${emp.last_name}`,
                  position: contract.position || emp.position,
                  contract: contract
                };
              });
            
            const templateType = this.selectedTemplate?.type || 'desconocido';
            console.log('✅ Empleados con contratos vigentes del tipo', templateType + ':', this.employees.length);
          }
          this.loadingEmployees = false;
          setTimeout(() => this.dtTriggerEmployees.next(null), 0);
        },
        error: (error) => {
          console.error('❌ Error cargando empleados:', error);
          this.loadingEmployees = false;
        }
      });
  }

  /**
   * Load available years
   */
  loadAvailableYears(): void {
    this.payrollPeriodService.getAvailableYears()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.availableYears = response.data;
            if (this.availableYears.length === 0) {
              this.availableYears = [new Date().getFullYear()];
            }
          }
        },
        error: (error) => {
          console.error('❌ Error cargando años:', error);
          this.availableYears = [new Date().getFullYear()];
        }
      });
  }

  /**
   * Select period for processing
   */
  selectPeriod(period: PayrollPeriod): void {
    this.selectedPeriod = period;
    this.selectedTemplate = null;
    this.selectedEmployees = [];
    this.processingResults = null;
    this.showResults = false;
    console.log('📅 Período seleccionado:', period);
    
    // Cargar plantillas con empleados y sus estados de proceso
    this.loadTemplatesWithEmployees();
    this.loadTemplateProcesses(period.id!);
  }

  /** Volver al paso de selección de período y re-disparar DataTable */
  goBackToPeriods(): void {
    this.selectedPeriod = null;
    this.selectedTemplate = null;
    setTimeout(() => this.dtTriggerPeriods.next(null), 100);
  }

  /** Volver al paso de selección de plantilla y re-disparar DataTable */
  goBackToTemplates(): void {
    this.selectedTemplate = null;
    setTimeout(() => this.dtTriggerTemplates.next(null), 100);
  }

  /**
   * Load template processes for a period
   */
  loadTemplateProcesses(periodId: number): void {
    this.payrollPeriodService.getTemplateProcesses(periodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.templateProcesses = response.data;
            console.log('📋 Procesos de plantilla cargados:', this.templateProcesses);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando procesos:', error);
        }
      });
  }

  /**
   * Get template process status
   */
  getTemplateProcessStatus(templateId: number): string {
    const process = this.templateProcesses.find(p => p.payroll_template_id === templateId);
    return process?.status || 'draft';
  }

  /**
   * Check if template can be processed
   */
  canProcessTemplate(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'draft' && this.selectedPeriod?.status === 'draft';
  }

  /**
   * Check if template process can be viewed
   */
  canViewTemplateProcess(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return ['calculated', 'approved', 'closed'].includes(processStatus);
  }

  /**
   * Check if template process can be deleted
   */
  canDeleteTemplateProcess(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'calculated';
  }

  /**
   * Check if template process can be reprocessed (recalculate in place)
   */
  canReprocessTemplate(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'calculated' || processStatus === 'approved';
  }

  /**
   * Check if template process can be approved
   */
  canApproveTemplateProcess(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'calculated';
  }

  /**
   * Check if template process can be unapproved
   */
  canUnapproveTemplateProcess(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'approved';
  }

  /**
   * Check if template process can be closed
   */
  canCloseTemplateProcess(templateId: number): boolean {
    const processStatus = this.getTemplateProcessStatus(templateId);
    return processStatus === 'approved';
  }

  /**
   * Select template (NEW)
   */
  selectTemplate(template: PayrollTemplate): void {
    this.selectedTemplate = template;
    console.log('📋 Plantilla seleccionada:', template);
    
    // Cargar empleados con contratos vigentes de este tipo
    this.loadEmployees();
  }
  
  /**
   * Get category label (NEW)
   */
  getCategoryLabel(category: string): string {
    const labels: { [key: string]: string } = {
      'monthly': 'Mensual',
      'biweekly': 'Quincenal',
      'weekly': 'Semanal',
      'daily': 'Diaria'
    };
    return labels[category] || category;
  }

  /**
   * Toggle employee selection
   */
  toggleEmployee(employeeId: number): void {
    const index = this.selectedEmployees.indexOf(employeeId);
    if (index > -1) {
      this.selectedEmployees.splice(index, 1);
    } else {
      this.selectedEmployees.push(employeeId);
    }
  }

  /**
   * Select all employees
   */
  selectAllEmployees(): void {
    this.selectedEmployees = this.employees.map(emp => emp.id!);
  }

  /**
   * Clear employee selection
   */
  clearEmployeeSelection(): void {
    this.selectedEmployees = [];
  }

  /**
   * Create payroll for selected template, period and employees
   */
  createPayroll(): void {
    // Validaciones
    if (!this.selectedPeriod) {
      this.notificationService.error('Debe seleccionar un período');
      return;
    }

    if (!this.selectedTemplate) {
      this.notificationService.error('Debe seleccionar una plantilla');
      return;
    }

    if (this.selectedEmployees.length === 0) {
      this.notificationService.error('Debe seleccionar al menos un empleado');
      return;
    }

    this.processing = true;
    this.showResults = false;

    const payrollData = {
      period_id: this.selectedPeriod.id,
      template_id: this.selectedTemplate.id,
      template_type: this.selectedTemplate.type,
      employee_ids: this.selectedEmployees,
      auto_approve: this.autoApprove,
      auto_close: this.autoClose,
      notify_employees: this.notifyEmployees,
      // Información adicional de la plantilla
      selected_concepts: this.selectedTemplate.selected_concepts || [],
      header_config: this.selectedTemplate.header_config,
      concept_config: this.selectedTemplate.concept_config,
      footer_config: this.selectedTemplate.footer_config
    };

    console.log('🔄 Creando planilla:', {
      period: this.selectedPeriod.period_name,
      template: this.selectedTemplate.name,
      employees: this.selectedEmployees.length,
      data: payrollData
    });

    this.payrollPeriodService.processPayroll(this.selectedPeriod.id!, payrollData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.processingResults = response.data;
            this.showResults = true;
            this.notificationService.success('Planilla creada exitosamente');
            setTimeout(() => this.dtTriggerResults.next(null), 0);
            
            // Reload periods and template processes to update status
            this.loadPeriods();
            
            if (this.selectedPeriod && this.selectedPeriod.id) {
              this.loadTemplateProcesses(this.selectedPeriod.id);
              
              // Automatically open the processed payroll modal to show employees and concepts
              if (this.selectedTemplate) {
                setTimeout(() => {
                  this.viewProcessedPayroll(this.selectedPeriod!, this.selectedTemplate!);
                }, 500);
              }
            }
            
            console.log('✅ Planilla creada:', response.data);
          } else {
            this.notificationService.error(response.message || 'Error al crear la planilla');
          }
          this.processing = false;
        },
        error: (error) => {
          console.error('❌ Error creando planilla:', error);
          console.error('❌ Detalles del error:', {
            status: error.status,
            message: error.error?.message,
            errors: error.error?.errors,
            fullError: error.error
          });
          
          // Mostrar errores de validación si existen
          if (error.status === 422 && error.error?.errors) {
            const errorMessages = Object.entries(error.error.errors)
              .map(([field, messages]: [string, any]) => `• ${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
              .join('\n');
            this.notificationService.error('Errores de validación:\n' + errorMessages);
          } else {
            const errorMessage = error.error?.message || error.message || 'Error al crear la planilla';
            this.notificationService.error(errorMessage);
          }
          
          this.processing = false;
        }
      });
  }

  /**
   * Process payroll (legacy - keeping for compatibility)
   */
  processPayroll(): void {
    this.createPayroll();
  }

  /**
   * Apply filters
   */
  applyFilters(): void {
    this.loadPeriods();
  }

  /**
   * Clear filters
   */
  clearFilters(): void {
    this.yearFilter = new Date().getFullYear();
    this.monthFilter = '';
    this.statusFilter = '';
    this.searchFilter = '';
    this.loadPeriods();
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'draft':
        return 'badge-secondary';
      case 'calculated':
        return 'badge-info';
      case 'approved':
        return 'badge-success';
      case 'closed':
        return 'badge-dark';
      default:
        return 'badge-secondary';
    }
  }



  /**
   * Get selected employees count
   */
  getSelectedEmployeesCount(): number {
    return this.selectedEmployees.length;
  }

  /**
   * Check if all employees are selected
   */
  areAllEmployeesSelected(): boolean {
    return this.selectedEmployees.length === this.employees.length;
  }

  /**
   * Check if period can be processed (is in draft status)
   */
  canProcessPeriod(period: PayrollPeriod): boolean {
    return period.status === 'draft';
  }

  /**
   * Check if period process can be deleted (calculated but not approved/closed)
   */
  canDeleteProcess(period: PayrollPeriod): boolean {
    return period.status === 'calculated';
  }

  /**
   * Check if processed payroll can be viewed (calculated, approved, or closed)
   */
  canViewProcessed(period: PayrollPeriod): boolean {
    return ['calculated', 'approved', 'closed'].includes(period.status);
  }

  /**
   * Delete template process (revert to draft)
   */
  deleteTemplateProcess(template: PayrollTemplate): void {
    if (!confirm(`¿Está seguro de eliminar el proceso de la plantilla "${template.name}"?\n\nEsto eliminará los cálculos de esta plantilla.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.deleteTemplateProcess(this.selectedPeriod!.id!, template.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Proceso eliminado exitosamente');
            this.loadTemplateProcesses(this.selectedPeriod!.id!); // Reload processes
            this.loadPeriods(); // Reload periods
          } else {
            this.notificationService.error(response.message || 'Error al eliminar el proceso');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error eliminando proceso:', error);
          const errorMessage = error.error?.message || error.message || 'Error al eliminar el proceso';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Reprocess template: recalculate and update payroll details in place (no delete). Stays on Step 2.
   */
  reprocessTemplate(template: PayrollTemplate): void {
    if (!confirm(`¿Reprocesar la plantilla "${template.name}"?\n\nSe recalcularán todos los conceptos (ingresos, descuentos, aportes) y se actualizarán los valores sin eliminar registros. Los valores modificados manualmente se conservan.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.reprocessTemplateProcess(this.selectedPeriod!.id!, template.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Plantilla reprocesada correctamente');
            this.loadTemplateProcesses(this.selectedPeriod!.id!);
            this.loadPeriods();
          } else {
            this.notificationService.error(response.message || 'Error al reprocesar');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error reprocesando:', error);
          const errorMessage = error.error?.message || error.message || 'Error al reprocesar la plantilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Approve template process
   */
  approveTemplateProcess(template: PayrollTemplate): void {
    if (!confirm(`¿Está seguro de aprobar la plantilla "${template.name}"?`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.approveTemplateProcess(this.selectedPeriod!.id!, template.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Plantilla aprobada exitosamente');
            this.loadTemplateProcesses(this.selectedPeriod!.id!); // Reload processes
            this.loadPeriods(); // Reload periods
          } else {
            this.notificationService.error(response.message || 'Error al aprobar la plantilla');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error aprobando plantilla:', error);
          const errorMessage = error.error?.message || error.message || 'Error al aprobar la plantilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Unapprove template process
   */
  unapproveTemplateProcess(template: PayrollTemplate): void {
    if (!confirm(`¿Desea desactivar la aprobación de la plantilla "${template.name}"?`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.unapproveTemplateProcess(this.selectedPeriod!.id!, template.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Aprobación desactivada');
            this.loadTemplateProcesses(this.selectedPeriod!.id!);
            this.loadPeriods();
          } else {
            this.notificationService.error(response.message || 'Error al desactivar la aprobación');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error unapproving template:', error);
          const errorMessage = error.error?.message || error.message || 'Error al desactivar la aprobación';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Close template process
   */
  closeTemplateProcess(template: PayrollTemplate): void {
    if (!confirm(`¿Está seguro de cerrar la plantilla "${template.name}"?\n\nUna vez cerrada, no se podrá modificar.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.closeTemplateProcess(this.selectedPeriod!.id!, template.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Plantilla cerrada exitosamente');
            
            if (response.period_status_updated) {
              this.notificationService.info('Todas las plantillas cerradas - Período actualizado a CALCULADO');
            }
            
            this.loadTemplateProcesses(this.selectedPeriod!.id!); // Reload processes
            this.loadPeriods(); // Reload periods
          } else {
            this.notificationService.error(response.message || 'Error al cerrar la plantilla');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cerrando plantilla:', error);
          const errorMessage = error.error?.message || error.message || 'Error al cerrar la plantilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Delete payroll process (legacy - for period-level deletion)
   */
  deletePayrollProcess(period: PayrollPeriod): void {
    if (!confirm(`¿Está seguro de volver la planilla "${period.period_name}" a estado Borrador?\n\nEsto eliminará todos los cálculos realizados.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.deleteProcess(period.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Proceso eliminado exitosamente');
            this.loadPeriods(); // Reload to update status
          } else {
            this.notificationService.error(response.message || 'Error al eliminar el proceso');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error eliminando proceso:', error);
          const errorMessage = error.error?.message || error.message || 'Error al eliminar el proceso de planilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * View processed payroll details (specific template)
   */
  viewProcessedPayroll(period: PayrollPeriod, template?: PayrollTemplate): void {
    this.loadingProcessedData = true;
    this.showProcessedModal = true;
    this.modalBackdropIgnoreUntil = Date.now() + 450;
    this.processedPayrollData = null;
    this.clearProcessedModalCaches();

    // Pass template ID to backend to filter concepts
    const templateId = template?.id;
    
    this.payrollPeriodService.viewProcessed(period.id!, templateId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.processedPayrollData = response.data;
            this.refreshProcessedModalCaches();
            this.loadFundingSources();
          } else {
            this.notificationService.error(response.message || 'Error al cargar la planilla procesada');
            this.showProcessedModal = false;
          }
          this.loadingProcessedData = false;
        },
        error: (error) => {
          console.error('❌ Error cargando planilla procesada:', error);
          const errorMessage = error.error?.message || error.message || 'Error al cargar la planilla procesada';
          this.notificationService.error(errorMessage);
          this.showProcessedModal = false;
          this.loadingProcessedData = false;
        }
      });
  }

  /**
   * Cierre solo por clic en el fondo oscuro (no en el panel). Ignora clics justo tras abrir el modal.
   */
  onModalBackdropClick(): void {
    if (Date.now() < this.modalBackdropIgnoreUntil) {
      return;
    }
    this.closeProcessedModal();
  }

  /**
   * Close processed payroll modal
   */
  closeProcessedModal(): void {
    this.showProcessedModal = false;
    this.processedPayrollData = null;
    this.clearProcessedModalCaches();
    if (this.soloPreviewMode) {
      this.router.navigate(['/planillas/reporte-planillas']);
    }
  }

  private clearProcessedModalCaches(): void {
    this.uniqueIncomeConceptsForView = [];
    this.uniqueDeductionConceptsForView = [];
    this.uniqueContributionConceptsForView = [];
    this.afpSummaryDeductionColumnsForView = [];
  }

  /** Rellena las listas usadas en el template del modal (referencias estables para *ngFor). */
  private refreshProcessedModalCaches(): void {
    this.uniqueIncomeConceptsForView = this.getUniqueIncomeConcepts();
    this.uniqueDeductionConceptsForView = this.getUniqueDeductionConcepts();
    this.uniqueContributionConceptsForView = this.getUniqueContributionConcepts();
    this.afpSummaryDeductionColumnsForView = this.getAfpSummaryDeductionColumns();
  }

  /**
   * Get status label in Spanish
   */
  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'draft': 'Borrador',
      'calculated': 'Calculado',
      'approved': 'Aprobado',
      'closed': 'Cerrado'
    };
    return labels[status] || status;
  }

  /**
   * Format currency
   */
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(value || 0);
  }

  /**
   * Get unique income concepts from processed data
   */
  getUniqueIncomeConcepts(): any[] {
    if (!this.processedPayrollData?.employees || this.processedPayrollData.employees.length === 0) {
      return [];
    }
    const concepts = new Map();
    this.processedPayrollData.employees.forEach((employee: any) => {
      employee.incomes?.forEach((concept: any) => {
        if (!concepts.has(concept.concept_id)) {
          concepts.set(concept.concept_id, concept);
        }
      });
    });
    // Sort by display_order first, then by calculation_priority, then by concept_name
    return Array.from(concepts.values()).sort((a, b) => {
      const aOrder = a.concept_display_order ?? 999;
      const bOrder = b.concept_display_order ?? 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      const aPriority = a.concept_calculation_priority ?? 999;
      const bPriority = b.concept_calculation_priority ?? 999;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return (a.concept_name || '').localeCompare(b.concept_name || '');
    });
  }

  /**
   * Get unique deduction concepts from processed data
   */
  getUniqueDeductionConcepts(): any[] {
    if (!this.processedPayrollData?.employees || this.processedPayrollData.employees.length === 0) {
      return [];
    }
    const concepts = new Map();
    this.processedPayrollData.employees.forEach((employee: any) => {
      employee.deductions?.forEach((concept: any) => {
        if (!concepts.has(concept.concept_id)) {
          concepts.set(concept.concept_id, concept);
        }
      });
    });
    // Sort by display_order first, then by calculation_priority, then by concept_name
    return Array.from(concepts.values()).sort((a, b) => {
      const aOrder = a.concept_display_order ?? 999;
      const bOrder = b.concept_display_order ?? 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      const aPriority = a.concept_calculation_priority ?? 999;
      const bPriority = b.concept_calculation_priority ?? 999;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return (a.concept_name || '').localeCompare(b.concept_name || '');
    });
  }

  /**
   * Get unique contribution concepts from processed data
   */
  getUniqueContributionConcepts(): any[] {
    if (!this.processedPayrollData?.employees || this.processedPayrollData.employees.length === 0) {
      return [];
    }
    const concepts = new Map();
    this.processedPayrollData.employees.forEach((employee: any) => {
      employee.contributions?.forEach((concept: any) => {
        if (!concepts.has(concept.concept_id)) {
          concepts.set(concept.concept_id, concept);
        }
      });
    });
    // Sort by display_order first, then by calculation_priority, then by concept_name
    return Array.from(concepts.values()).sort((a, b) => {
      const aOrder = a.concept_display_order ?? 999;
      const bOrder = b.concept_display_order ?? 999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      const aPriority = a.concept_calculation_priority ?? 999;
      const bPriority = b.concept_calculation_priority ?? 999;
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      return (a.concept_name || '').localeCompare(b.concept_name || '');
    });
  }

  /**
   * Get concept value for an employee
   */
  getConceptValue(employee: any, conceptId: number, category: string): number {
    const conceptList = employee[category] || [];
    const concept = conceptList.find((c: any) => c.concept_id === conceptId);
    return concept?.final_value || 0;
  }

  /**
   * Check if concept value is manually overridden
   */
  isManualOverride(employee: any, conceptId: number, category: string): boolean {
    const conceptList = employee[category] || [];
    const concept = conceptList.find((c: any) => c.concept_id === conceptId);
    return concept?.is_manual_override || false;
  }

  /**
   * Check if a concept is editable (variable type without formula)
   */
  isConceptEditable(concept: any): boolean {
    if (concept.is_editable === true) return true;
    if (concept.concept_category === 'variable') {
      return !concept.formula || concept.formula === null || concept.formula === '';
    }
    return false;
  }

  /**
   * Get editing key for a concept
   */
  getConceptKey(employeeId: number, conceptId: number): string {
    return `${employeeId}_${conceptId}`;
  }

  /**
   * Check if concept is being edited
   */
  isEditingConcept(employeeId: number, conceptId: number): boolean {
    return this.editingConcepts.get(this.getConceptKey(employeeId, conceptId)) || false;
  }

  /**
   * Start editing a concept
   */
  startEditingConcept(employee: any, concept: any, category: string): void {
    // Find the actual concept in employee data
    const conceptList = employee[category] || [];
    const actualConcept = conceptList.find((c: any) => c.concept_id === concept.concept_id);
    
    if (!actualConcept) {
      console.warn('Concept not found in employee data', { employee, concept, category });
      return;
    }
    
    const key = this.getConceptKey(employee.employee_id, concept.concept_id);
    this.editingConcepts.set(key, true);
    this.editedValues.set(key, actualConcept.final_value || 0);
  }

  /**
   * Cancel editing a concept
   */
  cancelEditingConcept(employeeId: number, conceptId: number): void {
    const key = this.getConceptKey(employeeId, conceptId);
    this.editingConcepts.delete(key);
    this.editedValues.delete(key);
  }

  /**
   * Get edited value for a concept
   */
  getEditedValue(employeeId: number, conceptId: number): number {
    return this.editedValues.get(this.getConceptKey(employeeId, conceptId)) || 0;
  }

  /**
   * Update edited value
   */
  updateEditedValue(employeeId: number, conceptId: number, value: any): void {
    const key = this.getConceptKey(employeeId, conceptId);
    const num = (value === '' || value === null || value === undefined || isNaN(Number(value))) ? 0 : Number(value);
    this.editedValues.set(key, num);
  }

  /**
   * Save edited concept value
   */
  saveConceptValue(employee: any, concept: any, category: string): void {
    const key = this.getConceptKey(employee.employee_id, concept.concept_id);
    const newValue = this.getEditedValue(employee.employee_id, concept.concept_id);
    
    this.savingConcept.set(key, true);
    
    // Find the actual concept in employee data
    const conceptList = employee[category] || [];
    const actualConcept = conceptList.find((c: any) => c.concept_id === concept.concept_id);
    
    if (!actualConcept) {
      console.error('Concept not found in employee data');
      this.savingConcept.delete(key);
      return;
    }
    
    // Call API to update value (pass template_process_id for correct record lookup in multi-template periods)
    const templateProcessId = this.processedPayrollData.process_meta?.template_process_id;
    this.payrollPeriodService.updateConceptValue(
      this.processedPayrollData.period.id,
      employee.employee_id,
      concept.concept_id,
      newValue,
      templateProcessId
    ).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Update local data
            actualConcept.manual_value = newValue;
            actualConcept.final_value = newValue;
            actualConcept.is_manual_override = true;
            
            // Recalculate employee totals
            this.recalculateEmployeeTotals(employee, category);
            
            // Recalculate summary totals
            this.recalculateSummaryTotals();
            
            this.notificationService.success('Valor actualizado exitosamente');
            this.cancelEditingConcept(employee.employee_id, concept.concept_id);
          }
          this.savingConcept.delete(key);
        },
        error: (error) => {
          console.error('Error guardando valor:', error);
          this.notificationService.error('Error al guardar el valor');
          this.savingConcept.delete(key);
        }
      });
  }

  /**
   * Recalculate employee totals
   */
  recalculateEmployeeTotals(employee: any, changedCategory: string): void {
    employee.total_income = employee.incomes.reduce((sum: number, c: any) => sum + (c.final_value || 0), 0);
    employee.total_deductions = employee.deductions.reduce((sum: number, c: any) => sum + (c.final_value || 0), 0);
    employee.total_contributions = employee.contributions.reduce((sum: number, c: any) => sum + (c.final_value || 0), 0);
    employee.net_salary = employee.total_income - employee.total_deductions;
  }

  /**
   * Recalculate summary totals
   */
  recalculateSummaryTotals(): void {
    if (!this.processedPayrollData?.employees) return;
    
    const summary = {
      total_gross_salary: 0,
      total_deductions: 0,
      total_net_salary: 0,
      total_employer_contributions: 0
    };
    
    this.processedPayrollData.employees.forEach((emp: any) => {
      summary.total_gross_salary += emp.total_income || 0;
      summary.total_deductions += emp.total_deductions || 0;
      summary.total_net_salary += emp.net_salary || 0;
      summary.total_employer_contributions += emp.total_contributions || 0;
    });
    
    this.processedPayrollData.summary = {
      ...this.processedPayrollData.summary,
      ...summary
    };
  }

  /**
   * Get total for a specific concept across all employees
   */
  getConceptTotal(conceptId: number, category: string): number {
    if (!this.processedPayrollData?.employees) {
      return 0;
    }
    return this.processedPayrollData.employees.reduce((total: number, employee: any) => {
      const conceptList = employee[category] || [];
      const concept = conceptList.find((c: any) => c.concept_id === conceptId);
      return total + (concept?.final_value || 0);
    }, 0);
  }

  /**
   * Get concept abbreviation (first letters of each word)
   */
  getConceptAbbreviation(name: string): string {
    const words = name.split(' ');
    if (words.length === 1) {
      return name.substring(0, 8);
    }
    return words.map(w => w.charAt(0).toUpperCase()).join('');
  }

  /**
   * Nombre de la fuente de financiamiento del proceso actual (para pie de resumen)
   */
  getFundingSourceName(): string {
    const id = this.processedPayrollData?.process_meta?.funding_source_id;
    if (id == null || !this.fundingSources.length) {
      return '';
    }
    const fs = this.fundingSources.find(f => f.id === id);
    return fs?.name ?? '';
  }

  /**
   * Resumen por partida (afectación presupuestal) desde el backend
   */
  getSummaryByPartida(): any[] {
    const p = this.processedPayrollData?.summary_by_partida;
    return p != null && p.length ? p : ProcesarPlanillasComponent.EMPTY_ROWS;
  }

  /**
   * Total afectación presupuestal: suma de partidas o Remuneración + Aportes si no hay partidas
   */
  getAfectacionPresupuestalTotal(): number {
    const partida = this.getSummaryByPartida();
    if (partida?.length) {
      return partida.reduce((sum: number, row: any) => sum + (row.importe ?? 0), 0);
    }
    return (this.processedPayrollData?.summary?.total_gross_salary ?? 0) +
      (this.processedPayrollData?.summary?.total_employer_contributions ?? 0);
  }

  /**
   * Resumen por AFP (descuentos por AFP de empleados) desde el backend
   */
  getSummaryByAfp(): any[] {
    const p = this.processedPayrollData?.summary_by_afp;
    return p != null && p.length ? p : ProcesarPlanillasComponent.EMPTY_ROWS;
  }

  /**
   * Columnas de descuentos para la tabla AFP: solo conceptos de descuento relacionados con AFP/ONP/SPP
   * (aporte obligatorio, comisión, prima de seguro, etc.), no otros descuentos.
   */
  getAfpSummaryDeductionColumns(): any[] {
    const keywords = ['afp', 'onp', 'pension', 'spp', 'comision', 'prima', 'seguro', 'obligatorio'];
    const isAfpRelated = (name: string, code: string) => {
      const n = (name || '').toLowerCase();
      const c = (code || '').toLowerCase();
      return keywords.some(k => n.includes(k) || c.includes(k));
    };
    const rows = this.getSummaryByAfp();
    const byId = new Map<number, { concept_id: number; concept_name: string }>();
    rows.forEach((row: any) => {
      (row.deductions || []).forEach((d: any) => {
        if (d.concept_id && !byId.has(d.concept_id) && isAfpRelated(d.concept_name || '', d.concept_code || '')) {
          byId.set(d.concept_id, { concept_id: d.concept_id, concept_name: d.concept_name || '' });
        }
      });
    });
    return Array.from(byId.values());
  }

  /**
   * Total de un concepto de descuento en una fila del resumen AFP
   */
  getAfpDeductionTotal(afpRow: any, conceptId: number): number {
    const d = (afpRow.deductions || []).find((x: any) => x.concept_id === conceptId);
    return d?.total ?? 0;
  }

  /**
   * Total de descuentos AFP/ONP para una fila del resumen (solo columnas mostradas = descuentos AFP)
   */
  getAfpRowTotalAfpDeductions(afpRow: any): number {
    const cols = this.afpSummaryDeductionColumnsForView.length
      ? this.afpSummaryDeductionColumnsForView
      : this.getAfpSummaryDeductionColumns();
    return cols.reduce((sum, col) => sum + this.getAfpDeductionTotal(afpRow, col.concept_id), 0);
  }

  /**
   * Conceptos de aportes relacionados con AFP/SPP (para resumen SPP-AFPS)
   */
  getContributionConceptsAfpRelated(): any[] {
    const all = this.getUniqueContributionConcepts();
    const keywords = ['afp', 'onp', 'pension', 'spp', 'comision', 'prima', 'seguro'];
    return all.filter(c => {
      const name = (c.concept_name || '').toLowerCase();
      const code = (c.concept_code || '').toLowerCase();
      return keywords.some(k => name.includes(k) || code.includes(k));
    });
  }

  /**
   * Total de aportes AFP/SPP (suma de conceptos relacionados)
   */
  getTotalAfpContributions(): number {
    const concepts = this.getContributionConceptsAfpRelated();
    return concepts.reduce((sum, c) => sum + this.getConceptTotal(c.concept_id, 'contributions'), 0);
  }

  /**
   * Export processed payroll view to PDF (mismo formato que la vista previa; abre diálogo imprimir → Guardar como PDF)
   */
  exportProcessedPDF(): void {
    if (!this.processedPayrollData?.employees?.length) {
      this.notificationService.warning('No hay datos para exportar');
      return;
    }
    const incomes = this.getUniqueIncomeConcepts();
    const deductions = this.getUniqueDeductionConcepts();
    const contributions = this.getUniqueContributionConcepts();
    const period = this.processedPayrollData.period;
    const templateName = (this.processedPayrollData.template?.name || 'Planilla').replace(/</g, '&lt;');
    const periodName = (period?.period_name || '').replace(/</g, '&lt;');
    const startDate = period?.start_date ? new Date(period.start_date).toLocaleDateString('es-PE') : '';
    const endDate = period?.end_date ? new Date(period.end_date).toLocaleDateString('es-PE') : '';
    const formatNum = (v: number) => (v ?? 0).toFixed(2);
    const formatCurr = (v: number) => new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(v ?? 0);

    const esc = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    // Cabecera tipo vista previa: título, período, badges, resumen
    let html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Planilla ${esc(periodName)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 10px; padding: 12px; color: #333; }
  .preview-info-card { margin-bottom: 12px; padding: 10px; border: 1px solid #333; border-radius: 6px; background: #f0f0f0; }
  .preview-title { font-size: 14px; margin: 0 0 2px 0; color: #333; }
  .preview-description { margin: 0; color: #333; font-size: 10px; }
  .preview-badges-section { margin-top: 8px; }
  .info-badge { display: inline-block; padding: 2px 8px; border-radius: 4px; margin-right: 6px; margin-bottom: 4px; font-size: 9px; background: #f0f0f0; color: #333; border: 1px solid #333; }
  .stats-row { display: flex; gap: 12px; margin-top: 6px; flex-wrap: wrap; }
  .stat-item { font-size: 9px; color: #333; }
  .stat-value { font-weight: bold; margin-left: 4px; }
  .preview-summary { margin-top: 6px; font-size: 10px; color: #333; }
  .summary-item { margin-right: 16px; display: inline; }
  .summary-value { font-weight: bold; margin-left: 4px; }
  table { border-collapse: collapse; width: 100%; margin-top: 8px; color: #333; }
  th, td { border: 1px solid #333; padding: 4px 6px; text-align: right; vertical-align: middle; color: #333; }
  th { font-weight: bold; background: #f0f0f0; }
  .left { text-align: left; }
  .section-headers th { background: #333; color: #fff; text-align: center; font-size: 9px; }
  .concept-headers th { background: #f0f0f0; color: #333; text-align: center; font-size: 9px; border: 1px solid #333; }
  .concept-abbreviation { font-weight: bold; font-size: 9px; }
  .concept-full-name { font-size: 8px; margin-top: 1px; }
  .employee-data .emp-name { font-weight: bold; display: block; }
  .employee-data .emp-code { font-size: 9px; }
  .employee-data .emp-extra { font-size: 8px; margin-top: 2px; }
  .total-row { font-weight: bold; background: #f0f0f0; }
  .totals-label { text-align: left !important; }
  .pie-resumen { margin-top: 16px; padding-top: 10px; border-top: 1px solid #333; }
  .pie-resumen-ref { font-size: 10px; color: #333; margin-bottom: 8px; font-weight: bold; }
  .pie-resumen-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
  .pie-resumen-card { border: 1px solid #333; border-radius: 4px; overflow: hidden; background: #fff; }
  .pie-resumen-title { background: #333; color: #fff; font-size: 9px; font-weight: 700; padding: 6px 8px; text-align: center; border-bottom: 1px solid #333; }
  .pie-resumen-table { width: 100%; font-size: 8px; border-collapse: collapse; }
  .pie-resumen-table th, .pie-resumen-table td { padding: 4px 6px; border: 1px solid #333; color: #333; }
  .pie-resumen-table th { background: #f0f0f0; font-weight: 600; text-align: left; }
  .pie-resumen-table td.text-end { text-align: right; }
  .pie-resumen-table .pie-total-row { background: #f0f0f0; font-weight: 600; }
</style></head><body>
  <div class="preview-info-card">
    <h3 class="preview-title">${esc(templateName)}</h3>
    <p class="preview-description">Período: ${esc(periodName)} (${startDate} - ${endDate})</p>
    <div class="preview-badges-section">
      <span class="info-badge">${esc(periodName)}</span>
      <span class="info-badge">${this.getStatusLabel(period?.status || '')}</span>
      <span class="info-badge">Nº ${esc(this.processedPayrollData.process_meta?.payroll_number || '—')}</span>
    </div>
    <div class="stats-row">
      <span class="stat-item">Ingresos <span class="stat-value">${incomes.length}</span></span>
      <span class="stat-item">Descuentos <span class="stat-value">${deductions.length}</span></span>
      <span class="stat-item">Aportes <span class="stat-value">${contributions.length}</span></span>
    </div>
    <div class="preview-summary">
      <span class="summary-item">Empleados: <span class="summary-value">${this.processedPayrollData.summary?.total_employees ?? 0}</span></span>
      <span class="summary-item">Total neto: <span class="summary-value">${formatCurr(this.processedPayrollData.summary?.total_net_salary ?? 0)}</span></span>
    </div>
  </div>
  <table>
  <thead>
  <tr class="section-headers">
    <th class="employee-info-header" rowspan="2">DATOS EMPLEADO</th>
    <th class="income-section-header" colspan="${incomes.length}">INGRESOS Y REMUNERACIONES</th>
    <th class="total-income-header" rowspan="2">TOT ING. EN SOLES</th>
    <th class="deduction-section-header" colspan="${deductions.length}">DESCUENTOS TRABAJADOR</th>
    <th class="total-deduction-header" rowspan="2">TOT. DSCTS</th>
    <th class="net-pay-header" rowspan="2">SALDO PAG.</th>
    <th class="contribution-section-header" colspan="${contributions.length}">APORT. EMPLEADOR</th>
    <th class="total-contribution-header" rowspan="2">T. APORTES</th>
  </tr>
  <tr class="concept-headers">
    ${incomes.map(c => `<th><div class="concept-abbreviation">${esc(this.getConceptAbbreviation(c.concept_name))}</div><div class="concept-full-name">${esc(c.concept_name)}</div></th>`).join('')}
    ${deductions.map(c => `<th><div class="concept-abbreviation">${esc(this.getConceptAbbreviation(c.concept_name))}</div><div class="concept-full-name">${esc(c.concept_name)}</div></th>`).join('')}
    ${contributions.map(c => `<th><div class="concept-abbreviation">${esc(this.getConceptAbbreviation(c.concept_name))}</div><div class="concept-full-name">${esc(c.concept_name)}</div></th>`).join('')}
  </tr>
  </thead>
  <tbody>`;

    this.processedPayrollData.employees.forEach((emp: any) => {
      const scaleInfo = emp.salary_scale_info;
      const baseInfo = scaleInfo
        ? `${scaleInfo.scale_code || ''}: ${formatCurr(scaleInfo.scale_base_salary ?? 0)}`
        : (emp.employee_base_salary ? `Base: ${formatCurr(emp.employee_base_salary)}` : '');
      html += '<tr><td class="left employee-data"><span class="emp-name">' + esc(emp.employee_name || '') + '</span><span class="emp-code">Código: ' + esc(emp.employee_code || '') + '</span>';
      if (baseInfo) {
        html += '<div class="emp-extra">' + esc(baseInfo) + '</div>';
      }
      html += '</td>';
      incomes.forEach(c => { html += '<td>' + formatNum(this.getConceptValue(emp, c.concept_id, 'incomes')) + '</td>'; });
      html += '<td>' + formatNum(emp.total_income) + '</td>';
      deductions.forEach(c => { html += '<td>' + formatNum(this.getConceptValue(emp, c.concept_id, 'deductions')) + '</td>'; });
      html += '<td>' + formatNum(emp.total_deductions) + '</td><td>' + formatNum(emp.net_salary) + '</td>';
      contributions.forEach(c => { html += '<td>' + formatNum(this.getConceptValue(emp, c.concept_id, 'contributions')) + '</td>'; });
      html += '<td>' + formatNum(emp.total_contributions) + '</td></tr>';
    });

    html += '<tr class="total-row"><td class="left totals-label"><strong>TOTALES</strong></td>';
    incomes.forEach(c => { html += '<td>' + formatNum(this.getConceptTotal(c.concept_id, 'incomes')) + '</td>'; });
    html += '<td>' + formatNum(this.processedPayrollData.summary?.total_gross_salary) + '</td>';
    deductions.forEach(c => { html += '<td>' + formatNum(this.getConceptTotal(c.concept_id, 'deductions')) + '</td>'; });
    html += '<td>' + formatNum(this.processedPayrollData.summary?.total_deductions) + '</td><td>' + formatNum(this.processedPayrollData.summary?.total_net_salary) + '</td>';
    contributions.forEach(c => { html += '<td>' + formatNum(this.getConceptTotal(c.concept_id, 'contributions')) + '</td>'; });
    html += '<td>' + formatNum(this.processedPayrollData.summary?.total_employer_contributions) + '</td></tr>';
    html += '</tbody></table>';
    html += '<div class="preview-summary" style="margin-top:10px;"><span class="summary-item summary-total"><strong>Total a pagar: </strong><span class="summary-value">' + formatCurr(this.processedPayrollData.summary?.total_net_salary ?? 0) + '</span></span></div>';

    // Pie de resumen (igual que vista previa: 5 cuadros)
    const partidaRows = this.getSummaryByPartida();
    const fundingName = this.getFundingSourceName() || '—';
    const afectacionTotal = this.getAfectacionPresupuestalTotal();
    const afpCols = this.getAfpSummaryDeductionColumns();
    const summaryByAfp = this.getSummaryByAfp();

    html += '<div class="pie-resumen"><p class="pie-resumen-ref"><strong>_REFERENCIA:</strong></p><div class="pie-resumen-grid">';

    // 1. AFECTACIÓN PRESUPUESTAL
    html += '<div class="pie-resumen-card"><div class="pie-resumen-title">AFECTACIÓN PRESUPUESTAL</div><table class="pie-resumen-table"><thead><tr><th>Fuente</th><th>Partida Presu.</th><th>Descripcion</th><th>Importe</th></tr></thead><tbody>';
    if (partidaRows.length) {
      partidaRows.forEach((row: any) => {
        html += '<tr><td>' + esc(fundingName) + '</td><td>' + esc(row.partida_code || '—') + '</td><td>' + esc(row.partida_name || row.description || '—') + '</td><td class="text-end">' + formatCurr(row.importe) + '</td></tr>';
      });
    } else {
      html += '<tr><td>' + esc(fundingName) + '</td><td>—</td><td>Remuneración</td><td class="text-end">' + formatCurr(this.processedPayrollData.summary?.total_gross_salary) + '</td></tr>';
      html += '<tr><td>' + esc(fundingName) + '</td><td>—</td><td>Aportes</td><td class="text-end">' + formatCurr(this.processedPayrollData.summary?.total_employer_contributions) + '</td></tr>';
    }
    html += '<tr class="pie-total-row"><td colspan="3"><strong>Total</strong></td><td class="text-end"><strong>' + formatCurr(afectacionTotal) + '</strong></td></tr></tbody></table></div>';

    // 2. CONCEPTOS REMUNERATIVOS
    html += '<div class="pie-resumen-card"><div class="pie-resumen-title">CONCEPTOS REMUNERATIVOS</div><table class="pie-resumen-table"><thead><tr><th>Remuneración</th><th>Importe</th></tr></thead><tbody>';
    incomes.forEach((c: any) => { html += '<tr><td>' + esc(c.concept_name) + '</td><td class="text-end">' + formatCurr(this.getConceptTotal(c.concept_id, 'incomes')) + '</td></tr>'; });
    html += '<tr class="pie-total-row"><td><strong>Total</strong></td><td class="text-end"><strong>' + formatCurr(this.processedPayrollData.summary?.total_gross_salary) + '</strong></td></tr></tbody></table></div>';

    // 3. DESCUENTOS Y/O RETENCIONES
    html += '<div class="pie-resumen-card"><div class="pie-resumen-title">DESCUENTOS Y/O RETENCIONES</div><table class="pie-resumen-table"><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody>';
    deductions.forEach((c: any) => { html += '<tr><td>' + esc(c.concept_name) + '</td><td class="text-end">' + formatCurr(this.getConceptTotal(c.concept_id, 'deductions')) + '</td></tr>'; });
    html += '<tr class="pie-total-row"><td><strong>Total</strong></td><td class="text-end"><strong>' + formatCurr(this.processedPayrollData.summary?.total_deductions) + '</strong></td></tr></tbody></table></div>';

    // 4. APORTES Y/O RETENCIONES
    html += '<div class="pie-resumen-card"><div class="pie-resumen-title">APORTES Y/O RETENCIONES</div><table class="pie-resumen-table"><thead><tr><th>Concepto</th><th>Importe</th></tr></thead><tbody>';
    contributions.forEach((c: any) => { html += '<tr><td>' + esc(c.concept_name) + '</td><td class="text-end">' + formatCurr(this.getConceptTotal(c.concept_id, 'contributions')) + '</td></tr>'; });
    html += '<tr class="pie-total-row"><td><strong>Total</strong></td><td class="text-end"><strong>' + formatCurr(this.processedPayrollData.summary?.total_employer_contributions) + '</strong></td></tr></tbody></table></div>';

    // 5. APORTES SPP-AFPS (solo columnas descuentos AFP)
    html += '<div class="pie-resumen-card"><div class="pie-resumen-title">APORTES SPP-AFPS</div><table class="pie-resumen-table"><thead><tr><th>AFP</th>';
    afpCols.forEach((col: any) => { html += '<th>' + esc(col.concept_name) + '</th>'; });
    html += '<th>Total</th></tr></thead><tbody>';
    summaryByAfp.forEach((row: any) => {
      html += '<tr><td>' + esc(row.afp_name || 'Sin AFP') + '</td>';
      afpCols.forEach((col: any) => { html += '<td class="text-end">' + formatCurr(this.getAfpDeductionTotal(row, col.concept_id)) + '</td>'; });
      html += '<td class="text-end"><strong>' + formatCurr(this.getAfpRowTotalAfpDeductions(row)) + '</strong></td></tr>';
    });
    if (!summaryByAfp.length) {
      html += '<tr><td colspan="' + (afpCols.length + 2) + '" class="text-end">—</td></tr>';
    }
    html += '</tbody></table></div></div></div>';

    html += '</body></html>';

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => {
        w.print();
        w.onafterprint = () => w.close();
      }, 250);
    } else {
      this.notificationService.error('Permite ventanas emergentes para exportar PDF');
    }
  }

  /**
   * Export processed payroll view to Excel con el mismo formato que la vista previa (dos filas de encabezado: secciones + conceptos)
   */
  exportProcessedExcel(): void {
    if (!this.processedPayrollData?.employees?.length) {
      this.notificationService.warning('No hay datos para exportar');
      return;
    }
    const incomes = this.getUniqueIncomeConcepts();
    const deductions = this.getUniqueDeductionConcepts();
    const contributions = this.getUniqueContributionConcepts();
    const period = this.processedPayrollData.period;
    const periodName = (period?.period_name || 'planilla').replace(/[^a-zA-Z0-9]/g, '_');
    const formatNum = (v: number) => (v ?? 0).toFixed(2);

    const escapeCsv = (s: string) => {
      const t = String(s ?? '');
      if (/[";\n\r]/.test(t)) {
        return '"' + t.replace(/"/g, '""') + '"';
      }
      return t;
    };

    // Fila 1: secciones (igual que vista previa)
    const row1: string[] = [
      'DATOS EMPLEADO',
      'DATOS EMPLEADO',
      ...incomes.map(() => 'INGRESOS Y REMUNERACIONES'),
      'TOT ING. EN SOLES',
      ...deductions.map(() => 'DESCUENTOS TRABAJADOR'),
      'TOT. DSCTS',
      'SALDO PAG.',
      ...contributions.map(() => 'APORT. EMPLEADOR'),
      'T. APORTES'
    ];
    // Fila 2: solo abreviaturas (como en vista previa - concepto abreviado)
    const row2Abrev: string[] = [
      'Empleado',
      'Código',
      ...incomes.map(c => this.getConceptAbbreviation(c.concept_name)),
      'Total',
      ...deductions.map(c => this.getConceptAbbreviation(c.concept_name)),
      'Total',
      'Saldo a pagar',
      ...contributions.map(c => this.getConceptAbbreviation(c.concept_name)),
      'Total'
    ];
    // Fila 3: nombre completo del concepto (detalle como en vista previa)
    const row3Nombre: string[] = [
      '',
      '',
      ...incomes.map(c => c.concept_name || ''),
      '',
      ...deductions.map(c => c.concept_name || ''),
      '',
      '',
      ...contributions.map(c => c.concept_name || ''),
      ''
    ];

    let csv = '\uFEFF';
    csv += row1.map(escapeCsv).join(';') + '\n';
    csv += row2Abrev.map(escapeCsv).join(';') + '\n';
    csv += row3Nombre.map(escapeCsv).join(';') + '\n';

    this.processedPayrollData.employees.forEach((emp: any) => {
      const row: string[] = [
        emp.employee_name || '',
        emp.employee_code || '',
        ...incomes.map(c => formatNum(this.getConceptValue(emp, c.concept_id, 'incomes'))),
        formatNum(emp.total_income),
        ...deductions.map(c => formatNum(this.getConceptValue(emp, c.concept_id, 'deductions'))),
        formatNum(emp.total_deductions),
        formatNum(emp.net_salary),
        ...contributions.map(c => formatNum(this.getConceptValue(emp, c.concept_id, 'contributions'))),
        formatNum(emp.total_contributions)
      ];
      csv += row.map(escapeCsv).join(';') + '\n';
    });

    const totalsRow: string[] = [
      'TOTALES',
      '',
      ...incomes.map(c => formatNum(this.getConceptTotal(c.concept_id, 'incomes'))),
      formatNum(this.processedPayrollData.summary?.total_gross_salary),
      ...deductions.map(c => formatNum(this.getConceptTotal(c.concept_id, 'deductions'))),
      formatNum(this.processedPayrollData.summary?.total_deductions),
      formatNum(this.processedPayrollData.summary?.total_net_salary),
      ...contributions.map(c => formatNum(this.getConceptTotal(c.concept_id, 'contributions'))),
      formatNum(this.processedPayrollData.summary?.total_employer_contributions)
    ];
    csv += totalsRow.map(escapeCsv).join(';') + '\n';

    // Total a pagar (como en vista previa)
    csv += escapeCsv('Total a pagar: ' + formatNum(this.processedPayrollData.summary?.total_net_salary)) + '\n';

    // Pie de resumen _REFERENCIA (mismo formato que vista previa)
    csv += '\n';
    csv += escapeCsv('_REFERENCIA:') + '\n';

    const partidaRows = this.getSummaryByPartida();
    const fundingName = this.getFundingSourceName() || '—';
    const afectacionTotal = this.getAfectacionPresupuestalTotal();
    const afpCols = this.getAfpSummaryDeductionColumns();
    const summaryByAfp = this.getSummaryByAfp();

    // 1. AFECTACIÓN PRESUPUESTAL
    csv += escapeCsv('AFECTACIÓN PRESUPUESTAL') + '\n';
    csv += ['Fuente', 'Partida Presu.', 'Descripcion', 'Importe'].map(escapeCsv).join(';') + '\n';
    if (partidaRows.length) {
      partidaRows.forEach((row: any) => {
        csv += [fundingName, row.partida_code || '—', row.partida_name || row.description || '—', formatNum(row.importe)].map(escapeCsv).join(';') + '\n';
      });
    } else {
      csv += [fundingName, '—', 'Remuneración', formatNum(this.processedPayrollData.summary?.total_gross_salary)].map(escapeCsv).join(';') + '\n';
      csv += [fundingName, '—', 'Aportes', formatNum(this.processedPayrollData.summary?.total_employer_contributions)].map(escapeCsv).join(';') + '\n';
    }
    csv += ['', '', 'Total', formatNum(afectacionTotal)].map(escapeCsv).join(';') + '\n\n';

    // 2. CONCEPTOS REMUNERATIVOS (Abrev - Nombre como en vista previa)
    csv += escapeCsv('CONCEPTOS REMUNERATIVOS') + '\n';
    csv += ['Abrev', 'Remuneración', 'Importe'].map(escapeCsv).join(';') + '\n';
    incomes.forEach((c: any) => {
      csv += [this.getConceptAbbreviation(c.concept_name), c.concept_name, formatNum(this.getConceptTotal(c.concept_id, 'incomes'))].map(escapeCsv).join(';') + '\n';
    });
    csv += ['', 'Total', formatNum(this.processedPayrollData.summary?.total_gross_salary)].map(escapeCsv).join(';') + '\n\n';

    // 3. DESCUENTOS Y/O RETENCIONES (Abrev - Nombre como en vista previa)
    csv += escapeCsv('DESCUENTOS Y/O RETENCIONES') + '\n';
    csv += ['Abrev', 'Concepto', 'Importe'].map(escapeCsv).join(';') + '\n';
    deductions.forEach((c: any) => {
      csv += [this.getConceptAbbreviation(c.concept_name), c.concept_name, formatNum(this.getConceptTotal(c.concept_id, 'deductions'))].map(escapeCsv).join(';') + '\n';
    });
    csv += ['', 'Total', formatNum(this.processedPayrollData.summary?.total_deductions)].map(escapeCsv).join(';') + '\n\n';

    // 4. APORTES Y/O RETENCIONES (Abrev - Nombre como en vista previa)
    csv += escapeCsv('APORTES Y/O RETENCIONES') + '\n';
    csv += ['Abrev', 'Concepto', 'Importe'].map(escapeCsv).join(';') + '\n';
    contributions.forEach((c: any) => {
      csv += [this.getConceptAbbreviation(c.concept_name), c.concept_name, formatNum(this.getConceptTotal(c.concept_id, 'contributions'))].map(escapeCsv).join(';') + '\n';
    });
    csv += ['', 'Total', formatNum(this.processedPayrollData.summary?.total_employer_contributions)].map(escapeCsv).join(';') + '\n\n';

    // 5. APORTES SPP-AFPS (solo columnas descuentos AFP - con Abrev como en vista previa)
    csv += escapeCsv('APORTES SPP-AFPS') + '\n';
    csv += ['AFP', ...afpCols.map((col: any) => col.concept_name), 'Total'].map(escapeCsv).join(';') + '\n';
    csv += ['(Abrev)', ...afpCols.map((col: any) => this.getConceptAbbreviation(col.concept_name)), ''].map(escapeCsv).join(';') + '\n';
    summaryByAfp.forEach((row: any) => {
      const rowCells = [row.afp_name || 'Sin AFP', ...afpCols.map((col: any) => formatNum(this.getAfpDeductionTotal(row, col.concept_id))), formatNum(this.getAfpRowTotalAfpDeductions(row))];
      csv += rowCells.map(escapeCsv).join(';') + '\n';
    });
    if (!summaryByAfp.length) {
      csv += escapeCsv('—') + '\n';
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planilla_${periodName}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    this.notificationService.success('Exportación Excel descargada');
  }

  /**
   * Check if period can be approved (calculated status)
   */
  canApprovePeriod(period: PayrollPeriod): boolean {
    return period.status === 'calculated';
  }

  /**
   * Whether a period can be unapproved
   */
  canUnapprovePeriod(period: PayrollPeriod): boolean {
    return period.status === 'approved';
  }

  /**
   * Check if period can be closed (approved status)
   */
  canClosePeriod(period: PayrollPeriod): boolean {
    return period.status === 'approved';
  }

  /**
   * Approve period
   */
  approvePeriod(period: PayrollPeriod): void {
    if (!confirm(`¿Está seguro de aprobar la planilla "${period.period_name}"?\n\nUna vez aprobada, no se podrá modificar.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.approvePeriod(period.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Planilla aprobada exitosamente');
            this.loadPeriods(); // Reload to update status
          } else {
            this.notificationService.error(response.message || 'Error al aprobar la planilla');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error aprobando planilla:', error);
          const errorMessage = error.error?.message || error.message || 'Error al aprobar la planilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Unapprove period
   */
  unapprovePeriod(period: PayrollPeriod): void {
    if (!confirm(`¿Desea desactivar la aprobación del período "${period.period_name}"?`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.unapprovePeriod(period.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Aprobación desactivada');
            this.loadPeriods();
          } else {
            this.notificationService.error(response.message || 'Error al desactivar la aprobación');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error unapproving period:', error);
          const errorMessage = error.error?.message || error.message || 'Error al desactivar la aprobación del período';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  /**
   * Close period
   */
  closePeriod(period: PayrollPeriod): void {
    if (!confirm(`¿Está seguro de cerrar la planilla "${period.period_name}"?\n\nUna vez cerrada, quedará como registro final.`)) {
      return;
    }

    this.loading = true;
    this.payrollPeriodService.closePeriod(period.id!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success(response.message || 'Planilla cerrada exitosamente');
            this.loadPeriods(); // Reload to update status
          } else {
            this.notificationService.error(response.message || 'Error al cerrar la planilla');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cerrando planilla:', error);
          const errorMessage = error.error?.message || error.message || 'Error al cerrar la planilla';
          this.notificationService.error(errorMessage);
          this.loading = false;
        }
      });
  }

  private loadFundingSources(): void {
    this.fundingSourceService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          const data: any = res.data;
          this.fundingSources = Array.isArray(data) ? data : (data?.data || []);
        }
      },
      error: () => {}
    });
  }

  onChangeFunding(fundingId: number | null): void {
    if (!this.selectedPeriod || !this.selectedTemplate || !this.processedPayrollData) return;
    const periodId = this.selectedPeriod.id!;
    const templateId = this.selectedTemplate.id!;
    this.payrollPeriodService.updateTemplateProcessMeta(periodId, templateId, { funding_source_id: fundingId })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.processedPayrollData.process_meta.funding_source_id = fundingId;
            this.notificationService.success('Fuente de financiamiento actualizada');
          } else {
            this.notificationService.error(res.message || 'No se pudo actualizar la fuente');
          }
        },
        error: (err) => {
          const msg = err?.error?.message || 'Error al actualizar la fuente';
          this.notificationService.error(msg);
        }
      });
  }
}
