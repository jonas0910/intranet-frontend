import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { EchoService } from '../../../services/echo.service';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { Subject, interval, takeUntil } from 'rxjs';

declare var L: any;

@Component({
    selector: 'app-lp-monitoreo',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent],
    templateUrl: './monitoreo.component.html',
    styleUrls: ['./monitoreo.component.scss']
})
export class LpMonitoreoComponent implements OnInit, AfterViewInit, OnDestroy {

    private map: any;
    private markersLayer: any;
    private alertsLayer: any;
    private historyLayer: any;
    private historySearchLayer: any;
    private destroy$ = new Subject<void>();

    // Configuración de mapa
    centro = { lat: -18.0145, lng: -70.2536 }; // Tacna
    zoom = 15;

    // Estado de Datos
    personalConUbicacion: any[] = [];
    alertas: any[] = [];
    unreadAlerts: any[] = [];
    historialUbicaciones: any[] = [];
    tiposAlerta: any[] = [];

    // Estados de UI
    loading = false;
    loadingHistory = false;
    tabActiva: 'mapa' | 'tipos-alerta' = 'mapa';
    modoNavegacion: 'alertas' | 'personal' = 'alertas';
    isMapExpanded = false;

    // Rutas dinámicas en visor
    mostrarSelectorRutas: boolean = false;
    rutasDelPersonal: any[] = [];
    rutaSeleccionadaId: any = '';
    loadingRutasPersonal: boolean = false;

    dropdownAbiertoId: number | null = null;
    filtroPersonal: string = '';
    filtroAlertas: string = '';
    personalSeleccionadoId: number | null = null;

    // Notificaciones en tiempo real
    ultimoEventoRecibido: string | null = null;
    showNotification = false;

    // Gestión de Alertas
    mostrarModalResolver = false;
    alertaParaResolver: any = null;
    observacionResolucion = '';
    isRechazo = false;
    guardandoResolucion = false;

    // Tipos de Alerta CRUD
    mostrarModalTipo = false;
    tipoAlertaEdicion: any = null;
    formTipoAlerta: any = { codigo: '', descripcion: '', color_hex: '#007bff', orden: 0, activo: 1 };

    // Historial Avanzado
    mostrarModalHistorial = false;
    personalParaHistorial: any = null;
    filtrosHistorial: { fecha_desde: string; fecha_hasta: string; tipo: 'ubicacion' | 'alertas' } = {
        fecha_desde: new Date().toISOString().split('T')[0],
        fecha_hasta: new Date().toISOString().split('T')[0],
        tipo: 'ubicacion' as 'ubicacion' | 'alertas'
    };
    loadingHistorialModal = false;

    private personalMarkersMap: Map<number, any> = new Map();
    private readonly REFRESH_INTERVAL_MS = 60000;

    // Servicios
    private lpService = inject(LimpiezaPublicaService);
    private echoService = inject(EchoService);
    private toastService = inject(ToastService);

    constructor() { }

    ngOnInit(): void {
        this.recargar(true);
        this.configurarWebSockets();

        interval(this.REFRESH_INTERVAL_MS)
            .pipe(takeUntil(this.destroy$))
            .subscribe(() => this.recargar(false));
    }

    ngAfterViewInit(): void {
        setTimeout(() => this.inicializarMapa(), 200);
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
        this.echoService.leave('limpieza-publica.mapa');
        this.echoService.leave('limpieza-publica.alertas');
        if (this.map) this.map.remove();
    }

    private configurarWebSockets(): void {
        this.echoService.setUseCustomEcho(true);
        this.echoService.connect();

        const channelMapa = this.echoService.channel('limpieza-publica.mapa');
        const channelAlertas = this.echoService.channel('limpieza-publica.alertas');

        channelMapa.listen('UbicacionActualizada', (data: any) => {
            this.actualizarUbicacionRealtime(data);
        });

        channelAlertas.listen('AlertaNueva', (alerta: any) => {
            this.procesarNuevaAlerta(alerta);
        });

        channelAlertas.listen('AlertaActualizada', (data: any) => {
            this.recargar(false);
        });
    }

    private procesarNuevaAlerta(alerta: any): void {
        const existe = this.alertas.find(a => a.id === alerta.id || a.id_alerta === alerta.id_alerta);
        if (!existe) {
            this.alertas.unshift(alerta);
            if (alerta.estado === 'pendiente' || !alerta.leida_at) {
                this.unreadAlerts.unshift(alerta);
                this.notificarAlerta(alerta);
                this.actualizarMapa();
            }
        }
    }

    private notificarAlerta(alerta: any): void {
        this.ultimoEventoRecibido = `${alerta.tipo_nombre || 'Incidencia'}: ${alerta.mensaje || 'Reporte de personal'}`;
        this.showNotification = true;
        setTimeout(() => this.showNotification = false, 8000);
        this.toastService.error(this.ultimoEventoRecibido, 'NUEVA ALERTA DETECTADA');
    }

    private actualizarUbicacionRealtime(data: any): void {
        const personalId = parseInt(data.id_personal);
        const idx = this.personalConUbicacion.findIndex(p => p.id_personal === personalId);

        if (idx >= 0) {
            this.personalConUbicacion[idx].latitud = parseFloat(data.latitud);
            this.personalConUbicacion[idx].longitud = parseFloat(data.longitud);
            this.personalConUbicacion[idx].updated_at = data.timestamp;
            this.actualizarMapa();
        } else {
            this.recargar(false);
        }
    }

    inicializarMapa(): void {
        if (this.map || typeof L === 'undefined') return;

        try {
            this.map = L.map('map-lp', { zoomControl: false })
                .setView([this.centro.lat, this.centro.lng], this.zoom);

            L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                subdomains: 'abcd',
                maxZoom: 19,
                detectRetina: true
            }).addTo(this.map);

            L.control.zoom({ position: 'topright' }).addTo(this.map);

            this.markersLayer = L.layerGroup().addTo(this.map);
            this.alertsLayer = L.layerGroup().addTo(this.map);
            this.historyLayer = L.layerGroup().addTo(this.map);
            this.historySearchLayer = L.layerGroup().addTo(this.map);

            this.actualizarMapa();
        } catch (e) { console.error('Error mapa:', e); }
    }

    recargar(todo: boolean = false): void {
        this.loading = true;

        // Cargar personal
        this.lpService.getUbicacionesPersonal().subscribe({
            next: (res) => {
                this.personalConUbicacion = res.data || [];
                this.actualizarMapa();
                if (todo) this.ajustarVistaATodos();
                this.loading = false;
            },
            error: () => this.loading = false
        });

        // Cargar alertas
        this.lpService.getAlertas({ per_page: 50 }).subscribe({
            next: (res) => {
                this.alertas = (res.data || []).map((a: any) => ({
                    ...a,
                    tipo_nombre: a.tipo_alerta?.descripcion || a.tipo_nombre,
                    tipo_color_hex: a.tipo_alerta?.color_hex || a.tipo_color_hex,
                    personal_nombres: a.personal?.name || a.personal_nombres
                }));
                this.unreadAlerts = this.alertas.filter(a => a.estado === 'pendiente');
                this.actualizarMapa();
            }
        });

        if (todo) this.cargarTiposAlerta();
    }

    actualizarMapa(): void {
        if (!this.map || !this.markersLayer) return;

        this.markersLayer.clearLayers();
        this.alertsLayer.clearLayers();
        this.personalMarkersMap.clear();

        // 1. Alertas
        this.unreadAlerts.forEach(a => {
            if (a.latitud && a.longitud) {
                const color = a.tipo_color_hex || '#dc3545';
                const marker = L.circleMarker([a.latitud, a.longitud], {
                    radius: 12, fillColor: color, fillOpacity: 0.7, color: 'white', weight: 2, className: 'blink-animation shadow'
                });

                marker.bindPopup(`
          <div class="text-white">
            <strong style="color: ${color}">${a.tipo_nombre || 'ALERTA'}</strong><br>
            <small>${a.personal_nombres || 'Personal'}</small>
            <p class="mt-1 mb-2">${a.mensaje || 'Incidencia de limpieza'}</p>
            <button class="btn btn-xs btn-indigo btn-block" onclick="window.lpMonitoreoRef.abrirResolver(${a.id || a.id_alerta})">Gestionar</button>
          </div>
        `);
                marker.addTo(this.alertsLayer);
            }
        });

        // 2. Personal
        this.personalConUbicacion.forEach(p => {
            if (!p.latitud || !p.longitud) return;
            const id = p.id_personal;
            const sel = this.personalSeleccionadoId === id;
            const color = sel ? '#007bff' : '#4e54c8';

            const marker = L.marker([p.latitud, p.longitud], {
                icon: L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: ${color}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);">
                   <i class="fas fa-user-circle"></i>
                   ${this.tieneAlertaActiva(p) ? '<span class="pulse-indicator-small"></span>' : ''}
                 </div>`,
                    iconSize: [32, 32], iconAnchor: [16, 16]
                }),
                zIndexOffset: sel ? 1000 : 0
            });

            marker.bindPopup(`<strong>${p.personal?.name || p.nombres || p.personal_nombres || 'Personal Sin Nombre'}</strong><br>Ult. reporte: ${this.formatFecha(p.updated_at)}`);
            marker.on('click', () => this.seleccionarPersonal(p));
            marker.addTo(this.markersLayer);
            this.personalMarkersMap.set(id, marker);
        });

        // Exponer referencia para el popup
        (window as any).lpMonitoreoRef = {
            abrirResolver: (id: number) => this.abrirModalResolver(id)
        };
    }

    ajustarVistaATodos(): void {
        if (!this.map) return;
        const pts: any[] = [];
        this.personalConUbicacion.forEach(p => { if (p.latitud) pts.push([p.latitud, p.longitud]); });
        this.unreadAlerts.forEach(a => { if (a.latitud) pts.push([a.latitud, a.longitud]); });
        if (pts.length > 0) this.map.fitBounds(L.latLngBounds(pts), { padding: [50, 50], maxZoom: 17 });
    }

    seleccionarPersonal(p: any): void {
        const id = p.id_personal || p.id;
        if (this.personalSeleccionadoId === id) {
            this.personalSeleccionadoId = null;
            this.mostrarSelectorRutas = false;
        } else {
            this.personalSeleccionadoId = id;
            if (p.latitud && p.longitud) {
                this.map.flyTo([p.latitud, p.longitud], 18);
            }
            this.mostrarSelectorRutas = false;
            this.cargarHistorialTrayectoria(id);
        }
        this.actualizarMapa();
    }

    private cargarHistorialTrayectoria(id: number): void {
        this.historyLayer.clearLayers();
        this.lpService.getHistorialUbicacion(id, 50).subscribe({
            next: (res) => {
                const puntos = res.data || [];
                if (puntos.length > 1) {
                    const path = puntos.map((pt: any) => [pt.latitud, pt.longitud]);
                    L.polyline(path, { color: '#007bff', weight: 3, opacity: 0.6, dashArray: '5, 10' }).addTo(this.historyLayer);
                }
            }
        });
    }

    seleccionarAlerta(a: any): void {
        if (a.latitud && a.longitud) {
            this.map.flyTo([a.latitud, a.longitud], 18);
            this.actualizarMapa();
        }
    }

    toggleRutasPersonal(p: any): void {
        this.mostrarSelectorRutas = !this.mostrarSelectorRutas;

        if (this.mostrarSelectorRutas) {
            const id = p.id_personal || p.id;
            this.loadingRutasPersonal = true;
            this.rutasDelPersonal = [];
            this.rutaSeleccionadaId = '';
            this.limpiarCapasBusqueda();

            const hoy = new Date().toISOString().split('T')[0];
            this.lpService.getRutasPorPersonal(id, { fecha_desde: hoy, fecha_hasta: hoy }).subscribe({
                next: (res) => {
                    this.rutasDelPersonal = res.data || [];
                    this.loadingRutasPersonal = false;

                    if (this.rutasDelPersonal.length > 0) {
                        this.rutaSeleccionadaId = this.rutasDelPersonal[0].id_ruta;
                        this.graficarRutaUnicaSeleccionada();
                    } else {
                        this.toastService.info('No hay rutas asignadas para hoy.', 'Sin Rutas Hoy');
                    }
                },
                error: () => {
                    this.loadingRutasPersonal = false;
                    this.toastService.error('Error al consultar rutas asignadas.', 'Error Módulo');
                }
            });
        }
    }

    graficarRutaUnicaSeleccionada(): void {
        this.historySearchLayer.clearLayers();
        if (!this.rutaSeleccionadaId) return;

        const ruta = this.rutasDelPersonal.find(r => String(r.id_ruta) === String(this.rutaSeleccionadaId));
        if (!ruta) return;

        const puntos = ruta.puntos || [];
        if (puntos.length > 1) {
            const path = puntos.map((pt: any) => [parseFloat(pt.latitud), parseFloat(pt.longitud)]);
            const color = '#28a745';

            const poly = L.polyline(path, { color: color, weight: 6, opacity: 0.8, dashArray: '10, 8' })
                .bindPopup(`<div class="text-white"><strong style="color: ${color}">Ruta Asignada:</strong><br>${ruta.nombre}</div>`)
                .addTo(this.historySearchLayer);

            this.map.fitBounds(poly.getBounds(), { padding: [50, 50] });
            this.toastService.success(`Ruta Trazada: ${ruta.nombre}`, 'Visualización Activa');
        } else {
            this.toastService.warning('La ruta seleccionada no tiene puntos GPS trazados.', 'Ruta Incompleta');
        }
    }

    // --- Gestión de Alertas ---
    abrirModalResolver(id: number, rechazo: boolean = false): void {
        const alerta = this.alertas.find(a => (a.id || a.id_alerta) === id);
        if (!alerta) return;
        this.alertaParaResolver = alerta;
        this.isRechazo = rechazo;
        this.observacionResolucion = '';
        this.mostrarModalResolver = true;
    }

    cerrarModalResolver = () => this.mostrarModalResolver = false;

    confirmarGestionAlerta(): void {
        if (this.isRechazo && !this.observacionResolucion.trim()) {
            this.toastService.warning('Debe indicar el motivo del rechazo.', 'CAMPO REQUERIDO');
            return;
        }

        this.guardandoResolucion = true;
        const id = this.alertaParaResolver.id || this.alertaParaResolver.id_alerta;
        const obs = this.isRechazo
            ? this.lpService.rechazarAlerta(id, { observacion: this.observacionResolucion })
            : this.lpService.resolverAlerta(id, { observacion: this.observacionResolucion || 'Atendida' });

        obs.subscribe({
            next: (res) => {
                this.toastService.success('La alerta ha sido actualizada correctamente.', 'ALERTA GESTIONADA');
                this.guardandoResolucion = false;
                this.cerrarModalResolver();
                this.recargar(false);
            },
            error: () => this.guardandoResolucion = false
        });
    }

    // --- CRUD Tipos Alerta ---
    cargarTiposAlerta(): void {
        this.lpService.getTiposAlerta().subscribe({
            next: (res) => this.tiposAlerta = res.data?.tipos_alerta || []
        });
    }

    abrirModalTipoAlerta(): void {
        this.tipoAlertaEdicion = null;
        this.formTipoAlerta = { codigo: '', descripcion: '', color_hex: '#007bff', orden: 0, activo: 1 };
        this.mostrarModalTipo = true;
    }

    editarTipoAlerta(t: any): void {
        this.tipoAlertaEdicion = t;
        this.formTipoAlerta = { ...t, activo: 1 };
        this.mostrarModalTipo = true;
    }

    cerrarModalTipoAlerta = () => this.mostrarModalTipo = false;

    guardarTipoAlerta(): void {
        if (!this.formTipoAlerta.codigo || !this.formTipoAlerta.descripcion) return;
        const obs = this.tipoAlertaEdicion
            ? this.lpService.updateTipoAlerta(this.tipoAlertaEdicion.id_tipo_alerta, this.formTipoAlerta)
            : this.lpService.createTipoAlerta(this.formTipoAlerta);

        obs.subscribe({
            next: () => { this.cargarTiposAlerta(); this.cerrarModalTipoAlerta(); }
        });
    }

    eliminarTipoAlerta(t: any): void {
        if (confirm(`¿Eliminar categoría ${t.descripcion}?`)) {
            this.lpService.eliminarTipoAlerta(t.id_tipo_alerta).subscribe({
                next: () => this.cargarTiposAlerta()
            });
        }
    }

    // --- Historial Avanzado ---
    abrirModalHistorial(p: any, tipo: 'ubicacion' | 'alertas'): void {
        this.personalParaHistorial = p;
        this.filtrosHistorial.tipo = tipo;
        this.mostrarModalHistorial = true;
    }

    cerrarModalHistorial = () => this.mostrarModalHistorial = false;

    consultarHistorialFiltros(): void {
        const id = this.personalParaHistorial.id_personal || this.personalParaHistorial.id;
        this.loadingHistorialModal = true;
        this.historySearchLayer.clearLayers();

        if (this.filtrosHistorial.tipo === 'ubicacion') {
            this.lpService.getHistorialUbicacion(id, 500).subscribe({ // Ajustar params de fecha si el backend lo soporta
                next: (res) => {
                    // Filtrar en frontend si el backend no lo hace temporalmente
                    let data = res.data || [];
                    if (this.filtrosHistorial.fecha_desde) {
                        const dStart = new Date(this.filtrosHistorial.fecha_desde + 'T00:00:00').getTime();
                        const dEnd = new Date(this.filtrosHistorial.fecha_hasta + 'T23:59:59').getTime();
                        data = data.filter((pt: any) => {
                            const ptTime = new Date(pt.reportado_en?.replace(' ', 'T') || pt.created_at).getTime();
                            return ptTime >= dStart && ptTime <= dEnd;
                        });
                    }
                    if (data.length === 0) {
                        this.toastService.warning('No se encontraron coordenadas en el rango de fechas.', 'Sin Historial');
                    } else {
                        this.renderizarRutaHistorica(data);
                    }
                    this.loadingHistorialModal = false;
                    this.cerrarModalHistorial();
                },
                error: () => this.loadingHistorialModal = false
            });
        } else if (this.filtrosHistorial.tipo === 'alertas') {
            this.lpService.getAlertas({
                id_personal: id,
                fecha_desde: this.filtrosHistorial.fecha_desde,
                fecha_hasta: this.filtrosHistorial.fecha_hasta
            }).subscribe({
                next: (res) => {
                    this.renderizarAlertasHistoricas(res.data || []);
                    this.loadingHistorialModal = false;
                    this.cerrarModalHistorial();
                },
                error: () => this.loadingHistorialModal = false
            });
        }
    }

    private renderizarRutaHistorica(puntos: any[]): void {
        if (puntos.length < 2) return;
        const path = puntos.map((p: any) => [parseFloat(p.latitud), parseFloat(p.longitud)]);
        L.polyline(path, { color: '#6f42c1', weight: 4, opacity: 0.8, dashArray: '10, 10' }).addTo(this.historySearchLayer);
        this.map.fitBounds(L.latLngBounds(path), { padding: [50, 50] });
    }

    private renderizarAlertasHistoricas(alertas: any[]): void {
        alertas.forEach(a => {
            if (a.latitud && a.longitud) {
                L.marker([a.latitud, a.longitud], {
                    icon: L.divIcon({
                        html: `<i class="fas fa-exclamation-circle text-danger" style="font-size: 20px;"></i>`,
                        className: '', iconSize: [20, 20]
                    })
                }).bindPopup(`<strong>${a.tipo_nombre}</strong><br>${this.formatFechaFull(a.created_at)}`).addTo(this.historySearchLayer);
            }
        });
    }

    // --- Helpers ---
    filtrarPersonal = () => {
        const f = this.filtroPersonal.toLowerCase();
        return this.personalConUbicacion.filter(p => (p.personal?.name || p.personal_nombres || '').toLowerCase().includes(f));
    }

    filtrarAlertas = () => {
        const f = this.filtroAlertas.toLowerCase();
        return this.alertas.filter(a => (a.tipo_nombre || '').toLowerCase().includes(f) || (a.personal_nombres || '').toLowerCase().includes(f));
    }

    tieneAlertaActiva = (p: any) => this.unreadAlerts.some(a => a.id_personal === p.id_personal);

    formatFecha = (f: string) => f ? new Date(f).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : '-';
    formatFechaFull = (f: string) => f ? new Date(f).toLocaleString('es-PE') : '-';

    cambiarTab(tab: any): void {
        this.tabActiva = tab;
        if (tab === 'mapa') setTimeout(() => this.map?.invalidateSize(), 100);
    }

    cambiarModoNavegacion(modo: any): void {
        this.modoNavegacion = modo;
        this.actualizarMapa();
    }

    toggleMapExpanded(): void {
        this.isMapExpanded = !this.isMapExpanded;
        setTimeout(() => this.map?.invalidateSize(), 200);
    }

    toggleMenu = (id: number) => this.dropdownAbiertoId = this.dropdownAbiertoId === id ? null : id;

    limpiarCapasBusqueda = () => this.historySearchLayer?.clearLayers();

    @HostListener('document:click', ['$event'])
    onDocumentClick() { this.dropdownAbiertoId = null; }
}
