import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './categorias.component.html'
})
export class CategoriasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  categorias: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};

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
    this.service.getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.categorias = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { activo: true, color: '#007bff', icono: 'fas fa-folder' };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarCategoria(this.form.id, this.form)
      : this.service.crearCategoria(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando categoría:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar esta categoría?')) return;
    this.service.eliminarCategoria(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }
}
