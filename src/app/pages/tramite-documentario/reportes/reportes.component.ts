import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  resumen: any = {};
  areas: any[] = [];
  areaSeleccionada: number = 0;
  tramitesVencidos: any[] = [];
  loading = false;

  constructor(private tramiteService: TramiteService) {}

  ngOnInit(): void {
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          if (this.areas.length > 0) this.areaSeleccionada = this.areas[0].id;
          this.cargarReportes();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarReportes(): void {
    this.loading = true;
    this.tramiteService.getResumen(this.areaSeleccionada).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.resumen = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
    this.tramiteService.listar({ estado: 'en_proceso' }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          const now = new Date().toISOString().split('T')[0];
          this.tramitesVencidos = (res.data || []).filter((t: any) => t.fecha_limite && t.fecha_limite < now);
        }
      }
    });
  }

  cambiarArea(): void { this.cargarReportes(); }

  getEstadoClass(estado: string): string {
    const map: any = { registrado: 'badge-secondary', en_proceso: 'badge-info', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger' };
    return map[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    return (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

