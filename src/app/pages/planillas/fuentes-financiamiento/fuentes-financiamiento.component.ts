import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { FundingSourceService, FundingSource } from '../../../services/funding-source.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-fuentes-financiamiento',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './fuentes-financiamiento.component.html',
  styleUrls: ['./fuentes-financiamiento.component.scss']
})
export class FuentesFinanciamientoComponent implements OnInit, OnDestroy {
  @ViewChild('fuenteModal') fuenteModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  fuentes: FundingSource[] = [];
  selectedFuente: FundingSource | null = null;
  fuenteForm!: FormGroup;
  isEditMode = false;
  saving = false;

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private fuenteModal: any;
  private viewModal: any;

  tiposFuente = [
    { value: 'recursos_ordinarios', label: 'Recursos Ordinarios' },
    { value: 'recursos_directamente_recaudados', label: 'Recursos Directamente Recaudados' },
    { value: 'recursos_por_operaciones_oficiales', label: 'Recursos por Operaciones Oficiales de Crédito' },
    { value: 'donaciones_transferencias', label: 'Donaciones y Transferencias' },
    { value: 'recursos_determinados', label: 'Recursos Determinados' }
  ];

  constructor(
    private fundingSourceService: FundingSourceService,
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
    this.loadFuentes();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initForm(): void {
    const currentYear = new Date().getFullYear();
    this.fuenteForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(200)]],
      description: ['', Validators.maxLength(500)],
      type: ['recursos_ordinarios', Validators.required],
      mef_code: ['', Validators.maxLength(10)],
      siaf_code: ['', Validators.maxLength(10)],
      budget_year: [currentYear, [Validators.required, Validators.min(2020), Validators.max(2100)]],
      annual_budget: [0, [Validators.min(0)]],
      available_balance: [0, [Validators.min(0)]],
      valid_from: [''],
      valid_to: [''],
      is_active: [true]
    });
  }

  initDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
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

  loadFuentes(): void {
    console.log('🔄 Cargando fuentes de financiamiento...');
    this.fundingSourceService.getAll().subscribe({
      next: (response) => {
        console.log('📦 Respuesta recibida:', response);
        if (response.success && response.data) {
          // Manejar respuesta paginada o directa
          const data: any = response.data;
          this.fuentes = Array.isArray(data) ? data : (data?.data || []);
          console.log('✅ Fuentes cargadas:', this.fuentes.length);
          if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
        }
      },
      error: (error) => {
        console.error('❌ Error:', error);
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      }
    });
  }

  reloadTable(): void {
    this.fundingSourceService.getAll().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Manejar respuesta paginada o directa
          const data: any = response.data;
          this.fuentes = Array.isArray(data) ? data : (data?.data || []);
        }
      },
      error: (error) => console.error('❌ Error al recargar:', error)
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedFuente = null;
    const currentYear = new Date().getFullYear();
    this.fuenteForm.reset({ 
      code: '', 
      name: '', 
      description: '', 
      type: 'recursos_ordinarios',
      mef_code: '',
      siaf_code: '',
      budget_year: currentYear,
      annual_budget: 0,
      available_balance: 0,
      valid_from: '',
      valid_to: '',
      is_active: true
    });
    this.showModal('fuenteModal');
  }

  openEditModal(fuente: FundingSource): void {
    this.isEditMode = true;
    this.selectedFuente = fuente;
    this.fuenteForm.patchValue(fuente);
    this.showModal('fuenteModal');
  }

  openViewModal(fuente: FundingSource): void {
    this.selectedFuente = fuente;
    this.showModal('viewModal');
  }

  private showModal(modalId: string): void {
    const modalElement = modalId === 'fuenteModal' ? this.fuenteModalRef : this.viewModalRef;
    if (modalElement) {
      const modalInstance = new bootstrap.Modal(modalElement.nativeElement);
      if (modalId === 'fuenteModal') {
        this.fuenteModal = modalInstance;
      } else {
        this.viewModal = modalInstance;
      }
      modalInstance.show();
    }
  }

  private hideModal(modalId: string): void {
    const modalInstance = modalId === 'fuenteModal' ? this.fuenteModal : this.viewModal;
    if (modalInstance) modalInstance.hide();
  }

  closeModal(): void {
    if (this.fuenteModal) {
      this.fuenteModal.hide();
    }
  }

  closeViewModal(): void {
    if (this.viewModal) {
      this.viewModal.hide();
    }
  }

  saveFuente(): void {
    if (this.fuenteForm.invalid) {
      Object.keys(this.fuenteForm.controls).forEach(key => {
        this.fuenteForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const formValue = this.fuenteForm.value;
    const operation = this.isEditMode
      ? this.fundingSourceService.update(this.selectedFuente!.id!, formValue)
      : this.fundingSourceService.create(formValue);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.hideModal('fuenteModal');
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(fuente: FundingSource): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${fuente.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.fundingSourceService.delete(fuente.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }

  getTipoLabel(type?: string): string {
    if (!type) return '';
    const tipo = this.tiposFuente.find(t => t.value === type);
    return tipo ? tipo.label : type;
  }

  formatCurrency(amount: number | undefined): string {
    if (!amount) return 'S/ 0.00';
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

