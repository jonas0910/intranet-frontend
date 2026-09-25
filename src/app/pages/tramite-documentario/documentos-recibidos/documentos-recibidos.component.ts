import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-documentos-recibidos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './documentos-recibidos.component.html',
  styleUrl: './documentos-recibidos.component.scss'
})
export class DocumentosRecibidosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tramitesPendientes: any[] = [];
  tramitesRecibidos: any[] = [];
  areas: any[] = [];
  areaSeleccionada: number = 0;
  vistaActiva: 'pendientes' | 'recibidos' = 'pendientes';
  loading = true;
  processing = false;

  selectedTramite: any = null;

  showRecibirModal = false;
  showRechazarModal = false;
  showDerivarModal = false;
  showArchivarModal = false;
  showAtenderModal = false;
  showDetalleModal = false;

  rechazarMotivo = '';
  derivarForm = { area_destino_id: 0, observacion: '', areas_copia: [] as number[] };
  archivarMotivo = '';

  atenderForm = {
    tipo_documento_respuesta: '',
    asunto_respuesta: '',
    descripcion_respuesta: '',
    derivar_inmediatamente: false,
    area_destino_id: 0,
    areas_copia: [] as number[],
    observacion_derivar: ''
  };
  atenderPreviewNumero = '';

  detalleData: any = null;
  detalleLoading = false;

  tiposDocGenerado = ['MEMO', 'OFICIO', 'INFORME', 'CARTA', 'RESOLUCION', 'PROVEIDO', 'NOTIFICACION', 'CERTIFICADO'];

  constructor(
    private tramiteService: TramiteService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const vista = params.get('vista');
      if (vista === 'recibidos') this.vistaActiva = 'recibidos';
    });
    this.initDataTable();
    this.tramiteService.getCatalogos(true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          if (this.areas.length > 0) this.areaSeleccionada = this.areas[0].id;
          this.cargar();
        }
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.safeDtTriggerNext(), 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  initDataTable(): void {
    this.dtOptions = {
      pageLength: 25,
      order: [[5, 'desc']],
      responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json', emptyTable: 'No hay documentos' },
      columnDefs: [{ orderable: false, targets: [6] }]
    };
  }

  cargar(): void {
    this.loading = true;
    this.tramiteService.listar({ vista: 'entrada', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) this.tramitesPendientes = res.data || []; this.loading = false; this.rerender(); },
        error: () => this.loading = false
      });
    this.tramiteService.listar({ vista: 'documentos_recibidos', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) this.tramitesRecibidos = res.data || []; }
      });
  }

  rerender(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dt: any) => { dt.destroy(); this.safeDtTriggerNext(); });
    }
  }

  get tramitesVisibles(): any[] {
    return this.vistaActiva === 'pendientes' ? this.tramitesPendientes : this.tramitesRecibidos;
  }

  cambiarVista(vista: 'pendientes' | 'recibidos'): void {
    this.vistaActiva = vista;
    this.rerender();
  }

  cambiarArea(): void { this.cargar(); }

  // --- Acciones para PENDIENTES ---
  openRecibir(t: any): void {
    this.selectedTramite = t;
    this.showRecibirModal = true;
  }

  confirmarRecibir(): void {
    if (!this.selectedTramite) return;
    this.processing = true;
    this.tramiteService.recibir(this.selectedTramite.id, this.areaSeleccionada).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showRecibirModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  openRechazar(t: any): void {
    this.selectedTramite = t;
    this.rechazarMotivo = '';
    this.showRechazarModal = true;
  }

  confirmarRechazar(): void {
    if (!this.selectedTramite || this.rechazarMotivo.length < 10) return;
    this.processing = true;
    this.tramiteService.rechazar(this.selectedTramite.id, this.rechazarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showRechazarModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  // --- Acciones para RECIBIDOS (dropdown) ---
  openDerivar(t: any): void {
    this.selectedTramite = t;
    this.derivarForm = { area_destino_id: 0, observacion: '', areas_copia: [] };
    this.showDerivarModal = true;
  }

  confirmarDerivar(): void {
    if (!this.selectedTramite || !this.derivarForm.area_destino_id) return;
    this.processing = true;
    this.tramiteService.derivar(this.selectedTramite.id, this.derivarForm.area_destino_id, this.derivarForm.observacion, this.derivarForm.areas_copia)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showDerivarModal = false; this.cargar(); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  openArchivar(t: any): void {
    this.selectedTramite = t;
    this.archivarMotivo = '';
    this.showArchivarModal = true;
  }

  confirmarArchivar(): void {
    if (!this.selectedTramite) return;
    this.processing = true;
    this.tramiteService.archivar(this.selectedTramite.id, this.archivarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showArchivarModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  openAtender(t: any): void {
    this.selectedTramite = t;
    this.atenderForm = {
      tipo_documento_respuesta: '',
      asunto_respuesta: 'Respuesta a: ' + (t.asunto || ''),
      descripcion_respuesta: '',
      derivar_inmediatamente: false,
      area_destino_id: 0,
      areas_copia: [],
      observacion_derivar: ''
    };
    this.atenderPreviewNumero = '';
    this.showAtenderModal = true;
  }

  actualizarAtenderPreview(): void {
    if (!this.atenderForm.tipo_documento_respuesta || !this.areaSeleccionada) {
      this.atenderPreviewNumero = '';
      return;
    }
    this.tramiteService.previewNumero(this.areaSeleccionada, this.atenderForm.tipo_documento_respuesta)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { this.atenderPreviewNumero = res.success ? (res.data.numero || '') : ''; },
        error: () => this.atenderPreviewNumero = ''
      });
  }

  confirmarAtender(): void {
    if (!this.selectedTramite) return;
    this.processing = true;
    const payload = {
      ...this.atenderForm,
      area_usuario_id: this.areaSeleccionada,
      areas_copia: this.atenderForm.areas_copia
    };
    this.tramiteService.atender(this.selectedTramite.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showAtenderModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  toggleAtenderCopia(areaId: number): void {
    const idx = this.atenderForm.areas_copia.indexOf(areaId);
    if (idx >= 0) this.atenderForm.areas_copia.splice(idx, 1);
    else this.atenderForm.areas_copia.push(areaId);
  }

  toggleDerivarCopia(areaId: number): void {
    const idx = this.derivarForm.areas_copia.indexOf(areaId);
    if (idx >= 0) this.derivarForm.areas_copia.splice(idx, 1);
    else this.derivarForm.areas_copia.push(areaId);
  }

  // --- Detalle/Seguimiento Modal (AJAX) ---
  openDetalle(t: any): void {
    this.selectedTramite = t;
    this.detalleData = null;
    this.detalleLoading = true;
    this.showDetalleModal = true;
    this.tramiteService.obtener(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.detalleData = res.data; this.detalleLoading = false; },
      error: () => this.detalleLoading = false
    });
  }

  detalleTab: 'seguimiento' | 'detalle' = 'seguimiento';

  // --- Helpers ---
  getEstadoClass(estado: string): string {
    const map: any = {
      registrado: 'badge-secondary', recibido: 'badge-primary', en_proceso: 'badge-info',
      derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success',
      archivado: 'badge-dark', rechazado: 'badge-danger'
    };
    return map[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const map: any = {
      registrado: 'Registrado', recibido: 'Recibido', en_proceso: 'En Proceso',
      derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido',
      archivado: 'Archivado', rechazado: 'Rechazado'
    };
    return map[estado] || (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  getAccionIcon(accion: string): string {
    const map: any = {
      creado: 'fa-plus-circle text-success', recibido: 'fa-inbox text-primary',
      derivado: 'fa-share text-info', observado: 'fa-exclamation-circle text-warning',
      atendido: 'fa-check-circle text-success', archivado: 'fa-archive text-secondary',
      rechazado: 'fa-times-circle text-danger', comentario: 'fa-comment text-info',
      copia_enviada: 'fa-copy text-info', documento_agregado: 'fa-paperclip text-primary',
      recuperado: 'fa-undo text-warning', retornado_bandeja: 'fa-undo text-secondary'
    };
    return map[accion] || 'fa-circle text-muted';
  }

  getAccionBadgeClass(accion: string): string {
    const map: any = {
      creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info',
      observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark',
      rechazado: 'badge-danger', recuperado: 'badge-warning', comentario: 'badge-info',
      copia_enviada: 'badge-info', documento_agregado: 'badge-primary'
    };
    return map[accion] || 'badge-secondary';
  }

  getAccionLabel(accion: string): string {
    const map: any = {
      creado: 'Trámite Creado', recibido: 'Trámite Recibido', derivado: 'Derivado a Otra Área',
      observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado',
      rechazado: 'Rechazado', recuperado: 'Documento Recuperado', comentario: 'Comentario',
      copia_enviada: 'Copia(s) Enviada(s)', documento_agregado: 'Documento Agregado',
      retornado_bandeja: 'Retornado a Bandeja'
    };
    return map[accion] || accion;
  }

  getPrioridadClass(p: string): string {
    const map: any = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-warning', urgente: 'badge-danger' };
    return map[p] || 'badge-secondary';
  }

  getTimelineBgClass(accion: string): string {
    const map: any = {
      creado: 'success', recibido: 'primary', derivado: 'info', observado: 'warning',
      atendido: 'success', archivado: 'secondary', rechazado: 'danger', recuperado: 'warning',
      comentario: 'purple', copia_enviada: 'info', documento_agregado: 'primary',
      estado_actual: 'dark', registro: 'success'
    };
    return map[accion] || 'secondary';
  }

  getTimelineIconClass(accion: string): string {
    const map: any = {
      creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', observado: 'fa-exclamation',
      atendido: 'fa-check', archivado: 'fa-archive', rechazado: 'fa-times', recuperado: 'fa-undo',
      comentario: 'fa-comment', copia_enviada: 'fa-copy', documento_agregado: 'fa-paperclip',
      estado_actual: 'fa-flag', registro: 'fa-plus'
    };
    return map[accion] || 'fa-circle';
  }

  activeDropdown: number | null = null;
  activeDropdownTramite: any = null;
  dropdownPos: { top: number; left: number } | null = null;

  toggleDropdown(t: any, event: Event): void {
    event.stopPropagation();
    const btn = (event.target as HTMLElement).closest('button');
    if (this.activeDropdown === t.id) {
      this.closeDropdowns();
      return;
    }
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.dropdownPos = { top: rect.bottom + 2, left: rect.right - 180 };
    } else {
      this.dropdownPos = { top: 100, left: 100 };
    }
    this.activeDropdown = t.id;
    this.activeDropdownTramite = t;
  }
  closeDropdowns(): void {
    this.activeDropdown = null;
    this.activeDropdownTramite = null;
    this.dropdownPos = null;
  }
}
