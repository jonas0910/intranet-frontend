import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { OcurrenciaService } from '../services/ocurrencia.service';
import { RequisitoriaService } from '../services/requisitoria.service';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

declare var L: any;

import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-seguridad-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class SeguridadDashboardComponent implements OnInit, OnDestroy {
  subtitleItems = [
    { label: 'Información Estratégica', icon: 'fas fa-chart-pie' },
  ];

  // Coordenadas de Tacna
  private centroTacna = { lat: -18.00656, lng: -70.24622 };

  // Estadísticas de ocurrencias
  statsOcurrencias: any = {
    total: 0,
    pendientes: 0,
    criticas: 0,
    tiempo_respuesta_promedio: 0
  };

  // Estadísticas de requisitorias
  statsRequisitorias: any = {
    vehiculos_vigentes: 0,
    personas_vigentes: 0,
    personas_peligrosas: 0,
    armados: 0
  };

  // Estadísticas generales
  stats: any = {
    total_personal: 0,
    personal_activo: 0,
    total_vehiculos: 0,
    vehiculos_servicio: 0,
    total_ocurrencias: 0,
    ocurrencias_pendientes: 0,
    vehiculos_requisitoriados: 0,
    personas_requisitoriadas: 0
  };

  // Ocurrencias recientes
  ocurrenciasRecientes: any[] = [];

  // Requisitorias peligrosas
  requisitoriasPeligrosas: any[] = [];

  // Alertas peligrosas (alias para compatibilidad con template)
  alertasPeligrosas: any[] = [];

  // Estadísticas para KPIs
  mainStats: any[] = [];

  // Datos para gráficos
  topSectores: any[] = [];
  maxTotalKg: number = 0; // Para el progreso de sectores

  // Loading states
  loading = false;

  private map: any;
  private markersLayer: any;
  private heatLayer: any;
  private heatLegend: any;

  constructor(
    private http: HttpClient,
    private ocurrenciaService: OcurrenciaService,
    private requisitoriaService: RequisitoriaService
  ) { }

  ngOnInit(): void {
    this.loading = true;
    this.cargarDatosPrincipales();
    this.cargarOcurrenciasRecientes();
    this.cargarRequisitoriasPeligrosas();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  cargarDatosPrincipales(): void {
    forkJoin({
      ocurrencias: this.ocurrenciaService.obtenerEstadisticas().pipe(
        catchError(error => {
          console.error('Error cargando stats ocurrencias:', error);
          return of({ success: false });
        })
      ),
      requisitorias: this.requisitoriaService.obtenerEstadisticas().pipe(
        catchError(error => {
          console.error('Error cargando stats requisitorias:', error);
          return of({ success: false });
        })
      )
    }).pipe(
      finalize(() => {
        this.loading = false;
        // Solo inicializar el mapa cuando ya no está cargando y el DOM está listo
        setTimeout(() => {
          this.inicializarMapaDashboard();
          this.cargarDatosGraficos();
        }, 300);
      })
    ).subscribe({
      next: (results: any) => {
        // Procesar Ocurrencias
        if (results.ocurrencias && results.ocurrencias.success) {
          const d = results.ocurrencias.data || {};
          this.statsOcurrencias = {
            total: d.total || 0,
            pendientes: d.pendientes || 0,
            criticas: d.criticas || 0,
            tiempo_respuesta_promedio: d.tiempo_respuesta_promedio || 0
          };
          this._porTipo = d.por_tipo || {};
          this._porSector = d.por_sector || {};
        } else {
          this.calcularStatsOcurrenciasDesdeListado();
        }

        // Procesar Requisitorias
        if (results.requisitorias && results.requisitorias.success) {
          const d2 = results.requisitorias.data || {};
          this.statsRequisitorias = {
            vehiculos_vigentes: d2.vehiculos_vigentes || d2.vehiculos_requisitoriados || 0,
            personas_vigentes: d2.personas_vigentes || d2.personas_requisitoriadas || 0,
            personas_peligrosas: d2.personas_peligrosas || 0,
            armados: d2.armados || 0
          };
        } else {
          this.calcularStatsRequisitoriasDesdeListas();
        }

        this.updateMainStats();
      }
    });
  }

  // Datos intermedios de la API de estadísticas para gráficos
  private _porTipo: any = {};
  private _porSector: any = {};

  updateMainStats(): void {
    this.mainStats = [
      {
        label: 'Ocurrencias (Mes)',
        value: this.statsOcurrencias.total,
        icon: 'fas fa-exclamation-triangle',
        colorClass: 'card-kpi-info',
        link: '/seguridad-ciudadana/ocurrencias',
        subtext: 'Ver historial'
      },
      {
        label: 'Atendidas',
        value: this.statsOcurrencias.total - this.statsOcurrencias.pendientes,
        icon: 'fas fa-check-circle',
        colorClass: 'card-kpi-success',
        link: '/seguridad-ciudadana/ocurrencias',
        subtext: 'Casos cerrados'
      },
      {
        label: 'Pendientes',
        value: this.statsOcurrencias.pendientes,
        icon: 'fas fa-clock',
        colorClass: 'card-kpi-warning',
        link: '/seguridad-ciudadana/ocurrencias',
        subtext: 'En despacho'
      },
      {
        label: 'Casos Críticos',
        value: this.statsOcurrencias.criticas,
        icon: 'fas fa-fire',
        colorClass: 'card-kpi-danger',
        link: '/seguridad-ciudadana/ocurrencias',
        subtext: 'Prioridad máxima'
      }
    ];
  }

  cargarDatosGraficos(): void {
    // Sectores críticos usando datos reales
    const sectores = this._porSector;
    if (Object.keys(sectores).length > 0) {
      const maxVal = Math.max(...Object.values(sectores) as number[]);
      this.topSectores = Object.entries(sectores)
        .map(([nombre, total]) => ({ nombre, total: total as number }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);
      this.maxTotalKg = maxVal || 1;
    } else {
      // Fallback si no hay datos de distrito todavía
      this.topSectores = [];
      this.maxTotalKg = 1;
    }

    // Cargar evolución últimos 7 días desde la API
    this.cargarEvolucion7Dias();
  }

  formatNumber(val: any): string {
    if (!val && val !== 0) return '0';
    return val.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  private chartEvolucion: any = null;
  private chartZonas: any = null;
  private chartAlertas: any = null;

  private cargarEvolucion7Dias(): void {
    // Consultar ocurrencias de los últimos 7 días agrupadas por día
    this.ocurrenciaService.obtenerOcurrencias({ per_page: 500 }).subscribe({
      next: (res) => {
        const arr: any[] = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
        
        const hoy = new Date();
        const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        const labelsOrdenados: string[] = [];
        const dataOrdenada: number[] = [];
        const mapaData: { [key: string]: number } = {};

        // Inicializar los últimos 7 días con 0
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(hoy.getDate() - i);
          const key = d.toISOString().split('T')[0];
          mapaData[key] = 0;
          labelsOrdenados.push(diasSemana[d.getDay()]);
        }

        // Poblar con datos reales
        arr.forEach((o: any) => {
          const fStr = (o.fecha_hora_ocurrencia || o.fecha_hora_reporte);
          if (fStr) {
            const fKey = fStr.split('T')[0];
            if (mapaData[fKey] !== undefined) {
              mapaData[fKey]++;
            }
          }
        });

        // Convertir mapa a array ordenado
        Object.keys(mapaData).sort().forEach(k => {
          dataOrdenada.push(mapaData[k]);
        });

        setTimeout(() => {
          this.initChartEvolucion(labelsOrdenados, dataOrdenada);
          this.initChartZonas(this._porTipo);
          this.initChartAlertas();
        }, 300);
      },
      error: () => {
        setTimeout(() => {
          const labelsDefault = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
          this.initChartEvolucion(labelsDefault, [0, 0, 0, 0, 0, 0, 0]);
          this.initChartZonas(this._porTipo);
          this.initChartAlertas();
        }, 300);
      }
    });
  }

  private initChartEvolucion(labels: string[], data: number[]): void {
    const ctx = document.getElementById('chartEvolucion') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chartEvolucion) { this.chartEvolucion.destroy(); }

    this.chartEvolucion = new (window as any).Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Ocurrencias',
          data,
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
          y: { beginAtZero: true, grid: { display: false } },
          x: { grid: { display: false } }
        }
      }
    });
  }

  private initChartZonas(porTipo: any): void {
    const ctx = document.getElementById('chartZonas') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chartZonas) { this.chartZonas.destroy(); }

    const labels = Object.keys(porTipo).length > 0 ? Object.keys(porTipo).map(k => k.charAt(0).toUpperCase() + k.slice(1)) : ['Sin datos'];
    const data = Object.keys(porTipo).length > 0 ? (Object.values(porTipo) as number[]) : [1];
    const colors = ['#dc3545', '#ffc107', '#28a745', '#6c757d', '#17a2b8', '#343a40', '#fd7e14', '#6610f2'];

    this.chartZonas = new (window as any).Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  private initChartAlertas(): void {
    const ctx = document.getElementById('chartAlertas') as HTMLCanvasElement;
    if (!ctx) return;
    if (this.chartAlertas) { this.chartAlertas.destroy(); }

    const veh = this.statsRequisitorias.vehiculos_vigentes;
    const per = this.statsRequisitorias.personas_vigentes;
    const arm = this.statsRequisitorias.armados;
    const ocu = this.statsOcurrencias.total;

    this.chartAlertas = new (window as any).Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Vehículos', 'Personas', 'Armados', 'Ocurrencias'],
        datasets: [{
          data: [veh || 0, per || 0, arm || 0, ocu || 0],
          backgroundColor: ['#17a2b8', '#343a40', '#dc3545', '#007bff'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }
        }
      }
    });
  }

  cargarOcurrenciasRecientes(): void {
    this.ocurrenciaService.obtenerOcurrencias().subscribe({
      next: (response) => {
        if (response && response.success) {
          const arr = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          this.ocurrenciasRecientes = arr
            .slice()
            .sort((a: any, b: any) => new Date(b.fecha_hora_ocurrencia).getTime() - new Date(a.fecha_hora_ocurrencia).getTime())
            .slice(0, 5);
          if (!this.statsOcurrencias.total || this.statsOcurrencias.total === 0) {
            this.statsOcurrencias.total = arr.length || 0;
            const pendientes = arr.filter((o: any) => (o.estado === 'reportada' || o.estado === 'pendiente')).length;
            this.statsOcurrencias.pendientes = pendientes;
          }
        }
      },
      error: () => { }
    });
  }

  cargarRequisitoriasPeligrosas(): void {
    this.requisitoriaService.obtenerAlertasPeligrosas().subscribe({
      next: (res) => {
        if (res && res.success) {
          const data = res.data || [];
          this.alertasPeligrosas = data.slice(0, 6);
          this.requisitoriasPeligrosas = this.alertasPeligrosas;
        }
      },
      error: () => {
        this.requisitoriaService.obtenerVehiculos().subscribe({
          next: (rv) => {
            const veh = (rv?.data || []).filter((v: any) => (v.peligrosidad || v.nivel_peligrosidad) === 'alta' && v.estado === 'activa')
              .slice(0, 3)
              .map((v: any) => ({ ...v, tipo: 'vehiculo', descripcion: `${v.marca || ''} ${v.modelo || ''} - ${v.placa}`.trim() }));
            this.requisitoriaService.obtenerPersonas().subscribe({
              next: (rp) => {
                const per = (rp?.data || []).filter((p: any) => (p.peligrosidad || p.nivel_peligrosidad) === 'alta' && p.estado === 'activa')
                  .slice(0, 3)
                  .map((p: any) => ({ ...p, tipo: 'persona', descripcion: `${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}`.trim() }));
                this.alertasPeligrosas = [...veh, ...per];
                this.requisitoriasPeligrosas = this.alertasPeligrosas;
              }
            });
          }
        });
      }
    });
  }

  getPrioridadClass(prioridad: string): string {
    const classes: any = {
      'baja': 'badge-success',
      'media': 'badge-warning',
      'alta': 'badge-orange',
      'critica': 'badge-danger'
    };
    return classes[prioridad] || 'badge-secondary';
  }

  getEstadoClass(estado: string): string {
    const classes: any = {
      'pendiente': 'badge-secondary',
      'en_atencion': 'badge-warning',
      'atendida': 'badge-info',
      'cerrada': 'badge-success'
    };
    return classes[estado] || 'badge-secondary';
  }

  getPeligrosidadClass(nivel: string): string {
    const classes: any = {
      'alta': 'badge-danger',
      'media': 'badge-warning',
      'baja': 'badge-info'
    };
    return classes[nivel] || 'badge-secondary';
  }

  getTipoIcon(tipo: string): string {
    return tipo === 'vehiculo' ? 'fa-car' : 'fa-user-secret';
  }

  // Búsqueda de requisitorias
  buscarRequisitoria(termino: string): void {
    if (!termino || termino.trim().length < 3) {
      alert('⚠️ Ingrese al menos 3 caracteres para buscar');
      return;
    }

    termino = termino.trim().toUpperCase();
    console.log('🔍 Buscando:', termino);

    // Determinar si es placa (6-7 caracteres alfanuméricos) o DNI (8 dígitos)
    const esPlaca = /^[A-Z0-9]{6,7}$/.test(termino);
    const esDNI = /^\d{8}$/.test(termino);

    if (esPlaca) {
      this.buscarVehiculoRequisitoriado(termino);
    } else if (esDNI) {
      this.buscarPersonaRequisitoriada(termino);
    } else {
      alert('⚠️ Formato inválido.\nIngrese:\n- Placa: 6-7 caracteres (Ej: ABC123)\n- DNI: 8 dígitos');
    }
  }

  buscarVehiculoRequisitoriado(placa: string): void {
    this.requisitoriaService.consultarVehiculo(placa).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const v = res.data;
          const estado = v.estado === 'activa' ? 'ACTIVA' : 'ENCONTRADA';
          const peligrosidad = (v.peligrosidad || v.nivel_peligrosidad || '').toUpperCase();
          alert(`🚨 VEHÍCULO REQUISITORIADO ENCONTRADO\n\nPlaca: ${v.placa}\nMarca/Modelo: ${v.marca || ''} ${v.modelo || ''}\nColor: ${v.color || ''}\nPeligrosidad: ${peligrosidad}\nEstado: ${estado}\nMotivo: ${v.motivo || v.motivo_requisitoria || ''}\nAutoridad: ${v.institucion_solicita || v.autoridad_emite || ''}`);
        } else {
          alert(`✅ Vehículo NO REQUISITORIADO\n\nLa placa ${placa} no figura en la base de requisitorias.`);
        }
      },
      error: () => alert('Error al consultar requisitoria de vehículo')
    });
  }

  buscarPersonaRequisitoriada(dni: string): void {
    this.requisitoriaService.consultarPersona(dni).subscribe({
      next: (res) => {
        if (res && res.success && res.data) {
          const p = res.data;
          const estado = p.estado === 'activa' ? 'ACTIVA' : 'CAPTURADA';
          const peligrosidad = (p.peligrosidad || p.nivel_peligrosidad || '').toUpperCase();
          alert(`🚨 PERSONA REQUISITORIADA ENCONTRADA\n\nDNI: ${p.dni}\nNombre: ${p.nombres} ${p.apellido_paterno} ${p.apellido_materno}\nPeligrosidad: ${peligrosidad}\nEstado: ${estado}\nDelito: ${p.delito || ''}\nAutoridad: ${p.autoridad_emite || ''}\nCaracterísticas: ${p.caracteristicas_fisicas || ''}`);
        } else {
          alert(`✅ Persona NO REQUISITORIADA\n\nEl DNI ${dni} no figura en la base de requisitorias.`);
        }
      },
      error: () => alert('Error al consultar requisitoria de persona')
    });
  }

  private inicializarMapaDashboard(): void {
    if (typeof L === 'undefined') return;
    const el = document.getElementById('mapa-dashboard');
    if (!el) return;
    el.innerHTML = '';
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    // Centrar en Tacna
    this.map = L.map('mapa-dashboard', { zoomControl: false, attributionControl: false })
               .setView([this.centroTacna.lat, this.centroTacna.lng], 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
      detectRetina: true
    }).addTo(this.map);

    this.markersLayer = L.layerGroup().addTo(this.map);

    // Cargar puntos en vez de mapa de calor
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    const filtros = { fecha_desde: fecha.toISOString().split('T')[0] };

    this.ocurrenciaService.obtenerDatosMapaCalor(filtros).subscribe({
      next: (res) => {
        if (res.success && Array.isArray(res.data)) {
          const puntos = res.data;
          this.markersLayer.clearLayers();

          puntos.forEach((p: any) => {
            const lat = parseFloat(p.lat);
            const lng = parseFloat(p.lng);
            if (isNaN(lat) || isNaN(lng)) return;

            const color = this.obtenerColorPorPrioridad(p.prioridad);
            const icono = this.obtenerIconoPorTipo(p.tipo);

            const marker = L.marker([lat, lng], {
              icon: L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                         <i class="fas ${icono}" style="font-size: 11px;"></i>
                       </div>`,
                iconSize: [26, 26]
              })
            });

            marker.bindPopup(`
              <div style="min-width: 150px">
                <h6 class="mb-1 text-primary" style="font-size: 0.85rem;"><strong>${(p.tipo || 'Ocurrencia').toUpperCase()}</strong></h6>
                <p class="mb-0 text-muted" style="font-size: 0.75rem;"><i class="fas fa-layer-group mr-1"></i> Sector: ${p.sector || 'N/A'}</p>
                <p class="mb-0 text-muted" style="font-size: 0.75rem;"><i class="fas fa-exclamation-circle mr-1"></i> Prioridad: ${p.prioridad || 'Media'}</p>
              </div>
            `);

            marker.addTo(this.markersLayer);
          });

          // Ajustar mapa si hay puntos
          if (puntos.length > 0) {
            const bounds = L.latLngBounds(puntos.map((p: any) => [parseFloat(p.lat), parseFloat(p.lng)]));
            this.map.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
          }
        }
      }
    });
  }

  private obtenerIconoPorTipo(tipo: string): string {
    const iconos: any = {
      'robo': 'fa-user-secret',
      'hurto': 'fa-hand-holding',
      'accidente_transito': 'fa-car-crash',
      'agresion': 'fa-fist-raised',
      'vandalismo': 'fa-hammer',
      'emergencia_medica': 'fa-ambulance',
      'incendio': 'fa-fire',
      'violencia_familiar': 'fa-home'
    };
    return iconos[(tipo || '').toLowerCase()] || 'fa-exclamation-circle';
  }

  private obtenerColorPorPrioridad(prioridad: string): string {
    const colores: any = {
      'baja': '#28a745',
      'media': '#ffc107',
      'alta': '#fd7e14',
      'critica': '#dc3545'
    };
    return colores[(prioridad || '').toLowerCase()] || '#6c757d';
  }

  private cargarHeatDashboard(): void {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    const filtros = { fecha_desde: fecha.toISOString().split('T')[0] };
    this.ocurrenciaService.obtenerDatosMapaCalor(filtros).subscribe({
      next: (res) => {
        if (!this.map) return;
        const puntos = (res?.data || []).map((p: any) => [parseFloat(p.lat), parseFloat(p.lng), parseFloat(p.peso || 0.5)])
          .filter((x: any[]) => x.every((n: any, i: number) => (i < 2 ? !isNaN(n) : true)));
        if (this.heatLayer) {
          this.map.removeLayer(this.heatLayer);
          this.heatLayer = null;
        }
        if (typeof L.heatLayer !== 'undefined') {
          this.heatLayer = L.heatLayer(puntos, {
            radius: 20,
            blur: 22,
            maxZoom: 17,
            max: 1.0,
            gradient: {
              0.0: '#00204d',
              0.2: '#0055cc',
              0.4: '#00b3ff',
              0.6: '#7cff00',
              0.8: '#ffdd00',
              1.0: '#ff3b00'
            }
          }).addTo(this.map);
        } else {
          puntos.forEach((pt: any[]) => {
            L.circle([pt[0], pt[1]], { radius: 120, color: '#ff3b00', fillColor: '#ff3b00', fillOpacity: 0.25, weight: 0 }).addTo(this.map);
            L.circle([pt[0], pt[1]], { radius: 25, color: '#ff3b00', fillColor: '#ff3b00', fillOpacity: 0.6, weight: 0 }).addTo(this.map);
          });
        }
      }
    });
  }

  private calcularStatsOcurrenciasDesdeListado(): void {
    this.ocurrenciaService.obtenerOcurrencias().subscribe({
      next: (resp) => {
        const arr = Array.isArray(resp?.data) ? resp.data : (resp?.data?.data || []);
        this.statsOcurrencias.total = arr.length || 0;
        this.statsOcurrencias.pendientes = arr.filter((o: any) => (o.estado === 'reportada' || o.estado === 'pendiente')).length;
      }
    });
  }

  private calcularStatsRequisitoriasDesdeListas(): void {
    let vehCount = 0;
    let perCount = 0;
    this.requisitoriaService.obtenerVehiculos().subscribe({
      next: (rv) => {
        const veh = rv?.data || [];
        vehCount = veh.filter((v: any) => v.estado === 'activa').length;
        this.statsRequisitorias.vehiculos_vigentes = vehCount;
      }
    });
    this.requisitoriaService.obtenerPersonas().subscribe({
      next: (rp) => {
        const per = rp?.data || [];
        perCount = per.filter((p: any) => p.estado === 'activa').length;
        this.statsRequisitorias.personas_vigentes = perCount;
      }
    });
  }
}
