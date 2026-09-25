import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import JsBarcode from 'jsbarcode';

@Component({
  selector: 'app-tramite-detalle',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './detalle.component.html',
  styleUrl: './detalle.component.scss'
})
export class DetalleComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('barcodeCanvas', { static: false }) barcodeCanvas!: ElementRef;
  private destroy$ = new Subject<void>();
  tramite: any = null;
  loading = true;
  activeTab = 'info';
  areas: any[] = [];
  areaUsuario: number = 0;

  showDerivarModal = false;
  showRechazarModal = false;
  showRecuperarModal = false;
  showArchivarModal = false;
  showComentarioModal = false;
  showCopiaModal = false;
  showDocumentoModal = false;
  showAtenderModal = false;

  derivarForm = { area_destino_id: 0, observacion: '', areas_copia: [] as number[] };
  rechazarMotivo = '';
  recuperarMotivo = '';
  archivarMotivo = '';
  comentarioTexto = '';
  comentarioVisible = true;
  copiaAreas: number[] = [];
  copiaObservacion = '';
  archivoSeleccionado: File | null = null;
  documentoNombre = '';
  processing = false;

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
  tiposDocGenerado = ['MEMO', 'OFICIO', 'INFORME', 'CARTA', 'RESOLUCION', 'PROVEIDO', 'NOTIFICACION', 'CERTIFICADO'];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private tramiteService: TramiteService
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    this.cargarTramite(id);
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          if (this.areas.length > 0) this.areaUsuario = this.areas[0].id;
        }
      }
    });
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cargarTramite(id: number): void {
    this.loading = true;
    this.tramiteService.obtener(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.tramite = res.data;
        this.loading = false;
        setTimeout(() => this.renderBarcode(), 100);
      },
      error: () => this.loading = false
    });
  }

  renderBarcode(): void {
    if (!this.tramite?.codigo_verificacion || !this.barcodeCanvas) return;
    try {
      JsBarcode(this.barcodeCanvas.nativeElement, this.tramite.codigo_verificacion, {
        format: 'CODE128', width: 1.5, height: 50, displayValue: true,
        fontSize: 12, margin: 5, textMargin: 2
      });
    } catch (e) { /* barcode rendering optional */ }
  }

  printBarcode(): void {
    if (!this.tramite?.codigo_verificacion) return;
    const w = window.open('', '_blank', 'width=400,height=300');
    if (!w) return;
    w.document.write(`<html><head><title>Etiqueta ${this.tramite.numero_expediente}</title>
      <style>body{text-align:center;font-family:Arial,sans-serif;padding:20px}
      .exp{font-size:14px;font-weight:bold;margin-bottom:8px}
      .doc{font-size:11px;color:#666;margin-bottom:10px}
      svg{max-width:100%}</style></head><body>
      <div class="exp">${this.tramite.numero_expediente}</div>
      ${this.tramite.numero_documento_generado ? '<div class="doc">' + this.tramite.numero_documento_generado + '</div>' : ''}
      <svg id="bc"></svg>
      <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
      <script>JsBarcode("#bc","${this.tramite.codigo_verificacion}",{format:"CODE128",width:2,height:60,displayValue:true,fontSize:14});window.print();<\/script>
      </body></html>`);
    w.document.close();
  }

  recibir(): void {
    if (!this.tramite) return;
    this.processing = true;
    this.tramiteService.recibir(this.tramite.id, this.areaUsuario).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargarTramite(this.tramite.id); this.processing = false; },
      error: () => this.processing = false
    });
  }

  confirmarDerivar(): void {
    if (!this.tramite || !this.derivarForm.area_destino_id) return;
    this.processing = true;
    this.tramiteService.derivar(this.tramite.id, this.derivarForm.area_destino_id, this.derivarForm.observacion, this.derivarForm.areas_copia)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showDerivarModal = false; this.cargarTramite(this.tramite.id); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  confirmarRechazar(): void {
    if (!this.tramite || this.rechazarMotivo.length < 10) return;
    this.processing = true;
    this.tramiteService.rechazar(this.tramite.id, this.rechazarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showRechazarModal = false; this.rechazarMotivo = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  confirmarRecuperar(): void {
    if (!this.tramite || this.recuperarMotivo.length < 10) return;
    this.processing = true;
    this.tramiteService.recuperar(this.tramite.id, this.areaUsuario, this.recuperarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showRecuperarModal = false; this.recuperarMotivo = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  openAtender(): void {
    this.atenderForm = {
      tipo_documento_respuesta: '', asunto_respuesta: 'Respuesta a: ' + (this.tramite?.asunto || ''),
      descripcion_respuesta: '', derivar_inmediatamente: false, area_destino_id: 0, areas_copia: [], observacion_derivar: ''
    };
    this.atenderPreviewNumero = '';
    this.showAtenderModal = true;
  }

  actualizarAtenderPreview(): void {
    if (!this.atenderForm.tipo_documento_respuesta || !this.areaUsuario) { this.atenderPreviewNumero = ''; return; }
    this.tramiteService.previewNumero(this.areaUsuario, this.atenderForm.tipo_documento_respuesta)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { this.atenderPreviewNumero = res.success ? (res.data.numero || '') : ''; },
        error: () => this.atenderPreviewNumero = ''
      });
  }

  confirmarAtender(): void {
    if (!this.tramite) return;
    this.processing = true;
    const payload = { ...this.atenderForm, area_usuario_id: this.areaUsuario };
    this.tramiteService.atender(this.tramite.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showAtenderModal = false; this.cargarTramite(this.tramite.id); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  toggleAtenderCopiaArea(areaId: number): void {
    const idx = this.atenderForm.areas_copia.indexOf(areaId);
    if (idx >= 0) this.atenderForm.areas_copia.splice(idx, 1); else this.atenderForm.areas_copia.push(areaId);
  }

  confirmarArchivar(): void {
    if (!this.tramite) return;
    this.processing = true;
    this.tramiteService.archivar(this.tramite.id, this.archivarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showArchivarModal = false; this.archivarMotivo = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  desarchivar(): void {
    if (!this.tramite) return;
    this.processing = true;
    this.tramiteService.desarchivar(this.tramite.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargarTramite(this.tramite.id); this.processing = false; },
      error: () => this.processing = false
    });
  }

  agregarComentario(): void {
    if (!this.tramite || !this.comentarioTexto.trim()) return;
    this.processing = true;
    this.tramiteService.agregarComentario(this.tramite.id, this.comentarioTexto, this.comentarioVisible)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showComentarioModal = false; this.comentarioTexto = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  enviarCopias(): void {
    if (!this.tramite || this.copiaAreas.length === 0) return;
    this.processing = true;
    this.tramiteService.enviarCopias(this.tramite.id, this.copiaAreas, this.copiaObservacion, this.areaUsuario)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showCopiaModal = false; this.copiaAreas = []; this.copiaObservacion = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  onFileSelected(event: any): void { this.archivoSeleccionado = event.target.files[0] || null; }

  subirDocumento(): void {
    if (!this.tramite || !this.archivoSeleccionado) return;
    this.processing = true;
    this.tramiteService.subirDocumento(this.tramite.id, this.archivoSeleccionado, this.documentoNombre)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showDocumentoModal = false; this.archivoSeleccionado = null; this.documentoNombre = ''; this.cargarTramite(this.tramite.id); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  eliminarDocumento(docId: number): void {
    if (!this.tramite || !confirm('Eliminar este documento?')) return;
    this.tramiteService.eliminarDocumento(this.tramite.id, docId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargarTramite(this.tramite.id); }
    });
  }

  getUrlDescarga(docId: number): string { return this.tramiteService.descargarDocumento(this.tramite.id, docId); }
  recibirCopia(copiaId: number): void { this.tramiteService.recibirCopia(copiaId).pipe(takeUntil(this.destroy$)).subscribe({ next: (res) => { if (res.success) this.cargarTramite(this.tramite.id); } }); }
  toggleCopiaArea(areaId: number): void { const i = this.copiaAreas.indexOf(areaId); if (i >= 0) this.copiaAreas.splice(i, 1); else this.copiaAreas.push(areaId); }
  toggleDerivarCopiaArea(areaId: number): void { const i = this.derivarForm.areas_copia.indexOf(areaId); if (i >= 0) this.derivarForm.areas_copia.splice(i, 1); else this.derivarForm.areas_copia.push(areaId); }

  getEstadoClass(estado: string): string {
    const m: any = { registrado: 'badge-secondary', recibido: 'badge-primary', en_proceso: 'badge-info', observado: 'badge-warning', derivado: 'badge-info', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger' };
    return m[estado] || 'badge-secondary';
  }
  getAccionIcon(accion: string): string {
    const m: any = { creado: 'fa-plus-circle text-success', recibido: 'fa-inbox text-primary', derivado: 'fa-share text-info', observado: 'fa-exclamation-circle text-warning', atendido: 'fa-check-circle text-success', archivado: 'fa-archive text-secondary', rechazado: 'fa-times-circle text-danger', comentario: 'fa-comment text-info', copia_enviada: 'fa-copy text-info', documento_agregado: 'fa-paperclip text-primary', recuperado: 'fa-undo-alt text-warning', retornado_bandeja: 'fa-undo text-secondary' };
    return m[accion] || 'fa-circle text-muted';
  }
  getAccionBadgeClass(accion: string): string {
    const m: any = { creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger', recuperado: 'badge-warning', comentario: 'badge-info', copia_enviada: 'badge-info' };
    return m[accion] || 'badge-secondary';
  }
  getAccionLabel(accion: string): string {
    const m: any = { creado: 'Tramite Creado', recibido: 'Recibido', derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado', rechazado: 'Rechazado', recuperado: 'Recuperado', comentario: 'Comentario', copia_enviada: 'Copia(s) Enviada(s)', documento_agregado: 'Documento Agregado', retornado_bandeja: 'Retornado a Bandeja' };
    return m[accion] || accion;
  }
  getEstadoLabel(estado: string): string {
    const m: any = { registrado: 'Registrado', recibido: 'Recibido', en_proceso: 'En Proceso', derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado', rechazado: 'Rechazado' };
    return m[estado] || (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  getTimelineBg(accion: string): string {
    const m: any = { creado: 'success', recibido: 'primary', derivado: 'info', observado: 'warning', atendido: 'success', archivado: 'secondary', rechazado: 'danger', recuperado: 'warning', comentario: 'purple', copia_enviada: 'info', estado_actual: 'dark', registro: 'success' };
    return m[accion] || 'secondary';
  }
  getTimelineIcon(accion: string): string {
    const m: any = { creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', observado: 'fa-exclamation', atendido: 'fa-check', archivado: 'fa-archive', rechazado: 'fa-times', recuperado: 'fa-undo', comentario: 'fa-comment', copia_enviada: 'fa-copy', estado_actual: 'fa-flag', registro: 'fa-plus' };
    return m[accion] || 'fa-circle';
  }
}
