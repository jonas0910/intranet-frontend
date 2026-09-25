import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { TramiteService } from '../services/documento.service';
import { PdfViewerService } from '../../../services/pdf-viewer.service';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { PdfViewerComponent } from './pdf-viewer/pdf-viewer.component';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-bandeja',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule, PdfViewerComponent],
  templateUrl: './bandeja.component.html',
  styleUrl: './bandeja.component.scss'
})
export class BandejaComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  tipoBandeja: string = 'entrada';
  titulosBandeja: any = {
    'entrada': 'Bandeja de Entrada',
    'salida': 'Bandeja de Salida',
    'firmas': 'Documentos para Firmar',
    'borradores': 'Mis Borradores',
    'urgentes': 'Documentos Urgentes',
    'atendidos': 'Documentos Atendidos',
    'archivados': 'Documentos Archivados'
  };

  documentos: any[] = [];
  loading = false;
  
  filtros = {
    tipo: '',
    prioridad: '',
    estado: ''
  };

  paginaActual = 1;
  totalPaginas = 1;

  // Modal de detalle
  showModal = false;
  documentoDetalle: any = null;
  loadingDetalle = false;

  // Modal de firma - Sistema mejorado con PDF.js y pdf-lib
  showModalFirma = false;
  documentoAFirmar: any = null;
  loadingFirma = false;
  pdfUrlParaFirma: string | null = null;
  adjuntosFirma: any[] = [];
  adjuntoSeleccionadoId: number | null = null;
  
  // Gestión de posición de firma
  posicionFirma: { x: number; y: number; page: number } | null = null;
  pdfBytesOriginal: Uint8Array | null = null; // Para aplicar firma
  
  plantillasPosicion = [
    { nombre: 'Esquina Inferior Derecha', x: 75, y: 85, icono: 'fa-arrow-down-right' },
    { nombre: 'Esquina Inferior Izquierda', x: 25, y: 85, icono: 'fa-arrow-down-left' },
    { nombre: 'Centro Inferior', x: 50, y: 85, icono: 'fa-arrow-down' },
    { nombre: 'Centro Derecha', x: 85, y: 50, icono: 'fa-arrow-right' },
    { nombre: 'Centro Izquierda', x: 15, y: 50, icono: 'fa-arrow-left' },
    { nombre: 'Centro', x: 50, y: 50, icono: 'fa-crosshairs' }
  ];

  // DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // Adjuntos
  archivoSeleccionado: File | null = null;

  constructor(
    private documentoService: TramiteService,
    private pdfViewerService: PdfViewerService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.inicializarDataTable();
    
    // Obtener el tipo de bandeja desde la ruta
    this.route.url.subscribe(segments => {
      if (segments.length > 0) {
        this.tipoBandeja = segments[segments.length - 1].path;
      }
      this.cargarDocumentos();
    });
  }

  ngAfterViewInit(): void {
    // Trigger dtOptions después de que la vista esté lista
    setTimeout(() => this.safeDtTriggerNext(), 100);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  inicializarDataTable(): void {
    const self = this;
    
    this.dtOptions = {
      pageLength: 10,
      lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
      order: [[6, 'desc']], // Ordenar por fecha (columna 6)
      searching: true,
      paging: true,
      info: true,
      ordering: true,
      responsive: true,
      language: {
        processing: "Procesando...",
        lengthMenu: "Mostrar _MENU_ documentos",
        zeroRecords: "No se encontraron documentos",
        emptyTable: "No hay documentos en esta bandeja",
        info: "Mostrando _START_ a _END_ de _TOTAL_ documentos",
        infoEmpty: "Mostrando 0 a 0 de 0 documentos",
        infoFiltered: "(filtrado de _MAX_ documentos totales)",
        search: "Buscar:",
        paginate: {
          first: "Primero",
          last: "Último",
          next: "Siguiente",
          previous: "Anterior"
        }
      },
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      columnDefs: [
        { targets: [8], orderable: false, searchable: false } // Columna de acciones no ordenable
      ]
    };
  }

  cargarDocumentos(): void {
    this.loading = true;
    this.documentoService.obtenerBandeja(this.tipoBandeja, this.filtros).subscribe({
      next: (response) => {
        console.log('Respuesta de bandeja:', response);
        if (response.success) {
          // Manejar diferentes estructuras de respuesta
          if (response.data && response.data.data) {
            this.documentos = response.data.data || [];
          } else if (Array.isArray(response.data)) {
            this.documentos = response.data || [];
          } else {
            this.documentos = [];
          }
          
          console.log(`Documentos cargados (${this.tipoBandeja}):`, this.documentos.length);
          
          // Refrescar DataTable si ya está inicializado
          this.refrescarDataTable();
        } else {
          console.warn('Respuesta sin éxito:', response);
          this.documentos = [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando bandeja:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        this.documentos = [];
        this.loading = false;
      }
    });
  }

  refrescarDataTable(): void {
    // Verificar si DataTable está disponible
    if (typeof (window as any).$ !== 'undefined' && (window as any).$.fn.DataTable) {
      setTimeout(() => {
        const table = (window as any).$('#tablaBandeja');
        if (table.length && (window as any).$.fn.DataTable.isDataTable('#tablaBandeja')) {
          table.DataTable().draw();
        }
      }, 100);
    }
  }

  aplicarFiltros(): void {
    this.paginaActual = 1;
    this.cargarDocumentos();
  }

  getEstadoClass(estado: string): string {
    const classes: any = {
      'registrado': 'badge-secondary',
      'en_tramite': 'badge-info',
      'derivado': 'badge-warning',
      'pendiente_firma': 'badge-primary',
      'firmado': 'badge-success',
      'atendido': 'badge-success',
      'archivado': 'badge-dark'
    };
    return classes[estado] || 'badge-secondary';
  }

  getPrioridadClass(prioridad: string): string {
    const classes: any = {
      'baja': 'badge-secondary',
      'normal': 'badge-info',
      'alta': 'badge-warning',
      'urgente': 'badge-danger'
    };
    return classes[prioridad] || 'badge-secondary';
  }

  verDetalle(documento: any): void {
    this.showModal = true;
    this.loadingDetalle = true;
    this.documentoDetalle = null;

    // Cargar el detalle completo del documento
    this.documentoService.obtener(documento.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.documentoDetalle = response.data;
        }
        this.loadingDetalle = false;
      },
      error: (error) => {
        console.error('Error cargando detalle:', error);
        this.loadingDetalle = false;
        // Si hay error, usar los datos básicos del documento
        this.documentoDetalle = {
          documento: documento,
          derivaciones: [],
          adjuntos: [],
          firmas: []
        };
      }
    });
  }

  cerrarModal(): void {
    this.showModal = false;
    this.documentoDetalle = null;
  }

  onArchivoSeleccionado(event: any): void {
    const file: File | null = event.target.files && event.target.files.length > 0
      ? event.target.files[0]
      : null;

    if (!file) {
      this.archivoSeleccionado = null;
      return;
    }

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      event.target.value = '';
      this.archivoSeleccionado = null;
      return;
    }

    this.archivoSeleccionado = file;
  }

  subirAdjunto(): void {
    if (!this.archivoSeleccionado || !this.documentoDetalle?.documento) {
      alert('Seleccione un archivo PDF y asegúrese de tener un documento cargado.');
      return;
    }

    const docId = this.documentoDetalle.documento.id;

    this.loadingDetalle = true;
    this.documentoService.subirAdjunto(docId, this.archivoSeleccionado, true).subscribe({
      next: (response) => {
        if (response.success) {
          alert('✅ PDF adjuntado correctamente.');
          // Recargar el detalle para ver el nuevo adjunto
          this.verDetalle(this.documentoDetalle.documento);
        } else {
          alert('❌ Error al adjuntar PDF: ' + (response.message || 'Error desconocido'));
        }
        this.loadingDetalle = false;
        this.archivoSeleccionado = null;
      },
      error: (error) => {
        console.error('Error al subir adjunto:', error);
        alert('❌ Error al subir adjunto: ' + (error.error?.message || 'Error de conexión'));
        this.loadingDetalle = false;
        this.archivoSeleccionado = null;
      }
    });
  }

  async firmarDocumento(documento: any): Promise<void> {
    // Abrir modal de firma con el nuevo sistema profesional
    this.documentoAFirmar = documento;
    this.showModalFirma = true;
    this.loadingFirma = true;
    this.posicionFirma = null;
    this.pdfBytesOriginal = null;

    // Cargar detalles del documento para obtener los adjuntos
    this.documentoService.obtener(documento.id).subscribe({
      next: async (response) => {
        if (response.success) {
          const data = response.data;
          this.adjuntosFirma = data.adjuntos || [];

          if (this.adjuntosFirma.length > 0) {
            // Seleccionar adjunto principal o el primero
            const principal = this.adjuntosFirma.find((a: any) => a.es_principal);
            const seleccionado = principal || this.adjuntosFirma[0];
            this.adjuntoSeleccionadoId = seleccionado.id;

            // URL del PDF para visualización
            this.pdfUrlParaFirma = `${environment.apiUrl}/tramite-demo/adjuntos/${this.adjuntoSeleccionadoId}/preview`;
            
            // Cargar PDF en memoria para firma
            try {
              const { pdfBytes } = await this.pdfViewerService.loadPdfForEditing(this.pdfUrlParaFirma);
              this.pdfBytesOriginal = pdfBytes;
            } catch (err) {
              console.error('Error cargando PDF para firma:', err);
            }
          } else {
            // Sin adjuntos: usar preview general
            this.adjuntoSeleccionadoId = null;
            this.pdfUrlParaFirma = `${environment.apiUrl}/tramite-demo/documentos/${documento.id}/pdf-preview`;
          }
        } else {
          this.pdfUrlParaFirma = null;
        }
        this.loadingFirma = false;
      },
      error: (error) => {
        console.error('Error cargando documento para firma:', error);
        this.pdfUrlParaFirma = null;
        this.loadingFirma = false;
      }
    });
  }

  cerrarModalFirma(): void {
    this.showModalFirma = false;
    this.documentoAFirmar = null;
    this.pdfUrlParaFirma = null;
    this.adjuntosFirma = [];
    this.adjuntoSeleccionadoId = null;
    this.posicionFirma = null;
    this.pdfBytesOriginal = null;
  }

  // Nuevo método: cuando se selecciona posición de firma en el visor PDF
  onPosicionFirmaSeleccionada(posicion: { x: number; y: number; page: number }): void {
    this.posicionFirma = {
      x: posicion.x,
      y: posicion.y,
      page: posicion.page
    };
  }



  async cambiarAdjuntoFirma(): Promise<void> {
    if (!this.adjuntoSeleccionadoId) {
      return;
    }

    // Actualizar URL del PDF
    this.pdfUrlParaFirma = `${environment.apiUrl}/tramite-demo/adjuntos/${this.adjuntoSeleccionadoId}/preview`;
    
    // Resetear posición al cambiar PDF
    this.posicionFirma = null;
    
    // Cargar nuevo PDF en memoria para firma
    try {
      const { pdfBytes } = await this.pdfViewerService.loadPdfForEditing(this.pdfUrlParaFirma);
      this.pdfBytesOriginal = pdfBytes;
    } catch (err) {
      console.error('Error cargando nuevo PDF:', err);
      this.pdfBytesOriginal = null;
    }
  }

  aplicarPlantillaPosicion(plantilla: any): void {
    // Establecer posición usando plantilla
    this.posicionFirma = {
      x: plantilla.x,
      y: plantilla.y,
      page: 1 // Por defecto página 1, el usuario puede cambiarla
    };
  }

  async confirmarFirma(): Promise<void> {
    if (!this.documentoAFirmar) {
      return;
    }

    if (!this.posicionFirma) {
      alert('⚠️ Por favor, posicione la firma haciendo clic en el PDF antes de confirmar.');
      return;
    }

    const mensajeConfirmacion = `¿Está seguro de firmar el documento ${this.documentoAFirmar.numero_expediente}?\n\nPosición de la firma: Página ${this.posicionFirma.page}, X: ${this.posicionFirma.x.toFixed(1)}%, Y: ${this.posicionFirma.y.toFixed(1)}%`;

    if (!confirm(mensajeConfirmacion)) {
      return;
    }

    this.loadingFirma = true;
    
    try {
      // Aplicar firma usando pdf-lib directamente en el navegador
      let pdfFirmado: Uint8Array | null = null;
      
      if (this.pdfBytesOriginal) {
        // Aplicar sello de texto (firma digital)
        pdfFirmado = await this.pdfViewerService.aplicarSelloTexto(
          this.pdfBytesOriginal,
          `Expediente ${this.documentoAFirmar.numero_expediente || this.documentoAFirmar.id}`,
          this.posicionFirma.x,
          this.posicionFirma.y,
          this.posicionFirma.page
        );
      }

      // Preparar datos para enviar al backend
      const datosFirma: any = {
        posicion_x: this.posicionFirma.x,
        posicion_y: this.posicionFirma.y,
        pagina: this.posicionFirma.page,
        modo_firma: 'sello'
      };

      // Si se generó el PDF firmado, convertirlo a base64 y enviarlo
      if (pdfFirmado) {
        datosFirma.pdf_firmado_base64 = this.pdfViewerService.uint8ArrayToBase64(pdfFirmado);
      }

      // Enviar al backend
      this.documentoService.firmarDocumento(this.documentoAFirmar.id, datosFirma).subscribe({
        next: (response) => {
          if (response.success) {
            const mensajePrincipal = `✅ Documento firmado exitosamente.\n\nFirmas restantes: ${response.data.firmas_restantes || 0}\nEstado: ${response.data.documento_estado || 'firmado'}`;
            
            let mensajeFirma = '';
            if (pdfFirmado) {
              mensajeFirma = '\n\n✅ Firma digital aplicada directamente en el navegador usando pdf-lib.';
            } else {
              mensajeFirma = '\n\n⚠️ La firma se guardó en el sistema, pero no se pudo aplicar visualmente.';
            }
            
            alert(mensajePrincipal + mensajeFirma);
            this.cerrarModalFirma();
            this.cargarDocumentos();
          } else {
            alert(`❌ Error al firmar documento: ${response.message || 'Error desconocido'}`);
          }
          this.loadingFirma = false;
        },
        error: (error) => {
          console.error('Error al firmar documento:', error);
          alert(`❌ Error al firmar documento: ${error.error?.message || 'Error de conexión'}`);
          this.loadingFirma = false;
        }
      });
    } catch (error: any) {
      console.error('Error aplicando firma:', error);
      alert(`❌ Error al aplicar firma digital: ${error.message || 'Error desconocido'}`);
      this.loadingFirma = false;
    }
  }
}

