import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, ElementRef, QueryList, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { PayrollTemplateService, PayrollTemplate } from '../../../services/payroll-template.service';
import { PayrollConceptService, PayrollConcept } from '../../../services/payroll-concept.service';
import { PayrollTypeService, PayrollType } from '../../../services/payroll-type.service';
import { EmployeeContractService } from '../../../services/employee-contract.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, LoadingSpinnerComponent } from '../../../shared/components';

declare var bootstrap: any;

@Component({
  selector: 'app-cabecera-planilla',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DataTablesModule,
    PageHeaderComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './cabecera-planilla.component.html',
  styleUrls: ['./cabecera-planilla.component.scss'],
  animations: [
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
    trigger('backdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ])
  ]
})
export class CabeceraPlanillaComponent implements OnInit, OnDestroy {
  @ViewChild('templateModal') modalRef!: ElementRef;
  @ViewChild('conceptsModal') conceptsModalRef!: ElementRef;
  @ViewChild('previewModal') previewModalRef!: ElementRef;
  @ViewChildren(DataTableDirective) dtElements!: QueryList<DataTableDirective>;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Cabecera de Planilla' }
  ];

  cv!: CrudViewConfig;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  /** DataTable del modal Seleccionar Conceptos (segunda tabla del componente). */
  dtOptionsConcepts: any = {};
  dtTriggerConcepts: Subject<any> = new Subject<any>();

  private destroy$ = new Subject<void>();
  private modal: any;
  private conceptsModal: any;
  private previewModal: any;

  // Preview de plantilla (Modal Angular puro)
  showPreviewModal: boolean = false;
  previewTemplate: PayrollTemplate | null = null;
  previewConceptsByType: { income: PayrollConcept[]; deduction: PayrollConcept[]; contribution: PayrollConcept[] } = {
    income: [],
    deduction: [],
    contribution: []
  };
  previewMaxRows: number = 1;
  previewRowsArray: number[] = [];
  previewEmployees: any[] = []; // Empleados reales con contratos vigentes
  loadingPreviewEmployees: boolean = false;
  /** Montos editables para conceptos variables en vista previa: key = employeeId_conceptType_conceptId */
  private previewVariableOverrides: Map<string, number> = new Map();

  templates: PayrollTemplate[] = [];
  allConcepts: PayrollConcept[] = [];
  payrollTypes: PayrollType[] = [];
  selectedTemplate: PayrollTemplate | null = null;
  templateForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  // Conceptos seleccionados para la plantilla
  selectedConcepts: number[] = [];
  conceptsByType: Record<string, PayrollConcept[]> = {
    income: [],
    deduction: [],
    contribution: []
  };
  
  // Control de tabs para conceptos
  activeConceptTab: 'income' | 'deduction' | 'contribution' = 'income';
  /** Datos de la única tabla del modal: se actualiza al cambiar de pestaña para mantener el mismo DOM y el limitador. */
  conceptsTableData: { concept: PayrollConcept; type: string; typeLabel: string; regimeLabel: string }[] = [];
  /** Si es false, la tabla se saca del DOM y se vuelve a crear al cambiar de pestaña; así no se cierra el Subject del trigger. */
  conceptsTableVisible = true;

  // Opciones (mantener como fallback)
  tiposPlantilla: { value: string; label: string; }[] = [];

  categoriasPlantilla = [
    { value: 'monthly', label: 'Mensual' },
    { value: 'biweekly', label: 'Quincenal' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'daily', label: 'Diaria' }
  ];

  regimenesLaborales = [
    { value: '728', label: 'Régimen 728 (Privado)' },
    { value: '276', label: 'Régimen 276 (Público)' },
    { value: '1057', label: 'Régimen 1057 (CAS)' },
    { value: 'cas', label: 'Otros CAS' }
  ];

  constructor(
    private templateService: PayrollTemplateService,
    private conceptService: PayrollConceptService,
    private payrollTypeService: PayrollTypeService,
    private contractService: EmployeeContractService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private cdr: ChangeDetectorRef
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.initDataTable();
    this.loadTemplates();
    this.loadConcepts();
    this.loadPayrollTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.complete();
    }
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      lengthMenu: [[10, 15, 20], [10, 15, 20]],
      processing: true,
      responsive: true,
      ordering: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']],
      columnDefs: [{ targets: -1, orderable: false, searchable: false }]
    };
    this.initConceptsDataTable();
  }

  initConceptsDataTable(): void {
    this.dtOptionsConcepts = this.getConceptsDtOptions();
  }

  /** Devuelve opciones nuevas cada vez para que cada pestaña reciba la misma config (incl. limitador). */
  private getConceptsDtOptions(): object {
    return {
      pagingType: 'full_numbers',
      pageLength: 10,
      lengthMenu: [[10, 15, 20], ["10", "15", "20"]],
      processing: true,
      responsive: false,
      ordering: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'asc']],
      columnDefs: [
        { targets: 0, orderable: false, searchable: false, width: '3rem' }
      ]
    };
  }

  /** Re-inicializa la DataTable del modal de conceptos. No se usa destroy() para no cerrar el Subject del trigger. */
  private triggerConceptsDataTable(): void {
    try {
      if (this.dtTriggerConcepts && !this.dtTriggerConcepts.closed) {
        this.dtTriggerConcepts.next(null);
      }
    } catch (_) {}
  }

  initForm(): void {
    this.templateForm = this.fb.group({
      name: ['', Validators.required],
      description: [''],
      type: ['standard', Validators.required],
      category: ['monthly', Validators.required],
      applicable_regimes: [[]],
      applicable_departments: [[]],
      is_default: [false],
      is_active: [true],
      concept_ids: [[]]
    });
  }

  loadTemplates(): void {
    this.loading = true;
    this.templateService.getTemplates({ paginate: false }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.templates = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.templates = [];
        }
        setTimeout(() => {
          if (this.dtTrigger && !this.dtTrigger.closed) {
            this.dtTrigger.next(null);
          }
        }, 0);
      },
      error: () => {
        this.loading = false;
        this.templates = [];
        setTimeout(() => {
          if (this.dtTrigger && !this.dtTrigger.closed) {
            this.dtTrigger.next(null);
          }
        }, 0);
      }
    });
  }

  loadConcepts(): void {
    this.conceptService.getConcepts({ paginate: false }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          this.allConcepts = Array.isArray(data) ? data : (data?.data || []);
          this.groupConceptsByType();
          console.log('✅ Conceptos cargados:', this.allConcepts.length);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando conceptos:', error);
      }
    });
  }

  loadPayrollTypes(): void {
    this.payrollTypeService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          this.payrollTypes = Array.isArray(data) ? data : (data?.data || []);
          
          // Mapear tipos de planilla a formato del dropdown (solo activos)
          this.tiposPlantilla = this.payrollTypes
            .filter(pt => pt.is_active)
            .map(pt => ({
              value: pt.code,
              label: pt.name
            }));
          
          console.log('✅ Tipos de planilla cargados para dropdown:', this.tiposPlantilla.length);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando tipos de planilla:', error);
        // Fallback a valores por defecto si falla
        this.tiposPlantilla = [
          { value: 'standard', label: 'Estándar' },
          { value: 'executive', label: 'Ejecutivo' },
          { value: 'contractor', label: 'Contratista' },
          { value: 'intern', label: 'Practicante' }
        ];
      }
    });
  }

  groupConceptsByType(): void {
    this.conceptsByType = {
      income: this.allConcepts.filter(c => c.type === 'income'),
      deduction: this.allConcepts.filter(c => c.type === 'deduction'),
      contribution: this.allConcepts.filter(c => c.type === 'contribution')
    };
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedTemplate = null;
    this.selectedConcepts = [];
    this.templateForm.reset({ 
      type: 'standard', 
      category: 'monthly',
      is_default: false,
      is_active: true,
      applicable_regimes: [],
      applicable_departments: [],
      concept_ids: []
    });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(template: PayrollTemplate): void {
    this.isEditMode = true;
    this.selectedTemplate = template;
    this.selectedConcepts = template.selected_concepts || [];
    
    this.templateForm.patchValue({
      name: template.name,
      description: template.description,
      type: template.type,
      category: template.category,
      applicable_regimes: template.applicable_regimes || [],
      applicable_departments: template.applicable_departments || [],
      is_default: template.is_default,
      is_active: template.is_active,
      concept_ids: template.selected_concepts || []
    });
    
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openConceptsModal(): void {
    this.activeConceptTab = 'income';
    this.conceptsTableData = this.getConceptsForTableByType('income');
    this.conceptsTableVisible = false;
    this.cdr.detectChanges();
    this.conceptsModal = new bootstrap.Modal(this.conceptsModalRef.nativeElement);
    this.conceptsModal.show();
    setTimeout(() => {
      this.conceptsTableVisible = true;
      this.cdr.detectChanges();
      setTimeout(() => this.triggerConceptsDataTable(), 250);
    }, 50);
  }

  switchConceptTab(tab: 'income' | 'deduction' | 'contribution'): void {
    this.activeConceptTab = tab;
    this.conceptsTableData = this.getConceptsForTableByType(tab);
    this.conceptsTableVisible = false;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.conceptsTableVisible = true;
      this.cdr.detectChanges();
      setTimeout(() => this.triggerConceptsDataTable(), 250);
    }, 50);
  }

  openPreviewModal(template: PayrollTemplate): void {
    console.log('🔄 Abriendo vista previa Angular para:', template.name);
    
    this.previewTemplate = template;
    const selectedConceptIds = template.selected_concepts || [];
    
    // Agrupar conceptos por tipo
    this.previewConceptsByType = {
      income: [],
      deduction: [],
      contribution: []
    };

    selectedConceptIds.forEach((id: number) => {
      const concept = this.allConcepts.find(c => c.id === id);
      if (concept) {
        if (concept.type === 'income') this.previewConceptsByType.income.push(concept);
        else if (concept.type === 'deduction') this.previewConceptsByType.deduction.push(concept);
        else if (concept.type === 'contribution') this.previewConceptsByType.contribution.push(concept);
      }
    });

    // Ordenar conceptos por campo orden/display_order de la tabla conceptos
    this.sortPreviewConceptsByOrder();

    // Calcular y cachear filas
    this.previewMaxRows = Math.max(
      this.previewConceptsByType.income.length,
      this.previewConceptsByType.deduction.length,
      this.previewConceptsByType.contribution.length,
      1
    );
    
    const limitedRows = Math.min(this.previewMaxRows, 50);
    this.previewRowsArray = Array.from({ length: limitedRows }, (_, i) => i);
    
    console.log('✅ Datos preparados:', {
      ingresos: this.previewConceptsByType.income.length,
      descuentos: this.previewConceptsByType.deduction.length,
      aportes: this.previewConceptsByType.contribution.length,
      filas: this.previewRowsArray.length
    });

    // Cargar empleados con contratos vigentes del tipo de plantilla
    this.loadEmployeesForPreview(template.type);

    // Mostrar modal Angular (sin Bootstrap)
    this.showPreviewModal = true;
    console.log('✅ Modal Angular abierto');
  }

  closePreviewModal(): void {
    this.showPreviewModal = false;
    this.previewTemplate = null;
    this.previewEmployees = [];
    this.employeeAmountsCache.clear();
    this.previewVariableOverrides.clear();
    console.log('🚪 Modal Angular cerrado');
  }

  /** Ordena los conceptos de la vista previa por el campo orden (o display_order) de la tabla conceptos. */
  private sortPreviewConceptsByOrder(): void {
    const orderOf = (c: PayrollConcept): number => {
      const o = c.orden ?? c.display_order;
      return typeof o === 'number' && !isNaN(o) ? o : 999;
    };
    this.previewConceptsByType.income.sort((a, b) => orderOf(a) - orderOf(b));
    this.previewConceptsByType.deduction.sort((a, b) => orderOf(a) - orderOf(b));
    this.previewConceptsByType.contribution.sort((a, b) => orderOf(a) - orderOf(b));
  }
  
  /**
   * Pre-calcular todos los montos de un empleado para evitar NG0100
   */
  private precalculateEmployeeAmounts(employee: any): void {
    const employeeId = employee.id;
    const cache: any = {
      conceptAmounts: {},
      totalIncome: 0,
      totalDeductions: 0,
      totalContributions: 0,
      netPay: 0
    };

    const getAmount = (emp: any, conc: any, type: string): number => {
      const key = `${type}_${conc.id}`;
      const overrideKey = `${emp.id}_${type}_${conc.id}`;
      if (conc.category === 'variable' && this.previewVariableOverrides.has(overrideKey)) {
        return this.previewVariableOverrides.get(overrideKey)!;
      }
      return this.calculateAmount(emp, conc);
    };
    
    this.previewConceptsByType.income.forEach(concept => {
      const amt = getAmount(employee, concept, 'income');
      cache.conceptAmounts[`income_${concept.id}`] = amt;
      cache.totalIncome += amt;
    });
    
    this.previewConceptsByType.deduction.forEach(concept => {
      const amt = getAmount(employee, concept, 'deduction');
      cache.conceptAmounts[`deduction_${concept.id}`] = amt;
      cache.totalDeductions += amt;
    });
    
    this.previewConceptsByType.contribution.forEach(concept => {
      const amt = getAmount(employee, concept, 'contribution');
      cache.conceptAmounts[`contribution_${concept.id}`] = amt;
      cache.totalContributions += amt;
    });
    
    cache.netPay = cache.totalIncome - cache.totalDeductions;
    
    this.employeeAmountsCache.set(employeeId, cache);
  }
  
  /**
   * Cálculo real del monto (usado solo en precalculación)
   */
  private calculateAmount(employee: any, concept: any): number {
    let amount = 0;
    
    // REMUNERACIÓN BÁSICA / PRINCIPAL: usa salario del empleado (escala o contrato)
    if (concept.code === 'ING-001' || 
        (concept.type === 'income' && (
          (concept.category === 'variable' && (concept.name?.includes('Remuneración Básica') || concept.name?.includes('Remuneracion Basica'))) ||
          concept.name?.includes('Remuneración Principal') ||
          concept.name?.includes('Remuneracion Principal') ||
          (concept.code && concept.code.toUpperCase().includes('REPR')) ||
          concept.sunat_code === '0101'
        ))) {
      amount = employee.base_salary;
      
    } else if (concept.category === 'fixed') {
      // Fijo: usa el valor por defecto del concepto, o 0 si no tiene
      amount = concept.default_value || 0;
      
    } else if (concept.category === 'calculated') {
      // Calculado: evaluar según el tipo de concepto
      amount = this.calculateConceptFormula(employee, concept);
      
    } else if (concept.category === 'variable') {
      // Variable sin fórmula específica: 0.00 (para ingreso manual)
      // Ejemplo: Descuento por Mandato Judicial, Descuento por Préstamo
      amount = 0;
      
    } else {
      // Sin categoría definida: 0.00 (para ingreso manual)
      amount = 0;
    }
    
    return amount;
  }

  /** Variables disponibles para fórmulas en vista previa (según empleado). Incluye tasas AFP del empleado (DES-002, DES-003, DES-004). */
  private getPreviewFormulaVariables(employee: any): Record<string, number> {
    const principal = Number(employee?.base_salary) || 0;
    const emp = employee?.contract?.employee;
    const childrenCount = emp?.children_count ?? 0;
    const asignacionFamiliar = childrenCount > 0 ? 102.50 : 0;
    const bonifPersonal = principal * 0.05;
    const afp = emp?.afp;
    const toDecimal = (v: any): number | null => {
      if (v == null || v === '') return null;
      const n = Number(v);
      return Number.isNaN(n) ? null : (n > 1 ? n / 100 : n);
    };
    const hasAfpOrOnp = !!afp;
    const tasaObligatorio = hasAfpOrOnp ? (toDecimal(afp?.obligatory_rate) ?? 0) : 0;
    const tasaComision = hasAfpOrOnp ? (toDecimal(afp?.commission_rate) ?? 0) : 0;
    const tasaSeguro = hasAfpOrOnp ? (toDecimal(afp?.insurance_rate) ?? 0) : 0;
    const isOnp = afp?.code && String(afp.code).toUpperCase().includes('ONP');
    const tasaOnp = hasAfpOrOnp && isOnp ? tasaObligatorio : 0;
    return {
      REMUNERACION_PRINCIPAL: principal,
      REMUNERACION_BASICA: principal,
      BONIFICACION_PERSONAL: bonifPersonal,
      BONIFICACION_FAMILIAR: asignacionFamiliar,
      ASIGNACION_FAMILIAR: asignacionFamiliar,
      BONIFICACION_CARGO: 0,
      REMUNERACION_COMPUTABLE: principal + bonifPersonal + asignacionFamiliar,
      MESES_TRABAJADOS: 1,
      HORAS_EXTRAS_25: 0,
      HORAS_EXTRAS_35: 0,
      TASA_AFP_OBLIGATORIO: tasaObligatorio,
      TASA_COMISION_AFP: tasaComision,
      TASA_AFP_SEGURO: tasaSeguro,
      TASA_ONP: tasaOnp,
      TASA_SCTR: 0.01,
      RMV: 1025,
      UIT: 4950
    };
  }

  /** Indica si en vista previa se usan tasas de la tabla AFP del empleado (true) o por defecto (false). */
  previewUsesEmployeeAfp(employee: any): boolean {
    const afp = employee?.contract?.employee?.afp;
    return !!(afp && (afp.obligatory_rate != null || afp.commission_rate != null || afp.insurance_rate != null));
  }

  /** Texto para el indicador de tasas AFP en vista previa: nombre de la AFP/ONP del empleado o "Sin AFP/ONP (cálculo 0)". */
  getEmployeeAfpLabel(employee: any): string {
    const afp = employee?.contract?.employee?.afp;
    return (afp?.name) ? `AFP/ONP del empleado (${afp.name})` : 'Sin AFP/ONP (cálculo 0)';
  }

  /** Evalúa formula del concepto (campo formula de BD) con variables del empleado. */
  private evaluatePreviewFormula(formula: string, employee: any): number | null {
    if (!formula || typeof formula !== 'string') return null;
    const vars = this.getPreviewFormulaVariables(employee);
    const expr = formula.replace(/\[([A-Za-z_][A-Za-z0-9_]*)\]/g, (match, name: string) => {
      const key = name.toUpperCase();
      const val = vars[key] ?? vars[name] ?? 0;
      return String(Number(val));
    });
    if (!/^[\d\s+\-*/().]+$/.test(expr)) return null;
    try {
      const result = Function('"use strict"; return (' + expr + ')')();
      return typeof result === 'number' && !Number.isNaN(result) ? result : null;
    } catch {
      return null;
    }
  }

  /**
   * Calcula el monto de un concepto calculado según su fórmula (usa campo formula de la tabla conceptos si existe).
   */
  private calculateConceptFormula(employee: any, concept: any): number {
    const employeeData = employee.contract?.employee;
    const formula = (concept.formula || '').trim();
    if (formula) {
      const result = this.evaluatePreviewFormula(formula, employee);
      if (result !== null && !Number.isNaN(result)) return result;
    }

    // Asignación Familiar - Solo si tiene hijos
    if (concept.code === 'ING-002' || concept.name?.includes('Asignación Familiar')) {
      const childrenCount = employeeData?.children_count || 0;
      if (childrenCount > 0) {
        // 10% de la RMV (aprox 102.50 según datos)
        return concept.default_value || 102.50;
      }
      return 0; // Sin hijos = 0
    }
    
    // AFP - Fondo de Pensiones (10%)
    if (concept.code === 'DES-002' || concept.name?.includes('AFP') && concept.name?.includes('10%')) {
      return employee.base_salary * 0.10;
    }
    
    // AFP - Comisión Variable (aprox 1.6% - 1.8%)
    if (concept.code === 'DES-003' || concept.name?.includes('Comisión')) {
      return employee.base_salary * 0.017;
    }
    
    // AFP - Seguro (1.74%)
    if (concept.code === 'DES-004' || concept.name?.includes('Seguro')) {
      return employee.base_salary * 0.0174;
    }
    
    // ESSALUD - Aporte Empleador (9%)
    if (concept.code === 'APO-001' || (concept.name?.includes('ESSALUD') && concept.type === 'contribution')) {
      return employee.base_salary * 0.09;
    }
    
    // ONP (13%)
    if (concept.name?.includes('ONP')) {
      return employee.base_salary * 0.13;
    }
    
    // Horas Extras 25%
    if (concept.name?.includes('Horas Extras 25%')) {
      // Por ahora 0, se ingresará manualmente
      return 0;
    }
    
    // Renta de 5ta categoría (variable según rango)
    if (concept.name?.includes('5ta') || concept.name?.includes('Quinta')) {
      // Por ahora 0, se calculará con tablas progresivas
      return 0;
    }
    
    // Por defecto: 0 para ingreso manual
    return 0;
  }

  loadEmployeesForPreview(contractType: string): void {
    console.log('📋 Cargando empleados con contrato tipo:', contractType);
    this.loadingPreviewEmployees = true;
    this.previewEmployees = [];

    // Obtener contratos vigentes del tipo especificado
    this.contractService.getContracts({ 
      contract_type: contractType, 
      status: 'vigente' 
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('✅ Respuesta de contratos:', response);
          
          if (response.success) {
            // Extraer contratos de la respuesta
            let contracts = [];
            if (Array.isArray(response.data)) {
              contracts = response.data;
            } else if (response.data?.contracts) {
              // Respuesta con paginación: {contracts: [...], pagination: {...}}
              contracts = response.data.contracts;
            } else if (response.data?.data) {
              contracts = response.data.data;
            }
            
            console.log('📋 Contratos extraídos:', contracts.length);
            
            // Mapear contratos a empleados para la vista previa
            this.previewEmployees = contracts.map((contract: any) => {
              // Obtener remuneración básica de la escala salarial (prioritario) o del salario del contrato
              const salaryFromScale = contract.salary_scale?.base_salary || contract.salaryScale?.base_salary;
              const salaryFromContract = contract.salary;
              
              // Convertir a número (viene como string desde el backend)
              const baseSalary = parseFloat(salaryFromScale || salaryFromContract || 0);
              
              console.log('💰 Salario empleado:', {
                employee: contract.employee?.first_name,
                salary_scale_raw: salaryFromScale,
                contract_salary_raw: salaryFromContract,
                final_base_salary: baseSalary,
                source: salaryFromScale ? 'ESCALA SALARIAL' : 'CONTRATO'
              });
              
              const employee = {
                id: contract.employee?.id || contract.employee_id,
                full_name: contract.employee ? 
                           `${contract.employee.first_name} ${contract.employee.last_name}`.toUpperCase() : 
                           'EMPLEADO SIN NOMBRE',
                position: contract.position?.name || contract.position || 'SIN CARGO',
                dni: contract.employee?.dni || '00000000',
                base_salary: baseSalary, // ✅ Número parseado
                salary_scale: contract.salary_scale || contract.salaryScale,
                contract: contract
              };
              
              // Pre-calcular montos para evitar ExpressionChangedAfterItHasBeenCheckedError
              this.precalculateEmployeeAmounts(employee);
              
              return employee;
            });
            
            console.log('✅ Empleados cargados para preview:', this.previewEmployees.length);
            
            // Si no hay empleados, mostrar mensaje
            if (this.previewEmployees.length === 0) {
              console.warn('⚠️ No hay empleados con contratos vigentes de tipo:', contractType);
            }
          }
          
          this.loadingPreviewEmployees = false;
        },
        error: (error: any) => {
          console.error('❌ Error loading employees for preview:', error);
          this.loadingPreviewEmployees = false;
          // Usar un empleado ficticio si falla
          this.previewEmployees = [{
            id: 0,
            full_name: 'EMPLEADO DE EJEMPLO',
            position: 'CARGO DE EJEMPLO',
            dni: '00000000',
            base_salary: 3000,
            contract: null
          }];
        }
      });
  }

  getConceptAbbreviation(concept: PayrollConcept): string {
    // Mapeo de abreviaciones para conceptos comunes
    const abbreviations: { [key: string]: string } = {
      // Ingresos
      'Sueldo Básico': 'SUELDO',
      'Asignación Familiar': 'ASIG. FAM.',
      'Gratificación': 'GRAT.',
      'Gratificación Truncada': 'GRAT. TRUNCA',
      'Bonificación': 'BONIF.',
      'Vacaciones': 'VACACIONES',
      'Compensación por Tiempo de Servicios': 'C.T.S.',
      'Movilidad': 'MOVILIDAD',
      'Refrigerio': 'REFRIGERIO',
      
      // Descuentos
      'AFP': 'FONDO',
      'Seguro AFP': 'SEG.',
      'Comisión AFP': 'COMISIÓN',
      'ONP': 'ONP',
      'EsSalud': 'ESSALUD-VIDA',
      'Renta de Quinta Categoría': '5TA CAT',
      'Adelanto': 'adelanto',
      'Canasta': 'CANASTA',
      'Retención Judicial': 'RET. JUD.',
      'Fondo de Pensiones': 'FONDO',
      
      // Aportes
      'EsSalud Empleador': 'ESSALUD',
      'SCTR': 'SCTR=1.23%',
      'Vida Ley': 'VIDA LEY'
    };

    // Buscar abreviación exacta
    if (abbreviations[concept.name]) {
      return abbreviations[concept.name];
    }

    // Si no existe, generar abreviación automática
    const words = concept.name.split(' ');
    if (words.length === 1) {
      return concept.name.substring(0, 8).toUpperCase();
    } else if (words.length === 2) {
      return (words[0].substring(0, 4) + '. ' + words[1].substring(0, 4)).toUpperCase();
    } else {
      return words.map(word => word.substring(0, 2)).join('').substring(0, 8).toUpperCase();
    }
  }

  // Cache para montos generados (para mantener consistencia)
  private generatedAmounts: { [key: string | number]: number } = {};
  
  // Cache para montos pre-calculados de empleados
  private employeeAmountsCache: Map<number, any> = new Map();

  getSampleAmount(concept: any): string {
    // Sumar el monto de este concepto para TODOS los empleados
    let total = 0;
    
    // Determinar el tipo de concepto
    let conceptType = 'income';
    if (this.previewConceptsByType.deduction.includes(concept)) {
      conceptType = 'deduction';
    } else if (this.previewConceptsByType.contribution.includes(concept)) {
      conceptType = 'contribution';
    }
    
    // Sumar valores de todos los empleados para este concepto
    this.previewEmployees.forEach(employee => {
      const cache = this.employeeAmountsCache.get(employee.id);
      if (cache) {
        const key = `${conceptType}_${concept.id}`;
        total += cache.conceptAmounts[key] || 0;
      }
    });
    
    return total.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private generateConsistentAmount(concept: any): number {
    // Generar montos realistas basados en el tipo y nombre del concepto
    const baseAmounts: { [key: string]: number } = {
      // Ingresos
      'Sueldo Básico': 3500.00,
      'Asignación Familiar': 140.00,
      'Gratificación': 875.00,
      'Gratificación Truncada': 437.50,
      'Bonificación': 200.00,
      'Vacaciones': 500.00,
      'Compensación por Tiempo de Servicios': 1166.67,
      'Movilidad': 175.00,
      'Refrigerio': 150.00,
      
      // Descuentos
      'AFP': 350.00,
      'Seguro AFP': 35.00,
      'Comisión AFP': 7.00,
      'ONP': 175.00,
      'EsSalud': 140.00,
      'Renta de Quinta Categoría': 200.00,
      'Adelanto': 100.00,
      'Canasta': 50.00,
      'Retención Judicial': 300.00,
      'Fondo de Pensiones': 350.00,
      
      // Aportes
      'EsSalud Empleador': 280.00,
      'SCTR': 43.05,
      'Vida Ley': 35.00
    };

    // Buscar monto base por nombre
    if (baseAmounts[concept.name]) {
      return baseAmounts[concept.name];
    }

    // Si no existe, generar basado en el tipo
    const typeRanges: { [key: string]: { min: number; max: number } } = {
      income: { min: 100, max: 4000 },
      deduction: { min: 20, max: 500 },
      contribution: { min: 30, max: 300 }
    };

    const range = typeRanges[concept.type] || { min: 0, max: 100 };
    return Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
  }

  getTotalAmount(type: string): string {
    // Calcular total sumando los montos de TODOS los empleados
    let total = 0;
    
    this.previewEmployees.forEach(employee => {
      const cache = this.employeeAmountsCache.get(employee.id);
      if (cache) {
        if (type === 'income') {
          total += cache.totalIncome;
        } else if (type === 'deduction') {
          total += cache.totalDeductions;
        } else if (type === 'contribution') {
          total += cache.totalContributions;
        }
      }
    });

    return total.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  getNetPayAmount(): string {
    // Calcular saldo neto total sumando los netos de TODOS los empleados
    let netPayTotal = 0;
    
    this.previewEmployees.forEach(employee => {
      const cache = this.employeeAmountsCache.get(employee.id);
      if (cache) {
        netPayTotal += cache.netPay;
      }
    });
    
    return netPayTotal.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  toggleConcept(conceptId: number): void {
    const index = this.selectedConcepts.indexOf(conceptId);
    if (index > -1) {
      this.selectedConcepts.splice(index, 1);
    } else {
      this.selectedConcepts.push(conceptId);
    }
    console.log('🔄 Conceptos actualizados:', this.selectedConcepts.length);
  }

  selectAllConcepts(type: string): void {
    const typeIds = this.conceptsByType[type].map(c => c.id!);
    typeIds.forEach(id => {
      if (!this.selectedConcepts.includes(id)) {
        this.selectedConcepts.push(id);
      }
    });
    console.log('✅ Todos los conceptos de tipo', type, 'seleccionados:', this.selectedConcepts.length);
  }

  clearConcepts(type: string): void {
    const typeIds = this.conceptsByType[type].map(c => c.id!);
    this.selectedConcepts = this.selectedConcepts.filter(id => !typeIds.includes(id));
    console.log('🗑️ Conceptos de tipo', type, 'eliminados. Total:', this.selectedConcepts.length);
  }

  saveTemplate(): void {
    if (this.templateForm.invalid) return;

    this.saving = true;
    const formData = this.templateForm.value;
    
    // Agregar conceptos seleccionados directamente al campo selected_concepts
    formData.selected_concepts = this.selectedConcepts;
    
    console.log('💾 Guardando plantilla con', this.selectedConcepts.length, 'conceptos');

    const operation = this.isEditMode && this.selectedTemplate
      ? this.templateService.updateTemplate(this.selectedTemplate.id!, formData)
      : this.templateService.createTemplate(formData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadTemplates();
          this.closeModal();
          alert('✅ Plantilla guardada exitosamente');
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('❌ Error:', error);
        alert('❌ Error al guardar la plantilla');
        this.saving = false;
      }
    });
  }

  activateTemplate(template: PayrollTemplate): void {
    if (confirm(`¿Activar la plantilla "${template.name}"?\n\nEsto desactivará otras versiones de esta plantilla.`)) {
      this.templateService.activateTemplate(template.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTemplates();
            alert('✅ Plantilla activada exitosamente');
          }
        },
        error: (error) => {
          console.error('❌ Error:', error);
          alert('❌ Error al activar la plantilla');
        }
      });
    }
  }

  deleteTemplate(template: PayrollTemplate): void {
    if (confirm(`¿Eliminar la plantilla "${template.name}"?`)) {
      this.templateService.deleteTemplate(template.id!).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTemplates();
            alert('✅ Plantilla eliminada');
          }
        },
        error: (error) => {
          console.error('❌ Error:', error);
          alert('❌ No se puede eliminar esta plantilla');
        }
      });
    }
  }

  duplicateTemplate(template: PayrollTemplate): void {
    const newName = prompt(`Nombre para la nueva plantilla (copia de "${template.name}"):`, `${template.name} - Copia`);
    if (newName) {
      this.templateService.duplicateTemplate(template.id!, { name: newName }).pipe(takeUntil(this.destroy$)).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadTemplates();
            alert('✅ Plantilla duplicada exitosamente');
          }
        },
        error: (error) => {
          console.error('❌ Error:', error);
          alert('❌ Error al duplicar la plantilla');
        }
      });
    }
  }

  closeModal(): void {
    if (this.modal) {
      this.modal.hide();
    }
  }

  closeConceptsModal(): void {
    if (this.conceptsModal) {
      this.conceptsModal.hide();
    }
  }

  getMaxRowsArray(): number[] {
    // Retornar el array YA CACHEADO - NO recalcular
    // Esto evita loops infinitos de detección de cambios
    return this.previewRowsArray;
  }

  getTipoLabel(tipo: string): string {
    const t = this.tiposPlantilla.find(t => t.value === tipo);
    return t ? t.label : tipo;
  }

  getCategoriaLabel(cat: string): string {
    const c = this.categoriasPlantilla.find(c => c.value === cat);
    return c ? c.label : cat;
  }

  getSelectedConceptsCount(): number {
    return this.selectedConcepts.length;
  }

  isConceptSelected(conceptId: number): boolean {
    return this.selectedConcepts.includes(conceptId);
  }

  getConceptCountByType(type: string): number {
    return this.conceptsByType[type]?.filter(c => this.isConceptSelected(c.id!)).length || 0;
  }

  /** Lista de conceptos para el modal, ordenada por régimen (público, privado, ambos) y tipo (Haberes, Descuentos, Aportes). */
  getConceptsForTable(): { concept: PayrollConcept; type: string; typeLabel: string; regimeLabel: string }[] {
    const typeOrder: Record<string, number> = { income: 0, deduction: 1, contribution: 2 };
    const regimeOrder: Record<string, number> = { public: 0, private: 1, both: 2 };
    const typeLabels: Record<string, string> = {
      income: 'Haberes',
      deduction: 'Descuentos',
      contribution: 'Aportes'
    };
    const regimeLabels: Record<string, string> = {
      public: 'Público',
      private: 'Privado',
      both: 'Ambos'
    };
    const items: { concept: PayrollConcept; type: string; typeLabel: string; regimeLabel: string }[] = [];
    (['income', 'deduction', 'contribution'] as const).forEach(type => {
      (this.conceptsByType[type] || []).forEach(concept => {
        const regime = (concept.regime_type || 'both').toLowerCase();
        items.push({
          concept,
          type,
          typeLabel: typeLabels[type],
          regimeLabel: regimeLabels[regime] || 'Ambos'
        });
      });
    });
    items.sort((a, b) => {
      const regimeA = regimeOrder[(a.concept.regime_type || 'both') as string] ?? 2;
      const regimeB = regimeOrder[(b.concept.regime_type || 'both') as string] ?? 2;
      if (regimeA !== regimeB) return regimeA - regimeB;
      return typeOrder[a.type] - typeOrder[b.type];
    });
    return items;
  }

  /** Lista de conceptos de un solo tipo para la tabla del modal, ordenada por régimen (público, privado, ambos). */
  getConceptsForTableByType(conceptType: 'income' | 'deduction' | 'contribution'): { concept: PayrollConcept; type: string; typeLabel: string; regimeLabel: string }[] {
    return this.getConceptsForTable().filter(item => item.type === conceptType);
  }

  getConceptsCount(template: PayrollTemplate): number {
    if (Array.isArray(template.selected_concepts)) {
      return template.selected_concepts.length;
    }
    return 0;
  }

  getConceptsByType(template: PayrollTemplate): { income: number; deduction: number; contribution: number } {
    const selectedConceptIds = template.selected_concepts || [];
    const result = { income: 0, deduction: 0, contribution: 0 };
    
    selectedConceptIds.forEach((id: number) => {
      const concept = this.allConcepts.find(c => c.id === id);
      if (concept) {
        if (concept.type === 'income') result.income++;
        else if (concept.type === 'deduction') result.deduction++;
        else if (concept.type === 'contribution') result.contribution++;
      }
    });
    
    return result;
  }

  viewTemplateDetails(template: PayrollTemplate): void {
    this.selectedTemplate = template;
    
    const selectedConceptIds = template.selected_concepts || [];
    const conceptsByType = this.getConceptsByType(template);
    
    // Obtener nombres de conceptos seleccionados
    let conceptsList = '  Ninguno seleccionado';
    if (selectedConceptIds.length > 0) {
      const conceptNames = selectedConceptIds
        .map((id: number) => {
          const concept = this.allConcepts.find(c => c.id === id);
          return concept ? `    - [${concept.code}] ${concept.name} (${concept.type})` : `    - ID: ${id}`;
        })
        .join('\n');
      conceptsList = `\n${conceptNames}`;
    }
    
    // Abrir modal con detalles usando alert (temporal)
    const details = `
═══════════════════════════════════════════════════════
    DETALLES DE LA PLANTILLA
═══════════════════════════════════════════════════════

📋 INFORMACIÓN GENERAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Nombre: ${template.name}
  Descripción: ${template.description || 'Sin descripción'}
  Tipo: ${this.getTipoLabel(template.type)}
  Categoría: ${this.getCategoriaLabel(template.category)}
  Estado: ${template.is_active ? '✅ Activa' : '❌ Inactiva'}
  ${template.is_default ? '⭐ PLANTILLA POR DEFECTO' : ''}

💼 CONCEPTOS SELECCIONADOS (${selectedConceptIds.length} total):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📈 Ingresos: ${conceptsByType.income}
  📉 Descuentos: ${conceptsByType.deduction}
  🏦 Aportes: ${conceptsByType.contribution}

  Lista de conceptos:
${conceptsList}

📄 CONFIGURACIÓN DE CABECERA (header_config):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(template.header_config, null, 2)}

💰 CONFIGURACIÓN DE CONCEPTOS (concept_config):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(template.concept_config, null, 2)}

📝 CONFIGURACIÓN DE PIE (footer_config):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(template.footer_config, null, 2)}

🎨 CONFIGURACIÓN DE VISUALIZACIÓN (display_config):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${JSON.stringify(template.display_config, null, 2)}

🏛️ RÉGIMEN(ES) APLICABLE(S):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${template.applicable_regimes ? template.applicable_regimes.join(', ') : 'Todos los regímenes'}

📆 INFORMACIÓN ADICIONAL:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Creado por: Usuario ${template.created_by}
  Versión: ${template.version}
  Creado: ${template.created_at}
  Actualizado: ${template.updated_at}

═══════════════════════════════════════════════════════
    `;
    
    alert(details);
  }

  // ═══════════════════════════════════════════════════════
  // MÉTODOS DE CÁLCULO PARA EMPLEADOS REALES
  // ═══════════════════════════════════════════════════════

  /** Indica si el concepto es variable (editable en vista previa). */
  isVariableConcept(concept: PayrollConcept): boolean {
    return concept?.category === 'variable';
  }

  /** Valor numérico actual del concepto para el input (solo conceptos variables). */
  getVariableConceptRawValue(employee: any, concept: PayrollConcept, conceptType: string): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    const key = `${conceptType}_${concept.id}`;
    const v = cache.conceptAmounts[key] ?? 0;
    return (typeof v === 'number' ? v : 0).toFixed(2);
  }

  /** Actualiza el monto manual de un concepto variable en la vista previa y recalcula totales. */
  setVariableConceptAmount(employee: any, concept: PayrollConcept, conceptType: string, value: string | number): void {
    const num = typeof value === 'string' ? parseFloat(value.replace(',', '.')) : value;
    const amount = isNaN(num) ? 0 : num;
    const overrideKey = `${employee.id}_${conceptType}_${concept.id}`;
    this.previewVariableOverrides.set(overrideKey, amount);
    this.precalculateEmployeeAmounts(employee);
  }

  calculateConceptAmount(employee: any, concept: any): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    
    // Determinar el tipo de concepto basado en qué lista está
    let conceptType = 'income';
    if (this.previewConceptsByType.deduction.includes(concept)) {
      conceptType = 'deduction';
    } else if (this.previewConceptsByType.contribution.includes(concept)) {
      conceptType = 'contribution';
    }
    
    const key = `${conceptType}_${concept.id}`;
    const amount = cache.conceptAmounts[key] || 0;
    
    return amount.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  calculateEmployeeTotalIncome(employee: any): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    
    return cache.totalIncome.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  calculateEmployeeTotalDeductions(employee: any): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    
    return cache.totalDeductions.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  calculateEmployeeTotalContributions(employee: any): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    
    return cache.totalContributions.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  calculateEmployeeNetPay(employee: any): string {
    const cache = this.employeeAmountsCache.get(employee.id);
    if (!cache) return '0.00';
    
    return cache.netPay.toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }
}
