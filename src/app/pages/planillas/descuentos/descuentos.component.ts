import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DeductionService, Deduction } from '../../../services/deduction.service';
import { EmployeeService, Employee } from '../../../services/employee.service';
import { EmployeeDeductionService } from '../../../services/employee-deduction.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { AuditService } from '../../../services/audit.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

export interface EmployeeDeduction {
  id?: number;
  employee_id: number;
  deduction_id: number;
  amount: number;
  total_amount: number;
  monthly_amount: number;
  installments: number;
  remaining_installments: number;
  start_date: string;
  end_date?: string;
  status: 'active' | 'completed' | 'suspended';
  notes?: string;
  employee?: Employee;
  deduction?: Deduction;
}

@Component({
  selector: 'app-descuentos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    DataTablesModule,
    PageHeaderComponent,
    CrudActionsComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './descuentos.component.html',
  styleUrls: ['./descuentos.component.scss']
})
export class DescuentosComponent implements OnInit, OnDestroy {
  @ViewChild('descuentoModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  @ViewChild('assignModal') assignModalRef!: ElementRef;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Descuentos' }
  ];

  descuentos: Deduction[] = [];
  selectedDescuento: Deduction | null = null;
  descuentoForm!: FormGroup;
  assignForm!: FormGroup;
  isEditMode = false;
  isEditAssignmentMode = false;
  editingAssignment: EmployeeDeduction | null = null;
  saving = false;
  loading = false;

  // Tabs
  activeTab: 'proveedores' | 'bancos' | 'otros' = 'proveedores';

  // DataTables - uno por cada tab
  dtOptionsProveedores: any = {};
  dtOptionsBancos: any = {};
  dtOptionsOtros: any = {};
  
  dtTriggerProveedores: Subject<any> = new Subject<any>();
  dtTriggerBancos: Subject<any> = new Subject<any>();
  dtTriggerOtros: Subject<any> = new Subject<any>();

  private destroy$ = new Subject<void>();

  private modal: any;
  private viewModal: any;
  private assignModal: any;

  // Employee deductions (asignaciones)
  employees: Employee[] = [];
  employeeDeductions: EmployeeDeduction[] = [];
  loadingAssignments = false;
  selectedEmployee: Employee | null = null;

  categoriaDescuento = [
    { value: 'proveedores', label: 'Proveedores', icon: 'fas fa-truck', color: 'primary' },
    { value: 'bancos', label: 'Entidades Bancarias', icon: 'fas fa-university', color: 'success' },
    { value: 'otros', label: 'Otros Descuentos', icon: 'fas fa-list', color: 'info' }
  ];

  tiposDescuento = [
    { value: 'fijo', label: 'Monto Fijo' },
    { value: 'porcentaje', label: 'Porcentaje' },
    { value: 'judicial', label: 'Judicial' },
    { value: 'otros', label: 'Otros' }
  ];

  constructor(
    private deductionService: DeductionService,
    private employeeService: EmployeeService,
    private employeeDeductionService: EmployeeDeductionService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private modalService: NgbModal,
    private auditService: AuditService
  ) {
    this.initForm();
    this.initAssignForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTables();
    this.loadDescuentos();
    this.loadEmployees();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dtTriggerProveedores && !this.dtTriggerProveedores.closed) this.dtTriggerProveedores.unsubscribe();
    if (this.dtTriggerBancos && !this.dtTriggerBancos.closed) this.dtTriggerBancos.unsubscribe();
    if (this.dtTriggerOtros && !this.dtTriggerOtros.closed) this.dtTriggerOtros.unsubscribe();
  }

  initForm(): void {
    this.descuentoForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      category: ['proveedores', Validators.required],
      type: ['fijo', Validators.required],
      percentage: [0, [Validators.min(0), Validators.max(100)]],
      is_active: [true]
    });
  }

  initAssignForm(): void {
    this.assignForm = this.fb.group({
      employee_id: ['', Validators.required],
      deduction_id: ['', Validators.required],
      total_amount: [0, [Validators.required, Validators.min(0.01)]],
      installments: [1, [Validators.required, Validators.min(1)]],
      remaining_installments: [1, [Validators.min(0)]],
      start_date: ['', Validators.required],
      status: ['active'],
      notes: ['']
    });
  }

  initDataTables(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    const commonOptions = {
      pagingType: 'full_numbers',
      pageLength,
      processing: true,
      responsive: true,
      language: {
        url: 'assets/datatables/i18n/es-ES.json'
      },
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      order: [[1, 'asc']],
      columnDefs: [
        { targets: -1, orderable: false, searchable: false }
      ]
    };

    this.dtOptionsProveedores = { ...commonOptions };
    this.dtOptionsBancos = { ...commonOptions };
    this.dtOptionsOtros = { ...commonOptions };
  }

  loadDescuentos(): void {
    this.loading = true;
    this.deductionService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.descuentos = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.descuentos = [];
        }
        setTimeout(() => {
          if (!this.dtTriggerProveedores.closed) this.dtTriggerProveedores.next(null);
          if (!this.dtTriggerBancos.closed) this.dtTriggerBancos.next(null);
          if (!this.dtTriggerOtros.closed) this.dtTriggerOtros.next(null);
        }, 0);
      },
      error: () => {
        this.loading = false;
        this.descuentos = [];
        setTimeout(() => {
          if (!this.dtTriggerProveedores.closed) this.dtTriggerProveedores.next(null);
          if (!this.dtTriggerBancos.closed) this.dtTriggerBancos.next(null);
          if (!this.dtTriggerOtros.closed) this.dtTriggerOtros.next(null);
        }, 0);
      }
    });
  }

  loadEmployees(): void {
    this.employeeService.getEmployees({ status: 'active', per_page: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.employees = response.data.employees || [];
        }
      },
      error: (error) => console.error('❌ Error cargando empleados:', error)
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.deductionService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.descuentos = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.descuentos = [];
        }
        setTimeout(() => {
          if (!this.dtTriggerProveedores.closed) this.dtTriggerProveedores.next(null);
          if (!this.dtTriggerBancos.closed) this.dtTriggerBancos.next(null);
          if (!this.dtTriggerOtros.closed) this.dtTriggerOtros.next(null);
        }, 0);
      },
      error: () => {
        this.loading = false;
        this.descuentos = [];
        setTimeout(() => {
          if (!this.dtTriggerProveedores.closed) this.dtTriggerProveedores.next(null);
          if (!this.dtTriggerBancos.closed) this.dtTriggerBancos.next(null);
          if (!this.dtTriggerOtros.closed) this.dtTriggerOtros.next(null);
        }, 0);
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedDescuento = null;
    this.descuentoForm.reset({ 
      code: '',
      name: '',
      description: '',
      category: this.activeTab, // Usar el tab activo como categoría por defecto
      type: 'fijo', 
      percentage: 0, 
      is_active: true 
    });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(descuento: Deduction): void {
    this.isEditMode = true;
    this.selectedDescuento = descuento;
    this.descuentoForm.patchValue(descuento);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(descuento: Deduction): void {
    this.selectedDescuento = descuento;
    this.loadingAssignments = true;
    // Cargar empleados asignados a este descuento
    this.employeeDeductions = [];
    try {
      this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    } catch (e) {
      // fallback si bootstrap no está en window
      console.error('Bootstrap Modal no disponible', e);
    }
    this.employeeDeductionService.list({ deduction_id: descuento.id! })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res: any) => {
        this.employeeDeductions = res?.data || [];
        this.loadingAssignments = false;
        if (this.viewModal) this.viewModal.show();
      },
      error: () => {
        // Fallback a listar todo y filtrar en cliente
        this.employeeDeductionService.getAll()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (all: any) => {
            const data: any = all?.data;
            const arr = Array.isArray(data) ? data : (data?.data || []);
            const selectedId = Number(this.selectedDescuento?.id);
            this.employeeDeductions = (arr || []).filter((ed: any) => Number(ed.deduction_id) === selectedId);
            this.loadingAssignments = false;
            if (this.viewModal) this.viewModal.show();
          },
          error: () => {
            this.employeeDeductions = [];
            this.loadingAssignments = false;
            if (this.viewModal) this.viewModal.show();
          }
        });
      }
    });
  }

  saveDescuento(): void {
    if (this.descuentoForm.invalid) return;

    this.saving = true;
    const descuentoData = this.descuentoForm.value;

    const operation = this.isEditMode && this.selectedDescuento
      ? this.deductionService.update(this.selectedDescuento.id!, descuentoData)
      : this.deductionService.create(descuentoData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
          // Registrar auditoría para guardar descuento
          const action = this.isEditMode ? 'Actualización de Descuento' : 'Creación de Descuento';
          const description = this.isEditMode 
            ? `Descuento ${descuentoData.name} actualizado exitosamente`
            : `Descuento ${descuentoData.name} creado exitosamente`;
          this.auditService.logAction(
            action,
            'Gestión de Descuentos',
            description,
            'success'
          );
        }
      },
      error: (error) => {
        console.error('Error guardando descuento:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(descuento: Deduction): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${descuento.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.deductionService.delete(descuento.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (response) => { 
            if (response.success) {
              this.reloadTable();
              // Registrar auditoría para eliminación de descuento
              this.auditService.logAction(
                'Eliminación de Descuento',
                'Gestión de Descuentos',
                `Descuento ${descuento.name} eliminado exitosamente`,
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

  setActiveTab(tab: string): void {
    this.activeTab = tab as 'proveedores' | 'bancos' | 'otros';
    setTimeout(() => {
      if (tab === 'proveedores' && !this.dtTriggerProveedores.closed) this.dtTriggerProveedores.next(null);
      else if (tab === 'bancos' && !this.dtTriggerBancos.closed) this.dtTriggerBancos.next(null);
      else if (tab === 'otros' && !this.dtTriggerOtros.closed) this.dtTriggerOtros.next(null);
    }, 0);
  }

  isTabActive(tab: string): boolean {
    return this.activeTab === tab;
  }

  getDescuentosByCategory(category: string): Deduction[] {
    return this.descuentos.filter((d: any) =>
      d.category === category || (!d.category && category === 'otros')
    );
  }

  // Asignación de descuentos a empleados
  openAssignModal(descuento: Deduction): void {
    this.editingAssignment = null;
    this.isEditAssignmentMode = false;
    this.selectedDescuento = descuento;
    this.assignForm.reset({
      employee_id: '',
      deduction_id: descuento.id,
      total_amount: 0,
      installments: 1,
      remaining_installments: 1,
      start_date: '',
      status: 'active',
      notes: ''
    });
    this.assignModal = new bootstrap.Modal(this.assignModalRef.nativeElement);
    this.assignModal.show();
  }

  openEditAssignment(ed: EmployeeDeduction): void {
    this.editingAssignment = ed;
    this.isEditAssignmentMode = true;
    this.selectedDescuento = this.descuentos.find(d => d.id === ed.deduction_id) || (ed as any).deduction || null;
    const startDate = ed.start_date ? (typeof ed.start_date === 'string' ? ed.start_date.split('T')[0] : (ed.start_date as any)) : '';
    this.assignForm.reset({
      employee_id: ed.employee_id,
      deduction_id: ed.deduction_id,
      total_amount: ed.total_amount,
      installments: ed.installments,
      remaining_installments: ed.remaining_installments ?? ed.installments,
      start_date: startDate,
      status: ed.status || 'active',
      notes: ed.notes || ''
    });
    this.assignForm.get('employee_id')?.disable();
    this.assignForm.get('deduction_id')?.disable();
    if (this.viewModal) this.viewModal.hide();
    this.assignModal = new bootstrap.Modal(this.assignModalRef.nativeElement);
    this.assignModal.show();
  }

  saveAssignment(): void {
    if (this.assignForm.invalid) {
      Object.keys(this.assignForm.controls).forEach(key => {
        this.assignForm.get(key)?.markAsTouched();
      });
      return;
    }

    const formValue = this.assignForm.getRawValue(); // getRawValue to include disabled controls
    const monthlyAmount = formValue.total_amount / formValue.installments;

    if (this.isEditAssignmentMode && this.editingAssignment?.id) {
      const updateData: any = {
        total_amount: formValue.total_amount,
        installments: formValue.installments,
        remaining_installments: formValue.remaining_installments,
        start_date: formValue.start_date,
        status: formValue.status,
        notes: formValue.notes
      };
      this.employeeDeductionService.update(this.editingAssignment.id, updateData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res.success) {
              this.employeeDeductions = this.employeeDeductions.map(ed =>
                ed.id === this.editingAssignment!.id ? { ...ed, ...res.data } : ed
              );
              this.assignForm.get('employee_id')?.enable();
              this.assignForm.get('deduction_id')?.enable();
              this.closeAssignModal();
              this.editingAssignment = null;
              this.isEditAssignmentMode = false;
              this.auditService.logAction(
                'Actualización de Asignación de Descuento',
                'Gestión de Descuentos',
                `Asignación de descuento actualizada`,
                'success'
              );
            }
          },
          error: (err) => console.error('❌ Error actualizando asignación:', err)
        });
      return;
    }

    const assignmentData: EmployeeDeduction = {
      employee_id: parseInt(formValue.employee_id),
      deduction_id: formValue.deduction_id,
      amount: monthlyAmount,
      total_amount: formValue.total_amount,
      monthly_amount: monthlyAmount,
      installments: formValue.installments,
      remaining_installments: formValue.installments,
      start_date: formValue.start_date,
      status: 'active',
      notes: formValue.notes
    };

    this.employeeDeductionService.create(assignmentData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (res: any) => {
        if (res.success) {
          this.closeAssignModal();
          // Registrar auditoría para asignación de descuento
          const employee = this.employees.find((e: Employee) => e.id === assignmentData.employee_id);
          const deduction = this.descuentos.find((d: Deduction) => d.id === assignmentData.deduction_id);
          const employeeName = employee ? `${employee.first_name} ${employee.last_name}` : 'Empleado desconocido';
          this.auditService.logAction(
            'Asignación de Descuento',
            'Gestión de Descuentos',
            `Descuento ${deduction?.name} asignado a ${employeeName} por ${assignmentData.total_amount}`,
            'success'
          );
        }
      },
      error: (err) => {
        console.error('❌ Error asignando descuento:', err);
      }
    });
  }

  closeAssignModal(): void {
    if (this.assignModal) {
      this.assignModal.hide();
    }
    this.editingAssignment = null;
    this.isEditAssignmentMode = false;
    this.assignForm.get('employee_id')?.enable();
    this.assignForm.get('deduction_id')?.enable();
  }

  getTipoLabel(tipo?: string): string {
    if (!tipo) return '';
    const tipoObj = this.tiposDescuento.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  getEmployeeName(employeeId: number): string {
    const employee = this.employees.find(e => e.id === employeeId);
    return employee ? `${employee.first_name} ${employee.last_name}` : 'Desconocido';
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) return 'S/ 0.00';
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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
}
