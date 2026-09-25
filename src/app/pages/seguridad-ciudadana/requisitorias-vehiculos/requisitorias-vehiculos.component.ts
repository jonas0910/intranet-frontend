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
  selector: 'app-requisitorias-vehiculos',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    DataTablesModule, 
    SystemLayoutComponent
  ],
  templateUrl: './requisitorias-vehiculos.component.html',
  styleUrls: ['./requisitorias-vehiculos.component.scss']
})
export class RequisitoriasVehiculosComponent extends CrudListExportBase implements OnInit, OnDestroy {
  Math = Math;

  vehiculos: any[] = [];
  loading = false;
  isFiltersCollapsed = false;
  guardando = false;

  modoEdicion = false;
  vehiculoSeleccionado: any = null;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    motivo: '',
    nivel_peligrosidad: '',
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
    placa: '',
    marca: '',
    modelo: '',
    color: '',
    anio: '',
    tipo_vehiculo: '',
    numero_motor: '',
    numero_serie: '',
    motivo_requisitoria: '',
    nivel_peligrosidad: 'media',
    autoridad_emite: '',
    numero_oficio: '',
    fecha_requisitoria: '',
    estado: 'activa',
    observaciones: ''
  };

  nivelesPeligrosidad = [
    { value: 'alta', label: 'Alta', class: 'badge-danger' },
    { value: 'media', label: 'Media', class: 'badge-warning' },
    { value: 'baja', label: 'Baja', class: 'badge-info' }
  ];

  estados = [
    { value: 'activa', label: 'Activa', class: 'badge-danger' },
    { value: 'encontrada', label: 'Encontrada', class: 'badge-success' },
    { value: 'levantada', label: 'Levantada', class: 'badge-secondary' }
  ];

  motivos = ['robo', 'hurto', 'orden_judicial', 'embargo', 'acciones_policiales', 'otros'];

  private destroy$ = new Subject<void>();

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
    this.filtros.per_page = this.cv.defaultPageSize || 10;
    this.paginacion.perPage = this.cv.defaultPageSize || 10;
    this.initDataTable();
    this.loadVehiculos();
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
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos`;
    
    let params: any = { ...this.filtros };
    if (!params.per_page) params.per_page = this.paginacion.perPage;

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
        this.toast.error('Error al cargar datos');
      }
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
      motivo: '',
      nivel_peligrosidad: '',
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
      current <= 3 
        ? (pages.push(1, 2, 3, 4, -1, last))
        : current >= last - 2
          ? (pages.push(1, -1, last - 3, last - 2, last - 1, last))
          : (pages.push(1, -1, current - 1, current, current + 1, -1, last));
    }
    return pages;
  }

  // ==================== MODALES ====================

  openCreate(): void {
    this.modoEdicion = false;
    this.vehiculoSeleccionado = null;
    this.resetFormulario();
    $('#modalVehiculoReq').modal('show');
  }

  openEdit(item: any): void {
    this.modoEdicion = true;
    this.vehiculoSeleccionado = item;
    this.llenarFormulario(item);
    $('#modalVehiculoReq').modal('show');
  }

  openView(item: any): void {
    this.vehiculoSeleccionado = item;
    $('#modalViewVehiculoReq').modal('show');
  }

  closeEdit(): void {
    $('#modalVehiculoReq').modal('hide');
  }

  closeView(): void {
    $('#modalViewVehiculoReq').modal('hide');
  }

  // ==================== FORMULARIO ====================

  resetFormulario(): void {
    this.formulario = {
      placa: '',
      marca: '',
      modelo: '',
      color: '',
      anio: new Date().getFullYear(),
      tipo_vehiculo: '',
      numero_motor: '',
      numero_serie: '',
      motivo_requisitoria: '',
      nivel_peligrosidad: 'media',
      autoridad_emite: '',
      numero_oficio: '',
      fecha_requisitoria: new Date().toISOString().split('T')[0],
      estado: 'activa',
      observaciones: ''
    };
  }

  llenarFormulario(item: any): void {
    this.formulario = { ...item };
  }

  save(): void {
    this.guardando = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos`;
    
    const request$ = this.modoEdicion 
      ? this.http.put(`${url}/${this.vehiculoSeleccionado.id}`, this.formulario)
      : this.http.post(url, this.formulario);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.toast.success(this.modoEdicion ? 'Requisitoria actualizada' : 'Requisitoria registrada');
          this.closeEdit();
          this.loadVehiculos();
        }
        this.guardando = false;
      },
      error: (error) => {
        console.error('Error saving vehiculo:', error);
        this.toast.error('Error al guardar: ' + (error.error?.message || error.message));
        this.guardando = false;
      }
    });
  }

  delete(item: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Eliminar Requisitoria';
    ref.componentInstance.message = `¿Deseas eliminar la requisitoria del vehículo con placa ${item.placa}?`;
    ref.componentInstance.type = 'danger';
    ref.result.then((res) => {
      if (res) {
        this.http.delete(`${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos/${item.id}`).subscribe({
          next: () => {
            this.toast.success('Eliminado correctamente');
            this.loadVehiculos();
          },
          error: (err) => this.toast.error('Error al eliminar')
        });
      }
    }, () => {});
  }

  marcarEncontrado(item: any): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Confirmar Hallazgo';
    ref.componentInstance.message = `¿Confirma que el vehículo con placa ${item.placa} ha sido encontrado?`;
    ref.componentInstance.confirmText = 'Sí, Encontrado';
    ref.componentInstance.type = 'success';
    ref.result.then((res) => {
      if (res) {
        this.http.put(`${environment.apiUrl}/seguridad-ciudadana/requisitorias/vehiculos/${item.id}`, { ...item, estado: 'encontrada' }).subscribe({
          next: () => {
            this.toast.success('Estado actualizado a Encontrada');
            this.loadVehiculos();
          },
          error: (err) => this.toast.error('Error al actualizar estado')
        });
      }
    }, () => {});
  }

  // ==================== EXPORTACIÓN ====================
  getExportData(): Record<string, unknown>[] {
    return this.vehiculos.map(v => ({
      placa: v.placa,
      vehiculo: `${v.marca} ${v.modelo} (${v.color})`,
      motivo: v.motivo_requisitoria,
      autoridad: v.autoridad_emite,
      peligrosidad: this.getPeligrosidadLabel(v.nivel_peligrosidad),
      estado: v.estado
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'placa', label: 'Placa' },
      { key: 'vehiculo', label: 'Vehículo' },
      { key: 'motivo', label: 'Motivo' },
      { key: 'autoridad', label: 'Autoridad' },
      { key: 'peligrosidad', label: 'Peligrosidad' },
      { key: 'estado', label: 'Estado' }
    ];
  }

  getExportTitle(): string { return 'Reporte de Vehículos Requisitoriados'; }
  getExportFilename(): string { return 'requisitorias-vehiculos'; }

  // ==================== UTILIDADES ====================
  getPeligrosidadBadgeClass(nivel: string): string { 
    return (this.nivelesPeligrosidad.find(p => p.value === nivel)?.class) || 'badge-secondary'; 
  }
  getPeligrosidadLabel(nivel: string): string { 
    return (this.nivelesPeligrosidad.find(p => p.value === nivel)?.label) || nivel; 
  }
  getEstadoBadgeClass(estado: string): string { 
    return (this.estados.find(e => e.value === estado)?.class) || 'badge-secondary'; 
  }
  getEstadoLabel(estado: string): string { 
    return (this.estados.find(e => e.value === estado)?.label) || estado; 
  }
}
