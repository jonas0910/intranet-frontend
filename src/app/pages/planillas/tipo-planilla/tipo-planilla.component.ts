import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PayrollTypeService, PayrollType } from '../../../services/payroll-type.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuditService } from '../../../services/audit.service';

declare var bootstrap: any;

@Component({
  selector: 'app-tipo-planilla',
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
  templateUrl: './tipo-planilla.component.html',
  styleUrls: ['./tipo-planilla.component.scss']
})
export class TipoPlanillaComponent implements OnInit, OnDestroy {
  @ViewChild('tipoModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Tipos de Planilla' }
  ];

  tipos: PayrollType[] = [];
  selectedTipo: PayrollType | null = null;
  tipoForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  periodicidades = [
    { value: 'mensual', label: 'Mensual' },
    { value: 'quincenal', label: 'Quincenal' },
    { value: 'semanal', label: 'Semanal' },
    { value: 'diaria', label: 'Diaria' }
  ];

  constructor(
    private payrollTypeService: PayrollTypeService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private modalService: NgbModal,
    private auditService: AuditService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    this.loadTipos();
  }

  ngOnDestroy(): void {
    // No llamar dtTrigger.complete(): evita ObjectUnsubscribedError si el componente se reutiliza.
  }

  initForm(): void {
    this.tipoForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      periodicity: ['mensual', Validators.required],
      is_active: [true]
    });
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'Todos']],
      processing: true,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']],
      columnDefs: [
        { targets: 0, width: '80px' },
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) { /* Subject already closed (e.g. component destroyed) */ }
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }

  loadTipos(): void {
    this.loading = true;
    this.payrollTypeService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.tipos = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.tipos = [];
        }
        this.triggerDataTable();
      },
      error: () => {
        this.loading = false;
        this.tipos = [];
        this.triggerDataTable();
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.payrollTypeService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.tipos = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.tipos = [];
        }
        this.triggerDataTable();
      },
      error: () => {
        this.loading = false;
        this.tipos = [];
        this.triggerDataTable();
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedTipo = null;
    this.tipoForm.reset({ periodicity: 'mensual', is_active: true });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(tipo: PayrollType): void {
    this.isEditMode = true;
    this.selectedTipo = tipo;
    this.tipoForm.patchValue(tipo);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(tipo: PayrollType): void {
    this.selectedTipo = tipo;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  saveTipo(): void {
    if (this.tipoForm.invalid) return;

    this.saving = true;
    const tipoData = this.tipoForm.value;

    const operation = this.isEditMode && this.selectedTipo
      ? this.payrollTypeService.update(this.selectedTipo.id!, tipoData)
      : this.payrollTypeService.create(tipoData);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
          const action = this.isEditMode ? 'Actualización de Tipo de Planilla' : 'Creación de Tipo de Planilla';
          const description = this.isEditMode 
            ? `Tipo de planilla ${tipoData.name} actualizado exitosamente`
            : `Tipo de planilla ${tipoData.name} creado exitosamente`;
          this.auditService.logAction(
            action,
            'Tipos de Planilla',
            description,
            'success'
          );
        }
      },
      error: (error) => {
        console.error('Error guardando tipo de planilla:', error);
        this.saving = false;
        const tipoData = this.tipoForm.value;
        const action = this.isEditMode ? 'Actualización de Tipo de Planilla' : 'Creación de Tipo de Planilla';
        this.auditService.logAction(
          action,
          'Tipos de Planilla',
          `Error guardando tipo de planilla ${tipoData?.name || ''}`,
          'failed'
        );
      }
    });
  }

  confirmDelete(tipo: PayrollType): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${tipo.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.payrollTypeService.delete(tipo.id!).subscribe({
          next: (response) => { 
            if (response.success) { 
              this.reloadTable(); 
              this.auditService.logAction(
                'Eliminación de Tipo de Planilla',
                'Tipos de Planilla',
                `Tipo de planilla ${tipo.name} eliminado exitosamente`,
                'success'
              );
            } 
          },
          error: (e) => {
            console.error('Error eliminando:', e);
            this.auditService.logAction(
              'Eliminación de Tipo de Planilla',
              'Tipos de Planilla',
              `Error eliminando tipo de planilla ${tipo.name}`,
              'failed'
            );
          }
        });
      },
      () => {}
    );
  }

  getPeriodicidadLabel(periodicity: string): string {
    const per = this.periodicidades.find(p => p.value === periodicity);
    return per ? per.label : periodicity;
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
