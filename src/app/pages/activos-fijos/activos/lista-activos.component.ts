import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ActivoService } from '../services/activo.service';
import { Activo, Categoria, Ubicacion } from '../models/activo.model';
import { OrganizationalUnitService, OrganizationalUnit } from '../../../services/organizational-unit.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { CrudActionsComponent } from '../../../shared/components';
import { ToastService } from '../../../services/toast.service';
import JsBarcode from 'jsbarcode';

declare var $: any; // jQuery para modales Bootstrap

@Component({
  selector: 'app-lista-activos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule, SystemLayoutComponent, CrudActionsComponent],
  templateUrl: './lista-activos.component.html',
  styleUrls: ['./lista-activos.component.scss']
})
export class ListaActivosComponent extends CrudListExportBase implements OnInit, OnDestroy {
  Math = Math; // Para usar Math.min en el template


  activos: Activo[] = [];
  categorias: Categoria[] = [];
  ubicaciones: Ubicacion[] = [];
  unidadesOrganicas: OrganizationalUnit[] = [];
  responsables: any[] = [];

  loading = false;
  isFiltersCollapsed = false;
  guardando = false;
  eliminando = false;

  modoEdicion = false;
  activoSeleccionado: Activo | null = null;
  tabActivo: string = 'general';

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    categoria_id: '',
    ubicacion_id: '',
    unidad_organica_id: '',
    estado: '',
    condicion: '',
    per_page: 0, // Se asignará en ngOnInit
    page: 1
  };

  formulario: any = {
    codigo_patrimonial: '',
    codigo_sbn: '',
    categoria_id: '',
    descripcion: '',
    detalle: '',
    marca: '',
    modelo: '',
    serie: '',
    color: '',
    valor_adquisicion: 0,
    tipo_adquisicion: 'compra',
    fecha_adquisicion: '',
    documento_adquisicion: '',
    proveedor: '',
    orden_compra: '',
    ubicacion_id: '',
    responsable_id: '',
    unidad_organica_id: '',
    estado: 'activo',
    condicion: 'bueno',
    depreciable: true,
    observaciones: ''
  };

  // Para manejo de imágenes
  imagenesSeleccionadas: File[] = [];
  imagenesPrevisualizacion: string[] = [];
  imagenesActuales: string[] = [];
  isDragging = false;

  // Para lightbox modal
  imagenSeleccionadaUrl = '';
  imagenActualIndex = -1;
  imagenesGaleria: string[] = [];

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 20
  };

  private destroy$ = new Subject<void>();

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
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadCatalogos();
    this.loadActivos();
    this.setupKeyboardNavigation();
  }

  getExportData(): Record<string, unknown>[] {
    return this.activos.map(a => ({
      codigo_patrimonial: a.codigo_patrimonial,
      codigo_sbn: a.codigo_sbn,
      descripcion: a.descripcion,
      categoria: (a as any).categoria?.nombre,
      ubicacion: (a as any).ubicacion?.nombre,
      unidad_organica: (a as any).unidad_organica?.name,
      responsable: (a as any).responsable?.name,
      valor_neto: a.valor_neto,
      estado: a.estado,
      condicion: a.condicion
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo_patrimonial', label: 'Código Patrimonial' },
      { key: 'codigo_sbn', label: 'Código SBN' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'ubicacion', label: 'Ubicación' },
      { key: 'unidad_organica', label: 'Unidad Orgánica', format: (v) => (v as string) || '-' },
      { key: 'responsable', label: 'Responsable', format: (v) => (v as string) || 'Sin asignar' },
      { key: 'valor_neto', label: 'Valor Neto', format: (v) => v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '' },
      { key: 'estado', label: 'Estado', format: (v) => (v as string) ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '' },
      { key: 'condicion', label: 'Condición', format: (v) => (v as string) ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '' }
    ];
  }

  getExportTitle(): string {
    return 'Catálogo de Activos Fijos';
  }

  getExportFilename(): string {
    return 'activos-fijos';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initDataTable(): void {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[2, 'asc']],
      columnDefs: [
        { targets: 0, width: '50px', orderable: false },
        { targets: 1, width: '80px', orderable: false },
        { targets: -1, orderable: false, searchable: false, width: '180px' }
      ]
    };
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) { }
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }

  loadCatalogos(): void {
    this.activoService.listarCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            this.categorias = response.data;
          }
        }
      });

    this.activoService.listarUbicaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success) {
            this.ubicaciones = response.data;
          }
        }
      });

    this.organizationalUnitService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            this.unidadesOrganicas = response.data;
          }
        }
      });

    this.activoService.listarUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            this.responsables = response.data;
          }
        }
      });
  }

  loadActivos(): void {
    this.loading = true;

    this.activoService.listarActivos(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.success && response.data) {
            this.activos = response.data.data || [];
            this.paginacion = {
              currentPage: response.data.current_page || 1,
              lastPage: response.data.last_page || 1,
              total: response.data.total || 0,
              perPage: +(response.data.per_page || this.filtros.per_page || 20)
            };
            this.triggerDataTable();
          } else {
            this.activos = [];
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading activos:', error);
          this.activos = [];
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.paginacion.perPage = +this.filtros.per_page;
    this.loadActivos();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.loadActivos();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      categoria_id: '',
      ubicacion_id: '',
      unidad_organica_id: '',
      estado: '',
      condicion: '',
      per_page: this.cv.defaultPageSize || 20,
      page: 1
    };
    this.loadActivos();
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;

    if (last <= 7) {
      // Si hay 7 o menos páginas, mostrar todas
      for (let i = 1; i <= last; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con elipsis
      if (current <= 3) {
        // Inicio: 1 2 3 4 ... last
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); // -1 representa "..."
        pages.push(last);
      } else if (current >= last - 2) {
        // Fin: 1 ... last-3 last-2 last-1 last
        pages.push(1);
        pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        // Medio: 1 ... current-1 current current+1 ... last
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

  abrirModalCrear(): void {
    this.modoEdicion = false;
    this.activoSeleccionado = null;
    this.resetFormulario();
    this.tabActivo = 'general';
    $('#modalActivoForm').modal('show');
    // La inicialización se hará en el evento shown.bs.modal definido en ngOnInit o aquí mismo
    this.initSelect2Locations();
  }

  abrirModalEditar(activo: Activo): void {
    this.modoEdicion = true;
    this.activoSeleccionado = activo;
    this.llenarFormulario(activo);
    this.tabActivo = 'general';
    $('#modalActivoForm').modal('show');
    this.initSelect2Locations();
  }

  verDetalle(activo: Activo): void {
    this.activoSeleccionado = null;
    this.activoService.obtenerActivo(activo.id!).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activoSeleccionado = response.data;
          $('#modalDetalleActivo').modal('show');
          setTimeout(() => this.renderBarcode('barcodeCanvasDetalle'), 150);
        }
      },
      error: () => { }
    });
  }

  editarDesdeDetalle(): void {
    $('#modalDetalleActivo').modal('hide');
    setTimeout(() => {
      if (this.activoSeleccionado) {
        this.abrirModalEditar(this.activoSeleccionado);
      }
    }, 300);
  }

  confirmarEliminar(activo: Activo): void {
    this.activoSeleccionado = activo;
    $('#modalEliminarActivo').modal('show');
  }

  generarQR(activo: Activo): void {
    this.activoSeleccionado = null;
    this.activoService.obtenerActivo(activo.id!).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.activoSeleccionado = response.data;
          $('#modalQRCode').modal('show');
          setTimeout(() => this.renderBarcode('barcodeCanvasQR'), 100);
        }
      },
      error: () => { }
    });
  }

  cerrarModal(): void {
    $('#modalActivoForm').modal('hide');
  }

  // ==================== FORMULARIO ====================

  resetFormulario(): void {
    this.formulario = {
      codigo_patrimonial: '',
      codigo_sbn: '',
      categoria_id: '',
      descripcion: '',
      detalle: '',
      marca: '',
      modelo: '',
      serie: '',
      color: '',
      valor_adquisicion: 0,
      tipo_adquisicion: 'compra',
      fecha_adquisicion: '',
      documento_adquisicion: '',
      proveedor: '',
      orden_compra: '',
      ubicacion_id: '',
      responsable_id: '',
      unidad_organica_id: '',
      estado: 'activo',
      condicion: 'bueno',
      depreciable: true,
      observaciones: ''
    };
    this.imagenesSeleccionadas = [];
    this.imagenesPrevisualizacion = [];
    this.imagenesActuales = [];
  }

  llenarFormulario(activo: Activo): void {
    this.formulario = {
      codigo_patrimonial: activo.codigo_patrimonial,
      codigo_sbn: activo.codigo_sbn,
      categoria_id: activo.categoria_id,
      descripcion: activo.descripcion,
      detalle: activo.detalle,
      marca: activo.marca,
      modelo: activo.modelo,
      serie: activo.serie,
      color: activo.color,
      valor_adquisicion: activo.valor_adquisicion,
      tipo_adquisicion: activo.tipo_adquisicion,
      fecha_adquisicion: activo.fecha_adquisicion,
      documento_adquisicion: activo.documento_adquisicion,
      proveedor: activo.proveedor,
      orden_compra: activo.orden_compra,
      ubicacion_id: activo.ubicacion_id,
      responsable_id: activo.responsable_id,
      unidad_organica_id: activo.unidad_organica_id ?? '',
      estado: activo.estado,
      condicion: activo.condicion,
      depreciable: activo.depreciable,
      observaciones: activo.observaciones
    };
    this.imagenesActuales = activo.imagenes || [];
    this.imagenesSeleccionadas = [];
    this.imagenesPrevisualizacion = [];

    // Destruir Select2 en el modal para evitar duplicados
    try {
      $('#modalActivoForm').find('.ds-select2').each((_index: number, el: HTMLElement) => {
        if ($(el).data('select2')) $(el).select2('destroy');
      });
    } catch (e) {}
  }

  initSelect2Locations(): void {
    setTimeout(() => {
      const $modal = $('#modalActivoForm');
      const $selects = $modal.find('.ds-select2');

      if ($selects.length === 0) return;

      try {
        $selects.each((_index: number, element: HTMLElement) => {
          if ($(element).data('select2')) {
            $(element).select2('destroy');
          }
        });
      } catch (e) {
        console.error('Error al destruir Select2:', e);
      }

      const opts = this.dsService.getSelect2Options({
        dropdownParent: $modal,
        allowClear: true,
        minimumResultsForSearch: 0
      });

      $selects.select2(opts).on('change', (e: any) => {
        const field = $(e.target).attr('name');
        const value = $(e.target).val();
        if (field && this.formulario.hasOwnProperty(field)) {
          this.formulario[field] = value;
        }
      });

      const sizeClass = this.dsService.getSelect2InputSizeClass('activos-fijos');
      setTimeout(() => {
        $selects.each((_index: number, el: HTMLElement) => {
          $(el).next('.select2-container').find('.select2-selection').addClass(sizeClass);
        });
      }, 0);

      $('#ubicacion_id_select').val(this.formulario.ubicacion_id).trigger('change.select2');
      $('#unidad_organica_id_select').val(this.formulario.unidad_organica_id).trigger('change.select2');
      $('#responsable_id_select').val(this.formulario.responsable_id).trigger('change.select2');
    }, 500);
  }

  guardarActivo(): void {
    this.guardando = true;

    // Convertir valores numéricos
    const datos = {
      ...this.formulario,
      categoria_id: Number(this.formulario.categoria_id),
      ubicacion_id: Number(this.formulario.ubicacion_id),
      valor_adquisicion: Number(this.formulario.valor_adquisicion),
      responsable_id: this.formulario.responsable_id ? Number(this.formulario.responsable_id) : null,
      unidad_organica_id: this.formulario.unidad_organica_id ? Number(this.formulario.unidad_organica_id) : null
    };

    const request$ = this.modoEdicion
      ? this.activoService.actualizarActivo(this.activoSeleccionado!.id, datos)
      : this.activoService.crearActivo(datos);

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const activoId = this.modoEdicion ? this.activoSeleccionado!.id : response.data.id;

            // Si hay imágenes seleccionadas, subirlas
            if (this.imagenesSeleccionadas.length > 0) {
              this.activoService.subirImagenes(activoId, this.imagenesSeleccionadas)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (imgResponse) => {
                    if (imgResponse.success) {
                      this.mostrarMensaje(
                        'success',
                        `${this.modoEdicion ? 'Activo actualizado' : 'Activo creado'} con ${imgResponse.data.imagenes.length} imagen(es)`
                      );
                    }
                    this.cerrarModal();
                    this.loadActivos();
                    this.guardando = false;
                  },
                  error: (error) => {
                    console.error('Error al subir imágenes:', error);
                    this.mostrarMensaje('warning', 'Activo guardado pero error al subir imágenes');
                    this.cerrarModal();
                    this.loadActivos();
                    this.guardando = false;
                  }
                });
            } else {
              this.mostrarMensaje(
                'success',
                this.modoEdicion ? 'Activo actualizado correctamente' : 'Activo creado correctamente'
              );
              this.cerrarModal();
              this.loadActivos();
              this.guardando = false;
            }
          }
        },
        error: (error) => {
          console.error('Error al guardar activo:', error);
          this.mostrarMensaje('error', 'Error al guardar el activo: ' + (error.error?.message || error.message));
          this.guardando = false;
        }
      });
  }

  eliminarActivo(): void {
    if (!this.activoSeleccionado) return;

    this.eliminando = true;

    this.activoService.eliminarActivo(this.activoSeleccionado.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.mostrarMensaje('success', 'Activo eliminado correctamente');
            $('#modalEliminarActivo').modal('hide');
            this.loadActivos();
          }
          this.eliminando = false;
        },
        error: (error) => {
          console.error('Error al eliminar activo:', error);
          this.mostrarMensaje('error', 'Error al eliminar el activo: ' + (error.error?.message || error.message));
          this.eliminando = false;
        }
      });
  }

  // ==================== UTILIDADES ====================

  formatNumber(value: any): string {
    if (!value) return '0.00';
    return Number(value).toLocaleString('es-PE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  /** URL de imagen QR (api.qrserver.com) para el activo. */
  getQRImageUrl(activo: Activo | null): string {
    if (!activo?.codigo_qr) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activo.codigo_qr)}`;
  }

  /** Dibuja el código de barras en el canvas con el id dado. */
  renderBarcode(canvasId: string): void {
    if (!this.activoSeleccionado?.codigo_barras) return;
    const el = document.getElementById(canvasId);
    if (!el) return;
    try {
      JsBarcode(el, this.activoSeleccionado.codigo_barras, { format: 'CODE128', width: 1, height: 36, margin: 4, displayValue: true, fontSize: 12 });
    } catch (e) { }
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: any = {
      'activo': 'badge-success',
      'baja': 'badge-danger',
      'transferido': 'badge-info',
      'extraviado': 'badge-warning'
    };
    return clases[estado] || 'badge-secondary';
  }

  getCondicionBadgeClass(condicion: string): string {
    const clases: any = {
      'bueno': 'badge-success',
      'regular': 'badge-warning',
      'malo': 'badge-danger',
      'obsoleto': 'badge-secondary'
    };
    return clases[condicion] || 'badge-secondary';
  }

  getTipoMovimientoLabel(tipo: string): string {
    const labels: Record<string, string> = {
      'alta': 'Alta',
      'baja': 'Baja',
      'transferencia': 'Transferencia',
      'asignacion': 'Asignación'
    };
    return labels[tipo] || (tipo ? (tipo as string).charAt(0).toUpperCase() + (tipo as string).slice(1) : '-');
  }

  getTipoMovimientoBadgeClass(tipo: string): string {
    const clases: Record<string, string> = {
      'alta': 'badge-success',
      'baja': 'badge-danger',
      'transferencia': 'badge-info',
      'asignacion': 'badge-primary'
    };
    return clases[tipo] || 'badge-secondary';
  }

  mostrarMensaje(tipo: string, mensaje: string): void {
    if (tipo === 'success') {
      this.toast.success(mensaje, 'Éxito');
    } else {
      this.toast.error(mensaje, 'Error');
    }
  }

  // ==================== MANEJO DE IMÁGENES ====================

  onImagenesSeleccionadas(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    this.procesarArchivos(files);
  }

  eliminarImagenSeleccionada(index: number): void {
    this.imagenesSeleccionadas.splice(index, 1);
    this.imagenesPrevisualizacion.splice(index, 1);
  }

  eliminarImagenActual(imagen: string): void {
    if (!this.activoSeleccionado) return;

    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'activos-fijos';
    ref.componentInstance.title = 'Eliminar imagen';
    ref.componentInstance.message = '¿Eliminar esta imagen?';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.activoService.eliminarImagen(this.activoSeleccionado!.id, imagen)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response) => {
              if (response.success) {
                this.imagenesActuales = response.data.imagenes || [];
                this.mostrarMensaje('success', 'Imagen eliminada correctamente');
              }
            },
            error: () => this.mostrarMensaje('error', 'Error al eliminar la imagen')
          });
      },
      () => { }
    );
  }

  subirImagenes(activoId: number): void {
    if (this.imagenesSeleccionadas.length === 0) return;

    this.activoService.subirImagenes(activoId, this.imagenesSeleccionadas)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('Imágenes subidas:', response.data);
            this.imagenesSeleccionadas = [];
            this.imagenesPrevisualizacion = [];
          }
        },
        error: (error) => {
          console.error('Error al subir imágenes:', error);
          this.mostrarMensaje('error', 'Error al subir imágenes');
        }
      });
  }

  verImagenCompleta(imagen: string, galeria: string[] = []): void {
    this.imagenSeleccionadaUrl = imagen;
    this.imagenesGaleria = galeria.length > 0 ? galeria : [imagen];
    this.imagenActualIndex = this.imagenesGaleria.indexOf(imagen);

    if (this.imagenActualIndex === -1) {
      this.imagenActualIndex = 0;
    }

    $('#modalImagenCompleta').modal('show');
  }

  navegarImagen(direccion: number): void {
    const nuevoIndex = this.imagenActualIndex + direccion;

    if (nuevoIndex >= 0 && nuevoIndex < this.imagenesGaleria.length) {
      this.imagenActualIndex = nuevoIndex;
      this.imagenSeleccionadaUrl = this.imagenesGaleria[nuevoIndex];
    }
  }

  seleccionarImagenGaleria(index: number): void {
    if (index >= 0 && index < this.imagenesGaleria.length) {
      this.imagenActualIndex = index;
      this.imagenSeleccionadaUrl = this.imagenesGaleria[index];
    }
  }

  descargarImagen(): void {
    const url = this.getImageUrl(this.imagenSeleccionadaUrl);
    window.open(url, '_blank');
  }

  setupKeyboardNavigation(): void {
    // Navegación con teclado en el modal de imagen
    document.addEventListener('keydown', (event: KeyboardEvent) => {
      // Solo si el modal de imagen está abierto
      if ($('#modalImagenCompleta').hasClass('show')) {
        if (event.key === 'ArrowLeft') {
          this.navegarImagen(-1);
        } else if (event.key === 'ArrowRight') {
          this.navegarImagen(1);
        } else if (event.key === 'Escape') {
          $('#modalImagenCompleta').modal('hide');
        }
      }
    });
  }

  getImageUrl(imagen: string): string {
    // Si es una URL completa (http/https), devolverla tal cual
    if (imagen.startsWith('http://') || imagen.startsWith('https://')) {
      return imagen;
    }
    // Si es una ruta local, agregar el prefijo del servidor
    return 'http://localhost:8000/storage/' + imagen;
  }

  onImageError(event: any): void {
    // Reemplazar con placeholder genérico si la imagen falla
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'https://placehold.co/400x300/cccccc/666666?text=Sin+Imagen';
  }

  // ==================== DRAG & DROP ====================

  triggerFileInput(): void {
    const fileInput = document.getElementById('imagenesInput') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Procesar archivos igual que en onImagenesSeleccionadas
    this.procesarArchivos(files);
  }

  procesarArchivos(files: FileList): void {
    const maxImagenes = 10;
    const imagenesTotal = this.imagenesSeleccionadas.length + this.imagenesActuales.length;

    if (imagenesTotal + files.length > maxImagenes) {
      this.mostrarMensaje('error', `Máximo ${maxImagenes} imágenes permitidas. Ya tienes ${imagenesTotal} imagen(es).`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validar tipo de archivo
      if (!file.type.match(/image\/(jpeg|jpg|png|webp)/)) {
        this.mostrarMensaje('error', `El archivo ${file.name} no es una imagen válida`);
        continue;
      }

      // Validar tamaño (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.mostrarMensaje('error', `La imagen ${file.name} excede los 5MB`);
        continue;
      }

      this.imagenesSeleccionadas.push(file);

      // Generar previsualización
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagenesPrevisualizacion.push(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }
}
