import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PatrullajeService } from '../services/patrullaje.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { Subject, takeUntil } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

declare var $: any;
declare var L: any;

// Coordenadas de Tacna, Perú
const TACNA_CENTER: [number, number] = [-18.0066, -70.2486];
const TACNA_ZOOM = 14;

@Component({
  selector: 'app-sc-rutas-patrullaje',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  templateUrl: './rutas-patrullaje.component.html',
  styles: []
})
export class PatrullajeRutasComponent extends CrudListExportBase implements OnInit, AfterViewInit, OnDestroy {
  // Estado de la UI
  loading = false;
  guardando = false;
  eliminando = false;
  filtrosColapsados = true;
  tabActiva: 'general' | 'mapa' | 'asignaciones' = 'general';
  editando = false;
  orgSettings: any = null;

  private http = inject(HttpClient);

  // Datos
  rutas: any[] = [];
  catalogos: any = {
    tipos_patrullaje: [],
    sectores: [],
    personal: [],
    vehiculos: []
  };

  filtros: any = {
    buscar: '',
    tipo_patrullaje: undefined,
    id_sector: undefined,
    turno: undefined,
    activo: undefined,
    per_page: 15
  };

  paginacion: any = {
    total: 0,
    currentPage: 1,
    lastPage: 1,
    perPage: 15
  };

  // Formulario
  formRuta: any = {};

  // Para eliminación
  rutaAEliminar: any = null;

  // Para vista de ruta
  rutaVista: any = null;

  // Auxiliar para el template
  Math = Math;

  // Programaciones
  fechaAsignacion = new Date().toISOString().split('T')[0];
  programacionesDelDia: any[] = [];
  nuevaProg: any = { id_personal: null, id_vehiculo: null, turno: 'manana', estado: 'programado' };

  // Mapa edición
  private map: any;
  private markers: any[] = [];
  private polyline: any;

  // Mapa vista
  private mapVista: any;
  private markersVista: any[] = [];
  private polylineVista: any;

  private destroy$ = new Subject<void>();
  private service = inject(PatrullajeService);
  private toast = inject(ToastService);

  getNombreTipo(id: string): string {
    const tipo = this.catalogos.tipos_patrullaje.find((t: any) => t.id === id);
    return tipo ? tipo.nombre : 'General';
  }

  constructor(crudExport: CrudExportService) {
    super(crudExport);
  }

  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('seguridad-ciudadana');
  }

  cargarOrganizationSettings(): void {
    this.http.get<any>(`${environment.apiUrl}/organization/settings`).subscribe({
      next: (res) => { 
        if (res.success) {
          this.orgSettings = Array.isArray(res.data) ? res.data[0] : res.data;
        }
      }
    });
  }

  getExportData(): Record<string, unknown>[] {
    return this.rutas.map(r => ({
      nombre: r.nombre,
      tipo: this.getNombreTipo(r.tipo_patrullaje),
      sector: r.sector?.nombre_sector || 'N/A',
      turno: r.turno || 'N/A',
      horario: `${r.hora_inicio || '--:--'} - ${r.hora_fin || '--:--'}`,
      frecuencia: r.frecuencia || 'Diario',
      estado: r.activo ? 'ACTIVA' : 'INACTIVA'
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nombre', label: 'Ruta' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'sector', label: 'Sector' },
      { key: 'turno', label: 'Turno' },
      { key: 'horario', label: 'Horario' },
      { key: 'frecuencia', label: 'Frecuencia' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string { return 'Reporte General de Rutas de Patrullaje'; }
  getExportFilename(): string { return 'rutas-patrullaje-seguridad'; }

  async onPrintGeneral() {
    const data = this.getExportData();
    if (!data || data.length === 0) return;
    
    this.toast.info('Generando Reporte General de Rutas, por favor espere...', 'Procesando');
    await this.cargarLibreriaPDF();
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.backgroundColor = '#fff';
    container.innerHTML = this.generarEstructuraReporteGeneral(data);
    document.body.appendChild(container);

    setTimeout(async () => {
      try {
        const element = container.querySelector('.print-content-wrapper');
        const opt = {
          margin: 0,
          filename: `Reporte_General_Rutas_${new Date().toISOString().split('T')[0]}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await (window as any).html2pdf().set(opt).from(element).save();
      } finally {
        document.body.removeChild(container);
      }
    }, 500);
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarRutas();
    this.cargarOrganizationSettings();
    this.resetForm();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) { this.map.remove(); this.map = null; }
    if (this.mapVista) { this.mapVista.remove(); this.mapVista = null; }
  }

  cargarCatalogos(): void {
    this.service.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.catalogos = res.data;
      }
    });
  }

  cargarRutas(pagina: number = 1): void {
    this.loading = true;
    const params = { ...this.filtros, page: pagina };
    this.service.getRutas(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.rutas = res.data;
        this.paginacion = {
          total: res.meta.total,
          currentPage: res.meta.current_page,
          lastPage: res.meta.last_page,
          perPage: res.meta.per_page
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onFilterChange(): void {
    this.cargarRutas(1);
  }

  limpiarFiltros(): void {
    this.filtros = {
      buscar: '',
      tipo_patrullaje: undefined,
      id_sector: undefined,
      turno: undefined,
      activo: undefined,
      per_page: 15
    };
    this.cargarRutas(1);
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.paginacion.lastPage) return;
    this.cargarRutas(p);
  }

  getPaginas(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;

    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      } else if (current >= last - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      }
    }
    return pages;
  }

  resetForm() {
    this.formRuta = {
      nombre: '',
      descripcion: '',
      tipo_patrullaje: 'preventivo',
      id_sector: undefined,
      turno: 'manana',
      hora_inicio: '07:00',
      hora_fin: '15:00',
      frecuencia: 'diario',
      activo: true,
      puntos: []
    };
    this.editando = false;
    this.tabActiva = 'general';
  }

  cerrarModal(): void {
    $('#modalRuta').modal('hide');
    setTimeout(() => {
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.markers = [];
        this.polyline = null;
      }
    }, 400);
  }

  abrirNuevo() {
    this.resetForm();
    this.editando = false;
    if (this.map) { this.map.remove(); this.map = null; this.markers = []; this.polyline = null; }
    $('#modalRuta').modal('show');
  }

  abrirEditar(r: any) {
    this.editando = true;
    this.tabActiva = 'general';
    if (this.map) { this.map.remove(); this.map = null; this.markers = []; this.polyline = null; }

    this.formRuta = { ...r, activo: !!r.activo, puntos: [] };
    $('#modalRuta').modal('show');

    this.service.getRuta(r.id).subscribe({
      next: (res: any) => {
        this.formRuta = { ...res.data, activo: !!res.data.activo };
      }
    });
  }

  setTab(tab: 'general' | 'mapa' | 'asignaciones') {
    this.tabActiva = tab;
    if (tab === 'mapa') {
      setTimeout(() => this.initMapa(), 100);
    }
    if (tab === 'asignaciones') {
      this.cargarAsignaciones();
    }
  }

  // MAPA
  initMapa() {
    if (this.map) return;

    this.map = L.map('map-definicion').setView(TACNA_CENTER, TACNA_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(this.map);

    if (this.formRuta.puntos && this.formRuta.puntos.length) {
      this.cargarPuntos(this.formRuta.puntos);
    }

    this.map.on('click', (e: any) => {
      const { lat, lng } = e.latlng;
      this.agregarPunto(lat, lng);
    });
  }

  agregarPunto(lat: number, lng: number) {
    const marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
    
    marker.on('dragend', () => this.dibujarRuta());
    marker.on('contextmenu', () => {
      this.map.removeLayer(marker);
      this.markers = this.markers.filter(m => m !== marker);
      this.dibujarRuta();
    });

    this.markers.push(marker);
    this.dibujarRuta();
  }

  cargarPuntos(puntos: any[]) {
    puntos.sort((a, b) => a.orden - b.orden);
    puntos.forEach(p => {
      const lat = p.lat !== undefined ? p.lat : p.latitud;
      const lng = p.lng !== undefined ? p.lng : p.longitud;
      const marker = L.marker([lat, lng], { draggable: true }).addTo(this.map);
      marker.on('dragend', () => this.dibujarRuta());
      marker.on('contextmenu', () => {
        this.map.removeLayer(marker);
        this.markers = this.markers.filter(m => m !== marker);
        this.dibujarRuta();
      });
      this.markers.push(marker);
    });
    this.dibujarRuta();
    if (this.markers.length) {
      const group = new L.featureGroup(this.markers);
      this.map.fitBounds(group.getBounds());
    }
  }

  dibujarRuta() {
    if (this.polyline) { this.map.removeLayer(this.polyline); }
    const coords = this.markers.map(m => m.getLatLng());
    this.polyline = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(this.map);
    
    // Update marker icons dynamically based on position (Start=Green, End=Red, Middle=Blue)
    this.markers.forEach((m, i) => {
      const color = i === 0 ? 'green' : (i === coords.length - 1 ? 'red' : 'blue');
      const icon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      m.setIcon(icon);
    });

    // Include both names to satisfy frontend tools and backend Model saves
    this.formRuta.puntos = coords.map((c, i) => ({ lat: c.lat, lng: c.lng, latitud: c.lat, longitud: c.lng, orden: i }));
  }

  limpiarPuntos() {
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];
    if (this.polyline) { this.map.removeLayer(this.polyline); }
    this.formRuta.puntos = [];
  }

  initMapaVista(puntosRAW: any) {
    if (this.mapVista) { this.mapVista.remove(); }
    this.mapVista = L.map('map-vista').setView(TACNA_CENTER, TACNA_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapVista);

    let puntos = [];
    if (typeof puntosRAW === 'string') {
      try { puntos = JSON.parse(puntosRAW); } catch (e) { puntos = []; }
    } else if (Array.isArray(puntosRAW)) {
      puntos = puntosRAW;
    }

    const coords = puntos.sort((a: any, b: any) => a.orden - b.orden).map((p: any) => {
      return [p.lat !== undefined ? p.lat : p.latitud, p.lng !== undefined ? p.lng : p.longitud];
    });
    
    if (coords.length > 0 && coords[0][0] !== undefined) {
      L.polyline(coords, { color: 'blue', weight: 5 }).addTo(this.mapVista);
      coords.forEach((c: any, i: number) => {
        const icon = L.divIcon({
          className: 'custom-div-icon',
          html: `<div style="background-color: ${i === 0 ? 'green' : (i === coords.length-1 ? 'red' : 'blue')}; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 3px rgba(0,0,0,0.5);"></div>`,
          iconSize: [14, 14],
          iconAnchor: [7, 7]
        });
        L.marker(c, { icon }).addTo(this.mapVista);
      });
      
      setTimeout(() => {
        if (this.mapVista) {
          this.mapVista.invalidateSize();
          this.mapVista.fitBounds(L.polyline(coords).getBounds(), { padding: [30, 30] });
        }
      }, 200);
    } else {
      setTimeout(() => { if (this.mapVista) this.mapVista.invalidateSize(); }, 200);
    }
  }

  abrirVer(r: any) {
    this.rutaVista = r;
    $('#modalVerRuta').modal('show');
    this.service.getRuta(r.id).subscribe({
      next: (res: any) => {
        this.rutaVista = res.data;
        // Esperamos a que el modal termine la animación CSS para inicializar el mapa correctamente
        setTimeout(() => this.initMapaVista(res.data.puntos), 350);
      }
    });
  }

  editarDesdeVista() {
    const r = { ...this.rutaVista };
    $('#modalVerRuta').modal('hide');
    setTimeout(() => this.abrirEditar(r), 400);
  }

  confirmarEliminar(r: any) {
    this.rutaAEliminar = r;
    $('#modalEliminarRuta').modal('show');
  }

  eliminarRuta() {
    this.eliminando = true;
    this.service.eliminarRuta(this.rutaAEliminar.id).subscribe({
      next: () => {
        this.toast.success('Ruta eliminada');
        this.cargarRutas(this.paginacion.currentPage);
        $('#modalEliminarRuta').modal('hide');
        this.eliminando = false;
      },
      error: () => this.eliminando = false
    });
  }

  guardar() {
    this.guardando = true;
    const body = { ...this.formRuta };
    const request = this.editando ? this.service.actualizarRuta(body.id, body) : this.service.crearRuta(body);

    request.subscribe({
      next: (res: any) => {
        this.toast.success(this.editando ? 'Ruta actualizada' : 'Ruta creada');
        this.cargarRutas(this.editando ? this.paginacion.currentPage : 1);
        this.cerrarModal();
        this.guardando = false;
      },
      error: () => this.guardando = false
    });
  }

  cargarAsignaciones() {
    this.service.getAsignaciones(this.formRuta.id, this.fechaAsignacion).subscribe({
      next: (res: any) => {
        this.programacionesDelDia = res.data;
      }
    });
  }

  asignar() {
    const data = {
      ...this.nuevaProg,
      id_ruta: this.formRuta.id,
      fecha: this.fechaAsignacion
    };
    this.service.asignar(data).subscribe({
      next: (res: any) => {
        this.toast.success('Programación registrada');
        this.cargarAsignaciones();
        this.nuevaProg = { id_personal: null, id_vehiculo: null, turno: this.formRuta.turno || 'manana', estado: 'programado' };
      }
    });
  }

  quitarAsignacion(p: any) {
    this.service.eliminarAsignacion(p.id).subscribe({
      next: () => {
        this.toast.info('Asignación retirada');
        this.cargarAsignaciones();
      }
    });
  }

  private generarEstructuraReporteGeneral(data: any[]): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', logo: '' };
    
    return `
    <div class="print-content-wrapper" style="width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; background: white; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        ${org.logo ? `<img src="/storage/${org.logo}" crossorigin="anonymous" style="width: 70px; height: 70px; object-fit: contain; margin-right: 25px;">` : ''}
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0; font-size: 16pt; text-transform: uppercase; color: #000;">${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
          <p style="margin: 4px 0 0; font-size: 9pt; font-weight: bold;">OFICINA DE SEGURIDAD CIUDADANA - REPORTE GENERAL DE RUTAS</p>
        </div>
        <div style="text-align: right; font-size: 8.5pt; font-weight: bold; min-width: 130px;">
          FECHA: ${new Date().toLocaleDateString('es-PE')}<br>HORA: ${new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 11pt; font-weight: bold; margin: 5px 0 15px; border: 1.5px solid #000; padding: 6px; text-transform: uppercase; background: #f4f4f4;">
        LISTADO DE RUTAS DE PATRULLAJE PLANIFICADAS
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
        <thead>
          <tr>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; width: 5%;">#</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; text-align: left;">IDENTIFICACIÓN DE LA RUTA</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; width: 15%;">SECTOR</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; width: 12%;">TURNO</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; width: 18%;">HORARIO</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8pt; border: 1px solid #000; padding: 6px; width: 12%;">ESTADO</th>
          </tr>
        </thead>
        <tbody>
          ${data.map((r, i) => `
            <tr>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; text-align: center;">${i + 1}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; font-weight: bold; text-transform: uppercase;">${r.nombre}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; text-align: center; text-transform: uppercase;">${r.sector}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; text-align: center; text-transform: uppercase;">${r.turno}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; text-align: center;">${r.horario}</td>
              <td style="border: 1px solid #000; padding: 6px; font-size: 8.5pt; text-align: center; font-weight: bold;">${r.estado}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: auto; padding-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-bottom: 15px;">
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">OPERACIONES</div>
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">SUPERVISIÓN</div>
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">GERENCIA</div>
      </div>
      
      <div style="border-top: 1px solid #000; padding-top: 8px; font-size: 8pt; display: flex; justify-content: space-between; font-style: italic;">
        <div>SIGEM v2.0 - SISTEMA INTEGRAL DE SEGURIDAD CIUDADANA</div>
        <div>Notaria DE POCOLLAY</div>
      </div>
    </div>
    `;
  }

  async cargarLibreriaPDF(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).html2pdf) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async onPrintHojaServicio(rutaBasica: any) {
    this.toast.info('Obteniendo datos y generando Hoja de Servicio...', 'Procesando');
    
    // PRIMERO: Traemos la ruta completa con todos sus puntos (coordenadas)
    let rutaCompleta: any;
    try {
      const resRuta: any = await this.service.getRuta(rutaBasica.id).toPromise();
      rutaCompleta = resRuta.data;
    } catch (e) {
      this.toast.error('No se pudo obtener el recorrido de la ruta.');
      return;
    }

    await this.cargarLibreriaPDF();
    const hoy = new Date().toISOString().split('T')[0];
    
    // SEGUNDO: Obtenemos las asignaciones de hoy para esta ruta
    this.service.getAsignaciones(rutaCompleta.id, hoy).subscribe({
      next: async (resAsig: any) => {
        const asignaciones = resAsig.data || [];
        
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        container.style.top = '0';
        container.style.width = '210mm';
        container.style.backgroundColor = '#fff';
        container.innerHTML = this.generarEstructuraHojaServicio(rutaCompleta, asignaciones, hoy);
        document.body.appendChild(container);

        const mapDiv = container.querySelector('#print-map-internal') as HTMLElement;
        const map = L.map(mapDiv, { 
          zoomControl: false, 
          attributionControl: false,
          fadeAnimation: false,
          zoomAnimation: false,
          markerZoomAnimation: false,
          preferCanvas: true 
        });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

        const puntos = rutaCompleta.puntos || [];
        const coords = puntos.sort((a:any, b:any) => a.orden - b.orden).map((p:any) => [p.lat !== undefined ? p.lat : p.latitud, p.lng !== undefined ? p.lng : p.longitud]);

        if (coords.length > 0 && coords[0][0] !== undefined) {
          const polyToFit = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
          coords.forEach((c:any, i:number) => {
            const color = i === 0 ? 'green' : (i === coords.length-1 ? 'red' : 'blue');
            const iconDiv = `<div style="background-color: ${color}; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 2px rgba(0,0,0,0.5);"></div>`;
            const customIcon = L.divIcon({ className: 'custom-div-icon', html: iconDiv, iconSize: [14, 14], iconAnchor: [7, 7] });
            L.marker(c, { icon: customIcon }).addTo(map);
          });
          
          setTimeout(() => {
            map.invalidateSize(true);
            map.fitBounds(polyToFit.getBounds(), { padding: [30, 30], animate: false });
          }, 600);
        } else {
          map.setView([-18.0066, -70.2486], 14);
        }

        setTimeout(async () => {
          try {
            const element = container.querySelector('.print-content-wrapper');
            const opt = {
              margin: 0,
              filename: `Hoja_Servicio_${rutaCompleta.nombre.replace(/\s+/g, '_')}_${hoy}.pdf`,
              image: { type: 'jpeg', quality: 0.98 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };
            await (window as any).html2pdf().set(opt).from(element).save();
          } finally {
            document.body.removeChild(container);
          }
        }, 2500);
      },
      error: () => this.toast.error('No se pudo obtener la programación de hoy.')
    });
  }

  private generarEstructuraHojaServicio(ruta: any, progs: any[], fecha: string): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', logo: '' };
    const dateObj = new Date(fecha);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    const fechaText = dateObj.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
    <div class="print-content-wrapper" style="width: 210mm; min-height: 297mm; padding: 12mm; box-sizing: border-box; background: white; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        ${org.logo ? `<img src="/storage/${org.logo}" crossorigin="anonymous" style="width: 60px; height: 60px; object-fit: contain; margin-right: 20px;">` : ''}
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0; font-size: 14pt; text-transform: uppercase; color: #000;">${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
          <p style="margin: 3px 0 0; font-size: 8.5pt; font-weight: bold;">GERENCIA DE SEGURIDAD CIUDADANA - HOJA DE SERVICIO DIARIO</p>
        </div>
        <div style="text-align: right; font-size: 7.5pt; font-weight: bold; min-width: 110px;">
          FECHA: ${new Date().toLocaleDateString('es-PE')}<br>HORA: ${new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 11pt; font-weight: bold; margin: 5px 0 15px; border: 1.5px solid #000; padding: 6px; text-transform: uppercase; background: #f4f4f4;">
        HOJA DE SERVICIO: ${ruta.nombre} - ${fechaText.toUpperCase()}
      </div>
      
      <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 10px; margin-bottom: 15px;">
        <div style="border: 1px solid #000; padding: 8px; font-size: 8.5pt;">
          <strong style="text-transform: uppercase; border-bottom: 1px solid #000; display: block; margin-bottom: 4px;">1. DATOS DE LA RUTA Y SECTOR</strong>
          Sector / Jurisdicción: ${ruta.sector ? ruta.sector.nombre_sector : 'N/A'}<br>
          Descripción: ${ruta.descripcion || 'Ninguna'}<br>
          Tipo de Patrullaje: ${ruta.tipo_patrullaje ? ruta.tipo_patrullaje.toUpperCase() : 'N/A'}
        </div>
        <div style="border: 1px solid #000; padding: 8px; font-size: 8.5pt;">
          <strong style="text-transform: uppercase; border-bottom: 1px solid #000; display: block; margin-bottom: 4px;">2. PARÁMETROS OPERATIVOS</strong>
          Turno Principal: ${ruta.turno ? ruta.turno.toUpperCase() : 'N/A'}<br>
          Horario Programado: ${ruta.hora_inicio || '--'} a ${ruta.hora_fin || '--'}<br>
          Frecuencia: ${ruta.frecuencia ? ruta.frecuencia.toUpperCase() : 'N/A'}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="font-size: 9pt; display: block; margin-bottom: 5px;">3. CROQUIS GEOGRÁFICO DE LA OPERACIÓN:</strong>
        <div style="width: 100%; height: 350px; border: 1.5px solid #000; position: relative;">
          <div id="print-map-internal" style="width: 100%; height: 100%;"></div>
        </div>
      </div>

      <div>
        <strong style="font-size: 9pt; display: block; margin-bottom: 5px;">4. PERSONAL Y UNIDADES ASIGNADAS PARA HOY:</strong>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr>
              <th style="border: 1px solid #000; padding: 5px; font-size: 8pt; background: #eee; width: 10%;">T°</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 8pt; background: #eee; width: 50%;">PERSONAL</th>
              <th style="border: 1px solid #000; padding: 5px; font-size: 8pt; background: #eee; width: 40%;">VEHÍCULO / UNIDAD</th>
            </tr>
          </thead>
          <tbody>
            ${progs.length > 0 ? progs.map(p => `
              <tr>
                <td style="border: 1px solid #000; padding: 5px; font-size: 8.5pt; text-align: center; text-transform: uppercase;">${p.turno.substring(0,3)}</td>
                <td style="border: 1px solid #000; padding: 5px; font-size: 8.5pt; text-transform: uppercase;">${p.personal ? (p.personal.nombres + ' ' + p.personal.apellidos) : 'SIN ASIGNAR'}</td>
                <td style="border: 1px solid #000; padding: 5px; font-size: 8.5pt; text-align: center; text-transform: uppercase;">${p.vehiculo ? p.vehiculo.placa + ' (' + p.vehiculo.tipo + ')' : 'A PIE'}</td>
              </tr>
            `).join('') : '<tr><td colspan="3" style="border: 1px solid #000; padding: 10px; text-align: center; font-style: italic;">No hay personal programado para la fecha</td></tr>'}
          </tbody>
        </table>
      </div>

      <div style="margin-top: auto; padding-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 10px;">
        <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 8.5pt; font-weight: bold;">SUPERVISOR DE TURNO</div>
        <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 8.5pt; font-weight: bold;">JEFE DE OPERACIONES</div>
      </div>
      
      <div style="border-top: 1px solid #000; padding-top: 5px; font-size: 7.5pt; display: flex; justify-content: space-between; font-style: italic;">
        <div>DOCUMENTO GENERADO POR SIGEM v2.0 - SISTEMA DE SEGURIDAD CIUDADANA</div>
        <div>Notaria DE POCOLLAY</div>
      </div>
    </div>
    `;
  }

  async onPrintRecorrido(rutaObj?: any) {
    let ruta = rutaObj || this.formRuta;
    if (!ruta || (!ruta.id && !ruta.nombre)) return;
    
    this.toast.info('Obteniendo datos y generando PDF...', 'Procesando');

    // SI la ruta viene de la lista (no tiene puntos cargados), los traemos del backend primero
    if (!ruta.puntos || ruta.puntos.length === 0) {
      try {
        const res: any = await this.service.getRuta(ruta.id).toPromise();
        ruta = res.data;
      } catch (e) {
        this.toast.error('No se pudo cargar el recorrido de la ruta.');
        return;
      }
    }
    
    await this.cargarLibreriaPDF();
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.backgroundColor = '#fff';
    container.innerHTML = this.generarEstructuraRecorrido(ruta);
    document.body.appendChild(container);

    const mapDiv = container.querySelector('#print-map-internal') as HTMLElement;
    const map = L.map(mapDiv, { 
      zoomControl: false, 
      attributionControl: false,
      fadeAnimation: false,
      zoomAnimation: false,
      markerZoomAnimation: false,
      preferCanvas: true // Crucial: Dibuja la línea en un canvas en lugar de SVG para evitar desajustes de offset en PDFs dinámicos
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

    const puntos = ruta.puntos || [];
    const coords = puntos.sort((a:any, b:any) => a.orden - b.orden).map((p:any) => [p.lat !== undefined ? p.lat : p.latitud, p.lng !== undefined ? p.lng : p.longitud]);

    if (coords.length > 0 && coords[0][0] !== undefined) {
      const polyToFit = L.polyline(coords, { color: 'blue', weight: 4 }).addTo(map);
      coords.forEach((c:any, i:number) => {
        const color = i === 0 ? 'green' : (i === coords.length-1 ? 'red' : 'blue');
        const iconDiv = `<div style="background-color: ${color}; border-radius: 50%; width: 14px; height: 14px; border: 2px solid white; box-shadow: 0 0 2px rgba(0,0,0,0.5);"></div>`;
        const customIcon = L.divIcon({ className: 'custom-div-icon', html: iconDiv, iconSize: [14, 14], iconAnchor: [7, 7] });
        L.marker(c, { icon: customIcon }).addTo(map);
      });
      
      // Aumentamos ligeramente el tiempo para garantizar que el DOM esté 100% estable antes de ajustar los límites
      setTimeout(() => {
        map.invalidateSize(true);
        map.fitBounds(polyToFit.getBounds(), { padding: [50, 50], animate: false });
      }, 700);
    } else {
      map.setView([-18.0066, -70.2486], 14);
    }

    setTimeout(async () => {
      try {
        const element = container.querySelector('.print-content-wrapper');
        const opt = {
          margin: 0,
          filename: `Ruta_Patrullaje_${ruta.nombre.replace(/\s+/g, '_').toUpperCase()}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await (window as any).html2pdf().set(opt).from(element).save();
      } finally {
        document.body.removeChild(container);
      }
    }, 2200);
  }

  async onPrintProgramacion() {
    if (!this.programacionesDelDia || this.programacionesDelDia.length === 0) return;
    this.toast.info('Generando PDF, en un momento comenzará la descarga...', 'Procesando');
    await this.cargarLibreriaPDF();
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.backgroundColor = '#fff';
    container.innerHTML = this.generarEstructuraProgramacion(this.formRuta, this.programacionesDelDia, this.fechaAsignacion);
    document.body.appendChild(container);

    setTimeout(async () => {
      try {
        const element = container.querySelector('.print-content-wrapper');
        const opt = {
          margin: 0,
          filename: `Orden_Operaciones_${this.fechaAsignacion}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await (window as any).html2pdf().set(opt).from(element).save();
      } finally {
        document.body.removeChild(container);
      }
    }, 500); 
  }

  private generarEstructuraRecorrido(ruta: any): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', logo: '' };
    const puntos = ruta.puntos || [];
    
    return `
    <div class="print-content-wrapper" style="width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; background: white; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        ${org.logo ? `<img src="/storage/${org.logo}" crossorigin="anonymous" style="width: 70px; height: 70px; object-fit: contain; margin-right: 25px;">` : ''}
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0; font-size: 16pt; text-transform: uppercase; color: #000;">${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
          <p style="margin: 4px 0 0; font-size: 9pt; font-weight: bold;">OFICINA DE SEGURIDAD CIUDADANA - REPORTE TÉCNICO DE RUTA</p>
        </div>
        <div style="text-align: right; font-size: 8.5pt; font-weight: bold; min-width: 130px;">
          FECHA: ${new Date().toLocaleDateString('es-PE')}<br>HORA: ${new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 12pt; font-weight: bold; margin: 15px 0 25px; border: 1.5px solid #000; padding: 8px; text-transform: uppercase;">
        MAPA DE VÉRTICES Y RECORRIDO GEOGRÁFICO: ${ruta.nombre}
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
        <div style="border: 1px solid #000; padding: 10px; font-size: 9.5pt;">
          <strong style="font-size: 8.5pt; text-transform: uppercase; display: block; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 4px;">DETALLES Y CUADRANTE</strong>
          Sector Perteneciente: ${ruta.sector ? ruta.sector.nombre_sector : 'N/A'}<br>
          Descripción: ${ruta.descripcion || 'Ninguna especificada'}
        </div>
        <div style="border: 1px solid #000; padding: 10px; font-size: 9.5pt;">
          <strong style="font-size: 8.5pt; text-transform: uppercase; display: block; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 4px;">PARÁMETROS OPERATIVOS</strong>
          Turno Normal: ${ruta.turno ? ruta.turno.toUpperCase() : 'N/A'}<br>
          Horario: ${ruta.hora_inicio || '--:--'} hasta ${ruta.hora_fin || '--:--'}<br>
          Frecuencia: ${ruta.frecuencia ? ruta.frecuencia.replace(/-/g, ' ').toUpperCase() : 'N/A'}
        </div>
      </div>

      <p style="font-size: 10pt; font-weight: bold; margin-bottom: 8px;">CROQUIS GEOGRÁFICO DEL PATRULLAJE (Generado por Sistema SIGEM):</p>
      
      <div style="width: 100%; height: 500px; border: 2px solid #000; margin-bottom: 70px; display: block;">
        <div id="print-map-internal" style="width: 100%; height: 100%;"></div>
      </div>
      
      <div style="margin-top: auto; padding-top: 50px; display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 15px;">
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9.5pt; font-weight: bold;">RESPONSABLE TÉCNICO</div>
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9.5pt; font-weight: bold;">JEFATURA DE OPERACIONES</div>
      </div>
      
      <div style="border-top: 1px solid #000; padding-top: 8px; font-size: 8.5pt; display: flex; justify-content: space-between; font-style: italic;">
        <div>SIGEM v2.0 - SISTEMA INTEGRAL DE SEGURIDAD CIUDADANA</div>
        <div>HOJA DE RUTA OFICIAL (${puntos.length} puntos mapeados)</div>
      </div>
    </div>
    `;
  }

  private generarEstructuraProgramacion(ruta: any, progs: any[], fecha: string): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', logo: '' };
    const dateObj = new Date(fecha);
    dateObj.setMinutes(dateObj.getMinutes() + dateObj.getTimezoneOffset());
    const fechaText = dateObj.toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    return `
    <div class="print-content-wrapper" style="width: 210mm; min-height: 297mm; padding: 15mm; box-sizing: border-box; background: white; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 15px; margin-bottom: 20px;">
        ${org.logo ? `<img src="/storage/${org.logo}" crossorigin="anonymous" style="width: 70px; height: 70px; object-fit: contain; margin-right: 25px;">` : ''}
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0; font-size: 16pt; text-transform: uppercase; color: #000;">${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
          <p style="margin: 4px 0 0; font-size: 9pt; font-weight: bold;">GERENCIA DE SEGURIDAD CIUDADANA - PROGRAMACIÓN DIARIA</p>
        </div>
        <div style="text-align: right; font-size: 8.5pt; font-weight: bold; min-width: 130px;">
          IMPRESO: ${new Date().toLocaleDateString('es-PE')}<br>HORA: ${new Date().toLocaleTimeString('es-PE')}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 12pt; font-weight: bold; margin: 15px 0 25px; border: 1.5px solid #000; padding: 8px; text-transform: uppercase;">
        ORDEN DE OPERACIONES PARA LA FECHA: ${fechaText.toUpperCase()}
      </div>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
        <div style="border: 1px solid #000; padding: 10px; font-size: 9.5pt;">
          <strong style="font-size: 8.5pt; text-transform: uppercase; display: block; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 4px;">IDENTIFICACIÓN DE LA RUTA / OPERACIÓN</strong>
          ${ruta.nombre.toUpperCase()}
        </div>
        <div style="border: 1px solid #000; padding: 10px; font-size: 9.5pt;">
          <strong style="font-size: 8.5pt; text-transform: uppercase; display: block; margin-bottom: 6px; border-bottom: 1px solid #999; padding-bottom: 4px;">DETALLES ADICIONALES</strong>
          Tipo: ${ruta.tipo_patrullaje ? ruta.tipo_patrullaje.toUpperCase() : 'N/A'}
        </div>
      </div>

      <p style="font-size: 10pt; font-weight: bold; margin-bottom: 8px;">LISTADO DE PERSONAL Y LOGÍSTICA ASIGNADA:</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 30px;">
        <thead>
          <tr>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1.5px solid #000; padding: 8px; width: 10%;">N°</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1.5px solid #000; padding: 8px; width: 15%;">TURNO</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1.5px solid #000; padding: 8px; width: 45%;">PERSONAL ASIGNADO</th>
            <th style="background-color: #ededed; font-weight: bold; text-transform: uppercase; font-size: 8.5pt; border: 1.5px solid #000; padding: 8px; width: 30%;">UNIDAD / VEHÍCULO</th>
          </tr>
        </thead>
        <tbody>
          ${progs.map((p, i) => `
            <tr>
              <td style="text-align: center; font-weight: bold; border: 1px solid #000; padding: 8px; font-size: 9pt;">${i + 1}</td>
              <td style="text-align: center; border: 1px solid #000; padding: 8px; font-size: 9pt; text-transform: uppercase;">${p.turno}</td>
              <td style="border: 1px solid #000; padding: 8px; font-size: 9pt;">${p.personal ? (p.personal.nombres + ' ' + p.personal.apellidos).toUpperCase() : 'SIN ASIGNAR'}</td>
              <td style="text-align: center; border: 1px solid #000; padding: 8px; font-size: 9pt;">${p.vehiculo ? p.vehiculo.placa + ' (' + p.vehiculo.tipo + ')' : 'A PIE'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="margin-top: auto; padding-top: 50px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-bottom: 15px;">
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">RESPONSABLE TÉCNICO</div>
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">DESPACHO / RADIO</div>
        <div style="text-align: center; border-top: 1.5px solid #000; padding-top: 8px; font-size: 9pt; font-weight: bold;">GERENCIA SEG. CIUDADANA</div>
      </div>
      
      <div style="border-top: 1px solid #000; padding-top: 8px; font-size: 8.5pt; display: flex; justify-content: space-between; font-style: italic;">
        <div>SIGEM v2.0 - SISTEMA INTEGRAL DE SEGURIDAD CIUDADANA</div>
        <div>ORDEN DE OPERACIONES OFICIAL</div>
      </div>
    </div>
    `;
  }
}
