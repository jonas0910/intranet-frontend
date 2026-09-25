import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DataTablesModule } from 'angular-datatables';
import { Subject } from 'rxjs';
import { ExitSlipService, ExitSlip } from '../../../services/exit-slip.service';

@Component({
  selector: 'app-boleta-salida',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, DataTablesModule],
  templateUrl: './boleta-salida.component.html'
})
export class BoletaSalidaComponent implements OnInit, OnDestroy {
  @ViewChild('slipModal') modalRef!: ElementRef;
  @ViewChild('viewModal') viewModalRef!: ElementRef;

  slips: ExitSlip[] = [];
  selectedSlip: ExitSlip | null = null;
  slipForm!: FormGroup;
  isEditMode = false;
  saving = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  private modal: any;
  private viewModal: any;

  constructor(
    private fb: FormBuilder,
    private exitSlipService: ExitSlipService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.initDataTable();
    this.loadSlips();
  }

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initForm(): void {
    const today = new Date().toISOString().substring(0,10);
    this.slipForm = this.fb.group({
      exit_date: [today, Validators.required],
      time_from: ['', Validators.required],
      time_to: [''],
      reason: [''],
      observations: ['']
    });
  }

  initDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rtip',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'desc']],
      columnDefs: [ { targets: -1, orderable: false, searchable: false } ]
    };
  }

  loadSlips(): void {
    this.exitSlipService.getAll().subscribe({
      next: (res: any) => {
        if (res.success) {
          const data: any = res.data;
          this.slips = Array.isArray(data) ? data : (data?.data || []);
          if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
        }
      },
      error: (err) => console.error('❌ Error cargando boletas:', err)
    });
  }

  getStatusLabel(status?: string): string {
    const map: any = { draft: 'Borrador', submitted: 'Enviado', approved: 'Aprobado', rejected: 'Rechazado', cancelled: 'Cancelado' };
    return map[status || 'draft'] || status || '—';
  }

  getStatusClass(status?: string): string {
    const map: any = { draft: 'bg-secondary', submitted: 'bg-info', approved: 'bg-success', rejected: 'bg-danger', cancelled: 'bg-dark' };
    return map[status || 'draft'] || 'bg-secondary';
  }

  canEdit(slip: ExitSlip): boolean { return slip.status === 'draft' || slip.status === 'submitted'; }
  canSubmit(slip: ExitSlip): boolean { return slip.status === 'draft'; }
  canApprove(slip: ExitSlip): boolean { return slip.status === 'submitted'; }
  canReject(slip: ExitSlip): boolean { return slip.status === 'submitted'; }
  canCancel(slip: ExitSlip): boolean { return slip.status === 'draft' || slip.status === 'submitted'; }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedSlip = null;
    this.slipForm.reset({ exit_date: new Date().toISOString().substring(0,10) });
    this.modal = new (window as any).bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openEditModal(slip: ExitSlip): void {
    this.isEditMode = true;
    this.selectedSlip = slip;
    this.slipForm.patchValue(slip);
    this.modal = new (window as any).bootstrap.Modal(this.modalRef.nativeElement);
    this.modal.show();
  }

  openViewModal(slip: ExitSlip): void {
    this.selectedSlip = slip;
    this.viewModal = new (window as any).bootstrap.Modal(this.viewModalRef.nativeElement);
    this.viewModal.show();
  }

  closeModal(): void { if (this.modal) this.modal.hide(); }
  closeViewModal(): void { if (this.viewModal) this.viewModal.hide(); }

  saveSlip(): void {
    if (this.slipForm.invalid) return;
    this.saving = true;
    const payload = this.slipForm.value;

    const op = this.isEditMode && this.selectedSlip?.id
      ? this.exitSlipService.update(this.selectedSlip.id, payload)
      : this.exitSlipService.create(payload);

    op.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.closeModal();
          this.loadSlips();
        }
        this.saving = false;
      },
      error: (err) => { console.error('❌ Error guardando:', err); this.saving = false; }
    });
  }

  submitSlip(slip: ExitSlip): void {
    this.exitSlipService.submit(slip.id!).subscribe({ next: () => this.loadSlips() });
  }
  approveSlip(slip: ExitSlip): void {
    this.exitSlipService.approve(slip.id!).subscribe({ next: () => this.loadSlips() });
  }
  rejectSlip(slip: ExitSlip): void {
    const reason = prompt('Motivo de rechazo:') || '';
    if (!reason.trim()) return;
    this.exitSlipService.reject(slip.id!, reason).subscribe({ next: () => this.loadSlips() });
  }
  cancelSlip(slip: ExitSlip): void {
    this.exitSlipService.cancel(slip.id!).subscribe({ next: () => this.loadSlips() });
  }
}


