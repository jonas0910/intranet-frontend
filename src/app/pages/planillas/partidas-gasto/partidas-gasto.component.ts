import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ExpenseItemService, ExpenseItem } from '../../../services/expense-item.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-partidas-gasto',
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
  templateUrl: './partidas-gasto.component.html',
  styleUrls: ['./partidas-gasto.component.scss']
})
export class PartidasGastoComponent implements OnInit, OnDestroy {
  @ViewChild('partidaModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Partidas de Gasto' }
  ];

  partidas: ExpenseItem[] = [];
  selectedPartida: ExpenseItem | null = null;
  partidaForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  tiposPartida = [
    { value: 'personal', label: 'Personal' },
    { value: 'operativo', label: 'Operativo' },
    { value: 'inversion', label: 'Inversión' }
  ];

  constructor(
    private expenseItemService: ExpenseItemService,
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
    this.loadPartidas();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initForm(): void {
    this.partidaForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      description: [''],
      type: ['personal', Validators.required],
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
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: {
        url: 'assets/datatables/i18n/es-ES.json'
      },
      order: [[0, 'asc']],
      columnDefs: [
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  loadPartidas(): void {
    this.loading = true;
    this.expenseItemService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.partidas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.partidas = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.partidas = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.expenseItemService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          const data: any = response.data;
          this.partidas = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.partidas = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.partidas = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedPartida = null;
    this.partidaForm.reset({ type: 'personal', is_active: true });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(partida: ExpenseItem): void {
    this.isEditMode = true;
    this.selectedPartida = partida;
    this.partidaForm.patchValue(partida);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(partida: ExpenseItem): void {
    this.selectedPartida = partida;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  savePartida(): void {
    if (this.partidaForm.invalid) return;

    this.saving = true;
    const partidaData = this.partidaForm.value;

    const operation = this.isEditMode && this.selectedPartida
      ? this.expenseItemService.update(this.selectedPartida.id!, partidaData)
      : this.expenseItemService.create(partidaData);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error guardando partida:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(partida: ExpenseItem): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${partida.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.expenseItemService.delete(partida.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposPartida.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
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
