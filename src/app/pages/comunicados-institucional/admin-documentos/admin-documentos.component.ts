import { Component, OnInit, ViewChild, ElementRef, TemplateRef, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import {
  ComunicadosInstitucionalService,
  CategoriaDocumento,
  Documento,
} from '../../../services/comunicados-institucional.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { DataTableConfigService } from '../../../shared/components/datatable-config/datatable-config.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CrudActionsComponent } from '../../../shared/components/crud-actions/crud-actions.component';

@Component({
  selector: 'app-admin-documentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    SystemLayoutComponent,
    NgbModalModule,
    DataTablesModule,
    CrudActionsComponent,
  ],
  templateUrl: './admin-documentos.component.html',
})
export class AdminDocumentosComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('documentFormModal') documentFormModal!: TemplateRef<any>;
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  categorias: CategoriaDocumento[] = [];
  documentos: Documento[] = [];
  loading = false;
  saving = false;
  editDoc: Partial<Documento> & { archivo?: File } | null = null;
  documentoAEliminar: Documento | null = null;
  private formModalRef: any = null;

  dtOptions: any = {};
  dtTrigger = new Subject<any>();

  constructor(
    private svc: ComunicadosInstitucionalService,
    private designSystem: DesignSystemService,
    private dtConfig: DataTableConfigService,
    private toast: ToastService,
    private modalService: NgbModal
  ) {}

  get cv(): CrudViewConfig {
    return this.designSystem.getCrudViewFor('comunicados');
  }

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('comunicados');
    this.loadCategorias();
    this.initDataTable();
    this.load();
  }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      try { this.dtTrigger.complete(); } catch (_) {}
    }
  }

  initDataTable(): void {
    this.dtOptions = this.dtConfig.getCompactOptions({
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50], [5, 10, 25, 50]],
      order: [[0, 'asc']],
      columnDefs: [{ targets: -1, orderable: false, searchable: false }],
    });
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) {}
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }

  loadCategorias(): void {
    this.svc.getCategorias(false).subscribe({
      next: (r) => (this.categorias = r.data || []),
    });
  }

  load(): void {
    this.loading = true;
    this.svc.getDocumentos({}).subscribe({
      next: (r) => {
        this.documentos = Array.isArray(r.data) ? r.data : [];
        this.loading = false;
        this.triggerDataTable();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Error al cargar documentos');
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editDoc = {
      titulo: '',
      descripcion: '',
      categoria_id: undefined,
      tipo: 'general',
      orden: 0,
      activo: true,
    };
    this.openFormModal();
  }

  openEdit(d: Documento): void {
    this.editDoc = {
      id: d.id,
      titulo: d.titulo,
      descripcion: d.descripcion ?? '',
      categoria_id: d.categoria_id ?? d.categoria?.id,
      tipo: d.tipo || 'general',
      orden: d.orden ?? 0,
      activo: d.activo ?? true,
    };
    this.openFormModal();
  }

  private openFormModal(): void {
    if (!this.documentFormModal) {
      this.toast.error('No se pudo abrir el formulario. Recargue la página.');
      return;
    }
    this.formModalRef = this.modalService.open(this.documentFormModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    this.formModalRef.result.catch(() => {
      this.editDoc = null;
      this.formModalRef = null;
    });
  }

  cancelForm(): void {
    if (this.formModalRef) {
      this.formModalRef.dismiss();
      this.formModalRef = null;
    }
    this.editDoc = null;
  }

  onFileSelect(e: Event): void {
    const input = e.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (file && this.editDoc) {
      (this.editDoc as any).archivo = file;
    }
  }

  save(): void {
    if (!this.editDoc) return;
    const id = (this.editDoc as any).id as number | undefined;
    const file = (this.editDoc as any).archivo as File | undefined;

    if (id) {
      this.saving = true;
      if (file) {
        const fd = new FormData();
        fd.append('titulo', (this.editDoc.titulo ?? '').toString());
        fd.append('descripcion', (this.editDoc.descripcion ?? '').toString());
        fd.append('tipo', (this.editDoc.tipo ?? 'general').toString());
        fd.append('orden', String(this.editDoc.orden ?? 0));
        fd.append('activo', (this.editDoc.activo ?? true) ? '1' : '0');
        if (this.editDoc.categoria_id != null) fd.append('categoria_id', String(this.editDoc.categoria_id));
        fd.append('archivo', file);
        this.svc.updateDocumento(id, fd).subscribe({
          next: (res) => this.onSaveOk(res?.data, id),
          error: (e) => this.onSaveError(e),
        });
      } else {
        this.svc.updateDocumento(id, {
          titulo: this.editDoc.titulo,
          descripcion: this.editDoc.descripcion,
          categoria_id: this.editDoc.categoria_id ?? undefined,
          tipo: this.editDoc.tipo,
          orden: this.editDoc.orden,
          activo: this.editDoc.activo,
        }).subscribe({
          next: (res) => this.onSaveOk(res?.data, id),
          error: (e) => this.onSaveError(e),
        });
      }
    } else {
      if (!file) {
        this.toast.warning('Seleccione un archivo PDF');
        return;
      }
      this.saving = true;
      const fd = new FormData();
      fd.append('titulo', (this.editDoc.titulo ?? '').toString());
      fd.append('descripcion', (this.editDoc.descripcion ?? '').toString());
      fd.append('tipo', (this.editDoc.tipo ?? 'general').toString());
      fd.append('orden', String(this.editDoc.orden ?? 0));
      fd.append('activo', (this.editDoc.activo ?? true) ? '1' : '0');
      if (this.editDoc.categoria_id != null) fd.append('categoria_id', String(this.editDoc.categoria_id));
      fd.append('archivo', file);
      this.svc.createDocumento(fd).subscribe({
        next: (res) => this.onSaveOk(res?.data),
        error: (e) => this.onSaveError(e),
      });
    }
  }

  private onSaveError(e: any): void {
    this.saving = false;
    const msg = e?.error?.message || e?.error?.errors?.titulo?.[0] || 'Error al guardar';
    this.toast.error(msg);
  }

  private onSaveOk(_saved?: Documento, _updatedId?: number): void {
    this.saving = false;
    this.toast.success('Guardado correctamente');
    if (this.formModalRef) {
      this.formModalRef.close();
      this.formModalRef = null;
    }
    this.editDoc = null;
    this.load();
  }

  confirmDelete(d: Documento): void {
    this.documentoAEliminar = d;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'comunicados';
    ref.componentInstance.title = 'Eliminar documento';
    ref.componentInstance.message = `¿Está seguro de eliminar «${d.titulo}»?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => this.doDelete(),
      () => { this.documentoAEliminar = null; }
    );
  }

  doDelete(): void {
    if (!this.documentoAEliminar) return;
    const id = this.documentoAEliminar.id;
    this.documentoAEliminar = null;
    this.svc.deleteDocumento(id).subscribe({
      next: () => {
        this.toast.success('Documento eliminado');
        this.documentos = this.documentos.filter(d => d.id !== id);
        this.triggerDataTable();
      },
      error: (e) => this.toast.error(e?.error?.message || 'Error al eliminar'),
    });
  }

  delete(d: Documento): void {
    this.confirmDelete(d);
  }

  getTipoLabel(tipo: string): string {
    const m: Record<string, string> = { rit: 'RIT', directiva: 'Directiva', manual: 'Manual', general: 'Documento' };
    return m[tipo || ''] || tipo || 'Documento';
  }
}
