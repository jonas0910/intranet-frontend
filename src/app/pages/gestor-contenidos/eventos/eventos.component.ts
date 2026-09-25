import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-eventos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './eventos.component.html'
})
export class EventosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  eventos: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};

  tiposEvento = ['ceremonia', 'reunion', 'capacitacion', 'cultural', 'deportivo', 'social', 'otro'];

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.service.getEventos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.eventos = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { tipo: 'ceremonia', publico: true };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    if (this.form.fecha_inicio) {
      this.form.fecha_inicio = this.form.fecha_inicio.substring(0, 16);
    }
    if (this.form.fecha_fin) {
      this.form.fecha_fin = this.form.fecha_fin.substring(0, 16);
    }
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarEvento(this.form.id, this.form)
      : this.service.crearEvento(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando evento:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este evento?')) return;
    this.service.eliminarEvento(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
}
