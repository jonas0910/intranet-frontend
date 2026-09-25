import { Component, OnInit, AfterViewInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, interval, takeUntil } from 'rxjs';
import { EquipoGpsService, AlertaGPS, PersonalUbicacion } from '../services/equipo-gps.service';
import { EchoService } from '../../../services/echo.service';
import { NotificationCenterService } from '../../../services/notification-center.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { MechanicalDepartmentService } from '../services/mechanical-department.service';

declare var L: any;

@Component({
  selector: 'app-monitoreo-gps',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './monitoreo-gps.component.html',
  styleUrls: ['./monitoreo-gps.component.scss']
})
export class MonitoreoGpsComponent implements OnInit, AfterViewInit, OnDestroy {
  subtitleItems = [
    { label: 'Control de Personal', icon: 'fas fa-users-cog' },
    { label: 'Control de Vehículos', icon: 'fas fa-truck-monster' },
    { label: 'Programación por Turnos de la Distribución de Servicios', icon: 'fas fa-calendar-alt' },
    { label: 'Mapa de Recorrido de los Vehículos', icon: 'fas fa-map-marked-alt' }
  ];

  private map: any;
  private alertsLayer: any;
  private historyLayer: any;
  private historySearchLayer: any;
  private destroy$ = new Subject<void>();

  centro = { lat: -18.0146, lng: -70.2520 }; // Tacna
  zoom = 15;

  // Datos de Monitoreo
  personalConUbicacion: PersonalUbicacion[] = [];
  alertas: AlertaGPS[] = [];
  unreadAlerts: AlertaGPS[] = [];
  historialUbicaciones: any[] = [];

  loading = false;
  loadingHistory = false;
  error: string | null = null;

  tabActiva: 'mapa' | 'tipos-alerta' = 'mapa';
  modoNavegacion: 'alertas' | 'personal' = 'personal';

  tiposAlerta: any[] = [];
  loadingTipos = false;
  mostrarModalTipo = false;
  guardandoTipo = false;
  formTipoAlerta = { id: 0, codigo: '', nombre: '', color_hex: '#dc3545', descripcion: '', activo: 1 };

  filtroPersonal: string = '';
  filtroAlertas: string = '';
  personalSeleccionadoId: number | null = null;
  private personalMarkersMap: Map<number, any> = new Map();

  // Gestión de Áreas
  isServiceMode = false;
  userDepartmentId: number | null = null;

  // Notificaciones
  ultimoEventoRecibido: string | null = null;
  showNotification = false;
  isMapExpanded = false;

  private readonly REFRESH_INTERVAL_MS = 60000; // Polling cada 60s as fallback

  // Gestión de Alertas
  mostrarModalResolver = false;
  alertaParaResolver: AlertaGPS | null = null;
  observacionResolucion = '';
  guardandoResolucion = false;

  // Filtros Historial
  mostrarModalHistorial = false;
  personalParaHistorial: PersonalUbicacion | null = null;
  filtrosHistorial = {
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0]
  };
  loadingHistorialModal = false;
  dropdownAbiertoId: number | null = null;

  constructor(
    private gpsService: EquipoGpsService,
    private echoService: EchoService,
    private notificationCenterService: NotificationCenterService,
    private mechanicalDeptService: MechanicalDepartmentService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isServiceMode = this.router.url.includes('/servicios/');
    
    this.mechanicalDeptService.getDepartmentInfo().subscribe({
      next: (res) => {
        if (res.success) {
          this.userDepartmentId = res.data.department_id;
          this.recargar(true);
        } else {
          this.recargar(true);
        }
      },
      error: () => this.recargar(true)
    });

    this.configurarWebSockets();

    interval(this.REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.recargar(false);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inicializarMapa();
    }, 200);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.echoService.leave('equipo-mecanico.gps');
    if (this.map) {
      this.map.remove();
    }
  }

  private configurarWebSockets(): void {
    this.echoService.setUseCustomEcho(true);
    this.echoService.connect();

    const channel = this.echoService.channel('equipo-mecanico.gps');

    channel.listen('UbicacionActualizada', (data: any) => {
      this.actualizarPosicionPersonalRealtime(data);
    });

    channel.listen('AlertaGpsRecibida', (alerta: AlertaGPS) => {
      this.procesarNuevaAlerta(alerta);
    });
  }

  private procesarNuevaAlerta(alerta: AlertaGPS): void {
    const existe = this.alertas.find(a => a.id === alerta.id);
    if (!existe) {
      this.alertas.unshift(alerta);
      if (alerta.estado === 'pendiente') {
        this.unreadAlerts.unshift(alerta);
        this.actualizarMapa();
        this.notificarAlerta(alerta);
      }
    }
  }

  private notificarAlerta(alerta: AlertaGPS): void {
    this.ultimoEventoRecibido = `ALERTA GPS: ${alerta.tipo_nombre} - Personal ${alerta.personal_nombre}`;
    this.showNotification = true;
    setTimeout(() => this.showNotification = false, 8000);
  }

  private actualizarPosicionPersonalRealtime(data: any): void {
    const index = this.personalConUbicacion.findIndex(p => p.id === parseInt(data.id_personal));
    if (index !== -1) {
      this.personalConUbicacion[index] = {
        ...this.personalConUbicacion[index],
        latitud: parseFloat(data.latitud),
        longitud: parseFloat(data.longitud),
        velocidad_actual: parseFloat(data.velocidad || 0),
        tipo_seguimiento: data.tipo_seguimiento,
        ultima_actualizacion: data.ultima_actualizacion
      };
      this.actualizarMapa();
    } else {
      this.cargarPersonalConUbicacion(false);
    }
  }

  inicializarMapa(): void {
    const mapElement = document.getElementById('mapa-gps');
    if (!mapElement || this.map || typeof L === 'undefined') return;

    try {
      this.map = L.map('mapa-gps', { zoomControl: false })
        .setView([this.centro.lat, this.centro.lng], this.zoom);

      L.control.zoom({ position: 'topright' }).addTo(this.map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19
      }).addTo(this.map);

      this.alertsLayer = L.layerGroup().addTo(this.map);
      this.historyLayer = L.layerGroup().addTo(this.map);
      this.historySearchLayer = L.layerGroup().addTo(this.map);

      this.actualizarMapa();
    } catch (error) {
      console.error('❌ Error inicializando mapa:', error);
    }
  }

  cargarPersonalConUbicacion(ajustarVista: boolean = false): void {
    this.loading = true;
    const params: any = {};
    if (this.isServiceMode && this.userDepartmentId) {
      params.department_id = this.userDepartmentId;
    }

    this.gpsService.obtenerPersonalConUbicacion(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.personalConUbicacion = (res.data || []).map((p: any) => ({
            ...p,
            latitud: parseFloat(p.latitud),
            longitud: parseFloat(p.longitud)
          }));
          this.actualizarMapa(ajustarVista);
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  ajustarVistaATodos(): void {
    if (!this.map) return;
    const points: any[] = [];
    this.personalConUbicacion.forEach(p => { 
      if (p.latitud && p.longitud) points.push([p.latitud, p.longitud]); 
    });
    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }

  cargarAlertasRecientes(): void {
    const params: any = {};
    if (this.isServiceMode && this.userDepartmentId) {
      params.department_id = this.userDepartmentId;
    }

    this.gpsService.listarAlertas(params).subscribe({
      next: (res) => {
        if (res.success) {
          this.alertas = res.data || [];
          this.unreadAlerts = this.alertas.filter(a => a.estado === 'pendiente');
          this.actualizarMapa();
        }
      }
    });
  }

  actualizarMapa(ajustarVista: boolean = false): void {
    if (!this.map) return;

    this.alertsLayer.clearLayers();

    // 1. Alertas Activas
    this.unreadAlerts.forEach(alerta => {
      if (alerta.lat && alerta.lng) {
        const color = alerta.tipo_color_hex || '#dc3545';
        const alertMarker = L.circleMarker([alerta.lat, alerta.lng], {
          radius: 12,
          fillColor: color,
          fillOpacity: 0.7,
          color: 'white',
          weight: 2,
          className: 'blink-animation shadow'
        });

        const popup = `
          <div class="custom-popup" style="min-width: 180px">
            <strong style="color: ${color}">${alerta.tipo_nombre}</strong><br>
            <small>Personal: ${alerta.personal_nombre}</small><br>
            <p class="mt-1 mb-2">${alerta.mensaje || 'Alerta detectada'}</p>
            <button class="btn btn-xs btn-primary btn-block" onclick="window.angularComponentReference.abrirResolver(${alerta.id})">
              Gestionar
            </button>
          </div>
        `;
        alertMarker.bindPopup(popup).addTo(this.alertsLayer);
      }
    });

    // 2. Marcadores de Personal
    const idsPresentes = new Set(this.personalConUbicacion.filter(p => p.latitud && p.longitud).map(p => p.id));

    // Eliminar marcadores huérfanos
    for (const [id, marker] of this.personalMarkersMap.entries()) {
      if (!idsPresentes.has(id)) {
        this.map.removeLayer(marker);
        this.personalMarkersMap.delete(id);
      }
    }

    // Actualizar o crear marcadores
    this.personalConUbicacion.forEach(pers => {
      if (!pers.latitud || !pers.longitud) return;

      const coords: [number, number] = [pers.latitud, pers.longitud];
      const esSeleccionado = pers.id === this.personalSeleccionadoId;
      const iconHtml = this.getIconoPersonal(pers);

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-div-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      if (this.personalMarkersMap.has(pers.id)) {
        const marker = this.personalMarkersMap.get(pers.id);
        marker.setLatLng(coords);
        marker.setIcon(customIcon);
        if (esSeleccionado && marker.getPopup()) {
          marker.getPopup().setContent(this.getPopupContent(pers));
        }
      } else {
        const marker = L.marker(coords, { icon: customIcon, zIndexOffset: esSeleccionado ? 1000 : 0 })
          .addTo(this.map)
          .bindPopup(this.getPopupContent(pers));
        
        marker.on('click', () => this.seleccionarPersonal(pers));
        this.personalMarkersMap.set(pers.id, marker);
      }
    });

    if (ajustarVista && idsPresentes.size > 0) {
      const markers = Array.from(this.personalMarkersMap.values());
      const group = L.featureGroup(markers);
      this.map.fitBounds(group.getBounds().pad(0.1));
    }

    this.dibujarHistorialEnMapa();

    (window as any).angularComponentReference = {
      abrirResolver: (id: number) => this.abrirModalResolver(id),
      seleccionarEnMapa: (id: number) => {
        const personal = this.personalConUbicacion.find(p => p.id === id);
        if (personal) this.seleccionarPersonal(personal);
      }
    };
  }

  getIconoPersonal(p: PersonalUbicacion): string {
    const color = p.tipo_seguimiento === 'vehicular' ? '#2563eb' : '#059669';
    const iconClass = p.tipo_seguimiento === 'vehicular' ? 'fa-car' : 'fa-walking';
    const esSeleccionado = p.id === this.personalSeleccionadoId;
    const glow = esSeleccionado ? `box-shadow: 0 0 10px ${color}; border: 3px solid ${color};` : `border: 2px solid white;`;
    
    return `
      <div class="marker-container" style="position: relative;">
        <div class="marker-card" style="background: white; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; box-shadow: 0 3px 6px rgba(0,0,0,0.3); ${glow}">
          <i class="fas ${iconClass}" style="color: ${color}; font-size: 18px;"></i>
        </div>
        <div class="status-dot" style="position: absolute; bottom: 0; right: 0; width: 12px; height: 12px; background: #10b981; border: 2px solid white; border-radius: 50%;"></div>
      </div>
    `;
  }

  getPopupContent(p: PersonalUbicacion): string {
    const vehiculoInfo = p.equipo_codigo ? `
      <div class="mt-2 pt-2 border-top">
        <small class="text-muted d-block">Vehículo Asignado:</small>
        <strong>${p.equipo_codigo}</strong> <small>(${p.equipo_placa})</small>
      </div>
    ` : '';

    return `
      <div class="p-1" style="min-width: 150px;">
        <h6 class="mb-1 font-weight-bold text-primary">${p.nombre_completo}</h6>
        <div class="text-xs mb-1">
          <i class="fas fa-clock mr-1 text-muted"></i> ${this.formatFechaRelative(p.ultima_actualizacion)}
        </div>
        <div class="text-xs">
          <i class="fas fa-tachometer-alt mr-1 text-muted"></i> ${p.velocidad_actual || 0} km/h
        </div>
        ${vehiculoInfo}
        <button class="btn btn-xs btn-primary btn-block mt-2 rounded-pill shadow-sm" onclick="window.angularComponentReference.seleccionarEnMapa(${p.id})">
          Ver Historial
        </button>
      </div>
    `;
  }

  private dibujarHistorialEnMapa(): void {
    if (!this.map || !this.historyLayer) return;
    this.historyLayer.clearLayers();

    if (this.modoNavegacion === 'personal' && this.historialUbicaciones.length > 1) {
      const latlngs = this.historialUbicaciones.map(p => [parseFloat(p.latitud), parseFloat(p.longitud)]);
      L.polyline(latlngs, { color: '#2563eb', weight: 4, opacity: 0.8, smoothFactor: 1.5 }).addTo(this.historyLayer);

      this.historialUbicaciones.forEach((p, i) => {
        if (i % 10 === 0) {
          L.circleMarker([parseFloat(p.latitud), parseFloat(p.longitud)], { 
            radius: 4, fillColor: '#2563eb', fillOpacity: 0.6, color: 'white', weight: 1.5 
          }).bindTooltip(`Visto: ${this.formatFechaFull(p.created_at)}`).addTo(this.historyLayer);
        }
      });
    }
  }

  seleccionarPersonal(p: PersonalUbicacion): void {
    this.personalSeleccionadoId = p.id;
    this.historyLayer.clearLayers();
    if (p.latitud && p.longitud) {
      this.map.setView([p.latitud, p.longitud], 17);
    }
    this.cargarHistorialPersonal(p.id);
    this.actualizarMapa();
  }

  cargarHistorialPersonal(id: number): void {
    this.loadingHistory = true;
    this.gpsService.obtenerHistorialUbicacion(id, { limite: 300 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.historialUbicaciones = res.data || [];
          this.dibujarHistorialEnMapa();
        }
        this.loadingHistory = false;
      },
      error: () => this.loadingHistory = false
    });
  }

  filtrarPersonal(): PersonalUbicacion[] {
    let list = this.personalConUbicacion;
    if (this.filtroPersonal) {
      const f = this.filtroPersonal.toLowerCase();
      list = list.filter(p =>
        p.nombre_completo.toLowerCase().includes(f) || (p.equipo_codigo && p.equipo_codigo.toLowerCase().includes(f))
      );
    }
    
    // Ordenar: primero los que tienen ubicación activa
    return list.sort((a, b) => {
      const aHasLoc = a.latitud != null && a.longitud != null;
      const bHasLoc = b.latitud != null && b.longitud != null;
      if (aHasLoc && !bHasLoc) return -1;
      if (!aHasLoc && bHasLoc) return 1;
      
      // Si ambos tienen o no tienen ubicación, ordenar por nombre
      return a.nombre_completo.localeCompare(b.nombre_completo);
    });
  }

  formatFecha(fecha: any): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
  }

  formatFechaFull(fecha: any): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
  }

  formatFechaRelative(fecha: any): string {
    if (!fecha) return 'Sin fecha';
    const diff = Math.floor((new Date().getTime() - new Date(fecha).getTime()) / 60000);
    if (diff < 1) return 'Hace un momento';
    if (diff < 60) return `Hace ${diff} min`;
    return this.formatFecha(fecha);
  }

  recargar(primeraVez: boolean = false): void {
    this.cargarPersonalConUbicacion(primeraVez);
    this.cargarAlertasRecientes();
    if (primeraVez) this.cargarTiposAlerta();
  }

  cambiarModoNavegacion(modo: 'alertas' | 'personal'): void {
    this.modoNavegacion = modo;
    this.historialUbicaciones = [];
    this.actualizarMapa();
  }

  toggleMapExpanded(): void {
    this.isMapExpanded = !this.isMapExpanded;
    setTimeout(() => { if (this.map) this.map.invalidateSize(); }, 200);
  }

  cargarTiposAlerta(): void {
    this.loadingTipos = true;
    this.gpsService.listarTiposAlerta().subscribe({
      next: (res) => {
        if (res.success) this.tiposAlerta = res.data || [];
        this.loadingTipos = false;
      },
      error: () => this.loadingTipos = false
    });
  }

  abrirModalTipo(tipo?: any): void {
    if (tipo) {
      this.formTipoAlerta = { ...tipo, activo: tipo.activo ? 1 : 0 };
    } else {
      this.formTipoAlerta = { id: 0, codigo: '', nombre: '', color_hex: '#dc3545', descripcion: '', activo: 1 };
    }
    this.mostrarModalTipo = true;
  }

  guardarTipoAlerta(): void {
    if (!this.formTipoAlerta.codigo || !this.formTipoAlerta.nombre) {
      alert('Código y Nombre son requeridos');
      return;
    }

    this.guardandoTipo = true;
    const observer = {
      next: (res: any) => {
        this.guardandoTipo = false;
        if (res.success) {
          this.mostrarModalTipo = false;
          this.cargarTiposAlerta();
        }
      },
      error: () => this.guardandoTipo = false
    };

    if (this.formTipoAlerta.id > 0) {
      this.gpsService.actualizarTipoAlerta(this.formTipoAlerta.id, this.formTipoAlerta).subscribe(observer);
    } else {
      this.gpsService.crearTipoAlerta(this.formTipoAlerta).subscribe(observer);
    }
  }

  eliminarTipoAlerta(id: number): void {
    if (confirm('¿Está seguro de eliminar este tipo de alerta?')) {
      this.gpsService.eliminarTipoAlerta(id).subscribe({
        next: (res) => {
          if (res.success) this.cargarTiposAlerta();
        }
      });
    }
  }

  abrirModalResolver(id: number): void {
    this.alertaParaResolver = this.alertas.find(a => a.id === id) || null;
    this.observacionResolucion = '';
    this.mostrarModalResolver = true;
  }

  confirmarGestionAlerta(): void {
    if (!this.alertaParaResolver) return;
    this.guardandoResolucion = true;
    this.gpsService.resolverAlerta(this.alertaParaResolver.id, {
      observaciones: this.observacionResolucion || 'Atendida desde panel'
    }).subscribe({
      next: (res) => {
        this.guardandoResolucion = false;
        if (res.success) {
          this.unreadAlerts = this.unreadAlerts.filter(a => a.id !== this.alertaParaResolver?.id);
          this.mostrarModalResolver = false;
          this.actualizarMapa();
        }
      },
      error: () => this.guardandoResolucion = false
    });
  }

  abrirModalHistorial(p: PersonalUbicacion): void {
    this.personalParaHistorial = p;
    this.mostrarModalHistorial = true;
  }

  consultarHistorialFiltros(): void {
    if (!this.personalParaHistorial) return;
    this.loadingHistorialModal = true;
    this.historySearchLayer.clearLayers();

    this.gpsService.obtenerHistorialUbicacion(this.personalParaHistorial.id, {
      fecha_desde: this.filtrosHistorial.fecha_desde,
      fecha_hasta: this.filtrosHistorial.fecha_hasta,
      limite: 1000
    }).subscribe({
      next: (res) => {
        this.loadingHistorialModal = false;
        if (res.success && res.data?.length > 0) {
          this.renderizarHistorialHistorico(res.data);
          this.mostrarModalHistorial = false;
        } else {
          alert('No se encontraron registros para este rango.');
        }
      },
      error: () => this.loadingHistorialModal = false
    });
  }

  private renderizarHistorialHistorico(puntos: any[]): void {
    const latlngs = puntos.map(p => [parseFloat(p.latitud), parseFloat(p.longitud)]);
    L.polyline(latlngs, { color: '#2563eb', weight: 5, opacity: 0.8 }).addTo(this.historySearchLayer);
    
    puntos.forEach((p, i) => {
      if (i % 15 === 0) {
        L.circleMarker([p.latitud, p.longitud], { radius: 5, fillColor: '#2563eb', color: 'white', weight: 2 })
          .bindTooltip(`Visto: ${this.formatFechaFull(p.created_at)}`).addTo(this.historySearchLayer);
      }
    });

    const bounds = L.latLngBounds(latlngs);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }
}
