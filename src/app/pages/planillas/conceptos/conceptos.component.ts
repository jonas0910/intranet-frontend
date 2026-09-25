import { Component, OnInit, OnDestroy, ViewChild, ViewChildren, ElementRef, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PayrollConceptService, PayrollConcept } from '../../../services/payroll-concept.service';
import { ExpenseItemService, ExpenseItem } from '../../../services/expense-item.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { AuditService } from '../../../services/audit.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-conceptos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './conceptos.component.html',
  styleUrls: ['./conceptos.component.scss']
})
export class ConceptosComponent implements OnInit, OnDestroy {
  @ViewChild('conceptoModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  @ViewChild('formulaTextarea') formulaTextareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChildren(DataTableDirective) dtElements!: QueryList<DataTableDirective>;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  conceptos: PayrollConcept[] = [];
  selectedConcepto: PayrollConcept | null = null;
  conceptoForm!: FormGroup;
  isEditMode = false;
  saving = false;

  activeTab: 'income' | 'deduction' | 'contribution' = 'income';

  dtOptionsIncome: any = {};
  dtOptionsDeduction: any = {};
  dtOptionsContribution: any = {};
  
  dtTriggerIncome: Subject<any> = new Subject<any>();
  dtTriggerDeduction: Subject<any> = new Subject<any>();
  dtTriggerContribution: Subject<any> = new Subject<any>();

  private destroy$ = new Subject<void>();
  private modal: any;
  private viewModal: any;

  tiposConcepto = [
    { value: 'income', label: 'Haber' },
    { value: 'deduction', label: 'Descuento' },
    { value: 'contribution', label: 'Aporte' }
  ];

  categoriasConcepto = [
    { value: 'fixed', label: 'Fijo' },
    { value: 'variable', label: 'Variable' },
    { value: 'calculated', label: 'Calculado' }
  ];

  partidasGasto: ExpenseItem[] = [];

  /** Muestra/oculta el panel de inserción de variables de fórmula */
  showVariablePicker = false;

  /** Leyenda de variables para fórmulas de cálculo (origen: conceptos y parámetros del sistema). */
  formulaVariablesLegend: { name: string; description: string }[] = [
    { name: 'REMUNERACION_PRINCIPAL', description: 'Remuneración principal del empleado (escala/contrato)' },
    { name: 'REMUNERACION_BASICA', description: 'Remuneración básica (concepto ING-001)' },
    { name: 'BONIFICACION_PERSONAL', description: 'Bonificación personal (concepto ING-102)' },
    { name: 'BONIFICACION_FAMILIAR', description: 'Bonificación familiar (concepto ING-103)' },
    { name: 'BONIFICACION_CARGO', description: 'Bonificación por cargo (concepto ING-107)' },
    { name: 'ASIGNACION_FAMILIAR', description: 'Asignación familiar (concepto ING-002)' },
    { name: 'REMUNERACION_COMPUTABLE', description: 'Suma de ingresos afectos (para AFP, ONP, ESSALUD)' },
    { name: 'GRATIFICACION_JULIO', description: 'Gratificación julio (concepto ING-005)' },
    { name: 'GRATIFICACION_NAVIDAD', description: 'Gratificación navidad (concepto ING-006)' },
    { name: 'AGUINALDO_JULIO', description: 'Aguinaldo Fiestas Patrias (concepto ING-104)' },
    { name: 'AGUINALDO_NAVIDAD', description: 'Aguinaldo Navidad (concepto ING-105)' },
    { name: 'HORAS_EXTRAS_25', description: 'Horas extras 25% (concepto ING-003)' },
    { name: 'HORAS_EXTRAS_35', description: 'Horas extras 35% (concepto ING-004)' },
    { name: 'OTR-001', description: 'Monto del descuento asignado al empleado con código OTR-001 (descuento judicial)' },
    { name: 'DESCUENTO_JUDICIAL_ASIGNADO', description: 'Suma de todos los descuentos judiciales asignados al empleado (pensión, embargos, etc.)' },
    { name: 'BCO-001', description: 'Monto del descuento asignado al empleado con código BCO-001 (préstamo)' },
    { name: 'BCO-002', description: 'Monto del descuento asignado al empleado con código BCO-002 (préstamo)' },
    { name: 'MESES_TRABAJADOS', description: 'Meses trabajados en el período' },
    { name: 'TASA_COMISION_AFP', description: 'Tasa comisión AFP (por defecto 0.0155)' },
    { name: 'TASA_SCTR', description: 'Tasa SCTR (por defecto 0.01)' },
    { name: 'RMV', description: 'Remuneración Mínima Vital vigente' },
    { name: 'UIT', description: 'Unidad Impositiva Tributaria vigente' }
  ];

  constructor(
    private payrollConceptService: PayrollConceptService,
    private expenseItemService: ExpenseItemService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private auditService: AuditService,
    private modalService: NgbModal
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    // Cargar partidas de gasto para selects
    this.expenseItemService.getAll().subscribe({
      next: (resp) => {
        const data: any = resp?.data;
        this.partidasGasto = Array.isArray(data) ? data : (data?.data || []);
      },
      error: (e) => console.error('Error cargando partidas de gasto:', e)
    });
    this.loadConceptos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dtTriggerIncome.unsubscribe();
    this.dtTriggerDeduction.unsubscribe();
    this.dtTriggerContribution.unsubscribe();
  }

  initForm(): void {
    this.conceptoForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      type: ['income', Validators.required],
      category: ['fixed', Validators.required],
      formula: [''],
      display_order: [0],
      calculation_priority: [0],
      default_value: [0],
      sunat_code: [''],
      sunat_description: [''],
      expense_item_idf: [null],
      expense_item_idi: [null],
      is_active: [true]
    });
  }

  initDataTable(): void {
    const baseOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
      language: {
        url: 'assets/datatables/i18n/es-ES.json'
      },
      order: [[0, 'asc']],
      columnDefs: [
        { targets: -1, orderable: false, searchable: false }
      ]
    };
    
    this.dtOptionsIncome = { ...baseOptions };
    this.dtOptionsDeduction = { ...baseOptions };
    this.dtOptionsContribution = { ...baseOptions };
  }

  get conceptosIngresos(): PayrollConcept[] {
    return this.conceptos.filter(c => c.type === 'income');
  }

  get conceptosDescuentos(): PayrollConcept[] {
    return this.conceptos.filter(c => c.type === 'deduction');
  }

  get conceptosAportes(): PayrollConcept[] {
    return this.conceptos.filter(c => c.type === 'contribution');
  }

  switchTab(tab: 'income' | 'deduction' | 'contribution'): void {
    this.activeTab = tab;
  }

  loadConceptos(): void {
    this.payrollConceptService.getConcepts({ paginate: false }).subscribe({
      next: (response) => {
        if (response.success) {
          this.conceptos = Array.isArray(response.data) ? response.data : response.data.data;
          // Stable sort by display_order then name to avoid visual jumps
          this.conceptos.sort((a, b) => {
            const od = (a.display_order ?? 0) - (b.display_order ?? 0);
            return od !== 0 ? od : (a.name || '').localeCompare(b.name || '');
          });
          
          // Trigger datatables for each tab
          setTimeout(() => {
            if (!this.dtTriggerIncome.closed) this.dtTriggerIncome.next(null);
            if (!this.dtTriggerDeduction.closed) this.dtTriggerDeduction.next(null);
            if (!this.dtTriggerContribution.closed) this.dtTriggerContribution.next(null);
          }, 100);
        }
      },
      error: (error) => {
        console.error('Error cargando conceptos:', error);
      }
    });
  }

  reloadTable(): void {
    this.payrollConceptService.getConcepts({ paginate: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success) {
          this.conceptos = Array.isArray(response.data) ? response.data : response.data.data;
          // Keep order consistent
          this.conceptos.sort((a, b) => {
            const od = (a.display_order ?? 0) - (b.display_order ?? 0);
            return od !== 0 ? od : (a.name || '').localeCompare(b.name || '');
          });
          // Safely destroy and re-init all DataTables to prevent duplicate init and broken events
          this.rerenderTables();
        }
      }
    });
  }

  private rerenderTables(): void {
    if (!this.dtElements || this.dtElements.length === 0) {
      // Fallback: trigger if directives are not yet available
      setTimeout(() => {
        if (!this.dtTriggerIncome.closed) this.dtTriggerIncome.next(null);
        if (!this.dtTriggerDeduction.closed) this.dtTriggerDeduction.next(null);
        if (!this.dtTriggerContribution.closed) this.dtTriggerContribution.next(null);
      }, 0);
      return;
    }
    const destroyPromises: Promise<void>[] = [];
    this.dtElements.forEach((dt) => {
      destroyPromises.push(dt.dtInstance.then((inst) => {
        inst.destroy();
      }));
    });
    Promise.all(destroyPromises).then(() => {
      setTimeout(() => {
        if (!this.dtTriggerIncome.closed) this.dtTriggerIncome.next(null);
        if (!this.dtTriggerDeduction.closed) this.dtTriggerDeduction.next(null);
        if (!this.dtTriggerContribution.closed) this.dtTriggerContribution.next(null);
      }, 0);
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedConcepto = null;
    this.showVariablePicker = false;
    this.conceptoForm.get('code')?.enable({ emitEvent: false });
    this.conceptoForm.reset({ 
      type: 'income', 
      category: 'fixed',
      display_order: 0,
      calculation_priority: 0,
      default_value: 0,
      is_active: true 
    });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(concepto: PayrollConcept): void {
    this.isEditMode = true;
    this.selectedConcepto = concepto;
    this.showVariablePicker = false;
    this.conceptoForm.patchValue(concepto);
    // En edición, no se permite modificar el código; deshabilitar para no enviarlo en el payload
    this.conceptoForm.get('code')?.disable({ emitEvent: false });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(concepto: PayrollConcept): void {
    this.selectedConcepto = concepto;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  saveConcepto(): void {
    if (this.conceptoForm.invalid) return;

    this.saving = true;
    const conceptoData: any = this.conceptoForm.getRawValue();
    // Asegurar que en edición no enviamos 'code'
    if (this.isEditMode) {
      delete conceptoData.code;
    }

    const operation = this.isEditMode && this.selectedConcepto
      ? this.payrollConceptService.updateConcept(this.selectedConcepto.id!, conceptoData)
      : this.payrollConceptService.createConcept(conceptoData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
          // Registrar auditoría para guardar concepto
          const action = this.isEditMode ? 'Actualización de Concepto' : 'Creación de Concepto';
          const description = this.isEditMode 
            ? `Concepto ${conceptoData.name} actualizado exitosamente`
            : `Concepto ${conceptoData.name} creado exitosamente`;
          this.auditService.logAction(
            action,
            'Gestión de Conceptos de Planilla',
            description,
            'success'
          );
        }
      },
      error: (error) => {
        console.error('Error guardando concepto:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(concepto: PayrollConcept): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${concepto.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.payrollConceptService.deleteConcept(concepto.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (response) => { 
            if (response.success) {
              this.reloadTable();
              // Registrar auditoría para eliminación de concepto
              this.auditService.logAction(
                'Eliminación de Concepto',
                'Gestión de Conceptos de Planilla',
                `Concepto ${concepto.name} eliminado exitosamente`,
                'success'
              );
            }
          },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposConcepto.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  getCategoriaLabel(categoria: string): string {
    const catObj = this.categoriasConcepto.find(c => c.value === categoria);
    return catObj ? catObj.label : categoria;
  }

  getTipoBadgeClass(tipo: string): string {
    switch (tipo) {
      case 'income': return 'bg-success';
      case 'deduction': return 'bg-danger';
      case 'contribution': return 'bg-info';
      default: return 'bg-secondary';
    }
  }

  closeModal(): void {
    if (this.modal) {
      this.modal.hide();
    }
  }

  closeViewModal(): void {
    if (this.viewModal) {
      this.viewModal.hide();
    }
  }

  /** Inserta una variable de fórmula con corchetes en la posición del cursor del textarea (o al final si no hay ref). */
  insertFormulaVariable(variableName: string): void {
    this.showVariablePicker = false;
    const token = '[' + variableName + ']';
    const control = this.conceptoForm.get('formula');
    const current = (control?.value ?? '') as string;
    let start: number;
    let end: number;
    const el = this.formulaTextareaRef?.nativeElement;
    if (el && typeof el.selectionStart === 'number') {
      start = el.selectionStart;
      end = el.selectionEnd ?? start;
    } else {
      start = end = current.length;
    }
    const newValue = current.slice(0, start) + token + current.slice(end);
    control?.setValue(newValue);
    if (el) {
      setTimeout(() => {
        el.focus();
        const newPos = start + token.length;
        el.setSelectionRange(newPos, newPos);
      }, 0);
    }
  }
}
