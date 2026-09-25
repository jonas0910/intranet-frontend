import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

import { PreReciboService } from '../../../../services/comercializacion/pre-recibos.service';

@Component({
  selector: 'app-constancias',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './constancias.component.html',
  styleUrl: './constancias.component.css'
})
export class ConstanciasComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Constancias y Ceses',
    icon: 'fas fa-file-signature',
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'view' = 'create';
  selectedId: number | null = null;
  currentFilter: 'TODO' | 'LICENCIA' | 'CERTIFICADO' | 'DUPLICADO' | 'AMPLIACION' | 'CESE' = 'TODO';
  comerciantesPadron: any[] = [];

  // Liquidación de Pagos
  conceptos: any[] = [];
  showLiquidarModal = false;
  selectedConstancia: any = null;
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
      nro_constancia: ['', Validators.required],
      tipo: ['LICENCIA', Validators.required],
      solicitante: ['', Validators.required],
      direccion: [''],
      giro: [''],
      nro_expediente: [''],
      fecha_emision: [new Date().toISOString().split('T')[0], Validators.required],
      observaciones: ['']
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

  loadData() {
    this.apiSvc.getConstancias().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar constancias')
    });
  }

  loadConceptos() {
    this.apiSvc.getConceptos().subscribe({
      next: (res) => this.conceptos = res.data
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
        giro: item.giro,
        direccion: item.direccion
      });
    }
  }

  onConceptoChange(event: any) {
    const id = event.target.value;
    const item = this.conceptos.find(c => c.id == id);
    if (item) {
      this.liquidarForm.patchValue({ monto: item.monto });
    }
  }

  openLiquidar(item: any) {
    this.selectedConstancia = item;
    this.liquidarForm.reset({
      concepto_id: null,
      monto: 0,
      observaciones: `Liquidación por ${item.tipo}: ${item.nro_constancia}`
    });
    this.showLiquidarModal = true;
  }

  closeLiquidar() {
    this.showLiquidarModal = false;
    this.selectedConstancia = null;
  }

  confirmLiquidar() {
    if (this.liquidarForm.invalid) {
      this.liquidarForm.markAllAsTouched();
      return;
    }

    const val = this.liquidarForm.value;
    const payload = {
      concepto_id: val.concepto_id,
      contribuyente_id: this.selectedConstancia.comerciante_id || this.selectedConstancia.solicitante,
      centro_costos_id: 'Licencias',
      fecha_emision: new Date().toISOString().split('T')[0],
      monto_total: val.monto,
      observaciones: val.observaciones
    };

    this.isSaving = true;
    this.preReciboSvc.create(payload as any).subscribe({
      next: (res) => {
        this.toast.success(`Pre-Recibo ${res.data.numero_correlativo} generado.`);
        this.isSaving = false;
        this.closeLiquidar();
      },
      error: () => {
        this.toast.error('Error al generar pre-recibo');
        this.isSaving = false;
      }
    });
  }

  get filteredData() {
    if (this.currentFilter === 'TODO') return this.data;
    return this.data.filter(item => item.tipo === this.currentFilter);
  }

  setFilter(filter: 'TODO' | 'LICENCIA' | 'CERTIFICADO' | 'DUPLICADO' | 'AMPLIACION' | 'CESE') {
    this.currentFilter = filter;
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
        tipo: 'LICENCIA',
        fecha_emision: new Date().toISOString().split('T')[0]
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
    modalRef.componentInstance.title = 'Eliminar Registro';
    modalRef.componentInstance.message = `¿Está seguro de eliminar la constancia ${item.nro_constancia}?`;
    modalRef.componentInstance.confirmText = 'Sí, eliminar';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.subsystem = 'comercializacion';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.apiSvc.deleteConstancia(item.id).subscribe({
          next: () => {
            this.toast.success('Registro eliminado correctamente');
            this.loadData();
          },
          error: () => this.toast.error('Error al eliminar')
        });
      }
    }, () => { });
  }

  printLicencia(item: any) {
    this.toast.info('Generando documento oficial...', 'Procesando');

    switch (item.tipo) {
      case 'LICENCIA':
      case 'DUPLICADO':
      case 'AMPLIACION':
        this.crudExport.exportLicenciaFuncionamientoPdf(item);
        break;
      case 'CERTIFICADO':
        this.crudExport.exportCertificadoItsePdf(item);
        break;
      case 'CESE':
        this.crudExport.exportConstanciaCesePdf(item);
        break;
      default:
        this.crudExport.exportLicenciaFuncionamientoPdf(item);
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedId = null;
  }

  save() {
    if (this.form.valid) {
      this.isSaving = true;
      const request = this.selectedId
        ? this.apiSvc.updateConstancia(this.selectedId, this.form.value)
        : this.apiSvc.createConstancia(this.form.value);

      request.subscribe({
        next: (resp) => {
          this.toast.success(resp.message);
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: (err) => {
          this.isSaving = false;
          this.toast.error(err.error?.message || 'Error al procesar solicitud');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  // Export functionality
  getExportData(): Record<string, unknown>[] {
    return this.filteredData.map(item => ({
      nro_constancia: item.nro_constancia,
      tipo: item.tipo,
      solicitante: item.solicitante,
      direccion: item.direccion,
      giro: item.giro,
      nro_expediente: item.nro_expediente,
      fecha_emision: item.fecha_emision
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_constancia', label: 'Nº Constancia' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'solicitante', label: 'Solicitante' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'giro', label: 'Giro' },
      { key: 'nro_expediente', label: 'Expediente' },
      { key: 'fecha_emision', label: 'Fecha Emisión' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Constancias y Ceses'; }
  getExportFilename(): string { return 'constancias-' + new Date().getTime(); }
}
