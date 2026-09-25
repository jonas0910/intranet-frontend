import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-paginas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './paginas.component.html'
})
export class PaginasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  paginas: any[] = [];
  loading = true;
  filtroTipo = '';
  filtroEstado = '';

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
    const params: any = {};
    if (this.filtroTipo) params.tipo = this.filtroTipo;
    if (this.filtroEstado) params.activa = this.filtroEstado;

    this.service.getPaginas(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.paginas = res.data || [];
        }
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar las páginas');
        this.loading = false;
      }
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta página? Esta acción no se puede deshacer.')) return;

    this.service.eliminarPagina(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.paginas = this.paginas.filter(p => p.id !== id);
        } else {
          alert(res.message || 'Error al eliminar');
        }
      },
      error: () => alert('Error al eliminar la página')
    });
  }

  getStatusBadge(activa: boolean): string {
    return activa ? 'badge-success' : 'badge-secondary';
  }

  getTipoBadge(tipo: string): string {
    const map: any = {
      pagina: 'badge-info',
      landing: 'badge-primary',
      seccion: 'badge-warning',
      servicios: 'badge-success',
      notarios: 'badge-dark',
      documentos: 'badge-secondary'
    };
    return map[tipo] || 'badge-info';
  }
}
