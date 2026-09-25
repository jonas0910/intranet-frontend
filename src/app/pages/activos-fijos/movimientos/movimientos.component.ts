import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivoService } from '../services/activo.service';
import { Movimiento, TipoMovimiento, Activo, Ubicacion } from '../models/activo.model';
import { OrganizationalUnitService, OrganizationalUnit } from '../../../services/organizational-unit.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemManagementService, OrganizationSetting } from '../../../services/system-management.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../services/toast.service';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

declare var $: any;

@Component({
  selector: 'app-movimientos',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, DataTablesModule],
  templateUrl: './movimientos.component.html',
  styleUrls: ['./movimientos.component.scss']
})
export class MovimientosComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  Math = Math;
  isFiltersCollapsed = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  activeTab: 'movimientos' | 'traslados' = 'traslados';

  movimientos: Movimiento[] = [];
  activos: Activo[] = [];
  ubicaciones: Ubicacion[] = [];
  unidadesOrganicas: OrganizationalUnit[] = [];
  usuarios: any[] = [];
  loading = false;

  // Traslados
  traslados: any[] = [];
  trasladoSeleccionado: any = null;
  nuevoTraslado: any = {};
  activosSeleccionados: number[] = [];
  activosDisponibles: any[] = [];
  /** 'nuevo' = crear traslado; 'editar' = editar cabecera y detalle (pendiente); 'ver' = solo lectura */
  modoTrasladoModal: 'nuevo' | 'editar' | 'ver' = 'editar';
  /** Pestaña activa en el modal de traslado: 'cabecera' | 'detalle' */
  tabTrasladoModal: 'cabecera' | 'detalle' = 'cabecera';

  // Paginación
  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 0, // Se asignará en ngOnInit
    from: 0,
    to: 0
  };

  // Filtros
  filtros = {
    tipo_movimiento: '',
    activo_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    search: '',
    per_page: 0 // Se asignará en ngOnInit
  };

  // Modal data
  movimientoSeleccionado: Partial<Movimiento> = {};
  modoModal: 'crear' | 'editar' | 'ver' = 'crear';

  // Tipos de movimiento
  tiposMovimiento: { value: TipoMovimiento; label: string; icon: string; color: string }[] = [
    { value: 'alta', label: 'Alta', icon: 'fa-arrow-up', color: 'success' },
    { value: 'baja', label: 'Baja', icon: 'fa-arrow-down', color: 'danger' },
    { value: 'transferencia', label: 'Transferencia', icon: 'fa-exchange-alt', color: 'info' },
    { value: 'asignacion', label: 'Asignación', icon: 'fa-user-check', color: 'primary' }
  ];

  constructor(
    private activoService: ActivoService,
    private organizationalUnitService: OrganizationalUnitService,
    private systemService: SystemManagementService,
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
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadMovimientos();
    this.loadActivos();
    this.loadUbicaciones();
    this.loadUnidadesOrganicas();
    this.loadUsuarios();
    this.loadTraslados();
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
        { targets: -1, orderable: false, searchable: false, width: '120px' }
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

  getExportData(): Record<string, unknown>[] {
    return this.movimientos.map(m => ({
      tipo: this.getTipoMovimientoConfig(m.tipo_movimiento).label,
      fecha: this.formatDate(m.fecha_movimiento),
      activo: (m as any).activo?.codigo_patrimonial,
      descripcion: (m as any).activo?.descripcion,
      desde: (m as any).unidad_organica_origen?.name || (m as any).ubicacion_origen?.nombre || '-',
      hacia: (m as any).unidad_organica_destino?.name || (m as any).ubicacion_destino?.nombre || '-',
      motivo: m.motivo || '-'
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'tipo', label: 'Tipo' },
      { key: 'fecha', label: 'Fecha' },
      { key: 'activo', label: 'Código Activo' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'desde', label: 'Desde' },
      { key: 'hacia', label: 'Hacia' },
      { key: 'motivo', label: 'Motivo' }
    ];
  }

  getExportTitle(): string { return 'Movimientos de Activos Fijos'; }
  getExportFilename(): string { return 'movimientos-activos'; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadMovimientos(): void {
    this.loading = true;

    const params = {
      ...this.filtros,
      per_page: +this.filtros.per_page,
      page: this.paginacion.currentPage
    };

    this.activoService.listarMovimientos(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.movimientos = response.data.data || [];
            this.paginacion = {
              currentPage: response.data.current_page || 1,
              lastPage: response.data.last_page || 1,
              total: response.data.total || 0,
              perPage: +(response.data.per_page || this.filtros.per_page || 20),
              from: response.data.from || 0,
              to: response.data.to || 0
            };
            this.triggerDataTable();
          }
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Error loading movimientos:', error);
          this.loading = false;
        }
      });
  }

  loadActivos(): void {
    this.activoService.listarActivos({ per_page: 1000 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.activos = response.data.data || [];
          }
        },
        error: (error: any) => console.error('Error loading activos:', error)
      });
  }

  loadUbicaciones(): void {
    this.activoService.listarUbicaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.ubicaciones = response.data;
          }
        },
        error: (error: any) => console.error('Error loading ubicaciones:', error)
      });
  }

  loadUnidadesOrganicas(): void {
    this.organizationalUnitService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.data) {
            this.unidadesOrganicas = response.data;
          }
        },
        error: (error: any) => console.error('Error loading unidades orgánicas:', error)
      });
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.paginacion.perPage = +this.filtros.per_page || 10;
    this.loadMovimientos();
  }

  limpiarFiltros(): void {
    this.filtros = {
      tipo_movimiento: '',
      activo_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      search: '',
      per_page: this.cv.defaultPageSize || 20
    };
    this.loadMovimientos();
  }

  onPageChange(page: number): void {
    this.paginacion.currentPage = page;
    this.loadMovimientos();
  }

  getPagesArray(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.paginacion.lastPage;
    const current = this.paginacion.currentPage;

    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 4; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }

    return pages;
  }

  abrirModalCrear(): void {
    this.modoModal = 'crear';
    this.movimientoSeleccionado = {
      tipo_movimiento: 'alta',
      fecha_movimiento: new Date().toISOString().split('T')[0]
    };
    $('#modalMovimiento').modal('show');
    setTimeout(() => this.initSelect2InModal('modalMovimiento'), 350);
  }

  abrirModalEditar(id: number): void {
    const movimiento = this.movimientos.find(m => m.id === id);
    if (movimiento) {
      this.modoModal = 'editar';
      this.movimientoSeleccionado = { ...movimiento };
      $('#modalMovimiento').modal('show');
      setTimeout(() => this.initSelect2InModal('modalMovimiento'), 350);
    }
  }

  abrirModalVer(id: number): void {
    const movimiento = this.movimientos.find(m => m.id === id);
    if (movimiento) {
      this.modoModal = 'ver';
      this.movimientoSeleccionado = { ...movimiento };
      $('#modalDetalleMovimiento').modal('show');
    }
  }

  guardarMovimiento(): void {
    if (this.modoModal === 'crear') {
      this.crearMovimiento();
    } else if (this.modoModal === 'editar') {
      this.actualizarMovimiento();
    }
  }

  crearMovimiento(): void {
    this.activoService.crearMovimiento(this.movimientoSeleccionado as Movimiento)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            $('#modalMovimiento').modal('hide');
            this.loadMovimientos();
            this.toast.success('Movimiento registrado exitosamente', 'Éxito');
          }
        },
        error: (error: any) => {
          console.error('Error al crear movimiento:', error);
          this.toast.error('Error al registrar movimiento', 'Error');
        }
      });
  }

  actualizarMovimiento(): void {
    if (!this.movimientoSeleccionado.id) return;

    this.activoService.actualizarMovimiento(this.movimientoSeleccionado.id, this.movimientoSeleccionado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            $('#modalMovimiento').modal('hide');
            this.loadMovimientos();
            this.toast.success('Movimiento actualizado exitosamente', 'Éxito');
          }
        },
        error: (error: any) => {
          console.error('Error al actualizar movimiento:', error);
          this.toast.error('Error al actualizar movimiento', 'Error');
        }
      });
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
      minimumResultsForSearch: modalId === 'modalMovimiento' ? 5 : 0
    });
    const nameToKey: Record<string, string> = {
      uo_origen: 'unidad_organica_origen_id',
      uo_destino: 'unidad_organica_destino_id',
      resp_origen: 'responsable_origen_id',
      resp_destino: 'responsable_destino_id'
    };
    $selects.select2(opts).on('change', (e: any) => {
      const name = $(e.target).attr('name');
      const val = $(e.target).val();
      const key = (name && nameToKey[name]) || name;
      if (modalId === 'modalMovimiento' && key && this.movimientoSeleccionado) {
        (this.movimientoSeleccionado as any)[key] = val === '' ? undefined : val;
      } else if (modalId === 'modalDetalleTraslado' && key) {
        const obj = this.modoTrasladoModal === 'nuevo' ? this.nuevoTraslado : this.trasladoSeleccionado;
        if (obj) (obj as any)[key] = val === '' ? undefined : val;
      }
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('activos-fijos');
    setTimeout(() => {
      $selects.each((_index: number, el: HTMLElement) => {
        $(el).next('.select2-container').find('.select2-selection').addClass(sizeClass);
      });
    }, 0);
  }

  abrirModalEliminar(id: number): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'activos-fijos';
    ref.componentInstance.title = 'Eliminar movimiento';
    ref.componentInstance.message = '¿Está seguro de eliminar este movimiento?';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.activoService.eliminarMovimiento(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.loadMovimientos();
                this.toast.success('Movimiento eliminado exitosamente', 'Éxito');
              }
            },
            error: (error: any) => {
              console.error('Error al eliminar movimiento:', error);
              this.toast.error('Error al eliminar movimiento', 'Error');
            }
          });
      },
      () => { }
    );
  }

  getTipoMovimientoConfig(tipo: TipoMovimiento) {
    return this.tiposMovimiento.find(t => t.value === tipo) || this.tiposMovimiento[0];
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE');
  }

  formatCurrency(value: number | string | null | undefined): string {
    if (!value) return 'S/ 0.00';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'S/ 0.00';
    return 'S/ ' + numValue.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  // ==================== TRASLADOS ====================
  setActiveTab(tab: 'movimientos' | 'traslados'): void {
    this.activeTab = tab;
  }

  loadUsuarios(): void {
    this.activoService.listarUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.usuarios = response.data;
          }
        },
        error: (error: any) => console.error('Error loading usuarios:', error)
      });
  }

  loadTraslados(): void {
    this.activoService.listarTraslados({})
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.traslados = response.data.data || [];
          }
        },
        error: (error: any) => console.error('Error loading traslados:', error)
      });
  }

  abrirModalNuevoTraslado(): void {
    this.modoTrasladoModal = 'nuevo';
    this.tabTrasladoModal = 'cabecera';
    this.nuevoTraslado = {
      fecha_traslado: new Date().toISOString().split('T')[0],
      motivo: 'cambio_cargo',
      responsable_origen_id: '',
      responsable_destino_id: '',
      unidad_organica_origen_id: '',
      unidad_organica_destino_id: ''
    };
    this.trasladoSeleccionado = null;
    $('#modalDetalleTraslado').modal('show');
    setTimeout(() => this.initSelect2InModal('modalDetalleTraslado'), 350);
  }

  /** Abre el modal de detalle para ver/editar un traslado existente */
  abrirModalDetalleTraslado(traslado: any): void {
    this.verDetalleTraslado(traslado.id);
  }

  crearTraslado(): void {
    if (!this.nuevoTraslado.responsable_origen_id || !this.nuevoTraslado.responsable_destino_id) {
      this.toast.warning('Complete todos los campos requeridos', 'Advertencia');
      return;
    }
    if (!this.nuevoTraslado.unidad_organica_origen_id || !this.nuevoTraslado.unidad_organica_destino_id) {
      this.toast.warning('Seleccione la unidad orgánica origen y destino', 'Advertencia');
      return;
    }

    this.activoService.crearTraslado(this.nuevoTraslado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.trasladoSeleccionado = response.data;
            this.modoTrasladoModal = 'editar';
            this.tabTrasladoModal = 'detalle';
            this.loadTraslados();
            this.toast.success('Traslado creado. Agregue los bienes al detalle.', 'Éxito');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error('Error al crear traslado', 'Error');
        }
      });
  }

  abrirModalAgregarActivos(traslado: any): void {
    this.trasladoSeleccionado = traslado;
    this.activosSeleccionados = [];

    // Si el traslado tiene unidad orgánica origen, mostrar todos los activos de esa unidad.
    // Si no, filtrar por responsable origen (activos asignados a esa persona).
    const filtros: any = { per_page: 1000 };
    if (traslado.unidad_organica_origen_id) {
      filtros.unidad_organica_id = traslado.unidad_organica_origen_id;
    } else {
      filtros.responsable_id = traslado.responsable_origen_id;
    }

    this.activoService.listarActivos(filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.activosDisponibles = response.data.data || [];
            $('#modalAgregarActivos').modal('show');
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  toggleActivoSeleccionado(id: number): void {
    const index = this.activosSeleccionados.indexOf(id);
    if (index > -1) {
      this.activosSeleccionados.splice(index, 1);
    } else {
      this.activosSeleccionados.push(id);
    }
  }

  seleccionarTodosActivos(): void {
    this.activosSeleccionados = this.activosDisponibles.map(a => a.id);
  }

  deseleccionarTodosActivos(): void {
    this.activosSeleccionados = [];
  }

  agregarActivosAlTraslado(): void {
    if (this.activosSeleccionados.length === 0) {
      this.toast.warning('Seleccione al menos un activo', 'Advertencia');
      return;
    }

    let activosAgregados = 0;
    const total = this.activosSeleccionados.length;
    const trasladoId = this.trasladoSeleccionado.id;

    this.activosSeleccionados.forEach((activoId, index) => {
      this.activoService.agregarActivoTraslado(this.trasladoSeleccionado.id, activoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            activosAgregados++;
            if (activosAgregados === total) {
              $('#modalAgregarActivos').modal('hide');
              this.loadTraslados();
              this.toast.success(`${activosAgregados} activo(s) agregado(s) al traslado`, 'Éxito');
              // Actualizar traslado en el modal detalle si está abierto (maestro-detalle)
              this.activoService.obtenerTraslado(trasladoId)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (res: any) => {
                    if (res.success) {
                      this.trasladoSeleccionado = res.data;
                      this.tabTrasladoModal = 'detalle';
                    }
                  }
                });
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
          }
        });
    });
  }

  verDetalleTraslado(id: number): void {
    this.activoService.obtenerTraslado(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.trasladoSeleccionado = response.data;
            this.modoTrasladoModal = response.data.estado === 'pendiente' ? 'editar' : 'ver';
            this.tabTrasladoModal = 'cabecera';
            $('#modalDetalleTraslado').modal('show');
            setTimeout(() => this.initSelect2InModal('modalDetalleTraslado'), 350);
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  aprobarTraslado(id: number): void {
    const comentario = prompt('Comentario de aprobación (opcional):');

    this.activoService.aprobarTraslado(id, comentario || '')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.loadTraslados();
            this.toast.success('Traslado aprobado exitosamente', 'Éxito');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error('Error al aprobar traslado', 'Error');
        }
      });
  }

  rechazarTraslado(id: number): void {
    const comentario = prompt('Motivo del rechazo (requerido):');
    if (!comentario) return;

    this.activoService.rechazarTraslado(id, comentario)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.loadTraslados();
            this.toast.info('Traslado rechazado', 'Información');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error('Error al rechazar traslado', 'Error');
        }
      });
  }

  completarTraslado(id: number): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'activos-fijos';
    ref.componentInstance.title = 'Completar traslado';
    ref.componentInstance.message = '¿Está seguro de completar este traslado?';
    ref.componentInstance.detail = 'Los activos serán transferidos al nuevo responsable.';
    ref.componentInstance.type = 'warning';
    ref.componentInstance.confirmText = 'Sí, completar';
    ref.componentInstance.confirmIcon = 'fas fa-check';
    ref.componentInstance.confirmClass = 'btn-success';

    ref.result.then(
      () => {
        this.activoService.completarTraslado(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.loadTraslados();
                this.toast.success('Traslado completado. Los activos fueron transferidos.', 'Éxito');
              }
            },
            error: (error: any) => {
              console.error('Error:', error);
              this.toast.error('Error al completar traslado', 'Error');
            }
          });
      },
      () => { }
    );
  }

  eliminarActivoTraslado(trasladoId: number, detalleId: number): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'activos-fijos';
    ref.componentInstance.title = 'Eliminar activo del traslado';
    ref.componentInstance.message = '¿Eliminar este activo del traslado?';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => {
        this.activoService.eliminarActivoTraslado(trasladoId, detalleId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.loadTraslados();
                this.activoService.obtenerTraslado(trasladoId)
                  .pipe(takeUntil(this.destroy$))
                  .subscribe({
                    next: (res: any) => {
                      if (res.success) this.trasladoSeleccionado = res.data;
                    }
                  });
              }
            },
            error: (error: any) => {
              console.error('Error:', error);
              this.toast.error('Error al eliminar activo', 'Error');
            }
          });
      },
      () => { }
    );
  }

  agregarMasActivosDesdeDetalle(traslado: any): void {
    this.abrirModalAgregarActivos(traslado);
  }

  guardarCabeceraTraslado(): void {
    if (!this.trasladoSeleccionado?.id) return;
    const payload = {
      fecha_traslado: this.trasladoSeleccionado.fecha_traslado,
      responsable_origen_id: this.trasladoSeleccionado.responsable_origen_id,
      responsable_destino_id: this.trasladoSeleccionado.responsable_destino_id,
      unidad_organica_origen_id: this.trasladoSeleccionado.unidad_organica_origen_id,
      unidad_organica_destino_id: this.trasladoSeleccionado.unidad_organica_destino_id,
      motivo: this.trasladoSeleccionado.motivo,
      descripcion_motivo: this.trasladoSeleccionado.descripcion_motivo,
      documento_sustento: this.trasladoSeleccionado.documento_sustento,
      observaciones: this.trasladoSeleccionado.observaciones
    };
    this.activoService.actualizarTraslado(this.trasladoSeleccionado.id, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.trasladoSeleccionado = response.data;
            this.loadTraslados();
            this.toast.success('Traslado actualizado', 'Éxito');
          }
        },
        error: (error: any) => {
          console.error('Error:', error);
          this.toast.error(error?.error?.message || 'Error al actualizar traslado', 'Error');
        }
      });
  }

  aprobarDesdeDetalle(id: number): void {
    $('#modalDetalleTraslado').modal('hide');
    this.aprobarTraslado(id);
  }

  completarDesdeDetalle(id: number): void {
    $('#modalDetalleTraslado').modal('hide');
    this.completarTraslado(id);
  }

  getEstadoTrasladoBadge(estado: string): string {
    const badges: any = {
      'pendiente': 'badge-warning',
      'aprobado': 'badge-info',
      'rechazado': 'badge-danger',
      'completado': 'badge-success'
    };
    return badges[estado] || 'badge-secondary';
  }

  formatEstadoTraslado(estado: string): string {
    const estados: any = {
      'pendiente': 'Pendiente',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado',
      'completado': 'Completado'
    };
    return estados[estado] || estado;
  }

  getMotivoLabel(motivo: string): string {
    const motivos: any = {
      'cese_funciones': 'Cese de Funciones',
      'cambio_cargo': 'Cambio de Cargo',
      'rotacion_personal': 'Rotación de Personal',
      'reorganizacion': 'Reorganización',
      'transferencia_area': 'Transferencia de Área',
      'otro': 'Otro'
    };
    return motivos[motivo] || motivo;
  }

  imprimirNotaTraslado(traslado: any): void {
    if (!traslado) return;

    // Si el traslado no tiene detalles (viene de la lista), cargarlo completo
    if (!traslado.detalles) {
      this.activoService.obtenerTraslado(traslado.id).subscribe({
        next: (response: any) => {
          if (response.success) {
            this.generarPdfNotaTraslado(response.data);
          }
        },
        error: () => this.toast.error('Error al cargar detalle del traslado', 'Error')
      });
    } else {
      this.generarPdfNotaTraslado(traslado);
    }
  }

  private async generarPdfNotaTraslado(t: any): Promise<void> {
    const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Obtener info de organización
    let org: OrganizationSetting | null = null;
    try {
      const resp = await this.systemService.getOrganizationSettings().toPromise();
      if (resp?.success) org = resp.data;
    } catch (e) { }

    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();
    let y = height - 50;

    // Header con Logo y Datos de Org
    if (org?.logo) {
      try {
        const logoUrl = 'http://localhost:8000/storage/' + org.logo;
        const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
        let logoImage;
        if (org.logo.toLowerCase().endsWith('.png')) {
          logoImage = await pdfDoc.embedPng(logoBytes);
        } else {
          logoImage = await pdfDoc.embedJpg(logoBytes);
        }
        const logoDims = logoImage.scale(0.25);
        page.drawImage(logoImage, {
          x: 50, y: y - 20,
          width: logoDims.width > 120 ? 120 : logoDims.width,
          height: logoDims.height > 60 ? 60 : logoDims.height
        });
      } catch (e) {
        console.warn('No se pudo cargar el logo para el PDF', e);
      }
    }

    const orgName = org?.name || 'SISTEMA DE GESTIÓN DE ACTIVOS FIJOS';
    page.drawText(orgName.toUpperCase(), { x: 180, y: y + 10, size: 10, font: fontBold });
    if (org?.ruc) {
      page.drawText(`RUC: ${org.ruc}`, { x: 180, y: y - 2, size: 8, font });
    }
    page.drawText('INTRANET INSTITUCIONAL', { x: 180, y: y - 12, size: 8, font });

    y -= 40;
    const title = 'NOTA DE TRASLADO DE BIENES';
    const titleWidth = fontBold.widthOfTextAtSize(title, 16);
    page.drawText(title, { x: (width - titleWidth) / 2, y, size: 16, font: fontBold });

    y -= 25;
    const codigoText = `N° DOCUMENTO: ${t.codigo}`;
    const codigoWidth = fontBold.widthOfTextAtSize(codigoText, 12);
    page.drawText(codigoText, { x: (width - codigoWidth) / 2, y, size: 12, font: fontBold });

    y -= 40;
    // Información General en Recuadro
    page.drawRectangle({
      x: 50, y: y - 85, width: width - 100, height: 100,
      borderWidth: 1, borderColor: rgb(0.8, 0.8, 0.8), color: rgb(0.98, 0.98, 0.98)
    });

    let ty = y - 15;
    page.drawText('FECHA DE EMISIÓN:', { x: 70, y: ty, size: 9, font: fontBold });
    page.drawText(this.formatDate(t.fecha_traslado), { x: 180, y: ty, size: 9, font });

    ty -= 20;
    page.drawText('MOTIVO:', { x: 70, y: ty, size: 9, font: fontBold });
    page.drawText(this.getMotivoLabel(t.motivo), { x: 180, y: ty, size: 9, font });

    ty -= 20;
    page.drawText('ORIGEN:', { x: 70, y: ty, size: 9, font: fontBold });
    page.drawText(`${t.unidad_organica_origen?.name || '-'} (${t.responsable_origen?.name || '-'})`, { x: 180, y: ty, size: 9, font });

    ty -= 20;
    page.drawText('DESTINO:', { x: 70, y: ty, size: 9, font: fontBold });
    page.drawText(`${t.unidad_organica_destino?.name || '-'} (${t.responsable_destino?.name || '-'})`, { x: 180, y: ty, size: 9, font });

    y -= 120;
    // Tabla de Bienes
    page.drawText('DETALLE DE BIENES TRASLADADOS:', { x: 50, y, size: 10, font: fontBold });
    y -= 15;

    // Header de Tabla
    page.drawRectangle({ x: 50, y: y - 5, width: width - 100, height: 20, color: rgb(0.2, 0.2, 0.2) });
    page.drawText('#', { x: 55, y, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('CÓDIGO', { x: 80, y, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('DESCRIPCIÓN DEL BIEN', { x: 180, y, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('CONDICIÓN', { x: 480, y, size: 9, font: fontBold, color: rgb(1, 1, 1) });

    y -= 25;
    const detalles = t.detalles || [];
    detalles.forEach((det: any, i: number) => {
      if (y < 150) { // Nueva página si no hay espacio
        // Para simplificar se mantiene en una
      }
      page.drawText((i + 1).toString(), { x: 55, y, size: 8, font });
      page.drawText(det.codigo_patrimonial || '-', { x: 80, y, size: 8, font });

      const desc = det.descripcion_activo || '-';
      page.drawText(desc.length > 60 ? desc.substring(0, 57) + '...' : desc, { x: 180, y, size: 8, font });

      page.drawText((det.condicion || '-').toUpperCase(), { x: 480, y, size: 8, font });

      y -= 15;
      page.drawLine({ start: { x: 50, y: y + 5 }, end: { x: width - 50, y: y + 5 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    });

    // Observaciones si existen
    if (t.observaciones) {
      y -= 20;
      page.drawText('OBSERVACIONES:', { x: 50, y, size: 9, font: fontBold });
      y -= 15;
      page.drawText(t.observaciones, { x: 50, y, size: 8, font });
    }

    // Pie de página con firmas
    const firmaY = 120;
    page.drawLine({ start: { x: 80, y: firmaY }, end: { x: 240, y: firmaY }, thickness: 1 });
    page.drawText('ENTREGÓ CONFORME', { x: 110, y: firmaY - 15, size: 9, font: fontBold });
    page.drawText(t.responsable_origen?.name || '', { x: 80, y: firmaY - 30, size: 8, font });
    page.drawText('DNI:', { x: 80, y: firmaY - 42, size: 8, font });

    page.drawLine({ start: { x: 350, y: firmaY }, end: { x: 510, y: firmaY }, thickness: 1 });
    page.drawText('RECIBIÓ CONFORME', { x: 380, y: firmaY - 15, size: 9, font: fontBold });
    page.drawText(t.responsable_destino?.name || '', { x: 350, y: firmaY - 30, size: 8, font });
    page.drawText('DNI:', { x: 350, y: firmaY - 42, size: 8, font });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}

