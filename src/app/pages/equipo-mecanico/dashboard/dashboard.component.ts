import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { EquipoService } from '../services/equipo.service';
import { DesignSystemService } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var Chart: any;

@Component({
  selector: 'app-dashboard-sigem',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private baseUrl = `${environment.apiUrl}/equipo-mecanico`;
  private charts: any[] = [];

  loading = false;
  kpis: any = null;
  porTipo: any = null;
  porEstado: any = null;

  subtitleItems = [

    { label: 'Dashboard', icon: 'fas fa-chart-bar' },
  ];

  constructor(
    private equipoService: EquipoService,
    private http: HttpClient,
    private dsService: DesignSystemService
  ) { }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('equipo-mecanico');
    this.cargarDashboard();
  }

  cargarDashboard(): void {
    this.loading = true;
    this.http.get<any>(`${this.baseUrl}/reportes/estadisticas`, { withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.kpis = response.data;

          // Datos para gráficos (simulados o procesados si el API no los da directamente)
          this.porEstado = {
            'Operativo': response.data.equipos?.operativos || 0,
            'En Mantenimiento': response.data.equipos?.mantenimiento || 0,
            'Fuera de Servicio': response.data.equipos?.fuera_servicio || 0
          };

          // Intentar cargar tipos si no vienen
          this.obtenerDistribucionTipos();

          setTimeout(() => this.initCharts(), 200);
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private obtenerDistribucionTipos(): void {
    this.equipoService.listarTodos().subscribe((equipos) => {
      const counts: any = {};
      equipos.forEach((e: any) => {
        const t = e.tipo?.toUpperCase() || 'OTROS';
        counts[t] = (counts[t] || 0) + 1;
      });
      this.porTipo = counts;
      this.initCharts();
    });
  }

  private initCharts(): void {
    if (typeof Chart === 'undefined') return;
    this.destroyCharts();

    if (this.porEstado) this.initChartEstado();
    if (this.porTipo) this.initChartTipos();
  }

  private destroyCharts(): void {
    this.charts.forEach(ch => { try { ch?.destroy(); } catch (_) { } });
    this.charts = [];
  }

  private initChartEstado(): void {
    const el = document.getElementById('chartEstado') as HTMLCanvasElement;
    if (!el) return;

    const labels = Object.keys(this.porEstado);
    const data = Object.values(this.porEstado);
    const colors = ['#28a745', '#ffc107', '#dc3545'];

    const chart = new Chart(el, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
    this.charts.push(chart);
  }

  private initChartTipos(): void {
    const el = document.getElementById('chartTipos') as HTMLCanvasElement;
    if (!el) return;

    const labels = Object.keys(this.porTipo);
    const data = Object.values(this.porTipo);
    const colors = ['#007bff', '#6610f2', '#6f42c1', '#e83e8c', '#fd7e14'];

    const chart = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Unidades',
          data,
          backgroundColor: colors.slice(0, labels.length).map(c => c + 'CC'),
          borderColor: colors.slice(0, labels.length),
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
          y: { beginAtZero: true, ticks: { precision: 0 } }
        }
      }
    });
    this.charts.push(chart);
  }

  formatNumber(value: number): string {
    if (value == null) return '0';
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  sincronizar(): void {
    if (!confirm('¿Desea sincronizar equipos desde el sistema de Activos Fijos?')) {
      return;
    }

    this.loading = true;
    this.equipoService.sincronizarDesdeActivosFijos().subscribe({
      next: (response: any) => {
        if (response.success) {
          alert(`Sincronización exitosa:\n${response.data.importados} importados\n${response.data.actualizados} actualizados`);
          this.cargarDashboard();
        } else {
          alert(response.message || 'Error en sincronización');
        }
        this.loading = false;
      },
      error: (err: any) => {
        alert('Error: ' + (err.error?.message || 'No se pudo sincronizar'));
        this.loading = false;
      }
    });
  }
}

