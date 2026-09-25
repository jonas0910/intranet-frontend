import { Component, OnInit, OnDestroy, inject, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var Chart: any;

@Component({
  selector: 'app-lp-dashboard',
  standalone: true,
  imports: [CommonModule, SystemLayoutComponent, RouterModule],
  template: `
<app-system-layout [title]="'Dashboard - Limpieza Pública'" [subtitle]="'Estadísticas operaciones y gestión de residuos'"
    [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Limpieza Pública', url: '/limpieza-publica'}, {label: 'Dashboard'}]"
    [subsystem]="'limpieza-publica'">

    <div *ngIf="loading" class="text-center p-5">
        <div class="spinner-border text-primary" role="status" style="width: 3rem; height: 3rem;">
            <span class="sr-only">Cargando...</span>
        </div>
        <p class="mt-3 text-muted fw-medium">Cargando estadísticas de limpieza...</p>
    </div>

    <div *ngIf="!loading">
        <!-- KPIs - Tarjetas modernas -->
        <div class="row mb-4">
            <div class="col-lg-3 col-6 mb-3" *ngFor="let stat of mainStats">
                <div class="card card-kpi elevation-2 h-100 {{ stat.colorClass }}">
                    <div class="card-body d-flex align-items-center">
                        <div class="flex-grow-1">
                            <h3 class="mb-0 font-weight-bold">{{ formatNumber(stat.value) }}</h3>
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
            <!-- Gráfico de Evolución de Recolección -->
            <div class="col-lg-8 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="card-title font-weight-bold mb-0">
                                <i class="fas fa-chart-line text-indigo mr-2"></i>Evolución de Recolección (7 días)
                            </h5>
                            <span class="badge badge-light p-2 text-muted small">KG por día</span>
                        </div>
                    </div>
                    <div class="card-body px-4 pb-4" style="position: relative; height: 320px;">
                        <canvas id="chartEvolucion"></canvas>
                    </div>
                </div>
            </div>

            <!-- Gráfico de Distribución por Residuo -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-recycle text-success mr-2"></i>Tipos de Residuos
                        </h5>
                    </div>
                    <div class="card-body d-flex flex-column align-items-center justify-content-center p-4"
                        style="position: relative; height: 320px;">
                        <canvas id="chartResiduos"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
             <!-- Rendimiento por Vehículo -->
             <div class="col-lg-6 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-truck text-primary mr-2"></i>Top 5 Vehículos (Carga Total)
                        </h5>
                    </div>
                    <div class="card-body p-4" style="position: relative; height: 300px;">
                        <canvas id="chartVehiculos"></canvas>
                    </div>
                </div>
            </div>

            <!-- Participación en Campañas -->
            <div class="col-lg-6 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-users text-warning mr-2"></i>Participación en Campañas
                        </h5>
                    </div>
                    <div class="card-body p-4" style="position: relative; height: 300px;">
                        <canvas id="chartCampanas"></canvas>
                    </div>
                </div>
            </div>
        </div>

        <div class="row">
            <!-- Estado de Alertas -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-shield-alt text-danger mr-2"></i>Estado de Alertas
                        </h5>
                    </div>
                    <div class="card-body d-flex flex-column align-items-center justify-content-center p-4"
                        style="position: relative; height: 300px;">
                        <canvas id="chartAlertas"></canvas>
                    </div>
                </div>
            </div>

            <!-- Top Sectores -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 h-100 border-0 shadow-sm">
                    <div class="card-header bg-white border-0 pt-4 px-4">
                        <h5 class="card-title font-weight-bold mb-0">
                            <i class="fas fa-map-marked-alt text-warning mr-2"></i>Sectores con mayor carga
                        </h5>
                    </div>
                    <div class="card-body p-4">
                        <div *ngFor="let s of topSectores" class="mb-4">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <span class="font-weight-bold text-dark small">{{ s.nombre }}</span>
                                <span class="text-muted small">{{ formatNumber(s.total_kg) }} kg</span>
                            </div>
                            <div class="progress progress-sm rounded-pill bg-light" style="height: 10px;">
                                <div class="progress-bar bg-warning shadow-sm" [style.width.%]="(s.total_kg / maxTotalKg) * 100"></div>
                            </div>
                        </div>
                        <div *ngIf="topSectores.length === 0" class="text-center py-5 text-muted">
                            <i class="fas fa-layer-group fa-3x mb-3 opacity-20"></i>
                            <p class="small">No hay datos por sector.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Productividad Promedio -->
            <div class="col-lg-4 mb-4">
                <div class="card elevation-2 bg-gradient-navy border-0 h-100 overflow-hidden shadow-lg" style="background: linear-gradient(135deg, #001f3f 0%, #003366 100%);">
                    <div class="card-body text-white text-center d-flex flex-column justify-content-center p-4">
                        <h6 class="text-uppercase mb-4 font-weight-bold"
                            style="letter-spacing: 1.5px; opacity: 0.8; font-size: 0.7rem;">
                            PRODUCTIVIDAD PROMEDIO
                        </h6>
                        
                        <div class="row align-items-center mb-4">
                            <div class="col-6 border-right">
                                <h2 class="font-weight-bold mb-0 text-info">{{ resumen?.productividad_promedio?.metros_hora }}</h2>
                                <p class="small mb-0 opacity-60">mts / hora</p>
                            </div>
                            <div class="col-6">
                                <h2 class="font-weight-bold mb-0 text-success">{{ resumen?.productividad_promedio?.kg_hora }}</h2>
                                <p class="small mb-0 opacity-60">kg / hora</p>
                            </div>
                        </div>

                        <div class="mt-2">
                            <a class="btn btn-outline-light btn-sm rounded-pill px-4"
                                style="font-size: 0.8rem;" routerLink="/limpieza-publica/registro-trabajo">
                                Ver Reporte Detallado
                            </a>
                        </div>
                        
                        <p class="mt-4 mb-0 small opacity-50 italic">
                            <i class="fas fa-info-circle mr-1"></i> Basado en registros de trabajo
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
                <a routerLink="/limpieza-publica/monitoreo"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-primary-light d-inline-flex p-3 mb-3" style="background: rgba(0, 123, 255, 0.1);">
                            <i class="fas fa-map-marker-alt fa-2x text-primary"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Monitoreo GPS</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/limpieza-publica/recoleccion"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-success-light d-inline-flex p-3 mb-3" style="background: rgba(40, 167, 69, 0.1);">
                            <i class="fas fa-truck-loading fa-2x text-success"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Control Recojo</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/limpieza-publica/campanas"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-warning-light d-inline-flex p-3 mb-3" style="background: rgba(255, 193, 7, 0.1);">
                            <i class="fas fa-bullhorn fa-2x text-warning"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Campañas</h6>
                    </div>
                </a>
            </div>
            <div class="col-md-3 col-6 mb-3">
                <a routerLink="/limpieza-publica/alertas"
                    class="card card-acceso text-decoration-none text-dark h-100 rounded-lg shadow-sm border-0">
                    <div class="card-body text-center py-4">
                        <div class="rounded-circle bg-danger-light d-inline-flex p-3 mb-3" style="background: rgba(220, 53, 69, 0.1);">
                            <i class="fas fa-bell fa-2x text-danger"></i>
                        </div>
                        <h6 class="mb-0 font-weight-bold">Gestión Alertas</h6>
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
    .card-kpi-info { background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); }
    .card-kpi-success { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); }
    .card-kpi-warning { background: linear-gradient(135deg, #ffc107 0%, #d39e00 100%); }
    .card-kpi-danger { background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%); }
    .kpi-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; }
    .card-acceso { transition: all 0.2s; border: 1px solid #eee; }
    .card-acceso:hover { background-color: #f8f9fa; border-color: #ddd; transform: translateY(-2px); }
    .progress-sm { height: 8px; }
    .bg-white-10 { background: rgba(255,255,255,0.1); }
  `]
})
export class LpDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: any[] = [];
  private lpService = inject(LimpiezaPublicaService);
  private platformId = inject(PLATFORM_ID);

  loading = false;
  resumen: any = null;
  mainStats: any[] = [];
  topSectores: any[] = [];
  maxTotalKg = 1;

  ngOnInit(): void {
    this.cargarDashboard();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.lpService.getDashboardResumen().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.resumen = res.data;
          this.topSectores = res.data.top_sectores || [];
          this.maxTotalKg = this.topSectores.length > 0 ? Math.max(...this.topSectores.map((s: any) => s.total_kg)) || 1 : 1;

          const m = res.data.metricas;
          this.mainStats = [
            { label: 'KG Recolectados', value: m.recoleccion_total_kg, icon: 'fas fa-trash-alt', colorClass: 'card-kpi-info', link: '/limpieza-publica/recoleccion' },
            { label: 'Alertas Pendientes', value: m.alertas_pendientes, icon: 'fas fa-exclamation-triangle', colorClass: 'card-kpi-danger', link: '/limpieza-publica/alertas' },
            { label: 'Vehículos Operativos', value: m.vehiculos_activos, icon: 'fas fa-truck', colorClass: 'card-kpi-success', link: '/limpieza-publica/vehiculos' },
            { label: 'Puntos de Acopio', value: m.total_elementos, icon: 'fas fa-map-marked-alt', colorClass: 'card-kpi-warning', link: '/limpieza-publica/elementos' }
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
      this.initChartResiduos();
      this.initChartAlertas();
      this.initChartVehiculos();
      this.initChartCampanas();
    } catch (e) {
      console.warn('Error inicializando gráficos:', e);
    }
  }

  private initChartEvolucion(): void {
    const el = document.getElementById('chartEvolucion') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.evolucion_recoleccion) return;

    const data = this.resumen.graficos.evolucion_recoleccion;
    const labels = data.map((d: any) => d.fecha);
    const values = data.map((d: any) => d.total);

    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'KG Recolectados',
          data: values,
          borderColor: '#007bff',
          backgroundColor: 'rgba(0, 123, 255, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#007bff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { display: true, drawBorder: false } },
          x: { grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartResiduos(): void {
    const el = document.getElementById('chartResiduos') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.distribucion_residuos) return;

    const data = this.resumen.graficos.distribucion_residuos;
    const labels = data.map((d: any) => d.tipo);
    const values = data.map((d: any) => d.total);
    const colors = ['#28a745', '#17a2b8', '#ffc107', '#dc3545', '#6c757d'];

    const chart = new Chart(el, {
      type: 'pie',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { boxWidth: 12, font: { size: 11 } } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartAlertas(): void {
    const el = document.getElementById('chartAlertas') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.alertas_estado) return;

    const data = this.resumen.graficos.alertas_estado;
    const labels = data.map((d: any) => d.estado.toUpperCase());
    const values = data.map((d: any) => d.total);
    const colors: any = {
      'PENDIENTE': '#dc3545',
      'RESUELTA': '#28a745',
      'RECHAZADA': '#6c757d',
      'GESTIONANDO': '#ffc107'
    };

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: labels.map((l: string) => colors[l] || '#dee2e6'),
          borderWidth: 0,
          cutout: '70%'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartVehiculos(): void {
    const el = document.getElementById('chartVehiculos') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.rendimiento_vehiculos) return;

    const data = this.resumen.graficos.rendimiento_vehiculos;
    const labels = data.map((d: any) => d.label);
    const values = data.map((d: any) => d.value);

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'KG Totales',
          data: values,
          backgroundColor: 'rgba(0, 123, 255, 0.7)',
          borderColor: '#007bff',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, grid: { display: false } },
          y: { grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartCampanas(): void {
    const el = document.getElementById('chartCampanas') as HTMLCanvasElement;
    if (!el || !this.resumen?.graficos?.campanas_participacion) return;

    const data = this.resumen.graficos.campanas_participacion;
    const labels = data.map((d: any) => d.label);
    const values = data.map((d: any) => d.value);

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Participantes',
          data: values,
          backgroundColor: 'rgba(255, 193, 7, 0.7)',
          borderColor: '#ffc107',
          borderWidth: 1,
          borderRadius: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, grid: { display: true, drawBorder: false } },
          x: { grid: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  formatNumber(value: number): string {
    if (value == null) return '0';
    return value.toLocaleString('es-PE', { maximumFractionDigits: 0 });
  }
}
