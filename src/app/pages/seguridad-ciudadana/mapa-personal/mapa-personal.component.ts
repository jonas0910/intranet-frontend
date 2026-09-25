import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PersonalUbicacionService, PersonalUbicacion } from '../services/personal-ubicacion.service';
import { AlertasService, TipoAlerta, Alerta } from '../services/alertas.service';
import { EchoService } from '../../../services/echo.service';
import { NotificationCenterService } from '../../../services/notification-center.service';
import { HttpClient } from '@angular/common/http';
import { Subject, interval, takeUntil } from 'rxjs';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';
import { environment } from '../../../../environments/environment';

declare var L: any;

@Component({
  selector: 'app-seguridad-mapa-personal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './mapa-personal.component.html',
  styleUrls: ['./mapa-personal.component.scss']
})
export class SeguridadMapaPersonalComponent implements OnInit, AfterViewInit, OnDestroy {
  subtitleItems = [
    { label: 'Mapa de recorrido de los vehiculos de patrullaje', icon: 'fas fa-users' },
    { label: 'Mapa de ubicacion de personal.', icon: 'fas fa-users' },
  ];

  private map: any;
  private markersLayer: any;
  private alertsLayer: any;
  private historyLayer: any;
  private destroy$ = new Subject<void>();

  centro = { lat: -18.0145, lng: -70.2536 }; // Tacna
  zoom = 13;

  personalConUbicacion: PersonalUbicacion[] = [];
  alertas: Alerta[] = []; // Todas las alertas del día/recientes
  unreadAlerts: Alerta[] = []; // Solo las pendientes (para el mapa)
  historialUbicaciones: any[] = [];

  loading = false;
  loadingHistory = false;
  error: string | null = null;

  // Modos de navegación
  tabActiva: 'mapa' | 'tipos-alerta' = 'mapa';
  modoNavegacion: 'alertas' | 'personal' | 'vehiculos' = 'alertas';

  tiposAlerta: TipoAlerta[] = [];
  loadingTipos = false;
  mostrarModalTipo = false;
  tipoAlertaEdicion: TipoAlerta | null = null;
  formTipoAlerta: Partial<TipoAlerta> = { codigo: '', nombre: '', color_hex: '#999999', descripcion: '', orden: 0, activo: 1 };

  filtroPersonal: string = '';
  filtroAlertas: string = '';
  personalSeleccionadoId: number | null = null;
  alertaSeleccionadaId: number | null = null;
  private personalMarkersMap: Map<number, any> = new Map();

  // Notificaciones en tiempo real
  ultimoEventoRecibido: string | null = null;
  showNotification = false;
  isMapExpanded = false;
  showFullscreenPanel = false;

  private readonly REFRESH_INTERVAL_MS = 60000;

  // Gestión de Alertas (Resolución/Rechazo)
  mostrarModalResolver = false;
  alertaParaResolver: Alerta | null = null;
  resolverConOcurrencia = true;
  observacionResolucion = '';
  isRechazo = false;
  guardandoResolucion = false;
  sector_id_resolucion: number | null = null;
  sectores: any[] = [];
  
  // Nuevos campos para resolución
  direccion_resolucion = '';
  tipo_ocurrencia_resolucion = 'otros';
  personal_id_resolucion: number | null = null;
  personalActivo: any[] = [];
  tiposOcurrencia = [
    { id: 'robo', nombre: 'Robo' },
    { id: 'hurto', nombre: 'Hurto' },
    { id: 'accidente_transito', nombre: 'Accidente de Tránsito' },
    { id: 'agresion', nombre: 'Agresión' },
    { id: 'vandalismo', nombre: 'Vandalismo' },
    { id: 'alteracion_orden', nombre: 'Alteración del Orden' },
    { id: 'emergencia_medica', nombre: 'Emergencia Médica' },
    { id: 'incendio', nombre: 'Incendio' },
    { id: 'violencia_familiar', nombre: 'Violencia Familiar' },
    { id: 'otros', nombre: 'Otros' }
  ];

  // Filtros Historial Avanzado
  mostrarModalHistorial = false;
  personalParaHistorial: any = null;
  filtrosHistorial = {
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    hora_desde: '00:00',
    hora_hasta: '23:59',
    tipo: 'ubicacion' as 'ubicacion' | 'alertas'
  };
  loadingHistorialModal = false;
  dropdownAbiertoId: number | null = null;

  private historySearchLayer: any;

  isServiceMode = false;
  userDepartment: any = null;

  constructor(
    private personalUbicacionService: PersonalUbicacionService,
    private alertasService: AlertasService,
    private echoService: EchoService,
    private notificationCenter: NotificationCenterService,
    private toast: ToastService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    this.isServiceMode = this.router.url.includes('/servicios/');
  }

  ngOnInit(): void {
    this.recargar(true);
    this.configurarWebSockets();
    this.cargarSectores();
    this.cargarPersonalActivo();

    if (this.isServiceMode) {
      this.obtenerMiDepartamento();
    }

    interval(this.REFRESH_INTERVAL_MS)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        console.log('🔄 Sincronizando datos...');
        this.recargar(false);
      });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.inicializarMapa();
    }, 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.echoService.leave('seguridad-ciudadana.ubicacion');
    this.echoService.leave('seguridad-ciudadana.alertas');
    // Restore body scroll if we're destroyed while in fullscreen
    document.body.style.overflow = '';
    if (this.map) {
      this.map.remove();
    }
  }

  private configurarWebSockets(): void {
    console.log('🔌 Iniciando WebSockets para Seguridad Ciudadana...');

    // Asegurarse de que Echo esté conectado
    this.echoService.setUseCustomEcho(true);
    this.echoService.connect();

    const channelUbi = this.echoService.channel('seguridad-ciudadana.ubicacion');
    const channelAlertas = this.echoService.channel('seguridad-ciudadana.alertas');

    console.log('📡 Suscribiéndose a canales:', ['seguridad-ciudadana.ubicacion', 'seguridad-ciudadana.alertas']);

    // Listener para Ubicaciones
    const handleUbi = (data: any) => {
      console.log('📍 [WS] Nueva posición recibida:', data);
      this.actualizarUbicacionPersonalRealtime(data);
    };
    channelUbi.listen('UbicacionActualizada', handleUbi);
    channelUbi.listen('.UbicacionActualizada', (data: any) => {
      console.warn('📍 [WS] Recibido con punto inicial (.):', data);
      handleUbi(data);
    });
    // Listener para Alertas
    const handleAlerta = (alerta: Alerta) => {
      console.log('🚨 [WS] ¡ALERTA RECIBIDA EN TIEMPO REAL!:', alerta);
      this.procesarNuevaAlerta(alerta);
    };
    channelAlertas.listen('AlertaRecibida', handleAlerta);
    channelAlertas.listen('.AlertaRecibida', (data: any) => {
      console.warn('🚨 [WS] Alerta recibida con punto inicial (.):', data);
      handleAlerta(data);
    });

    // Verificar si el canal está suscrito (opcional según la versión de Echo)
    setTimeout(() => {
      console.log('✅ Estado de WebSockets verificado. Si envías una alerta ahora, deberías ver un log aquí.');
    }, 2000);
  }

  obtenerMiDepartamento(): void {
    this.http.get<any>(`${environment.apiUrl}/seguridad-ciudadana/mi-departamento`).subscribe({
      next: (res) => {
        if (res.success) {
          this.userDepartment = res.data;
          this.cdr.detectChanges();
        }
      }
    });
  }

  private procesarNuevaAlerta(alerta: Alerta): void {
    // Añadir a la lista general de alertas si no existe
    const existeEnLista = this.alertas.find(a => a.id === alerta.id);
    if (!existeEnLista) {
      this.alertas.unshift(alerta);
    }

    // Si no está leída, manejar como alerta activa en mapa
    if (!alerta.leida_at) {
      const existeEnMap = this.unreadAlerts.find(a => a.id === alerta.id);
      if (!existeEnMap) {
        this.unreadAlerts.unshift(alerta);
        this.actualizarMapa();
        this.notificarAlerta(alerta);
      }
    }
  }

  private notificarAlerta(alerta: Alerta): void {
    this.ultimoEventoRecibido = `NUEVA ALERTA: ${alerta.tipo_nombre} - ${alerta.personal_nombres} ${alerta.personal_apellidos}`;
    this.showNotification = true;

    // Auto-cerrar notificación después de 8 segundos
    setTimeout(() => {
      this.showNotification = false;
    }, 8000);
  }

  private actualizarUbicacionPersonalRealtime(data: any): void {
    const personalId = parseInt(data.id_personal);
    const idx = this.personalConUbicacion.findIndex(p => (parseInt(p.id as any) || parseInt(p.id_personal as any)) === personalId);

    if (idx >= 0) {
      this.personalConUbicacion[idx].latitud = parseFloat(data.latitud);
      this.personalConUbicacion[idx].longitud = parseFloat(data.longitud);
      this.personalConUbicacion[idx].ultima_ubicacion = data.ultima_ubicacion;
      this.personalConUbicacion[idx].tipo_ubicacion = data.tipo_ubicacion;
      this.personalConUbicacion[idx].vehiculo_id = data.vehiculo_id;
      this.personalConUbicacion[idx].nombre_vehiculo = data.nombre_vehiculo;
      this.personalConUbicacion[idx].placa_vehiculo = data.placa_vehiculo;

      // Actualizamos el mapa para reflejar el movimiento y posible cambio de icono
      this.actualizarMapa();
    } else {
      // Personal nuevo o que no estaba en la lista inicial
      this.cargarPersonalConUbicacion(false);
    }
  }

  inicializarMapa(): void {
    if (this.map) return;

    if (typeof L === 'undefined') {
      console.error('❌ Leaflet no está cargado');
      return;
    }

    try {
      this.map = L.map('mapa-personal', {
        zoomControl: false
      }).setView([this.centro.lat, this.centro.lng], this.zoom);

      L.control.zoom({ position: 'topright' }).addTo(this.map);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        subdomains: 'abcd',
        maxZoom: 19,
        detectRetina: true
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
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
    this.personalUbicacionService.obtenerPersonalConUbicacion().subscribe({
      next: (response) => {
        if (response.success) {
          this.personalConUbicacion = (response.data || []).map((p: any) => ({
            ...p,
            latitud: parseFloat(p.latitud),
            longitud: parseFloat(p.longitud)
          }));

          if (this.modoNavegacion === 'personal' && !this.personalSeleccionadoId && this.personalConUbicacion.length > 0) {
            this.seleccionarPersonal(this.personalConUbicacion[0]);
          }

          this.actualizarMapa();

          if (ajustarVista && this.personalConUbicacion.length > 0 && this.map) {
            this.ajustarVistaATodos();
          }
        }
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  public ajustarVistaATodos(resetFiltros: boolean = false): void {
    if (!this.map) return;

    if (resetFiltros) {
        this.personalSeleccionadoId = null;
        this.alertaSeleccionadaId = null;
        this.historialUbicaciones = [];
        this.limpiarCapasBusqueda();
        this.actualizarMapa();
    }

    const points: any[] = [];
    this.personalConUbicacion.forEach(p => {
      if (p.latitud && p.longitud) points.push([p.latitud, p.longitud]);
    });
    this.unreadAlerts.forEach(a => {
      if (a.latitud && a.longitud) points.push([a.latitud, a.longitud]);
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }

  cargarAlertasRecientes(): void {
    // Cargar todas las alertas (leídas y no leídas) para la lista lateral
    this.alertasService.listarAlertas({ per_page: 50 }).subscribe({
      next: (res) => {
        if (res.success) {
          this.alertas = res.data || [];
          this.unreadAlerts = this.alertas.filter(a => !a.leida_at);
          this.actualizarMapa();
        }
      }
    });
  }

  actualizarMapa(): void {
    if (!this.map || !this.markersLayer) return;

    this.markersLayer.clearLayers();
    this.alertsLayer.clearLayers();
    this.personalMarkersMap.clear();
    
    const historySearchActivo = this.historySearchLayer && this.historySearchLayer.getLayers().length > 0;
    const tieneFiltros = this.personalSeleccionadoId !== null || this.alertaSeleccionadaId !== null || historySearchActivo || this.historialUbicaciones.length > 0;

    const esModoAlertas = this.modoNavegacion === 'alertas';
    const esModoPersonal = this.modoNavegacion === 'personal';
    const esModoVehiculos = this.modoNavegacion === 'vehiculos';

    // 1. Dibujar Alertas (Llamativas - Pulso)
    this.unreadAlerts.forEach(alerta => {
      if (alerta.latitud && alerta.longitud) {
        const color = alerta.tipo_color_hex || '#dc3545';
        const esAlertaSeleccionada = this.alertaSeleccionadaId === alerta.id;
        
        if (this.alertaSeleccionadaId !== null && !esAlertaSeleccionada) return;
        if (this.personalSeleccionadoId !== null && alerta.id_personal !== this.personalSeleccionadoId) return;
        if (this.alertaSeleccionadaId === null && this.personalSeleccionadoId === null && !esModoAlertas) return;
        
        const opacidadAlertas = (historySearchActivo || this.historialUbicaciones.length > 0) ? 'opacity: 0.3; filter: grayscale(100%); pointer-events: none;' : 'opacity: 1; transition: all 0.3s ease;';

        // Advanced SVG icon with radar pulse
        const alertHtml = `
          <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; ${opacidadAlertas}">
            <div style="position: absolute; width: 100%; height: 100%; border: 3px solid ${color}; border-radius: 50%; animation: marker-glow 1.5s ease-out infinite;"></div>
            <div style="width: 18px; height: 18px; background: ${color}; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px rgba(0,0,0,0.5); z-index: 2;"></div>
          </div>
        `;

        const alertMarker = L.marker([alerta.latitud, alerta.longitud], {
          icon: L.divIcon({
            className: 'custom-alert-marker',
            html: alertHtml,
            iconSize: [40, 40],
            iconAnchor: [20, 20]
          }),
          zIndexOffset: 2000
        });

        // Parse and render inline image gallery if it exists
        let galleryHtml = '';
        if (alerta.evidencias && alerta.evidencias.length > 0) {
          galleryHtml = `
            <div style="margin: 8px 0; border-top: 1px solid #eee; padding-top: 8px;">
              <strong style="font-size: 10px; color: #666; display: block; margin-bottom: 4px;"><i class="fas fa-camera"></i> EVIDENCIAS ADJUNTAS (${alerta.evidencias.length})</strong>
              <div style="display: flex; gap: 4px; overflow-x: auto; padding-bottom: 4px;">
                ${alerta.evidencias.map((img: string) => `
                  <a href="${img}" target="_blank" style="flex-shrink: 0; display: block; border-radius: 4px; border: 1px solid #ddd; overflow: hidden; width: 60px; height: 60px;">
                    <img src="${img}" style="width: 100%; height: 100%; object-fit: cover;" />
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }

        const popupContent = `
          <div class="custom-popup" style="min-width: 220px; font-family: sans-serif;">
            <div class="d-flex align-items-center mb-2" style="border-bottom: 2px solid ${color}; padding-bottom: 6px;">
              <div style="background: ${color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 8px; font-size: 12px;">
                <i class="fas fa-exclamation-circle"></i>
              </div>
              <div>
                <strong class="text-uppercase" style="color: ${color}; font-size: 13px; line-height: 1;">${alerta.tipo_nombre}</strong>
                <small class="d-block text-muted" style="font-size: 10px;">${this.formatFechaFull(alerta.created_at)}</small>
              </div>
            </div>
            <p class="mb-1 text-sm"><strong>Operador:</strong> ${alerta.personal_nombres} ${alerta.personal_apellidos}</p>
            <p class="mb-2 text-sm text-muted" style="background: #f8f9fa; padding: 6px; border-radius: 4px; border-left: 3px solid ${color};">
              "${alerta.mensaje || 'Emergencia reportada'}"
            </p>
            ${galleryHtml}
            <button class="btn btn-sm text-white btn-block shadow-sm" style="background: ${color}; border: none; font-weight: bold; margin-top: 8px;" onclick="window.angularComponentReference.abrirResolver(${alerta.id})">
              <i class="fas fa-tasks mr-1"></i> Gestionar Alerta
            </button>
          </div>
        `;

        alertMarker.bindPopup(popupContent, { maxWidth: 300 });
        alertMarker.addTo(this.alertsLayer);
      }
    });

    // 2. Dibujar Personal con iconos diferenciados por tipo de transporte
    this.personalConUbicacion.forEach(personal => {
      if (!personal.latitud || !personal.longitud) return;

      const personalId = personal.id || personal.id_personal;
      const esSeleccionado = this.personalSeleccionadoId === personalId;
      
      if (this.alertaSeleccionadaId !== null) return;
      if (this.personalSeleccionadoId !== null && !esSeleccionado) return;
      
      const esVehiculo = this.esUbicacionVehiculo(personal.tipo_ubicacion);

      // Si estamos en modo personal, no mostrar vehículos. Si estamos en modo vehículos, no mostrar a pie.
      if (this.alertaSeleccionadaId === null && this.personalSeleccionadoId === null) {
        if (esModoPersonal && esVehiculo) return;
        if (esModoVehiculos && !esVehiculo) return;
        if (esModoAlertas) return; // En modo alertas no mostramos el personal a menos que se seleccione alerta
      }
      
      const tieneAlerta = this.unreadAlerts.some(a => a.id_personal === personalId);

      // Colores diferenciados: vehículo = teal/azul oscuro, a pie = gris pizarra
      const color = esVehiculo ? '#00796b' : '#546e7a';
      const size = esVehiculo ? 38 : 30;
      const fontSize = esVehiculo ? '16px' : '13px';

      let borderStyle: string;
      if (esSeleccionado) {
        borderStyle = 'box-shadow: 0 0 12px #007bff, 0 0 24px rgba(0,123,255,0.3); border: 3px solid #007bff;';
      } else if (esVehiculo) {
        borderStyle = 'border: 2.5px solid #e0f2f1; box-shadow: 0 2px 8px rgba(0,0,0,0.3);';
      } else {
        borderStyle = 'border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.2);';
      }
      
      const opacidadMarker = (historySearchActivo || this.historialUbicaciones.length > 0) && !esSeleccionado ? 'opacity: 0.3; filter: grayscale(100%); pointer-events: none;' : 'opacity: 1; transition: all 0.3s ease;';

      const icono = this.getIconoTransporte(personal.tipo_ubicacion);
      const labelVehiculo = esVehiculo && personal.placa_vehiculo
        ? `<span style="position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%); background: #00695c; color: #fff; font-size: 7px; padding: 1px 4px; border-radius: 3px; white-space: nowrap; font-weight: bold; letter-spacing: 0.5px;">${personal.placa_vehiculo}</span>`
        : '';

      const marker = L.marker([personal.latitud, personal.longitud], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="position: relative; background: ${color}; color: white; border-radius: ${esVehiculo ? '8px' : '50%'}; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; ${borderStyle} font-size: ${fontSize}; ${opacidadMarker}" title="${personal.tipo_ubicacion || 'personal'}">
                   <i class="${icono}"></i>
                   ${tieneAlerta ? '<span style="position: absolute; top: -3px; right: -3px; width: 10px; height: 10px; background: #ff1744; border-radius: 50%; border: 1.5px solid white; animation: pulse 1.5s infinite;"></span>' : ''}
                   ${labelVehiculo}
                 </div>`,
          iconSize: [size, size + (esVehiculo && personal.placa_vehiculo ? 12 : 0)],
          iconAnchor: [size / 2, size / 2]
        }),
        zIndexOffset: esSeleccionado ? 1000 : (esVehiculo ? 500 : 0)
      });

      // Popup con información contextual según el tipo
      const tipoLabel = esVehiculo ? (personal.nombre_vehiculo || this.getNombreTipoVehiculo(personal.tipo_ubicacion)) : 'A PIE';
      const popupContent = `
        <div class="p-1" style="min-width: 200px;">
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
            <div style="background: ${color}; color: white; width: 28px; height: 28px; border-radius: ${esVehiculo ? '6px' : '50%'}; display: flex; align-items: center; justify-content: center; font-size: 12px;">
              <i class="${icono}"></i>
            </div>
            <div>
              <h6 class="mb-0 font-weight-bold" style="font-size: 13px;">${personal.nombres} ${personal.apellidos}</h6>
              <small style="color: ${color}; font-weight: bold;">${tipoLabel}</small>
            </div>
          </div>
          <hr class="my-1" style="border-color: #eee;">
          <div style="font-size: 11px; color: #666;">
            <i class="far fa-clock mr-1"></i> Último visto: ${this.formatFechaFull(personal.ultima_ubicacion)}
          </div>
          ${esVehiculo ? `
            <div style="margin-top: 6px; padding: 4px 6px; background: #e0f2f1; border-radius: 4px; font-size: 11px;">
              <i class="fas fa-shuttle-van mr-1" style="color: #00796b;"></i>
              <strong>${personal.nombre_vehiculo || 'Vehículo asignado'}</strong>
              ${personal.placa_vehiculo ? `<br><i class="fas fa-id-badge mr-1" style="color: #00796b;"></i> PLACA: <strong>${personal.placa_vehiculo}</strong>` : ''}
            </div>
          ` : `
            <div style="margin-top: 6px; padding: 4px 6px; background: #eceff1; border-radius: 4px; font-size: 11px;">
              <i class="fas fa-walking mr-1" style="color: #546e7a;"></i> Patrullaje a pie
            </div>
          `}
        </div>
      `;

      marker.bindPopup(popupContent);
      marker.addTo(this.markersLayer);
      this.personalMarkersMap.set(personalId, marker);
    });

    // 3. Dibujar Historial si aplica
    this.dibujarHistorialEnMapa();

    (window as any).angularComponentReference = {
      marcarLeida: (id: number) => this.marcarAlertaLeidaPorId(id),
      abrirResolver: (id: number) => this.abrirModalResolver(id)
    };
  }

  /** Determina si el tipo_ubicacion corresponde a un vehículo */
  private esUbicacionVehiculo(tipo: string | undefined): boolean {
    if (!tipo) return false;
    const t = tipo.toLowerCase();
    return t.includes('moto') || t.includes('camioneta') || t.includes('patrull')
      || t.includes('auto') || t.includes('van') || t.includes('bici')
      || t === 'vehiculo' || t === 'vehículo';
  }

  /** Devuelve un nombre legible para el tipo de vehículo */
  private getNombreTipoVehiculo(tipo: string | undefined): string {
    if (!tipo) return 'VEHÍCULO';
    const t = tipo.toLowerCase();
    if (t.includes('moto')) return 'MOTOCICLETA';
    if (t.includes('camioneta')) return 'CAMIONETA';
    if (t.includes('patrull')) return 'PATRULLERO';
    if (t.includes('van')) return 'VAN';
    if (t.includes('bici')) return 'BICICLETA';
    if (t.includes('auto')) return 'AUTO';
    return 'VEHÍCULO';
  }

  getIconoTransporte(tipo: string | undefined): string {
    const t = (tipo || 'personal').toLowerCase();

    // Vehículos motorizados
    if (t.includes('moto')) return 'fas fa-motorcycle';
    if (t.includes('camioneta')) return 'fas fa-truck-pickup';
    if (t.includes('patrull')) return 'fas fa-car-side';
    if (t.includes('van')) return 'fas fa-shuttle-van';
    if (t.includes('auto')) return 'fas fa-car';
    if (t.includes('bici')) return 'fas fa-bicycle';
    if (t === 'vehiculo' || t === 'vehículo') return 'fas fa-car';

    // Personal a pie (default)
    return 'fas fa-walking';
  }

  private dibujarHistorialEnMapa(): void {
    if (!this.map || !this.historyLayer) return;
    this.historyLayer.clearLayers();

    if (this.modoNavegacion === 'personal' && this.historialUbicaciones.length > 1) {
      const latlngs = this.historialUbicaciones.map(p => [p.latitud, p.longitud]);

      // Línea de trayectoria
      L.polyline(latlngs, {
        color: '#007bff',
        weight: 3,
        opacity: 0.5,
        dashArray: '5, 10'
      }).addTo(this.historyLayer);

      // Puntos del historial
      this.historialUbicaciones.forEach((p, i) => {
        if (i === 0) return;

        L.circleMarker([p.latitud, p.longitud], {
          radius: 4,
          fillColor: '#007bff',
          fillOpacity: 0.3,
          color: '#007bff',
          weight: 1
        }).bindTooltip(`Visto a las: ${this.formatFecha(p.created_at)}`).addTo(this.historyLayer);
      });
    }
  }

  private marcarAlertaLeidaPorId(id: number): void {
    this.alertasService.marcarAlertaLeida(id).subscribe({
      next: (res) => {
        if (res.success) {
          const alertIdx = this.alertas.findIndex(a => a.id === id);
          if (alertIdx >= 0) this.alertas[alertIdx].leida_at = new Date().toISOString();

          // Sincronizar con el centro de notificaciones
          this.notificationCenter.markAsRead('alert-' + id);

          this.unreadAlerts = this.unreadAlerts.filter(a => a.id !== id);
          this.alertas = this.alertas.filter(a => a.id !== id); // También quitar de la lista general
          this.toast.success('Alerta marcada como leída');
          this.actualizarMapa();
        }
      },
      error: (err) => this.toast.error('Error al marcar como leída')
    });
  }

  marcarAlertaLeida(a: Alerta): void {
    this.abrirModalResolver(a.id);
  }

  abrirModalResolver(id: number, rechazo: boolean = false): void {
    const alerta = this.alertas.find(a => a.id === id);
    if (!alerta) return;
    this.prepararAlertaParaResolver(alerta, rechazo);
  }

  prepararAlertaParaResolver(alerta: Alerta, rechazo: boolean = false): void {
    this.alertaParaResolver = alerta;
    this.isRechazo = rechazo;
    this.resolverConOcurrencia = !rechazo;
    this.observacionResolucion = '';
    this.direccion_resolucion = '';
    this.tipo_ocurrencia_resolucion = 'otros';
    this.personal_id_resolucion = null;
    this.mostrarModalResolver = true;
  }

  cerrarModalResolver(): void {
    this.mostrarModalResolver = false;
    this.alertaParaResolver = null;
  }

  cargarSectores(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/sectores`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success) this.sectores = res.data;
      }
    });
  }

  cargarPersonalActivo(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/personal?activos=true`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success) this.personalActivo = res.data;
      }
    });
  }

  confirmarGestionAlerta(): void {
    if (!this.alertaParaResolver) return;

    if (this.isRechazo && this.observacionResolucion.length < 5) {
      alert('Por favor ingrese una observación detallada del rechazo (mín. 5 caracteres)');
      return;
    }

    this.guardandoResolucion = true;

    const payload: any = {
      observacion: this.observacionResolucion || 'Atendida desde Panel Control',
      crear_ocurrencia: this.resolverConOcurrencia
    };

    if (this.resolverConOcurrencia) {
      if (this.sector_id_resolucion) {
        payload.sector_id = this.sector_id_resolucion;
      }
      payload.direccion_real = this.direccion_resolucion;
      payload.tipo_ocurrencia_real = this.tipo_ocurrencia_resolucion;
      if (this.personal_id_resolucion) {
        payload.personal_id = this.personal_id_resolucion;
      }
    }

    const obs = this.isRechazo
      ? this.alertasService.rechazarAlerta(this.alertaParaResolver.id, { observacion: this.observacionResolucion })
      : this.alertasService.resolverAlerta(this.alertaParaResolver.id, payload);

    obs.subscribe({
      next: (res) => {
        this.guardandoResolucion = false;
        if (res.success) {
          const id = this.alertaParaResolver?.id;
          this.unreadAlerts = this.unreadAlerts.filter(a => a.id !== id);
          this.alertas = this.alertas.filter(a => a.id !== id);
          this.cerrarModalResolver();
          this.actualizarMapa();
          
          const msg = this.isRechazo ? 'Alerta rechazada correctamente' : 'Alerta atendida con éxito';
          this.toast.success(msg);

          if (!this.isRechazo && res.id_ocurrencia) {
            console.log('Ocurrencia creada ID:', res.id_ocurrencia);
          }
        }
      },
      error: (err) => {
        this.guardandoResolucion = false;
        console.error('Error gestionando alerta:', err);
        this.toast.error('Ocurrió un error: ' + (err.error?.message || 'Error desconocido'));
      }
    });
  }

  seleccionarAlerta(alerta: Alerta): void {
    if (!alerta.latitud || !alerta.longitud) return;
    this.personalSeleccionadoId = null;
    this.alertaSeleccionadaId = alerta.id;
    this.historialUbicaciones = [];
    if (this.historySearchLayer) this.historySearchLayer.clearLayers();

    this.map.setView([alerta.latitud, alerta.longitud], 18);
    this.actualizarMapa();
  }

  seleccionarPersonal(p: PersonalUbicacion): void {
    const personalId = p.id || p.id_personal;
    this.personalSeleccionadoId = personalId;
    this.alertaSeleccionadaId = null;
    if (this.historySearchLayer) this.historySearchLayer.clearLayers();
    this.cargarHistorialPersonal(personalId);

    if (p.latitud && p.longitud) {
      this.map.setView([p.latitud, p.longitud], 17);
    }
    this.actualizarMapa();
  }

  cargarHistorialPersonal(id: number): void {
    this.loadingHistory = true;
    this.personalUbicacionService.obtenerHistorialUbicacion(id, { limite: 50 }).subscribe({
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
    const f = this.filtroPersonal.toLowerCase();
    
    // Primero filtramos segun el modo actual (personal a pie vs vehiculos)
    let filtrados = this.personalConUbicacion;
    if (this.modoNavegacion === 'personal') {
      filtrados = filtrados.filter(p => !this.esUbicacionVehiculo(p.tipo_ubicacion));
    } else if (this.modoNavegacion === 'vehiculos') {
      filtrados = filtrados.filter(p => this.esUbicacionVehiculo(p.tipo_ubicacion));
    }

    if (!this.filtroPersonal) return filtrados;
    
    return filtrados.filter(p =>
      `${p.nombres} ${p.apellidos}`.toLowerCase().includes(f) ||
      p.codigo_personal?.toLowerCase().includes(f) ||
      p.placa_vehiculo?.toLowerCase().includes(f) ||
      p.nombre_vehiculo?.toLowerCase().includes(f)
    );
  }

  filtrarAlertas(): Alerta[] {
    if (!this.filtroAlertas) return this.alertas;
    const f = this.filtroAlertas.toLowerCase();
    return this.alertas.filter(a =>
      `${a.personal_nombres} ${a.personal_apellidos}`.toLowerCase().includes(f) ||
      a.tipo_nombre?.toLowerCase().includes(f) ||
      a.mensaje?.toLowerCase().includes(f)
    );
  }

  tieneAlertaActiva(p: PersonalUbicacion): boolean {
    const id = p.id || p.id_personal;
    return this.unreadAlerts.some(a => a.id_personal === id);
  }

  formatFecha(fecha: string | undefined): string {
    if (!fecha) return '-';
    try {
      const d = new Date(fecha);
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    } catch { return '-'; }
  }

  formatFechaFull(fecha: string | undefined): string {
    if (!fecha) return '-';
    try {
      const d = new Date(fecha);
      return d.toLocaleString('es-PE', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
    } catch { return '-'; }
  }

  recargar(primeraVez: boolean = false): void {
    this.cargarPersonalConUbicacion(primeraVez);
    this.cargarAlertasRecientes();
    if (primeraVez) this.cargarTiposAlerta();
  }

  cambiarModoNavegacion(modo: 'alertas' | 'personal' | 'vehiculos'): void {
    this.modoNavegacion = modo;
    this.historialUbicaciones = [];
    const listaFiltrada = this.filtrarPersonal();
    if (modo !== 'alertas' && listaFiltrada.length > 0 && !this.personalSeleccionadoId) {
      this.seleccionarPersonal(listaFiltrada[0]);
    }
    this.actualizarMapa();
  }

  cambiarTab(tab: 'mapa' | 'tipos-alerta'): void {
    this.tabActiva = tab;
    if (tab === 'mapa' && this.map) {
      // Forzar al mapa a recalcular sus dimensiones después de que el DOM sea visible
      setTimeout(() => {
        console.log('🗺️ Re-ajustando mapa...');
        this.map.invalidateSize();
        // Solo ajustar si no hay nada seleccionado, para no perder el foco
        if (!this.personalSeleccionadoId && !this.alertaSeleccionadaId) {
          this.ajustarVistaATodos(false);
        }
      }, 50);
    }
    if (tab === 'tipos-alerta') this.cargarTiposAlerta();
  }

  toggleMenu(id: number): void {
    this.dropdownAbiertoId = this.dropdownAbiertoId === id ? null : id;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    this.dropdownAbiertoId = null;
  }

  toggleMapExpanded(): void {
    this.isMapExpanded = !this.isMapExpanded;

    // Toggle body scroll to prevent background scrolling in fullscreen
    document.body.style.overflow = this.isMapExpanded ? 'hidden' : '';

    // Close panel when exiting fullscreen
    if (!this.isMapExpanded) {
      this.showFullscreenPanel = false;
    }

    // Wait for Angular to render the new container, then resize map
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        if (this.isMapExpanded && !this.personalSeleccionadoId && !this.alertaSeleccionadaId) {
          this.ajustarVistaATodos(false);
        }
      }
    }, 150);
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    if (this.isMapExpanded) {
      this.toggleMapExpanded();
    }
  }

  cargarTiposAlerta(): void {
    this.loadingTipos = true;
    this.alertasService.listarTiposAlerta(false).subscribe({
      next: (res) => {
        if (res.success) this.tiposAlerta = res.data || [];
        this.loadingTipos = false;
      },
      error: () => { this.loadingTipos = false; }
    });
  }

  // --- CRUD Tipos Alerta ---
  abrirModalTipoAlerta(): void {
    this.tipoAlertaEdicion = null;
    this.formTipoAlerta = { codigo: '', nombre: '', color_hex: '#999999', descripcion: '', orden: 0, activo: 1 };
    this.mostrarModalTipo = true;
  }

  editarTipoAlerta(t: TipoAlerta): void {
    this.tipoAlertaEdicion = t;
    this.formTipoAlerta = { ...t };
    this.mostrarModalTipo = true;
  }

  cerrarModalTipoAlerta(): void {
    this.mostrarModalTipo = false;
    this.tipoAlertaEdicion = null;
  }

  guardarTipoAlerta(): void {
    if (!this.formTipoAlerta.codigo?.trim() || !this.formTipoAlerta.nombre?.trim()) return;
    const payload = { ...this.formTipoAlerta };
    const obs = this.tipoAlertaEdicion?.id
      ? this.alertasService.actualizarTipoAlerta(this.tipoAlertaEdicion.id, payload)
      : this.alertasService.crearTipoAlerta(payload);

    obs.subscribe({
      next: (res) => { 
        if (res.success) { 
          this.toast.success(this.tipoAlertaEdicion ? 'Tipo de alerta actualizado' : 'Tipo de alerta creado');
          this.cargarTiposAlerta(); 
          this.cerrarModalTipoAlerta(); 
        } 
      },
      error: (err) => this.toast.error('Error al guardar tipo de alerta')
    });
  }

  eliminarTipoAlerta(t: TipoAlerta): void {
    if (confirm(`¿Eliminar ${t.nombre}?`)) {
      this.alertasService.eliminarTipoAlerta(t.id).subscribe({
        next: (res) => { 
          if (res.success) {
            this.toast.success('Tipo de alerta eliminado');
            this.cargarTiposAlerta();
          } 
        },
        error: (err) => this.toast.error('Error al eliminar')
      });
    }
  }

  // --- Historial Avanzado y Filtros ---

  abrirModalHistorial(p: any, tipo: 'ubicacion' | 'alertas' = 'ubicacion'): void {
    this.personalParaHistorial = p;
    this.filtrosHistorial.tipo = tipo;
    this.mostrarModalHistorial = true;
    const hoy = new Date().toISOString().split('T')[0];
    this.filtrosHistorial.fecha_desde = hoy;
    this.filtrosHistorial.fecha_hasta = hoy;
    this.filtrosHistorial.hora_desde = '00:00';
    this.filtrosHistorial.hora_hasta = '23:59';
  }

  cerrarModalHistorial(): void {
    this.mostrarModalHistorial = false;
    this.personalParaHistorial = null;
  }

  consultarHistorialFiltros(): void {
    if (!this.personalParaHistorial) return;

    const personalId = this.personalParaHistorial.id || this.personalParaHistorial.id_personal;
    this.loadingHistorialModal = true;
    this.historySearchLayer.clearLayers();
    this.personalSeleccionadoId = null;
    this.alertaSeleccionadaId = null;
    this.historialUbicaciones = [];
    this.actualizarMapa();

    // Construir los timestamps completos agregando la hora, respetando los formatos SQL o API (Y-m-d H:i:s)
    const datetimeDesde = `${this.filtrosHistorial.fecha_desde} ${this.filtrosHistorial.hora_desde}:00`;
    const datetimeHasta = `${this.filtrosHistorial.fecha_hasta} ${this.filtrosHistorial.hora_hasta}:59`;

    if (this.filtrosHistorial.tipo === 'ubicacion') {
      this.personalUbicacionService.obtenerHistorialUbicacion(personalId, {
        fecha_desde: datetimeDesde,
        fecha_hasta: datetimeHasta,
        limite: 1000
      }).subscribe({
        next: (res) => {
          this.loadingHistorialModal = false;
          if (res.success && res.data?.length > 0) {
            this.renderizarHistorialHistorico(res.data);
            this.cerrarModalHistorial();
          } else {
            alert('No se encontraron registros de ubicación en este rango.');
          }
        },
        error: () => { this.loadingHistorialModal = false; }
      });
    } else {
      this.alertasService.listarAlertas({
        id_personal: personalId,
        fecha_desde: datetimeDesde,
        fecha_hasta: datetimeHasta,
        per_page: 500
      }).subscribe({
        next: (res) => {
          this.loadingHistorialModal = false;
          if (res.success && res.data?.length > 0) {
            this.renderizarAlertasHistoricas(res.data);
            this.cerrarModalHistorial();
          } else {
            alert('No se encontraron alertas emitidas en este rango.');
          }
        },
        error: () => { this.loadingHistorialModal = false; }
      });
    }
  }

  private renderizarHistorialHistorico(puntos: any[]): void {
    if (!this.map || !this.historySearchLayer) return;

    const latlngs = puntos.map(p => [parseFloat(p.latitud), parseFloat(p.longitud)]);

    L.polyline(latlngs, {
      color: '#6f42c1',
      weight: 4,
      opacity: 0.7,
      dashArray: '10, 10'
    }).addTo(this.historySearchLayer);

    puntos.forEach((p, i) => {
      L.circleMarker([p.latitud, p.longitud], {
        radius: 5,
        fillColor: '#6f42c1',
        fillOpacity: 0.5,
        color: 'white',
        weight: 1
      }).bindTooltip(`Visto: ${this.formatFechaFull(p.created_at)}`).addTo(this.historySearchLayer);
    });

    const bounds = L.latLngBounds(latlngs);
    this.map.fitBounds(bounds, { padding: [50, 50] });
  }

  private renderizarAlertasHistoricas(alertas: Alerta[]): void {
    if (!this.map || !this.historySearchLayer) return;

    const points: any[] = [];
    alertas.forEach(a => {
      if (a.latitud && a.longitud) {
        points.push([a.latitud, a.longitud]);
        const color = a.tipo_color_hex || '#dc3545';

        L.marker([a.latitud, a.longitud], {
          icon: L.divIcon({
            className: 'historical-alert-marker',
            html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                     <i class="fas fa-exclamation-circle" style="font-size: 10px;"></i>
                   </div>`,
            iconSize: [24, 24]
          })
        }).bindPopup(`
          <div class="text-xs p-1">
            <strong style="color: ${color}">${a.tipo_nombre}</strong><br>
            <small class="text-muted">${this.formatFechaFull(a.created_at)}</small><br>
            <p class="mt-1 mb-0">"${a.mensaje || 'Marcador histórico'}"</p>
          </div>
        `).addTo(this.historySearchLayer);
      }
    });

    if (points.length > 0) {
      const bounds = L.latLngBounds(points);
      this.map.fitBounds(bounds, { padding: [50, 50] });
    }
  }

  limpiarCapasBusqueda(): void {
    if (this.historySearchLayer) {
      this.historySearchLayer.clearLayers();
    }
    this.personalSeleccionadoId = null;
    this.alertaSeleccionadaId = null;
    this.historialUbicaciones = [];
    this.actualizarMapa();
  }
}
