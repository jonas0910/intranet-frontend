import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';

@Component({
  selector: 'app-banners',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './banners.component.html'
})
export class BannersComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  banners: any[] = [];
  loading = true;

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
    this.service.getBanners().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.banners = res.data?.data ?? res.data ?? [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar este banner?')) return;
    this.service.eliminarBanner(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.cargar()
    });
  }

  getTipoMediaBadge(tipo: string): string {
    return tipo === 'video' ? 'badge-danger' : 'badge-info';
  }

  getImagenUrl(b: any): string {
    const path = b?.imagen_url || b?.imagen_desktop || b?.imagen;
    return getStorageUrl(path);
  }
}
