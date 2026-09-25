import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-proyectos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './proyectos.component.html'
})
export class ProyectosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  proyectosAll: any[] = [];
  proyectos: any[] = [];
  loading = true;
  filtroEstado = '';

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void { this.cargar(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get totalEnCurso(): number { return this.proyectosAll.filter(p => p.estado === 'en_curso').length; }
  get totalCompletados(): number { return this.proyectosAll.filter(p => p.estado === 'completado').length; }
  get totalDestacados(): number { return this.proyectosAll.filter(p => p.destacado).length; }

  cargar(): void {
    this.loading = true;
    this.service.getProyectos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { this.proyectosAll = res.data?.data ?? res.data ?? []; this.filtrar(); this.loading = false; },
      error: () => this.loading = false
    });
  }

  filtrar(): void {
    this.proyectos = this.filtroEstado
      ? this.proyectosAll.filter(p => p.estado === this.filtroEstado)
      : [...this.proyectosAll];
  }

  cambiarFiltro(estado: string): void {
    this.filtroEstado = this.filtroEstado === estado ? '' : estado;
    this.filtrar();
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este proyecto?')) return;
    this.service.eliminarProyecto(id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.cargar() });
  }

  getEstadoBadge(estado: string): string {
    const map: any = { planificacion: 'badge-secondary', en_curso: 'badge-primary', completado: 'badge-success', pausado: 'badge-warning', cancelado: 'badge-danger' };
    return map[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const map: any = { planificacion: 'Planificación', en_curso: 'En Curso', completado: 'Completado', pausado: 'Pausado', cancelado: 'Cancelado' };
    return map[estado] || estado;
  }

  getProgressColor(progreso: number): string {
    if (progreso >= 75) return 'bg-success';
    if (progreso >= 50) return 'bg-info';
    if (progreso >= 25) return 'bg-warning';
    return 'bg-danger';
  }

  getPrioridadBadge(p: string): string {
    const map: any = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-danger' };
    return map[p] || 'badge-info';
  }
}
