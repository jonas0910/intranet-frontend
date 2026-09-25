import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CensoPoblacionalService, Evento, Responsable } from '../services/censo-poblacional.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

declare var $: any;

@Component({
  selector: 'app-censo-eventos',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, DataTablesModule, SystemLayoutComponent, RouterModule, ConfirmDialogComponent],
  templateUrl: './censo-eventos.component.html',
  styles: [`
    #eventosTable thead th { font-weight: 600; border-bottom: 2px solid #dee2e6; vertical-align: middle; }
    #eventosTable tbody td { vertical-align: middle; }
    .btn-group-sm .btn { padding: 0.25rem 0.5rem; }
    .badge { min-width: 80px; display: inline-block; text-align: center; }
  `]
})
export class CensoEventosComponent implements OnInit {
  cv!: CrudViewConfig;

  eventos: Evento[] = [];
  responsables: Responsable[] = [];
  isEditing = false;
  saving = false;
  deleting = false;
  loading = false;
  form: FormGroup;
  eventoAEliminar: Evento | null = null;

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  mostrarTabla = true;

  // Modal crear/editar
  @ViewChild('eventoModal') eventoModalRef!: ElementRef;
  private modal: any;

  constructor(
    private censoService: CensoPoblacionalService,
    private fb: FormBuilder,
    private toast: ToastService,
    private dsService: DesignSystemService,
    private modalService: NgbModal
  ) {
    this.form = this.fb.group({
      id_evento: [null],
      nombre_evento: ['', Validators.required],
      fecha: [new Date().toISOString().split('T')[0], Validators.required],
      estado: ['Activo'],
      ids_responsables: [[]]
    });
  }

  ngOnInit() {
    this.cv = this.dsService.getCrudViewFor('censo-poblacional');
    this.inicializarDataTable();
    this.loadData();
    this.loadResponsables();
  }

  loadResponsables() {
    this.censoService.getResponsables().subscribe(res => this.responsables = res.data);
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  inicializarDataTable() {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[2, 'desc']]
    };
  }

  loadData() {
    if (this.eventos.length === 0) {
      this.loading = true;
    }
    this.censoService.getEventos().subscribe({
      next: (res) => {
        this.eventos = res.data;
        this.triggerDataTable();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private triggerDataTable() {
    this.mostrarTabla = false;
    if (this.dtElement && this.dtElement.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        this.reconstruirTabla();
      }).catch(() => {
        this.reconstruirTabla();
      });
    } else {
      this.reconstruirTabla();
    }
  }

  private reconstruirTabla() {
    setTimeout(() => {
      this.mostrarTabla = true;
      setTimeout(() => {
        this.safeDtTriggerNext();
      }, 150);
    }, 10);
  }

  private openBootstrapModal(el: ElementRef): any {
    const bootstrap = (window as any).bootstrap;
    if (bootstrap && bootstrap.Modal) {
      const instance = new bootstrap.Modal(el.nativeElement);
      instance.show();
      return instance;
    } else {
      $(el.nativeElement).modal('show');
      return null;
    }
  }

  private hideBootstrapModal(instance: any, el: ElementRef): void {
    if (instance && instance.hide) {
      instance.hide();
    } else {
      $(el.nativeElement).modal('hide');
    }
  }

  openModal(evento: Evento | null = null) {
    this.isEditing = !!evento;
    if (evento) {
      this.form.patchValue(evento);
      if (evento.responsables) {
        this.form.get('ids_responsables')?.setValue(evento.responsables.map(r => r.id));
      } else {
        this.form.get('ids_responsables')?.setValue([]);
      }
    } else {
      this.form.reset({
        fecha: new Date().toISOString().split('T')[0],
        estado: 'Activo',
        ids_responsables: []
      });
    }
    setTimeout(() => {
      this.modal = this.openBootstrapModal(this.eventoModalRef);
      this.initSelect2Responsables();
    }, 0);
  }

  initSelect2Responsables(): void {
    if (typeof $ === 'undefined' || !this.eventoModalRef?.nativeElement) return;
    const $modal = $(this.eventoModalRef.nativeElement);
    const $select = $modal.find('#ids_responsables_select');
    if ($select.length === 0) return;
    try {
      if ($select.data('select2')) $select.select2('destroy');
    } catch (_) { }

    const opts = this.dsService.getSelect2Options({
      dropdownParent: $modal,
      allowClear: true,
      placeholder: 'Seleccione responsables',
      multiple: true
    } as any);

    $select.select2(opts).on('change', (e: any) => {
      const val = $(e.target).val();
      this.form.get('ids_responsables')?.setValue(val ? val.map((id: any) => +id) : []);
    });

    const currentVal = this.form.get('ids_responsables')?.value;
    $select.val(currentVal || []).trigger('change.select2');

    const sizeClass = this.dsService.getSelect2InputSizeClass('censo-poblacional');
    setTimeout(() => {
      $select.next('.select2-container').find('.select2-selection').addClass(sizeClass);
    }, 0);
  }

  closeModal() {
    this.hideBootstrapModal(this.modal, this.eventoModalRef);
  }

  save() {
    if (this.form.invalid) return;
    this.saving = true;
    this.censoService.saveEvento(this.form.value).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success(this.isEditing ? 'Evento actualizado' : 'Evento programado');
          this.closeModal();
          this.loadData();
        } else {
          this.toast.error(res.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: () => {
        this.toast.error('Error de conexión');
        this.saving = false;
      }
    });
  }

  confirmDelete(evento: Evento) {
    this.eventoAEliminar = evento;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'censo-poblacional';
    ref.componentInstance.title = 'Eliminar evento';
    ref.componentInstance.message = `¿Está seguro de eliminar el evento «${evento.nombre_evento}»?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => this.confirmDeleteAction(),
      () => { this.eventoAEliminar = null; }
    );
  }

  confirmDeleteAction() {
    if (!this.eventoAEliminar) return;
    this.deleting = true;
    this.censoService.deleteEvento(this.eventoAEliminar.id_evento).subscribe({
      next: (res) => {
        if (res.success) {
          this.toast.success('Evento eliminado');
          this.eventoAEliminar = null;
          this.loadData();
        } else {
          this.toast.error('No se pudo eliminar el evento');
        }
        this.deleting = false;
      },
      error: () => {
        this.toast.error('Error de conexión');
        this.deleting = false;
      }
    });
  }
}
