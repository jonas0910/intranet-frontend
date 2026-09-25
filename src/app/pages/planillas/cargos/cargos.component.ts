import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PositionService, Position } from '../../../services/position.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent, LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var bootstrap: any;

@Component({
  selector: 'app-cargos',
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
  templateUrl: './cargos.component.html',
  styleUrls: ['./cargos.component.scss']
})
export class CargosComponent implements OnInit, OnDestroy {
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  readonly breadcrumbs = [
    { label: 'Planillas', url: '/planillas' },
    { label: 'Cargos' }
  ];

  @ViewChild('cargoModal') cargoModalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  cargos: Position[] = [];
  selectedCargo: Position | null = null;
  cargoForm!: FormGroup;
  isEditMode = false;
  saving = false;
  loading = false;

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private cargoModal: any;
  private viewModal: any;

  nivelesPosition = [
    { value: 'entry', label: 'Nivel de Entrada' },
    { value: 'junior', label: 'Junior' },
    { value: 'senior', label: 'Senior' },
    { value: 'lead', label: 'Líder' },
    { value: 'manager', label: 'Gerente' },
    { value: 'director', label: 'Director' }
  ];

  constructor(
    private positionService: PositionService,
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
    this.loadCargos();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.complete();
    }
  }

  initForm(): void {
    this.cargoForm = this.fb.group({
      code: ['', [Validators.required, Validators.maxLength(20)]],
      name: ['', [Validators.required, Validators.maxLength(100)]],
      description: ['', Validators.maxLength(500)],
      department_id: [null],
      level: ['entry', Validators.required],
      min_salary: [0, [Validators.min(0)]],
      max_salary: [0, [Validators.min(0)]],
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

  loadCargos(): void {
    this.loading = true;
    this.positionService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const data: any = response.data;
          this.cargos = Array.isArray(data) ? data : (data?.data || []);
          setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
        } else {
          this.cargos = [];
          setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
        }
      },
      error: () => {
        this.loading = false;
        this.cargos = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  reloadTable(): void {
    this.loading = true;
    this.positionService.getAll().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success && response.data) {
          const data: any = response.data;
          this.cargos = Array.isArray(data) ? data : (data?.data || []);
        } else {
          this.cargos = [];
        }
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      },
      error: () => {
        this.loading = false;
        this.cargos = [];
        setTimeout(() => { if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null); }, 0);
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedCargo = null;
    this.cargoForm.reset({ 
      code: '', 
      name: '', 
      description: '', 
      department_id: null,
      level: 'entry',
      min_salary: 0,
      max_salary: 0,
      is_active: true
    });
    this.showModal('cargoModal');
  }

  openEditModal(cargo: Position): void {
    this.isEditMode = true;
    this.selectedCargo = cargo;
    this.cargoForm.patchValue(cargo);
    this.showModal('cargoModal');
  }

  openViewModal(cargo: Position): void {
    this.selectedCargo = cargo;
    this.showModal('viewModal');
  }

  private showModal(modalId: string): void {
    const modalElement = modalId === 'cargoModal' ? this.cargoModalRef : this.viewModalRef;
    if (modalElement) {
      const modalInstance = new bootstrap.Modal(modalElement.nativeElement);
      if (modalId === 'cargoModal') {
        this.cargoModal = modalInstance;
      } else {
        this.viewModal = modalInstance;
      }
      modalInstance.show();
    }
  }

  private hideModal(modalId: string): void {
    const modalInstance = modalId === 'cargoModal' ? this.cargoModal : this.viewModal;
    if (modalInstance) modalInstance.hide();
  }

  closeModal(): void {
    if (this.cargoModal) {
      this.cargoModal.hide();
    }
  }

  closeViewModal(): void {
    if (this.viewModal) {
      this.viewModal.hide();
    }
  }

  saveCargo(): void {
    if (this.cargoForm.invalid) {
      Object.keys(this.cargoForm.controls).forEach(key => {
        this.cargoForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.saving = true;
    const raw = this.cargoForm.value;
    // Normalize payload for API: null for empty department_id, ensure level is string
    const formValue = {
      ...raw,
      department_id: raw.department_id ?? null,
      level: raw.level != null ? String(raw.level) : 'entry',
      min_salary: Number(raw.min_salary) ?? 0,
      max_salary: Number(raw.max_salary) ?? 0,
    };
    const operation = this.isEditMode
      ? this.positionService.update(this.selectedCargo!.id!, formValue)
      : this.positionService.create(formValue);

    operation.subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.hideModal('cargoModal');
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error:', error);
        const err = error?.error;
        if (err?.errors) {
          console.error('Validation errors:', err.errors);
          const msg = Object.entries(err.errors).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
          alert('Errores de validación:\n\n' + (msg || err.message || 'Unprocessable Content'));
        } else {
          alert(err?.message || 'Error al guardar el cargo');
        }
        this.saving = false;
      }
    });
  }

  confirmDelete(cargo: Position): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${cargo.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.positionService.delete(cargo.id!).subscribe({
          next: (resp) => { if (resp.success) this.reloadTable(); },
          error: (e) => console.error('Error eliminando:', e)
        });
      },
      () => {}
    );
  }

  getNivelLabel(level?: string | number): string {
    if (level === undefined || level === null) return '';
    const levelStr = String(level);
    const nivel = this.nivelesPosition.find(n => n.value === levelStr);
    return nivel ? nivel.label : levelStr;
  }

  formatSalary(amount: number | undefined): string {
    if (!amount) return 'S/ 0.00';
    return `S/ ${amount.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}








