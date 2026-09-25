import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-bandeja-enviados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './bandeja-enviados.component.html',
  styleUrl: './bandeja-enviados.component.scss'
})
export class BandejaEnviadosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tramitesAll: any[] = [];
  areas: any[] = [];
  areaSeleccionada: number = 0;
  filtroRecepcion: '' | 'pendiente' | 'recibido' = '';
  loading = true;
  processing = false;
  activeDropdown: number | null = null;

  showRecuperarModal = false;
  showDetalleModal = false;
  tramiteRecuperar: any = null;
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
      pageLength: 25, order: [[3, 'desc']], responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json', emptyTable: 'No hay documentos enviados' },
      columnDefs: [{ orderable: false, targets: [5] }]
    };
  }

  cargar(): void {
    this.loading = true;
    this.tramiteService.listar({ vista: 'bandeja_enviados', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) this.tramitesAll = res.data || []; this.loading = false; this.rerender(); },
        error: () => this.loading = false
      });
  }

  get tramites(): any[] {
    if (this.filtroRecepcion === 'pendiente') return this.tramitesAll.filter(t => t.pendiente_recepcion);
    if (this.filtroRecepcion === 'recibido') return this.tramitesAll.filter(t => !t.pendiente_recepcion);
    return this.tramitesAll;
  }
  get countPendientes(): number { return this.tramitesAll.filter(t => t.pendiente_recepcion).length; }
  get countRecibidos(): number { return this.tramitesAll.filter(t => !t.pendiente_recepcion).length; }

  rerender(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dt: any) => { dt.destroy(); this.safeDtTriggerNext(); });
    }
  }

  cambiarArea(): void { this.cargar(); }
  cambiarFiltro(f: '' | 'pendiente' | 'recibido'): void { this.filtroRecepcion = f; this.rerender(); }
  activeDropdownTramite: any = null;
  dropdownPos: { top: number; left: number } | null = null;

  toggleDropdown(t: any, ev: Event): void {
    ev.stopPropagation();
    const btn = (ev.target as HTMLElement).closest('button');
    if (this.activeDropdown === t.id) { this.closeDropdowns(); return; }
    if (btn) {
      const rect = btn.getBoundingClientRect();
      this.dropdownPos = { top: rect.bottom + 2, left: rect.right - 180 };
    } else { this.dropdownPos = { top: 100, left: 100 }; }
    this.activeDropdown = t.id;
    this.activeDropdownTramite = t;
  }
  closeDropdowns(): void { this.activeDropdown = null; this.activeDropdownTramite = null; this.dropdownPos = null; }

  abrirRecuperar(t: any): void {
    this.tramiteRecuperar = t; this.recuperarMotivo = ''; this.showRecuperarModal = true; this.closeDropdowns();
  }

  confirmarRecuperar(): void {
    if (!this.tramiteRecuperar || this.recuperarMotivo.length < 10) return;
    this.processing = true;
    this.tramiteService.recuperar(this.tramiteRecuperar.id, this.areaSeleccionada, this.recuperarMotivo)
      .pipe(takeUntil(this.destroy$)).subscribe({
        next: (res) => { if (res.success) { this.showRecuperarModal = false; this.cargar(); } this.processing = false; },
        error: () => this.processing = false
      });
  }

  openDetalle(t: any): void {
    this.detalleData = null; this.detalleLoading = true; this.showDetalleModal = true; this.closeDropdowns();
    this.tramiteService.obtener(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.detalleData = res.data; this.detalleLoading = false; },
      error: () => this.detalleLoading = false
    });
  }

  getEstadoClass(e: string): string { const m: any = { derivado: 'badge-info', registrado: 'badge-secondary', en_proceso: 'badge-info', recibido: 'badge-primary' }; return m[e] || 'badge-secondary'; }
  getEstadoLabel(e: string): string { const m: any = { registrado: 'Registrado', en_proceso: 'En Proceso', derivado: 'Derivado', recibido: 'Recibido', atendido: 'Atendido' }; return m[e] || e; }
  getAccionBadgeClass(a: string): string { const m: any = { creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info', atendido: 'badge-success', rechazado: 'badge-danger', recuperado: 'badge-warning', comentario: 'badge-info' }; return m[a] || 'badge-secondary'; }
  getAccionLabel(a: string): string { const m: any = { creado: 'Creado', recibido: 'Recibido', derivado: 'Derivado', atendido: 'Atendido', rechazado: 'Rechazado', recuperado: 'Recuperado', comentario: 'Comentario', copia_enviada: 'Copia Enviada' }; return m[a] || a; }
  getTimelineBg(a: string): string { const m: any = { creado: 'success', recibido: 'primary', derivado: 'info', atendido: 'success', rechazado: 'danger', recuperado: 'warning', registro: 'success', estado_actual: 'dark' }; return m[a] || 'secondary'; }
  getTimelineIcon(a: string): string { const m: any = { creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', atendido: 'fa-check', rechazado: 'fa-times', recuperado: 'fa-undo', registro: 'fa-plus', estado_actual: 'fa-flag' }; return m[a] || 'fa-circle'; }
}
