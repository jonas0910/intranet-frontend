import { Component, OnInit, ViewChild, TemplateRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { Subject } from 'rxjs';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ComunicadosInstitucionalService, ModalMensaje } from '../../../services/comunicados-institucional.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { DataTableConfigService } from '../../../shared/components/datatable-config/datatable-config.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CrudActionsComponent } from '../../../shared/components/crud-actions/crud-actions.component';

@Component({
  selector: 'app-admin-modales',
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
  templateUrl: './admin-modales.component.html',
})
export class AdminModalesComponent implements OnInit, OnDestroy {
  @ViewChild('modalFormTemplate') modalFormTemplate!: TemplateRef<any>;
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  modales: ModalMensaje[] = [];
  loading = false;
  saving = false;
  editModal: Partial<ModalMensaje> | null = null;
  modalAEliminar: ModalMensaje | null = null;
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
    this.initDataTable();
    this.load();
  }

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

  load(): void {
    this.loading = true;
    this.svc.getModales().subscribe({
      next: (r) => {
        const data = r.data?.data ?? r.data ?? [];
        this.modales = Array.isArray(data) ? data : [];
        this.loading = false;
        this.triggerDataTable();
      },
      error: (err) => {
        this.toast.error(err?.error?.message || 'Error al cargar mensajes modales');
        this.loading = false;
      },
    });
  }

  openCreate(): void {
    this.editModal = {
      titulo: '',
      contenido: '',
      tipo_evento: 'general',
      prioridad: 'normal',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      mostrar_una_vez: false,
      activo: true,
    };
    this.openFormModal();
  }

  openEdit(m: ModalMensaje): void {
    this.editModal = {
      id: m.id,
      titulo: m.titulo,
      contenido: m.contenido ?? '',
      tipo_evento: m.tipo_evento || 'general',
      prioridad: m.prioridad || 'normal',
      fecha_inicio: (m.fecha_inicio && String(m.fecha_inicio).split('T')[0]) || '',
      fecha_fin: (m.fecha_fin && String(m.fecha_fin).split('T')[0]) || '',
      mostrar_una_vez: m.mostrar_una_vez ?? false,
      activo: m.activo ?? true,
    };
    this.openFormModal();
  }

  private openFormModal(): void {
    if (!this.modalFormTemplate) {
      this.toast.error('No se pudo abrir el formulario. Recargue la página.');
      return;
    }
    this.formModalRef = this.modalService.open(this.modalFormTemplate, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    this.formModalRef.result.catch(() => {
      this.editModal = null;
      this.formModalRef = null;
    });
  }

  cancelForm(): void {
    if (this.formModalRef) {
      this.formModalRef.dismiss();
      this.formModalRef = null;
    }
    this.editModal = null;
  }

  save(): void {
    if (!this.editModal) return;
    this.saving = true;
    const id = (this.editModal as any).id;
    const obs = id
      ? this.svc.updateModal(id, this.editModal)
      : this.svc.createModal(this.editModal);
    obs.subscribe({
      next: () => {
        this.saving = false;
        this.toast.success('Guardado correctamente');
        if (this.formModalRef) {
          this.formModalRef.close();
          this.formModalRef = null;
        }
        this.editModal = null;
        this.load();
      },
      error: (e) => {
        this.saving = false;
        this.toast.error(e?.error?.message || 'Error al guardar');
      },
    });
  }

  confirmDelete(m: ModalMensaje): void {
    this.modalAEliminar = m;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'comunicados';
    ref.componentInstance.title = 'Eliminar mensaje modal';
    ref.componentInstance.message = `¿Está seguro de eliminar «${m.titulo}»?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => this.doDelete(),
      () => { this.modalAEliminar = null; }
    );
  }

  doDelete(): void {
    if (!this.modalAEliminar) return;
    const id = this.modalAEliminar.id;
    this.modalAEliminar = null;
    this.svc.deleteModal(id).subscribe({
      next: () => {
        this.toast.success('Mensaje modal eliminado');
        this.modales = this.modales.filter(x => x.id !== id);
        this.triggerDataTable();
      },
      error: (e) => this.toast.error(e?.error?.message || 'Error al eliminar'),
    });
  }

  formatDate(d: string): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-PE');
  }

  getPrioridadBadgeClass(p: string): string {
    const map: Record<string, string> = { alta: 'badge-danger', normal: 'badge-info', baja: 'badge-secondary' };
    return map[p] || 'badge-secondary';
  }
}
