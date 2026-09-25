import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';

import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss'
})
export class ConfiguracionComponent extends CrudListExportBase implements OnInit {
  /** ID del concepto en edición; null = crear nuevo */
  editingId: number | null = null;

  viewConfig: any = {
    title: 'Configuración de Ingresos',
    subtitle: 'Conceptos de recaudación asociados a partidas del Clasificador de Ingresos del Sector Público (MEF Perú)',
    icon: 'fas fa-cogs',
    actions: {
      create: { label: 'Nuevo Concepto', icon: 'fas fa-plus' }
    },
    table: {
      headers: [
        { key: 'codigo', label: 'Código' },
        { key: 'descripcion', label: 'Descripción' },
        { key: 'tipo', label: 'Tipo' },
        { key: 'partida_ingreso', label: 'Partida ingreso (MEF)' },
        { key: 'monto', label: 'Monto Base' },
        { key: 'estado', label: 'Estado' },
        { key: 'acciones', label: 'Acciones' }
      ]
    }
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;

  getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      tipo: item.tipo,
      partida_ingreso: item.partida_ingreso ?? '',
      partida_descripcion: item.partida_descripcion ?? '',
      monto: item.monto,
      estado: item.estado
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo', label: 'Código' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'partida_ingreso', label: 'Partida ingreso (MEF)' },
      { key: 'partida_descripcion', label: 'Descripción partida' },
      { key: 'monto', label: 'Monto' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string { return 'TUPA - Listado de Conceptos de Pago'; }
  getExportFilename(): string { return 'conceptos-tupa-' + new Date().getTime(); }


  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      codigo: ['', Validators.required],
      descripcion: ['', Validators.required],
      tipo: ['TASA', Validators.required],
      monto: ['', [Validators.required, Validators.min(0)]],
      partida_ingreso: [''],
      partida_descripcion: ['']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiSvc.getConceptos().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar conceptos')
    });
  }

  onAction(action: string) {
    if (action === 'create') {
      this.editingId = null;
      this.form.reset({ tipo: 'TASA', partida_ingreso: '', partida_descripcion: '' });
      this.showModal = true;
    }
  }

  openEdit(p: any) {
    this.editingId = p.id;
    this.form.patchValue({
      codigo: p.codigo,
      descripcion: p.descripcion,
      tipo: p.tipo,
      monto: p.monto,
      partida_ingreso: p.partida_ingreso ?? '',
      partida_descripcion: p.partida_descripcion ?? ''
    });
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingId = null;
  }

  save() {
    if (!this.form.valid) {
      this.form.markAllAsTouched();
      return;
    }
    this.isSaving = true;
    const payload = {
      ...this.form.value,
      partida_ingreso: this.form.value.partida_ingreso || null,
      partida_descripcion: this.form.value.partida_descripcion || null
    };
    if (this.editingId != null) {
      this.apiSvc.updateConcepto(this.editingId, payload).subscribe({
        next: (resp) => {
          this.toast.success(resp.message ?? 'Concepto actualizado');
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Error al actualizar concepto');
          this.isSaving = false;
        }
      });
    } else {
      this.apiSvc.createConcepto(payload).subscribe({
        next: (resp) => {
          this.toast.success(resp.message ?? 'Concepto creado');
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.toast.error(err?.error?.message ?? 'Error al guardar concepto');
          this.isSaving = false;
        }
      });
    }
  }

  confirmDelete(p: any) {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = 'Eliminar concepto';
    modalRef.componentInstance.message = `¿Eliminar el concepto "${p.codigo} - ${p.descripcion}"?`;
    modalRef.componentInstance.detail = 'Esta acción no se puede deshacer.';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.confirmText = 'Sí, eliminar';
    modalRef.result.then(
      () => {
        this.apiSvc.deleteConcepto(p.id).subscribe({
          next: (resp) => {
            this.toast.success(resp?.message ?? 'Concepto eliminado');
            this.loadData();
          },
          error: (err) => {
            this.toast.error(err?.error?.message ?? 'Error al eliminar concepto');
          }
        });
      },
      () => {}
    );
  }
}
