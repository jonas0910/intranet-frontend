import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CensoPoblacionalService } from '../services/censo-poblacional.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var Chart: any;

@Component({
  selector: 'app-censo-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './censo-dashboard.component.html',
  styles: [`
    .bg-navy { background-color: #001f3f !important; }
    .card-kpi { transition: transform 0.2s; border: none; overflow: hidden; color: white; }
    .card-kpi:hover { transform: translateY(-5px); }
    .card-kpi-info { background: linear-gradient(135deg, #17a2b8 0%, #117a8b 100%); }
    .card-kpi-success { background: linear-gradient(135deg, #28a745 0%, #1e7e34 100%); }
    .card-kpi-warning { background: linear-gradient(135deg, #ffc107 0%, #d39e00 100%); }
    .card-kpi-danger { background: linear-gradient(135deg, #dc3545 0%, #bd2130 100%); }
    .kpi-icon { width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.2); border-radius: 50%; }
    .progress .progress-bar { transition: width 0.6s ease; }
    .card-acceso { transition: all 0.2s; border: 1px solid #eee; }
    .card-acceso:hover { background-color: #f8f9fa; border-color: #ddd; transform: translateY(-2px); }
  `]
})
export class CensoDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: any[] = [];
  cv!: CrudViewConfig;

  loading = false;
  mainStats: any[] = [];
  sectors: any[] = [];
  lastEvent: any = null;
  demografia: any = null;
  maxTotal = 1;

  constructor(
    private censoService: CensoPoblacionalService,
    private dsService: DesignSystemService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit() {
    this.cv = this.dsService.getCrudViewFor('censo-poblacional');
    this.loadDashboard();
  }

  ngOnDestroy() {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard() {
    this.loading = true;
    this.censoService.getDashboardStats()
      .pipe(takeUntil(this.destroy$))
      .subscribe(res => {
        if (res.success) {
          const stats = res.data.stats;
          this.mainStats = [
            { label: 'Ciudadanos', value: stats.total_ciudadanos, icon: 'fas fa-users', colorClass: 'card-kpi-info', link: '/censo-poblacional/padron' },
            { label: 'Sectores', value: stats.total_sectores, icon: 'fas fa-map-marker-alt', colorClass: 'card-kpi-success', link: '/censo-poblacional/sectores' },
            { label: 'Entregas', value: stats.total_entregas, icon: 'fas fa-hand-holding-heart', colorClass: 'card-kpi-warning', link: '/censo-poblacional/entregas' },
            { label: 'Eventos', value: stats.total_eventos || 0, icon: 'fas fa-calendar-alt', colorClass: 'card-kpi-danger', link: '/censo-poblacional/eventos' }
          ];
          this.sectors = res.data.avance_sectores || [];
          this.lastEvent = res.data.ultimo_evento;
          this.demografia = res.data.demografia;
          this.maxTotal = this.sectors.length > 0 ? Math.max(...this.sectors.map((s: any) => s.total)) || 1 : 1;

          if (isPlatformBrowser(this.platformId)) {
            setTimeout(() => this.initCharts(), 100);
          }
        }
        this.loading = false;
      }, () => {
        this.loading = false;
      });
  }

  private destroyCharts() {
    this.charts.forEach(ch => { try { ch?.destroy(); } catch (_) { } });
    this.charts = [];
  }

  private initCharts() {
    if (typeof Chart === 'undefined') {
      setTimeout(() => this.initCharts(), 150);
      return;
    }
    this.destroyCharts();
    try {
      this.initChartSexo();
      this.initChartEdad();
      this.initChartVulnerabilidad();
    } catch (e) {
      console.warn('Error inicializando gráficos:', e);
    }
  }

  private initChartSexo() {
    const el = document.getElementById('chartSexoDona') as HTMLCanvasElement;
    if (!el || !this.demografia?.por_sexo) return;

    const data = this.demografia.por_sexo;
    const labels = ['Masculino', 'Femenino'];
    const values = [data.Masculino || 0, data.Femenino || 0];
    const colors = ['#3c8dbc', '#f39c12'];

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
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartEdad() {
    const el = document.getElementById('chartEdadBarras') as HTMLCanvasElement;
    if (!el || !this.demografia?.por_edad) return;

    const labelsMap: any = {
      'menor_18': 'Menores (<18)',
      '18_30': 'Jóvenes (18-30)',
      '30_60': 'Adultos (31-60)',
      'mayor_60': 'Adulto Mayor (>60)'
    };

    const keys = Object.keys(this.demografia.por_edad);
    const labels = keys.map(k => labelsMap[k] || k);
    const values = keys.map(k => this.demografia.por_edad[k]);
    const colors = ['#00c0ef', '#00a65a', '#f39c12', '#f56954'];

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Ciudadanos',
          data: values,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: colors,
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartVulnerabilidad() {
    const el = document.getElementById('chartVulnerabilidad') as HTMLCanvasElement;
    if (!el || !this.demografia?.vulnerabilidad) return;

    const data = this.demografia.vulnerabilidad;
    const labels = ['Discapacidad', 'Adulto Mayor', 'Padres/Madres', 'Menores', 'Desempleados'];
    const values = [
      data.discapacitados || 0,
      data.adultos_mayores || 0,
      data.padres_madres || 0,
      data.menores_edad || 0,
      data.desempleados || 0
    ];
    const colors = ['#dc3545', '#ffc107', '#28a745', '#17a2b8', '#6c757d'];

    const chart = new Chart(el, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data: values,
          backgroundColor: colors.map(c => c + 'CC'),
          borderColor: '#fff',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } }
        },
        scales: {
          r: { ticks: { display: false } }
        }
      }
    });
    this.charts.push(chart);
  }

  formatNumber(value: number): string {
    if (value == null) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
