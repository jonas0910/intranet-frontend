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

@Component({
  selector: 'app-itse',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './itse.component.html',
  styleUrl: './itse.component.css'
})
export class ItseComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Inspectoría ITSE',
    icon: 'fas fa-hard-hat',
  };

  data: any[] = [];
  form: FormGroup;
  showModal = false;
  isSaving = false;
  viewMode: 'create' | 'edit' | 'view' = 'create';
  selectedId: number | null = null;
  currentTab: 'PENDIENTE' | 'EVALUADO' | 'CERRADO' = 'PENDIENTE';

  constructor(
    private fb: FormBuilder,
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      nro_expediente: ['', Validators.required],
      solicitante: ['', Validators.required],
      direccion: ['', Validators.required],
      giro: [''],
      inspector: ['', Validators.required],
      fecha_inspeccion: [new Date().toISOString().split('T')[0], Validators.required],
      resultado: ['OBSERVADO', Validators.required],
      nivel_riesgo: ['MEDIO'],
      vigencia_inicio: [null],
      vigencia_fin: [null],
      observaciones: [''],
      estado: ['PENDIENTE']
    });
  }

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    this.apiSvc.getItse().subscribe({
      next: (res) => this.data = res.data,
      error: () => this.toast.error('Error al cargar evaluaciones ITSE')
    });
  }

  get filteredData() {
    return this.data.filter(item => item.estado === this.currentTab);
  }

  getCount(status: string) {
    return this.data.filter(item => item.estado === status).length;
  }

  setTab(tab: 'PENDIENTE' | 'EVALUADO' | 'CERRADO') {
    this.currentTab = tab;
  }

  getExportData(): Record<string, unknown>[] {
    return this.filteredData.map(item => ({
      nro_expediente: item.nro_expediente,
      solicitante: item.solicitante,
      direccion: item.direccion,
      inspector: item.inspector,
      fecha_inspeccion: item.fecha_inspeccion,
      resultado: item.resultado,
      estado: item.estado
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nro_expediente', label: 'Expediente' },
      { key: 'solicitante', label: 'Solicitante' },
      { key: 'direccion', label: 'Dirección' },
      { key: 'inspector', label: 'Inspector' },
      { key: 'fecha_inspeccion', label: 'Fecha' },
      { key: 'resultado', label: 'Resultado' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string {
    const titles = {
      'PENDIENTE': 'Reporte de Inspecciones Pendientes ITSE',
      'EVALUADO': 'Reporte de Informes Concluidos ITSE',
      'CERRADO': 'Reporte de Resoluciones Emitidas ITSE'
    };
    return titles[this.currentTab];
  }

  getExportFilename(): string { return `itse-${this.currentTab.toLowerCase()}-` + new Date().getTime(); }

  onAction(action: string, item?: any) {
    this.viewMode = action as any;
    this.selectedId = item ? item.id : null;
    this.form.enable();

    if (action === 'create') {
      this.form.reset({
        fecha_inspeccion: new Date().toISOString().split('T')[0],
        resultado: 'OBSERVADO',
        nivel_riesgo: 'MEDIO',
        estado: this.currentTab
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

  closeModal() {
    this.showModal = false;
    this.selectedId = null;
  }

  save() {
    if (this.viewMode === 'view') return;

    if (this.form.valid) {
      this.isSaving = true;
      const request = this.selectedId
        ? this.apiSvc.updateItse(this.selectedId, this.form.value)
        : this.apiSvc.createItse(this.form.value);

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

  deleteItem(id: number) {
    const item = this.data.find(d => d.id === id);
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true, backdrop: 'static' });
    modalRef.componentInstance.title = 'Eliminar Registro ITSE';
    modalRef.componentInstance.message = `¿Está seguro de eliminar el expediente ${item?.nro_expediente || ''}?`;
    modalRef.componentInstance.detail = 'Esta acción eliminará permanentemente la evaluación o inspección técnica.';
    modalRef.componentInstance.confirmText = 'Sí, eliminar';
    modalRef.componentInstance.confirmClass = 'btn-danger';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.subsystem = 'comercializacion';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.apiSvc.deleteItse(id).subscribe({
          next: (resp) => {
            this.toast.success(resp.message);
            this.loadData();
          },
          error: () => this.toast.error('Error al eliminar')
        });
      }
    }, () => { });
  }
}
