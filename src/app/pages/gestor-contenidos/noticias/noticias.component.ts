import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-noticias',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './noticias.component.html'
})
export class NoticiasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  noticiasAll: any[] = [];
  noticias: any[] = [];
  loading = true;
  buscar = '';

  constructor(private service: GestorContenidosService) {}

  getStorageUrl(path: string): string {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^storage\//, '');
    return `${this.service.getMediaUrl()}/${cleanPath}`;
  }

  ngOnInit(): void { this.cargar(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  get totalPublicadas(): number { return this.noticiasAll.filter(n => n.publicada).length; }
  get totalDestacadas(): number { return this.noticiasAll.filter(n => n.destacada).length; }
  get totalBorradores(): number { return this.noticiasAll.filter(n => !n.publicada).length; }

  cargar(): void {
    this.loading = true;
    this.service.getNoticias().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        this.noticiasAll = res.data?.data ?? res.data ?? [];
        this.filtrar();
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  filtrar(): void {
    const q = this.buscar.toLowerCase();
    this.noticias = q
      ? this.noticiasAll.filter(n =>
          (n.titulo || '').toLowerCase().includes(q) ||
          (n.categoria || '').toLowerCase().includes(q) ||
          (n.autor || '').toLowerCase().includes(q))
      : [...this.noticiasAll];
  }

  eliminar(id: number): void {
    if (!confirm('¿Eliminar esta noticia?')) return;
    this.service.eliminarNoticia(id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.cargar() });
  }
}
