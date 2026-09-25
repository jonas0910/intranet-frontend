import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-lp-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  providers: [DatePipe],
  template: `
<app-system-layout [title]="'Gestor de Reportes - Limpieza Pública'"
  [subtitle]="'Consulta consolidada de recolección de residuos, rutas y efectividad operativa'"
  [subtitleItems]="[
    { label: 'Reportes estadísticos', icon: 'fas fa-chart-pie' },
    { label: 'Reportes detallados', icon: 'fas fa-file-alt' },
    { label: 'Reportes estadísticos de la recolección de residuos selectivos', icon: 'fas fa-chart-bar' }
  ]"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Limpieza Pública', url: '/limpieza-publica'}, {label: 'Reportes'}]"
  [subsystem]="'limpieza-publica'">

  <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-indigo'"
    [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">

    <!-- Toolbar -->
    <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
      <div class="d-flex align-items-center flex-wrap" style="gap: 6px;">
        <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
          <i class="fas fa-filter mr-1"></i> Reporte de Recolecciones
        </h3>
        <span class="badge badge-info ml-2">{{ paginacion.total }} registros</span>
        
        <button class="btn btn-sm btn-outline-info ml-2 px-2" (click)="isFiltersCollapsed = !isFiltersCollapsed"
          [title]="isFiltersCollapsed ? 'Ver filtros' : 'Ocultar filtros'" style="height: 24px; line-height: 1;">
          <i class="fas" [ngClass]="isFiltersCollapsed ? 'fa-filter' : 'fa-filter-circle-xmark'"></i>
        </button>

        <ng-container *ngIf="cv.showExportButtons">
          <button type="button" class="btn btn-sm btn-flat ml-3" [ngClass]="cv.excelBtnClass || 'btn-success'"
            (click)="onExportExcel()">
            <i [class]="(cv.excelBtnIcon || 'fas fa-file-excel') + ' mr-1'"></i> {{ cv.excelBtnLabel || 'Excel' }}
          </button>
          <button type="button" class="btn btn-sm btn-flat" [ngClass]="cv.pdfBtnClass || 'btn-danger'"
            (click)="onExportPdf()">
            <i [class]="(cv.pdfBtnIcon || 'fas fa-file-pdf') + ' mr-1'"></i> {{ cv.pdfBtnLabel || 'PDF' }}
          </button>
        </ng-container>
      </div>
    </div>

    <!-- Filtros -->
    <div class="border-bottom bg-light overflow-hidden transition-all"
      [style.max-height]="isFiltersCollapsed ? '0px' : '500px'" [style.padding]="isFiltersCollapsed ? '0px' : '0.8rem'">

      <div class="row g-2">
        <div class="col-md-3">
          <label class="mb-1 ds-crud-label">Ruta</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_ruta" (change)="onFilterChange()">
            <option value="">Todas las rutas</option>
            <option *ngFor="let r of rutas" [value]="r.id_ruta">{{ r.nombre }}</option>
          </select>
        </div>

        <div class="col-md-3">
          <label class="mb-1 ds-crud-label">Sector</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_sector" (change)="onFilterChange()">
            <option value="">Todos los sectores</option>
            <option *ngFor="let s of sectores" [value]="s.id_sector">{{ s.nombre_sector }}</option>
          </select>
        </div>
        
        <div class="col-md-2">
          <label class="mb-1 ds-crud-label">Vehículo</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_vehiculo" (change)="onFilterChange()">
            <option value="">Cualquier vehículo</option>
            <option *ngFor="let v of vehiculos" [value]="v.id_vehiculo">{{ v.placa }} - {{ v.modelo }}</option>
          </select>
        </div>

        <div class="col-md-2">
          <label class="mb-1 ds-crud-label">Tipo Residuo</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_tipo_residuo" (change)="onFilterChange()">
            <option value="">Todos los tipos</option>
            <option *ngFor="let t of tiposResiduo" [value]="t.id_tipo_residuo">{{ t.nombre }}</option>
          </select>
        </div>

        <div class="col-md-2">
          <label class="mb-1 ds-crud-label">Origen</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_origen" (change)="onFilterChange()">
            <option value="">Cualquier origen</option>
            <option *ngFor="let o of origenesResiduo" [value]="o.id_origen_residuo">{{ o.nombre }}</option>
          </select>
        </div>

        <div class="col-md-3">
          <label class="mb-1 ds-crud-label">Rango de Fechas</label>
          <div class="d-flex" style="gap: 5px;">
            <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fecha_desde" (change)="onFilterChange()">
            <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fecha_hasta" (change)="onFilterChange()">
          </div>
        </div>

        <div class="col-md-1">
          <label class="mb-1 ds-crud-label">Registros</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.per_page" (change)="onFilterChange()">
            <option *ngFor="let size of [10, 20, 50, 100]" [value]="size">{{ size }}</option>
          </select>
        </div>

        <div class="col-md-2 d-flex align-items-end">
          <button class="btn btn-sm btn-outline-secondary btn-block" (click)="limpiarFiltros()">
            <i class="fas fa-redo mr-1"></i> Limpiar
          </button>
        </div>
      </div>
    </div>

    <!-- Loading -->
    <div *ngIf="loading" class="text-center p-5">
      <div class="spinner-border text-primary" role="status"></div>
      <p class="mt-3">Generando reporte de limpieza...</p>
    </div>

    <!-- DataTable -->
    <div *ngIf="!loading" class="card-body px-0 pt-0 pb-2">
      <div class="table-responsive p-0">
        <table class="table table-hover table-sm mb-0 ds-crud-table" [ngClass]="cv.tableClasses">
          <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
            <tr>
              <th class="px-3" style="width: 40px;">#</th>
              <th>Fecha / Hora</th>
              <th>Ruta / Sector</th>
              <th>Vehículo</th>
              <th>Tipo Residuo</th>
              <th>Origen</th>
              <th class="text-right px-3">Peso (KG)</th>
              <th>Colaborador</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of recolecciones; let i = index">
              <td class="px-3 text-muted">{{ (paginacion.currentPage - 1) * paginacion.perPage + i + 1 }}</td>
              <td>
                <div>{{ item.created_at | date:'dd/MM/yyyy' }}</div>
                <small class="text-muted">{{ item.created_at | date:'HH:mm' }}</small>
              </td>
              <td>
                <div class="font-weight-bold">{{ item.ruta?.nombre || 'Sin Ruta' }}</div>
                <small class="text-primary">{{ item.sector?.nombre_sector || 'General' }}</small>
              </td>
              <td>
                <div *ngIf="item.vehiculo">
                    <i class="fas fa-truck mr-1 text-muted"></i>{{ item.vehiculo.placa }}
                    <br><small class="text-muted">{{ item.vehiculo.modelo }}</small>
                </div>
                <span *ngIf="!item.vehiculo" class="text-muted small">N/A</span>
              </td>
              <td><span class="badge badge-light border">{{ item.tipo_residuo?.nombre }}</span></td>
              <td><small>{{ item.origen_residuo?.nombre || '-' }}</small></td>
              <td class="text-right px-3 font-weight-bold text-success">{{ item.peso_kg | number:'1.2-2' }}</td>
              <td>
                <span class="badge badge-pill" [ngClass]="{
                    'badge-primary': item.tipo_colaborador === 'interno',
                    'badge-warning': item.tipo_colaborador === 'campana',
                    'badge-success': item.tipo_colaborador === 'organizacion'
                }">{{ item.tipo_colaborador | titlecase }}</span>
              </td>
            </tr>
            <tr *ngIf="recolecciones.length === 0">
              <td colspan="8" class="text-center p-5 text-muted">
                <i class="fas fa-search fa-3x mb-3 opacity-20"></i>
                <p>No se encontraron registros de recolección para los filtros seleccionados.</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Paginación -->
    <div *ngIf="!loading && paginacion.lastPage > 1" class="card-footer clearfix bg-white border-top">
        <ul class="pagination pagination-sm m-0 float-right">
          <li class="page-item" [class.disabled]="paginacion.currentPage === 1">
            <a class="page-link" (click)="onPageChange(paginacion.currentPage - 1)">‹</a>
          </li>
          <li class="page-item" *ngFor="let p of [].constructor(paginacion.lastPage); let i = index" 
              [class.active]="i + 1 === paginacion.currentPage">
            <a class="page-link" (click)="onPageChange(i + 1)">{{ i + 1 }}</a>
          </li>
          <li class="page-item" [class.disabled]="paginacion.currentPage === paginacion.lastPage">
            <a class="page-link" (click)="onPageChange(paginacion.currentPage + 1)">›</a>
          </li>
        </ul>
        <div class="text-muted small mt-1">
            Mostrando {{ recolecciones.length }} de {{ paginacion.total }} registros
        </div>
    </div>
  </div>

</app-system-layout>
`,
  styles: [`
    .ds-crud-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6c757d; }
    .ds-crud-filter { border-radius: 4px; }
    .transition-all { transition: all 0.3s ease-in-out; }
    .badge-primary { background-color: #007bff; color: white; }
  `]
})
export class LpReportesComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private lpService = inject(LimpiezaPublicaService);
  private datePipe = inject(DatePipe);

  loading = false;
  isFiltersCollapsed = false;

  recolecciones: any[] = [];
  rutas: any[] = [];
  vehiculos: any[] = [];
  tiposResiduo: any[] = [];
  origenesResiduo: any[] = [];
  sectores: any[] = [];

  filtros: any = {
    id_ruta: '',
    id_vehiculo: '',
    id_tipo_residuo: '',
    id_origen: '',
    id_sector: '',
    fecha_desde: '',
    fecha_hasta: '',
    per_page: 20
  };

  paginacion = {
    total: 0,
    currentPage: 1,
    lastPage: 1,
    perPage: 20
  };

  constructor(crudExport: CrudExportService) {
    super(crudExport);
  }

  /** Sobrescribir cv para usar el subsistema correcto */
  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('limpieza-publica');
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarReporte();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogos(): void {
    this.lpService.getRutas().subscribe(res => this.rutas = res.data || []);
    this.lpService.getVehiculos().subscribe(res => this.vehiculos = res.data || []);
    this.lpService.getCatalogos().subscribe(res => {
      if (res.success) {
        this.tiposResiduo = res.data.tipos_residuo || [];
        this.origenesResiduo = res.data.origenes_residuo || [];
        this.sectores = res.data.sectores || [];
      }
    });
  }

  cargarReporte(page: number = 1): void {
    this.loading = true;
    const params = { ...this.filtros, page };

    this.lpService.getRecolecciones(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.recolecciones = res.data || [];
          this.paginacion.total = res.meta?.total || 0;
          this.paginacion.currentPage = res.meta?.current_page || 1;
          this.paginacion.lastPage = Math.ceil(this.paginacion.total / this.filtros.per_page);
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onFilterChange(): void {
    this.cargarReporte(1);
  }

  onPageChange(page: number): void {
    if (page < 1 || page > this.paginacion.lastPage) return;
    this.cargarReporte(page);
  }

  limpiarFiltros(): void {
    this.filtros = {
      id_ruta: '',
      id_vehiculo: '',
      id_tipo_residuo: '',
      id_origen: '',
      id_sector: '',
      fecha_desde: '',
      fecha_hasta: '',
      per_page: 20
    };
    this.cargarReporte(1);
  }

  // --- Implementación de Exportación (CrudListExportBase) ---

  getExportData(): Record<string, unknown>[] {
    return this.recolecciones.map(item => ({
      fecha: this.datePipe.transform(item.created_at, 'dd/MM/yyyy HH:mm'),
      ruta: item.ruta?.nombre || 'Sin Ruta',
      sector: item.sector?.nombre_sector || 'General',
      vehiculo: item.vehiculo?.placa || '-',
      tipo_residuo: item.tipo_residuo?.nombre,
      origen: item.origen_residuo?.nombre || '-',
      peso_kg: item.peso_kg,
      colaborador: item.tipo_colaborador
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'fecha', label: 'Fecha/Hora' },
      { key: 'ruta', label: 'Ruta' },
      { key: 'sector', label: 'Sector' },
      { key: 'vehiculo', label: 'Vehículo' },
      { key: 'tipo_residuo', label: 'Tipo Residuo' },
      { key: 'origen', label: 'Origen' },
      { key: 'peso_kg', label: 'Peso (KG)', format: (v) => Number(v).toFixed(2) },
      { key: 'colaborador', label: 'Colaborador', format: (v) => String(v).toUpperCase() }
    ];
  }

  getExportTitle(): string {
    return 'Consolidado de Recolección de Residuos';
  }

  getExportFilename(): string {
    return 'recoleccion_limpieza_publica';
  }
}
