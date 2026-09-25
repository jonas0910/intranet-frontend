import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';

import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-padron',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './padron.component.html',
  styleUrl: './padron.component.scss'
})
export class PadronComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Padrón de Comerciantes',
    icon: 'fas fa-store',
    actions: { create: { label: 'Nuevo Comerciante', icon: 'fas fa-plus' } }
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  showHistoryModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'history' = 'create';
  selectedId: number | null = null;
  historyData: any = null;

  getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      nro_puesto: item.nro_puesto,
      contribuyente: item.contribuyente,
      mercado: item.mercado,
      giro: item.giro,
      estado_pago: item.estado_pago
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_puesto', label: 'Nº Puesto' },
      { key: 'contribuyente', label: 'Contribuyente' },
      { key: 'mercado', label: 'Mercado' },
      { key: 'giro', label: 'Giro' },
      { key: 'estado_pago', label: 'Estado Pago' }
    ];
  }

  getExportTitle(): string { return 'Padrón de Comerciantes - Notaria'; }
  getExportFilename(): string { return 'padron-comerciantes-' + new Date().getTime(); }


  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      nro_puesto: ['', Validators.required],
      contribuyente: ['', Validators.required],
      mercado: ['', Validators.required],
      giro: ['', Validators.required],
      estado_pago: ['AL DÍA', Validators.required]
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiSvc.getPadron().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar Padrón de comerciantes')
    });
  }

  onAction(action: string, item?: any) {
    this.viewMode = action as any;
    this.selectedId = item ? item.id : null;

    if (action === 'create') {
      this.form.reset({ estado_pago: 'AL DÍA' });
      this.showModal = true;
    } else if (action === 'edit' && item) {
      this.form.patchValue(item);
      this.showModal = true;
    } else if (action === 'history' && item) {
      this.loadHistory(item.id);
    } else if (action === 'delete' && item) {
      this.confirmDelete(item);
    }
  }

  loadHistory(id: number) {
    this.apiSvc.getPadronHistorial(id).subscribe({
      next: (res) => {
        this.historyData = res.data;
        this.showHistoryModal = true;
      },
      error: () => this.toast.error('Error al cargar historial')
    });
  }

  confirmDelete(item: any) {
    if (confirm(`¿Está seguro de eliminar a "${item.contribuyente}" del padrón?`)) {
      this.apiSvc.deletePadron(item.id).subscribe({
        next: (res) => {
          this.toast.success(res.message);
          this.loadData();
        },
        error: () => this.toast.error('Error al eliminar registro')
      });
    }
  }

  closeModal() {
    this.showModal = false;
    this.showHistoryModal = false;
    this.selectedId = null;
  }

  save() {
    if (this.form.valid) {
      this.isSaving = true;
      const request = this.selectedId
        ? this.apiSvc.updatePadron(this.selectedId, this.form.value)
        : this.apiSvc.createPadron(this.form.value);

      request.subscribe({
        next: (resp) => {
          this.toast.success(resp.message);
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Error al procesar registro');
          this.isSaving = false;
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
