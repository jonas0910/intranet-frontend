import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { DataTableDirective } from '../../../lib/angular-datatables/angular-datatables.directive';

@Component({
  selector: 'app-bandeja-archivados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule],
  templateUrl: './bandeja-archivados.component.html',
  styleUrl: './bandeja-archivados.component.scss'
})
export class BandejaArchivadosComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;
  private destroy$ = new Subject<void>();
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  tramites: any[] = [];
  areas: any[] = [];
  areaSeleccionada: number = 0;
  loading = true;
  processing = false;
  activeDropdown: number | null = null;

  showDesarchivarModal = false;
  showDetalleModal = false;
  tramiteSeleccionado: any = null;
  desarchivarMotivo = '';
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
      pageLength: 25, order: [[0, 'desc']], responsive: true,
      language: { url: '//cdn.datatables.net/plug-ins/1.13.6/i18n/es-ES.json', emptyTable: 'No hay documentos archivados' },
      columnDefs: [{ orderable: false, targets: [5] }]
    };
  }

  cargar(): void {
    this.loading = true;
    this.tramiteService.listar({ estado: 'archivado', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$)).subscribe({
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

  abrirDesarchivar(t: any): void {
    this.tramiteSeleccionado = t; this.desarchivarMotivo = ''; this.showDesarchivarModal = true; this.closeDropdowns();
  }

  confirmarDesarchivar(): void {
    if (!this.tramiteSeleccionado) return;
    this.processing = true;
    this.tramiteService.desarchivar(this.tramiteSeleccionado.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) { this.showDesarchivarModal = false; this.cargar(); } this.processing = false; },
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

  getEstadoLabel(e: string): string { const m: any = { registrado: 'Registrado', en_proceso: 'En Proceso', derivado: 'Derivado', recibido: 'Recibido', atendido: 'Atendido', archivado: 'Archivado' }; return m[e] || e; }
  getAccionBadgeClass(a: string): string { const m: any = { creado: 'badge-success', recibido: 'badge-primary', derivado: 'badge-info', atendido: 'badge-success', rechazado: 'badge-danger', recuperado: 'badge-warning', archivado: 'badge-dark', comentario: 'badge-info' }; return m[a] || 'badge-secondary'; }
  getAccionLabel(a: string): string { const m: any = { creado: 'Creado', recibido: 'Recibido', derivado: 'Derivado', atendido: 'Atendido', rechazado: 'Rechazado', recuperado: 'Recuperado', archivado: 'Archivado', comentario: 'Comentario', copia_enviada: 'Copia Enviada' }; return m[a] || a; }
  getTimelineBg(a: string): string { const m: any = { creado: 'success', recibido: 'primary', derivado: 'info', atendido: 'success', rechazado: 'danger', recuperado: 'warning', archivado: 'secondary', registro: 'success', estado_actual: 'dark' }; return m[a] || 'secondary'; }
  getTimelineIcon(a: string): string { const m: any = { creado: 'fa-plus', recibido: 'fa-inbox', derivado: 'fa-share', atendido: 'fa-check', rechazado: 'fa-times', recuperado: 'fa-undo', archivado: 'fa-archive', registro: 'fa-plus', estado_actual: 'fa-flag' }; return m[a] || 'fa-circle'; }
}
