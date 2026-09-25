import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-ofertas-empleo',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ofertas-empleo.component.html'
})
export class OfertasEmpleoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ofertas: any[] = [];
  loading = true;

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    this.service.getOfertasEmpleo().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.ofertas = res.data || [];
        }
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar las ofertas de empleo');
        this.loading = false;
      }
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta oferta? Esta acción no se puede deshacer.')) return;

    this.service.eliminarOfertaEmpleo(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.ofertas = this.ofertas.filter(o => o.id !== id);
        } else {
          alert(res.message || 'Error al eliminar');
        }
      },
      error: () => alert('Error al eliminar la oferta')
    });
  }

  get totalOfertas(): number {
    return this.ofertas.length;
  }

  get ofertasAbiertas(): number {
    return this.ofertas.filter(o => o.estado === 'abierta').length;
  }

  get ofertasCerradas(): number {
    return this.ofertas.filter(o => o.estado === 'cerrada').length;
  }

  get totalPostulaciones(): number {
    return this.ofertas.reduce((sum, o) => sum + (o.postulaciones_count || 0), 0);
  }

  getEstadoBadge(estado: string): string {
    const map: any = {
      borrador: 'badge-secondary',
      abierta: 'badge-success',
      cerrada: 'badge-warning',
      finalizada: 'badge-danger'
    };
    return map[estado] || 'badge-info';
  }
}
