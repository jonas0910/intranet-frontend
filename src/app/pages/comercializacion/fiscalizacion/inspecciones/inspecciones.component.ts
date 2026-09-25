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
  selector: 'app-inspecciones',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './inspecciones.component.html',
  styleUrl: './inspecciones.component.scss'
})
export class InspeccionesComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Inspecciones Sanitarias',
    icon: 'fas fa-stethoscope',
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'view' = 'create';
  selectedId: number | null = null;
  comerciantesPadron: any[] = [];

  getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      nro_acta: item.nro_acta,
      comerciante: item.comerciante,
      inspector: item.inspector,
      fecha: item.fecha,
      resultado: item.resultado,
      estado: item.estado
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_acta', label: 'Nº Acta' },
      { key: 'comerciante', label: 'Comerciante' },
      { key: 'inspector', label: 'Inspector' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'resultado', label: 'Resultado' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Inspecciones Sanitarias'; }
  getExportFilename(): string { return 'inspecciones-sanitarias-' + new Date().getTime(); }

  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      comerciante_id: [null],
      nro_acta: ['', Validators.required],
      comerciante: ['', Validators.required],
      inspector: ['', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      resultado: ['SATISFACTORIO', Validators.required],
      observaciones: ['']
    });
  }

  ngOnInit() {
    this.loadData();
    this.loadComerciantes();
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
        comerciante: item.contribuyente
      });
    }
  }

  loadData() {
    this.apiSvc.getInspecciones().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar inspecciones')
    });
  }

  onAction(action: string, item?: any) {
    this.viewMode = action as any;
    this.selectedId = item ? item.id : null;

    this.form.enable();

    if (action === 'create') {
      this.form.reset({
        fecha: new Date().toISOString().split('T')[0],
        resultado: 'SATISFACTORIO'
      });
      this.showModal = true;
    } else if (item) {
      this.form.patchValue(item);
      if (action === 'view') {
        this.form.disable();
        (this as any).crudExport.exportInspeccionSanitariaPdf(item);
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
        ? this.apiSvc.updateInspeccion(this.selectedId, this.form.value)
        : this.apiSvc.createInspeccion(this.form.value);

      request.subscribe({
        next: (resp) => {
          this.toast.success(resp.message);
          this.isSaving = false;
          this.closeModal();
          this.loadData();
        },
        error: () => {
          this.toast.error('Error al procesar solicitud');
          this.isSaving = false;
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }
}
