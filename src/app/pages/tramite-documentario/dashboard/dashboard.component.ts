import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-tramite-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class TramiteDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  resumen: any = {};
  areas: any[] = [];
  areasArbol: any[] = [];
  areaSeleccionada: number = 0;
  tramitesPendientes: any[] = [];
  tramitesRecuperables: any[] = [];
  tramitesUrgentes: any[] = [];
  tramitesRecientes: any[] = [];
  loading = true;

  constructor(
    private tramiteService: TramiteService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogos(): void {
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          const pref = this.authService.getActiveAreaId();
          if (pref && this.areas.some((a: { id: number }) => a.id === pref)) {
            this.areaSeleccionada = pref;
          } else if (this.areas.length > 0 && !this.areaSeleccionada) {
            this.areaSeleccionada = this.areas[0].id;
          }
          this.cargarDashboard();
        }
      },
      error: () => this.loading = false
    });
  }

  cargarDashboard(): void {
    this.loading = true;
    this.tramiteService.getResumen(this.areaSeleccionada).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.resumen = res.data;
          this.areaSeleccionada = res.data.area_id || this.areaSeleccionada;
        }
        this.loading = false;
        this.cargarTablas();
      },
      error: () => this.loading = false
    });
    this.tramiteService.getArbol().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.areasArbol = res.data; }
    });
  }

  cargarTablas(): void {
    this.tramiteService.listar({ vista: 'entrada', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { if (res.success) this.tramitesPendientes = (res.data || []).slice(0, 10); } });

    this.tramiteService.listar({ vista: 'bandeja_enviados', area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { if (res.success) this.tramitesRecuperables = (res.data || []).filter((t: any) => t.pendiente_recepcion).slice(0, 5); } });

    this.tramiteService.listar({ prioridad: 'urgente' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { if (res.success) this.tramitesUrgentes = (res.data || []).slice(0, 5); } });

    this.tramiteService.listar({ area_id: this.areaSeleccionada })
      .pipe(takeUntil(this.destroy$))
      .subscribe({ next: (res) => { if (res.success) this.tramitesRecientes = (res.data || []).slice(0, 10); } });
  }

  cambiarArea(): void {
    this.cargarDashboard();
  }

  getEstadoClass(estado: string): string {
    const map: any = {
      registrado: 'badge-secondary', recibido: 'badge-primary', pendiente: 'badge-warning',
      en_proceso: 'badge-info', observado: 'badge-warning', derivado: 'badge-info',
      atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger'
    };
    return map[estado] || 'badge-secondary';
  }

  getPrioridadClass(prioridad: string): string {
    const map: any = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-warning', urgente: 'badge-danger' };
    return map[prioridad] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    return (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}
