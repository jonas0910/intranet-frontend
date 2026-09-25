import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-gc-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './dashboard.component.html'
})
export class GcDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  stats: any = {};
  loading = true;
  paginasRecientes: any[] = [];
  noticiasRecientes: any[] = [];
  proyectosRecientes: any[] = [];
  bannersRecientes: any[] = [];

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.service.getDashboard().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.stats = res.data.stats || {};
          this.paginasRecientes = (res.data.paginas_recientes || []).slice(0, 5);
          this.noticiasRecientes = (res.data.noticias_recientes || []).slice(0, 5);
          this.proyectosRecientes = (res.data.proyectos_recientes || []).slice(0, 5);
          this.bannersRecientes = (res.data.banners_recientes || []).slice(0, 5);
        }
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar el dashboard');
        this.loading = false;
      }
    });
  }
}
