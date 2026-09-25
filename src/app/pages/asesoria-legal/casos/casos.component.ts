import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';

@Component({
  selector: 'app-casos-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './casos.component.html',
  styleUrl: './casos.component.scss'
})
export class CasosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  items: any[] = [];
  loading = true;
  filtroEstado = '';
  vistaTitulo = '';

  constructor(private svc: AsesoriaLegalService, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(q => {
      const v = q['vista'];
      const e = q['estado'];
      if (e) {
        this.filtroEstado = e;
        this.vistaTitulo = `Estado: ${e}`;
      } else if (v === 'informes') {
        this.filtroEstado = 'Informe Emitido';
        this.vistaTitulo = 'Con informe emitido';
      } else if (v === 'actos') {
        this.filtroEstado = 'Acto Resolutivo Registrado';
        this.vistaTitulo = 'Con acto resolutivo';
      } else {
        this.filtroEstado = '';
        this.vistaTitulo = '';
      }
      this.cargar();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    const filtros: any = {};
    if (this.filtroEstado) filtros.estado = this.filtroEstado;
    this.svc.getSolicitudes(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.items = res.data || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  cambiarFiltro(estado: string): void {
    this.filtroEstado = estado;
    this.cargar();
  }

  getEstadoClass(e: string): string {
    const m: Record<string, string> = {
      'Pendiente Asignación': 'badge-secondary', 'En Proceso': 'badge-info', 'En Revisión': 'badge-warning',
      'Observado': 'badge-warning', 'Informe Emitido': 'badge-success', 'Acto Resolutivo Registrado': 'badge-primary', 'Finalizado': 'badge-dark'
    };
    return m[e] || 'badge-secondary';
  }

  diasRestantes(fecha: string | null): number | null {
    if (!fecha) return null;
    const lim = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    lim.setHours(0, 0, 0, 0);
    return Math.ceil((lim.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  }
}
