import { Component, OnInit, OnDestroy, ViewChild, ChangeDetectorRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { OcurrenciaService } from '../services/ocurrencia.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../services/toast.service';

declare var $: any;
declare var L: any;

@Component({
  selector: 'app-ocurrencias',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    DataTablesModule, 
    SystemLayoutComponent
  ],
  templateUrl: './ocurrencias.component.html',
  styleUrls: ['./ocurrencias.component.scss']
})
export class OcurrenciasComponent extends CrudListExportBase implements OnInit, OnDestroy {
  Math = Math;

  ocurrencias: any[] = [];
  loading = false;
  isFiltersCollapsed = false;
  saving = false;

  isEdit = false;
  ocurrenciaSeleccionada: any = null;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    tipo: '',
    prioridad: '',
    estado: '',
    per_page: 10,
    page: 1
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10
  };

  formulario: any = {
    tipo: 'robo',
    descripcion: '',
    direccion: '',
    sector_id: '',
    referencia: '',
    latitud: '',
    longitud: '',
    prioridad: 'media',
    estado: 'reportada',
    reportado_por: '',
    telefono_reportante: '',
    reportante_dni: '',
    fecha_hora_ocurrencia: '',
    observaciones: ''
  };

  formularioAsignar: any = {
    personal_id: '',
    vehiculo_id: '',
    tiempo_estimado: 15,
    instrucciones: ''
  };

  formularioCerrar: any = {
    resultado: '',
    acciones_tomadas: '',
    requiere_seguimiento: false,
    observaciones_cierre: ''
  };

  // Opciones
  tiposIncidente = [
    { value: 'robo', label: 'Robo' },
    { value: 'hurto', label: 'Hurto' },
    { value: 'accidente_transito', label: 'Accidente de Tránsito' },
    { value: 'agresion', label: 'Agresión' },
    { value: 'vandalismo', label: 'Vandalismo' },
    { value: 'alteracion_orden', label: 'Alteración del Orden Público' },
    { value: 'emergencia_medica', label: 'Emergencia Médica' },
    { value: 'incendio', label: 'Incendio' },
    { value: 'violencia_familiar', label: 'Violencia Familiar' },
    { value: 'otros', label: 'Otros' }
  ];

  prioridades = [
    { value: 'baja', label: 'Baja', class: 'badge-success' },
    { value: 'media', label: 'Media', class: 'badge-warning' },
    { value: 'alta', label: 'Alta', class: 'badge-orange' },
    { value: 'critica', label: 'Crítica', class: 'badge-danger' }
  ];

  estados = [
    { value: 'reportada', label: 'Reportada', class: 'badge-secondary' },
    { value: 'en_atencion', label: 'En Atención', class: 'badge-warning' },
    { value: 'atendida', label: 'Atendida', class: 'badge-info' },
    { value: 'cerrada', label: 'Cerrada', class: 'badge-success' }
  ];

  personal: any[] = [];
  vehiculos: any[] = [];
  sectores: any[] = [];
  archivosSubir: File[] = [];
  previsualizaciones: string[] = [];
  orgSettings: any = null;

  private destroy$ = new Subject<void>();
  private mapSelector: any;
  private markerSelector: any;
  centroMapa = { lat: -18.005, lng: -70.225 }; // Tacna (Pocollay)

  isServiceMode = false;
  userDepartment: any = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private modalService: NgbModal,
    private ocurrenciaService: OcurrenciaService,
    private router: Router,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.isServiceMode = this.router.url.includes('/servicios/');
  }

  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('seguridad-ciudadana');
  }

  ngOnInit(): void {
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadOcurrencias();
    this.cargarCatalogos();
    this.cargarOrganizationSettings();
    
    if (this.isServiceMode) {
      this.obtenerMiDepartamento();
    }
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    // Cerrar todos los menús si se hace click fuera
    this.ocurrencias.forEach(o => o.showMenu = false);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.dtTrigger.closed) this.dtTrigger.complete();
    if (this.mapSelector) this.mapSelector.remove();
  }

  initDataTable(): void {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'desc']],
      columnDefs: [
        { targets: 0, orderable: false },
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  private triggerDataTable(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        this.dtTrigger.next(null);
      });
    } else {
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
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

  cargarCatalogos(): void {
    const urlSectores = `${environment.apiUrl}/seguridad-ciudadana/sectores`;
    this.http.get<any>(urlSectores).subscribe(res => { if (res.success) this.sectores = res.data; });

    const urlPersonal = `${environment.apiUrl}/seguridad-ciudadana/personal?per_page=-1`;
    this.http.get<any>(urlPersonal).subscribe(res => { if (res.success) this.personal = Array.isArray(res.data) ? res.data : (res.data.data || []); });

    const urlVehiculos = `${environment.apiUrl}/seguridad-ciudadana/vehiculos?per_page=-1`;
    this.http.get<any>(urlVehiculos).subscribe(res => { if (res.success) this.vehiculos = Array.isArray(res.data) ? res.data : (res.data.data || []); });
  }

  loadOcurrencias(): void {
    this.loading = true;
    this.ocurrenciaService.obtenerOcurrencias(this.filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success) {
          const data = response.data;
          this.ocurrencias = Array.isArray(data) ? data : (data.data || []);
          
          if (!Array.isArray(data)) {
            this.paginacion = {
              currentPage: data.current_page || 1,
              lastPage: data.last_page || 1,
              total: data.total || 0,
              perPage: +(data.per_page || this.filtros.per_page || 10)
            };
          } else {
            this.paginacion.total = this.ocurrencias.length;
            this.paginacion.lastPage = 1;
          }
          this.loading = false;
          this.cdr.detectChanges();
          this.triggerDataTable();
        } else {
          this.loading = false;
          this.ocurrencias = [];
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('Error loading ocurrencias:', error);
        this.loading = false;
        this.ocurrencias = [];
        this.cdr.detectChanges();
      }
    });
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.loadOcurrencias();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.loadOcurrencias();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      tipo: '',
      prioridad: '',
      estado: '',
      per_page: this.cv.defaultPageSize || 10,
      page: 1
    };
    this.loadOcurrencias();
  }

  getPaginationPages(): number[] {
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

  // ==================== MODALES ====================

  openCreate(): void {
    this.isEdit = false;
    this.ocurrenciaSeleccionada = null;
    this.resetFormulario();
    $('#modalOcurrencia').modal('show');
    setTimeout(() => this.inicializarMapaSelector('map-selector-ocurrencia'), 300);
  }

  openEdit(item: any): void {
    this.isEdit = true;
    this.ocurrenciaSeleccionada = item;
    this.llenarFormulario(item);
    $('#modalOcurrencia').modal('show');
    setTimeout(() => {
      this.inicializarMapaSelector('map-selector-ocurrencia');
      if (item.latitud && item.longitud) {
        this.actualizarMarkerSelector(parseFloat(item.latitud), parseFloat(item.longitud));
      }
    }, 300);
  }

  openView(item: any): void {
    this.ocurrenciaSeleccionada = item;
    $('#modalViewOcurrencia').modal('show');
  }

  openAsignar(item: any): void {
    this.ocurrenciaSeleccionada = item;
    this.formularioAsignar = { personal_id: '', vehiculo_id: '', tiempo_estimado: 15, instrucciones: '' };
    $('#modalAsignarPersonal').modal('show');
  }

  openCerrar(item: any): void {
    this.ocurrenciaSeleccionada = item;
    this.formularioCerrar = { resultado: '', acciones_tomadas: '', requiere_seguimiento: false, observaciones_cierre: '' };
    $('#modalCerrarOcurrencia').modal('show');
  }

  closeEdit(): void {
    $('#modalOcurrencia').modal('hide');
    if (this.mapSelector) { this.mapSelector.remove(); this.mapSelector = null; }
  }

  closeView(): void { $('#modalViewOcurrencia').modal('hide'); }
  closeAsignar(): void { $('#modalAsignarPersonal').modal('hide'); }
  closeCerrar(): void { $('#modalCerrarOcurrencia').modal('hide'); }

  // ==================== FORMULARIO ====================

  resetFormulario(): void {
    this.formulario = {
      tipo: 'robo',
      descripcion: '',
      direccion: '',
      sector_id: '',
      referencia: '',
      latitud: '',
      longitud: '',
      prioridad: 'media',
      estado: 'reportada',
      reportado_por: '',
      telefono_reportante: '',
      reportante_dni: '',
      fecha_hora_ocurrencia: this.formatDateForInput(new Date()),
      observaciones: ''
    };
    this.archivosSubir = [];
    this.previsualizaciones = [];
  }

  llenarFormulario(item: any): void {
    this.formulario = { ...item };
    this.formulario.fecha_hora_ocurrencia = this.formatDateForInput(item.fecha_hora_ocurrencia);
    this.previsualizaciones = Array.isArray(item.evidencias) ? item.evidencias.map((e: any) => e.archivo || e) : [];
    this.archivosSubir = [];
  }

  save(): void {
    this.saving = true;
    
    // Si hay archivos, usamos FormData
    let request$;
    if (this.archivosSubir.length > 0) {
      const formData = new FormData();
      Object.keys(this.formulario).forEach(key => formData.append(key, this.formulario[key]));
      this.archivosSubir.forEach((f, i) => formData.append(`fotos[${i}]`, f));
      
      if (this.isEdit) {
        formData.append('_method', 'PUT');
        request$ = this.http.post(`${environment.apiUrl}/seguridad-ciudadana/ocurrencias/${this.ocurrenciaSeleccionada.id}`, formData);
      } else {
        request$ = this.http.post(`${environment.apiUrl}/seguridad-ciudadana/ocurrencias`, formData);
      }
    } else {
      request$ = this.isEdit 
        ? this.ocurrenciaService.actualizarOcurrencia(this.ocurrenciaSeleccionada.id, this.formulario)
        : this.ocurrenciaService.crearOcurrencia(this.formulario);
    }

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toast.success(this.isEdit ? 'Ocurrencia actualizada' : 'Ocurrencia registrada');
          this.closeEdit();
          this.loadOcurrencias();
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving ocurrencia:', error);
        this.toast.error('Error al guardar: ' + (error.error?.message || error.message));
        this.saving = false;
      }
    });
  }

  asignarPersonal(): void {
    this.loading = true;
    this.ocurrenciaService.asignarPersonal(this.ocurrenciaSeleccionada.id, this.formularioAsignar.personal_id, this.formularioAsignar.vehiculo_id)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.toast.success('Personal asignado');
            this.closeAsignar();
            this.loadOcurrencias();
          }
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  cerrarCaso(): void {
    this.loading = true;
    this.ocurrenciaService.cerrarOcurrencia(this.ocurrenciaSeleccionada.id, this.formularioCerrar)
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.toast.success('Caso cerrado');
            this.closeCerrar();
            this.loadOcurrencias();
          }
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  marcarLlegada(item: any): void {
    this.ocurrenciaService.marcarLlegada(item.id).subscribe({
      next: (res) => { if (res.success) { this.toast.success('Llegada registrada'); this.loadOcurrencias(); } }
    });
  }

  delete(item: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Ocurrencia';
    ref.componentInstance.message = '¿Deseas eliminar esta ocurrencia?';
    ref.componentInstance.type = 'danger';
    ref.result.then((res) => {
      if (res) {
        this.http.delete(`${environment.apiUrl}/seguridad-ciudadana/ocurrencias/${item.id}`).subscribe(() => {
          this.toast.success('Eliminado');
          this.loadOcurrencias();
        });
      }
    }, () => {});
  }

  // ==================== MAPA SELECTOR ====================
  inicializarMapaSelector(containerId: string): void {
    if (this.mapSelector) this.mapSelector.remove();
    try {
      this.mapSelector = L.map(containerId).setView([this.centroMapa.lat, this.centroMapa.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(this.mapSelector);
      this.mapSelector.on('click', (e: any) => {
        this.actualizarMarkerSelector(e.latlng.lat, e.latlng.lng);
        this.formulario.latitud = e.latlng.lat.toFixed(6);
        this.formulario.longitud = e.latlng.lng.toFixed(6);
      });
      setTimeout(() => this.mapSelector.invalidateSize(), 500);
    } catch (e) { console.error('Error mapa', e); }
  }

  private actualizarMarkerSelector(lat: number, lng: number): void {
    if (!this.mapSelector) return;
    if (this.markerSelector) this.markerSelector.remove();
    this.markerSelector = L.marker([lat, lng]).addTo(this.mapSelector);
    this.mapSelector.setView([lat, lng], this.mapSelector.getZoom());
  }

  // ==================== EXPORTACIÓN ====================
  getExportData(): Record<string, unknown>[] {
    return this.ocurrencias.map(o => ({
      codigo: o.codigo_ocurrencia,
      tipo: o.tipo,
      fecha: o.fecha_hora_ocurrencia,
      prioridad: o.prioridad,
      estado: o.estado,
      reportante: o.reportado_por
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo', label: 'Código' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'prioridad', label: 'Prioridad' },
      { key: 'estado', label: 'Estado' },
      { key: 'reportante', label: 'Reportante' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Ocurrencias'; }
  getExportFilename(): string { return 'ocurrencias-seguridad'; }

  onPrintGeneral(): void {
    const html = this.generarHTMLReporteGeneral(this.ocurrencias);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  // ==================== UTILIDADES ====================
  getPrioridadBadgeClass(p: string): string { return (this.prioridades.find(x => x.value === p)?.class) || 'badge-secondary'; }
  getPrioridadLabel(p: string): string { return (this.prioridades.find(x => x.value === p)?.label) || p; }
  getEstadoBadgeClass(e: string): string { return (this.estados.find(x => x.value === e)?.class) || 'badge-secondary'; }
  getEstadoLabel(e: string): string { return (this.estados.find(x => x.value === e)?.label) || e; }
  getTipoIcon(t: string): string {
    if (!t) return 'fa-exclamation-circle';
    const icons: any = { 
      'robo': 'fa-user-ninja', 
      'hurto': 'fa-hand-holding', 
      'accidente_transito': 'fa-car-crash', 
      'otros': 'fa-question-circle' 
    };
    return icons[t.toLowerCase()] || 'fa-exclamation-circle';
  }
  formatDateForInput(d: any): string {
    if (!d) return '';
    const date = new Date(d);
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  }

  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files) {
      for (let file of files) {
        this.archivosSubir.push(file);
        const reader = new FileReader();
        reader.onload = (e: any) => { this.previsualizaciones.push(e.target.result); this.cdr.detectChanges(); };
        reader.readAsDataURL(file);
      }
    }
  }

  removerFoto(i: number): void { this.archivosSubir.splice(i, 1); this.previsualizaciones.splice(i, 1); }



  async cargarLibreriaPDF(): Promise<void> {
    return new Promise((resolve) => {
      if ((window as any).html2pdf) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => resolve();
      document.head.appendChild(script);
    });
  }

  async onPrintIndividual(item: any) {
    this.toast.info('Generando Reporte de Incidente, espere...', 'Procesando');
    await this.cargarLibreriaPDF();
    
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm';
    container.style.backgroundColor = '#fff';
    container.innerHTML = this.generarEstructuraIndividual(item);
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

    if (item.latitud && item.longitud) {
      const lat = parseFloat(item.latitud);
      const lng = parseFloat(item.longitud);
      L.marker([lat, lng]).addTo(map);
      
      setTimeout(() => {
        map.invalidateSize(true);
        map.setView([lat, lng], 16);
      }, 700);
    } else {
      map.setView([this.centroMapa.lat, this.centroMapa.lng], 13);
    }

    setTimeout(async () => {
      try {
        const element = container.querySelector('.print-content-wrapper');
        const opt = {
          margin: 0,
          filename: `Reporte_${item.codigo_ocurrencia || 'INCIDENTE'}.pdf`,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        await (window as any).html2pdf().set(opt).from(element).save();
      } finally {
        document.body.removeChild(container);
      }
    }, 2500);
  }

  private generarEstructuraIndividual(o: any): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', logo: '' };
    const dateText = new Date(o.fecha_hora_ocurrencia).toLocaleDateString('es-PE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const timeText = new Date(o.fecha_hora_ocurrencia).toLocaleTimeString('es-PE');

    return `
    <div class="print-content-wrapper" style="width: 210mm; padding: 12mm; box-sizing: border-box; background: white; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; display: flex; flex-direction: column;">
      <div style="display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px;">
        ${org.logo ? `<img src="/storage/${org.logo}" crossorigin="anonymous" style="width: 60px; height: 60px; object-fit: contain; margin-right: 20px;">` : ''}
        <div style="flex: 1; text-align: center;">
          <h1 style="margin: 0; font-size: 14pt; text-transform: uppercase; color: #000;">${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
          <p style="margin: 3px 0 0; font-size: 8.5pt; font-weight: bold;">GERENCIA DE SEGURIDAD CIUDADANA - REPORTE INDIVIDUAL DE OCURRENCIA</p>
        </div>
        <div style="text-align: right; font-size: 7.5pt; font-weight: bold; min-width: 110px;">
          EXPEDIENTE: ${o.codigo_ocurrencia}<br>EMISIÓN: ${new Date().toLocaleDateString('es-PE')}
        </div>
      </div>
      
      <div style="text-align: center; font-size: 11pt; font-weight: bold; margin: 5px 0 15px; border: 1.5px solid #000; padding: 6px; text-transform: uppercase; background: #f4f4f4;">
        PARTE DE OCURRENCIA E INCIDENTE N° ${o.codigo_ocurrencia}
      </div>
      
      <div style="margin-bottom: 15px;">
        <strong style="text-transform: uppercase; font-size: 9pt; border-bottom: 1px solid #000; display: block; margin-bottom: 5px;">1. INFORMACIÓN GENERAL DEL EVENTO</strong>
        <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt;">
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px; width: 25%; font-weight: bold; background: #f9f9f9;">TIPO DE INCIDENTE:</td>
            <td style="border: 1px solid #ccc; padding: 5px; width: 25%;">${(this.tiposIncidente.find(x => x.value === o.tipo)?.label || o.tipo).toUpperCase()}</td>
            <td style="border: 1px solid #ccc; padding: 5px; width: 25%; font-weight: bold; background: #f9f9f9;">PRIORIDAD:</td>
            <td style="border: 1px solid #ccc; padding: 5px; width: 25%; text-transform: uppercase;">${o.prioridad}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px; font-weight: bold; background: #f9f9f9;">FECHA DEL EVENTO:</td>
            <td style="border: 1px solid #ccc; padding: 5px;">${dateText}</td>
            <td style="border: 1px solid #ccc; padding: 5px; font-weight: bold; background: #f9f9f9;">HORA REGISTRADA:</td>
            <td style="border: 1px solid #ccc; padding: 5px;">${timeText}</td>
          </tr>
          <tr>
            <td style="border: 1px solid #ccc; padding: 5px; font-weight: bold; background: #f9f9f9;">ESTADO ACTUAL:</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-transform: uppercase;">${(this.estados.find(x => x.value === o.estado)?.label || o.estado)}</td>
            <td style="border: 1px solid #ccc; padding: 5px; font-weight: bold; background: #f9f9f9;">SECTOR/CUADRANTE:</td>
            <td style="border: 1px solid #ccc; padding: 5px; text-transform: uppercase;">${o.sector?.nombre_sector || 'GENERAL'}</td>
          </tr>
        </table>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-transform: uppercase; font-size: 9pt; border-bottom: 1px solid #000; display: block; margin-bottom: 5px;">2. UBICACIÓN GEOGRÁFICA Y CROQUIS</strong>
        <div style="font-size: 8.5pt; margin-bottom: 5px;"><strong>DIRECCIÓN:</strong> ${o.direccion}</div>
        <div style="width: 100%; height: 280px; border: 1px solid #000; position: relative;">
          <div id="print-map-internal" style="width: 100%; height: 100%;"></div>
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-transform: uppercase; font-size: 9pt; border-bottom: 1px solid #000; display: block; margin-bottom: 5px;">3. DESCRIPCIÓN TÉCNICA DE LOS HECHOS</strong>
        <div style="border: 1px solid #ccc; padding: 10px; font-size: 9pt; min-height: 80px; background: #fff; line-height: 1.4;">
          ${o.descripcion}
        </div>
      </div>

      <div style="margin-bottom: 15px;">
        <strong style="text-transform: uppercase; font-size: 9pt; border-bottom: 1px solid #000; display: block; margin-bottom: 5px;">4. REGISTRO FOTOGRÁFICO DE EVIDENCIAS</strong>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 10px;">
          ${o.evidencias && o.evidencias.length > 0 ? o.evidencias.slice(0, 6).map((ev:any) => `
            <div style="border: 1px solid #ddd; padding: 4px; background: #fff; text-align: center;">
              <img src="${(ev.archivo || ev).startsWith('http') ? ev.archivo || ev : '/storage/' + (ev.archivo || ev)}" 
                   crossorigin="anonymous" 
                   style="width: 100%; height: 140px; object-fit: cover;">
            </div>
          `).join('') : '<div style="grid-column: 1 / span 3; text-align: center; font-style: italic; color: #777; padding: 20px; font-size: 8.5pt;">No se registraron evidencias fotográficas para este incidente.</div>'}
        </div>
      </div>

      <div style="margin-top: auto; padding-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 10px;">
        <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 8.5pt; font-weight: bold;">OPERADOR DE CENTRAL</div>
        <div style="text-align: center; border-top: 1px solid #000; padding-top: 5px; font-size: 8.5pt; font-weight: bold;">SUPERVISIÓN DE SEGURIDAD</div>
      </div>
      
      <div style="border-top: 1px solid #000; padding-top: 5px; font-size: 7.5pt; display: flex; justify-content: space-between; font-style: italic;">
        <div>DOCUMENTO GENERADO POR SIGEM v2.0 - CENTRO DE CÓMPUTO SEGURIDAD CIUDADANA</div>
        <div>CONFIDENCIAL - USO INTERNO</div>
      </div>
    </div>
    `;
  }

  private generarHTMLReporteGeneral(data: any[]): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', address: '', phone: '', logo: '' };
    
    return `
    <html>
    <head>
      <title>Reporte General de Ocurrencias</title>
      <style>
        @page { size: A4 landscape; margin: 0; }
        body { margin: 0; padding: 0; background-color: #fff; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; }
        
        .print-container { 
          padding: 15mm 15mm; 
          min-height: 100vh; 
          box-sizing: border-box; 
          display: flex; 
          flex-direction: column;
        }
        
        .header { display: flex; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 12px; margin-bottom: 20px; }
        .logo { width: 75px; height: 75px; object-fit: contain; margin-right: 25px; }
        .header-text { flex: 1; text-align: center; }
        .header-text h1 { margin: 0; font-size: 15pt; text-transform: uppercase; letter-spacing: 1.5px; color: #000; line-height: 1.2; font-weight: bold; }
        .header-text p { margin: 2px 0 0; font-size: 8pt; font-style: italic; color: #333; font-weight: bold; }
        
        .metadata { text-align: right; font-size: 7.5pt; min-width: 140px; font-weight: bold; }
        
        /* Contenido con margen mayor */
        .content-body { margin: 0 15mm; flex: 1; display: flex; flex-direction: column; }
        
        .report-title { 
          text-align: center; 
          font-size: 12pt; 
          font-weight: bold; 
          margin: 15px 0 20px; 
          border: 1px solid #000; 
          padding: 8px; 
          background: #fcfcfc; 
          text-transform: uppercase; 
          letter-spacing: 1px; 
        }
        
        table { width: 100%; border-collapse: collapse; margin-top: 5px; table-layout: fixed; }
        th { 
          background-color: #ededed; 
          font-weight: bold; 
          text-transform: uppercase; 
          font-size: 7.5pt; 
          border: 1px solid #000; 
          padding: 5px 4px; 
        }
        td { 
          border: 1px solid #000; 
          padding: 4px 6px; 
          font-size: 8pt; 
          vertical-align: top; 
          line-height: 1.2; 
          word-wrap: break-word; 
        }
        
        .text-center { text-align: center; }
        .font-bold { font-weight: bold; }
        .tag { border: 0.5px solid #000; padding: 1px 4px; font-size: 6.5pt; font-weight: bold; text-transform: uppercase; display: inline-block; }
        
        .signatures { margin-top: auto; padding-top: 40px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 40px; margin-bottom: 20px; }
        .sig-box { text-align: center; border-top: 1px solid #000; padding-top: 6px; font-size: 8.5pt; font-weight: bold; }
        
        .footer { 
          border-top: 0.5px solid #000; 
          padding-top: 8px; 
          font-size: 7.5pt; 
          display: flex; 
          justify-content: space-between; 
          color: #555; 
          font-style: italic; 
        }
        
        @media print { 
          body { -webkit-print-color-adjust: exact; } 
          .print-container { padding: 10mm 15mm; }
        }
      </style>
    </head>
    <body onload="window.print()">
      <div class="print-container">
        <div class="header">
          ${org.logo ? `<img src="http://localhost:8000/storage/${org.logo}" class="logo">` : ''}
          <div class="header-text">
            <h1>${org.name.toUpperCase() || 'Notaria DE POCOLLAY'}</h1>
            <p>GERENCIA DE SEGURIDAD CIUDADANA Y SERENAZGO - REGISTRO DE CONTROL OPERATIVO</p>
          </div>
          <div class="metadata">
            FECHA: ${new Date().toLocaleDateString('es-PE')}<br>
            HORA: ${new Date().toLocaleTimeString('es-PE')}
          </div>
        </div>
        
        <div class="content-body">
          <div class="report-title">RELACIÓN CONSOLIDADA DE OCURRENCIAS E INCIDENTES REGISTRADOS</div>
          
          <table>
            <thead>
              <tr>
                <th style="width: 7%">CDG.</th>
                <th style="width: 13%">FECHA/HORA</th>
                <th style="width: 14%">TIPO INCIDENTE</th>
                <th style="width: 18%">UBICACIÓN / SECTOR</th>
                <th>DESCRIPCION DE LOS HECHOS</th>
                <th style="width: 10%" class="text-center">PRIORIDAD</th>
                <th style="width: 14%">PERSONAL</th>
              </tr>
            </thead>
            <tbody>
              ${data.map((o: any) => `
                <tr>
                  <td class="text-center font-bold">${o.codigo_ocurrencia}</td>
                  <td class="text-center">${new Date(o.fecha_hora_ocurrencia).toLocaleString('es-PE')}</td>
                  <td class="text-center">${(this.tiposIncidente.find((x: any) => x.value === o.tipo)?.label || o.tipo).toUpperCase()}</td>
                  <td><span class="font-bold">${o.direccion}</span><br><small>${o.sector?.nombre_sector || ''}</small></td>
                  <td style="font-size: 7.8pt;">${o.descripcion}</td>
                  <td class="text-center"><span class="tag">${o.prioridad.toUpperCase()}</span></td>
                  <td style="font-size: 7.5pt;">${o.personal_atendio ? `${o.personal_atendio.nombres} ${o.personal_atendio.apellidos}` : 'POR ASIGNAR'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="sig-box">RESPONSABLE DE OPERACIONES</div>
            <div class="sig-box">CONTROL DE SERENAZGO</div>
            <div class="sig-box">GERENCIA DE SEGURIDAD</div>
          </div>
        </div>
        
        <div class="footer">
          <div>SIGEM v2.0 - SISTEMA INTEGRAL DE SEGURIDAD CIUDADANA</div>
          <div>DOCUMENTO OFICIAL E INSTITUCIONAL - Notaria DE POCOLLAY</div>
        </div>
      </div>
    </body>
    </html>
    `;
  }

}
