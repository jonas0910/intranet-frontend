import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-postulaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './postulaciones.component.html'
})
export class PostulacionesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  postulaciones: any[] = [];
  loading = false;
  showDetailModal = false;
  selectedPostulacion: any = null;
  nuevoEstado = '';

  estados = ['pendiente', 'en_revision', 'preseleccionado', 'entrevista', 'aceptado', 'rechazado'];

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
    this.service.getPostulaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.postulaciones = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openDetail(item: any): void {
    this.selectedPostulacion = { ...item };
    this.nuevoEstado = item.estado;
    this.showDetailModal = true;
  }

  changeStatus(): void {
    if (!this.selectedPostulacion || this.nuevoEstado === this.selectedPostulacion.estado) return;
    this.service.actualizarPostulacion(this.selectedPostulacion.id, { estado: this.nuevoEstado })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showDetailModal = false;
          this.loadData();
        },
        error: (err: any) => console.error('Error actualizando estado:', err)
      });
  }

  getEstadoBadge(estado: string): string {
    const map: any = {
      pendiente: 'secondary', en_revision: 'info', preseleccionado: 'primary',
      entrevista: 'warning', aceptado: 'success', rechazado: 'danger'
    };
    return map[estado] || 'secondary';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-PE', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
  }
}
