import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ContributionService, Contribution } from '../../../services/contribution.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-aportes',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './aportes.component.html',
  styleUrls: ['./aportes.component.scss']
})
export class AportesComponent implements OnInit, OnDestroy {
  @ViewChild('aporteModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  aportes: Contribution[] = [];
  selectedAporte: Contribution | null = null;
  aporteForm!: FormGroup;
  isEditMode = false;
  saving = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  tiposAporte = [
    { value: 'essalud', label: 'ESSALUD' },
    { value: 'senati', label: 'SENATI' },
    { value: 'sctr', label: 'SCTR' },
    { value: 'otros', label: 'Otros' }
  ];

  constructor(
    private contributionService: ContributionService,
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
    this.loadAportes();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initForm(): void {
    this.aporteForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      type: ['essalud', Validators.required],
      percentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      sunat_code: [''],
      is_active: [true]
    });
  }

  initDataTable(): void {
    this.dtOptions = {
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
  }

  loadAportes(): void {
    console.log('🔄 Cargando aportes...');
    this.contributionService.getAll().subscribe({
      next: (response) => {
        console.log('📦 Respuesta:', response);
        if (response.success) {
          const data: any = response.data;
          this.aportes = Array.isArray(data) ? data : (data?.data || []);
          console.log('✅ Aportes cargados:', this.aportes.length);
          if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando aportes:', error);
      }
    });
  }

  reloadTable(): void {
    this.contributionService.getAll().subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          this.aportes = Array.isArray(data) ? data : (data?.data || []);
        }
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedAporte = null;
    this.aporteForm.reset({ type: 'essalud', percentage: 0, is_active: true });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(aporte: Contribution): void {
    this.isEditMode = true;
    this.selectedAporte = aporte;
    this.aporteForm.patchValue(aporte);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(aporte: Contribution): void {
    this.selectedAporte = aporte;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  saveAporte(): void {
    if (this.aporteForm.invalid) return;

    this.saving = true;
    const aporteData = this.aporteForm.value;

    const operation = this.isEditMode && this.selectedAporte
      ? this.contributionService.update(this.selectedAporte.id!, aporteData)
      : this.contributionService.create(aporteData);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
        }
      },
      error: (error) => {
        console.error('Error guardando aporte:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(aporte: Contribution): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${aporte.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.contributionService.delete(aporte.id!).subscribe({
          next: (response) => { if (response.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }

  getTipoLabel(tipo?: string): string {
    if (!tipo) return '';
    const tipoObj = this.tiposAporte.find(t => t.value === tipo);
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
