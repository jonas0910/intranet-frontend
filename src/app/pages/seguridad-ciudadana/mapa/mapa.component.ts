import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { OcurrenciaService } from '../services/ocurrencia.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

// Declarar Leaflet globalmente (se instalará: npm install leaflet leaflet.heat)
declare var L: any;

@Component({
  selector: 'app-seguridad-mapa',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss']
})
export class SeguridadMapaComponent implements OnInit, AfterViewInit, OnDestroy {
  subtitleItems = [
    { label: 'Mapa de Calor de ocurrencias', icon: 'fas fa-route' },
  ];

  private map: any;
  private heatLayer: any;
  private markersLayer: any;
  private heatLegend: any;

  // Configuración del mapa
  centro = { lat: -12.0464, lng: -77.0428 }; // Lima, Perú - AJUSTAR según tu municipio
  zoom = 13;

  // Filtros
  filtros = {
    fecha_desde: this.obtenerFechaHace30Dias(),
    tipo: '',
    distrito: ''
  };

  // Datos
  puntosCalor: any[] = [];
  ocurrenciasConUbicacion: any[] = [];

  // Estados
  loading = false;
  vistaActual: 'calor' | 'marcadores' = 'calor';
  isMapExpanded = false;

  // Opciones
  tiposOcurrencia = [
    { value: 'robo', label: 'Robo' },
    { value: 'hurto', label: 'Hurto' },
    { value: 'accidente_transito', label: 'Accidente de Tránsito' },
    { value: 'agresion', label: 'Agresión' },
    { value: 'vandalismo', label: 'Vandalismo' },
    { value: 'alteracion_orden', label: 'Alteración del Orden' },
    { value: 'emergencia_medica', label: 'Emergencia Médica' },
    { value: 'incendio', label: 'Incendio' },
    { value: 'violencia_familiar', label: 'Violencia Familiar' },
    { value: 'otros', label: 'Otros' }
  ];

  constructor(private ocurrenciaService: OcurrenciaService) { }

  ngOnInit(): void {
    this.cargarDatosMapaCalor();
  }

  ngAfterViewInit(): void {
    // Inicializar el mapa después de que la vista esté lista
    setTimeout(() => {
      this.inicializarMapa();
    }, 100);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Inicializar mapa de Leaflet
   */
  inicializarMapa(): void {
    console.log('🗺️ Inicializando mapa de Leaflet...');

    // Verificar si Leaflet está disponible
    if (typeof L === 'undefined') {
      console.error('❌ Leaflet no está cargado. Ejecuta: npm install leaflet leaflet.heat');
      return;
    }

    try {
      // Crear mapa
      this.map = L.map('mapa-seguridad').setView([this.centro.lat, this.centro.lng], this.zoom);

      // Agregar capa de tiles con alto contraste (fondo oscuro para resaltar calor)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
        detectRetina: true
      }).addTo(this.map);

      // Inicializar capa de marcadores
      this.markersLayer = L.layerGroup().addTo(this.map);

      // Recalibrar el radio del heatmap al cambiar zoom para mantener legibilidad
      this.map.on('zoomend', () => {
        if (this.vistaActual === 'calor') {
          this.actualizarMapa();
        }
      });

      console.log('✅ Mapa inicializado correctamente');

      // Cargar datos
      this.actualizarMapa();
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
    }
  }

  /**
   * Cargar datos del mapa de calor
   */
  cargarDatosMapaCalor(): void {
    this.loading = true;
    this.ocurrenciaService.obtenerDatosMapaCalor(this.filtros).subscribe({
      next: (response) => {
        if (response.success) {
          // Asegurar que lat/lng sean números y filtrar inválidos
          this.puntosCalor = (response.data || []).map((p: any) => ({
            ...p,
            lat: parseFloat(p.lat),
            lng: parseFloat(p.lng),
            peso: parseFloat(p.peso || 1)
          })).filter((p: any) => !isNaN(p.lat) && !isNaN(p.lng));

          console.log(`📊 Datos de mapa de calor cargados:`, this.puntosCalor);

          if (this.map) {
            this.actualizarMapa();

            // Forzar actualización de tamaño para evitar gris/blanco
            setTimeout(() => {
              this.map.invalidateSize();

              // Auto-centrar mapa si hay puntos
              if (this.puntosCalor.length > 0) {
                const bounds = L.latLngBounds(this.puntosCalor.map(p => [p.lat, p.lng]));
                this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
                console.log('🎯 Mapa centrado en los puntos');
              }
            }, 300);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando datos del mapa:', error);
        this.loading = false;
      }
    });
  }

  /**
   * Actualizar el mapa con los datos actuales
   */
  actualizarMapa(): void {
    if (!this.map) return;

    // Limpiar capas anteriores
    if (this.heatLayer) {
      this.map.removeLayer(this.heatLayer);
    }
    this.markersLayer.clearLayers();

    if (this.vistaActual === 'calor') {
      this.mostrarMapaCalor();
    } else {
      this.mostrarMarcadores();
    }
  }

  /**
   * Mostrar mapa de calor
   */
  mostrarMapaCalor(): void {
    const hayHeatLayer = typeof L.heatLayer !== 'undefined';

    // Si no hay plugin de calor, usamos la técnica de círculos de sombreado
    // Pero el usuario pidió círculos de todos modos para que se "sobrepongan" y se vea pro

    // Preparar puntos para el mapa de calor plugin
    const heatPoints = this.puntosCalor.map(punto => {
      const w = this.calcularPeso(punto);
      return [punto.lat, punto.lng, w];
    });

    // 1. Mostrar el HeatLayer (Glow/Gradiente)
    if (hayHeatLayer) {
      const radius = this.getHeatRadius();
      const options = {
        radius,
        blur: 28,
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
      };
      this.heatLayer = L.heatLayer(heatPoints, options).addTo(this.map);
      this.agregarLeyendaCalor();
    } else {
      this.mostrarFallbackCalor();
    }

    console.log(`🔥 Mapa de calor y densidad mostrado con ${this.puntosCalor.length} puntos de influencia`);
  }

  /**
   * Mostrar marcadores individuales
   */
  mostrarMarcadores(): void {
    this.puntosCalor.forEach(punto => {
      const icono = this.obtenerIconoPorTipo(punto.tipo);
      const color = this.obtenerColorPorPrioridad(punto.prioridad);

      const marker = L.marker([punto.lat, punto.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                   <i class="fas ${icono}"></i>
                 </div>`,
          iconSize: [30, 30]
        })
      });

      marker.bindPopup(`
        <div style="min-width: 200px">
          <h6 class="mb-1 text-primary"><strong>${this.getTipoLabel(punto.tipo)}</strong></h6>
          <hr class="my-1">
          <p class="mb-1"><strong>Distrito:</strong> ${punto.distrito || 'No especificado'}</p>
          <p class="mb-1"><strong>Prioridad:</strong> <span class="badge" style="background-color: ${color}; color: white;">${punto.prioridad.toUpperCase()}</span></p>
          <p class="mb-0 text-muted"><small><i class="fas fa-map-marker-alt mr-1"></i> ${punto.lat.toFixed(6)}, ${punto.lng.toFixed(6)}</small></p>
        </div>
      `);

      marker.addTo(this.markersLayer);
    });

    console.log(`📍 ${this.puntosCalor.length} marcadores agregados al mapa`);
  }

  /**
   * Cambiar vista del mapa
   */
  cambiarVista(vista: 'calor' | 'marcadores'): void {
    this.vistaActual = vista;
    this.actualizarMapa();
  }

  toggleMapExpanded(): void {
    this.isMapExpanded = !this.isMapExpanded;
    
    // Toggle body scroll to prevent background scrolling in fullscreen
    document.body.style.overflow = this.isMapExpanded ? 'hidden' : '';

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 150);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMapExpanded) {
      this.toggleMapExpanded();
    }
  }

  /**
   * Aplicar filtros
   */
  aplicarFiltros(): void {
    console.log('🔍 Aplicando filtros:', this.filtros);
    this.cargarDatosMapaCalor();
  }

  // =================== Utilidades de visualización de calor ===================
  private calcularPeso(punto: any): number {
    if (punto && typeof punto.peso !== 'undefined' && !isNaN(parseFloat(punto.peso))) {
      return Math.max(0.1, Math.min(1, parseFloat(punto.peso)));
    }
    const p = (punto?.prioridad || '').toLowerCase();
    if (p === 'critica') return 1.0;
    if (p === 'alta') return 0.8;
    if (p === 'media') return 0.5;
    if (p === 'baja') return 0.25;
    return 0.4;
  }

  private getHeatRadius(): number {
    if (!this.map) return 28;
    const z = this.map.getZoom();
    if (z >= 17) return 14;
    if (z >= 15) return 18;
    if (z >= 13) return 24;
    return 30;
  }

  private obtenerRadioPorPrioridad(prioridad: string): number {
    const p = (prioridad || '').toLowerCase();
    if (p === 'critica') return 220;
    if (p === 'alta') return 180;
    if (p === 'media') return 140;
    if (p === 'baja') return 100;
    return 120;
  }

  private agregarLeyendaCalor(): void {
    if (this.heatLegend) {
      this.map.removeControl(this.heatLegend);
      this.heatLegend = null;
    }
    this.heatLegend = L.control({ position: 'bottomright' });
    this.heatLegend.onAdd = () => {
      const div = L.DomUtil.create('div', 'info legend');
      div.innerHTML = `
        <div style="background:#ffffff; padding:8px 10px; border-radius:6px; color:#333; font-size:12px; border:1px solid rgba(0,0,0,0.15);">
          <div style="margin-bottom:4px;"><strong>Intensidad</strong></div>
          <div style="width:160px;height:10px;background:linear-gradient(to right, #00204d, #0055cc, #00b3ff, #7cff00, #ffdd00, #ff3b00); border-radius:4px; border:1px solid rgba(0,0,0,0.1);"></div>
          <div style="display:flex;justify-content:space-between;margin-top:2px;">
            <span>Baja</span><span>Alta</span>
          </div>
        </div>
      `;
      return div;
    };
    this.heatLegend.addTo(this.map);
  }

  private mostrarFallbackCalor(): void {
    this.puntosCalor.forEach(punto => {
      const color = this.obtenerColorPorPrioridad(punto.prioridad);
      const radio = this.obtenerRadioPorPrioridad(punto.prioridad);
      const outer = L.circle([punto.lat, punto.lng], {
        color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.25,
        radius: radio
      });
      const inner = L.circle([punto.lat, punto.lng], {
        color,
        weight: 0,
        fillColor: color,
        fillOpacity: 0.6,
        radius: Math.max(20, radio * 0.18)
      });
      outer.addTo(this.markersLayer);
      inner.addTo(this.markersLayer);
    });
  }

  /**
   * Limpiar filtros
   */
  limpiarFiltros(): void {
    this.filtros = {
      fecha_desde: this.obtenerFechaHace30Dias(),
      tipo: '',
      distrito: ''
    };
    this.cargarDatosMapaCalor();
  }

  /**
   * Obtener ícono según tipo de ocurrencia
   */
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
    return iconos[tipo] || 'fa-exclamation-circle';
  }

  /**
   * Obtener color según prioridad
   */
  private obtenerColorPorPrioridad(prioridad: string): string {
    const colores: any = {
      'baja': '#28a745',
      'media': '#ffc107',
      'alta': '#fd7e14',
      'critica': '#dc3545'
    };
    return colores[prioridad] || '#6c757d';
  }

  /**
   * Obtener fecha de hace 30 días
   */
  private obtenerFechaHace30Dias(): string {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() - 30);
    return fecha.toISOString().split('T')[0];
  }

  /**
   * Obtener label legible para el tipo
   */
  getTipoLabel(tipo: string): string {
    const t = this.tiposOcurrencia.find(x => x.value === tipo);
    return t ? t.label : tipo;
  }

  /**
   * Buscar requisitoria (método del dashboard también)
   */
  buscarRequisitoria(termino: string): void {
    // TODO: Implementar búsqueda y mostrar resultado
    console.log('Buscando:', termino);
  }
}
