import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlmacenService } from '../services/almacen.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { forkJoin } from 'rxjs';

import { AlmacenUnitSelectorComponent } from '../components/unit-selector/unit-selector.component';

@Component({
  selector: 'app-alm-bienes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, AlmacenUnitSelectorComponent],
  template: `
<app-system-layout [title]="'Catálogo de Bienes y Stock'" [subtitle]="'Gestión de catálogo, consulta de disponibilidad y registro de transacciones'"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Almacén', url: '/almacen'}, {label: 'Bienes'}]"
  [subsystem]="'almacen'">

  <div class="row">
    <div class="col-12">
      <div class="mb-3 d-flex justify-content-end align-items-center">
            <app-almacen-unit-selector></app-almacen-unit-selector>
      </div>
      <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-primary'"
        [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">
        
        <!-- Toolbar -->
        <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white">
          <div class="d-flex align-items-center flex-wrap" style="gap: 15px;">
            <div class="d-flex align-items-center" style="gap: 6px;">
              <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
                <i class="fas fa-boxes mr-1"></i> Inventario Consolidado
              </h3>
              <span class="badge" [ngClass]="cv.cardOutlineColor ? 'bg-' + cv.cardOutlineColor.replace('card-', '') : 'badge-primary'">
                {{ filteredBienes.length }}
              </span>
            </div>
            
            <!-- Barra de búsqueda -->
            <div class="input-group input-group-sm" style="width: 250px;">
              <input type="text" class="form-control border-right-0" placeholder="Buscar por código o nombre..." 
                [(ngModel)]="searchTerm" name="searchTerm" (keyup.enter)="loadData()">
              <div class="input-group-append">
                <span class="input-group-text bg-white border-left-0 text-muted">
                  <i class="fas fa-search"></i>
                </span>
              </div>
            </div>
          </div>
          <div class="ms-auto flex-shrink-0">
            <button type="button" class="btn btn-sm" [ngClass]="cv.newBtnClass || 'btn-primary'" (click)="openModal()">
              <i [class]="(cv.newBtnIcon || 'fas fa-plus') + ' mr-1'"></i> Nuevo Bien
            </button>
          </div>
        </div>

        <div class="card-body p-0 mt-3">
            <div *ngIf="loading" class="text-center p-5">
              <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
              <p class="text-muted">Cargando catálogo...</p>
            </div>
            
            <div class="table-responsive p-2" *ngIf="!loading">
              <table class="table table-hover table-striped align-middle mb-0 w-100 ds-crud-table" [ngClass]="cv.tableClasses">
                <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
                  <tr>
                    <th style="width: 50px;" class="border-0">#</th>
                    <th class="border-0">Código</th>
                    <th class="border-0">Nombre / Descripción</th>
                    <th class="border-0">Categoría</th>
                    <th class="border-0">Unidad</th>
                    <th class="text-center border-0 bg-light">Stock Actual</th>
                    <th class="text-center border-0">V. Promedio</th>
                    <th class="text-center border-0" style="width: 250px;">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let item of filteredBienes; let i = index" class="fade-in">
                    <td class="text-muted">{{ i + 1 }}</td>
                    <td>
                      <strong class="text-primary">{{ item.codigo }}</strong>
                    </td>
                    <td>
                      <div class="font-weight-bold text-dark">{{ item.nombre }} 
                          <span class="badge" [ngClass]="item.activo ? 'badge-success' : 'badge-danger'" style="font-size:0.6em"> 
                             {{ item.activo ? 'Activo' : 'Inactivo' }}
                          </span>
                      </div>
                      <small class="text-muted text-truncate d-block" style="max-width: 250px;">
                        {{ item.descripcion || 'Sin descripción' }}
                      </small>
                    </td>
                    <td><span class="badge badge-secondary">{{ item.categoria?.nombre }}</span></td>
                    <td><span class="badge badge-light border">{{ item.unidad?.codigo }}</span></td>
                    
                    <td class="text-center font-weight-bold" [ngClass]="{'text-danger': item.stock_actual <= 0, 'text-success': item.stock_actual > 0}">
                      <i class="fas" [ngClass]="item.stock_actual <= 0 ? 'fa-exclamation-triangle' : 'fa-box'"></i> 
                      {{ item.stock_actual }}
                    </td>
                    <td class="text-center font-weight-bold text-dark">S/ {{ item.costo_promedio | number:'1.2-2' }}</td>
                    
                    <td class="text-center">
                      <div class="btn-group btn-group-sm" role="group">
                          <button class="btn btn-success" (click)="openEntradaModal(item)" title="Registrar Entrada" [disabled]="!item.activo">
                            <i class="fas fa-arrow-down"></i> Entrada
                          </button>
                          <button class="btn btn-warning" (click)="openSalidaModal(item)" title="Registrar Salida" [disabled]="item.stock_actual <= 0 || !item.activo">
                            <i class="fas fa-arrow-up"></i> Salida
                          </button>
                          <button class="btn btn-info" (click)="editBien(item)" title="Editar Bien">
                             <i class="fas fa-pencil-alt"></i>
                          </button>
                          <button class="btn" [ngClass]="item.activo ? 'btn-danger' : 'btn-secondary'" (click)="toggleBien(item)" [title]="item.activo ? 'Desactivar' : 'Activar'">
                             <i class="fas" [ngClass]="item.activo ? 'fa-ban' : 'fa-check'"></i>
                          </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="filteredBienes.length === 0">
                    <td colspan="8" class="text-center p-5 text-muted">
                        <i class="fas fa-search fa-4x mb-3 text-light" *ngIf="searchTerm"></i>
                        <i class="fas fa-box-open fa-4x mb-3 text-light" *ngIf="!searchTerm"></i><br>
                        {{ searchTerm ? 'No se encontraron bienes que coincidan con "' + searchTerm + '"' : 'No se encontraron activos en el catálogo.' }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div *ngIf="!loading" class="card-footer clearfix bg-white border-top">
                <div class="text-muted small">
                    Mostrando {{ filteredBienes.length }} de {{ bienes.length }} registros disponibles
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</app-system-layout>

<!-- Modal Formulario Nuevo/Editar Bien -->
<div class="modal fade" [class.show]="showModal" [style.display]="showModal ? 'block' : 'none'" tabindex="-1" role="dialog" data-backdrop="static">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header" [ngClass]="isEditing ? 'bg-primary' : 'bg-success'">
        <h5 class="modal-title text-white">
          <i class="fas" [ngClass]="isEditing ? 'fa-edit' : 'fa-plus'"></i>
          {{ isEditing ? 'Editar Bien' : 'Registrar Nuevo Bien' }}
        </h5>
        <button type="button" class="close text-white" (click)="closeModal()" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <form #bienForm="ngForm" (ngSubmit)="saveBien()">
        <div class="modal-body p-4 bg-light">
           <h6 class="text-primary font-weight-bold mb-3">Información General</h6>
           <div class="row">
             <div class="col-md-9 mb-3">
                <label class="font-weight-bold text-dark text-sm">Nombre del Bien *</label>
                <input type="text" class="form-control" [(ngModel)]="currentBien.nombre" name="nombre" required placeholder="Ej: Papel Bond A4">
             </div>
             <div class="col-md-3 mb-3">
                <label class="font-weight-bold text-dark text-sm">Código Interno</label>
                <input type="text" class="form-control" [(ngModel)]="currentBien.codigo" name="codigo" placeholder="Auto" [readonly]="isEditing">
             </div>
             <div class="col-md-6 mb-3">
                <label class="font-weight-bold text-dark text-sm">Categoría *</label>
                <select class="form-control" [(ngModel)]="currentBien.id_categoria" name="id_categoria" required>
                  <option [ngValue]="null">Seleccione una categoría...</option>
                  <option *ngFor="let cat of categorias" [value]="cat.id_categoria">{{ cat.nombre }}</option>
                </select>
             </div>
             <div class="col-md-6 mb-3">
                <label class="font-weight-bold text-dark text-sm">Unidad de Medida *</label>
                <select class="form-control" [(ngModel)]="currentBien.id_unidad" name="id_unidad" required>
                  <option [ngValue]="null">Seleccione unidad...</option>
                  <option *ngFor="let uni of unidades" [value]="uni.id_unidad">{{ uni.nombre }} ({{ uni.codigo }})</option>
                </select>
             </div>
             <div class="col-md-12 mb-3">
                <label class="font-weight-bold text-dark text-sm">Descripción del Producto</label>
                <textarea class="form-control" [(ngModel)]="currentBien.descripcion" name="descripcion" rows="2" placeholder="Detalles técnicos, marca,..."></textarea>
             </div>
           </div>

           <h6 class="text-primary font-weight-bold mb-3 mt-3 border-top pt-3">Aspectos de Control (Activo Fijo)</h6>
           <div class="row">
             <div class="col-md-4 mb-3 d-flex align-items-center">
                 <div class="custom-control custom-switch mt-2">
                    <input type="checkbox" class="custom-control-input" id="es_activo_fijo" [(ngModel)]="currentBien.es_activo_fijo" name="es_activo_fijo">
                    <label class="custom-control-label font-weight-bold text-dark" for="es_activo_fijo">Es Activo Fijo</label>
                  </div>
             </div>
             <div class="col-md-4 mb-3">
                <label class="font-weight-bold text-dark text-sm">Garantía Inicio</label>
                <input type="date" class="form-control form-control-sm" [(ngModel)]="currentBien.garantia_inicio" name="garantia_inicio">
             </div>
             <div class="col-md-4 mb-3">
                <label class="font-weight-bold text-dark text-sm">Garantía Fin</label>
                <input type="date" class="form-control form-control-sm" [(ngModel)]="currentBien.garantia_fin" name="garantia_fin">
             </div>
           </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" (click)="closeModal()">
             <i class="fas fa-times mr-1"></i> Cancelar
          </button>
          <button type="submit" class="btn" [ngClass]="isEditing ? 'btn-primary' : 'btn-success'" [disabled]="!bienForm.form.valid || saving">
             <i class="fas" [ngClass]="saving ? 'fa-spinner fa-spin' : 'fa-save'"></i>
             {{ saving ? 'Guardando...' : (isEditing ? 'Actualizar Bien' : 'Guardar Bien') }}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Modal ENTRADA -->
<div class="modal fade" [class.show]="showEntradaModal" [style.display]="showEntradaModal ? 'block' : 'none'" tabindex="-1" role="dialog" data-backdrop="static">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header bg-success text-white">
        <h5 class="modal-title"><i class="fas fa-arrow-down mr-2"></i>Registrar Entrada al Almacén</h5>
        <button type="button" class="close text-white" (click)="closeEntradaModal()"><span>&times;</span></button>
      </div>
      <form #entradaForm="ngForm" (ngSubmit)="procesarEntrada()">
        <div class="modal-body p-4 bg-light">
           <div class="alert alert-success bg-white border-success mb-4 shadow-sm">
             <p class="mb-0 text-success"><i class="fas fa-info-circle mr-1"></i> Ingreso para: <strong>{{ selectedBienName }}</strong></p>
           </div>
           
           <h6 class="text-success font-weight-bold mb-3">Detalle del Ingreso</h6>
           <div class="row">
             <div class="col-md-6 mb-3">
               <label class="font-weight-bold text-dark text-sm">Cantidad *</label>
               <div class="input-group">
                 <input type="number" class="form-control form-control-lg text-center font-weight-bold text-success" [(ngModel)]="movimientoEntrada.cantidad" name="cantidad" required min="0.01" step="0.01">
                 <div class="input-group-append"><span class="input-group-text"><i class="fas fa-cubes"></i></span></div>
               </div>
             </div>
             <div class="col-md-6 mb-3">
               <label class="font-weight-bold text-dark text-sm">Costo Unitario (Opcional)</label>
               <div class="input-group">
                 <div class="input-group-prepend"><span class="input-group-text">S/</span></div>
                 <input type="number" class="form-control form-control-lg text-center" [(ngModel)]="movimientoEntrada.costo_unitario" name="costo_unitario" min="0" step="0.01">
               </div>
               <small class="text-muted">Si está vacío usará el coste referencial del sistema.</small>
             </div>
           </div>

           <h6 class="text-success font-weight-bold mb-3 mt-3 border-top pt-3">Documentación de Respaldo</h6>
           <div class="row">
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">Documento de Referencia</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoEntrada.documento_ref" name="documento_ref" placeholder="Ej: Memo 01-2025">
             </div>
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">Orden de Compra</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoEntrada.nro_orden_compra" name="nro_orden_compra" placeholder="OC-12344">
             </div>
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">Factura / Guía</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoEntrada.nro_factura" name="nro_factura" placeholder="F001-999">
             </div>
             <div class="col-md-12 mb-3">
               <label class="font-weight-bold text-dark text-sm">Observaciones Adicionales</label>
               <textarea class="form-control" [(ngModel)]="movimientoEntrada.notas" name="notas" rows="2"></textarea>
             </div>
           </div>
        </div>
        <div class="modal-footer border-top">
          <button type="button" class="btn btn-secondary" (click)="closeEntradaModal()">Cancelar</button>
          <button type="submit" class="btn btn-success" [disabled]="!entradaForm.form.valid || procesandoEntrada">
             <i class="fas fa-save mr-2" *ngIf="!procesandoEntrada"></i>
             <i class="fas fa-spinner fa-spin mr-2" *ngIf="procesandoEntrada"></i>
             {{ procesandoEntrada ? 'Procesando...' : 'Confirmar Ingreso' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Modal SALIDA -->
<div class="modal fade" [class.show]="showSalidaModal" [style.display]="showSalidaModal ? 'block' : 'none'" tabindex="-1" role="dialog" data-backdrop="static">
  <div class="modal-dialog modal-lg" role="document">
    <div class="modal-content">
      <div class="modal-header bg-danger text-white">
         <h5 class="modal-title"><i class="fas fa-arrow-up mr-2"></i>Registrar Salida / Asignación</h5>
         <button type="button" class="close text-white" (click)="closeSalidaModal()"><span>&times;</span></button>
      </div>
      <form #salidaForm="ngForm" (ngSubmit)="procesarSalida()">
        <div class="modal-body p-4 bg-light">
           <div class="alert alert-danger bg-white border-danger mb-4 shadow-sm">
             <p class="mb-0 text-danger"><i class="fas fa-info-circle mr-1"></i> Salida de: <strong>{{ selectedBienName }}</strong></p>
           </div>
           
           <h6 class="text-danger font-weight-bold mb-3">Detalle de la Salida</h6>
           <div class="row">
             <div class="col-md-12 mb-3 text-center">
               <label class="font-weight-bold text-dark text-sm">Cantidad a Extraer *</label>
               <div class="input-group mx-auto" style="max-width: 300px;">
                 <input type="number" class="form-control form-control-lg text-center font-weight-bold text-danger" [(ngModel)]="movimientoSalida.cantidad" name="cantidad" required min="0.01" step="0.01" [max]="maxCantidadSalida">
                 <div class="input-group-append"><span class="input-group-text"><i class="fas fa-cubes"></i></span></div>
               </div>
               <small class="text-danger mt-1 d-block" *ngIf="movimientoSalida.cantidad !== null && movimientoSalida.cantidad > maxCantidadSalida">
                  ¡Error! El máximo a salir es de {{ maxCantidadSalida }}
               </small>
             </div>
           </div>

           <h6 class="text-danger font-weight-bold mb-3 mt-3 border-top pt-3">Receptor y Destino</h6>
           <div class="row">
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">DNI Receptor *</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoSalida.receptor_dni" name="receptor_dni" required maxlength="15">
             </div>
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">Nombre Receptor *</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoSalida.receptor_nombre" name="receptor_nombre" required>
             </div>
             <div class="col-md-4 mb-3">
               <label class="font-weight-bold text-dark text-sm">Cargo / Área</label>
               <input type="text" class="form-control" [(ngModel)]="movimientoSalida.receptor_cargo" name="receptor_cargo">
             </div>
             <div class="col-md-12 mb-3">
               <label class="font-weight-bold text-dark text-sm">Motivo y Finalidad</label>
               <textarea class="form-control" [(ngModel)]="movimientoSalida.notas" name="notas" rows="2"></textarea>
             </div>
             
             <div class="col-md-12 mt-2">
                 <div class="custom-control custom-switch custom-control-lg p-3 bg-white border rounded shadow-sm">
                    <input type="checkbox" class="custom-control-input" id="generar_acta" [(ngModel)]="movimientoSalida.generar_acta" name="generar_acta">
                    <label class="custom-control-label font-weight-bold text-dark pl-2" for="generar_acta">
                      <i class="fas fa-file-signature text-primary mr-1"></i> Expedir Acta de Asignación Física Automáticamente
                    </label>
                  </div>
             </div>
           </div>
        </div>
        <div class="modal-footer border-top">
          <button type="button" class="btn btn-secondary" (click)="closeSalidaModal()">Cancelar</button>
          <button type="submit" class="btn btn-danger" [disabled]="!salidaForm.form.valid || procesandoSalida || (movimientoSalida.cantidad !== null && movimientoSalida.cantidad > maxCantidadSalida)">
             <i class="fas fa-save mr-2" *ngIf="!procesandoSalida"></i>
             <i class="fas fa-spinner fa-spin mr-2" *ngIf="procesandoSalida"></i>
             {{ procesandoSalida ? 'Procesando...' : 'Confirmar Salida' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</div>

<div class="modal-backdrop fade show" *ngIf="showModal || showEntradaModal || showSalidaModal"></div>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.3s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class AlmBienesComponent implements OnInit {
  bienes: any[] = [];
  categorias: any[] = [];
  unidades: any[] = [];
  searchTerm = '';

  loading = false;
  saving = false;

  get filteredBienes() {
    if (!this.searchTerm) return this.bienes;
    const term = this.searchTerm.toLowerCase();
    return this.bienes.filter(b => 
      b.nombre?.toLowerCase().includes(term) || 
      b.codigo?.toLowerCase().includes(term) ||
      b.descripcion?.toLowerCase().includes(term)
    );
  }
  showModal = false;
  isEditing = false;

  currentBien: any = {
    id_bien: null,
    codigo: '',
    nombre: '',
    descripcion: '',
    id_categoria: null,
    id_unidad: null,
    es_activo_fijo: false,
    garantia_inicio: null,
    garantia_fin: null
  };

  showEntradaModal = false;
  showSalidaModal = false;
  procesandoEntrada = false;
  procesandoSalida = false;
  selectedBienName = '';
  maxCantidadSalida = 0;

  movimientoEntrada = {
    id_bien: null,
    cantidad: null,
    costo_unitario: null,
    documento_ref: '',
    nro_orden_compra: '',
    nro_factura: '',
    notas: ''
  };

  movimientoSalida = {
    id_bien: null,
    cantidad: null as number | null,
    documento_ref: '',
    receptor_dni: '',
    receptor_nombre: '',
    receptor_cargo: '',
    notas: '',
    generar_acta: true
  };

  dsService = inject(DesignSystemService);
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('almacen');
  }

  constructor(private api: AlmacenService) { }

  ngOnInit() {
    this.loadCatalogos();
    
    // Suscribirse al cambio de unidad para recargar stock dinámicamente
    this.api.selectedUnitId$.subscribe(() => {
        this.loadData();
    });
  }

  loadData() {
    this.loading = true;
    forkJoin({
      bienes: this.api.getBienes(),
      stock: this.api.getStock()
    }).subscribe({
      next: (res: any) => {
        const stocks = res.stock.data || [];
        this.bienes = res.bienes.data.map((b: any) => {
          const matchingStock = stocks.find((s: any) => s.id_bien === b.id_bien);
          return {
            ...b,
            stock_actual: matchingStock ? Number(matchingStock.cantidad_actual) : 0,
            costo_promedio: matchingStock ? Number(matchingStock.costo_promedio) : 0
          };
        });
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  loadCatalogos() {
    this.api.getCategorias().subscribe((res: any) => this.categorias = res.data);
    this.api.getUnidades().subscribe((res: any) => this.unidades = res.data);
  }

  openModal() {
    this.isEditing = false;
    this.currentBien = { id_bien: null, codigo: '', nombre: '', descripcion: '', id_categoria: null, id_unidad: null, es_activo_fijo: false, garantia_inicio: null, garantia_fin: null };
    this.showModal = true;
  }

  editBien(item: any) {
    this.isEditing = true;
    this.currentBien = { ...item };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  saveBien() {
    this.saving = true;
    const req = this.isEditing ? this.api.updateBien(this.currentBien.id_bien, this.currentBien) : this.api.storeBien(this.currentBien);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.closeModal();
        this.loadData();
      },
      error: () => {
        this.saving = false;
        alert('Error al guardar el bien. Compruebe los datos.');
      }
    });
  }

  toggleBien(item: any) {
    if (confirm(`¿Está seguro de ${item.activo ? 'desactivar' : 'activar'} este bien?`)) {
      this.api.toggleBien(item.id_bien).subscribe({
        next: () => this.loadData(),
        error: () => alert('Error al cambiar el estado')
      });
    }
  }

  openEntradaModal(bien: any) {
    this.movimientoEntrada = { id_bien: null, cantidad: null, costo_unitario: null, documento_ref: '', nro_orden_compra: '', nro_factura: '', notas: '' };
    this.movimientoEntrada.id_bien = bien.id_bien;
    this.selectedBienName = `[${bien.codigo}] ${bien.nombre} - ${bien.unidad?.codigo}`;
    this.showEntradaModal = true;
  }

  closeEntradaModal() {
    this.showEntradaModal = false;
  }

  procesarEntrada() {
    this.procesandoEntrada = true;
    const payload: any = { ...this.movimientoEntrada, tipo: 'ENTRADA' };
    if (!payload.costo_unitario) delete payload.costo_unitario;

    this.api.registrarEntrada(payload).subscribe({
      next: () => {
        this.procesandoEntrada = false;
        alert('✅ ¡Entrada registrada correctamente!');
        this.closeEntradaModal();
        this.loadData();
      },
      error: (err) => {
        this.procesandoEntrada = false;
        alert('❌ Error al procesar entrada: ' + (err.error?.message || err.message));
      }
    });
  }

  openSalidaModal(bien: any) {
    this.movimientoSalida = { id_bien: null, cantidad: null, documento_ref: '', receptor_dni: '', receptor_nombre: '', receptor_cargo: '', notas: '', generar_acta: true };
    this.movimientoSalida.id_bien = bien.id_bien;
    this.maxCantidadSalida = bien.stock_actual;
    this.selectedBienName = `[${bien.codigo}] ${bien.nombre} - Disp: ${bien.stock_actual} ${bien.unidad?.codigo}`;
    this.showSalidaModal = true;
  }

  closeSalidaModal() {
    this.showSalidaModal = false;
  }

  procesarSalida() {
    if (this.movimientoSalida.cantidad !== null && this.movimientoSalida.cantidad > this.maxCantidadSalida) {
      return;
    }
    this.procesandoSalida = true;
    const payload: any = { ...this.movimientoSalida, tipo: 'SALIDA' };

    this.api.registrarSalida(payload).subscribe({
      next: (res) => {
        this.procesandoSalida = false;
        alert('✅ ¡Salida registrada correctamente!' + (res.acta ? ' Acta #' + res.acta.nro_acta + ' generada.' : ''));
        this.closeSalidaModal();
        this.loadData();
      },
      error: (err) => {
        this.procesandoSalida = false;
        alert('❌ Error al procesar salida: ' + (err.error?.message || err.message));
      }
    });
  }
}
