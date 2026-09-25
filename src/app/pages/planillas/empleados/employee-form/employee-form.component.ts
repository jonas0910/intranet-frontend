import { Component, OnInit, OnChanges, SimpleChanges, Input, Output, EventEmitter, AfterViewInit, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { EmployeeService, Employee, Department, Position, CostCenter, Afp } from '../../../../services/employee.service';
import { EmployeeContractService, EmployeeContract } from '../../../../services/employee-contract.service';
import { ContractModalComponent } from '../contract-modal/contract-modal.component';
import { AuthService } from '../../../../services/auth.service';
import { AuthErrorOperator } from '../../../../operators/auth-error.operator';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';

declare var $: any;

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ContractModalComponent],
  templateUrl: './employee-form.component.html',
  styleUrls: ['./employee-form.component.scss']
})
export class EmployeeFormComponent implements OnInit, OnChanges, AfterViewInit {
  @Input() employee?: Employee; // Para modo modal
  @Input() isModal: boolean = false; // Indica si está en modal
  @Input() useTabs: boolean = false; // Indica si usar tabs en el formulario
  @Output() employeeSaved = new EventEmitter<Employee>(); // Emite cuando se guarda
  @Output() cancelled = new EventEmitter<void>(); // Emite cuando se cancela

  @ViewChild('contractsTableRef') contractsTableRef?: ElementRef;

  employeeForm!: FormGroup;
  isEditMode = false;
  employeeId: number | null | undefined = null;
  loading = false;
  saving = false;
  
  // Dropdown data
  departments: Department[] = [];
  positions: Position[] = [];
  costCenters: CostCenter[] = [];
  afps: Afp[] = [];
  
  // Contracts data
  contracts: EmployeeContract[] = [];
  loadingContracts = false;
  showContractModal = false;
  contractModalData?: EmployeeContract;
  private contractsDataTable: any;
  /** ID del contrato cuyo menú de acciones está abierto (popup); null si ninguno */
  openActionsContractId: number | null = null;
  
  private destroy$ = new Subject<void>();
  
  // Tab management
  activeTab = 'personal';
  
  // Form options
  genderOptions = [
    { value: '', label: 'Seleccionar género' },
    { value: 'M', label: 'Masculino' },
    { value: 'F', label: 'Femenino' }
  ];
  
  maritalStatusOptions = [
    { value: '', label: 'Seleccionar estado civil' },
    { value: 'soltero', label: 'Soltero(a)' },
    { value: 'casado', label: 'Casado(a)' },
    { value: 'divorciado', label: 'Divorciado(a)' },
    { value: 'viudo', label: 'Viudo(a)' }
  ];
  
  laborRegimeOptions = [
    { value: '728', label: 'Régimen Laboral 728' },
    { value: '276', label: 'Régimen Laboral 276' },
    { value: '1057', label: 'CAS' },
    { value: 'cas', label: 'Contrato CAS' }
  ];
  
  pensionSystemOptions = [
    { value: 'afp', label: 'AFP' },
    { value: 'onp', label: 'ONP' }
  ];
  
  statusOptions = [
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
    { value: 'suspended', label: 'Suspendido' }
  ];
  
  accountTypeOptions = [
    { value: '', label: 'Seleccionar tipo de cuenta' },
    { value: 'ahorros', label: 'Cuenta de Ahorros' },
    { value: 'corriente', label: 'Cuenta Corriente' }
  ];

  constructor(
    private fb: FormBuilder,
    private employeeService: EmployeeService,
    private employeeContractService: EmployeeContractService,
    private authService: AuthService,
    private authErrorOperator: AuthErrorOperator,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadDropdownData();
    if (this.isModal) {
      this.handleModalMode();
      this.checkRestrictions();
    } else {
      this.checkEditMode();
    }
    this.setupFormSubscriptions();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Detectar cuando cambia el input employee
    if (changes['employee'] && changes['employee'].currentValue) {
      console.log('🔄 Employee input changed, updating edit mode');
      this.isEditMode = true;
      this.employeeId = changes['employee'].currentValue.id;
      if (this.employeeForm) {
        this.populateForm(changes['employee'].currentValue);
      }
      // Cargar contratos si está en modo tabs
      if (this.useTabs && this.employeeId) {
        setTimeout(() => this.loadContracts(), 500);
      }
    }
  }

  ngAfterViewInit(): void {
    // DataTable se inicializará después de cargar los contratos
  }

  ngOnDestroy(): void {
    // Destruir DataTable si existe
    if (this.contractsDataTable) {
      this.contractsDataTable.destroy();
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Initialize reactive form
   */
  private initializeForm(): void {
    this.employeeForm = this.fb.group({
      // Personal Information
      dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
      ruc: ['', [Validators.pattern(/^\d{11}$/)]],
      first_name: ['', [Validators.required, Validators.maxLength(100)]],
      last_name: ['', [Validators.required, Validators.maxLength(100)]],
      email: ['', [Validators.email, Validators.maxLength(150)]],
      phone: ['', [Validators.maxLength(15)]],
      address: ['', [Validators.maxLength(255)]],
      birth_date: [''],
      gender: [''],
      marital_status: [''],
      children_count: [0, [Validators.min(0), Validators.max(20)]],
      
      // Employment Information
      employee_code: ['', [Validators.required, Validators.maxLength(20)]],
      hire_date: ['', [Validators.required]],
      department_id: [''],
      position_id: [''],
      cost_center_id: [''],
      labor_regime: ['728', [Validators.required]],
      base_salary: [0, [Validators.required, Validators.min(0)]],
      
      // Pension Information
      pension_system: ['onp', [Validators.required]], // Cambiado a ONP por defecto
      afp_id: [''],
      cuspp: ['', [Validators.pattern(/^\d{12}$/)]],
      
      // Status
      status: ['active', [Validators.required]],
      termination_date: [''],
      termination_reason: [''],
      
      // Banking Information
      bank_name: [''],
      bank_account: ['', [Validators.maxLength(20)]],
      account_type: [''],
      
      // Benefits
      receives_family_allowance: [false],
      is_unionized: [false],
      has_life_insurance: [false]
    });
  }

  /**
   * Log invalid fields for debugging
   */
  private logInvalidFields(): void {
    const invalidFields: string[] = [];
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      if (control && control.invalid) {
        invalidFields.push(`${key}: ${JSON.stringify(control.errors)}`);
      }
    });
    console.log(invalidFields.join('\n  '));
  }

  /**
   * Setup form subscriptions
   */
  private setupFormSubscriptions(): void {
    // Debug: Log form validity on changes (commented out to reduce console noise)
    // this.employeeForm.statusChanges
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe(status => {
    //     if (status === 'INVALID') {
    //       console.log('❌ Formulario INVÁLIDO. Campos con errores:');
    //       this.logInvalidFields();
    //     }
    //   });

    // Watch pension system changes
    this.employeeForm.get('pension_system')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const afpControl = this.employeeForm.get('afp_id');
        const cusppControl = this.employeeForm.get('cuspp');
        
        if (value === 'afp') {
          // No hacer requerido inmediatamente, solo al momento de enviar
          // Esto evita que el formulario se bloquee mientras el usuario llena los datos
          console.log('ℹ️ AFP seleccionada - campos opcionales hasta enviar');
          afpControl?.setValidators([]);
          cusppControl?.setValidators([Validators.pattern(/^\d{12}$/)]);
        } else {
          afpControl?.clearValidators();
          cusppControl?.clearValidators();
          afpControl?.setValue('');
          cusppControl?.setValue('');
        }
        
        afpControl?.updateValueAndValidity();
        cusppControl?.updateValueAndValidity();
      });

    // Watch status changes
    this.employeeForm.get('status')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        const terminationDateControl = this.employeeForm.get('termination_date');
        const terminationReasonControl = this.employeeForm.get('termination_reason');
        
        if (value === 'inactive') {
          terminationDateControl?.setValidators([Validators.required]);
          terminationReasonControl?.setValidators([Validators.required]);
        } else {
          terminationDateControl?.clearValidators();
          terminationReasonControl?.clearValidators();
          terminationDateControl?.setValue('');
          terminationReasonControl?.setValue('');
        }
        
        terminationDateControl?.updateValueAndValidity();
        terminationReasonControl?.updateValueAndValidity();
      });
  }

  /**
   * Check if we're in edit mode
   */
  private checkEditMode(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.employeeId = parseInt(id, 10);
      this.loadEmployee();
    }
  }

  /**
   * Load employee data for editing
   */
  private loadEmployee(): void {
    if (!this.employeeId) return;
    
    this.loading = true;
    
    this.employeeService.getEmployee(this.employeeId).subscribe({
      next: (response) => {
        if (response.success) {
          this.populateForm(response.data);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading employee:', error);
        this.loading = false;
        this.router.navigate(['/planillas/empleados']);
      }
    });
  }

  /**
   * Populate form with employee data
   */
  private populateForm(employee: Employee): void {
    // Helper function to format date for input[type="date"]
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      // Convert ISO string to YYYY-MM-DD format
      return dateString.split('T')[0];
    };

    this.employeeForm.patchValue({
      dni: employee.dni,
      ruc: employee.ruc || '',
      first_name: employee.first_name,
      last_name: employee.last_name,
      email: employee.email || '',
      phone: employee.phone || '',
      address: employee.address || '',
      birth_date: formatDateForInput(employee.birth_date),
      gender: employee.gender || '',
      marital_status: employee.marital_status || '',
      children_count: employee.children_count || 0,
      employee_code: employee.employee_code,
      hire_date: formatDateForInput(employee.hire_date),
      department_id: employee.department_id || null,
      position_id: employee.position_id || null,
      cost_center_id: employee.cost_center_id || null,
      labor_regime: employee.labor_regime,
      base_salary: employee.base_salary,
      pension_system: employee.pension_system,
      afp_id: employee.afp_id || '',
      cuspp: employee.cuspp || '',
      status: employee.status,
      termination_date: formatDateForInput(employee.termination_date),
      termination_reason: employee.termination_reason || '',
      bank_name: employee.bank_name || '',
      bank_account: employee.bank_account || '',
      account_type: employee.account_type || '',
      receives_family_allowance: employee.receives_family_allowance || false,
      is_unionized: employee.is_unionized || false,
      has_life_insurance: employee.has_life_insurance || false
    });
  }

  /**
   * Load dropdown data
   */
  private loadDropdownData(): void {
    // No verificar autenticación aquí - dejar que AuthGuard y AuthErrorOperator manejen esto
    console.log('🔄 Cargando datos de dropdowns en formulario...');

    // Load departments
    this.employeeService.getDepartments()
      .pipe(this.authErrorOperator.handleAuthError(undefined, false))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            // Handle paginated response
            if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
              this.departments = (response.data as any).data;
              if (this.departments.length === 0) {
                console.log('📋 No hay departamentos disponibles');
              }
            } else if (Array.isArray(response.data)) {
              // Handle direct array response
              this.departments = response.data;
              if (this.departments.length === 0) {
                console.log('📋 No hay departamentos disponibles');
              }
            } else {
              this.departments = [];
              console.log('📋 No hay departamentos disponibles');
            }
          }
        },
        error: (error) => console.error('Error loading departments:', error)
      });

    // Load positions
    this.employeeService.getPositions()
      .pipe(this.authErrorOperator.handleAuthError(undefined, false))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            // Handle paginated response
            if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
              this.positions = (response.data as any).data;
              if (this.positions.length === 0) {
                console.log('📋 No hay posiciones disponibles');
              }
            } else if (Array.isArray(response.data)) {
              // Handle direct array response
              this.positions = response.data;
              if (this.positions.length === 0) {
                console.log('📋 No hay posiciones disponibles');
              }
            } else {
              this.positions = [];
              console.log('📋 No hay posiciones disponibles');
            }
          }
        },
        error: (error) => console.error('Error loading positions:', error)
      });

    // Load cost centers
    this.employeeService.getCostCenters()
      .pipe(this.authErrorOperator.handleAuthError(undefined, false))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            // Handle paginated response
            if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
              this.costCenters = (response.data as any).data;
              if (this.costCenters.length === 0) {
                console.log('📋 No hay centros de costo disponibles');
              }
            } else if (Array.isArray(response.data)) {
              // Handle direct array response
              this.costCenters = response.data;
              if (this.costCenters.length === 0) {
                console.log('📋 No hay centros de costo disponibles');
              }
            } else {
              this.costCenters = [];
              console.log('📋 No hay centros de costo disponibles');
            }
          }
        },
        error: (error) => console.error('Error loading cost centers:', error)
      });

    // Load AFPs
    this.employeeService.getAfps()
      .pipe(this.authErrorOperator.handleAuthError(undefined, false))
      .subscribe({
        next: (response: any) => {
          console.log('📥 AFPs response:', response);
          if (response.success) {
            // Handle paginated response
            if (response.data && typeof response.data === 'object' && 'data' in response.data && Array.isArray((response.data as any).data)) {
              this.afps = (response.data as any).data;
              console.log('✅ AFPs cargadas (paginado):', this.afps.length);
            } else if (Array.isArray(response.data)) {
              // Handle direct array response
              this.afps = response.data;
              console.log('✅ AFPs cargadas (array directo):', this.afps.length);
            } else {
              this.afps = [];
              console.warn('⚠️ No se pudo cargar AFPs - estructura desconocida');
            }
            
            if (this.afps.length === 0) {
              console.warn('⚠️ No hay AFPs disponibles en el sistema');
            }
          }
        },
        error: (error) => {
          console.error('❌ Error loading AFPs:', error);
          this.afps = [];
        }
      });
  }

  /**
   * Handle modal mode initialization
   */
  private handleModalMode(): void {
    if (this.employee) {
      this.isEditMode = true;
      this.employeeId = this.employee.id;
      this.populateForm(this.employee);
    }
  }

  /**
   * Submit form
   */
  onSubmit(): void {
    // Validación especial para AFP antes de enviar
    if (this.employeeForm.get('pension_system')?.value === 'afp') {
      const afpId = this.employeeForm.get('afp_id')?.value;
      const cuspp = this.employeeForm.get('cuspp')?.value;
      
      if (!afpId || afpId === '') {
        alert('❌ Error de validación\n\nPor favor seleccione una AFP del sistema de pensiones.');
        this.employeeForm.get('afp_id')?.markAsTouched();
        return;
      }
      
      if (!cuspp || cuspp === '') {
        alert('❌ Error de validación\n\nPor favor ingrese el número de CUSPP (12 dígitos).');
        this.employeeForm.get('cuspp')?.markAsTouched();
        return;
      }
      
      if (cuspp.length !== 12 || !/^\d{12}$/.test(cuspp)) {
        alert('❌ Error de validación\n\nEl CUSPP debe tener exactamente 12 dígitos numéricos.');
        this.employeeForm.get('cuspp')?.markAsTouched();
        return;
      }
    }
    
    if (this.employeeForm.invalid) {
      this.markFormGroupTouched();
      console.error('❌ Formulario inválido, no se puede guardar');
      this.logInvalidFields();
      return;
    }

    this.saving = true;
    const formData = this.employeeForm.value;

    // Log data being sent with detailed field analysis
    console.log('📤 Datos que se enviarán al backend:', formData);
    console.log('📝 Modo:', this.isEditMode ? 'EDITAR' : 'CREAR');
    if (this.isEditMode) {
      console.log('🆔 ID del empleado:', this.employeeId);
    }
    
    // Log campos específicos que reporta el usuario
    console.log('🔍 Campos específicos:');
    console.log('   ▸ Estado civil:', formData.marital_status);
    console.log('   ▸ Nro hijos:', formData.children_count);
    console.log('   ▸ Fecha ingreso:', formData.hire_date);
    console.log('   ▸ Centro costo:', formData.cost_center_id);
    console.log('   ▸ Régimen laboral:', formData.labor_regime);
    console.log('   ▸ Sistema pensión:', formData.pension_system);
    console.log('   ▸ AFP ID:', formData.afp_id);
    console.log('   ▸ CUSPP:', formData.cuspp);
    console.log('   ▸ Banco:', formData.bank_name);
    console.log('   ▸ Cuenta:', formData.bank_account);
    console.log('   ▸ Tipo cuenta:', formData.account_type);

    const request = this.isEditMode
      ? this.employeeService.updateEmployee(this.employeeId!, formData)
      : this.employeeService.createEmployee(formData);

    request.subscribe({
      next: (response) => {
        console.log('✅ Respuesta del servidor:', response);
        if (response.success) {
          console.log('✅ Empleado guardado exitosamente:', response.data);
          
          // Mensaje de confirmación detallado
          const employeeName = `${this.employeeForm.get('first_name')?.value} ${this.employeeForm.get('last_name')?.value}`;
          const employeeCode = this.employeeForm.get('employee_code')?.value;
          const action = this.isEditMode ? 'actualizado' : 'creado';
          
          // Mostrar mensaje de éxito
          alert(`✅ ¡Empleado ${action} correctamente!\n\n` +
                `👤 Nombre: ${employeeName}\n` +
                `🔢 Código: ${employeeCode}\n` +
                `📅 ${this.isEditMode ? 'Actualizado' : 'Creado'} el: ${new Date().toLocaleString()}\n\n` +
                `Los datos se han guardado en el sistema correctamente.`);
          
          if (this.isModal) {
            this.employeeSaved.emit(response.data);
          } else {
            this.router.navigate(['/planillas/empleados']);
          }
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('❌ Error saving employee:', error);
        console.error('❌ Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.error?.message,
          errors: error.error?.errors
        });
        this.saving = false;
      }
    });
  }

  /**
   * Cancel form
   */
  onCancel(): void {
    if (this.isModal) {
      this.cancelled.emit();
    } else {
      this.router.navigate(['/planillas/empleados']);
    }
  }

  /**
   * Mark all form fields as touched
   */
  private markFormGroupTouched(): void {
    Object.keys(this.employeeForm.controls).forEach(key => {
      const control = this.employeeForm.get(key);
      control?.markAsTouched();
    });
  }

  /**
   * Check if field has error
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.employeeForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  /**
   * Get field error message
   */
  getFieldError(fieldName: string): string {
    const field = this.employeeForm.get(fieldName);
    if (!field || !field.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return 'Este campo es requerido';
    if (errors['email']) return 'Ingrese un email válido';
    if (errors['pattern']) {
      switch (fieldName) {
        case 'dni': return 'El DNI debe tener 8 dígitos';
        case 'ruc': return 'El RUC debe tener 11 dígitos';
        case 'cuspp': return 'El CUSPP debe tener 12 dígitos';
        default: return 'Formato inválido';
      }
    }
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
    
    return 'Campo inválido';
  }

  /**
   * Generate employee code
   */
  generateEmployeeCode(): void {
    const departmentId = this.employeeForm.get('department_id')?.value;
    if (departmentId) {
      const department = this.departments.find(d => d.id === parseInt(departmentId));
      const prefix = department?.code || 'EMP';
      const timestamp = Date.now().toString().slice(-6);
      const code = `${prefix}${timestamp}`;
      this.employeeForm.patchValue({ employee_code: code });
    }
  }

  /**
   * Get page title
   */
  getPageTitle(): string {
    return this.isEditMode ? 'Editar Empleado' : 'Nuevo Empleado';
  }

  /**
   * Get submit button text
   */
  getSubmitButtonText(): string {
    if (this.saving) {
      return this.isEditMode ? 'Actualizando...' : 'Guardando...';
    }
    return this.isEditMode ? 'Actualizar Empleado' : 'Guardar Empleado';
  }

  /**
   * Tab management methods
   */
  setActiveTab(tabId: string): void {
    this.activeTab = tabId;
    
    // Load contracts when switching to contracts tab
    if (tabId === 'contracts' && this.isEditMode && this.contracts.length === 0) {
      this.loadContracts();
    }
    
    // Remove active class from all tabs
    const allTabs = document.querySelectorAll('.nav-link');
    const allPanes = document.querySelectorAll('.tab-pane');
    
    allTabs.forEach(tab => tab.classList.remove('active'));
    allPanes.forEach(pane => {
      pane.classList.remove('active', 'show');
    });
    
    // Add active class to selected tab and pane
    const activeTabElement = document.querySelector(`[data-bs-target="#${tabId}"]`);
    const activePaneElement = document.querySelector(`#${tabId}`);
    
    if (activeTabElement) {
      activeTabElement.classList.add('active');
    }
    
    if (activePaneElement) {
      activePaneElement.classList.add('active', 'show');
    }
  }

  isTabActive(tabId: string): boolean {
    return this.activeTab === tabId;
  }

  /**
   * Contracts management methods
   */
  loadContracts(): void {
    if (!this.employeeId) return;
    
    this.loadingContracts = true;
    this.employeeContractService.getContractsByEmployee(this.employeeId)
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.contracts = response.data;
            // Inicializar DataTable después de cargar los datos
            setTimeout(() => this.initializeContractsDataTable(), 100);
          }
          this.loadingContracts = false;
        },
        error: (error) => {
          console.error('Error loading contracts:', error);
          this.loadingContracts = false;
        }
      });
  }

  private initializeContractsDataTable(): void {
    // Destruir instancia previa si existe y está inicializada
    if (this.contractsDataTable) {
      try {
        // Verificar si la tabla todavía existe en el DOM
        if ($.fn.DataTable.isDataTable('#contractsTable')) {
          this.contractsDataTable.destroy();
          console.log('✅ DataTable destruida correctamente');
        }
        this.contractsDataTable = null;
      } catch (error) {
        console.warn('⚠️ Error al destruir DataTable:', error);
        this.contractsDataTable = null;
      }
    }

    // Esperar a que el DOM se actualice
    setTimeout(() => {
      if (typeof $ !== 'undefined' && $.fn.DataTable) {
        try {
          this.contractsDataTable = $('#contractsTable').DataTable({
            autoWidth: true,
            pageLength: 10,
            lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
            order: [[0, 'desc']], // Ordenar por número de contrato descendente
            language: {
              // Textos en español sin cargar archivo externo (evita error CORS)
              search: 'Buscar:',
              lengthMenu: 'Mostrar _MENU_ contratos',
              info: 'Mostrando _START_ a _END_ de _TOTAL_ contratos',
              infoEmpty: 'No hay contratos',
              infoFiltered: '(filtrado de _MAX_ contratos totales)',
              zeroRecords: 'No se encontraron contratos',
              emptyTable: 'No hay contratos disponibles',
              loadingRecords: 'Cargando...',
              processing: 'Procesando...',
              paginate: {
                first: 'Primero',
                previous: 'Anterior',
                next: 'Siguiente',
                last: 'Último'
              }
            },
            responsive: true,
            dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
                 '<"row"<"col-sm-12"tr>>' +
                 '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
            columnDefs: [
              { orderable: false, targets: 8 } // Columna de acciones no ordenable
            ]
          });
          
          console.log('✅ DataTable inicializada correctamente');
        } catch (error) {
          console.error('❌ Error al inicializar DataTable:', error);
        }
      }
    }, 50);
  }

  openContractModal(): void {
    console.log('🚀 ═══════════════════════════════════════');
    console.log('🚀 CLICK EN ABRIR MODAL DE CONTRATO');
    console.log('🚀 ═══════════════════════════════════════');
    console.log('👤 Employee ID:', this.employeeId);
    console.log('👁️ Modal visible antes:', this.showContractModal);
    
    if (!this.employeeId) {
      console.error('❌ No hay employeeId - Modal bloqueado');
      alert('Debe guardar el empleado primero');
      return;
    }
    
    console.log('📄 Abriendo modal para NUEVO contrato - Empleado:', this.employeeId);
    // Primero cerrar el modal si está abierto
    this.showContractModal = false;
    this.contractModalData = undefined;
    console.log('🔄 Modal cerrado - showContractModal:', this.showContractModal);
    
    // Luego abrirlo con un pequeño delay para que Angular detecte el cambio
    setTimeout(() => {
      this.showContractModal = true;
      console.log('✅ Modal abierto - showContractModal:', this.showContractModal);
      console.log('📦 contractModalData:', this.contractModalData);
    }, 50);
  }

  toggleContractActions(contract: EmployeeContract): void {
    this.openActionsContractId = this.openActionsContractId === contract.id ? null : (contract.id ?? null);
  }

  closeContractActions(): void {
    this.openActionsContractId = null;
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.closeContractActions();
  }

  editContract(contract: EmployeeContract): void {
    console.log('✏️ ═══════════════════════════════════════');
    console.log('✏️ 🚨 MÉTODO editContract EJECUTADO 🚨');
    console.log('✏️ CLICK EN EDITAR CONTRATO');
    console.log('✏️ ═══════════════════════════════════════');
    console.log('📋 Datos del contrato recibidos:', contract);
    console.log('🆔 ID del contrato:', contract.id);
    console.log('📝 Número de contrato:', contract.contract_number);
    console.log('👤 Employee ID:', this.employeeId);
    
    if (!contract || !contract.id) {
      console.error('❌ Contrato inválido o sin ID');
      alert('Error: Contrato inválido');
      return;
    }
    
    // PASO 1: Cerrar modal completamente si está abierto
    console.log('🔄 Paso 1: Cerrando modal...');
    this.showContractModal = false;
    this.contractModalData = undefined;
    console.log('✅ Modal cerrado');
    
    // PASO 2: Esperar un ciclo de detección de cambios
    setTimeout(() => {
      console.log('🔄 Paso 2: Asignando datos del contrato...');
      // Crear una copia profunda del contrato para forzar detección de cambios
      this.contractModalData = JSON.parse(JSON.stringify(contract));
      console.log('📦 contractModalData asignado:', this.contractModalData);
      
      // PASO 3: Esperar otro tick para que Angular procese el cambio del contrato
      setTimeout(() => {
        console.log('🔄 Paso 3: Abriendo modal...');
        this.showContractModal = true;
        console.log('✅ Modal abierto - showContractModal:', this.showContractModal);
        console.log('✏️ ═══════════════════════════════════════');
      }, 10);
    }, 100);
  }

  onContractModalClosed(saved: boolean): void {
    console.log('🔒 Cerrando modal de contrato - Guardado:', saved);
    this.showContractModal = false;
    this.contractModalData = undefined;
    
    if (saved) {
      // Destruir DataTable antes de recargar con verificación
      if (this.contractsDataTable) {
        try {
          if ($.fn.DataTable.isDataTable('#contractsTable')) {
            this.contractsDataTable.destroy();
            console.log('✅ DataTable destruida antes de recargar');
          }
        } catch (error) {
          console.warn('⚠️ Error al destruir DataTable antes de recargar:', error);
        }
        this.contractsDataTable = null;
      }
      // Recargar lista de contratos
      this.loadContracts();
    }
  }

  renewContract(contract: EmployeeContract): void {
    if (confirm('¿Está seguro de renovar este contrato?')) {
      // TODO: Implement renew contract
      console.log('Renewing contract:', contract);
      alert('Renovar contrato - Funcionalidad próximamente disponible');
    }
  }

  deleteContract(contract: EmployeeContract): void {
    if (confirm('¿Está seguro de eliminar este contrato?')) {
      if (!contract.id) return;
      
      this.employeeContractService.deleteContract(contract.id)
        .subscribe({
          next: (response) => {
            if (response.success) {
              alert('Contrato eliminado exitosamente');
              this.loadContracts();
            }
          },
          error: (error) => {
            console.error('Error deleting contract:', error);
            alert('Error al eliminar el contrato');
          }
        });
    }
  }

  getContractStatusLabel(status: string): string {
    return this.employeeContractService.getContractStatusLabel(status);
  }

  getContractTypeLabel(type: string): string {
    return this.employeeContractService.getContractTypeLabel(type);
  }

  getContractStatusClass(status: string): string {
    return this.employeeContractService.getStatusBadgeClass(status);
  }

  getDocumentUrl(path: string): string {
    return `${environment.apiUrl}/storage/${path}`;
  }

  generateContractWord(contract: EmployeeContract): void {
    if (!contract.id) return;
    
    if (confirm('¿Desea generar un documento Word con los datos de este contrato?')) {
      this.employeeContractService.generateContractDocument(contract.id).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Documento Word generado exitosamente');
            window.open(response.data.download_url, '_blank');
          }
        },
        error: (error) => {
          console.error('Error generating contract:', error);
          alert('Error al generar el documento Word');
        }
      });
    }
  }

  private checkRestrictions(): void {
    if (!this.employee && !this.isEditMode) {
      const user = this.authService.getCurrentUser();
      if (user && user.empleado) {
        const deptId = user.empleado.departamento?.id;
        if (this.employeeForm.get('department_id')?.value === null && deptId) {
           this.employeeForm.patchValue({ department_id: deptId });
        }
      }
    }
  }
}