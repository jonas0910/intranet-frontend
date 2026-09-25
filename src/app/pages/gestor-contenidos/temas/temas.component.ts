import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

interface TemaView {
  id: number;
  nombre: string;
  slug?: string;
  predeterminado: boolean;
  activo: boolean;
  fuente_principal?: string;
  fuente_secundaria?: string;
  colores: { label: string; color: string }[];
  [key: string]: any;
}

@Component({
  selector: 'app-temas',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './temas.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .color-swatch {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 2px solid #dee2e6;
      display: inline-block;
    }
  `]
})
export class TemasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  temas: TemaView[] = [];
  loading = true;
  private loadingFallbackTimer: any = null;

  constructor(
    private service: GestorContenidosService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.cargar();
    this.loadingFallbackTimer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }, 5000);
  }

  ngOnDestroy(): void {
    this.clearLoadingFallback();
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    this.service.getTemas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.clearLoadingFallback();
        const raw = res?.data?.data ?? res?.data ?? [];
        this.temas = Array.isArray(raw) ? raw.map((t: any) => this.buildTemaView(t)) : [];
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.clearLoadingFallback();
        this.loading = false;
        this.cdr.markForCheck();
        alert('Error al cargar los temas. Compruebe que el backend esté en marcha y la ruta api/gestor-contenidos/temas.');
      }
    });
  }

  private buildTemaView(t: any): TemaView {
    return {
      ...t,
      predeterminado: t.es_predeterminado ?? t.predeterminado ?? false,
      activo: t.activo ?? true,
      colores: [
        { label: 'Primario', color: t.color_primario || '#007bff' },
        { label: 'Secundario', color: t.color_secundario || '#6c757d' },
        { label: 'Acento', color: t.color_acento || '#28a745' },
        { label: 'Fondo', color: t.color_fondo || '#ffffff' },
        { label: 'Texto', color: t.color_texto || '#212529' },
        { label: 'Header', color: t.color_header || '#343a40' }
      ]
    };
  }

  private clearLoadingFallback(): void {
    if (this.loadingFallbackTimer) {
      clearTimeout(this.loadingFallbackTimer);
      this.loadingFallbackTimer = null;
    }
  }

  setPredeterminado(id: number): void {
    this.service.setPredeterminado(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.temas.forEach(t => t.predeterminado = (t.id === id));
          this.cdr.markForCheck();
        } else {
          alert(res.message || 'Error al establecer tema');
        }
      },
      error: () => alert('Error al establecer el tema predeterminado')
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este tema?')) return;
    this.service.eliminarTema(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.temas = this.temas.filter(t => t.id !== id);
          this.cdr.markForCheck();
        } else {
          alert(res.message || 'Error al eliminar');
        }
      },
      error: () => alert('Error al eliminar el tema')
    });
  }
}
