import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivoService } from '../services/activo.service';
import { Categoria, Activo } from '../models/activo.model';
import { OrganizationalUnitService, OrganizationalUnit } from '../../../services/organizational-unit.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CrudActionsComponent } from '../../../shared/components';
import { ToastService } from '../../../services/toast.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import * as QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';
import * as XLSX from 'xlsx';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

declare var $: any;

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, CrudActionsComponent],
  templateUrl: './inventario.component.html',
  styleUrls: ['./inventario.component.scss']
})
export class InventarioComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  Math = Math;

  isFiltersCollapsed = false;

  inventarios: any[] = [];
  nuevoInventario: any = {};
  inventarioSeleccionado: any = null;
  detalleInventario: any = null;
  conciliacion: any = null;
  modoEdicion = false;

  // Escaneo QR
  codigoQR = '';
  escaneando = false;
  ultimoEscaneo: any = null;

  // Generación de etiquetas
  activosSeleccionados: number[] = [];
  activos: Activo[] = [];
  activosFiltrados: Activo[] = [];
  tipoEtiqueta: 'qr' | 'barcode' = 'qr';

  categorias: Categoria[] = [];
  unidadesOrganicas: OrganizationalUnit[] = [];
  usuarios: any[] = [];
  colaboradoresSeleccionados: number[] = [];
  /** Usuario seleccionado en el combo "Agregar" (solo para la UI) */
  usuarioParaAgregar: number | null = null;

  filtroEtiquetas = {
    categoria_id: '',
    unidad_organica_id: '',
    search: ''
  };

  constructor(
    private activoService: ActivoService,
    private organizationalUnitService: OrganizationalUnitService,
    private toast: ToastService,
    private modalService: NgbModal,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  /** Configuración CRUD del subsistema activos-fijos (tema verde) */
  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('activos-fijos');
    this.loadInventarios();
    this.loadActivos();
    this.loadCategorias();
    this.loadUnidadesOrganicas();
    this.loadUsuarios();
  }

  loadUsuarios(): void {
    this.activoService.listarUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.usuarios = response.data;
          }
        }
      });
  }

  getExportData(): Record<string, unknown>[] {
    return this.inventarios.map(inv => ({
      codigo: inv.codigo,
      nombre: inv.nombre,
      fecha_inicio: this.formatDate(inv.fecha_inicio),
      fecha_fin: this.formatDate(inv.fecha_fin),
      avance: this.calcularPorcentaje(inv) + '%',
      estado: this.formatEstado(inv.estado),
      responsable: inv.responsable?.name || '-'
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo', label: 'Código' },
      { key: 'nombre', label: 'Nombre' },
      { key: 'fecha_inicio', label: 'Fecha Inicio' },
      { key: 'fecha_fin', label: 'Fecha Fin' },
      { key: 'avance', label: 'Avance' },
      { key: 'estado', label: 'Estado' },
      { key: 'responsable', label: 'Responsable' }
    ];
  }

  getExportTitle(): string { return 'Inventarios Físicos de Activos'; }
  getExportFilename(): string { return 'inventarios-activos'; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadInventarios(): void {
    this.activoService.listarInventarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.inventarios = response.data.data || [];
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  loadActivos(): void {
    this.activoService.listarActivos({ per_page: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.activos = response.data.data || [];
            this.activosFiltrados = [...this.activos];
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  loadCategorias(): void {
    this.activoService.listarCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.categorias = response.data;
          }
        }
      });
  }

  loadUnidadesOrganicas(): void {
    this.organizationalUnitService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.unidadesOrganicas = response.data;
          }
        }
      });
  }

  aplicarFiltrosEtiquetas(): void {
    this.activosFiltrados = this.activos.filter(a => {
      let match = true;
      if (this.filtroEtiquetas.categoria_id) {
        match = match && a.categoria_id?.toString() === this.filtroEtiquetas.categoria_id;
      }
      if (this.filtroEtiquetas.unidad_organica_id) {
        match = match && a.unidad_organica_id?.toString() === this.filtroEtiquetas.unidad_organica_id;
      }
      if (this.filtroEtiquetas.search) {
        const search = this.filtroEtiquetas.search.toLowerCase();
        match = match && !!(
          a.codigo_patrimonial?.toLowerCase().includes(search) ||
          a.descripcion?.toLowerCase().includes(search)
        );
      }
      return match;
    });

    // Limpiar seleccionados que ya no estan visibles
    this.activosSeleccionados = this.activosSeleccionados.filter(id =>
      this.activosFiltrados.some(a => a.id === id)
    );
  }

  // ==================== CREAR / EDITAR INVENTARIO ====================
  abrirModalNuevo(): void {
    this.modoEdicion = false;
    this.colaboradoresSeleccionados = [];
    this.usuarioParaAgregar = null;
    this.nuevoInventario = {
      nombre: '',
      descripcion: '',
      fecha_inicio: new Date().toISOString().split('T')[0],
      fecha_fin: ''
    };
    $('#modalNuevoInventario').modal('show');
    setTimeout(() => this.initSelect2InModal('modalNuevoInventario'), 350);
  }

  abrirModalEditar(inv: any): void {
    this.modoEdicion = true;
    this.colaboradoresSeleccionados = inv.colaboradores ? inv.colaboradores.map((c: any) => c.id) : [];
    this.usuarioParaAgregar = null;
    this.nuevoInventario = {
      ...inv,
      // formatear la fecha a YYYY-MM-DD para el input type="date"
      fecha_inicio: inv.fecha_inicio ? new Date(inv.fecha_inicio).toISOString().split('T')[0] : ''
    };
    $('#modalNuevoInventario').modal('show');
    setTimeout(() => this.initSelect2InModal('modalNuevoInventario'), 350);
  }

  /** Lista de usuarios ya agregados como colaboradores (para la tabla) */
  get colaboradoresEnTabla(): any[] {
    return this.usuarios.filter(u => this.colaboradoresSeleccionados.includes(u.id));
  }

  /** Usuarios que aún no están en la lista (para el combo Agregar) */
  get usuariosNoAgregados(): any[] {
    return this.usuarios.filter(u => !this.colaboradoresSeleccionados.includes(u.id));
  }

  agregarColaborador(): void {
    if (this.usuarioParaAgregar != null && !this.colaboradoresSeleccionados.includes(this.usuarioParaAgregar)) {
      this.colaboradoresSeleccionados = [...this.colaboradoresSeleccionados, this.usuarioParaAgregar];
      this.usuarioParaAgregar = null;
    }
  }

  quitarColaborador(userId: number): void {
    this.colaboradoresSeleccionados = this.colaboradoresSeleccionados.filter(id => id !== userId);
  }

  /** Inicializa Select2 del patrón de diseño en los combos del modal indicado. */
  initSelect2InModal(modalId: string): void {
    const $modal = $('#' + modalId);
    const $selects = $modal.find('.ds-select2');
    if ($selects.length === 0) return;
    try {
      $selects.each((_index: number, el: HTMLElement) => {
        if ($(el).data('select2')) $(el).select2('destroy');
      });
    } catch (e) { /* ignore */ }
    const opts = this.dsService.getSelect2Options({
      dropdownParent: $modal,
      allowClear: true,
      minimumResultsForSearch: 0
    });
    $selects.select2(opts).on('change', (e: any) => {
      const name = $(e.target).attr('name');
      const val = $(e.target).val();
      if (name === 'usuarioParaAgregar') {
        this.usuarioParaAgregar = val === '' || val === null ? null : Number(val);
      } else if (name && this.filtroEtiquetas && (name === 'categoria_id' || name === 'unidad_organica_id')) {
        (this.filtroEtiquetas as any)[name] = val === '' ? '' : val;
        this.aplicarFiltrosEtiquetas();
      }
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('activos-fijos');
    setTimeout(() => {
      $selects.each((_index: number, el: HTMLElement) => {
        $(el).next('.select2-container').find('.select2-selection').addClass(sizeClass);
      });
    }, 0);
  }



  guardarInventario(): void {
    if (!this.nuevoInventario.nombre || !this.nuevoInventario.fecha_inicio) {
      this.mostrarAlertaAdvertencia('Por favor complete los campos requeridos');
      return;
    }

    const payload = {
      ...this.nuevoInventario,
      colaboradores_ids: this.colaboradoresSeleccionados
    };

    if (this.modoEdicion) {
      this.activoService.actualizarInventario(this.nuevoInventario.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalNuevoInventario').modal('hide');
              this.loadInventarios();
              this.mostrarAlertaExito('Inventario actualizado exitosamente');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.mostrarAlertaError('Error al actualizar inventario: ' + (error.error?.message || 'Error desconocido'));
          }
        });
    } else {
      this.activoService.crearInventario(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalNuevoInventario').modal('hide');
              this.loadInventarios();
              this.mostrarAlertaExito('Inventario creado exitosamente');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.mostrarAlertaError('Error al crear inventario: ' + (error.error?.message || 'Error desconocido'));
          }
        });
    }
  }

  // ==================== VER DETALLE ====================
  verDetalle(id: number): void {
    this.activoService.obtenerInventario(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.detalleInventario = response.data;
            $('#modalDetalle').modal('show');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error('Error al cargar detalle', 'Error');
        }
      });
  }

  verConciliacionDesdeDetalle(id: number): void {
    $('#modalDetalle').modal('hide');
    this.verConciliacion(id);
  }

  escanearDesdeDetalle(id: number): void {
    $('#modalDetalle').modal('hide');
    this.abrirModalEscanear(id);
  }

  // ==================== ESCANEAR ACTIVOS ====================
  abrirModalEscanear(id: number): void {
    const inv = this.inventarios.find(i => i.id === id);
    if (inv && inv.estado === 'en_proceso') {
      this.inventarioSeleccionado = inv;
      this.codigoQR = '';
      this.ultimoEscaneo = null;
      $('#modalEscanear').modal('show');
    } else {
      this.toast.warning('Solo se pueden escanear inventarios en proceso', 'Advertencia');
    }
  }

  escanearCodigo(): void {
    if (!this.codigoQR || !this.inventarioSeleccionado) return;

    this.escaneando = true;

    this.activoService.escanearActivo(this.inventarioSeleccionado.id, this.codigoQR)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.ultimoEscaneo = response.data;
            this.codigoQR = '';
            this.loadInventarios(); // Actualizar contadores

            // Feedback visual
            if (this.ultimoEscaneo.encontrado) {
              this.mostrarAlertaExito('✅ Activo encontrado y registrado');
            } else {
              this.mostrarAlertaAdvertencia('⚠️ Código no encontrado en el sistema');
            }
          }
          this.escaneando = false;
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.mostrarAlertaError('❌ Error al escanear');
          this.escaneando = false;
        }
      });
  }

  // ==================== ESCANEAR MASIVAMENTE VIA EXCEL ====================
  triggerExcelUpload(id: number): void {
    const inv = this.inventarios.find(i => i.id === id);
    if (!inv || inv.estado !== 'en_proceso') return;

    this.inventarioSeleccionado = inv;
    const fileInput = document.getElementById('directExcelUpload') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileExcelSelected(event: any): void {
    const target: DataTransfer = <DataTransfer>(event.target);
    if (target.files.length !== 1) {
      this.toast.warning('Cargar solo un archivo a la vez.', 'Advertencia');
      return;
    }

    this.escaneando = true;

    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const bstr: string = e.target.result;
        const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });

        const wsname: string = wb.SheetNames[0];
        const ws: XLSX.WorkSheet = wb.Sheets[wsname];

        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        // Asumimos que la columna A tiene los códigos
        const codigos: string[] = data
          .filter((row: any) => row && row[0])
          .map((row: any) => String(row[0]).trim())
          // ignorar cabeceras, para ser seguros que no matchee
          .filter((code: string) => code.toLowerCase() !== 'codigo' && code.toLowerCase() !== 'codigo patrimonial');

        if (codigos.length > 0) {
          this.sincronizarMasivoModo(codigos, 'excel');
        } else {
          this.mostrarAlertaAdvertencia('El excel no parece contener códigos en la primera columna.');
          this.escaneando = false;
        }

        // Reset input file (necesita estar asociado en el HTML por id `excelUpload`)
        const fileInput = document.getElementById('excelUpload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';

      } catch (err) {
        console.error('Error parseando XLSX', err);
        this.mostrarAlertaError('Archivo de excel corrupto o formato equivocado.');
        this.escaneando = false;
      }
    };
    reader.readAsBinaryString(target.files[0]);
  }

  sincronizarMasivoModo(codigos: string[], origen: string): void {
    if (!this.inventarioSeleccionado) return;

    this.activoService.sincronizarInventarioMasivo(this.inventarioSeleccionado.id, codigos, origen)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            const data = response.data;
            this.mostrarAlertaExito(`Sincronizado vía ${origen}. Procesados: ${data.procesados}, Nuevos: ${data.nuevos}, Omitidos (ya validados): ${data.ya_escaneados}, No encontrados: ${data.no_encontrados}`);

            this.loadInventarios(); // Actualizar listado padre

            // Si el modal de detalle es el que está abierto, actualizarlo también
            if (this.detalleInventario && this.detalleInventario.id === this.inventarioSeleccionado.id) {
              this.verDetalle(this.inventarioSeleccionado.id);
            }
          }
          this.escaneando = false;
        },
        error: (err: any) => {
          console.error(err);
          this.mostrarAlertaError(`Error al sincronizar vía ${origen}`);
          this.escaneando = false;
        }
      });
  }

  // ==================== CERRAR INVENTARIO ====================
  cerrarInventario(id: number): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'activos-fijos';
    ref.componentInstance.title = 'Cerrar inventario';
    ref.componentInstance.message = '¿Está seguro de cerrar este inventario?';
    ref.componentInstance.detail = 'Esta acción calculará los faltantes y sobrantes y no se puede deshacer.';
    ref.componentInstance.type = 'warning';
    ref.componentInstance.confirmText = 'Sí, cerrar';
    ref.componentInstance.confirmIcon = 'fas fa-lock';
    ref.componentInstance.confirmClass = 'btn-warning';

    ref.result.then(
      () => {
        this.activoService.cerrarInventario(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.loadInventarios();
                this.toast.success('Inventario cerrado exitosamente. Faltantes: ' + response.data.total_faltantes + ', Sobrantes: ' + response.data.total_sobrantes, 'Éxito');
              }
            },
            error: (error: any) => {
              console.error('Error:', error);
              this.toast.error('Error al cerrar inventario', 'Error');
            }
          });
      },
      () => { }
    );
  }

  // ==================== CONCILIACIÓN ====================
  verConciliacion(id: number): void {
    this.activoService.obtenerConciliacion(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.conciliacion = response.data;
            $('#modalConciliacion').modal('show');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error('Error al obtener conciliación', 'Error');
        }
      });
  }

  // ==================== GENERAR ETIQUETAS ====================
  abrirModalEtiquetas(): void {
    this.activosSeleccionados = [];
    $('#modalGenerarEtiquetas').modal('show');
    setTimeout(() => this.initSelect2InModal('modalGenerarEtiquetas'), 350);
  }

  toggleActivoSeleccionado(id: number): void {
    const index = this.activosSeleccionados.indexOf(id);
    if (index > -1) {
      this.activosSeleccionados.splice(index, 1);
    } else {
      this.activosSeleccionados.push(id);
    }
  }

  seleccionarTodos(): void {
    this.activosSeleccionados = this.activosFiltrados.map(a => a.id);
  }

  deseleccionarTodos(): void {
    this.activosSeleccionados = [];
  }

  async generarEtiquetas(): Promise<void> {
    if (this.activosSeleccionados.length === 0) {
      this.toast.warning('Seleccione al menos un activo', 'Advertencia');
      return;
    }

    try {
      // Crear documento PDF
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      // Dimensiones de la etiqueta (5x5 cm = 141.73 x 141.73 puntos)
      const width = 141.73;
      const height = 141.73;

      for (const id of this.activosSeleccionados) {
        const activo = this.activosFiltrados.find(a => a.id === id);
        if (!activo) continue;

        const page = pdfDoc.addPage([width, height]);

        // Marco de la etiqueta
        page.drawRectangle({
          x: 2, y: 2,
          width: width - 4,
          height: height - 4,
          borderColor: rgb(0.8, 0.8, 0.8),
          borderWidth: 1
        });

        // Título (Entidad/Organización - Espacio para poner nombre más adelante)
        page.drawText('Patrimonio Institucional', {
          x: width / 2 - (fontBold.widthOfTextAtSize('Patrimonio Institucional', 8) / 2),
          y: height - 15,
          size: 8,
          font: fontBold,
          color: rgb(0, 0, 0)
        });

        let currentY = height - 15; // Start drawing images below title

        if (this.tipoEtiqueta === 'qr') {
          // Generar QR en DataURL Base64
          const qrDataUrl = await QRCode.toDataURL(activo.codigo_patrimonial, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 80
          });

          const qrImage = await pdfDoc.embedPng(qrDataUrl);
          const qrDims = qrImage.scale(0.8);

          page.drawImage(qrImage, {
            x: width / 2 - qrDims.width / 2,
            y: currentY - qrDims.height - 5,
            width: qrDims.width,
            height: qrDims.height
          });
          currentY = currentY - qrDims.height - 18;
        } else {
          // Generar Barcode utilizando Canvas temporal
          const canvas = document.createElement('canvas');
          JsBarcode(canvas, activo.codigo_patrimonial, {
            format: "CODE128",
            displayValue: false, // Opcional: no mostrar el texto en el barcode ya que lo dibujamos abajo
            height: 40,
            margin: 1
          });
          const barcodeDataUrl = canvas.toDataURL('image/png');
          const barcodeImage = await pdfDoc.embedPng(barcodeDataUrl);
          const barcodeDims = barcodeImage.scale(0.6);

          page.drawImage(barcodeImage, {
            x: width / 2 - barcodeDims.width / 2,
            y: currentY - barcodeDims.height - 10,
            width: barcodeDims.width,
            height: barcodeDims.height
          });
          currentY = currentY - barcodeDims.height - 25;
        }

        // Código Patrimonial debajo del código
        const codigoFormat = activo.codigo_patrimonial;
        page.drawText(codigoFormat, {
          x: width / 2 - (fontBold.widthOfTextAtSize(codigoFormat, 9) / 2),
          y: currentY,
          size: 9,
          font: fontBold,
          color: rgb(0, 0, 0)
        });

        // Pequeña descripción
        let desc = activo.descripcion || 'Sin descripción';
        // Truncar si es muy largo
        if (desc.length > 28) desc = desc.substring(0, 25) + '...';

        page.drawText(desc, {
          x: width / 2 - (font.widthOfTextAtSize(desc, 5) / 2),
          y: currentY - 8,
          size: 5,
          font: font,
          color: rgb(0.3, 0.3, 0.3)
        });

      }

      // Guardar PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Abrir en nueva pestaña para imprimir
      window.open(url, '_blank');

      $('#modalGenerarEtiquetas').modal('hide');

    } catch (error) {
      console.error('Error generando etiquetas PDF:', error);
      this.toast.error('Ocurrió un error al generar las etiquetas.', 'Error');
    }
  }

  // ==================== HELPERS ====================
  getDetallesEncontrados(inv: any): any[] {
    if (!inv || !inv.detalles || !Array.isArray(inv.detalles)) return [];
    return inv.detalles.filter((d: any) => d.encontrado);
  }

  calcularPorcentaje(inv: any): number {
    if (!inv.total_activos_sistema || inv.total_activos_sistema === 0) return 0;
    return Math.round((inv.total_activos_escaneados / inv.total_activos_sistema) * 100);
  }

  getProgressBarClass(inv: any): string {
    const porcentaje = this.calcularPorcentaje(inv);
    if (porcentaje >= 80) return 'bg-success';
    if (porcentaje >= 50) return 'bg-info';
    if (porcentaje >= 25) return 'bg-warning';
    return 'bg-danger';
  }

  getEstadoBadge(estado: string): string {
    const badges: any = {
      'pendiente': 'badge-warning',
      'en_proceso': 'badge-info',
      'cerrado': 'badge-success',
      'cancelado': 'badge-danger'
    };
    return badges[estado] || 'badge-secondary';
  }

  formatEstado(estado: string): string {
    const estados: any = {
      'pendiente': 'Pendiente',
      'en_proceso': 'En Proceso',
      'cerrado': 'Cerrado',
      'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE');
  }

  mostrarAlertaExito(mensaje: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-success alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${mensaje}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  mostrarAlertaAdvertencia(mensaje: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-warning alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${mensaje}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }

  mostrarAlertaError(mensaje: string): void {
    const alertDiv = document.createElement('div');
    alertDiv.className = 'alert alert-danger alert-dismissible fade show position-fixed';
    alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
    alertDiv.innerHTML = `
      ${mensaje}
      <button type="button" class="close" data-dismiss="alert">
        <span>&times;</span>
      </button>
    `;
    document.body.appendChild(alertDiv);
    setTimeout(() => alertDiv.remove(), 3000);
  }
}
