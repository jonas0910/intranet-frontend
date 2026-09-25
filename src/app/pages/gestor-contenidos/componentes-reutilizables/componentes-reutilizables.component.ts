import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-componentes-reutilizables',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './componentes-reutilizables.component.html',
  styles: [`.table td { vertical-align: middle !important; }`]
})
export class ComponentesReutilizablesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  componentes: any[] = [];
  loading = true;
  incluirInactivos = false;

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void { this.cargar(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cargar(): void {
    this.loading = true;
    this.service.getComponentesReutilizables(this.incluirInactivos).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.componentes = res?.data ?? [];
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  toggleInactivos(): void {
    this.incluirInactivos = !this.incluirInactivos;
    this.cargar();
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este componente?')) return;
    this.service.eliminarComponenteReutilizable(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { if (res?.success) this.cargar(); },
      error: () => {}
    });
  }

  getTipoBadge(tipo: string): string {
    const map: Record<string, string> = {
      tabla_basica: 'badge-secondary',
      tabla_compleja: 'badge-info',
      carrusel: 'badge-primary',
      foto_texto: 'badge-success',
      foto_texto_inv: 'badge-success',
      tarjetas: 'badge-warning',
      cita: 'badge-dark',
      cta: 'badge-danger',
      lista_iconos: 'badge-secondary',
      dos_columnas: 'badge-info'
    };
    return map[tipo] || 'badge-secondary';
  }
}
