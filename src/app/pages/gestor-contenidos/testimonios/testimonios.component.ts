import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-testimonios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './testimonios.component.html'
})
export class TestimoniosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  testimonios: any[] = [];
  loading = true;
  saving = false;
  showModal = false;
  editingTestimonio: any = null;

  form: any = {
    nombre: '',
    cargo: '',
    empresa: '',
    contenido: '',
    calificacion: 5,
    foto: '',
    destacado: false,
    orden: 0,
    activo: true
  };

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
    this.service.getTestimonios().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.testimonios = res.data || [];
        }
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar los testimonios');
        this.loading = false;
      }
    });
  }

  openCreate(): void {
    this.editingTestimonio = null;
    this.resetForm();
    this.showModal = true;
  }

  openEdit(t: any): void {
    this.editingTestimonio = t;
    this.form = {
      nombre: t.nombre || '',
      cargo: t.cargo || '',
      empresa: t.empresa || '',
      contenido: t.contenido || '',
      calificacion: t.calificacion || 5,
      foto: t.foto || '',
      destacado: !!t.destacado,
      orden: t.orden || 0,
      activo: t.activo !== undefined ? !!t.activo : true
    };
    this.showModal = true;
  }

  guardar(): void {
    this.saving = true;
    const obs = this.editingTestimonio
      ? this.service.actualizarTestimonio(this.editingTestimonio.id, this.form)
      : this.service.crearTestimonio(this.form);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.showModal = false;
          this.cargar();
        } else {
          alert(res.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: () => {
        alert('Error al guardar el testimonio');
        this.saving = false;
      }
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Está seguro de eliminar este testimonio?')) return;

    this.service.eliminarTestimonio(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.testimonios = this.testimonios.filter(t => t.id !== id);
        } else {
          alert(res.message || 'Error al eliminar');
        }
      },
      error: () => alert('Error al eliminar el testimonio')
    });
  }

  resetForm(): void {
    this.form = {
      nombre: '',
      cargo: '',
      empresa: '',
      contenido: '',
      calificacion: 5,
      foto: '',
      destacado: false,
      orden: 0,
      activo: true
    };
  }

  getStars(n: number): number[] {
    return Array(n).fill(0);
  }

  getEmptyStars(n: number): number[] {
    return Array(Math.max(0, 5 - n)).fill(0);
  }
}
