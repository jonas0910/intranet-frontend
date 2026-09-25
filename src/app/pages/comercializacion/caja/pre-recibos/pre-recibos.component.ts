import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { PreReciboService, PreRecibo } from '../../../../services/comercializacion/pre-recibos.service';
import { ToastService } from '../../../../services/toast.service';
import { DataTablesModule } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { DesignSystemService } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-pre-recibos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DataTablesModule, SystemLayoutComponent],
  templateUrl: './pre-recibos.component.html',
  styleUrl: './pre-recibos.component.scss'
})
export class PreRecibosComponent extends CrudListExportBase implements OnInit, OnDestroy {
  // Configuración del Crud (solo UI labels)
  viewConfig: any = {
    title: 'Pre-Recibos',
    subtitle: 'Emisión de pre-recibos de ingresos',
    icon: 'fas fa-file-invoice-dollar',
    moduleColor: 'success',
    actions: {
      create: { label: 'Nuevo Pre-Recibo', icon: 'fas fa-plus' },
      print: { label: 'Imprimir', icon: 'fas fa-print' }
    }
  };

  dtOptions: any = {};
  data: any[] = [];

  form: FormGroup;
  showModal = false;
  showDetailModal = false;
  selectedItem: any = null;
  isSaving = false;

  // Tabs
  activeTab: 'emision' | 'caja' | 'recibos' | 'cierre' = 'emision';

  // Recibos (Pagados/Anulados/Reembolsados)
  dtOptionsRecibos: any = {};
  recibosData: any[] = [];
  filtroRecibosCentro: string = '';
  filtroRecibosEstado: string = '';

  // Caja
  cajaSearchQuery: string = '';
  cajaResult: any = null;
  cajaError: string | null = null;
  isSearching: boolean = false;
  isPaying: boolean = false;

  // Reportes
  reporteFechaInicio: string = new Date().toISOString().split('T')[0];
  reporteFechaFin: string = new Date().toISOString().split('T')[0];
  isGeneratingReport: boolean = false;
  reporteData: any = null;

  // Cierre de caja (desde tabla recibos) - usado en pestaña Cierre de Caja
  reporteRecibosFechaInicio: string = new Date().toISOString().split('T')[0];
  reporteRecibosFechaFin: string = new Date().toISOString().split('T')[0];
  isGeneratingReporteRecibos: boolean = false;
  reporteRecibosData: any = null;
  reporteRecibosObservaciones: string = '';
  isGuardandoCierre: boolean = false;

  // Listado de cierres de caja guardados
  cierresCajaList: any[] = [];
  isCargandoCierres: boolean = false;

  constructor(
    private fb: FormBuilder,
    private preRecibosService: PreReciboService,
    private toastService: ToastService,
    private designSystem: DesignSystemService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.form = this.fb.group({
      contribuyente_id: ['', Validators.required],
      centro_costos_id: ['', Validators.required],
      fecha_emision: [new Date().toISOString().split('T')[0], Validators.required],
      monto_total: ['', [Validators.required, Validators.min(0.1)]],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    console.log('🚀 PreRecibosComponent: Inicializando módulo...');
    // Set subsystem for design system
    this.designSystem.setActiveSubsystem('comercializacion');

    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: true,
      processing: true,
      ordering: false,
      autoWidth: false,
      retrieve: true,
      columns: [
        {
          data: 'numero_correlativo',
          title: 'Nº Pre-Recibo',
          render: (data: any, type: string, row: any) => {
            if (type !== 'display') return data || '';
            let html = '<strong class="text-primary">' + (row.numero_correlativo || '') + '</strong>';
            if (row.numero_recibo) {
              html += '<div class="small text-success">REC: ' + row.numero_recibo + '</div>';
            }
            return html;
          }
        },
        { data: 'contribuyente_nombre', title: 'Contribuyente', defaultContent: '', render: (data: any, type: string, row: any) => row.contribuyente_nombre || row.contribuyente_id || '' },
        { data: 'centro_costos_id', title: 'Oficina/Ruta', className: 'text-center', defaultContent: '' },
        { data: 'fecha_emision', title: 'Fecha', className: 'text-center', defaultContent: '', render: (v: any) => v ? (new Date(v).toLocaleDateString('es-PE')) : '' },
        { data: 'monto_total', title: 'Monto', className: 'text-right', defaultContent: '', render: (v: any) => v != null ? 'S/ ' + Number(v).toFixed(2) : '' },
        { data: 'estado', title: 'Estado', className: 'text-center', defaultContent: '' },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          className: 'text-center text-nowrap',
          defaultContent: '',
          render: (data: any, type: string, row: any) => {
            if (type !== 'display') return '';
            const id = row.id != null ? row.id : '';
            let html = '<button type="button" class="btn btn-sm btn-info btn-view-prerecibo mr-1" data-id="' + id + '" title="Ver"><i class="fas fa-eye"></i></button>';
            html += '<button type="button" class="btn btn-sm btn-secondary btn-print-prerecibo mr-1" data-id="' + id + '" title="Imprimir"><i class="fas fa-print"></i></button>';
            if (row.estado === 'PAGADO') {
              html += '<button type="button" class="btn btn-sm btn-warning text-white btn-reembolsar-prerecibo mr-1" data-id="' + id + '" title="Reembolsar"><i class="fas fa-undo"></i></button>';
            }
            if (row.estado === 'EMITIDO' || row.estado === 'PAGADO') {
              html += '<button type="button" class="btn btn-sm btn-danger btn-anular-prerecibo mr-1" data-id="' + id + '" title="Anular"><i class="fas fa-ban"></i></button>';
            }
            if (row.estado === 'EMITIDO') {
              html += '<button type="button" class="btn btn-sm btn-outline-danger btn-delete-prerecibo" data-id="' + id + '" title="Eliminar"><i class="fas fa-trash-alt"></i></button>';
            }
            return html;
          }
        }
      ],
      ajax: (dataTablesParameters: any, callback: any) => {
        console.log('DT Emisión Request:', dataTablesParameters);
        const params = dataTablesParameters || {};
        const payload = {
          draw: params.draw || 1,
          start: params.start || 0,
          length: params.length || 10,
          search: params.search?.value || ''
        };

        const dtUrl = this.preRecibosService.getDataTablesUrl();
        fetch(dtUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          },
          body: JSON.stringify(payload)
        })
          .then(resp => resp.json())
          .then(resp => {
            console.log('DT Emisión Response:', resp);
            this.data = resp.data || [];
            this.cdr.detectChanges();
            callback({
              recordsTotal: resp.recordsTotal || 0,
              recordsFiltered: resp.recordsFiltered || 0,
              data: resp.data || []
            });
          })
          .catch(err => {
            console.error('DT Emisión Error:', err);
            this.toastService.error('Error al cargar datos del servidor', 'Error');
            callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
          });
      },
      language: { url: 'assets/datatables/i18n/es-ES.json' }
    };

    // Configuracion de DT para Recibos
    this.dtOptionsRecibos = {
      pagingType: 'full_numbers',
      pageLength: 10,
      serverSide: true,
      processing: true,
      ordering: false,
      autoWidth: false,
      retrieve: true,
      columns: [
        { data: 'numero_recibo', title: 'Nº Recibo', render: (d: any, t: string, r: any) => t !== 'display' ? (d || r.numero_correlativo || '') : '<strong class="text-primary">' + (r.numero_recibo || r.numero_correlativo || '') + '</strong>' + (r.numero_recibo && r.numero_correlativo ? '<div class="small text-muted">Ref: ' + r.numero_correlativo + '</div>' : '') },
        { data: 'contribuyente_nombre', title: 'Contribuyente', defaultContent: '', render: (d: any, t: string, r: any) => r.contribuyente_nombre || r.contribuyente_id || '' },
        { data: 'centro_costos_id', title: 'Oficina/Ruta', className: 'text-center small', defaultContent: '' },
        { data: 'updated_at', title: 'Fecha Pago', className: 'text-center', defaultContent: '', render: (v: any) => v ? (new Date(v).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })) : '' },
        { data: 'monto_total', title: 'Monto', className: 'text-right font-weight-bold', defaultContent: '', render: (v: any) => v != null ? 'S/ ' + Number(v).toFixed(2) : '' },
        { data: 'estado', title: 'Estado', className: 'text-center', render: (d: any, t: string, r: any) => t !== 'display' ? (d || '') : '<span class="badge badge-pill ' + (r.estado === 'PAGADO' ? 'badge-success' : (r.estado === 'EMITIDO' ? 'badge-warning' : 'badge-danger')) + '">' + (r.estado || '') + '</span>' },
        { data: null, title: 'Acciones', orderable: false, className: 'text-center text-nowrap', render: (_: any, __: string, row: any) => { const id = row.id; let h = '<button type="button" class="btn btn-sm btn-info btn-view-recibo mr-1" data-id="' + id + '" title="Ver"><i class="fas fa-eye"></i></button><button type="button" class="btn btn-sm btn-secondary btn-print-recibo mr-1" data-id="' + id + '" title="Imprimir"><i class="fas fa-print"></i></button>'; if (row.estado === 'PAGADO') h += '<button type="button" class="btn btn-sm btn-warning text-white btn-reembolsar-recibo mr-1" data-id="' + id + '" title="Reembolsar"><i class="fas fa-undo"></i></button>'; if (row.estado === 'EMITIDO' || row.estado === 'PAGADO') h += '<button type="button" class="btn btn-sm btn-danger btn-anular-recibo" data-id="' + id + '" title="Anular"><i class="fas fa-ban"></i></button>'; return h; } }
      ],
      ajax: (dataTablesParameters: any, callback: any) => {
        console.log('DT Recibos Request:', dataTablesParameters);
        const params = dataTablesParameters || {};
        const payload = {
          draw: params.draw || 1,
          start: params.start || 0,
          length: params.length || 10,
          search: params.search?.value ?? params.search ?? '',
          estado: this.filtroRecibosEstado,
          centro_costos_id: this.filtroRecibosCentro
        };

        this.preRecibosService.postRecibosDt(payload).subscribe({
          next: (resp) => {
            console.log('DT Recibos Response:', resp);
            this.recibosData = resp.data || [];
            this.cdr.detectChanges();
            callback({
              recordsTotal: resp.recordsTotal ?? 0,
              recordsFiltered: resp.recordsFiltered ?? 0,
              data: resp.data || []
            });
          },
          error: (err) => {
            console.error('DT Recibos Error:', err);
            this.toastService.error(err?.error?.message || 'Error al cargar datos del servidor', 'Error');
            callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
          }
        });
      },
      language: { url: 'assets/datatables/i18n/es-ES.json' }
    };
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      const el = document.getElementById('dtPreRecibos');
      if (el && !this.dtPreRecibosActionsBound) {
        this.dtPreRecibosActionsBound = true;
        el.addEventListener('click', this.dtPreRecibosClickHandler);
      }
    }, 0);
    this.bindDtRecibosActions();
  }

  bindDtRecibosActions(): void {
    setTimeout(() => {
      const el = document.getElementById('dtRecibos');
      if (el && !this.dtRecibosActionsBound) {
        this.dtRecibosActionsBound = true;
        el.addEventListener('click', this.dtRecibosClickHandler);
      }
    }, 100);
  }

  private dtRecibosActionsBound = false;
  private dtRecibosClickHandler = (e: Event): void => {
    const target = (e.target as HTMLElement).closest('button');
    if (!target || !target.dataset?.['id']) return;
    const id = +target.dataset['id'];
    const item = this.recibosData.find((x: any) => x.id === id);
    if (!item) return;
    if (target.classList.contains('btn-view-recibo')) {
      this.viewDetail(item);
    } else if (target.classList.contains('btn-print-recibo')) {
      this.onPrint(item);
    } else if (target.classList.contains('btn-anular-recibo')) {
      this.procesarAnulacion(item, 'ANULADO');
    } else if (target.classList.contains('btn-reembolsar-recibo')) {
      this.procesarAnulacion(item, 'REEMBOLSADO');
    }
  };

  private dtPreRecibosActionsBound = false;
  private dtPreRecibosClickHandler = (e: Event): void => {
    const target = (e.target as HTMLElement).closest('button');
    if (!target || !target.dataset?.['id']) return;
    const id = +target.dataset['id'];
    const item = this.data.find((x: any) => x.id === id);
    if (!item) return;
    if (target.classList.contains('btn-view-prerecibo')) {
      this.viewDetail(item);
    } else if (target.classList.contains('btn-print-prerecibo')) {
      this.onPrint(item);
    } else if (target.classList.contains('btn-anular-prerecibo')) {
      this.procesarAnulacion(item, 'ANULADO');
    } else if (target.classList.contains('btn-delete-prerecibo')) {
      this.delete(id);
    } else if (target.classList.contains('btn-reembolsar-prerecibo')) {
      this.procesarAnulacion(item, 'REEMBOLSADO');
    }
  };

  ngOnDestroy(): void {
  }

  recargarRecibos() {
    this.reloadTable();
  }

  /** Fuerza la carga de la tabla de recibos al cambiar a la pestaña (la tabla puede estar en *ngIf). */
  recargarRecibosTab() {
    setTimeout(() => {
      try {
        const $rec = $('#dtRecibos');
        if ($rec.length && typeof $rec.DataTable === 'function') {
          const dt = $rec.DataTable();
          if (dt && dt.ajax) dt.ajax.reload();
        }
      } catch (_) {}
    }, 350);
  }


  override getExportData(): Record<string, unknown>[] {
    return this.data.map(item => ({
      numero_correlativo: item.numero_correlativo,
      contribuyente: item.contribuyente_nombre || item.contribuyente_id,
      fecha: item.fecha_emision,
      monto: item.monto_total,
      estado: item.estado
    }));
  }

  override getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'numero_correlativo', label: 'Nº Pre-Recibo' },
      { key: 'contribuyente', label: 'Contribuyente' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'monto', label: 'Monto' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  override getExportTitle(): string { return 'Reporte de Pre-Recibos Emitidos'; }
  override getExportFilename(): string { return 'pre-recibos-' + new Date().getTime(); }

  onAction(action: string) {
    if (action === 'create') {
      this.form.reset({
        fecha_emision: new Date().toISOString().split('T')[0],
        centro_costos_id: ''
      });
      this.showModal = true;
    }
  }

  closeModal() {
    this.showModal = false;
  }

  save() {
    if (this.form.valid) {
      this.isSaving = true;
      this.preRecibosService.create(this.form.value).subscribe({
        next: (resp) => {
          this.isSaving = false;
          this.toastService.success(resp.message || 'Pre-Recibo generado con éxito', 'Operación Exitosa');
          this.closeModal();
          this.reloadTable();
        },
        error: (err) => {
          this.isSaving = false;
          const msg = err.error?.message || 'Error al procesar el pre-recibo';
          this.toastService.error(msg, 'Error');
        }
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  delete(id: number) {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = 'Anular Pre-Recibo';
    modalRef.componentInstance.message = '¿Estás seguro de anular este pre-recibo?';
    modalRef.componentInstance.detail = 'Esta acción marcará el registro como ANULADO y no podrá ser cobrado.';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.confirmText = 'Sí, Anular';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.preRecibosService.delete(id).subscribe({
          next: (resp) => {
            this.toastService.success(resp.message || 'Recibo anulado', 'Completado');
            this.reloadTable();
          },
          error: (err) => {
            this.toastService.error('Ocurrió un error al tratar de anular el registro', 'Error');
          }
        });
      }
    }, () => { });
  }

  reloadTable() {
    try {
      const $pre = $('#dtPreRecibos');
      if ($pre.length && $pre.DataTable) {
        const dt1 = $pre.DataTable();
        if (dt1 && dt1.ajax) dt1.ajax.reload();
      }
    } catch (_) {}
    try {
      const $rec = $('#dtRecibos');
      if ($rec.length && $rec.DataTable) {
        const dt2 = $rec.DataTable();
        if (dt2 && dt2.ajax) dt2.ajax.reload();
      }
    } catch (_) {}
  }

  onPrint(item: any) {
    // Aquí se llamaría al servicio de impresión de pre-recibo si existe un formato específico
    this.toastService.info('Generando formato de impresión...', 'Imprimir');
    // Simulamos una exportación PDF rápida para el registro individual
    const columns = this.getExportColumns();
    const data = [item];
    this.crudExport.exportToPdf(data, columns, 'Pre-Recibo de Ingreso', `recibo-${item.numero_correlativo}`);
  }

  viewDetail(item: any) {
    this.selectedItem = item;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedItem = null;
  }

  // ---- CAJA METHODS ----
  buscarPreRecibo() {
    if (!this.cajaSearchQuery.trim()) {
      this.toastService.warning('Ingrese un número de pre-recibo para buscar.', 'Atención');
      return;
    }
    this.isSearching = true;
    this.cajaError = null;
    this.cajaResult = null;

    // Use DataTable endpoint as a search method or fetch the full list and filter.
    // For simplicity, we just use the dt endpoint with search value.
    const payload = {
      draw: 1,
      start: 0,
      length: 1,
      search: this.cajaSearchQuery
    };

    fetch(this.preRecibosService.getDataTablesUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      },
      body: JSON.stringify(payload)
    })
      .then(resp => resp.json())
      .then(resp => {
        this.isSearching = false;
        if (resp.data && resp.data.length > 0) {
          // Exact match?
          // Exact match on PRE or REC
          const query = this.cajaSearchQuery.toLowerCase();
          const match = resp.data.find((r: any) =>
            r.numero_correlativo.toLowerCase() === query ||
            (r.numero_recibo && r.numero_recibo.toLowerCase() === query)
          );
          if (match) {
            this.cajaResult = match;
          } else {
            this.cajaError = 'No se encontró un comprobante con ese número exacto.';
          }
        } else {
          this.cajaError = 'Pre-recibo no encontrado.';
        }
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.isSearching = false;
        this.cajaError = 'Error de conexión al buscar el pre-recibo.';
        this.cdr.detectChanges();
      });
  }

  pagarPreRecibo() {
    if (!this.cajaResult) return;

    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = 'Confirmar Cobro';
    modalRef.componentInstance.message = `¿Procesar el cobro de S/ ${this.cajaResult.monto_total} ?`;
    modalRef.componentInstance.detail = 'Se generará el recibo de pago definitivo y el estado pasará a PAGADO.';
    modalRef.componentInstance.type = 'success';
    modalRef.componentInstance.confirmText = 'Sí, Cobrar';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.isPaying = true;
        this.preRecibosService.pagar(this.cajaResult.id).subscribe({
          next: (resp) => {
            this.isPaying = false;
            this.toastService.success(resp.message || 'Cobro procesado exitosamente.', 'Cobro Exitoso');
            this.cajaResult = null;
            this.cajaSearchQuery = '';
            // Force reload if they switch tabs back
            this.reloadTable();
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isPaying = false;
            this.toastService.error(err.error?.message || 'Error al procesar el cobro.', 'Error');
            this.cdr.detectChanges();
          }
        });
      }
    }, () => { });
  }

  // ---- GESTION ANULACIONES / REEMBOLSOS ----
  procesarAnulacion(item: any, option: 'ANULADO' | 'REEMBOLSADO') {
    const actionText = option === 'REEMBOLSADO' ? 'reembolsar' : 'anular';
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = option === 'REEMBOLSADO' ? 'Confirmar Reembolso' : 'Confirmar Anulación';
    modalRef.componentInstance.message = `¿Está seguro de ${actionText} el recibo ${item.numero_correlativo}?`;
    modalRef.componentInstance.detail = option === 'REEMBOLSADO' ? 'El dinero será marcado como devuelto.' : 'El recibo quedará anulado y sin efecto.';
    modalRef.componentInstance.type = option === 'REEMBOLSADO' ? 'warning' : 'danger';
    modalRef.componentInstance.confirmText = `Sí, ${actionText}`;

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        const motivo = prompt(`Ingrese el motivo de la ${option === 'REEMBOLSADO' ? 'devolución' : 'anulación'}:`, '');
        if (motivo === null) return; // Cancelado por el usuario

        this.preRecibosService.anularPago(item.prerecibo_id ?? item.id, motivo || 'Sin motivo especificado', option).subscribe({
          next: (resp) => {
            this.toastService.success(resp.message || 'Operación Exitosa', 'Operación Exitosa');
            this.reloadTable(); // Actualiza DT si estamos en la vista listado
            // Si estamos en la vista de caja y era el que estaba en pantalla
            if (this.cajaResult && (this.cajaResult.id === item.id || this.cajaResult.id === item.prerecibo_id)) {
              this.cajaResult.estado = option;
            }
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.toastService.error(err.error?.message || 'Ocurrió un error al procesar la solicitud.', 'Error');
            this.cdr.detectChanges();
          }
        });
      }
    }, () => { });
  }

  // ---- REPORTES METHODS ----
  generarReporte() {
    if (!this.reporteFechaInicio || !this.reporteFechaFin) {
      this.toastService.warning('Seleccione las fechas de inicio y fin.', 'Atención');
      return;
    }

    this.isGeneratingReport = true;
    this.reporteData = null;

    this.preRecibosService.getReporteRecibos(this.reporteFechaInicio, this.reporteFechaFin).subscribe({
      next: (resp) => {
        this.isGeneratingReport = false;
        if (resp.success) {
          this.reporteData = resp;
          if (resp.data.length === 0) {
            this.toastService.info('No hay recibos cobrados en este rango de fechas.', 'Sin datos');
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isGeneratingReport = false;
        this.toastService.error('Error al generar el reporte', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  imprimirReporte() {
    if (!this.reporteData || this.reporteData.data.length === 0) return;

    this.toastService.info('Generando PDF de Cierre de Caja...', 'Imprimir');

    const columns = [
      { key: 'numero_correlativo', label: 'Nº Pre-Recibo' },
      { key: 'contribuyente', label: 'Contribuyente' },
      { key: 'fecha', label: 'Fecha Pago' },
      { key: 'monto', label: 'Monto Cobrado (S/)' }
    ];

    const dataRows = this.reporteData.data.map((r: any) => ({
      numero_correlativo: r.numero_correlativo,
      contribuyente: r.contribuyente_nombre || r.contribuyente_id,
      fecha: this.formatDate(r.updated_at || r.fecha_pago),
      monto: Number(r.monto_total).toFixed(2)
    }));

    const title = `Cierre de Caja del ${this.formatDate(this.reporteFechaInicio)} al ${this.formatDate(this.reporteFechaFin)}`;
    this.crudExport.exportToPdf(dataRows, columns, title, `cierre-caja-${this.reporteFechaInicio}`);
  }

  existeCierreParaRango(fechaInicio: string, fechaFin: string): boolean {
    if (!this.cierresCajaList?.length) return false;
    const fi = (fechaInicio || '').substring(0, 10);
    const ff = (fechaFin || '').substring(0, 10);
    return this.cierresCajaList.some((c: any) => {
      const ci = (c.fecha_inicio || '').substring(0, 10);
      const cf = (c.fecha_fin || '').substring(0, 10);
      return ci === fi && cf === ff;
    });
  }

  cargarCierresCaja() {
    this.isCargandoCierres = true;
    this.preRecibosService.listarCierresCaja().subscribe({
      next: (resp) => {
        this.cierresCajaList = resp.data || [];
        this.isCargandoCierres = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isCargandoCierres = false;
        this.cierresCajaList = [];
        this.cdr.detectChanges();
      }
    });
  }

  isEliminandoCierre = false;
  eliminarCierreCaja(cierre: any) {
    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = 'Eliminar cierre de caja';
    modalRef.componentInstance.message = `¿Eliminar el cierre del ${this.formatDate(cierre.fecha_inicio)} al ${this.formatDate(cierre.fecha_fin)}?`;
    modalRef.componentInstance.detail = 'Podrá generar nuevamente el arqueo para este rango de fechas.';
    modalRef.componentInstance.type = 'danger';
    modalRef.componentInstance.confirmText = 'Sí, Eliminar';

    modalRef.result.then((result) => {
      if (result === 'confirmed') {
        this.isEliminandoCierre = true;
        this.preRecibosService.eliminarCierreCaja(cierre.id).subscribe({
          next: () => {
            this.isEliminandoCierre = false;
            this.toastService.success('Cierre eliminado. Puede generar nuevamente el arqueo para ese rango.', 'Eliminado');
            this.cargarCierresCaja();
            this.reporteRecibosData = null;
            this.cdr.detectChanges();
          },
          error: () => {
            this.isEliminandoCierre = false;
            this.toastService.error('Error al eliminar el cierre.', 'Error');
            this.cdr.detectChanges();
          }
        });
      }
    }, () => {});
  }

  generarReporteRecibos() {
    if (!this.reporteRecibosFechaInicio || !this.reporteRecibosFechaFin) {
      this.toastService.warning('Seleccione las fechas de inicio y fin.', 'Atención');
      return;
    }
    if (this.existeCierreParaRango(this.reporteRecibosFechaInicio, this.reporteRecibosFechaFin)) {
      this.toastService.warning('Ya existe un cierre de caja para este rango de fechas. Elimínelo en la tabla superior si desea generarlo nuevamente.', 'Cierre existente');
      return;
    }
    this.isGeneratingReporteRecibos = true;
    this.reporteRecibosData = null;
    this.preRecibosService.getReporteRecibos(this.reporteRecibosFechaInicio, this.reporteRecibosFechaFin).subscribe({
      next: (resp) => {
        this.isGeneratingReporteRecibos = false;
        if (resp.success) {
          this.reporteRecibosData = resp;
          if (resp.data.length === 0) {
            this.toastService.info('No hay recibos cobrados en este rango de fechas.', 'Sin datos');
          }
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isGeneratingReporteRecibos = false;
        this.toastService.error('Error al generar el reporte', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  imprimirReporteRecibos() {
    if (!this.reporteRecibosData || this.reporteRecibosData.data.length === 0) return;
    this.toastService.info('Generando PDF de Cierre de Caja...', 'Imprimir');
    const columns = [
      { key: 'numero_correlativo', label: 'Nº Pre-Recibo' },
      { key: 'contribuyente', label: 'Contribuyente' },
      { key: 'fecha', label: 'Fecha Pago' },
      { key: 'monto', label: 'Monto Cobrado (S/)' }
    ];
    const dataRows = this.reporteRecibosData.data.map((r: any) => ({
      numero_correlativo: r.numero_correlativo,
      contribuyente: r.contribuyente_nombre || r.contribuyente_id,
      fecha: this.formatDate(r.fecha_pago || r.updated_at),
      monto: Number(r.monto_total).toFixed(2)
    }));
    const title = `Cierre de Caja del ${this.formatDate(this.reporteRecibosFechaInicio)} al ${this.formatDate(this.reporteRecibosFechaFin)}`;
    this.crudExport.exportToPdf(dataRows, columns, title, `cierre-caja-${this.reporteRecibosFechaInicio}`);
  }

  guardarCierreRecibos() {
    if (!this.reporteRecibosData || !this.reporteRecibosFechaInicio || !this.reporteRecibosFechaFin) {
      this.toastService.warning('Genere primero el arqueo con las fechas deseadas.', 'Atención');
      return;
    }
    if (this.existeCierreParaRango(this.reporteRecibosFechaInicio, this.reporteRecibosFechaFin)) {
      this.toastService.warning('Ya existe un cierre de caja para este rango. Elimínelo en la tabla superior para poder guardar uno nuevo.', 'Cierre existente');
      return;
    }
    const total = Number(this.reporteRecibosData.summary?.total_recaudado ?? 0);
    const cantidad = Number(this.reporteRecibosData.summary?.cantidad ?? 0);

    this.isGuardandoCierre = true;
    this.preRecibosService.guardarCierreCaja({
      fecha_inicio: this.reporteRecibosFechaInicio,
      fecha_fin: this.reporteRecibosFechaFin,
      total_recaudado: total,
      cantidad_recibos: cantidad,
      observaciones: this.reporteRecibosObservaciones || undefined
    }).subscribe({
      next: () => {
        this.isGuardandoCierre = false;
        this.toastService.success('Cierre de caja registrado correctamente.', 'Guardado');
        this.reporteRecibosObservaciones = '';
        this.cargarCierresCaja();
        this.reporteRecibosData = null;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isGuardandoCierre = false;
        this.toastService.error('Error al guardar el cierre de caja.', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  private formatDate(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('es-PE');
  }
}
