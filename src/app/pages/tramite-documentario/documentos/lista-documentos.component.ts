import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-lista-documentos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './lista-documentos.component.html',
  styleUrl: './lista-documentos.component.scss'
})
export class ListaDocumentosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tramites: any[] = [];
  areas: any[] = [];
  tipos: any[] = [];
  loading = false;
  buscar = '';
  filtroEstado = '';
  filtroPrioridad = '';
  filtroAreaId: number | '' = '';
  filtroTipoId: number | '' = '';
  activeDropdown: number | null = null;

  showDetalleModal = false;
  detalleData: any = null;
  detalleLoading = false;
  detalleTab: 'seguimiento' | 'detalle' = 'seguimiento';

  conteoEstados: any = {};

  constructor(private tramiteService: TramiteService) {}

  ngOnInit(): void {
    this.dtOptions = {
      pageLength: 25, order: [[0, 'desc']], responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json', emptyTable: 'No hay resultados' },
      columnDefs: [{ orderable: false, targets: [7] }]
    };
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          this.tipos = res.data.tipos || [];
        }
      }
    });
  }

  ngAfterViewInit(): void { setTimeout(() => this.safeDtTriggerNext(), 200); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  buscarTramites(): void {
    this.loading = true;
    const filtros: any = {};
    if (this.buscar) filtros.buscar = this.buscar;
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    if (this.filtroPrioridad) filtros.prioridad = this.filtroPrioridad;
    if (this.filtroAreaId) filtros.area_actual_id = this.filtroAreaId;
    if (this.filtroTipoId) filtros.tipo_tramite_id = this.filtroTipoId;
    this.tramiteService.listar(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.tramites = res.data || [];
        this.calcularConteoEstados();
        this.loading = false;
        this.rerender();
      },
      error: () => this.loading = false
    });
  }

  buscarPorEstado(estado: string): void {
    this.filtroEstado = estado;
    this.buscarTramites();
  }

  calcularConteoEstados(): void {
    const c: any = { todos: this.tramites.length };
    for (const t of this.tramites) {
      c[t.estado] = (c[t.estado] || 0) + 1;
    }
    this.conteoEstados = c;
  }

  rerender(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dt: any) => { dt.destroy(); this.safeDtTriggerNext(); });
    }
  }

  limpiar(): void {
    this.buscar = ''; this.filtroEstado = ''; this.filtroPrioridad = '';
    this.filtroAreaId = ''; this.filtroTipoId = '';
    this.tramites = []; this.conteoEstados = {}; this.rerender();
  }

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

  openDetalle(t: any): void {
    this.detalleData = null; this.detalleLoading = true; this.showDetalleModal = true; this.closeDropdowns();
    this.tramiteService.obtener(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.detalleData = res.data; this.detalleLoading = false; },
      error: () => this.detalleLoading = false
    });
  }

  getEstadoClass(estado: string): string {
    const m: any = { registrado: 'badge-secondary', en_proceso: 'badge-info', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger' };
    return m[estado] || 'badge-secondary';
  }
  getEstadoLabel(estado: string): string {
    const m: any = { registrado: 'Registrado', en_proceso: 'En Proceso', derivado: 'Derivado', observado: 'Observado', atendido: 'Atendido', archivado: 'Archivado', rechazado: 'Rechazado' };
    return m[estado] || (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
  getPrioridadClass(p: string): string {
    const m: any = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-warning', urgente: 'badge-danger' };
    return m[p] || 'badge-secondary';
  }
  getAccionBadgeClass(a: string): string { const m: any = { creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info', atendido: 'badge-success', rechazado: 'badge-danger', recuperado: 'badge-warning', archivado: 'badge-dark', comentario: 'badge-info' }; return m[a] || 'badge-secondary'; }
  getAccionLabel(a: string): string { const m: any = { creado: 'Creado', recibido: 'Recibido', derivado: 'Derivado', atendido: 'Atendido', rechazado: 'Rechazado', recuperado: 'Recuperado', archivado: 'Archivado', comentario: 'Comentario', copia_enviada: 'Copia Enviada' }; return m[a] || a; }
  getTimelineBg(a: string): string { const m: any = { creado: 'success', recibido: 'primary', derivado: 'info', atendido: 'success', rechazado: 'danger', recuperado: 'warning', archivado: 'secondary', registro: 'success', estado_actual: 'dark' }; return m[a] || 'secondary'; }
  getTimelineIcon(a: string): string { const m: any = { creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', atendido: 'fa-check', rechazado: 'fa-times', recuperado: 'fa-undo', archivado: 'fa-archive', registro: 'fa-plus', estado_actual: 'fa-flag' }; return m[a] || 'fa-circle'; }
}
