import { Component, Injector, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { VehiculoServicioService } from '../services/vehiculo-servicio.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { VehiculoServicioModalComponent } from './vehiculo-servicio-modal/vehiculo-servicio-modal.component';

@Component({
  selector: 'app-vehiculos-servicios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './vehiculos-servicios.component.html',
  styleUrls: ['./vehiculos-servicios.component.scss']
})
export class VehiculosServiciosComponent extends CrudListExportBase implements OnInit {
  activos: any[] = [];
  categorias: any[] = [];
  loading = false;
  isFiltersCollapsed = false;

  filtros: any = {
    search: '',
    categoria_id: '',
    estado: '',
    per_page: 10,
    page: 1
  };
  
  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
    from: 0,
    to: 0
  };

  constructor(
    private service: VehiculoServicioService,
    private modalService: NgbModal,
    private injector: Injector,
    public toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  /**
   * El contenido del modal no recibe NgbModal en su inyector; inyectamos el mismo servicio
   * del padre para que VehiculoServicioModalComponent pueda abrir el modal de elementos.
   */
  private opcionesModalVehiculo(): NgbModalOptions {
    return {
      size: 'xl',
      centered: true,
      backdrop: 'static',
      injector: Injector.create({
        providers: [{ provide: NgbModal, useValue: this.modalService }],
        parent: this.injector
      })
    };
  }

  ngOnInit(): void {
    this.filtros.per_page = this.cv?.defaultPageSize || 10;
    this.paginacion.perPage = this.cv?.defaultPageSize || 10;
    this.loadCategorias();
    this.loadActivos();
  }

  loadCategorias(): void {
    this.service.listarCategorias().subscribe({
      next: (res) => {
        if (res?.success) this.categorias = res.data;
      }
    });
  }

  loadActivos(): void {
    this.loading = true;
    this.service.listarActivos(this.filtros).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.success) {
          this.activos = res.data.data;
          this.paginacion = {
            currentPage: res.data.current_page,
            lastPage: res.data.last_page,
            total: res.data.total,
            perPage: +(res.data.per_page || 10),
            from: res.data.from ?? 0,
            to: res.data.to ?? 0
          };
        }
      },
      error: () => this.loading = false
    });
  }

  onFilterChange(): void {
    this.filtros.page = 1;
    this.loadActivos();
  }

  onPageChange(page: number): void {
    this.filtros.page = page;
    this.loadActivos();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      categoria_id: '',
      estado: '',
      per_page: this.cv?.defaultPageSize || 10,
      page: 1
    };
    this.loadActivos();
  }

  openCreate(): void {
    const modalRef = this.modalService.open(VehiculoServicioModalComponent, this.opcionesModalVehiculo());
    modalRef.componentInstance.isEdit = false;
    modalRef.result.then((res) => {
      if (res) this.loadActivos();
    }, () => {});
  }

  openEdit(activo: any): void {
    if (activo.origen !== 'externa') {
      this.toast.info('Solo se pueden editar vehículos externos/alquilados');
      return;
    }
    const modalRef = this.modalService.open(VehiculoServicioModalComponent, this.opcionesModalVehiculo());
    modalRef.componentInstance.isEdit = true;
    modalRef.componentInstance.isReadOnly = false;
    modalRef.componentInstance.activo = activo;
    modalRef.result.then((res) => {
      if (res) this.loadActivos();
    }, () => {});
  }

  openView(activo: any): void {
    const modalRef = this.modalService.open(VehiculoServicioModalComponent, this.opcionesModalVehiculo());
    modalRef.componentInstance.isEdit = false;
    modalRef.componentInstance.isReadOnly = true;
    modalRef.componentInstance.activo = activo;
    modalRef.result.then(() => {}, () => {});
  }

  /** Programación de mantenimiento (km / horas / días) — aplica a activos propios y alquilados */
  openProgramacionMantenimiento(activo: any): void {
    const modalRef = this.modalService.open(VehiculoServicioModalComponent, this.opcionesModalVehiculo());
    modalRef.componentInstance.soloProgramacion = true;
    modalRef.componentInstance.activo = activo;
    modalRef.componentInstance.isReadOnly = false;
    modalRef.result.then((ok) => {
      if (ok) {
        this.loadActivos();
      }
    }, () => {});
  }

  puedeProgramarMantenimiento(a: any): boolean {
    const tipos = ['camioneta', 'compactador', 'volquete', 'moto', 'auto', 'maquinaria', 'equipo', 'camion', 'retroexcavadora', 'cargador', 'minicargador'];
    return a?.categoria_id === 3 || a?.categoria_id === 6 || tipos.includes(a?.tipo) || !!a?.placa;
  }

  deleteActivo(activo: any): void {
    if (activo.origen !== 'externa') {
      this.toast.error('No se puede eliminar un activo propio (interno)');
      return;
    }

    const modalRef = this.modalService.open(ConfirmDialogComponent, { centered: true });
    modalRef.componentInstance.title = 'Eliminar Vehículo de Servicio';
    modalRef.componentInstance.message = `¿Estás seguro de eliminar el vehículo con placa ${activo.placa}?`;
    modalRef.componentInstance.type = 'danger';

    modalRef.result.then((confirm) => {
      if (confirm) {
        this.service.eliminarVehiculo(activo.id).subscribe({
          next: () => {
            this.toast.success('Vehículo eliminado');
            this.loadActivos();
          },
          error: (err) => this.toast.error('Error al eliminar')
        });
      }
    }, () => {});
  }

  // Helpers
  getEstadoLabel(estado: string): string {
    const map: Record<string, string> = {
      activo: 'Activo',
      baja: 'Baja',
      operativo: 'Operativo',
      mantenimiento: 'Mantenimiento',
      fuera_servicio: 'Fuera de Servicio'
    };
    return map[estado] || estado;
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

  isVehicle(activo: any): boolean {
    return activo.categoria_id === 3 || !!activo.placa;
  }

  override getExportData(): Record<string, unknown>[] {
    return this.activos.map(a => ({
      identificador: a.placa || a.codigo_patrimonial,
      tipo: a.categoria?.nombre || a.tipo,
      descripcion: a.descripcion,
      estado: this.getEstadoLabel(a.estado),
      origen: a.origen === 'externa' ? 'Alquilado' : 'Propio'
    }));
  }

  override getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'identificador', label: 'Placa / Código' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'estado', label: 'Estado' },
      { key: 'origen', label: 'Origen' }
    ];
  }

  override getExportTitle(): string { return 'Listado de Activos y Flota del Departamento'; }
  override getExportFilename(): string { return 'activos-vehiculos-departamento'; }
}
