import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { ActivoService } from '../services/activo.service';
import { OrganizationalUnitService } from '../../../services/organizational-unit.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';


@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, DataTablesModule, SystemLayoutComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();


  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  activos: any[] = [];
  usuarios: any[] = [];
  unidadesOrganicas: any[] = [];
  ubicaciones: any[] = [];
  categorias: any[] = [];

  loading = false;
  isFiltersCollapsed = false;

  pageSizeOptions = [10, 20, 50, 100];

  filtros: any = {
    search: '',
    responsable_id: '',
    unidad_organica_id: '',
    ubicacion_id: '',
    estado: '',
    categoria_id: '',
    per_page: 20,
    page: 1
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 20,
    from: 0,
    to: 0
  };

  constructor(
    private activoService: ActivoService,
    private organizationalUnitService: OrganizationalUnitService,
    crudExport: CrudExportService

  ) {
    super(crudExport);
  }

  /** Configuración CRUD del subsistema activos-fijos (tema verde) */
  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  ngOnInit(): void {
    this.filtros.per_page = this.cv.defaultPageSize || 20;
    this.paginacion.perPage = this.filtros.per_page;
    this.pageSizeOptions = this.cv.pageSizeOptions || [10, 20, 50, 100];

    this.initDataTable();
    this.loadCatalogos();
    this.loadActivos();
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
        { targets: 0, width: '50px', orderable: false },
        { targets: -1, orderable: false }
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
        next: (r) => { if (r?.success) this.categorias = r.data || []; }
      });

    this.activoService.listarUbicaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { if (r?.success) this.ubicaciones = r.data || []; }
      });

    this.organizationalUnitService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => {
          if (r?.success && r?.data) this.unidadesOrganicas = r.data;
        }
      });

    this.activoService.listarUsuarios()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (r) => { if (r?.success) this.usuarios = r.data || []; }
      });
  }

  loadActivos(): void {
    this.loading = true;

    const params = {
      ...this.filtros,
      per_page: +this.filtros.per_page,
      page: this.paginacion.currentPage
    };

    this.activoService.listarActivos(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response?.success && response?.data) {
            this.activos = response.data.data || [];
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
        error: () => {
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
    this.paginacion.currentPage = page;
    this.filtros.page = page;
    this.loadActivos();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      responsable_id: '',
      unidad_organica_id: '',
      ubicacion_id: '',
      estado: '',
      categoria_id: '',
      per_page: this.cv.defaultPageSize || 20,
      page: 1
    };
    this.paginacion.currentPage = 1;
    this.loadActivos();
  }

  getPagesArray(): (number | string)[] {
    const total = this.paginacion.lastPage;
    const current = this.paginacion.currentPage;

    if (total <= 7) {
      const pages: (number | string)[] = [];
      for (let i = 1; i <= total; i++) pages.push(i);
      return pages;
    }

    if (current <= 3) {
      const pages: (number | string)[] = [];
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
      return pages;
    }
    if (current >= total - 2) {
      const pages: (number | string)[] = [1, '...'];
      for (let i = total - 3; i <= total; i++) pages.push(i);
      return pages;
    }
    return [1, '...', current - 1, current, current + 1, '...', total];
  }

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return 'S/ 0.00';
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(n)) return 'S/ 0.00';
    return 'S/ ' + n.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }

  getEstadoBadgeClass(estado: string): string {
    const map: Record<string, string> = {
      activo: 'ds-badge-success',
      baja: 'ds-badge-danger',
      transferido: 'ds-badge-info',
      extraviado: 'ds-badge-warning'
    };
    return map[estado] || 'ds-badge-secondary';
  }

  getCondicionBadgeClass(condicion: string): string {
    const map: Record<string, string> = {
      bueno: 'ds-badge-success',
      regular: 'ds-badge-warning',
      malo: 'ds-badge-danger',
      obsoleto: 'ds-badge-secondary'
    };
    return map[condicion] || 'ds-badge-secondary';
  }

  // Export base
  getExportData(): Record<string, unknown>[] {
    return this.activos.map(a => ({
      codigo_patrimonial: a.codigo_patrimonial,
      codigo_sbn: a.codigo_sbn,
      descripcion: a.descripcion,
      categoria: a.categoria?.nombre,
      ubicacion: a.ubicacion?.nombre,
      unidad_organica: a.unidad_organica?.name || '-',
      responsable: a.responsable?.name || 'Sin asignar',
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
      { key: 'unidad_organica', label: 'Unidad Orgánica' },
      { key: 'responsable', label: 'Responsable' },
      { key: 'valor_neto', label: 'Valor Neto', format: v => v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '' },
      { key: 'estado', label: 'Estado' },
      { key: 'condicion', label: 'Condición' }
    ];
  }

  getExportTitle(): string {
    return 'Reporte de Activos Fijos';
  }

  getExportFilename(): string {
    return 'reporte-activos-fijos';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
