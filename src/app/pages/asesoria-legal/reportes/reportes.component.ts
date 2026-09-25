import { Component, OnInit, OnDestroy, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';

declare var Chart: any;

@Component({
  selector: 'app-reportes-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private charts: any[] = [];

  loading = true;
  datos: any = null;
  anio = new Date().getFullYear();
  mes = '';
  anios: number[] = [];
  meses: { value: string; label: string }[] = [
    { value: '1', label: 'Enero' }, { value: '2', label: 'Febrero' }, { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' }, { value: '5', label: 'Mayo' }, { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' }, { value: '8', label: 'Agosto' }, { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' }
  ];

  itemsPorEstado: { estado: string; cantidad: number }[] = [];
  usuarioExpandido: Record<number, boolean> = {};

  constructor(
    private svc: AsesoriaLegalService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    const y = new Date().getFullYear();
    for (let i = y; i >= y - 5; i--) this.anios.push(i);
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroyCharts();
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggleUsuario(abogadoId: number): void {
    this.usuarioExpandido[abogadoId] = !this.usuarioExpandido[abogadoId];
  }

  countVencidos(u: any): number {
    return (u.expedientes || []).filter((e: any) => e.vencido).length;
  }

  countPorVencerse(u: any): number {
    return (u.expedientes || []).filter((e: any) => e.por_vencerse && !e.vencido).length;
  }

  cargar(): void {
    this.loading = true;
    this.chartInitRetries = 0;
    const filtros: any = { anio: this.anio };
    if (this.mes) filtros.mes = this.mes;
    this.svc.getReportes(filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.datos = res.data;
          const pe = this.datos?.por_estado || {};
          this.itemsPorEstado = Object.entries(pe).map(([estado, cantidad]) => ({ estado, cantidad: cantidad as number }));
          this.usuarioExpandido = {};
          (this.datos?.monitor_usuarios || []).forEach((u: any) => { this.usuarioExpandido[u.abogado_id] = true; });
        }
        this.loading = false;
        if (isPlatformBrowser(this.platformId) && this.datos) {
          setTimeout(() => this.initCharts(), 200);
        }
      },
      error: () => { this.loading = false; }
    });
  }

  private chartInitRetries = 0;
  private readonly maxChartRetries = 20;

  private destroyCharts(): void {
    this.charts.forEach(ch => { try { ch?.destroy(); } catch (_) {} });
    this.charts = [];
  }

  private initCharts(): void {
    if (!this.datos) return;
    if (typeof Chart === 'undefined') {
      this.chartInitRetries++;
      if (this.chartInitRetries < this.maxChartRetries) {
        setTimeout(() => this.initCharts(), 200);
      }
      return;
    }
    this.chartInitRetries = 0;
    this.destroyCharts();
    try {
      this.chartPorMes();
      this.chartPorEstado();
      this.chartPorAbogado();
      this.chartPorPrioridad();
    } catch (e) {
      console.warn('Error inicializando gráficos:', e);
    }
  }

  private chartPorMes(): void {
    const el = document.getElementById('chartPorMes') as HTMLCanvasElement;
    if (!el) return;
    const pm = this.datos.por_mes || {};
    const labels = Object.keys(pm);
    const values = labels.map(k => pm[k] || 0);
    const chart = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{ label: 'Casos', data: values, borderColor: '#007bff', backgroundColor: 'rgba(0,123,255,0.1)', fill: true, tension: 0.3 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
    this.charts.push(chart);
  }

  private chartPorEstado(): void {
    const el = document.getElementById('chartPorEstado') as HTMLCanvasElement;
    if (!el) return;
    const pe = this.datos.por_estado || {};
    const labels = Object.keys(pe);
    const values = labels.map(k => pe[k] || 0);
    const colors = this.getColors(labels.length);
    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } }
      }
    });
    this.charts.push(chart);
  }

  private chartPorAbogado(): void {
    const el = document.getElementById('chartPorAbogado') as HTMLCanvasElement;
    if (!el) return;
    const pa = this.datos.por_abogado || {};
    const labels = Object.keys(pa);
    const values = labels.map(k => pa[k] || 0);
    const colors = this.getColors(labels.length);
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Casos', data: values, backgroundColor: colors.map((c: string) => c + 'CC'), borderColor: colors, borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
    this.charts.push(chart);
  }

  private chartPorPrioridad(): void {
    const el = document.getElementById('chartPorPrioridad') as HTMLCanvasElement;
    if (!el) return;
    const pp = this.datos.por_prioridad || {};
    const labels = Object.keys(pp);
    const values = labels.map(k => pp[k] || 0);
    const colors = ['#dc3545', '#fd7e14', '#ffc107', '#28a745'];
    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'Casos', data: values, backgroundColor: colors.slice(0, labels.length).map((c: string) => c + 'CC'), borderColor: colors, borderWidth: 1 }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
      }
    });
    this.charts.push(chart);
  }

  private getColors(n: number): string[] {
    const base = ['#007bff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'];
    const out: string[] = [];
    for (let i = 0; i < n; i++) out.push(base[i % base.length]);
    return out;
  }
}
