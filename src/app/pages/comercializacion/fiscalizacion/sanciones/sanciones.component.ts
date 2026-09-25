import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';

import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';

import { PreReciboService } from '../../../../services/comercializacion/pre-recibos.service';

@Component({
  selector: 'app-sanciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './sanciones.component.html',
  styleUrl: './sanciones.component.scss'
})
export class SancionesComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Sanciones (CUIS/RAS)',
    icon: 'fas fa-balance-scale',
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'view' = 'create';
  selectedId: number | null = null;
  comerciantesPadron: any[] = [];

  // Liquidar Pago (acción de fiscalización - generar pre-recibo para la multa)
  conceptos: any[] = [];
  showLiquidarModal = false;
  selectedSancion: any = null;
  liquidarForm: FormGroup;

  getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      nro_resolucion: item.nro_resolucion,
      infraccion: item.infraccion,
      infractor: item.infractor,
      monto_medida: item.monto_medida,
      estado: item.estado
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_resolucion', label: 'Nº Resolución' },
      { key: 'infraccion', label: 'Infracción' },
      { key: 'infractor', label: 'Infractor' },
      { key: 'monto_medida', label: 'Monto/Medida' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Sanciones Administrativas'; }
  getExportFilename(): string { return 'sanciones-comercializacion-' + new Date().getTime(); }

  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private preReciboSvc: PreReciboService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      comerciante_id: [null],
      nro_resolucion: ['', Validators.required],
      infraccion: ['', Validators.required],
      infractor: ['', Validators.required],
      monto_medida: ['', Validators.required],
      estado: ['NOTIFICADA', Validators.required]
    });

    this.liquidarForm = this.fb.group({
      concepto_id: [null],
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
      next: (res) => this.conceptos = res.data || res || []
    });
  }

  onConceptoChange(event: any) {
    const id = event.target.value;
    const item = this.conceptos.find((c: any) => c.id == id);
    if (item && item.monto) {
      this.liquidarForm.patchValue({ monto: item.monto });
    }
  }

  openLiquidar(item: any) {
    this.selectedSancion = item;
    const monto = this.parseMonto(item.monto_medida);
    this.liquidarForm.reset({
      concepto_id: null,
      monto: monto > 0 ? monto : null,
      observaciones: `Pago de multa/sanción - Res. Nº ${item.nro_resolucion} - ${item.infraccion || ''}`
    });
    this.showLiquidarModal = true;
  }

  private parseMonto(val: any): number {
    if (val == null || val === '') return 0;
    if (typeof val === 'number') return val;
    const s = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : n;
  }

  closeLiquidar() {
    this.showLiquidarModal = false;
    this.selectedSancion = null;
  }

  confirmLiquidar() {
    if (this.liquidarForm.invalid) {
      this.liquidarForm.markAllAsTouched();
      return;
    }
    const val = this.liquidarForm.value;
    const payload = {
      contribuyente_id: this.selectedSancion.comerciante_id || this.selectedSancion.infractor,
      centro_costos_id: 'Fiscalización',
      fecha_emision: new Date().toISOString().split('T')[0],
      monto_total: val.monto,
      observaciones: val.observaciones || `Multa Res. ${this.selectedSancion.nro_resolucion}`
    };

    this.isSaving = true;
    this.preReciboSvc.create(payload as any).subscribe({
      next: (res: any) => {
        this.toast.success(`Pre-Recibo ${res.data?.numero_correlativo || ''} generado. Puede cobrarlo en Caja.`);
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
      next: (res) => this.comerciantesPadron = res.data
    });
  }

  onComercianteChange(event: any) {
    const id = event.target.value;
    const item = this.comerciantesPadron.find(c => c.id == id);
    if (item) {
      this.form.patchValue({
        infractor: item.contribuyente
      });
    }
  }

  loadData() {
    this.apiSvc.getSanciones().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar listado de sanciones')
    });
  }

  onAction(action: string, item?: any) {
    this.viewMode = action as any;
    this.selectedId = item ? item.id : null;
    this.form.enable();

    if (action === 'create') {
      this.form.reset({ estado: 'NOTIFICADA' });
      this.showModal = true;
    } else if (item) {
      this.form.patchValue(item);
      if (action === 'view') {
        this.form.disable();
        (this as any).crudExport.exportResolucionSancionPdf(item);
      }
      this.showModal = true;
    }
  }

  closeModal() {
    this.showModal = false;
    this.selectedId = null;
  }

  save() {
    if (this.viewMode === 'view') return;

    if (this.form.valid) {
      this.isSaving = true;
      const request = this.selectedId
        ? this.apiSvc.updateSancion(this.selectedId, this.form.value)
        : this.apiSvc.createSancion(this.form.value);

      request.subscribe({
        next: (resp) => {
          this.toast.success(resp.message);
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Error al procesar sanción');
          this.isSaving = false;
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
