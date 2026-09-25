import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var $: any;

@Component({
    selector: 'app-lp-recoleccion',
    standalone: true,
    imports: [CommonModule, FormsModule, SystemLayoutComponent],
    template: `
    <app-system-layout [title]="'Operaciones de Recolección'" [subtitle]="'Control de pesaje y disposición de residuos'"
      [subtitleItems]="[
        { label: 'Reporte de cantidad de residuos sólidos que ingresan al botadero', icon: 'fas fa-weight' },
        { label: 'Registro de información de áreas y jardines', icon: 'fas fa-leaf' }
      ]"
      [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Limpieza Pública', url: '/limpieza-publica'}, {label: 'Recolección'}]"
      [subsystem]="'limpieza-publica'">

      <!-- Header / Métricas Rápidas -->
      <div class="row mb-4">
        <div class="col-md-3">
          <div class="ds-stat-card bg-white p-3 rounded shadow-sm border-left border-primary border-lg">
            <div class="d-flex align-items-center">
              <div class="ds-stat-icon bg-primary-light text-primary rounded-circle p-3 mr-3">
                <i class="fas fa-weight-hanging fa-lg"></i>
              </div>
              <div>
                <p class="text-muted small mb-0 font-weight-bold">TOTAL HOY</p>
                <h3 class="mb-0 font-weight-bold text-dark">{{ totalHoyKg | number:'1.2-2' }} <small>kg</small></h3>
              </div>
            </div>
          </div>
        </div>
        <div class="col-md-3">
          <div class="ds-stat-card bg-white p-3 rounded shadow-sm border-left border-success border-lg">
            <div class="d-flex align-items-center">
              <div class="ds-stat-icon bg-success-light text-success rounded-circle p-3 mr-3">
                <i class="fas fa-truck-loading fa-lg"></i>
              </div>
              <div>
                <p class="text-muted small mb-0 font-weight-bold">REGISTROS</p>
                <h3 class="mb-0 font-weight-bold text-dark">{{ paginacion.total }}</h3>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="card elevation-1 border-0" style="border-radius: 12px;">
        <!-- Toolbar Table -->
        <div class="card-header bg-white py-3">
          <div class="d-flex justify-content-between align-items-center">
            <h3 class="card-title font-weight-bold text-dark mb-0">
                <i class="fas fa-list-ul mr-2 text-primary"></i> Historial de Pesajes
            </h3>
            <div class="d-flex align-items-center" style="gap: 10px;">
                <button class="btn btn-sm btn-outline-secondary rounded-pill" (click)="filtrosColapsados = !filtrosColapsados">
                    <i class="fas fa-filter mr-1"></i> {{ filtrosColapsados ? 'Ver Filtros' : 'Ocultar Filtros' }}
                </button>
                <button class="btn btn-sm btn-light rounded-circle shadow-sm" (click)="cargarDatos()"><i class="fas fa-sync"></i></button>
                <button [class]="'btn btn-sm ' + cv.newBtnClass + ' rounded-pill shadow-sm font-weight-bold'" (click)="abrirNuevo()">
                    <i [class]="cv.newBtnIcon + ' mr-1'"></i> Registrar Pesaje
                </button>
            </div>
          </div>
        </div>

        <!-- Filtros Colapsables -->
        <div class="bg-light border-bottom overflow-hidden" [style.max-height]="filtrosColapsados ? '0px' : '300px'" style="transition: max-height 0.3s ease;">
            <div class="p-3">
                <div class="row">
                    <div class="col-md-3">
                        <label class="ds-crud-label">TIPO COLABORADOR</label>
                        <select class="form-control form-control-sm" [(ngModel)]="filtros.tipo_colaborador" (change)="onFilterChange()">
                            <option [ngValue]="undefined">Todos</option>
                            <option value="interno">Interno (Notaria)</option>
                            <option value="campana">Campaña</option>
                            <option value="organizacion">Organización</option>
                        </select>
                    </div>
                    <div class="col-md-3">
                        <label class="ds-crud-label">TIPO RESIDUO</label>
                        <select class="form-control form-control-sm" [(ngModel)]="filtros.id_tipo_residuo" (change)="onFilterChange()">
                            <option [ngValue]="undefined">Todos</option>
                            <option *ngFor="let t of catalogos?.tipos_residuo" [value]="t.id_tipo_residuo">{{ t.nombre }}</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <label class="ds-crud-label">RANGO FECHA</label>
                        <input type="date" class="form-control form-control-sm" [(ngModel)]="filtros.fecha_desde" (change)="onFilterChange()">
                    </div>
                    <div class="col-md-1 d-flex align-items-end">
                         <button class="btn btn-sm btn-outline-danger w-100" (click)="resetFiltros()"><i class="fas fa-times"></i></button>
                    </div>
                </div>
            </div>
        </div>

        <div class="card-body p-0">
          <div class="table-responsive">
            <table [class]="'table table-hover mb-0 ds-crud-table ' + (loading ? 'opacity-50' : '')">
              <thead [style.background-color]="cv.tableHeaderBg || '#f8f9fa'" [style.color]="cv.tableHeaderColor || '#333'">
                <tr>
                    <th class="px-4 border-0">FECHA / HORA</th>
                    <th class="border-0">COLABORADOR</th>
                    <th class="border-0">DESTINO / ORIGEN</th>
                    <th class="border-0">VEHÍCULO</th>
                    <th class="border-0 text-center">TIPO RESIDUO</th>
                    <th class="border-0 text-right pr-4">PESO (KG)</th>
                    <th class="border-0 text-center" style="width: 100px;">ACCIONES</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let r of recolecciones" class="ds-table-row">
                    <td class="px-4 align-middle">
                        <div class="font-weight-bold">{{ r.created_at | date:'dd/MM/yyyy' }}</div>
                        <small class="text-muted"><i class="far fa-clock mr-1"></i>{{ r.created_at | date:'HH:mm' }}</small>
                    </td>
                    <td class="align-middle">
                        <span [class]="'badge badge-pill border px-3 py-2 ' + getColabClass(r.tipo_colaborador)">
                            {{ r.tipo_colaborador | uppercase }}
                        </span>
                        <div class="small mt-1 text-dark font-weight-bold">
                            {{ r.campana?.nombre || r.organizacion?.nombre || 'SERVICIO INTERNO' }}
                        </div>
                    </td>
                    <td class="align-middle">
                        <div class="font-weight-bold text-primary" *ngIf="r.ruta"><i class="fas fa-route mr-1"></i>{{ r.ruta?.nombre }}</div>
                        <div class="small text-muted" *ngIf="r.sector"><i class="fas fa-map-marker-alt mr-1"></i>{{ r.sector?.nombre_sector }}</div>
                        <div class="small text-success mt-1" *ngIf="r.origen_residuo"><i class="fas fa-home mr-1"></i>{{ r.origen_residuo?.nombre }}</div>
                    </td>
                    <td class="align-middle">
                        <div *ngIf="r.vehiculo" class="ds-vehiculo-tag">
                            <span class="placa-label">{{ r.vehiculo?.placa }}</span>
                            <small class="d-block text-muted text-xs">{{ r.vehiculo?.tipo }}</small>
                        </div>
                        <span *ngIf="!r.vehiculo" class="text-muted italic small">Particular / Externo</span>
                    </td>
                    <td class="align-middle text-center">
                        <span class="badge badge-light border px-2">{{ r.tipo_residuo?.nombre }}</span>
                    </td>
                    <td class="align-middle text-right pr-4 font-weight-bold h5 mb-0 text-dark">
                        {{ r.peso_kg | number:'1.2-2' }} <small class="text-muted">kg</small>
                    </td>
                    <td class="align-middle text-center">
                        <div class="btn-group btn-group-sm rounded-pill shadow-xs bg-white border">
                            <button class="btn btn-link text-warning p-2" title="Editar" (click)="abrirEditar(r)">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-link text-danger p-2 border-left" title="Eliminar" (click)="eliminar(r)">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
                <!-- Loading Skeletons -->
                <ng-container *ngIf="loading">
                    <tr *ngFor="let s of [1,2,3,4,5]">
                        <td class="px-4"><div class="skeleton-line w-75"></div></td>
                        <td><div class="skeleton-line w-50"></div></td>
                        <td><div class="skeleton-line w-100"></div></td>
                        <td><div class="skeleton-line w-50"></div></td>
                        <td class="text-center"><div class="skeleton-line mx-auto w-50"></div></td>
                        <td class="text-right pr-4"><div class="skeleton-line ml-auto w-50"></div></td>
                        <td><div class="skeleton-line mx-auto w-75"></div></td>
                    </tr>
                </ng-container>
                <tr *ngIf="!loading && !recolecciones.length">
                    <td colspan="7" class="text-center py-5 text-muted">
                        <div class="py-5">
                            <i class="fas fa-balance-scale fa-4x mb-3 text-light"></i>
                            <h4 class="font-weight-bold opacity-50">No se encontraron registros</h4>
                            <p>Intente cambiando los filtros de búsqueda.</p>
                        </div>
                    </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Pagination -->
        <div class="card-footer bg-white border-top-0 py-3" *ngIf="paginacion.lastPage > 1">
            <div class="d-flex justify-content-between align-items-center">
                <span class="text-muted small">Mostrando {{ (paginacion.currentPage - 1) * paginacion.perPage + 1 }} a {{ Math.min(paginacion.currentPage * paginacion.perPage, paginacion.total) }} de {{ paginacion.total }} registros</span>
                <ul class="pagination pagination-sm m-0">
                    <li class="page-item" [class.disabled]="paginacion.currentPage === 1">
                        <a class="page-link" (click)="cambiarPagina(paginacion.currentPage - 1)" href="javascript:void(0)"><i class="fas fa-chevron-left"></i></a>
                    </li>
                    <li class="page-item" *ngFor="let p of getPaginas()" [class.active]="p === paginacion.currentPage">
                        <a class="page-link" (click)="cambiarPagina(p)" href="javascript:void(0)">{{ p }}</a>
                    </li>
                    <li class="page-item" [class.disabled]="paginacion.currentPage === paginacion.lastPage">
                        <a class="page-link" (click)="cambiarPagina(paginacion.currentPage + 1)" href="javascript:void(0)"><i class="fas fa-chevron-right"></i></a>
                    </li>
                </ul>
            </div>
        </div>
      </div>

      <!-- MODAL REGISTRO / EDICION -->
      <div class="modal fade" id="modalRecoleccion" tabindex="-1" role="dialog" data-backdrop="static">
        <div class="modal-dialog modal-lg modal-dialog-centered" role="document">
            <div class="modal-content border-0 shadow-lg" [style.border-radius.px]="mc.borderRadius || 12">
                <div class="modal-header text-white" [style.background-color]="mc.headerBg || '#6610f2'">
                    <h5 class="modal-title font-weight-bold">
                        <i [class]="(editando ? 'fas fa-edit' : 'fas fa-balance-scale') + ' mr-2'"></i> 
                        {{ editando ? 'Actualizar Registro de Pesaje' : 'Nuevo Registro de Recolección' }}
                    </h5>
                    <button type="button" class="close text-white" (click)="cerrarModal()"><span>&times;</span></button>
                </div>
                <div class="modal-body p-4 bg-light">
                    <form #recForm="ngForm">
                        <div class="row">
                            <!-- Columna 1: Clasificación -->
                            <div class="col-md-5">
                                <div class="card card-body border-0 shadow-none bg-white h-100">
                                    <h6 class="font-weight-bold text-primary mb-3"><i class="fas fa-user-tag mr-1"></i> Clasificación</h6>
                                    
                                    <div class="form-group">
                                        <label class="ds-crud-label">TIPO DE COLABORADOR <span class="text-danger">*</span></label>
                                        <div class="d-flex gap-2 mb-3">
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" id="col_int" name="tipo_col" class="custom-control-input" value="interno" [(ngModel)]="form.tipo_colaborador" required>
                                                <label class="custom-control-label small" for="col_int">Interno</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" id="col_cam" name="tipo_col" class="custom-control-input" value="campana" [(ngModel)]="form.tipo_colaborador" required>
                                                <label class="custom-control-label small" for="col_cam">Campaña</label>
                                            </div>
                                            <div class="custom-control custom-radio custom-control-inline">
                                                <input type="radio" id="col_org" name="tipo_col" class="custom-control-input" value="organizacion" [(ngModel)]="form.tipo_colaborador" required>
                                                <label class="custom-control-label small" for="col_org">Org.</label>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- Campos Dinámicos -->
                                    <div class="form-group animate__animated animate__fadeIn" *ngIf="form.tipo_colaborador === 'campana'">
                                        <label class="ds-crud-label">SELECCIONAR CAMPAÑA <span class="text-danger">*</span></label>
                                        <select class="form-control" name="id_campana" [(ngModel)]="form.id_campana" required>
                                            <option [ngValue]="undefined" disabled>Elija campaña...</option>
                                            <option *ngFor="let c of catalogos?.campanas" [value]="c.id_campana">{{ c.nombre }}</option>
                                        </select>
                                    </div>

                                    <div class="form-group animate__animated animate__fadeIn" *ngIf="form.tipo_colaborador === 'organizacion'">
                                        <label class="ds-crud-label">ORGANIZACIÓN / PUESTO <span class="text-danger">*</span></label>
                                        <select class="form-control" name="id_organizacion" [(ngModel)]="form.id_organizacion" required>
                                            <option [ngValue]="undefined" disabled>Elija organización...</option>
                                            <option *ngFor="let o of catalogos?.organizaciones" [value]="o.id_organizacion">{{ o.nombre }} ({{ o.tipo }})</option>
                                        </select>
                                    </div>

                                    <div class="form-group" *ngIf="form.tipo_colaborador === 'interno'">
                                        <label class="ds-crud-label">RUTA / RECORRIDO</label>
                                        <select class="form-control" name="id_ruta" [(ngModel)]="form.id_ruta">
                                            <option [ngValue]="undefined">Ruta No Especificada</option>
                                            <option *ngFor="let ruta of catalogos?.rutas" [value]="ruta.id_ruta">{{ ruta.nombre }}</option>
                                        </select>
                                    </div>

                                    <div class="form-group">
                                        <label class="ds-crud-label">ZONA / SECTOR</label>
                                        <select class="form-control" name="id_sector" [(ngModel)]="form.id_sector">
                                            <option [ngValue]="undefined">Seleccione sector...</option>
                                            <option *ngFor="let s of catalogos?.sectores" [value]="s.id_sector">{{ s.nombre_sector }}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Columna 2: Pesaje -->
                            <div class="col-md-7">
                                <div class="card card-body border-0 shadow-none bg-white h-100">
                                    <h6 class="font-weight-bold text-success mb-3"><i class="fas fa-weight mr-1"></i> Detalles de la Carga</h6>
                                    
                                    <div class="row">
                                        <div class="col-md-6 form-group">
                                            <label class="ds-crud-label">TIPO DE RESIDUO <span class="text-danger">*</span></label>
                                            <select class="form-control" name="id_tipo_residuo" [(ngModel)]="form.id_tipo_residuo" required>
                                                <option [ngValue]="undefined" disabled>Seleccionar tipo...</option>
                                                <option *ngFor="let t of catalogos?.tipos_residuo" [value]="t.id_tipo_residuo">{{ t.nombre }}</option>
                                            </select>
                                        </div>
                                        <div class="col-md-6 form-group">
                                            <label class="ds-crud-label">ORIGEN DEL RESIDUO <span class="text-danger">*</span></label>
                                            <select class="form-control" name="id_origen" [(ngModel)]="form.id_origen" required>
                                                <option [ngValue]="undefined" disabled>Seleccionar origen...</option>
                                                <option *ngFor="let o of catalogos?.origenes_residuo" [value]="o.id_origen">{{ o.nombre }}</option>
                                            </select>
                                        </div>
                                        <div class="col-md-12 form-group">
                                            <label class="ds-crud-label d-block text-center mb-1">PESO DE LA CARGA (KILOGRAMOS)</label>
                                            <div class="input-group input-group-lg">
                                                <input type="number" class="form-control text-center font-weight-bold text-primary" style="font-size: 2.5rem; height: auto;" name="peso_kg" [(ngModel)]="form.peso_kg" required placeholder="0.00">
                                                <div class="input-group-append">
                                                    <span class="input-group-text bg-primary text-white font-weight-bold">KG</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="col-md-12 form-group mt-2">
                                            <label class="ds-crud-label">VEHÍCULO Notaria (OPCIONAL)</label>
                                            <select class="form-control" name="id_vehiculo" [(ngModel)]="form.id_vehiculo">
                                                <option [ngValue]="undefined">Vehículo Particular / Externo / No especificado</option>
                                                <option *ngFor="let v of catalogos?.vehiculos" [value]="v.id_vehiculo">{{ v.placa }} - {{ v.tipo }}</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
                <div class="modal-footer bg-white border-top-0">
                    <button type="button" class="btn btn-link text-muted" (click)="cerrarModal()">Cancelar</button>
                    <button type="button" [class]="'btn px-5 rounded-pill shadow ' + (editando ? 'btn-warning' : 'btn-primary')" (click)="guardarRegistro()" [disabled]="!recForm.valid || guardando">
                        <i [class]="(guardando ? 'fas fa-spinner fa-spin' : (editando ? 'fas fa-save' : 'fas fa-check-circle')) + ' mr-2'"></i> 
                        {{ guardando ? 'Guardando...' : (editando ? 'Actualizar Cambios' : 'Confirmar Pesaje') }}
                    </button>
                </div>
            </div>
        </div>
      </div>

    </app-system-layout>
  `,
    styles: [`
    .skeleton-line { height: 12px; background: #e9ecef; border-radius: 4px; position: relative; overflow: hidden; }
    .skeleton-line::after { content: ""; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); animation: skeleton-loading 1.5s infinite; }
    @keyframes skeleton-loading { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
    
    .ds-table-row { transition: all 0.2s; }
    .ds-table-row:hover { background-color: #f8f9ff !important; transform: scale(1.002); }
    
    .bg-primary-light { background-color: rgba(0, 123, 255, 0.08); }
    .bg-success-light { background-color: rgba(40, 167, 69, 0.1); }
    .text-primary { color: #007bff; }
    .bg-primary { background-color: #007bff; }
    
    .border-primary { border-color: #007bff !important; }
    .border-lg { border-left-width: 5px !important; }
    
    .badge-campana { background-color: #e3f2fd; color: #1976d2; border-color: #bbdefb; }
    .badge-organizacion { background-color: #f3e5f5; color: #7b1fa2; border-color: #e1bee7; }
    .badge-interno { background-color: #e8f5e9; color: #2e7d32; border-color: #c8e6c9; }
    
    .ds-vehiculo-tag { background: #f1f3f5; padding: 4px 10px; border-radius: 6px; border-left: 3px solid #fd7e14; }
    .placa-label { font-family: 'Roboto Mono', monospace; font-weight: bold; color: #212529; }
    
    .select-lg { height: calc(1.5em + 1rem + 2px); font-size: 1.1rem; }
  `]
})
export class LpRecoleccionComponent extends CrudListExportBase implements OnInit, OnDestroy {
    Math = Math;
    // Estado UI
    loading = false;
    guardando = false;
    editando = false;
    filtrosColapsados = true;

    // Datos
    recolecciones: any[] = [];
    catalogos: any;
    totalHoyKg = 0;

    filtros: any = {
        tipo_colaborador: undefined,
        id_tipo_residuo: undefined,
        fecha_desde: new Date().toISOString().split('T')[0],
        per_page: 15
    };

    paginacion: any = {
        total: 0,
        currentPage: 1,
        lastPage: 1,
        perPage: 15
    };

    form: any = {
        tipo_colaborador: 'interno',
        id_ruta: undefined,
        id_sector: undefined,
        id_vehiculo: undefined,
        id_tipo_residuo: undefined,
        id_origen: undefined,
        peso_kg: undefined,
        id_campana: undefined,
        id_organizacion: undefined
    };

    private destroy$ = new Subject<void>();
    private lpService = inject(LimpiezaPublicaService);
    public ds = inject(DesignSystemService);




    constructor(crudExport: CrudExportService) {
        super(crudExport);
    }


    getExportData(): Record<string, unknown>[] {
        return [];
    }

    getExportColumns(): CrudExportColumn[] {
        return [];
    }

    getExportTitle(): string {
        return 'Exportar';
    }

    getExportFilename(): string {
        return 'export';
    }

    ngOnInit(): void {
        this.cargarCatalogos();
        this.cargarDatos();
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    cargarCatalogos(): void {
        this.lpService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => this.catalogos = res.data
        });
    }

    cargarDatos(pagina: number = 1): void {
        this.loading = true;
        const params = { ...this.filtros, page: pagina };
        this.lpService.getRecolecciones(params).pipe(takeUntil(this.destroy$)).subscribe({
            next: (res: any) => {
                this.recolecciones = res.data;
                this.paginacion = {
                    total: res.meta.total,
                    currentPage: res.meta.current_page,
                    lastPage: res.meta.last_page,
                    perPage: res.meta.per_page
                };
                // Calculamos el total de hoy solo si no hay filtros o si el filtro es de hoy
                const hoy = new Date().toISOString().split('T')[0];
                if (this.filtros.fecha_desde === hoy) {
                    this.totalHoyKg = this.recolecciones.reduce((acc, curr) => acc + parseFloat(curr.peso_kg || 0), 0);
                } else if (!this.totalHoyKg) {
                    // Si ya teníamos un total lo mantenemos o lo pedimos al backend (resumen)
                    // Por simplicidad, si el filtro es hoy lo actualizamos.
                }
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    onFilterChange(): void {
        this.cargarDatos(1);
    }

    resetFiltros(): void {
        this.filtros = {
            tipo_colaborador: undefined,
            id_tipo_residuo: undefined,
            fecha_desde: new Date().toISOString().split('T')[0],
            per_page: 15
        };
        this.cargarDatos(1);
    }

    getPaginas(): number[] {
        const pages = [];
        for (let i = 1; i <= this.paginacion.lastPage; i++) pages.push(i);
        return pages;
    }

    cambiarPagina(p: number): void {
        if (p < 1 || p > this.paginacion.lastPage) return;
        this.cargarDatos(p);
    }

    abrirNuevo() {
        this.editando = false;
        this.form = {
            tipo_colaborador: 'interno',
            id_ruta: undefined,
            id_sector: undefined,
            id_vehiculo: undefined,
            id_tipo_residuo: undefined,
            id_origen: undefined,
            peso_kg: undefined,
            id_campana: undefined,
            id_organizacion: undefined
        };
        $('#modalRecoleccion').modal('show');
    }

    abrirEditar(r: any) {
        this.editando = true;
        this.form = { ...r };
        $('#modalRecoleccion').modal('show');
    }

    cerrarModal() {
        $('#modalRecoleccion').modal('hide');
    }

    guardarRegistro(): void {
        if (this.guardando) return;
        this.guardando = true;

        if (this.editando) {
            this.lpService.updateRecoleccion(this.form.id_recoleccion, this.form).subscribe({
                next: () => {
                    this.guardando = false;
                    this.cerrarModal();
                    this.cargarDatos(this.paginacion.currentPage);
                },
                error: () => this.guardando = false
            });
        } else {
            this.lpService.registrarRecoleccion(this.form).subscribe({
                next: () => {
                    this.guardando = false;
                    this.cerrarModal();
                    this.cargarDatos(1);
                },
                error: () => this.guardando = false
            });
        }
    }

    eliminar(r: any) {
        if (confirm('¿Seguro que desea eliminar esta recolección?')) {
            // Asumiendo que existe un método de eliminar en el servicio
            this.lpService.eliminarRecoleccion(r.id_recoleccion).subscribe({
                next: () => this.cargarDatos(this.paginacion.currentPage)
            });
        }
    }

    getColabClass(tipo: string): string {
        switch (tipo) {
            case 'campana': return 'badge-campana';
            case 'organizacion': return 'badge-organizacion';
            default: return 'badge-interno';
        }
    }
}
