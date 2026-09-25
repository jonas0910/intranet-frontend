import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SalaryScaleService, SalaryScale } from '../../../services/salary-scale.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-escala',
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
  templateUrl: './escala.component.html',
  styleUrls: ['./escala.component.scss']
})
export class EscalaComponent implements OnInit, OnDestroy {
  @ViewChild('escalaModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Escala Salarial' }
  ];

  escalas: SalaryScale[] = [];
  selectedEscala: SalaryScale | null = null;
  escalaForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  constructor(
    private salaryScaleService: SalaryScaleService,
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
    this.loadEscalas();
  }

  ngOnDestroy(): void {
    // No llamar dtTrigger.complete(): evita ObjectUnsubscribedError si el componente se reutiliza.
  }

  initForm(): void {
    this.escalaForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      level: [1, [Validators.required, Validators.min(1)]],
      base_salary: [0, [Validators.required, Validators.min(0)]],
      description: [''],
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
      order: [[2, 'asc']],
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

  loadEscalas(): void {
    this.loading = true;
    this.salaryScaleService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.escalas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.escalas = [];
        }
        this.triggerDataTable();
      },
      error: () => {
        this.loading = false;
        this.escalas = [];
        this.triggerDataTable();
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.salaryScaleService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.escalas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.escalas = [];
        }
        this.triggerDataTable();
      },
      error: () => {
        this.loading = false;
        this.escalas = [];
        this.triggerDataTable();
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedEscala = null;
    this.escalaForm.reset({ level: 1, base_salary: 0, is_active: true });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(escala: SalaryScale): void {
    this.isEditMode = true;
    this.selectedEscala = escala;
    this.escalaForm.patchValue(escala);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(escala: SalaryScale): void {
    this.selectedEscala = escala;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  saveEscala(): void {
    if (this.escalaForm.invalid) return;

    this.saving = true;
    const escalaData = this.escalaForm.value;

    const operation = this.isEditMode && this.selectedEscala
      ? this.salaryScaleService.update(this.selectedEscala.id!, escalaData)
      : this.salaryScaleService.create(escalaData);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error guardando escala:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(escala: SalaryScale): void {
    const label = escala.code || `ID ${escala.id}`;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${label}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.salaryScaleService.delete(escala.id!).subscribe({
          next: (response) => { if (response.success) this.reloadTable(); },
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
