import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../services/toast.service';

declare var $: any;

@Component({
  selector: 'app-requisitorias',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    DataTablesModule, 
    SystemLayoutComponent
  ],
  templateUrl: './requisitorias.component.html',
  styleUrl: './requisitorias.component.scss'
})
export class RequisitoriasComponent extends CrudListExportBase implements OnInit, OnDestroy {
  Math = Math;
  subtitleItems = [
    { label: 'Registro y control de requisitorias', icon: 'fas fa-users' },
  ];

  // Consulta rápida
  consultaTipo: 'vehiculo' | 'persona' = 'vehiculo';
  consultaTermino = '';
  resultadoConsulta: any = null;
  consultaEncontrada = false;
  consultaRealizada = false;
  consultando = false;

  // Tabs
  tabActiva: 'consulta' | 'vehiculos' | 'personas' = 'consulta';

  // Listas
  vehiculos: any[] = [];
  personas: any[] = [];

  // Loading
  loadingVehiculos = false;
  loadingPersonas = false;
  guardando = false;

  // DataTables
  dtOptionsVehiculos: any = {};
  dtTriggerVehiculos: Subject<any> = new Subject<any>();
  @ViewChild('dtVehiculos', { static: false, read: DataTableDirective }) dtElementVehiculos!: DataTableDirective;

  dtOptionsPersonas: any = {};
  dtTriggerPersonas: Subject<any> = new Subject<any>();
  @ViewChild('dtPersonas', { static: false, read: DataTableDirective }) dtElementPersonas!: DataTableDirective;

  // Formularios (Planos)
  formularioVehiculo: any = {};
  formularioPersona: any = {};
  
  seleccionado: any = null;
  modoEdicion = false;

  // Opciones
  motivosVehiculo = ['robo', 'hurto', 'orden_judicial', 'embargo', 'trafico', 'otros'];
  delitosPersona = ['robo', 'hurto', 'estafa', 'violacion', 'homicidio', 'lesiones', 'trafico_drogas', 'extorsion', 'secuestro', 'violencia_familiar', 'otros'];
  nivelesPeligrosidad = ['baja', 'media', 'alta', 'extrema'];
  
  private destroy$ = new Subject<void>();

  orgSettings: any = null;

  constructor(
    private http: HttpClient,
    private cdr: ChangeDetectorRef,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('seguridad-ciudadana');
  }

  ngOnInit(): void {
    this.initDataTables();
    this.cargarVehiculos();
    this.cargarPersonas();
    this.cargarOrganizacion();
  }

  cargarOrganizacion(): void {
    const url = `${environment.apiUrl}/organization/settings`;
    this.http.get<any>(url).subscribe({
      next: (res) => {
        if (res.success) {
          this.orgSettings = Array.isArray(res.data) ? res.data[0] : res.data;
        }
      },
      error: () => console.warn('No se pudo cargar la configuración de la organización para los reportes.')
    });
  }

  onFileSelected(event: any, tipo: 'vehiculo' | 'persona'): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      const targetArr = tipo === 'vehiculo' ? this.formularioVehiculo : this.formularioPersona;
      if (!targetArr.fotos) targetArr.fotos = [];
      
      Array.from(files).forEach((file: any) => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          targetArr.fotos.push(e.target.result);
        };
        reader.readAsDataURL(file);
      });
    }
  }

  quitarFoto(tipo: 'vehiculo' | 'persona', index: number): void {
    const targetArr = tipo === 'vehiculo' ? this.formularioVehiculo : this.formularioPersona;
    if (targetArr.fotos) {
      targetArr.fotos.splice(index, 1);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.dtTriggerVehiculos.closed) this.dtTriggerVehiculos.complete();
    if (!this.dtTriggerPersonas.closed) this.dtTriggerPersonas.complete();
  }

  initDataTables(): void {
    const configBase = {
      paging: true,
      pageLength: 10,
      lengthMenu: [[10, 25, 50, -1], [10, 25, 50, "Todos"]],
      searching: true,
      info: true,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' }
    };

    this.dtOptionsVehiculos = { ...configBase, order: [[0, 'asc']] };
    this.dtOptionsPersonas = { ...configBase, order: [[1, 'asc']] };
  }

  private triggerVehiculos(): void {
    if (this.dtElementVehiculos?.dtInstance) {
      this.dtElementVehiculos.dtInstance.then((dt: any) => {
        dt.destroy();
        this.dtTriggerVehiculos.next(null);
      });
    } else {
      setTimeout(() => this.dtTriggerVehiculos.next(null), 100);
    }
  }

  private triggerPersonas(): void {
    if (this.dtElementPersonas?.dtInstance) {
      this.dtElementPersonas.dtInstance.then((dt: any) => {
        dt.destroy();
        this.dtTriggerPersonas.next(null);
      });
    } else {
      setTimeout(() => this.dtTriggerPersonas.next(null), 100);
    }
  }

  consultarRequisitoria(): void {
    if (!this.consultaTermino.trim()) {
      this.toast.warning('Ingrese placa o DNI');
      return;
    }

    this.consultando = true;
    this.resultadoConsulta = null;
    this.consultaRealizada = false;

    const endpoint = this.consultaTipo === 'vehiculo' ? 'vehiculos' : 'personas';
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/${endpoint}`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response.success) {
          const lista: any[] = Array.isArray(response.data) ? response.data : (response.data?.data || []);
          const encontrado = lista.find((item: any) => 
            this.consultaTipo === 'vehiculo' 
              ? item.placa.toUpperCase() === this.consultaTermino.trim().toUpperCase()
              : item.dni === this.consultaTermino.trim()
          );

          this.consultaRealizada = true;
          this.consultaEncontrada = !!encontrado;
          this.resultadoConsulta = encontrado || null;

          if (encontrado) this.toast.error(`¡${this.consultaTipo.toUpperCase()} REQUISITORIADO ENCONTRADO!`, 'ALERTA');
        }
        this.consultando = false;
      },
      error: (error) => {
        console.error('Error:', error);
        this.consultando = false;
        this.toast.error('Error al realizar la consulta');
      }
    });
  }

  cargarVehiculos(): void {
    this.loadingVehiculos = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos`;
    this.http.get<any>(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.vehiculos = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          this.triggerVehiculos();
        }
        this.loadingVehiculos = false;
      },
      error: () => this.loadingVehiculos = false
    });
  }

  cargarPersonas(): void {
    this.loadingPersonas = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/personas`;
    this.http.get<any>(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.personas = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          this.triggerPersonas();
        }
        this.loadingPersonas = false;
      },
      error: () => this.loadingPersonas = false
    });
  }

  cambiarTab(tab: 'consulta' | 'vehiculos' | 'personas'): void {
    this.tabActiva = tab;
    // Forzar el trigger de la tabla al cambiar de tab para asegurar que se renderice
    if (tab === 'vehiculos') {
      setTimeout(() => this.triggerVehiculos(), 50);
    } else if (tab === 'personas') {
      setTimeout(() => this.triggerPersonas(), 50);
    }
  }

  limpiarConsulta(): void {
    this.consultaTermino = '';
    this.resultadoConsulta = null;
    this.consultaRealizada = false;
    this.consultaEncontrada = false;
  }

  // ==================== MODALES ====================

  abrirCreaVehiculo(): void {
    this.modoEdicion = false;
    this.seleccionado = null;
    this.formularioVehiculo = {
      placa: '',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      motivo: 'robo',
      descripcion_motivo: '',
      institucion_solicita: '',
      fecha_requisitoria: new Date().toISOString().split('T')[0],
      estado: 'vigente',
      observaciones: '',
      fotos: []
    };
    $('#modalVehiculo').modal('show');
  }

  abrirEditaVehiculo(vehiculo: any): void {
    this.modoEdicion = true;
    this.seleccionado = vehiculo;
    this.formularioVehiculo = { 
      ...vehiculo,
      fecha_requisitoria: this.formatDate(vehiculo.fecha_requisitoria),
      fotos: vehiculo.fotos || []
    };
    $('#modalVehiculo').modal('show');
  }

  abrirCreaPersona(): void {
    this.modoEdicion = false;
    this.seleccionado = null;
    this.formularioPersona = {
      dni: '',
      nombres: '',
      apellido_paterno: '',
      apellido_materno: '',
      alias: '',
      delito: 'robo',
      descripcion_delito: '',
      institucion_solicita: '',
      fecha_requisitoria: new Date().toISOString().split('T')[0],
      peligrosidad: 'media',
      armado: false,
      estado: 'vigente',
      fotos: []
    };
    $('#modalPersona').modal('show');
  }

  abrirEditaPersona(persona: any): void {
    this.modoEdicion = true;
    this.seleccionado = persona;
    this.formularioPersona = { 
      ...persona,
      fecha_requisitoria: this.formatDate(persona.fecha_requisitoria),
      fotos: persona.fotos || []
    };
    $('#modalPersona').modal('show');
  }

  closeModales(): void {
    $('#modalVehiculo').modal('hide');
    $('#modalPersona').modal('hide');
  }

  guardarVehiculo(): void {
    this.guardando = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos`;
    const req$ = this.modoEdicion 
      ? this.http.put(`${url}/${this.seleccionado.id}`, this.formularioVehiculo)
      : this.http.post(url, this.formularioVehiculo);

    req$.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toast.success('Vehículo guardado correctamente');
          this.closeModales();
          this.cargarVehiculos();
        }
        this.guardando = false;
      },
      error: () => {
        this.toast.error('Error al guardar vehículo');
        this.guardando = false;
      }
    });
  }

  guardarPersona(): void {
    this.guardando = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/personas`;
    const req$ = this.modoEdicion 
      ? this.http.put(`${url}/${this.seleccionado.id}`, this.formularioPersona)
      : this.http.post(url, this.formularioPersona);

    req$.subscribe({
      next: (res: any) => {
        if (res.success) {
          this.toast.success('Persona guardada correctamente');
          this.closeModales();
          this.cargarPersonas();
        }
        this.guardando = false;
      },
      error: () => {
        this.toast.error('Error al guardar persona');
        this.guardando = false;
      }
    });
  }

  eliminarVehiculo(item: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Requisitoria';
    ref.componentInstance.message = `¿Deseas eliminar la requisitoria del vehículo con placa ${item.placa}?`;
    ref.componentInstance.type = 'danger';
    ref.result.then((res) => {
      if (res) {
        this.http.delete(`${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos/${item.id}`).subscribe({
          next: () => {
            this.toast.success('Eliminado correctamente');
            this.cargarVehiculos();
          },
          error: () => this.toast.error('Error al eliminar')
        });
      }
    }, () => {});
  }

  eliminarPersona(item: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Requisitoria';
    ref.componentInstance.message = `¿Deseas eliminar la requisitoria de ${item.nombres} ${item.apellido_paterno}?`;
    ref.componentInstance.type = 'danger';
    ref.result.then((res) => {
      if (res) {
        this.http.delete(`${environment.apiUrl}/seguridad-ciudadana/requisitorias/personas/${item.id}`).subscribe({
          next: () => {
            this.toast.success('Eliminado correctamente');
            this.cargarPersonas();
          },
          error: () => this.toast.error('Error al eliminar')
        });
      }
    }, () => {});
  }

  // ==================== UTILIDADES ====================
  getPeligrosidadClass(p: string): string {
    if (!p) return 'badge-secondary';
    if (p.includes('alta') || p.includes('extrema')) return 'badge-danger';
    if (p.includes('media')) return 'badge-warning';
    return 'badge-info';
  }

  getEstadoClass(e: string): string {
    if (!e) return 'badge-secondary';
    if (e.includes('vigente') || e.includes('activa')) return 'badge-danger';
    if (e.includes('encontrado') || e.includes('capturado') || e.includes('levantada')) return 'badge-success';
    return 'badge-secondary';
  }

  getPeligrosidadLabel(nivel: string): string {
    return nivel ? nivel.charAt(0).toUpperCase() + nivel.slice(1) : '';
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      // Extrae solo la parte YYYY-MM-DD
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) {
        const parts = dateStr.split(' ')[0].split('-');
        if (parts.length === 3) return dateStr.split(' ')[0];
        return dateStr;
      }
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr ? dateStr.split('T')[0] : '';
    }
  }

  // ==================== REPORTES PDF ====================

  imprimirRequisitoriaIndividual(item: any, tipo: 'vehiculo' | 'persona'): void {
    const html = this.generarHTMLRequisitoriaIndividual(item, tipo);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 500);
    }
  }

  imprimirReporteGeneral(tipo: 'vehiculos' | 'personas'): void {
    const items = tipo === 'vehiculos' ? this.vehiculos : this.personas;
    const html = this.generarHTMLReporteGeneral(items, tipo);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      setTimeout(() => {
        win.focus();
        win.print();
        win.close();
      }, 500);
    }
  }

  private generarHTMLRequisitoriaIndividual(item: any, tipo: 'vehiculo' | 'persona'): string {
    const org = this.orgSettings || { name: 'Notaria', address: '', phone: '', logo: '' };
    const titulo = tipo === 'vehiculo' ? 'FICHA DE BÚSQUEDA Y CAPTURA: VEHÍCULO' : 'FICHA DE BÚSQUEDA Y CAPTURA: PERSONA';
    const identifier = tipo === 'vehiculo' ? item.placa : item.dni;
    const mainValue = tipo === 'vehiculo' ? `${item.marca} ${item.modelo}` : `${item.apellido_paterno} ${item.apellido_materno}, ${item.nombres}`;
    const date = this.formatDate(item.fecha_requisitoria);
    const authority = item.institucion_solicita || item.autoridad_emite || 'PODER JUDICIAL';
    const reason = tipo === 'vehiculo' ? (item.descripcion_motivo || item.motivo_requisitoria) : (item.descripcion_delito || item.motivo_requisitoria);
    
    // Multiple photos logic
    const fotos = item.fotos || [];
    const mainFoto = fotos.length > 0 ? fotos[0] : null;
    const secondaryFotos = fotos.length > 1 ? fotos.slice(1) : [];
 
    // Silhouette SVG professional for no-photo
    const placeholderSvg = `
      <svg width="180" height="180" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" opacity="0.1">
        ${tipo === 'persona' 
          ? '<path d="M12 12C14.21 12 16 10.21 16 8C16 5.79 14.21 4 12 4C9.79 4 8 5.79 8 8C8 10.21 9.79 12 12 12ZM12 14C9.33 14 4 15.34 4 18V20H20V18C20 15.34 14.67 14 12 14Z" fill="#333"/>'
          : '<path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5H6.5C5.84 5 5.29 5.42 5.08 6.01L3 12V20C3 20.55 3.45 21 4 21H5C5.55 21 6 20.55 6 20V19H18V20C18 20.55 18.45 21 19 21H20C20.55 21 21 20.55 21 20V12L18.92 6.01ZM6.5 16C5.67 16 5 15.33 5 14.5C5 13.67 5.67 13 6.5 13C7.33 13 8 13.67 8 14.5C8 15.33 7.33 16 6.5 16ZM17.5 16C16.67 16 16 15.33 16 14.5C16 13.67 16.67 13 17.5 13C18.33 13 19 13.67 19 14.5C19 15.33 18.33 16 17.5 16ZM5 11L6.5 6.5H17.5L19 11H5Z" fill="#333"/>'
        }
      </svg>
      <div style="font-size: 8pt; color: #aaa; margin-top: 10px; font-weight: bold; font-family: sans-serif;">SIN FOTOGRAFÍA REGISTRADA</div>
    `;
 
    let galleryHtml = '';
    if (secondaryFotos.length > 0) {
      galleryHtml = '<div class="gallery-title">VISTAS ADICIONALES</div><div class="photo-gallery">';
      secondaryFotos.forEach((f: any) => {
        galleryHtml += `<div class="gallery-item"><img src="${f}"></div>`;
      });
      galleryHtml += '</div>';
    }
 
    return `
    <html>
    <head>
      <title>${identifier}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        body { margin: 0; padding: 0; background-color: #fff; font-family: 'Times New Roman', Times, serif; color: #1a1a1a; }
        
        .print-container { padding: 10mm 15mm; min-height: 100vh; box-sizing: border-box; display: flex; flex-direction: column; }
        
        .header { display: flex; align-items: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
        .logo { width: 65px; height: 65px; object-fit: contain; margin-right: 20px; }
        .header-info { flex: 1; text-align: center; }
        .header-info h1 { margin: 0; font-size: 14pt; text-transform: uppercase; letter-spacing: 2px; }
        .header-info h2 { margin: 3px 0 0; font-size: 8.5pt; font-style: italic; color: #444; font-weight: bold; }
        
        .content-body { margin: 0 10mm; flex: 1; display: flex; flex-direction: column; border: 1.2px solid #000; padding: 12mm 15mm; position: relative; }
        
        .doc-title { text-align: center; border: 1.5px solid #000; padding: 7px; font-weight: bold; font-size: 11pt; margin: 12px 0; text-transform: uppercase; background: #f2f2f2; letter-spacing: 1px; }
        
        .main-layout { display: flex; flex-direction: column; gap: 15px; flex: 1; }
        .top-info { display: flex; gap: 20px; align-items: stretch; }
        
        .photo-main { width: 250px; height: 320px; border: 1.5px solid #000; background: #fafafa; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
        .photo-main img { max-width: 100%; max-height: 100%; object-fit: cover; }
        
        .data-column { flex: 1; display: flex; flex-direction: column; justify-content: space-between; }
        .highlight-box { border-left: 5px solid #000; padding-left: 15px; margin-bottom: 15px; }
        .label { font-size: 7.5pt; font-family: Arial, sans-serif; font-weight: bold; text-transform: uppercase; color: #444; display: block; margin-bottom: 2px; }
        .value-large { font-size: 26pt; font-weight: bold; color: #000; line-height: 1; margin: 2px 0; }
        .value-name { font-size: 15pt; font-weight: bold; color: #000; line-height: 1.1; margin: 4px 0; }
        
        .data-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; border-top: 1px dotted #ccc; padding-top: 10px; }
        .data-item { margin-bottom: 5px; }
        .value-small { font-size: 10pt; font-weight: bold; color: #000; text-transform: uppercase; }
        
        .reason-box { background: #f9f9f9; border: 1.2px solid #000; padding: 10px; margin: 10px 0; }
        .reason-title { font-weight: bold; font-size: 8pt; border-bottom: 1px solid #000; margin-bottom: 6px; padding-bottom: 3px; text-transform: uppercase; }
        .reason-text { font-size: 10.5pt; font-weight: bold; text-align: justify; line-height: 1.3; }
        
        .photo-gallery { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 15px; }
        .gallery-title { font-size: 8pt; font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #ddd; }
        .gallery-item { border: 1px solid #ccc; height: 110px; background: #fcfcfc; display: flex; align-items: center; justify-content: center; padding: 3px; }
        .gallery-item img { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .signatures { margin-top: auto; padding-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 80px; margin-bottom: 15px; }
        .sig-box { text-align: center; border-top: 1.2px solid #000; padding-top: 6px; font-size: 8.5pt; font-weight: bold; }
        
        .watermark { position: absolute; top: 45%; left: 0; right: 0; text-align: center; font-size: 70pt; color: rgba(200,200,200,0.1); transform: rotate(-30deg); pointer-events: none; font-weight: bold; }
        @media print { body { -webkit-print-color-adjust: exact; } .content-body { margin: 0; border: none; padding: 10mm 5mm; } .header { margin-bottom: 10px; } }
      </style>
    </head>
    <body onload="window.print()">
      <div class="print-container">
        <div class="header">
          ${org.logo ? `<img src="/storage/${org.logo}" class="logo">` : ''}
          <div class="header-info">
            <h1>${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
            <h2>GERENCIA DE SEGURIDAD CIUDADANA - CENTRAL DE ALERTAS</h2>
          </div>
        </div>
        <div class="content-body">
          <div class="watermark">USO OFICIAL</div>
          <div class="doc-title">${titulo}</div>
          <div class="main-layout">
            <div class="top-info">
              <div class="photo-main">
                ${mainFoto ? `<img src="${mainFoto}">` : placeholderSvg}
              </div>
              <div class="data-column">
                <div class="highlight-box">
                  <span class="label">${tipo === 'vehiculo' ? 'PLACA DE RODAJE' : 'DOCUMENTO DE IDENTIDAD'}</span>
                  <span class="value-large">${identifier}</span>
                </div>
                <div class="highlight-box">
                  <span class="label">${tipo === 'vehiculo' ? 'DESCRIPCIÓN DEL VEHÍCULO' : 'APELLIDOS Y NOMBRES'}</span>
                  <div class="value-name">${mainValue}</div>
                </div>
                <div class="data-grid">
                  <div class="data-item">
                    <span class="label">${tipo === 'vehiculo' ? 'COLOR' : 'ALIAS'}</span>
                    <span class="value-small">${(tipo === 'vehiculo' ? item.color : item.alias) || '---'}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">ESTADO ACTUAL</span>
                    <span class="value-small">${item.estado.toUpperCase()}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">EMITIDO POR</span>
                    <span class="value-small">${authority.toUpperCase()}</span>
                  </div>
                  <div class="data-item">
                    <span class="label">FECHA REGISTRO</span>
                    <span class="value-small">${this.formatDate(item.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div class="reason-box">
              <div class="reason-title">MOTIVO DE REQUISITORIA / DELITO IMPUTADO</div>
              <div class="reason-text">${reason.toUpperCase()}</div>
            </div>
            ${galleryHtml}
            <div style="margin-top: 10px; flex: 1;">
              <span class="label">OBSERVACIONES ADICIONALES</span>
              <div style="font-size: 9pt; font-style: italic;">${item.observaciones || 'Sin observaciones complementarias.'}</div>
            </div>
          </div>
          <div class="signatures">
            <div class="sig-box">CONTROL DE REQUISITORIAS</div>
            <div class="sig-box">GERENCIA DE SEGURIDAD</div>
          </div>
        </div>
        <div style="margin-top: 10px; font-size: 7pt; text-align: right; color: #888; font-style: italic;">
          SIGEM v2.0 - Generado el ${new Date().toLocaleString('es-PE')} - Notaria DE POCOLLAY
        </div>
      </div>
    </body>
    </html>
    `;
  }

  private generarHTMLReporteGeneral(items: any[], tipo: 'vehiculos' | 'personas'): string {
    const org = this.orgSettings || { name: 'Notaria DE POCOLLAY', address: '', phone: '', logo: '' };
    const titulo = tipo === 'vehiculos' ? 'Relación General de Vehículos con Requisitoria' : 'Relación General de Personas con Requisitoria';
    
    return `
    <html>
    <head>
      <title>${titulo}</title>
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
        
        table { width: 100%; border-collapse: collapse; margin-top: 5px; }
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
          vertical-align: middle; 
          line-height: 1.25; 
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
            <h1>${(org.name || 'Notaria DE POCOLLAY').toUpperCase()}</h1>
            <p>GERENCIA DE SEGURIDAD CIUDADANA Y SERENAZGO - REGISTRO DE REQUISITORIAS</p>
          </div>
          <div class="metadata">
            FECHA: ${new Date().toLocaleDateString('es-PE')}<br>
            HORA: ${new Date().toLocaleTimeString('es-PE')}
          </div>
        </div>
        
        <div class="content-body">
          <div class="report-title">${titulo.toUpperCase()}</div>
          
          <table>
            <thead>
              <tr>
                ${tipo === 'vehiculos' ? `
                  <th style="width: 10%">PLACA</th>
                  <th style="width: 20%">VEHICULO</th>
                  <th style="width: 25%">MOTIVO DE REQUISITORIA</th>
                  <th style="width: 20%">AUTORIDAD SOLICITANTE</th>
                  <th style="width: 12%" class="text-center">FECHA REG.</th>
                  <th style="width: 13%" class="text-center">ESTADO</th>
                ` : `
                  <th style="width: 10%">DNI</th>
                  <th style="width: 25%">APELLIDOS Y NOMBRES</th>
                  <th style="width: 25%">DELITO / MOTIVO</th>
                  <th style="width: 15%">NIVEL</th>
                  <th style="width: 12%" class="text-center">FECHA REG.</th>
                  <th style="width: 13%" class="text-center">ESTADO</th>
                `}
              </tr>
            </thead>
            <tbody>
              ${items.map(item => `
                <tr>
                  ${tipo === 'vehiculos' ? `
                    <td class="text-center font-bold">${item.placa}</td>
                    <td>${item.marca} ${item.modelo}<br><small>${item.color}</small></td>
                    <td style="font-size: 7.8pt;">${item.descripcion_motivo || item.motivo || 'ROBO'}</td>
                    <td style="font-size: 7.8pt;">${item.institucion_solicita || 'PODER JUDICIAL'}</td>
                    <td class="text-center">${this.formatDate(item.fecha_requisitoria)}</td>
                    <td class="text-center"><span class="tag">${item.estado.toUpperCase()}</span></td>
                  ` : `
                    <td class="text-center font-bold">${item.dni}</td>
                    <td><span class="font-bold">${item.apellido_paterno} ${item.apellido_materno}</span>, ${item.nombres}</td>
                    <td style="font-size: 7.8pt;">${item.descripcion_delito || item.delito || 'ORDEN JUDICIAL'}</td>
                    <td class="text-center">${(item.peligrosidad || 'media').toUpperCase()}</td>
                    <td class="text-center">${this.formatDate(item.fecha_requisitoria)}</td>
                    <td class="text-center"><span class="tag">${item.estado.toUpperCase()}</span></td>
                  `}
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="signatures">
            <div class="sig-box">RESPONSABLE DE REGISTRO</div>
            <div class="sig-box">VISO BUENO SUPERVISIÓN</div>
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

  // Override del Base para que no de error aunque no usemos export directo aquí centralizado
  getExportData() { return []; }
  getExportColumns() { return []; }
  getExportTitle() { return 'Reporte de Requisitorias'; }
  getExportFilename() { return 'requisitorias'; }
}
