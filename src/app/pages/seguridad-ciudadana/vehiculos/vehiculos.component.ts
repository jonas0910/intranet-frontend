import { Component, OnInit, OnDestroy, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ToastService } from '../../../services/toast.service';

declare var $: any;

@Component({
  selector: 'app-vehiculos-seguridad',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule, 
    DataTablesModule, 
    SystemLayoutComponent
  ],
  templateUrl: './vehiculos.component.html',
  styleUrl: './vehiculos.component.scss'
})
export class VehiculosComponent extends CrudListExportBase implements OnInit, OnDestroy {
  Math = Math;
  subsystem = 'seguridad-ciudadana';
  activeTab: 'lista-vehiculos' | 'tipos-mantenimiento' = 'lista-vehiculos';

  vehiculos: any[] = [];
  loading = false;
  isFiltersCollapsed = false;
  saving = false;

  isEdit = false;
  vehiculoSeleccionado: any = null;
  personalList: any[] = [];
  tiposMantenimiento: any[] = [];

  // Gestión de Tipos
  tipoMantenimientoForm!: FormGroup;
  editandoTipo = false;
  tipoSeleccionado: any = null;
  submitting = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    tipo: '',
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

  equipoForm: FormGroup;
  formulario: any = {}; // Keep for compatibility if needed, but primarily use equipoForm

  // Opciones
  tiposVehiculo = [
    { value: 'camioneta', label: 'Patrullero (Camioneta)' },
    { value: 'moto', label: 'Motocicleta' },
    { value: 'auto', label: 'Automóvil' },
    { value: 'tactico', label: 'Unidad Táctica' },
    { value: 'otro', label: 'Otro' }
  ];

  estadosVehiculo = [
    { value: 'operativo', label: 'Operativo', class: 'badge-success' },
    { value: 'mantenimiento', label: 'Mantenimiento', class: 'badge-warning' },
    { value: 'fuera_servicio', label: 'Fuera de Servicio', class: 'badge-danger' }
  ];

  private destroy$ = new Subject<void>();

  constructor(
    private http: HttpClient,
    private toast: ToastService,
    private modalService: NgbModal,
    private fb: FormBuilder,
    crudExport: CrudExportService
  ) {
    super(crudExport);
    this.equipoForm = this.fb.group({
      placa: ['', Validators.required],
      tipo: ['vehiculo', Validators.required],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      anio: [new Date().getFullYear(), Validators.required],
      color: ['', Validators.required],
      odometro_actual: [0, [Validators.required, Validators.min(0)]],
      estado: ['operativo', Validators.required],
      origen: ['interna'],
      responsable_id: [null],
      numero_motor: [''],
      numero_chasis: [''],
      department_id: [13],
      fecha_soat: [null],
      fecha_revision_tecnica: [null],
      fecha_ultimo_mantenimiento: [null],
      fecha_proximo_mantenimiento: [null],
      observaciones: ['']
    });

    this.tipoMantenimientoForm = this.fb.group({
      id: [null],
      codigo: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      tipo_medicion: ['kilometraje', Validators.required],
      frecuencia_kilometros: [null],
      frecuencia_horas: [null],
      frecuencia_dias: [null],
      anticipacion_kilometros: [null],
      anticipacion_horas: [null],
      anticipacion_dias: [null],
      alerta_verde_dias: [null],
      alerta_amarilla_dias: [null],
      alerta_roja_dias: [null],
      categoria: [''],
      criticidad: ['media'],
      activo: [true],
      obligatorio: [false],
      genera_alerta: [true],
      tipos_equipo_aplicables: [[]]
    });
  }

  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('seguridad-ciudadana');
  }

  override onExportExcel() {
    super.onExportExcel();
  }

  override onExportPdf() {
    super.onExportPdf();
  }

  ngOnInit(): void {
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadVehiculos();
    this.loadPersonal();
    this.loadTiposMantenimiento();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initDataTable(): void {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[1, 'asc']],
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

  loadVehiculos(): void {
    this.loading = true;
    const params = {
      ...this.filtros,
      per_page: this.filtros.per_page === 0 ? -1 : this.filtros.per_page
    };

    const url = `${environment.apiUrl}/seguridad-ciudadana/vehiculos`;
    this.http.get<any>(url, { params }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success) {
          const data = response.data;
          this.vehiculos = Array.isArray(data) ? data : (data.data || []);
          
          if (!Array.isArray(data)) {
            this.paginacion = {
              currentPage: data.current_page || 1,
              lastPage: data.last_page || 1,
              total: data.total || 0,
              perPage: +(data.per_page || this.filtros.per_page || 10)
            };
          } else {
            this.paginacion.total = this.vehiculos.length;
            this.paginacion.lastPage = 1;
          }
          this.triggerDataTable();
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading vehiculos:', error);
        this.loading = false;
      }
    });
  }

  loadPersonal(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/personal`;
    this.http.get<any>(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.personalList = response.data;
        }
      },
      error: (err) => console.error('Error loading personal:', err)
    });
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.loadVehiculos();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.loadVehiculos();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      tipo: '',
      estado: '',
      per_page: this.cv.defaultPageSize || 10,
      page: 1
    };
    this.loadVehiculos();
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
    this.vehiculoSeleccionado = null;
    this.resetFormulario();
    $('#modalVehiculo').modal('show');
  }

  openEdit(vehiculo: any): void {
    this.isEdit = true;
    this.vehiculoSeleccionado = vehiculo;
    this.llenarFormulario(vehiculo);
    $('#modalVehiculo').modal('show');
  }

  openView(vehiculo: any): void {
    this.vehiculoSeleccionado = vehiculo;
    $('#modalViewVehiculo').modal('show');
  }

  closeEdit(): void {
    $('#modalVehiculo').modal('hide');
  }

  closeView(): void {
    $('#modalViewVehiculo').modal('hide');
  }

  // ==================== FORMULARIO ====================

  resetFormulario(): void {
    this.equipoForm.reset({
      tipo: 'vehiculo',
      estado: 'operativo',
      anio: new Date().getFullYear(),
      odometro_actual: 0,
      origen: 'interna',
      responsable_id: null,
      department_id: 13,
      fecha_soat: null,
      fecha_revision_tecnica: null,
      fecha_ultimo_mantenimiento: null,
      fecha_proximo_mantenimiento: null
    });
  }

  llenarFormulario(vehiculo: any): void {
    this.equipoForm.patchValue({
      placa: vehiculo.placa || '',
      tipo: vehiculo.tipo || 'vehiculo',
      marca: vehiculo.marca || '',
      modelo: vehiculo.modelo || '',
      anio: vehiculo.anio || new Date().getFullYear(),
      color: vehiculo.color || '',
      odometro_actual: vehiculo.odometro_actual || 0,
      estado: vehiculo.estado || 'operativo',
      origen: vehiculo.origen || 'interna',
      responsable_id: vehiculo.responsable_id || null,
      numero_motor: vehiculo.numero_motor || '',
      numero_chasis: vehiculo.numero_chasis || '',
      department_id: 13,
      fecha_soat: this.formatDate(vehiculo.fecha_soat),
      fecha_revision_tecnica: this.formatDate(vehiculo.fecha_revision_tecnica),
      fecha_ultimo_mantenimiento: this.formatDate(vehiculo.fecha_ultimo_mantenimiento),
      fecha_proximo_mantenimiento: this.formatDate(vehiculo.fecha_proximo_mantenimiento),
      observaciones: vehiculo.observaciones || ''
    });
  }

  save(): void {
    if (this.equipoForm.invalid) {
      this.equipoForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/vehiculos`;
    const data = {
      ...this.equipoForm.value,
      department_id: 13,
      categoria_id: 3 // Vehículos
    };
    
    const request = this.isEdit && this.vehiculoSeleccionado?.id
      ? this.http.put(`${url}/${this.vehiculoSeleccionado.id}`, data)
      : this.http.post(url, data);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toast.success(this.isEdit ? 'Vehículo actualizado' : 'Vehículo registrado');
          this.closeEdit();
          this.loadVehiculos();
        }
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving vehiculo:', error);
        this.toast.error('Error al guardar: ' + (error.error?.message || error.message));
        this.saving = false;
      }
    });
  }

  // ==================== GESTIÓN DE TIPOS ====================
  
  loadTiposMantenimiento(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/tipos-mantenimiento`;
    this.http.get<any>(url).pipe(takeUntil(this.destroy$)).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.tiposMantenimiento = response.data;
        }
      },
      error: (err) => console.error('Error loading tipos mantenimiento:', err)
    });
  }

  abrirModalNuevoTipo(): void {
    this.editandoTipo = false;
    this.tipoSeleccionado = null;
    this.tipoMantenimientoForm.reset({
      tipo_medicion: 'kilometraje',
      criticidad: 'media',
      activo: true,
      obligatorio: false,
      genera_alerta: true,
      tipos_equipo_aplicables: []
    });
    $('#modalTipoMantenimiento').modal('show');
  }

  editarTipoMantenimiento(tipo: any): void {
    this.editandoTipo = true;
    this.tipoSeleccionado = tipo;
    this.tipoMantenimientoForm.patchValue({
      ...tipo,
      tipos_equipo_aplicables: tipo.tipos_equipo_aplicables || []
    });
    $('#modalTipoMantenimiento').modal('show');
  }

  cerrarModalTipo(): void {
    $('#modalTipoMantenimiento').modal('hide');
  }

  guardarTipo(): void {
    if (this.tipoMantenimientoForm.invalid) {
      this.tipoMantenimientoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const data = this.tipoMantenimientoForm.value;
    const url = `${environment.apiUrl}/seguridad-ciudadana/tipos-mantenimiento`;
    
    const request = this.editandoTipo
      ? this.http.put(`${url}/${this.tipoSeleccionado.id}`, data)
      : this.http.post(url, data);

    request.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toast.success('Configuración guardada');
          this.cerrarModalTipo();
          this.loadTiposMantenimiento();
        }
        this.submitting = false;
      },
      error: (err) => {
        this.toast.error('Error al guardar');
        this.submitting = false;
      }
    });
  }

  setActiveTab(tab: 'lista-vehiculos' | 'tipos-mantenimiento'): void {
    this.activeTab = tab;
  }

  delete(vehiculo: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Vehículo';
    ref.componentInstance.message = `¿Deseas eliminar el vehículo con placa ${vehiculo.placa}?`;
    ref.componentInstance.type = 'danger';
    
    ref.result.then((result) => {
      if (result) {
        const url = `${environment.apiUrl}/seguridad-ciudadana/vehiculos/${vehiculo.id}`;
        this.http.delete<any>(url).pipe(takeUntil(this.destroy$)).subscribe({
          next: (response) => {
            if (response.success) {
              this.toast.success('Vehículo eliminado');
              this.loadVehiculos();
            }
          }
        });
      }
    }, () => {});
  }

  // ==================== EXPORTACIÓN ====================
  override getExportData(): Record<string, unknown>[] {
    return this.vehiculos.map(v => ({
      placa: v.placa,
      tipo: v.tipo,
      marca: v.marca,
      modelo: v.modelo,
      anio: v.anio,
      estado: this.getEstadoLabel(v.estado)
    }));
  }

  override getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'placa', label: 'Placa' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'marca', label: 'Marca' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'anio', label: 'Año' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  override getExportTitle(): string { return 'Listado de Vehículos de Seguridad Ciudadana'; }
  override getExportFilename(): string { return 'vehiculos-seguridad'; }

  // ==================== UTILIDADES ====================
  getEstadoBadgeClass(estado: string): string {
    const estadoObj = this.estadosVehiculo.find(e => e.value === estado);
    return estadoObj ? estadoObj.class : 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const estadoObj = this.estadosVehiculo.find(e => e.value === estado);
    return estadoObj ? estadoObj.label : estado;
  }

  getTipoBadgeClass(tipo: string): string {
    const classes: any = {
      'camioneta': 'badge-primary',
      'moto': 'badge-info',
      'auto': 'badge-success',
      'tactico': 'badge-danger'
    };
    return classes[tipo] || 'badge-secondary';
  }

  getTipoLabel(tipo: string): string {
    const tipoObj = this.tiposVehiculo.find(t => t.value === tipo);
    return tipoObj ? tipoObj.label : tipo;
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split('T')[0];
      return d.toISOString().split('T')[0];
    } catch (e) {
      return dateStr ? dateStr.split('T')[0] : '';
    }
  }
}
