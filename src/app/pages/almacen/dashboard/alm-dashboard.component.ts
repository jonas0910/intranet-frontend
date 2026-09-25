import { Component, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AlmacenService } from '../services/almacen.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var Chart: any;

import { AlmacenUnitSelectorComponent } from '../components/unit-selector/unit-selector.component';

@Component({
  selector: 'app-alm-dashboard',
  standalone: true,
  imports: [CommonModule, SystemLayoutComponent, RouterModule, AlmacenUnitSelectorComponent],
  template: `
<app-system-layout [title]="'Dashboard - Almacén Institucional'" [subtitle]="'Estadísticas de inventario y movimientos'"
    [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Almacén', url: '/almacen'}, {label: 'Dashboard'}]"
    [subsystem]="'almacen'">

    <div class="mb-3 d-flex justify-content-end align-items-center">
        <app-almacen-unit-selector></app-almacen-unit-selector>
    </div>

    <div *ngIf="loading" class="text-center p-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="sr-only">Cargando...</span>
        </div>
        <p class="mt-3 text-muted fw-medium">Cargando métricas del almacén...</p>
    </div>

    <div *ngIf="!loading">
        <!-- KPIs - Tarjetas modernas -->
        <div class="row mb-4">
            <div class="col-lg-3 col-6 mb-3" *ngFor="let stat of mainStats">
                <div class="card card-kpi elevation-2 h-100 {{ stat.colorClass }}">
                    <div class="card-body d-flex align-items-center">
                        <div class="flex-grow-1">
                            <h3 class="mb-0 font-weight-bold" [style.fontSize]="stat.isCurrency ? '1.75rem' : ''">{{ stat.isCurrency ? 'S/ ' : '' }}{{ formatNumber(stat.value, stat.isCurrency) }}</h3>
                            <p class="mb-0 small opacity-80" style="opacity: 0.8; font-weight: 500;">{{ stat.label }}</p>
                            <a [routerLink]="stat.link" class="btn btn-sm btn-link p-0 mt-2 text-white opacity-50"
                                style="opacity: 0.7; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.5px;">
                                Gestionar <i class="fas fa-chevron-right ml-1" style="font-size: 0.6rem;"></i>
                            </a>
                        </div>
                        <div class="kpi-icon">
                            <i [class]="stat.icon + ' fa-2x'"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Gráfico de Evolución de Movimientos -->
            <div class="col-lg-8 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title font-weight-bold mb-0">
                                <i class="fas fa-chart-line text-primary mr-2"></i>Evolución de Movimientos (7 días)
                            </h5>
                            <span class="badge badge-light p-2 text-muted small">Transacciones</span>
                        </div>
                    </div>
                    <div class="card-body px-4 pb-4" style="position: relative; height: 320px;">
                        <canvas id="chartEvolucion"></canvas>
                    </div>
                </div>
            </div>

            <!-- Gráfico de Distribución del Inventario -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-chart-pie text-success mr-2"></i>Valorización por Categoría
                        </h5>
                    </div>
                    <div class="card-body d-flex flex-column align-items-center justify-content-center p-4"
                        style="position: relative; height: 320px;">
                        <canvas id="chartCategorias"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Movimientos Recientes  -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-history text-info mr-2"></i>Últimas Operaciones
                        </h5>
                    </div>
                    <div class="card-body p-0 mt-3" style="position: relative; height: 300px; overflow-y: auto;">
                        <div class="table-responsive">
                            <table class="table table-hover table-sm align-middle mb-0 text-center">
                                <thead class="bg-light">
                                    <tr>
                                        <th class="text-left">Bien</th>
                                        <th>Tipo</th>
                                        <th>Cant.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr *ngFor="let m of resumen?.recent_movements">
                                        <td class="text-left font-weight-bold small text-truncate" style="max-width: 150px;" [title]="m.bien?.nombre">{{ m.bien?.nombre }}</td>
                                        <td>
                                            <span class="badge" [ngClass]="{
                                                'bg-success': m.tipo === 'ENTRADA',
                                                'bg-danger': m.tipo === 'SALIDA',
                                                'bg-warning': m.tipo === 'AJUSTE',
                                                'bg-info': m.tipo === 'TRANSFERENCIA'
                                            }">{{ m.tipo }}</span>
                                        </td>
                                        <td [ngClass]="{'text-success font-weight-bold': m.tipo === 'ENTRADA', 'text-danger font-weight-bold': m.tipo === 'SALIDA'}">
                                            {{ m.tipo === 'ENTRADA' ? '+' : (m.tipo === 'SALIDA' ? '-' : '') }}{{ m.cantidad }}
                                        </td>
                                    </tr>
                                    <tr *ngIf="!resumen?.recent_movements || resumen?.recent_movements.length === 0">
                                        <td colspan="3" class="py-4 text-muted small">No hay operaciones recientes.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Top Bienes Solicitados -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-box-open text-warning mr-2"></i>Bienes Más Solicitados
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <div *ngFor="let s of topBienes" class="mb-4">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="font-weight-bold text-dark small text-truncate" style="max-width: 180px;" [title]="s.nombre">{{ s.nombre }}</span>
                                <span class="text-muted small">{{ formatNumber(s.total_kg, false) }} und</span>
                            </div>
                            <div class="progress progress-sm rounded-pill bg-light" style="height: 10px;">
                                <div class="progress-bar bg-warning shadow-sm" [style.width.%]="(s.total_kg / maxTotalSalida) * 100"></div>
                            </div>
                        </div>
                        <div *ngIf="topBienes.length === 0" class="text-center py-5 text-muted">
                            <i class="fas fa-boxes fa-3x mb-3 opacity-20"></i>
                            <p class="small">No hay datos de salidas.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Control Operativo -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 bg-gradient-navy border-0 h-100 overflow-hidden shadow-lg" style="background: linear-gradient(135deg, #001f3f 0%, #003366 100%);">
                    <div class="card-body text-white text-center d-flex flex-column justify-content-center p-4">
                        <h6 class="text-uppercase mb-4 font-weight-bold"
                            style="letter-spacing: 1.5px; opacity: 0.8; font-size: 0.7rem;">
                            CONTROL DE INVENTARIO
                        </h6>
                        
                        <div class="bg-white-10 p-4 rounded-xl mb-4 shadow-sm" style="background: rgba(255,255,255,0.12); border-radius: 15px;">
                            <i class="fas fa-clipboard-check fa-3x mb-3 text-info"></i>
                            <h4 class="font-weight-bold mb-1">Catálogo Consolidado</h4>
                            <p class="mb-0 small text-white-50">Registre nuevos bienes, ingresos y asignaciones de activos.</p>
                        </div>

                        <div class="mt-2 text-center">
                            <a class="btn btn-light btn-lg rounded-pill px-4 shadow-sm font-weight-bold text-primary w-100"
                                style="font-size: 0.9rem;" routerLink="/almacen/bienes">
                                <i class="fas fa-boxes mr-2"></i> Ir al Catálogo de Bienes
                            </a>
                        </div>
                        
                        <p class="mt-4 mb-0 small opacity-50 italic">
                            <i class="fas fa-info-circle mr-1"></i> Accesible según permisos de usuario
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Accesos rápidos -->
        <h5 class="mb-4 mt-2 font-weight-bold text-dark">
            <i class="fas fa-th-large mr-2 text-primary"></i>Gestión Directa
        </h5>
        <div class="row mb-4">
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/almacen/bienes"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-primary-light d-inline-flex p-3 mb-3" style="background: rgba(0, 123, 255, 0.1);">
                            <i class="fas fa-boxes fa-2x text-primary"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Bienes y Stock</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/almacen/kardex"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-success-light d-inline-flex p-3 mb-3" style="background: rgba(40, 167, 69, 0.1);">
                            <i class="fas fa-clipboard-list fa-2x text-success"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Kardex</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/almacen/actas"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-warning-light d-inline-flex p-3 mb-3" style="background: rgba(255, 193, 7, 0.1);">
                            <i class="fas fa-file-signature fa-2x text-warning"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Actas de Entrega</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/almacen/reportes"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-danger-light d-inline-flex p-3 mb-3" style="background: rgba(220, 53, 69, 0.1);">
                            <i class="fas fa-chart-bar fa-2x text-danger"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Reportes</h6>
                    </div>
                </a>
            </div>
        </div>
    </div>
</app-system-layout>
  `,
  styles: [`
    .card-kpi { transition: transform 0.2s; border: none; overflow: hidden; color: white; }
    .card-kpi:hover { transform: translateY(-5px); }
    .card-kpi-primary { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); }
    .card-kpi-success { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); }
    .card-kpi-warning { background: linear-gradient(135deg, #ffc107 0%, #d39e00 100%); color: white !important;}
    .card-kpi-warning h3, .card-kpi-warning p, .card-kpi-warning a, .card-kpi-warning i { color: white !important; }
    .card-kpi-info { background: linear-gradient(135deg, #17a2b8 0%, #117a8b 100%); }
    .card-kpi-danger { background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%); }
    .kpi-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; }
    .card-kpi-warning .kpi-icon { background: rgba(255,255,255,0.3); }
    .card-acceso { transition: all 0.2s; border: 1px solid #eee; }
    .card-acceso:hover { background-color: #f8f9fa; border-color: #ddd; transform: translateY(-2px); }
    .progress-sm { height: 8px; }
    .bg-white-10 { background: rgba(255,255,255,0.1); }
  `]
})
export class AlmDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: any[] = [];
  private api = inject(AlmacenService);
  private platformId = inject(PLATFORM_ID);

  loading = false;
  resumen: any = null;
  mainStats: any[] = [];
  topBienes: any[] = [];
  maxTotalSalida = 1;

  ngOnInit(): void {
    // Suscribirse al cambio de unidad para recargar dashboard dinámicamente
    this.api.selectedUnitId$.subscribe(() => {
        this.cargarDashboard();
    });
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.api.getDashboardStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.resumen = res.data;
          this.topBienes = res.data.top_sectores || []; // backend still sends as 'top_sectores' compatibility
          this.maxTotalSalida = this.topBienes.length > 0 ? Math.max(...this.topBienes.map((s: any) => s.total_kg)) || 1 : 1;

          const m = res.data.metricas;
          this.mainStats = [
            { label: 'Bienes en Catálogo', value: m.total_items, icon: 'fas fa-box-open', colorClass: 'card-kpi-primary', link: '/almacen/bienes', isCurrency: false },
            { label: 'Valoración Total', value: m.total_valuation, icon: 'fas fa-money-bill-wave', colorClass: 'card-kpi-success', link: '/almacen/reportes', isCurrency: true },
            { label: 'Alertas Stock Bajo', value: m.low_stock_alerts, icon: 'fas fa-exclamation-triangle', colorClass: 'card-kpi-warning', link: '/almacen/bienes', isCurrency: false },
            { label: 'Movimientos', value: m.recent_movements_count, icon: 'fas fa-exchange-alt', colorClass: 'card-kpi-info', link: '/almacen/kardex', isCurrency: false }
          ];

          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.initCharts(), 100);
          }
        }
        this.loading = false;
      },
      error: (err: any) => {
        console.error('Error al cargar dashboard', err);
        this.loading = false;
      }
    });
  }

  private destroyCharts(): void {
    this.charts.forEach(ch => { try { ch?.destroy(); } catch (_) { } });
    this.charts = [];
  }

  private initCharts(): void {
    if (typeof Chart === 'undefined') {
      setTimeout(() => this.initCharts(), 150);
      return;
    }
    this.destroyCharts();
    try {
      this.initChartEvolucion();
      this.initChartCategorias();
    } catch (e) {
      console.warn('Error inicializando gráficos:', e);
    }
  }

  private initChartEvolucion(): void {
    const el = document.getElementById('chartEvolucion') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.evolucion_movimientos) return;

    const data = this.resumen.graficos.evolucion_movimientos;
    const labels = data.map((d: any) => d.fecha);
    const entradas = data.map((d: any) => d.entradas);
    const salidas = data.map((d: any) => d.salidas);

    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Entradas',
            data: entradas,
            borderColor: '#28a745',
            backgroundColor: 'rgba(40, 167, 69, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#28a745'
          },
          {
            label: 'Salidas',
            data: salidas,
            borderColor: '#dc3545',
            backgroundColor: 'rgba(220, 53, 69, 0.1)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#dc3545'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { display: true, drawBorder: false }, ticks: { precision: 0 } },
          x: { grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartCategorias(): void {
    const el = document.getElementById('chartCategorias') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.distribucion_categorias) return;

    const data = this.resumen.graficos.distribucion_categorias;
    const labels = data.map((d: any) => d.tipo);
    const values = data.map((d: any) => d.total);
    const colors = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#007bff', '#6f42c1', '#e83e8c'];

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0,
          cutout: '65%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 10, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: function (context: any) {
                let label = context.label || '';
                if (label) {
                  label += ': S/ ';
                }
                if (context.parsed !== null) {
                  label += new Intl.NumberFormat('es-PE', { minimumFractionDigits: 2 }).format(context.parsed);
                }
                return label;
              }
            }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  formatNumber(value: number, isCurrency: boolean = false): string {
    if (value == null) return '0';
    return value.toLocaleString('es-PE', {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0
    });
  }
}
