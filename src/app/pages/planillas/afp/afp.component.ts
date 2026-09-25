import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject, takeUntil } from 'rxjs';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { AfpService, Afp } from '../../../services/afp.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { AuditService } from '../../../services/audit.service';

declare var bootstrap: any;

@Component({
  selector: 'app-afp',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, DataTablesModule, PageHeaderComponent, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './afp.component.html',
  styleUrls: ['./afp.component.scss']
})
export class AfpComponent implements OnInit, OnDestroy {
  @ViewChild('afpModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  afps: Afp[] = [];
  selectedAfp: Afp | null = null;
  afpForm!: FormGroup;
  isEditMode = false;
  saving = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  private destroy$ = new Subject<void>();

  private modal: any;
  private viewModal: any;

  constructor(
    private afpService: AfpService,
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
    this.loadAfps();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.complete();
    }
  }

  initForm(): void {
    this.afpForm = this.fb.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      obligatory_rate: [10, [Validators.required, Validators.min(0), Validators.max(100)]],
      commission_rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      insurance_rate: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
      sunat_code: [''],
      is_active: [true],
      effective_from: [''],
      effective_to: ['']
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

  loadAfps(): void {
    console.log('🔄 Cargando AFPs...');
    this.afpService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        console.log('📦 Respuesta:', response);
        if (response.success) {
          const data: any = response.data;
          this.afps = Array.isArray(data) ? data : (data?.data || []);
          console.log('✅ AFPs cargadas:', this.afps.length);
          this.renderTable();
        }
      },
      error: (error) => {
        console.error('❌ Error cargando AFPs:', error);
      }
    });
  }

  private renderTable(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      });
    } else {
      if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
    }
  }

  reloadTable(): void {
    this.afpService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success) {
          const data: any = response.data;
          this.afps = Array.isArray(data) ? data : (data?.data || []);
        }
        this.renderTable();
      }
    });
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedAfp = null;
    this.afpForm.reset({
      code: '',
      name: '',
      sunat_code: '',
      obligatory_rate: 10,
      commission_rate: 0,
      insurance_rate: 0,
      is_active: true,
      effective_from: '',
      effective_to: ''
    });
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(afp: Afp): void {
    this.isEditMode = true;
    this.selectedAfp = afp;
    const patch: any = { ...afp };
    if (afp.effective_from) {
      patch.effective_from = typeof afp.effective_from === 'string'
        ? (afp.effective_from as string).split('T')[0]
        : (afp.effective_from as any)?.toISOString?.()?.split('T')[0] ?? '';
    } else {
      patch.effective_from = '';
    }
    if (afp.effective_to) {
      patch.effective_to = typeof afp.effective_to === 'string'
        ? (afp.effective_to as string).split('T')[0]
        : (afp.effective_to as any)?.toISOString?.()?.split('T')[0] ?? '';
    } else {
      patch.effective_to = '';
    }
    this.afpForm.patchValue(patch);
    this.modal = new bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(afp: Afp): void {
    this.selectedAfp = afp;
    this.viewModal = new bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  saveAfp(): void {
    if (this.afpForm.invalid) return;

    this.saving = true;
    const raw = this.afpForm.value;
    const afpData = {
      ...raw,
      effective_from: raw.effective_from || new Date().toISOString().split('T')[0],
      effective_to: raw.effective_to || null
    };

    const operation = this.isEditMode && this.selectedAfp
      ? this.afpService.update(this.selectedAfp.id!, afpData)
      : this.afpService.create(afpData);

    operation
      .pipe(takeUntil(this.destroy$))
      .subscribe({
      next: (response) => {
        if (response.success) {
          this.reloadTable();
          this.modal.hide();
          this.saving = false;
          // Registrar auditoría para guardar AFP
          const action = this.isEditMode ? 'Actualización de AFP' : 'Creación de AFP';
          const description = this.isEditMode 
            ? `AFP ${afpData.name} actualizada exitosamente`
            : `AFP ${afpData.name} creada exitosamente`;
          this.auditService.logAction(
            action,
            'Gestión de AFPs',
            description,
            'success'
          );
        }
      },
      error: (error) => {
        console.error('Error guardando AFP:', error);
        this.saving = false;
      }
    });
  }

  confirmDelete(afp: Afp): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Registro';
    ref.componentInstance.message = `¿Está seguro de eliminar "${afp.name}"?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.afpService.delete(afp.id!)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
          next: (response) => { 
            if (response.success) { 
              this.reloadTable(); 
              this.auditService.logAction(
                'Eliminación de AFP',
                'Gestión de AFPs',
                `AFP ${afp.name} eliminada exitosamente`,
                'success'
              );
            } 
          },
          error: (e) => {
            console.error('Error eliminando:', e);
            this.auditService.logAction(
              'Eliminación de AFP',
              'Gestión de AFPs',
              `Error eliminando AFP ${afp.name}`,
              'failed'
            );
          }
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
