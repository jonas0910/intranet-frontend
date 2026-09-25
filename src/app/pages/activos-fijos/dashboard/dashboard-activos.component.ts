import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { ActivoService } from '../services/activo.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var Chart: any;

@Component({
  selector: 'app-dashboard-activos',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './dashboard-activos.component.html',
  styleUrls: ['./dashboard-activos.component.scss']
})
export class DashboardActivosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: any[] = [];

  loading = false;
  kpis: any = null;
  porCategoria: any = null;
  porEstado: Record<string, number> = {};
  porCondicion: Record<string, number> = {};

  constructor(
    private activoService: ActivoService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.loading = true;

    this.activoService.reporteDashboard()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.kpis = response.data.kpis;
            this.porCategoria = response.data.por_categoria || {};
            this.porEstado = response.data.por_estado || {};
            this.porCondicion = response.data.por_condicion || {};
            if (isPlatformBrowser(this.platformId)) {
              setTimeout(() => this.initCharts(), 100);
            }
          }
          this.loading = false;
        },
        error: () => {
          this.loading = false;
        }
      });
  }

  private destroyCharts(): void {
    this.charts.forEach(ch => { try { ch?.destroy(); } catch (_) {} });
    this.charts = [];
  }

  private initCharts(): void {
    if (typeof Chart === 'undefined') {
      setTimeout(() => this.initCharts(), 150);
      return;
    }
    this.destroyCharts();
    try {
      this.initChartCategoriasBarras();
      this.initChartCategoriasDona();
      this.initChartEstadoDona();
      this.initChartEstadoBarras();
      this.initChartCondicionDona();
    } catch (e) {
      console.warn('Error inicializando gráficos:', e);
    }
  }

  private initChartCategoriasBarras(): void {
    const el = document.getElementById('chartCategoriasBarras') as HTMLCanvasElement;
    if (!el) return;

    const data = this.porCategoria;
    const labels = Object.keys(data);
    const values = labels.map(k => (data as any)[k]?.cantidad || 0);
    const colors = this.getChartColors(labels.length);

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Cantidad',
          data: values,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { precision: 0 }
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartCategoriasDona(): void {
    const el = document.getElementById('chartCategoriasDona') as HTMLCanvasElement;
    if (!el) return;

    const data = this.porCategoria;
    const labels = Object.keys(data);
    const values = labels.map(k => (data as any)[k]?.cantidad || 0);
    const colors = this.getChartColors(labels.length);

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartEstadoDona(): void {
    const el = document.getElementById('chartEstadoDona') as HTMLCanvasElement;
    if (!el) return;

    const map: Record<string, string> = {
      activo: 'Activo',
      baja: 'Baja',
      transferido: 'Transferido',
      extraviado: 'Extraviado'
    };
    const labels = Object.keys(this.porEstado).map(k => map[k] || k);
    const values = Object.values(this.porEstado);
    const colors = ['#00a65a', '#f56954', '#00c0ef', '#f39c12'];

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartEstadoBarras(): void {
    const el = document.getElementById('chartEstadoBarras') as HTMLCanvasElement;
    if (!el) return;

    const map: Record<string, string> = {
      activo: 'Activo',
      baja: 'Baja',
      transferido: 'Transferido',
      extraviado: 'Extraviado'
    };
    const labels = Object.keys(this.porEstado).map(k => map[k] || k);
    const values = Object.values(this.porEstado);
    const colors = ['#00a65a', '#f56954', '#00c0ef', '#f39c12'];

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Cantidad',
          data: values,
          backgroundColor: colors.slice(0, labels.length).map(c => c + 'CC'),
          borderColor: colors.slice(0, labels.length),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: {
          x: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartCondicionDona(): void {
    const el = document.getElementById('chartCondicionDona') as HTMLCanvasElement;
    if (!el) return;

    const map: Record<string, string> = {
      bueno: 'Bueno',
      regular: 'Regular',
      malo: 'Malo',
      obsoleto: 'Obsoleto'
    };
    const labels = Object.keys(this.porCondicion).map(k => map[k] || k);
    const values = Object.values(this.porCondicion);
    const colors = ['#00a65a', '#f39c12', '#f56954', '#6c757d'];

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    this.charts.push(chart);
  }

  private getChartColors(n: number): string[] {
    const palette = ['#00a65a', '#f39c12', '#00c0ef', '#f56954', '#605ca8', '#3c8dbc', '#d2d6de', '#39cccc'];
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(palette[i % palette.length]);
    return out;
  }

  formatCurrency(value: number): string {
    if (!value) return 'S/ 0.00';
    return 'S/ ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  formatNumber(value: number): string {
    if (value == null) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
