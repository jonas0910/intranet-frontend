import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { PreReciboService } from '../../../../services/comercializacion/pre-recibos.service';
import { ToastService } from '../../../../services/toast.service';
import { DataTablesModule } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { DesignSystemService } from '../../../../services/design-system.service';
import { CrudExportService } from '../../../../services/crud-export.service';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-caja-ventanilla',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule, SystemLayoutComponent],
  templateUrl: './caja-ventanilla.component.html',
  styleUrl: './caja-ventanilla.component.scss'
})
export class CajaVentanillaComponent implements OnInit {
  activeTab: 'caja' | 'recibos' | 'cierre' = 'caja';

  dtOptionsRecibos: any = {};
  recibosData: any[] = [];
  filtroRecibosCentro: string = '';
  filtroRecibosEstado: string = '';

  cajaSearchQuery: string = '';
  cajaResult: any = null;
  cajaError: string | null = null;
  isSearching = false;
  isPaying = false;

  reporteRecibosFechaInicio: string = new Date().toISOString().split('T')[0];
  reporteRecibosFechaFin: string = new Date().toISOString().split('T')[0];
  isGeneratingReporteRecibos = false;
  reporteRecibosData: any = null;
  reporteRecibosObservaciones: string = '';
  isGuardandoCierre = false;
  cierresCajaList: any[] = [];
  isCargandoCierres = false;
  isEliminandoCierre = false;

  /** Cargando reporte para previsualizar un cierre guardado */
  isCargandoPreviewCierre = false;

  /** Modal de previsualización del reporte de cierre de caja */
  showPreviewCierre = false;

  private dtRecibosActionsBound = false;

  constructor(
    private route: ActivatedRoute,
    private preRecibosService: PreReciboService,
    private toastService: ToastService,
    private designSystem: DesignSystemService,
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    private crudExport: CrudExportService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('comercializacion');
    const tab = this.route.snapshot.data['tab'];
    if (tab === 'cobro' || tab === 'caja') this.activeTab = 'caja';
    else if (tab === 'recibos') this.activeTab = 'recibos';
    else if (tab === 'cierre') {
      this.activeTab = 'cierre';
      this.cargarCierresCaja();
    }

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
            this.recibosData = resp.data || [];
            this.cdr.detectChanges();
            callback({ recordsTotal: resp.recordsTotal ?? 0, recordsFiltered: resp.recordsFiltered ?? 0, data: resp.data || [] });
          },
          error: (err) => {
            this.toastService.error(err?.error?.message || 'Error al cargar datos del servidor', 'Error');
            callback({ recordsTotal: 0, recordsFiltered: 0, data: [] });
          }
        });
      },
      language: { url: 'assets/datatables/i18n/es-ES.json' }
    };
  }

  ngAfterViewInit(): void {
    this.bindDtRecibosActions();
  }

  bindDtRecibosActions(): void {
    setTimeout(() => {
      const el = document.getElementById('dtRecibosVentanilla');
      if (el && !this.dtRecibosActionsBound) {
        this.dtRecibosActionsBound = true;
        el.addEventListener('click', this.dtRecibosClickHandler);
      }
    }, 100);
  }

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

  recargarRecibos(): void {
    try {
      const $rec = $('#dtRecibosVentanilla');
      if ($rec.length && typeof $rec.DataTable === 'function') {
        const dt = $rec.DataTable();
        if (dt && dt.ajax) dt.ajax.reload();
      }
    } catch (_) {}
  }

  recargarRecibosTab(): void {
    setTimeout(() => {
      try {
        const $rec = $('#dtRecibosVentanilla');
        if ($rec.length && typeof $rec.DataTable === 'function') {
          const dt = $rec.DataTable();
          if (dt && dt.ajax) dt.ajax.reload();
        }
      } catch (_) {}
    }, 350);
  }

  viewDetail(item: any): void {
    this.toastService.info('Detalle: ' + (item.numero_recibo || item.numero_correlativo), 'Recibo');
  }

  onPrint(item: any): void {
    this.toastService.info('Generando formato de impresión...', 'Imprimir');
    const columns = [
      { key: 'numero_correlativo', label: 'Nº Pre-Recibo' },
      { key: 'contribuyente_nombre', label: 'Contribuyente' },
      { key: 'updated_at', label: 'Fecha Pago' },
      { key: 'monto_total', label: 'Monto Cobrado (S/)' }
    ];
    const data = [{ ...item, contribuyente_nombre: item.contribuyente_nombre || item.contribuyente_id }];
    this.crudExport.exportToPdf(data, columns, 'Recibo de Pago', `recibo-${item.numero_recibo || item.numero_correlativo}`);
  }

  buscarPreRecibo(): void {
    if (!this.cajaSearchQuery.trim()) {
      this.toastService.warning('Ingrese un número de pre-recibo para buscar.', 'Atención');
      return;
    }
    this.isSearching = true;
    this.cajaError = null;
    this.cajaResult = null;
    const payload = { draw: 1, start: 0, length: 1, search: this.cajaSearchQuery };
    fetch(this.preRecibosService.getDataTablesUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
      body: JSON.stringify(payload)
    })
      .then(resp => resp.json())
      .then(resp => {
        this.isSearching = false;
        if (resp.data && resp.data.length > 0) {
          const query = this.cajaSearchQuery.toLowerCase();
          const match = resp.data.find((r: any) =>
            r.numero_correlativo?.toLowerCase() === query || (r.numero_recibo && r.numero_recibo.toLowerCase() === query)
          );
          if (match) this.cajaResult = match;
          else this.cajaError = 'No se encontró un comprobante con ese número exacto.';
        } else this.cajaError = 'Pre-recibo no encontrado.';
        this.cdr.detectChanges();
      })
      .catch(() => {
        this.isSearching = false;
        this.cajaError = 'Error de conexión al buscar el pre-recibo.';
        this.cdr.detectChanges();
      });
  }

  pagarPreRecibo(): void {
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
            this.recargarRecibos();
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.isPaying = false;
            this.toastService.error(err.error?.message || 'Error al procesar el cobro.', 'Error');
            this.cdr.detectChanges();
          }
        });
      }
    }, () => {});
  }

  procesarAnulacion(item: any, option: 'ANULADO' | 'REEMBOLSADO'): void {
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
        if (motivo === null) return;
        this.preRecibosService.anularPago(item.prerecibo_id ?? item.id, motivo || 'Sin motivo especificado', option).subscribe({
          next: (resp) => {
            this.toastService.success(resp.message || 'Operación Exitosa', 'Operación Exitosa');
            this.recargarRecibos();
            if (this.cajaResult && (this.cajaResult.id === item.id || this.cajaResult.id === item.prerecibo_id)) this.cajaResult.estado = option;
            this.cdr.detectChanges();
          },
          error: (err) => {
            this.toastService.error(err?.error?.message || 'Ocurrió un error al procesar la solicitud.', 'Error');
            this.cdr.detectChanges();
          }
        });
      }
    }, () => {});
  }

  cargarCierresCaja(): void {
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

  eliminarCierreCaja(cierre: any): void {
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

  generarReporteRecibos(): void {
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
        if (resp.success) this.reporteRecibosData = resp;
        if (resp.data?.length === 0) this.toastService.info('No hay recibos cobrados en este rango de fechas.', 'Sin datos');
        this.cdr.detectChanges();
      },
      error: () => {
        this.isGeneratingReporteRecibos = false;
        this.toastService.error('Error al generar el reporte', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  imprimirReporteRecibos(): void {
    if (!this.reporteRecibosData || !this.reporteRecibosData.data?.length) return;
    this.toastService.info('Generando PDF de Cierre de Caja...', 'Imprimir');
    const title = `Cierre de Caja del ${this.formatDate(this.reporteRecibosFechaInicio)} al ${this.formatDate(this.reporteRecibosFechaFin)}`;
    const resumenConcepto = this.reporteRecibosData.resumen_por_concepto ?? [];
    const resumenPartida = this.reporteRecibosData.resumen_por_partida ?? [];
    const resumenArea = this.reporteRecibosData.resumen_por_area ?? [];
    const detalle = this.reporteRecibosData.data.map((r: any) => ({
      numero_recibo: r.numero_recibo,
      numero_correlativo: r.numero_correlativo,
      contribuyente_nombre: r.contribuyente_nombre || r.contribuyente_id,
      centro_costos_id: r.centro_costos_id,
      concepto_codigo: r.concepto_codigo,
      concepto_descripcion: r.concepto_descripcion,
      fecha_pago: r.fecha_pago || r.updated_at,
      monto_total: r.monto_total
    }));
    this.crudExport.exportCierreCajaPdf(title, resumenConcepto, resumenPartida, resumenArea, detalle, `cierre-caja-${this.reporteRecibosFechaInicio}`);
  }

  openPreviewCierre(): void {
    if (!this.reporteRecibosData) return;
    this.showPreviewCierre = true;
  }

  closePreviewCierre(): void {
    this.showPreviewCierre = false;
  }

  /**
   * Previsualizar un cierre guardado: carga el reporte por su rango de fechas y abre el modal.
   */
  previsualizarCierre(cierre: any): void {
    const fechaInicio = (cierre.fecha_inicio || '').toString().substring(0, 10);
    const fechaFin = (cierre.fecha_fin || '').toString().substring(0, 10);
    if (!fechaInicio || !fechaFin) return;
    this.isCargandoPreviewCierre = true;
    this.preRecibosService.getReporteRecibos(fechaInicio, fechaFin).subscribe({
      next: (resp) => {
        this.isCargandoPreviewCierre = false;
        if (resp.success) {
          this.reporteRecibosData = resp;
          this.reporteRecibosFechaInicio = fechaInicio;
          this.reporteRecibosFechaFin = fechaFin;
          this.showPreviewCierre = true;
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.isCargandoPreviewCierre = false;
        this.toastService.error('Error al cargar el reporte del cierre.', 'Error');
        this.cdr.detectChanges();
      }
    });
  }

  guardarCierreRecibos(): void {
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
