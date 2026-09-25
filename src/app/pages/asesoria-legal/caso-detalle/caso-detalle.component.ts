import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-caso-detalle-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './caso-detalle.component.html',
  styleUrl: './caso-detalle.component.scss'
})
export class CasoDetalleComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  id = 0;
  data: any = null;
  loading = true;
  processing = false;
  catalogos: any = null;

  // Modal asignar
  showAsignar = false;
  abogadoId = 0;
  fechaLimite = '';

  // Modal version
  showVersion = false;
  contenidoHtml = '';
  editandoVersionId: number | null = null;

  // Modal observar
  showObservar = false;
  versionObservarId = 0;
  comentariosRevision = '';

  // Modal acto resolutivo
  showActo = false;
  tipoActo = 'RA';
  numeroActo = '';
  fechaActo = '';
  parteResolutiva = '';

  tabActiva = 'resumen';

  // Modal glosa
  showGlosa = false;
  resumenCaso = '';
  opinionLegal = '';
  decisionFinal = '';
  palabrasClave = '';

  // Modal informe emitido (informe técnico + PDF)
  showInforme = false;
  informeForm: any = {};
  pdfFile: File | null = null;
  pdfSubiendo = false;

  constructor(private svc: AsesoriaLegalService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(p => {
      this.id = +p['id'];
      if (this.id) this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getSolicitud(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.data = res.data; this.loading = false; },
      error: () => this.loading = false
    });
  }

  cargarCatalogos(): void {
    if (this.catalogos) return;
    this.svc.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.catalogos = res.data; }
    });
  }

  get perm(): any { return this.data?.permisos || {}; }
  get sol(): any { return this.data?.solicitud || {}; }
  get ultimaVersion(): any { return this.data?.versiones?.[0] || null; }
  get puedeAsignar(): boolean { return this.sol.estado === 'Pendiente Asignación' && this.perm.es_jefe; }
  get puedeCrearVersion(): boolean {
    const e = this.sol.estado;
    return (e === 'En Proceso' || e === 'Observado') && (this.perm.es_abogado_asignado || this.perm.es_jefe);
  }
  get puedeEnviarRevision(): boolean {
    const v = this.ultimaVersion;
    return v && v.estado_version === 'Borrador' && (this.perm.es_abogado_asignado || this.perm.es_jefe);
  }
  get puedeAprobarObservar(): boolean {
    return this.sol.estado === 'En Revisión' && this.perm.es_jefe && this.ultimaVersion?.estado_version === 'En Revision Jefatura';
  }
  get puedeRegistrarActo(): boolean { return this.sol.estado === 'Informe Emitido'; }
  get puedeRegistrarGlosa(): boolean { return this.sol.estado === 'Acto Resolutivo Registrado'; }
  get puedeGestionarInforme(): boolean {
    const estado = this.sol?.estado;
    const estadosPermitidos = ['Informe Emitido', 'Acto Resolutivo Registrado', 'Finalizado'];
    return estadosPermitidos.includes(estado);
  }

  abrirAsignar(): void {
    this.cargarCatalogos();
    this.showAsignar = true;
    this.abogadoId = 0;
    this.fechaLimite = '';
  }

  asignar(): void {
    if (!this.abogadoId || !this.fechaLimite || this.processing) return;
    this.processing = true;
    this.svc.asignar(this.id, this.abogadoId, this.fechaLimite).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.cargar(); this.showAsignar = false; }
        this.processing = false;
      },
      error: (err) => { this.processing = false; alert(err?.error?.message || 'Error'); }
    });
  }

  abrirVersion(): void {
    this.showVersion = true;
    this.editandoVersionId = null;
    this.contenidoHtml = this.ultimaVersion?.contenido_html || '';
  }

  guardarVersion(): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.crearVersion(this.id, this.contenidoHtml).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.cargar(); this.showVersion = false; }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  enviarRevision(): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.enviarRevision(this.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.cargar();
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirAprobar(): void {
    if (this.ultimaVersion) this.aprobar(this.ultimaVersion.id);
  }

  aprobar(versionId: number): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.aprobar(this.id, versionId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.cargar();
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirObservar(): void {
    this.showObservar = true;
    this.versionObservarId = this.ultimaVersion?.id || 0;
    this.comentariosRevision = '';
  }

  observar(): void {
    if (!this.comentariosRevision.trim() || this.processing) return;
    this.processing = true;
    this.svc.observar(this.id, this.versionObservarId, this.comentariosRevision).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.cargar(); this.showObservar = false; }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirActo(): void {
    this.showActo = true;
    this.tipoActo = this.data?.acto_resolutivo?.tipo_acto || 'RA';
    this.numeroActo = this.data?.acto_resolutivo?.numero_acto || '';
    this.fechaActo = this.data?.acto_resolutivo?.fecha_emision || '';
    this.parteResolutiva = this.data?.acto_resolutivo?.parte_resolutiva || '';
  }

  guardarActo(): void {
    if (this.processing) return;
    this.processing = true;
    const payload: any = { tipo_acto: this.tipoActo };
    if (this.numeroActo) payload.numero_acto = this.numeroActo;
    if (this.fechaActo) payload.fecha_emision = this.fechaActo;
    if (this.parteResolutiva) payload.parte_resolutiva = this.parteResolutiva;
    this.svc.registrarActo(this.id, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.cargar(); this.showActo = false; }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirGlosa(): void {
    this.showGlosa = true;
    const g = this.data?.glosa || {};
    this.resumenCaso = g.resumen_caso || '';
    this.opinionLegal = g.opinion_legal || '';
    this.decisionFinal = g.decision_final || '';
    this.palabrasClave = g.palabras_clave || '';
  }

  guardarGlosa(): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.registrarGlosa(this.id, {
      resumen_caso: this.resumenCaso,
      opinion_legal: this.opinionLegal,
      decision_final: this.decisionFinal,
      palabras_clave: this.palabrasClave
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) { this.cargar(); this.showGlosa = false; }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirInforme(): void {
    const ie = this.data?.informe_emitido || {};
    this.informeForm = {
      titulo: ie.titulo || '',
      resumen: ie.resumen || '',
      antecedentes: ie.antecedentes || '',
      fundamentos_legales: ie.fundamentos_legales || '',
      analisis: ie.analisis || '',
      conclusiones: ie.conclusiones || '',
      recomendaciones: ie.recomendaciones || '',
      numero_informe: ie.numero_informe || '',
      fecha_emision: ie.fecha_emision || ''
    };
    this.pdfFile = null;
    this.showInforme = true;
  }

  cerrarInforme(): void {
    this.showInforme = false;
    this.pdfFile = null;
  }

  guardarInforme(): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.updateInformeEmitido(this.id, this.informeForm).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.data = { ...this.data, informe_emitido: res.data };
          if (this.pdfFile) this.subirPdf();
          else { this.cargar(); this.cerrarInforme(); }
        }
        this.processing = false;
      },
      error: (err) => { this.processing = false; alert(err?.error?.message || 'Error'); }
    });
  }

  subirPdf(): void {
    if (!this.pdfFile || this.pdfSubiendo) return;
    this.pdfSubiendo = true;
    this.svc.uploadPdfInforme(this.id, this.pdfFile).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.data = { ...this.data, informe_emitido: res.data };
          this.cargar();
          this.cerrarInforme();
        }
        this.pdfSubiendo = false;
      },
      error: (err) => { this.pdfSubiendo = false; alert(err?.error?.message || 'Error al subir PDF'); }
    });
  }

  onPdfSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) {
      const f = input.files[0];
      if (f.type === 'application/pdf') this.pdfFile = f;
      else alert('Solo se permiten archivos PDF');
    }
  }

  getEstadoClass(e: string): string {
    const m: Record<string, string> = {
      'Pendiente Asignación': 'badge-secondary', 'En Proceso': 'badge-info', 'En Revisión': 'badge-warning',
      'Observado': 'badge-warning', 'Informe Emitido': 'badge-success', 'Acto Resolutivo Registrado': 'badge-primary', 'Finalizado': 'badge-dark'
    };
    return m[e] || 'badge-secondary';
  }

  get mediaBaseUrl(): string {
    return (environment.apiUrl || '').replace(/\/api\/?$/, '') || 'http://localhost:8000';
  }

  getEstadoVersionClass(e: string): string {
    const m: Record<string, string> = { 'Borrador': 'badge-secondary', 'En Revision Jefatura': 'badge-warning', 'Aprobado': 'badge-success', 'Observado': 'badge-danger' };
    return m[e] || 'badge-secondary';
  }
}
