import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { ToastService } from '../../../services/toast.service';
import { Subject, takeUntil } from 'rxjs';

declare var $: any;
declare var L: any;

// Coordenadas de Tacna, Perú
const TACNA_CENTER: [number, number] = [-18.0066, -70.2486];
const TACNA_ZOOM = 14;

@Component({
  selector: 'app-lp-rutas',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  template: `
<app-system-layout [title]="'Gestión de Rutas'" [subtitle]="'Planificación y administración de trayectorias de recolección'"
      [subtitleItems]="[
        { label: 'Programación de recorrido de carros recolectores de residuos', icon: 'fas fa-truck-moving' },
        { label: 'Programación de recorrido de cisternas de agua', icon: 'fas fa-tint' },
        { label: 'Programación de mantenimiento de contenedores', icon: 'fas fa-clipboard-list' }
      ]"
      [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Limpieza Pública', url: '/limpieza-publica'}, {label: 'Rutas'}]"
      [subsystem]="'limpieza-publica'">

      <div class="row">
        <div class="col-12">
          <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-primary'"
            [style.border-radius.px]="cv.cardBorderRadius || 6">
            
            <!-- Toolbar -->
            <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
              <div class="d-flex align-items-center flex-wrap" style="gap: 6px;">
                <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
                  <i class="fas fa-route mr-1 text-primary"></i> Rutas Programadas
                </h3>
                <span class="badge badge-primary ml-2">{{ paginacion.total }}</span>
                
                <button class="btn btn-sm btn-outline-primary ml-1 px-2" (click)="filtrosColapsados = !filtrosColapsados"
                  [title]="filtrosColapsados ? 'Ver filtros' : 'Ocultar filtros'" style="height: 24px; line-height: 1;">
                  <i class="fas" [ngClass]="filtrosColapsados ? 'fa-filter' : 'fa-filter-circle-xmark'"></i>
                </button>
                
                <button class="btn btn-sm btn-flat text-muted" (click)="cargarRutas()" title="Actualizar">
                  <i class="fas fa-sync" [class.fa-spin]="loading"></i>
                </button>
              </div>
              <div class="ms-auto flex-shrink-0">
                <button type="button" class="btn btn-sm shadow-sm" [ngClass]="cv.newBtnClass || 'btn-primary'"
                  (click)="abrirNuevo()">
                  <i [class]="(cv.newBtnIcon || 'fas fa-plus') + ' mr-1'"></i> {{ cv.newBtnLabel || 'Nueva Ruta' }}
                </button>
              </div>
            </div>

            <!-- Filtros -->
            <div class="border-bottom bg-light overflow-hidden" [style.max-height]="filtrosColapsados ? '0px' : '500px'"
              [style.padding]="filtrosColapsados ? '0px' : '0.8rem'"
              style="transition: max-height 0.3s ease, padding 0.3s ease;">
              <div class="row g-2">
                <div class="col-md-3">
                  <label class="mb-1 ds-crud-label">Buscar</label>
                  <input type="text" class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.buscar"
                    (keyup.enter)="onFilterChange()" placeholder="Nombre o descripción...">
                </div>
                <div class="col-md-2">
                  <label class="mb-1 ds-crud-label">Tipo de Ruta</label>
                  <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_tipo_ruta"
                    (change)="onFilterChange()">
                    <option [value]="undefined">Todos</option>
                    <option *ngFor="let t of catalogos.tipos_ruta" [value]="t.id_tipo_ruta">{{ t.nombre }}</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="mb-1 ds-crud-label">Sector / Zona</label>
                  <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.id_sector"
                    (change)="onFilterChange()">
                    <option [value]="undefined">Todos</option>
                    <option *ngFor="let s of catalogos.sectores" [value]="s.id_sector">{{ s.nombre_sector }}</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="mb-1 ds-crud-label">Turno</label>
                  <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.turno"
                    (change)="onFilterChange()">
                    <option [value]="undefined">Todos</option>
                    <option value="mañana">Mañana</option>
                    <option value="tarde">Tarde</option>
                    <option value="noche">Noche</option>
                  </select>
                </div>
                <div class="col-md-2">
                  <label class="mb-1 ds-crud-label">Estado</label>
                  <select class="form-control form-control-sm ds-crud-filter" [(ngModel)]="filtros.activo"
                    (change)="onFilterChange()">
                    <option [value]="undefined">Todos</option>
                    <option [value]="1">Activas</option>
                    <option [value]="0">Inactivas</option>
                  </select>
                </div>
                <div class="col-md-1 d-flex align-items-end">
                   <button class="btn btn-primary btn-sm btn-block" (click)="cargarRutas()">
                    <i class="fas fa-search"></i>
                   </button>
                </div>
              </div>
            </div>

            <!-- Tabla -->
            <div class="card-body p-0">
              <div class="table-responsive">
                <table class="table table-hover mb-0 ds-crud-table">
                  <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
                    <tr>
                      <th class="px-3">#</th>
                      <th>Ruta y Descripción</th>
                      <th>Tipo</th>
                      <th>Sector</th>
                      <th>Horario / Frecuencia</th>
                      <th>Estado</th>
                      <th class="text-right px-3">Acciones</th>
                    </tr>
                  </thead>
                  <tbody *ngIf="!loading">
                    <tr *ngFor="let r of rutas; let i = index" class="animate__animated animate__fadeIn">
                      <td class="px-3 align-middle text-muted small text-center">{{ (paginacion.currentPage - 1) * paginacion.perPage + i + 1 }}</td>
                      <td class="align-middle">
                        <div class="font-weight-bold text-primary">{{ r.nombre }}</div>
                        <div class="small text-muted text-truncate" style="max-width: 250px;">{{ r.descripcion || 'Sin descripción' }}</div>
                      </td>
                      <td class="align-middle">
                        <span class="badge badge-light border">{{ r.tipo_ruta?.nombre || 'General' }}</span>
                      </td>
                      <td class="align-middle">
                        <small class="text-dark"><i class="fas fa-map-marker-alt text-danger mr-1"></i> {{ r.sector?.nombre_sector || 'N/A' }}</small>
                      </td>
                      <td class="align-middle">
                        <div class="small">
                            <strong>{{ r.turno || 'N/A' | uppercase }}</strong>
                            <br>
                            <span class="text-muted"><i class="far fa-clock mr-1"></i>{{ r.hora_inicio || '--:--' }} - {{ r.hora_fin || '--:--' }}</span>
                            <br>
                            <span class="badge badge-outline-secondary mt-1">{{ r.frecuencia || 'Diario' }}</span>
                        </div>
                      </td>
                      <td class="align-middle">
                        <span class="badge" [class]="r.activo ? 'badge-success-light' : 'badge-danger-light'">
                          {{ r.activo ? 'ACTIVA' : 'INACTIVA' }}
                        </span>
                      </td>
                      <td class="align-middle text-right px-3">
                        <div class="btn-group shadow-sm">
                          <button class="btn btn-sm" [ngClass]="cv.viewBtnClass || 'btn-info'" (click)="abrirVer(r)" title="Ver recorrido">
                            <i class="fas fa-map"></i>
                          </button>
                          <button class="btn btn-sm" [ngClass]="cv.editBtnClass || 'btn-warning'" (click)="abrirEditar(r)" title="Editar">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm" [ngClass]="cv.deleteBtnClass || 'btn-danger'" (click)="confirmarEliminar(r)" title="Eliminar">
                            <i class="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                    <tr *ngIf="!rutas.length">
                      <td colspan="7" class="text-center py-5 text-muted">
                        <i class="fas fa-route fa-3x mb-3 opacity-25"></i>
                        <p>No se encontraron rutas con los filtros seleccionados.</p>
                        <button type="button" class="btn btn-sm btn-primary" (click)="limpiarFiltros()">
                          <i class="fas fa-redo mr-1"></i> Limpiar Filtros
                        </button>
                      </td>
                    </tr>
                  </tbody>
                  <!-- Skeletons Loading -->
                  <tbody *ngIf="loading">
                    <tr *ngFor="let s of [1,2,3,4,5]">
                      <td colspan="7" class="py-3 text-center">
                        <div class="skeleton-shimmer" style="height: 20px; width: 100%;"></div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Footer con Paginación -->
            <div class="card-footer bg-white border-top py-2">
              <div class="row align-items-center">
                <div class="col-md-6 small text-muted">
                  Mostrando {{ (paginacion.currentPage - 1) * paginacion.perPage + 1 }} a {{ Math.min(paginacion.currentPage * paginacion.perPage, paginacion.total) }} de {{ paginacion.total }} registros
                </div>
                <div class="col-md-6">
                  <ul class="pagination pagination-sm m-0 float-right" *ngIf="paginacion.lastPage > 1">
                    <li class="page-item" [class.disabled]="paginacion.currentPage === 1">
                      <a class="page-link" href="javascript:void(0)" (click)="paginacion.currentPage > 1 && cambiarPagina(1)">«</a>
                    </li>
                    <li class="page-item" [class.disabled]="paginacion.currentPage === 1">
                      <a class="page-link" href="javascript:void(0)" (click)="paginacion.currentPage > 1 && cambiarPagina(paginacion.currentPage - 1)">‹</a>
                    </li>
                    <li class="page-item" *ngFor="let p of getPaginas()" [class.active]="p === paginacion.currentPage" [class.disabled]="p === -1">
                      <a class="page-link" href="javascript:void(0)" (click)="p !== -1 && cambiarPagina(p)">{{ p === -1 ? '...' : p }}</a>
                    </li>
                    <li class="page-item" [class.disabled]="paginacion.currentPage === paginacion.lastPage">
                      <a class="page-link" href="javascript:void(0)" (click)="paginacion.currentPage < paginacion.lastPage && cambiarPagina(paginacion.currentPage + 1)">›</a>
                    </li>
                    <li class="page-item" [class.disabled]="paginacion.currentPage === paginacion.lastPage">
                      <a class="page-link" href="javascript:void(0)" (click)="paginacion.currentPage < paginacion.lastPage && cambiarPagina(paginacion.lastPage)">»</a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </app-system-layout>

    <!-- ==================== MODAL FORMULARIO ==================== -->
    <div class="modal fade" id="modalRuta" tabindex="-1" role="dialog" data-backdrop="static">
      <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg" [style.border-radius.px]="mc.borderRadius || 8">
          <div class="modal-header text-white" [style.background-color]="mc.headerBg || '#007bff'">
            <h5 class="modal-title font-weight-bold">
              <i [class]="(editando ? 'fas fa-edit' : 'fas fa-plus-circle') + ' mr-2'"></i>
              {{ editando ? 'Actualizar Ruta de Recolección' : 'Registrar Nueva Ruta' }}
            </h5>
            <button type="button" class="close text-white" (click)="cerrarModal()">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          
          <div class="modal-body p-0 bg-light">
            <!-- Tabs -->
            <ul class="nav nav-tabs ds-modal-tabs px-3 pt-2 bg-white border-bottom" role="tablist">
              <li class="nav-item">
                <a class="nav-link" [class.active]="tabActiva === 'general'" (click)="setTab('general')" href="javascript:void(0)">
                  <i class="fas fa-info-circle mr-1"></i> Información General
                </a>
              </li>
              <li class="nav-item">
                <a class="nav-link" [class.active]="tabActiva === 'mapa'" (click)="setTab('mapa')" href="javascript:void(0)">
                  <i class="fas fa-map-marked-alt mr-1"></i> Definir Recorrido (Mapa)
                </a>
              </li>
              <li class="nav-item" *ngIf="editando">
                <a class="nav-link" [class.active]="tabActiva === 'asignaciones'" (click)="setTab('asignaciones')" href="javascript:void(0)">
                  <i class="fas fa-users-cog mr-1"></i> Asignación Diaria
                </a>
              </li>
            </ul>

            <div class="tab-content" style="min-height: 450px;">
              <!-- TAB: GENERAL -->
              <div class="tab-pane fade p-4" [class.show]="tabActiva === 'general'" [class.active]="tabActiva === 'general'">
                <div class="row">
                  <div class="col-md-8">
                    <div class="row">
                      <div class="col-md-12 form-group">
                        <label class="ds-crud-label">NOMBRE DE LA RUTA <span class="text-danger">*</span></label>
                        <input type="text" class="form-control" [(ngModel)]="formRuta.nombre" placeholder="Ej: Zona Norte - Sector A" required>
                      </div>
                      <div class="col-md-12 form-group">
                        <label class="ds-crud-label">DESCRIPCIÓN / DETALLE</label>
                        <textarea class="form-control" [(ngModel)]="formRuta.descripcion" rows="3" placeholder="Detalles sobre el área de cobertura..."></textarea>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="ds-crud-label">TIPO DE RUTA <span class="text-danger">*</span></label>
                        <select class="form-control" [(ngModel)]="formRuta.id_tipo_ruta" required>
                          <option [value]="undefined" disabled>Seleccione tipo...</option>
                          <option *ngFor="let t of catalogos.tipos_ruta" [value]="t.id_tipo_ruta">{{ t.nombre }}</option>
                        </select>
                      </div>
                      <div class="col-md-6 form-group">
                        <label class="ds-crud-label">SECTOR / ZONA <span class="text-danger">*</span></label>
                        <select class="form-control" [(ngModel)]="formRuta.id_sector" required>
                          <option [value]="undefined" disabled>Seleccione sector...</option>
                          <option *ngFor="let s of catalogos.sectores" [value]="s.id_sector">{{ s.nombre_sector }}</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  
                  <div class="col-md-4 border-left bg-white p-3 rounded">
                    <h6 class="font-weight-bold text-primary mb-3 border-bottom pb-2">Programación</h6>
                    <div class="form-group">
                      <label class="ds-crud-label">TURNO</label>
                      <select class="form-control" [(ngModel)]="formRuta.turno">
                        <option value="mañana">Mañana</option>
                        <option value="tarde">Tarde</option>
                        <option value="noche">Noche</option>
                      </select>
                    </div>
                    <div class="row">
                      <div class="col-6 form-group">
                        <label class="ds-crud-label">HORA INICIO</label>
                        <input type="time" class="form-control" [(ngModel)]="formRuta.hora_inicio">
                      </div>
                      <div class="col-6 form-group">
                        <label class="ds-crud-label">HORA FIN</label>
                        <input type="time" class="form-control" [(ngModel)]="formRuta.hora_fin">
                      </div>
                    </div>
                    <div class="form-group">
                      <label class="ds-crud-label">FRECUENCIA</label>
                      <select class="form-control" [(ngModel)]="formRuta.frecuencia">
                        <option value="diario">Diario (Lu-Do)</option>
                        <option value="interdiario">Interdiario (Lu-Mi-Vi)</option>
                        <option value="interdiario-2">Interdiario (Ma-Ju-Sa)</option>
                        <option value="semanal">Semanal</option>
                        <option value="fines-de-semana">Fines de Semana</option>
                      </select>
                    </div>
                    <div class="form-group mb-0">
                      <label class="ds-crud-label">ESTADO DEL SERVICIO</label>
                      <div class="custom-control custom-switch custom-switch-off-danger custom-switch-on-success">
                        <input type="checkbox" class="custom-control-input" id="swActivo" [(ngModel)]="formRuta.activo">
                        <label class="custom-control-label" for="swActivo">{{ formRuta.activo ? 'Ruta Activa' : 'Ruta Suspendida' }}</label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- TAB: MAPA -->
              <div class="tab-pane fade h-100" [class.show]="tabActiva === 'mapa'" [class.active]="tabActiva === 'mapa'">
                <div class="p-3 bg-white border-bottom d-flex justify-content-between align-items-center">
                  <div>
                      <span class="text-muted small"><i class="fas fa-info-circle mr-1"></i> Haga clic en el mapa para añadir puntos de recolección en orden. Clic derecho sobre un punto para eliminarlo. Arrastre para ajustar.</span>
                  </div>
                  <div>
                      <button class="btn btn-xs btn-outline-danger mr-2" (click)="limpiarPuntos()">
                          <i class="fas fa-eraser mr-1"></i> Limpiar Todo
                      </button>
                      <span class="badge badge-primary py-2 px-3">{{ formRuta.puntos?.length || 0 }} Puntos marcados</span>
                  </div>
                </div>
                <div id="map-definicion" style="height: 450px; width: 100%;" class="bg-light"></div>
              </div>

              <!-- TAB: ASIGNACIONES -->
              <div class="tab-pane fade p-4" [class.show]="tabActiva === 'asignaciones'" [class.active]="tabActiva === 'asignaciones'">
                <div class="row">
                  <div class="col-md-12 mb-4 d-flex align-items-center bg-white p-3 rounded shadow-sm border">
                      <div class="mr-4">
                          <label class="ds-crud-label mb-1">FECHA DE ASIGNACIÓN</label>
                          <input type="date" class="form-control" [(ngModel)]="fechaAsignacion" (change)="cargarAsignaciones()">
                      </div>
                      <div class="ml-auto text-right">
                           <h4 class="mb-0 text-primary font-weight-bold">{{ formRuta.nombre }}</h4>
                           <p class="text-muted small mb-0">{{ fechaAsignacion | date:'fullDate' }}</p>
                      </div>
                  </div>

                  <!-- Personal -->
                  <div class="col-md-6">
                      <div class="card card-outline card-primary shadow-none border">
                          <div class="card-header py-2">
                              <h3 class="card-title font-weight-bold small uppercase"><i class="fas fa-user-friends mr-1"></i> Personal Asignado</h3>
                          </div>
                          <div class="card-body p-0">
                              <div class="p-3 bg-light border-bottom">
                                  <div class="d-flex gap-2">
                                      <select class="form-control form-control-sm mr-2" [(ngModel)]="nuevoAsignaPersonal.id_personal">
                                          <option [value]="undefined">Seleccionar Personal...</option>
                                          <option *ngFor="let p of catalogos.personal" [value]="p.id">{{ p.name }} ({{ p.position }})</option>
                                      </select>
                                      <button class="btn btn-primary btn-sm rounded-pill px-3" (click)="asignarPersonal()" [disabled]="!nuevoAsignaPersonal.id_personal">
                                          <i class="fas fa-plus"></i>
                                      </button>
                                  </div>
                              </div>
                              <div class="table-responsive" style="max-height: 250px;">
                                  <table class="table table-sm mb-0">
                                      <tbody>
                                          <tr *ngFor="let ap of asignaciones.personal">
                                              <td class="align-middle px-3">
                                                  <div class="font-weight-bold">{{ ap.personal?.name }}</div>
                                                  <small class="text-muted">{{ ap.personal?.position }}</small>
                                              </td>
                                              <td class="align-middle text-right px-3">
                                                  <button class="btn btn-xs text-danger" (click)="quitarPersonal(ap)" title="Retirar">
                                                      <i class="fas fa-times-circle"></i>
                                                  </button>
                                              </td>
                                          </tr>
                                          <tr *ngIf="!asignaciones.personal.length">
                                              <td colspan="2" class="text-center py-4 text-muted small">Sin personal asignado</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>

                  <!-- Vehículos -->
                  <div class="col-md-6">
                      <div class="card card-outline card-success shadow-none border">
                          <div class="card-header py-2">
                              <h3 class="card-title font-weight-bold small uppercase"><i class="fas fa-truck mr-1"></i> Vehículo Asignado</h3>
                          </div>
                          <div class="card-body p-0">
                              <div class="p-3 bg-light border-bottom" *ngIf="!asignaciones.vehiculos.length">
                                  <div class="d-flex gap-2">
                                      <select class="form-control form-control-sm mr-2" [(ngModel)]="nuevoAsignaVehiculo.id_vehiculo">
                                          <option [value]="undefined">Seleccionar Vehículo...</option>
                                          <option *ngFor="let v of catalogos.vehiculos" [value]="v.id_vehiculo">{{ v.placa }} - {{ v.tipo }}</option>
                                      </select>
                                      <button class="btn btn-success btn-sm rounded-pill px-3" (click)="asignarVehiculo()" [disabled]="!nuevoAsignaVehiculo.id_vehiculo">
                                          <i class="fas fa-plus"></i>
                                      </button>
                                  </div>
                              </div>
                              <div class="table-responsive">
                                  <table class="table table-sm mb-0">
                                      <tbody>
                                          <tr *ngFor="let av of asignaciones.vehiculos">
                                              <td class="align-middle px-3">
                                                  <div class="font-weight-bold"><i class="fas fa-shuttle-van mr-2 text-success"></i>{{ av.vehiculo?.placa }}</div>
                                                  <small class="text-muted">{{ av.vehiculo?.tipo }}</small>
                                              </td>
                                              <td class="align-middle text-right px-3">
                                                  <button class="btn btn-xs text-danger" (click)="quitarVehiculo(av)" title="Retirar">
                                                      <i class="fas fa-times-circle"></i>
                                                  </button>
                                              </td>
                                          </tr>
                                          <tr *ngIf="!asignaciones.vehiculos.length">
                                              <td colspan="2" class="text-center py-4 text-muted small">Sin vehículo asignado</td>
                                          </tr>
                                      </tbody>
                                  </table>
                              </div>
                          </div>
                      </div>
                  </div>
                </div>
              </div>

            </div>
          </div>

          <div class="modal-footer bg-white border-top-0">
            <button type="button" class="btn btn-secondary" (click)="cerrarModal()">
              <i class="fas fa-times mr-1"></i> Cancelar
            </button>
            <button type="button" [class]="'btn px-5 rounded-pill shadow ' + (editando ? 'btn-warning' : 'btn-primary')"
              (click)="guardar()" [disabled]="!formRuta.nombre || !formRuta.id_tipo_ruta || guardando" *ngIf="tabActiva !== 'asignaciones'">
              <i [class]="guardando ? 'fas fa-spinner fa-spin mr-1' : (editando ? 'fas fa-save mr-1' : 'fas fa-check-circle mr-1')"></i> 
              {{ guardando ? 'Guardando...' : (editando ? 'Actualizar Cambios' : 'Confirmar Registro') }}
            </button>
            <button type="button" class="btn btn-primary px-5 rounded-pill shadow" (click)="cerrarModal()" *ngIf="tabActiva === 'asignaciones'">
              <i class="fas fa-check mr-1"></i> Listo
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL VER RECORRIDO ==================== -->
    <div class="modal fade" id="modalVerRuta" tabindex="-1" role="dialog">
      <div class="modal-dialog modal-xl modal-dialog-centered" role="document">
        <div class="modal-content border-0 shadow-lg">
          <div class="modal-header text-white bg-info">
            <h5 class="modal-title font-weight-bold">
              <i class="fas fa-map mr-2"></i>
              Recorrido: {{ rutaVista?.nombre }}
            </h5>
            <button type="button" class="close text-white" data-dismiss="modal">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body p-0">
            <div class="p-3 bg-light d-flex align-items-center border-bottom">
              <div class="mr-4">
                <span class="badge badge-info mr-2">{{ rutaVista?.tipo_ruta?.nombre || 'General' }}</span>
                <span class="badge badge-light border"><i class="fas fa-map-marker-alt mr-1 text-danger"></i>{{ rutaVista?.sector?.nombre_sector || 'N/A' }}</span>
              </div>
              <div class="ml-auto">
                <span class="badge badge-primary py-2 px-3">{{ rutaVista?.puntos?.length || 0 }} Puntos en la ruta</span>
              </div>
            </div>
            <div id="map-vista" style="height: 500px; width: 100%;"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-warning" (click)="editarDesdeVista()">
              <i class="fas fa-edit mr-1"></i> Editar
            </button>
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
              <i class="fas fa-times mr-1"></i> Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== MODAL CONFIRMAR ELIMINACIÓN ==================== -->
    <div class="modal fade" id="modalEliminarRuta" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">
              <i class="fas fa-exclamation-triangle mr-2 text-danger"></i> Confirmar Eliminación
            </h5>
            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body" *ngIf="rutaAEliminar">
            <p>¿Está seguro que desea eliminar la siguiente ruta?</p>
            <div class="alert alert-warning">
              <strong>Ruta:</strong> {{ rutaAEliminar?.nombre }}<br>
              <strong>Sector:</strong> {{ rutaAEliminar?.sector?.nombre_sector || 'N/A' }}<br>
              <strong>Tipo:</strong> {{ rutaAEliminar?.tipo_ruta?.nombre || 'General' }}
            </div>
            <p class="text-danger"><i class="fas fa-exclamation-circle"></i> Esta acción no se puede deshacer.</p>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">
              <i class="fas fa-times mr-1"></i> Cancelar
            </button>
            <button type="button" class="btn btn-danger" (click)="eliminarRuta()" [disabled]="eliminando">
              <i class="fas" [ngClass]="eliminando ? 'fa-spinner fa-spin' : 'fa-trash'"></i>
              {{ eliminando ? 'Eliminando...' : 'Eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .text-primary { color: #007bff !important; }
    .btn-primary { background-color: #007bff !important; color: white !important; }
    .btn-primary:hover { background-color: #0056b3 !important; }
    .badge-primary { background-color: #007bff; color: white; }
    .card-primary { border-top: 3px solid #007bff !important; }
    
    .badge-success-light { background-color: #e6f7ef; color: #28a745; border: 1px solid rgba(40,167,69,0.2); }
    .badge-danger-light { background-color: #feeeee; color: #dc3545; border: 1px solid rgba(220,53,69,0.2); }
    
    .ds-crud-table thead th { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.5px; vertical-align: middle; border-bottom: 0; }
    .ds-crud-table tbody tr { transition: all 0.2s; }
    .ds-crud-table tbody tr:hover { background-color: rgba(102, 16, 242, 0.03); }

    .ds-modal-tabs .nav-link { color: #6c757d; border: 0; border-bottom: 3px solid transparent; font-weight: 500; font-size: 0.9rem; padding: 10px 20px; }
    .ds-modal-tabs .nav-link.active { color: #007bff; border-bottom-color: #007bff; background: transparent; }
    
    .skeleton-shimmer { background: #f6f7f8; background-image: linear-gradient(to right, #f6f7f8 0%, #edeef1 20%, #f6f7f8 40%, #f6f7f8 100%); background-repeat: no-repeat; background-size: 800px 104px; display: inline-block; position: relative; animation: placeholderShimmer 1.2s linear infinite forwards; }
    @keyframes placeholderShimmer { 0% { background-position: -468px 0; } 100% { background-position: 468px 0; } }

    .btn-outline-primary { color: #007bff; border-color: #007bff; }
    .btn-outline-primary:hover { background-color: #007bff; color: white; }

    #map-definicion { cursor: crosshair; }
    #map-vista { cursor: default; }
  `]
})
export class LpRutasComponent extends CrudListExportBase implements OnInit, AfterViewInit, OnDestroy {
  // Estado de la UI
  loading = false;
  guardando = false;
  eliminando = false;
  filtrosColapsados = true;
  tabActiva: 'general' | 'mapa' | 'asignaciones' = 'general';
  editando = false;

  // Datos
  rutas: any[] = [];
  catalogos: any = {
    tipos_ruta: [],
    sectores: [],
    personal: [],
    vehiculos: []
  };

  filtros: any = {
    buscar: '',
    id_tipo_ruta: undefined,
    id_sector: undefined,
    turno: undefined,
    activo: 1,
    per_page: 15
  };

  paginacion: any = {
    total: 0,
    currentPage: 1,
    lastPage: 1,
    perPage: 15
  };

  // Formulario
  formRuta: any = {};

  // Para eliminación
  rutaAEliminar: any = null;

  // Para vista de ruta
  rutaVista: any = null;

  // Auxiliar para el template
  Math = Math;

  // Asignaciones
  fechaAsignacion = new Date().toISOString().split('T')[0];
  asignaciones: any = { personal: [], vehiculos: [] };
  nuevoAsignaPersonal: any = { id_personal: undefined };
  nuevoAsignaVehiculo: any = { id_vehiculo: undefined };

  // Mapa edición
  private map: any;
  private markers: any[] = [];
  private polyline: any;

  // Mapa vista
  private mapVista: any;
  private markersVista: any[] = [];
  private polylineVista: any;

  private destroy$ = new Subject<void>();

  private lpService = inject(LimpiezaPublicaService);

  private toast = inject(ToastService);

  constructor(crudExport: CrudExportService) {
    super(crudExport);
  }





  getExportData(): Record<string, unknown>[] {
    return []; // Just placeholder, update manually
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'nombre', label: 'Nombre' },
    ]; // Just placeholder, update manually
  }

  getExportTitle(): string {
    return 'Exportar';
  }

  getExportFilename(): string {
    return 'export';
  }

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarRutas();
    this.resetForm();
  }

  ngAfterViewInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.map) { this.map.remove(); this.map = null; }
    if (this.mapVista) { this.mapVista.remove(); this.mapVista = null; }
  }

  cargarCatalogos(): void {
    this.lpService.getCatalogos().subscribe({
      next: (res: any) => {
        this.catalogos = res.data;
      }
    });
  }

  cargarRutas(pagina: number = 1): void {
    this.loading = true;
    const params = { ...this.filtros, page: pagina };
    this.lpService.getRutas(params).subscribe({
      next: (res: any) => {
        this.rutas = res.data;
        this.paginacion = {
          total: res.meta.total,
          currentPage: res.meta.current_page,
          lastPage: res.meta.last_page,
          perPage: res.meta.per_page
        };
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  onFilterChange(): void {
    this.cargarRutas(1);
  }

  limpiarFiltros(): void {
    this.filtros = {
      buscar: '',
      id_tipo_ruta: undefined,
      id_sector: undefined,
      turno: undefined,
      activo: 1,
      per_page: 15
    };
    this.cargarRutas(1);
  }

  cambiarPagina(p: number): void {
    if (p < 1 || p > this.paginacion.lastPage) return;
    this.cargarRutas(p);
  }

  getPaginas(): number[] {
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

  resetForm() {
    this.formRuta = {
      nombre: '',
      descripcion: '',
      id_tipo_ruta: undefined,
      id_sector: undefined,
      turno: 'mañana',
      hora_inicio: '07:00',
      hora_fin: '15:00',
      frecuencia: 'diario',
      activo: true,
      puntos: []
    };
    this.editando = false;
    this.tabActiva = 'general';
  }

  cerrarModal(): void {
    $('#modalRuta').modal('hide');
    // Destruir mapa al cerrar para que se reinicialice bien en próxima apertura
    setTimeout(() => {
      if (this.map) {
        this.map.remove();
        this.map = null;
        this.markers = [];
        this.polyline = null;
      }
    }, 400);
  }

  abrirNuevo() {
    this.resetForm();
    this.editando = false;
    // Destruir mapa previo para que se reinicialice limpio al abrir la pestaña
    if (this.map) { this.map.remove(); this.map = null; this.markers = []; this.polyline = null; }
    $('#modalRuta').modal('show');
    // NO inicializamos el mapa aquí: lo haremos cuando el usuario abra la pestaña Mapa
  }

  abrirEditar(r: any) {
    this.editando = true;
    this.tabActiva = 'general';
    // Destruir mapa previo
    if (this.map) { this.map.remove(); this.map = null; this.markers = []; this.polyline = null; }

    // Cargar datos básicos para que el formulario sea inmediatamente visible
    this.formRuta = { ...r, activo: !!r.activo, puntos: [] };
    $('#modalRuta').modal('show');

    // Obtener la ruta COMPLETA con sus puntos desde la BD
    this.lpService.getRuta(r.id_ruta).subscribe({
      next: (res: any) => {
        const rutaCompleta = res.data || res;
        this.formRuta = { ...rutaCompleta, activo: !!rutaCompleta.activo };
        this.formRuta.puntos = this.normalizarPuntos(rutaCompleta.puntos || []);
      },
      error: () => {
        // Si falla, usamos los datos básicos ya disponibles
        this.formRuta.puntos = this.normalizarPuntos(r.puntos || []);
      }
    });
  }

  abrirVer(r: any) {
    this.rutaVista = { ...r };
    this.rutaVista.puntos = this.normalizarPuntos(r.puntos || []);

    if (this.mapVista) { this.mapVista.remove(); this.mapVista = null; this.markersVista = []; }
    $('#modalVerRuta').modal('show');

    // Obtener la ruta COMPLETA con sus puntos desde la BD
    this.lpService.getRuta(r.id_ruta).subscribe({
      next: (res: any) => {
        const rutaCompleta = res.data || res;
        this.rutaVista = { ...rutaCompleta };
        this.rutaVista.puntos = this.normalizarPuntos(rutaCompleta.puntos || []);
        setTimeout(() => this.initMapaVista(), 500);
      },
      error: () => {
        setTimeout(() => this.initMapaVista(), 500);
      }
    });
  }

  editarDesdeVista(): void {
    const ruta = this.rutaVista;
    $('#modalVerRuta').modal('hide');
    setTimeout(() => {
      if (ruta) this.abrirEditar(ruta);
    }, 350);
  }

  /** Normaliza los puntos que pueden venir como {latitud, longitud} o {lat, lng} */
  private normalizarPuntos(puntos: any[]): any[] {
    if (!puntos || !Array.isArray(puntos)) return [];
    return puntos.map((p: any, idx: number) => ({
      latitud: p.latitud ?? p.lat,
      longitud: p.longitud ?? p.lng,
      orden: p.orden ?? idx + 1
    })).filter((p: any) => p.latitud != null && p.longitud != null);
  }

  setTab(tab: 'general' | 'mapa' | 'asignaciones') {
    this.tabActiva = tab;
    if (tab === 'mapa') {
      // Siempre destruir y re-crear el mapa al mostrar la pestaña.
      // Esto garantiza que Leaflet inicializa sobre un elemento visible,
      // y que los puntos existentes se renderizan correctamente.
      setTimeout(() => {
        if (this.map) {
          this.map.remove();
          this.map = null;
          this.markers = [];
          this.polyline = null;
        }
        this.initMapa();
      }, 350);
    } else if (tab === 'asignaciones') {
      this.cargarAsignaciones();
    }
  }

  // ── Lógica de Asignaciones ──────────────────────────────────────────────

  cargarAsignaciones() {
    if (!this.formRuta.id_ruta) return;
    this.lpService.getAsignacionesRuta(this.formRuta.id_ruta, this.fechaAsignacion).subscribe({
      next: (res: any) => {
        this.asignaciones = res.data;
      }
    });
  }

  asignarPersonal() {
    const data = {
      id_ruta: this.formRuta.id_ruta,
      id_personal: this.nuevoAsignaPersonal.id_personal,
      fecha: this.fechaAsignacion,
      turno: this.formRuta.turno || 'mañana'
    };
    this.lpService.asignarPersonalARuta(data).subscribe({
      next: () => {
        this.toast.success('Personal asignado correctamente', 'Asignación');
        this.cargarAsignaciones();
        this.nuevoAsignaPersonal.id_personal = undefined;
      },
      error: (err: any) => {
        this.toast.error('Error al asignar personal: ' + (err.error?.message || 'Error desconocido'), 'Error');
      }
    });
  }

  asignarVehiculo() {
    const data = {
      id_ruta: this.formRuta.id_ruta,
      id_vehiculo: this.nuevoAsignaVehiculo.id_vehiculo,
      fecha: this.fechaAsignacion
    };
    this.lpService.asignarVehiculoARutaNueva(data).subscribe({
      next: () => {
        this.toast.success('Vehículo asignado correctamente', 'Asignación');
        this.cargarAsignaciones();
        this.nuevoAsignaVehiculo.id_vehiculo = undefined;
      },
      error: (err: any) => {
        this.toast.error('Error al asignar vehículo: ' + (err.error?.message || 'Error desconocido'), 'Error');
      }
    });
  }

  quitarPersonal(ap: any) {
    this.lpService.eliminarAsignacionPersonal(ap.id_asignacion).subscribe({
      next: () => {
        this.toast.success('Personal retirado de la ruta', 'Asignación');
        this.cargarAsignaciones();
      },
      error: () => this.toast.error('Error al retirar personal', 'Error')
    });
  }

  quitarVehiculo(av: any) {
    this.lpService.eliminarAsignacionVehiculo(av.id_asignacion_vehiculo).subscribe({
      next: () => {
        this.toast.success('Vehículo retirado de la ruta', 'Asignación');
        this.cargarAsignaciones();
      },
      error: () => this.toast.error('Error al retirar vehículo', 'Error')
    });
  }

  // ── Lógica de Mapa Leaflet (Edición) ──────────────────────────────────

  initMapa() {
    // Siempre destruir el mapa previo
    if (this.map) {
      this.map.remove();
      this.map = null;
      this.markers = [];
      this.polyline = null;
    }

    // Determinar el centro inicial
    let center: [number, number] = TACNA_CENTER;
    let zoom = TACNA_ZOOM;

    // Si hay puntos guardados, centrar sobre ellos más abajo (en renderizarPuntos)
    this.map = L.map('map-definicion', {
      zoomControl: true,
      attributionControl: false
    }).setView(center, zoom);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.aniadirPunto(e.latlng.lat, e.latlng.lng);
    });

    // Renderizar puntos existentes (al editar)
    this.renderizarPuntos();
  }

  initMapaVista() {
    if (this.mapVista) {
      this.mapVista.remove();
      this.mapVista = null;
      this.markersVista = [];
      this.polylineVista = null;
    }

    this.mapVista = L.map('map-vista', {
      zoomControl: true,
      attributionControl: false
    }).setView(TACNA_CENTER, TACNA_ZOOM);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(this.mapVista);

    this.renderizarPuntosVista();
  }

  aniadirPunto(lat: number, lng: number) {
    const nuevoPunto = {
      latitud: lat,
      longitud: lng,
      orden: (this.formRuta.puntos?.length || 0) + 1
    };

    if (!this.formRuta.puntos) this.formRuta.puntos = [];
    this.formRuta.puntos.push(nuevoPunto);
    this.renderizarPuntos();
  }

  renderizarPuntos() {
    if (!this.map) return;

    // Limpiar marcadores existentes
    this.markers.forEach(m => this.map.removeLayer(m));
    this.markers = [];

    if (this.polyline) { this.map.removeLayer(this.polyline); this.polyline = null; }

    if (!this.formRuta.puntos || this.formRuta.puntos.length === 0) return;

    const path: [number, number][] = [];

    this.formRuta.puntos.forEach((p: any, idx: number) => {
      const lat = parseFloat(p.latitud);
      const lng = parseFloat(p.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const pos: [number, number] = [lat, lng];
      path.push(pos);

      const isFirst = idx === 0;
      const isLast = idx === this.formRuta.puntos.length - 1;
      let bgColor = '#007bff';
      if (isFirst) bgColor = '#28a745';
      if (isLast && idx > 0) bgColor = '#dc3545';

      const marker = L.marker(pos, {
        draggable: true,
        icon: L.divIcon({
          html: `<div style="background:${bgColor}; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; font-size:10px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.3);">${idx + 1}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);

      marker.on('dragend', (e: any) => {
        const newPos = e.target.getLatLng();
        this.formRuta.puntos[idx].latitud = newPos.lat;
        this.formRuta.puntos[idx].longitud = newPos.lng;
        this.renderizarPuntos();
      });

      marker.on('contextmenu', () => {
        this.formRuta.puntos.splice(idx, 1);
        this.formRuta.puntos.forEach((pt: any, i: number) => pt.orden = i + 1);
        this.renderizarPuntos();
      });

      const label = isFirst ? 'Inicio' : (isLast && idx > 0 ? 'Fin' : `Punto ${idx + 1}`);
      marker.bindTooltip(`${label} (Clic derecho para eliminar)`);
      this.markers.push(marker);
    });

    if (path.length > 1) {
      this.polyline = L.polyline(path, { color: '#007bff', weight: 4, opacity: 0.7, dashArray: '5, 10' }).addTo(this.map);
    }

    // Ajustar vista a los puntos
    if (path.length > 0) {
      const bounds = L.latLngBounds(path);
      this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }

  renderizarPuntosVista() {
    if (!this.mapVista) return;

    this.markersVista.forEach(m => this.mapVista.removeLayer(m));
    this.markersVista = [];
    if (this.polylineVista) { this.mapVista.removeLayer(this.polylineVista); this.polylineVista = null; }

    const puntos = this.rutaVista?.puntos || [];
    if (puntos.length === 0) return;

    const path: [number, number][] = [];

    puntos.forEach((p: any, idx: number) => {
      const lat = parseFloat(p.latitud);
      const lng = parseFloat(p.longitud);
      if (isNaN(lat) || isNaN(lng)) return;

      const pos: [number, number] = [lat, lng];
      path.push(pos);

      const isFirst = idx === 0;
      const isLast = idx === puntos.length - 1;
      let bgColor = '#007bff';
      if (isFirst) bgColor = '#28a745';
      if (isLast && idx > 0) bgColor = '#dc3545';

      const marker = L.marker(pos, {
        icon: L.divIcon({
          html: `<div style="background:${bgColor}; color:white; width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid white; font-size:10px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.3);">${idx + 1}</div>`,
          className: '',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.mapVista);

      const label = isFirst ? 'Inicio' : (isLast && idx > 0 ? 'Fin' : `Punto ${idx + 1}`);
      marker.bindTooltip(label);
      this.markersVista.push(marker);
    });

    if (path.length > 1) {
      this.polylineVista = L.polyline(path, { color: '#007bff', weight: 4, opacity: 0.8 }).addTo(this.mapVista);
    }

    if (path.length > 0) {
      const bounds = L.latLngBounds(path);
      this.mapVista.fitBounds(bounds, { padding: [50, 50], maxZoom: 17 });
    }
  }

  limpiarPuntos() {
    const totalPuntos = this.formRuta.puntos?.length || 0;
    if (totalPuntos === 0) return;
    // No usar confirm() - simplemente limpiar con toast informativo
    this.formRuta.puntos = [];
    this.renderizarPuntos();
    this.toast.info(`Se eliminaron ${totalPuntos} punto(s) del mapa`, 'Mapa limpiado');
  }

  // ── Guardado ────────────────────────────────────────────────────────────

  guardar() {
    if (!this.formRuta.nombre || !this.formRuta.id_tipo_ruta) return;

    this.guardando = true;

    const observer = {
      next: () => {
        const msg = this.editando ? 'Ruta actualizada correctamente' : 'Ruta creada correctamente';
        const title = this.editando ? 'Actualización exitosa' : 'Registro exitoso';
        this.toast.success(msg, title);
        this.cargarRutas();
        $('#modalRuta').modal('hide');
        this.guardando = false;
        // Destruir mapa internamente
        setTimeout(() => {
          if (this.map) { this.map.remove(); this.map = null; this.markers = []; }
        }, 400);
      },
      error: (err: any) => {
        this.toast.error('Error al guardar: ' + (err.error?.message || 'Error desconocido'), 'Error');
        this.guardando = false;
      }
    };

    if (this.editando) {
      this.lpService.updateRuta(this.formRuta.id_ruta, this.formRuta).subscribe(observer);
    } else {
      this.lpService.createRuta(this.formRuta).subscribe(observer);
    }
  }

  // ── Eliminación con modal de confirmación ─────────────────────────────

  confirmarEliminar(r: any) {
    this.rutaAEliminar = r;
    $('#modalEliminarRuta').modal('show');
  }

  eliminarRuta() {
    if (!this.rutaAEliminar) return;
    this.eliminando = true;

    this.lpService.eliminarRuta(this.rutaAEliminar.id_ruta).subscribe({
      next: () => {
        this.toast.success(`Ruta "${this.rutaAEliminar.nombre}" eliminada correctamente`, 'Eliminación exitosa');
        $('#modalEliminarRuta').modal('hide');
        this.rutaAEliminar = null;
        this.eliminando = false;
        this.cargarRutas();
      },
      error: (err: any) => {
        this.toast.error('Error al eliminar: ' + (err.error?.message || 'Error desconocido'), 'Error');
        this.eliminando = false;
      }
    });
  }
}
