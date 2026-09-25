import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';
import { DesignSystemService } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

import { PreReciboService } from '../../../../services/comercializacion/pre-recibos.service';

@Component({
  selector: 'app-tramites',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './tramites.component.html',
  styleUrl: './tramites.component.scss'
})
export class TramitesComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Gestión de Trámites',
    icon: 'fas fa-id-card',
    actions: {
      create: { label: 'Nuevo Expediente', icon: 'fas fa-plus' }
    },
    table: {
      headers: [
        { key: 'expediente', label: 'Nº Expediente' },
        { key: 'solicitante', label: 'Razón Social' },
        { key: 'giro', label: 'Giro de Negocio' },
        { key: 'tipo', label: 'Tipo Trámite' },
        { key: 'fase', label: 'Fase' },
        { key: 'acciones', label: 'Acciones' }
      ]
    }
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'view' = 'create';
  selectedId: number | null = null;
  comerciantesPadron: any[] = [];

  // Liquidación de Pagos
  conceptos: any[] = [];
  showLiquidarModal = false;
  selectedTramite: any = null;
  liquidarForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private preReciboSvc: PreReciboService,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      comerciante_id: [null],
      nro_expediente: ['', Validators.required],
      solicitante: ['', Validators.required],
      giro_negocio: ['', Validators.required],
      tipo_tramite: ['Definitiva de Funcionamiento', Validators.required],
      fase: ['Evaluación Técnica', Validators.required]
    });

    this.liquidarForm = this.fb.group({
      concepto_id: [null, Validators.required],
      monto: [0, [Validators.required, Validators.min(0.1)]],
      observaciones: ['']
    });
  }

  ngOnInit() {
    this.loadData();
    this.loadComerciantes();
    this.loadConceptos();
  }

  loadConceptos() {
    this.apiSvc.getConceptos().subscribe({
      next: (res) => this.conceptos = res.data
    });
  }

  onConceptoChange(event: any) {
    const id = event.target.value;
    const item = this.conceptos.find(c => c.id == id);
    if (item) {
      this.liquidarForm.patchValue({ monto: item.monto });
    }
  }

  openLiquidar(item: any) {
    this.selectedTramite = item;
    const descripcion = this.viewMode === 'view' ? 'Solicitante' : item.solicitante;
    this.liquidarForm.reset({
      concepto_id: null,
      monto: 0,
      observaciones: `Pago por derecho de trámite de Licencia - Exp: ${item.nro_expediente}`
    });
    this.showLiquidarModal = true;
  }

  closeLiquidar() {
    this.showLiquidarModal = false;
    this.selectedTramite = null;
  }

  confirmLiquidar() {
    if (this.liquidarForm.invalid) {
      this.liquidarForm.markAllAsTouched();
      return;
    }

    const val = this.liquidarForm.value;
    const payload = {
      tramite_id: this.selectedTramite.id,
      concepto_id: val.concepto_id,
      contribuyente_id: this.selectedTramite.comerciante_id || this.selectedTramite.solicitante,
      centro_costos_id: 'Licencias',
      fecha_emision: new Date().toISOString().split('T')[0],
      monto_total: val.monto,
      observaciones: val.observaciones
    };

    this.isSaving = true;
    this.preReciboSvc.create(payload as any).subscribe({
      next: (res) => {
        this.toast.success(`Pre-Recibo ${res.data.numero_correlativo} generado. Puede pagarlo en Caja.`);
        this.isSaving = false;
        this.closeLiquidar();
      },
      error: () => {
        this.toast.error('Error al generar pre-recibo');
        this.isSaving = false;
      }
    });
  }

  loadComerciantes() {
    this.apiSvc.getPadron().subscribe({
      next: (res: any) => this.comerciantesPadron = res.data
    });
  }

  onComercianteChange(event: any) {
    const id = event.target.value;
    const item = this.comerciantesPadron.find(c => c.id == id);
    if (item) {
      this.form.patchValue({
        solicitante: item.contribuyente,
        giro_negocio: item.giro
      });
    }
  }

  loadData() {
    this.apiSvc.getTramites().subscribe({
      next: (res) => {
        this.data = res.data;
      },
      error: () => this.toast.error('Error al cargar la lista de trámites')
    });
  }

  onAction(action: string, item?: any) {
    if (action === 'delete') {
      if (item) this.confirmDelete(item);
      return;
    }

    this.viewMode = action as any;
    this.selectedId = item ? item.id : null;
    this.form.enable();

    if (action === 'create') {
      this.form.reset({
        tipo_tramite: 'Definitiva de Funcionamiento',
        fase: 'Evaluación Técnica'
      });
      this.showModal = true;
    } else if (item) {
      this.form.patchValue(item);
      if (action === 'view') {
        this.form.disable();
      }
      this.showModal = true;
    }
  }

  confirmDelete(item: any) {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true, backdrop: 'static' });
    modalRef.componentInstance.title = 'Eliminar Expediente';
    modalRef.componentInstance.message = `¿Está seguro que desea eliminar el expediente Nº ${item.nro_expediente}?`;
    modalRef.componentInstance.detail = 'Esta acción desvinculará todos los registros asociados y no se puede deshacer.';
    modalRef.componentInstance.confirmText = 'Sí, eliminar';
    modalRef.componentInstance.confirmClass = 'btn-danger';
    modalRef.componentInstance.confirmIcon = 'fas fa-trash-alt';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.subsystem = 'comercializacion';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.executeDelete(item.id);
      }
    }, () => { });
  }

  private executeDelete(id: number) {
    this.apiSvc.deleteTramite(id).subscribe({
      next: (res: any) => {
        this.toast.success(res.message || 'Expediente eliminado correctamente');
        this.loadData();
      },
      error: () => {
        this.toast.error('No se pudo eliminar el expediente. Verifique dependencias.');
      }
    });
  }

  closeModal() {
    this.showModal = false;
    this.selectedId = null;
  }

  save() {
    if (this.form.valid) {
      this.isSaving = true;
      const request = this.selectedId
        ? this.apiSvc.updateTramite(this.selectedId, this.form.value)
        : this.apiSvc.createTramite(this.form.value);

      request.subscribe({
        next: (resp: any) => {
          this.toast.success(resp.message || 'Trámite procesado exitosamente');
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err: any) => {
          this.isSaving = false;
          const errorMsg = err?.error?.message || 'Error al guardar los datos del trámite';
          this.toast.error(errorMsg);
        }
      });
    } else {
      this.form.markAllAsTouched();
      this.toast.warning('Por favor complete los campos requeridos del formulario');
    }
  }

  getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      nro_expediente: item.nro_expediente,
      solicitante: item.solicitante,
      giro_negocio: item.giro_negocio,
      tipo_tramite: item.tipo_tramite,
      fase: item.fase
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_expediente', label: 'Expediente' },
      { key: 'solicitante', label: 'Solicitante' },
      { key: 'giro_negocio', label: 'Giro' },
      { key: 'tipo_tramite', label: 'Tipo' },
      { key: 'fase', label: 'Estado/Fase' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Trámites de Licencias de Funcionamiento'; }
  getExportFilename(): string { return 'tramites-licencias-' + new Date().getTime(); }
}
