import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './servicios.component.html'
})
export class ServiciosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  servicios: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};

  categorias = ['notarial', 'registral', 'legal', 'administrativo', 'otros'];

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
    this.service.getServicios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.servicios = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { categoria: 'notarial', activo: true, orden: 0 };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarServicio(this.form.id, this.form)
      : this.service.crearServicio(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando servicio:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este servicio?')) return;
    this.service.eliminarServicio(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  getCategoriaBadge(cat: string): string {
    const map: any = { notarial: 'primary', registral: 'info', legal: 'warning', administrativo: 'success', otros: 'secondary' };
    return map[cat] || 'secondary';
  }
}
