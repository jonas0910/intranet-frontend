import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CostCenterService, CostCenter } from '../../../services/cost-center.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-centro-costos',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DataTablesModule,
    PageHeaderComponent,
    CrudActionsComponent,
    StatusBadgeComponent,
    LoadingSpinnerComponent
  ],
  templateUrl: './centro-costos.component.html',
  styleUrls: ['./centro-costos.component.scss']
})
export class CentroCostosComponent implements OnInit, OnDestroy {
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Centro de Costos' }
  ];

  @ViewChild('centroModal') centroModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  centros: CostCenter[] = [];
  selectedCentro: CostCenter | null = null;
  centroForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  constructor(
    private costCenterService: CostCenterService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private modalService: NgbModal
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('planillas');
    this.mc = this.dsService.getModalCrudFor('planillas');
    this.initDataTable();
    this.loadCentros();
  }

  ngOnDestroy(): void {
    // Use complete() with guard to avoid parentNode null errors in DataTables teardown
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.complete();
    }
  }

  initForm(): void {
    this.centroForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      budget: [0, [Validators.min(0)]],
      responsible_person: [''],
      is_active: [true]
    });
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
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
  }

  loadCentros(): void {
    this.loading = true;
    this.costCenterService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.centros = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.centros = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.centros = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.costCenterService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.centros = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.centros = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.centros = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedCentro = null;
    this.centroForm.reset({ code: '', name: '', description: '', budget: 0, responsible_person: '', is_active: true });
    this.showModal('centroModal');
  }

  openEditModal(centro: CostCenter): void {
    this.isEditMode = true;
    this.selectedCentro = centro;
    this.centroForm.patchValue(centro);
    this.showModal('centroModal');
  }

  openViewModal(centro: CostCenter): void {
    this.selectedCentro = centro;
    this.showModal('viewModal');
  }

  private showModal(modalId: string): void {
    const modalElement = modalId === 'centroModal' ? this.centroModalRef : this.viewModalRef;
    if (modalElement) {
      const modalInstance = new bootstrap.Modal(modalElement.nativeElement);
      if (modalId === 'centroModal') {
        this.modal = modalInstance;
      } else {
        this.viewModal = modalInstance;
      }
      modalInstance.show();
    }
  }

  private hideModal(modalId: string): void {
    const modalInstance = modalId === 'centroModal' ? this.modal : this.viewModal;
    if (modalInstance) modalInstance.hide();
  }

  saveCentro(): void {
    if (this.centroForm.invalid) {
      Object.keys(this.centroForm.controls).forEach(key => {
        this.centroForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const formValue = this.centroForm.value;
    const operation = this.isEditMode
      ? this.costCenterService.update(this.selectedCentro!.id!, formValue)
      : this.costCenterService.create(formValue);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.hideModal('centroModal');
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(centro: CostCenter): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${centro.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.costCenterService.delete(centro.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
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
