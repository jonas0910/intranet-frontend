import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-documentos-creados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './documentos-creados.component.html',
  styleUrl: './documentos-creados.component.scss'
})
export class DocumentosCreadosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tramites: any[] = [];
  areas: any[] = [];
  areaSeleccionada: number = 0;
  filtroEstado = '';
  loading = true;
  processing = false;

  selectedTramite: any = null;
  activeDropdown: number | null = null;

  showDerivarModal = false;
  showArchivarModal = false;
  showRecuperarModal = false;
  showDetalleModal = false;

  derivarForm = { area_destino_id: 0, observacion: '', areas_copia: [] as number[] };
  archivarMotivo = '';
  recuperarMotivo = '';
  detalleData: any = null;
  detalleLoading = false;
  detalleTab: 'seguimiento' | 'detalle' = 'seguimiento';

  constructor(private tramiteService: TramiteService) {}

  ngOnInit(): void {
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

  ngAfterViewInit(): void { setTimeout(() => this.safeDtTriggerNext(), 200); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  initDataTable(): void {
    this.dtOptions = {
      pageLength: 25,
      order: [[6, 'desc']],
      responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json', emptyTable: 'No hay documentos creados' },
      columnDefs: [{ orderable: false, targets: [7] }]
    };
  }

  cargar(): void {
    this.loading = true;
    const filtros: any = { vista: 'documentos_creados', area_id: this.areaSeleccionada };
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    this.tramiteService.listar(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.tramites = res.data || []; this.loading = false; this.rerender(); },
      error: () => this.loading = false
    });
  }

  rerender(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dt: any) => { dt.destroy(); this.safeDtTriggerNext(); });
    }
  }

  cambiarArea(): void { this.cargar(); }
  cambiarFiltro(estado: string): void { this.filtroEstado = estado; this.cargar(); }

  activeDropdownTramite: any = null;
  dropdownPos: { top: number; left: number } | null = null;

  toggleDropdown(t: any, event: Event): void {
    event.stopPropagation();
    const btn = (event.target as HTMLElement).closest('button');
    if (this.activeDropdown === t.id) { this.closeDropdowns(); return; }
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.dropdownPos = { top: rect.bottom + 2, left: rect.right - 180 };
    } else { this.dropdownPos = { top: 100, left: 100 }; }
    this.activeDropdown = t.id;
    this.activeDropdownTramite = t;
  }
  closeDropdowns(): void { this.activeDropdown = null; this.activeDropdownTramite = null; this.dropdownPos = null; }

  openDerivar(t: any): void { this.selectedTramite = t; this.derivarForm = { area_destino_id: 0, observacion: '', areas_copia: [] }; this.showDerivarModal = true; this.closeDropdowns(); }
  confirmarDerivar(): void {
    if (!this.selectedTramite || !this.derivarForm.area_destino_id) return;
    this.processing = true;
    this.tramiteService.derivar(this.selectedTramite.id, this.derivarForm.area_destino_id, this.derivarForm.observacion, this.derivarForm.areas_copia)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showDerivarModal = false; this.cargar(); } this.processing = false; },
        error: () => this.processing = false
      });
  }
  toggleDerivarCopia(areaId: number): void { const i = this.derivarForm.areas_copia.indexOf(areaId); if (i >= 0) this.derivarForm.areas_copia.splice(i, 1); else this.derivarForm.areas_copia.push(areaId); }

  openArchivar(t: any): void { this.selectedTramite = t; this.archivarMotivo = ''; this.showArchivarModal = true; this.closeDropdowns(); }
  confirmarArchivar(): void {
    if (!this.selectedTramite) return;
    this.processing = true;
    this.tramiteService.archivar(this.selectedTramite.id, this.archivarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showArchivarModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  openRecuperar(t: any): void { this.selectedTramite = t; this.recuperarMotivo = ''; this.showRecuperarModal = true; this.closeDropdowns(); }
  confirmarRecuperar(): void {
    if (!this.selectedTramite || this.recuperarMotivo.length < 10) return;
    this.processing = true;
    this.tramiteService.recuperar(this.selectedTramite.id, this.areaSeleccionada, this.recuperarMotivo).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showRecuperarModal = false; this.cargar(); } this.processing = false; },
      error: () => this.processing = false
    });
  }

  openDetalle(t: any): void {
    this.selectedTramite = t; this.detalleData = null; this.detalleLoading = true; this.showDetalleModal = true; this.closeDropdowns();
    this.tramiteService.obtener(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.detalleData = res.data; this.detalleLoading = false; },
      error: () => this.detalleLoading = false
    });
  }

  getRowClass(t: any): string {
    if (t.estado === 'registrado' || t.estado === 'en_proceso') return 'fila-activa';
    if (t.estado === 'derivado' || t.estado === 'atendido' || t.estado === 'archivado') return 'fila-tramitada';
    return '';
  }
  getEstadoClass(e: string): string { const m: any = { registrado: 'badge-secondary', en_proceso: 'badge-info', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger' }; return m[e] || 'badge-secondary'; }
  getEstadoLabel(e: string): string { const m: any = { registrado: 'Registrado', en_proceso: 'En Proceso', derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado', rechazado: 'Rechazado' }; return m[e] || e; }
  getAccionBadgeClass(a: string): string { const m: any = { creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger', recuperado: 'badge-warning', comentario: 'badge-info' }; return m[a] || 'badge-secondary'; }
  getAccionLabel(a: string): string { const m: any = { creado: 'Creado', recibido: 'Recibido', derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado', rechazado: 'Rechazado', recuperado: 'Recuperado', comentario: 'Comentario', copia_enviada: 'Copias' }; return m[a] || a; }
  getTimelineBg(a: string): string { const m: any = { creado: 'success', recibido: 'primary', derivado: 'info', observado: 'warning', atendido: 'success', archivado: 'secondary', rechazado: 'danger', recuperado: 'warning', comentario: 'purple', registro: 'success', estado_actual: 'dark' }; return m[a] || 'secondary'; }
  getTimelineIcon(a: string): string { const m: any = { creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', observado: 'fa-exclamation', atendido: 'fa-check', archivado: 'fa-archive', rechazado: 'fa-times', recuperado: 'fa-undo', comentario: 'fa-comment', registro: 'fa-plus', estado_actual: 'fa-flag' }; return m[a] || 'fa-circle'; }
  getPrioridadClass(p: string): string { const m: any = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-warning', urgente: 'badge-danger' }; return m[p] || 'badge-secondary'; }
}
