import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlmacenService } from '../services/almacen.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { AlmacenUnitSelectorComponent } from '../components/unit-selector/unit-selector.component';

@Component({
  selector: 'app-alm-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, AlmacenUnitSelectorComponent],
  providers: [DatePipe],
  template: `
<app-system-layout [title]="'Gestor de Reportes - Almacén'"
  [subtitle]="'Consulta consolidada de movimientos, entradas, salidas y existencias'"
  [subtitleItems]="[
    { label: 'Reportes de stock', icon: 'fas fa-boxes' },
    { label: 'Historial de movimientos', icon: 'fas fa-history' },
    { label: 'Exportaciones oficiales', icon: 'fas fa-file-export' }
  ]"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Almacén', url: '/almacen'}, {label: 'Reportes'}]"
  [subsystem]="'almacen'">

  <div class="mb-3 d-flex justify-content-end align-items-center">
        <app-almacen-unit-selector></app-almacen-unit-selector>
  </div>

  <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-primary'"
    [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">

    <!-- Toolbar -->
    <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
      <div class="d-flex align-items-center flex-wrap" style="gap: 6px;">
        <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
          <i class="fas fa-filter mr-1"></i> Reporte de Movimientos
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
          <label class="mb-1 ds-crud-label">Tipo Movimiento</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.tipo" (change)="onFilterChange()">
            <option value="">Todos los tipos</option>
            <option value="ENTRADA">ENTRADA</option>
            <option value="SALIDA">SALIDA</option>
          </select>
        </div>

        <div class="col-md-3">
          <label class="mb-1 ds-crud-label">Categoría</label>
          <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_categoria" (change)="onFilterChange()">
            <option value="">Todas las categorías</option>
            <option *ngFor="let c of categorias" [value]="c.id_categoria">{{ c.nombre }}</option>
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
          <label class="mb-1 ds-crud-label">Regs</label>
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
      <p class="mt-3">Generando reporte de almacén...</p>
    </div>

    <!-- DataTable -->
    <div *ngIf="!loading" class="card-body px-0 pt-0 pb-2">
      <div class="table-responsive p-0">
        <table class="table table-hover table-sm mb-0 ds-crud-table" [ngClass]="cv.tableClasses">
          <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
            <tr>
              <th class="px-3" style="width: 40px;">#</th>
              <th>Fecha</th>
              <th>Documento</th>
              <th>Tipo</th>
              <th>Bien</th>
              <th>Categoría</th>
              <th class="text-right">Cantidad</th>
              <th class="text-right px-3">Costo Total</th>
              <th>Registrado Por</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of movimientos; let i = index">
              <td class="px-3 text-muted">{{ (paginacion.currentPage - 1) * paginacion.perPage + i + 1 }}</td>
              <td>
                <div>{{ item.fecha | date:'dd/MM/yyyy' }}</div>
                <small class="text-muted">{{ item.fecha | date:'HH:mm' }}</small>
              </td>
              <td>
                <span class="font-weight-bold">{{ item.documento_ref || '-' }}</span>
              </td>
              <td>
                  <span class="badge badge-pill" [ngClass]="{
                    'badge-success': item.tipo === 'ENTRADA',
                    'badge-danger': item.tipo === 'SALIDA',
                    'badge-warning': item.tipo === 'AJUSTE',
                    'badge-info': item.tipo === 'TRANSFERENCIA'
                  }">{{ item.tipo }}</span>
              </td>
              <td>
                <div class="font-weight-bold text-truncate" style="max-width: 200px;" [title]="item.bien?.nombre">{{ item.bien?.nombre }}</div>
                <small class="text-muted">Cód: {{ item.bien?.codigo }}</small>
              </td>
              <td><small class="text-primary">{{ item.bien?.categoria?.nombre }}</small></td>
              <td class="text-right font-weight-bold" [ngClass]="item.tipo === 'ENTRADA' ? 'text-success' : (item.tipo === 'SALIDA' ? 'text-danger' : 'text-dark')">
                {{ item.tipo === 'ENTRADA' ? '+' : (item.tipo === 'SALIDA' ? '-' : '') }}{{ item.cantidad | number }} <small class="text-muted">{{ item.bien?.unidad?.codigo }}</small>
              </td>
              <td class="text-right px-3 font-weight-bold text-dark">S/ {{ item.costo_total | number:'1.2-2' }}</td>
              <td><small>{{ item.usuario?.name }}</small></td>
            </tr>
            <tr *ngIf="movimientos.length === 0">
              <td colspan="9" class="text-center p-5 text-muted">
                <i class="fas fa-search fa-3x mb-3 opacity-20"></i>
                <p>No se encontraron registros de movimientos para los filtros seleccionados.</p>
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
            Mostrando {{ movimientos.length }} de {{ paginacion.total }} registros
        </div>
    </div>
  </div>

</app-system-layout>
`,
  styles: [`
    .ds-crud-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6c757d; }
    .ds-crud-filter { border-radius: 4px; }
    .transition-all { transition: all 0.3s ease-in-out; }
  `]
})
export class AlmReportesComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private api = inject(AlmacenService);
  private datePipe = inject(DatePipe);

  loading = false;
  isFiltersCollapsed = false;

  movimientos: any[] = [];
  categorias: any[] = [];

  filtros: any = {
    tipo: '',
    id_categoria: '',
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
    return this.dsService.getCrudViewFor('almacen');
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    
    // Suscribirse al cambio de unidad para recargar el reporte dinámicamente
    this.api.selectedUnitId$.subscribe(() => {
        this.cargarReporte();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarCatalogos(): void {
    this.api.getCategorias().pipe(takeUntil(this.destroy$)).subscribe((res: any) => {
      if (res.success) this.categorias = res.data || [];
    });
  }

  cargarReporte(page: number = 1): void {
    this.loading = true;
    const params = { ...this.filtros, page };

    this.api.getMovimientos(params).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          this.movimientos = res.data || [];
          this.paginacion.total = res.meta?.total || 0;
          this.paginacion.currentPage = res.meta?.current_page || 1;
          this.paginacion.lastPage = res.meta?.last_page || Math.ceil(this.paginacion.total / this.filtros.per_page);
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
      tipo: '',
      id_categoria: '',
      fecha_desde: '',
      fecha_hasta: '',
      per_page: 20
    };
    this.cargarReporte(1);
  }

  // --- Implementación de Exportación (CrudListExportBase) ---

  getExportData(): Record<string, unknown>[] {
    return this.movimientos.map(item => ({
      fecha: this.datePipe.transform(item.fecha, 'dd/MM/yyyy HH:mm'),
      documento: item.documento_ref || '-',
      tipo: item.tipo,
      bien_codigo: item.bien?.codigo,
      bien_nombre: item.bien?.nombre,
      categoria: item.bien?.categoria?.nombre || '-',
      unidad: item.bien?.unidad?.codigo,
      cantidad: item.cantidad,
      costo_unitario: item.costo_unitario,
      costo_total: item.costo_total,
      registrado_por: item.usuario?.name || 'Sistema'
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'fecha', label: 'Fecha/Hora' },
      { key: 'documento', label: 'Documento' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'bien_codigo', label: 'Código' },
      { key: 'bien_nombre', label: 'Bien' },
      { key: 'categoria', label: 'Categoría' },
      { key: 'cantidad', label: 'Cantidad', format: (v) => Number(v).toFixed(0) },
      { key: 'unidad', label: 'U.M.' },
      { key: 'costo_unitario', label: 'Costo Unit. (S/)', format: (v) => Number(v).toFixed(2) },
      { key: 'costo_total', label: 'Costo Total (S/)', format: (v) => Number(v).toFixed(2) },
      { key: 'registrado_por', label: 'Usuario' }
    ];
  }

  getExportTitle(): string {
    return 'Consolidado de Movimientos Administrativos del Almacén';
  }

  getExportFilename(): string {
    return 'movimientos_almacen_institucional';
  }
}
