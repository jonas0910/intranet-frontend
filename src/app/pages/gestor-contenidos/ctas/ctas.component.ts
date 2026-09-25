import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-ctas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './ctas.component.html'
})
export class CtasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  ctas: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};

  tipos = ['basico', 'con_imagen', 'con_caracteristicas', 'destacado'];
  ubicaciones = ['global', 'homepage', 'servicios', 'contacto', 'footer'];

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
    this.service.getCtas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.ctas = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { tipo: 'basico', ubicacion: 'global', activo: true, orden: 0 };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarCta(this.form.id, this.form)
      : this.service.crearCta(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando CTA:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este CTA?')) return;
    this.service.eliminarCta(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  getTipoBadge(tipo: string): string {
    const map: any = { basico: 'secondary', con_imagen: 'info', con_caracteristicas: 'primary', destacado: 'warning' };
    return map[tipo] || 'secondary';
  }

  getUbicacionBadge(ubi: string): string {
    const map: any = { global: 'dark', homepage: 'primary', servicios: 'success', contacto: 'info', footer: 'secondary' };
    return map[ubi] || 'secondary';
  }
}
