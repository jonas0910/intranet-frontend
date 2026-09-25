import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlmacenService } from '../services/almacen.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';

import { AlmacenUnitSelectorComponent } from '../components/unit-selector/unit-selector.component';

@Component({
  selector: 'app-alm-kardex',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, AlmacenUnitSelectorComponent],
  providers: [DatePipe],
  template: `
<app-system-layout [title]="'Kardex Físico y Valorado'" [subtitle]="'Consulta al detalle la vida de cada insumo y activo del almacén'"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Almacén', url: '/almacen'}, {label: 'Kardex'}]"
  [subsystem]="'almacen'">

  <div class="row">
    <div class="col-12">
      <div class="mb-3 d-flex justify-content-end align-items-center">
            <app-almacen-unit-selector></app-almacen-unit-selector>
      </div>
      <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-info'"
        [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">
        
        <div class="card-body p-4 bg-light border-bottom">
            <div class="row align-items-end">
              <div class="col-md-9">
                <div class="form-group mb-0">
                  <label class="font-weight-bold text-dark mb-2"><i class="fas fa-search mr-2"></i>Seleccionar Bien para Consultar:</label>
                  <select class="form-control form-control-lg shadow-sm" [(ngModel)]="idBienSeleccionado" (change)="buscarKardex()">
                    <option [ngValue]="null">--- Despliegue el catálogo y seleccione el producto ---</option>
                    <option *ngFor="let b of bienes" [value]="b.id_bien">
                       [{{ b.codigo }}] {{ b.nombre }}
                    </option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <button class="btn btn-info btn-lg btn-block shadow-sm text-white font-weight-bold" (click)="buscarKardex()" [disabled]="!idBienSeleccionado || loading">
                  <i class="fas fa-search mr-1" *ngIf="!loading"></i>
                  <i class="fas fa-spinner fa-spin mr-1" *ngIf="loading"></i>
                  {{ loading ? 'Buscando...' : 'Buscar Kardex' }}
                </button>
              </div>
            </div>
        </div>

        <div class="card-body p-0">
            <div class="p-3" *ngIf="movimientos.length > 0">
               <h5 class="font-weight-bold text-dark mb-3 px-2 pt-2"><i class="fas fa-list mr-2"></i> Historial de Movimientos</h5>
               <div class="table-responsive">
                 <table class="table table-bordered table-hover table-sm">
                   <thead class="bg-light text-center align-middle">
                     <tr>
                       <th rowspan="2" class="align-middle">Fecha</th>
                       <th rowspan="2" class="align-middle">Referencia</th>
                       <th rowspan="2" class="align-middle">Tipo</th>
                       <th colspan="3" class="bg-success text-white">Ingresos del Almacén</th>
                       <th colspan="3" class="bg-danger text-white">Salidas del Almacén</th>
                       <th colspan="3" class="bg-primary text-white">Saldos Físicos y Valorados</th>
                     </tr>
                     <tr>
                       <th class="bg-success text-white" style="border-top: none;">Cant.</th>
                       <th class="bg-success text-white" style="border-top: none;">C. Unit.</th>
                       <th class="bg-success text-white" style="border-top: none;">C. Total</th>
                       <th class="bg-danger text-white" style="border-top: none;">Cant.</th>
                       <th class="bg-danger text-white" style="border-top: none;">C. Unit.</th>
                       <th class="bg-danger text-white" style="border-top: none;">C. Total</th>
                       <th class="bg-primary text-white" style="border-top: none;">Físico</th>
                       <th class="bg-primary text-white" style="border-top: none;">C. Promedio</th>
                       <th class="bg-primary text-white" style="border-top: none;">C. Total</th>
                     </tr>
                   </thead>
                   <tbody>
                     <tr *ngFor="let m of movimientos" class="text-right">
                       <td class="text-center">{{ m.fecha | date:'dd/MM/yyyy HH:mm' }}</td>
                       <td class="text-left font-weight-bold"><small>{{ m.documento_ref || m.nro_orden_compra || 'Sin ref' }}</small></td>
                       <td class="text-center">
                         <span class="badge" [ngClass]="{
                            'badge-success': m.tipo === 'ENTRADA',
                            'badge-danger': m.tipo === 'SALIDA',
                            'badge-warning': m.tipo === 'AJUSTE',
                            'badge-info': m.tipo === 'TRANSFERENCIA'
                         }">{{ m.tipo }}</span>
                       </td>
                       
                       <!-- Entradas -->
                       <td [ngClass]="{'font-weight-bold text-success': m.tipo === 'ENTRADA' }">{{ (m.tipo === 'ENTRADA' || (m.tipo === 'AJUSTE' && m.cantidad > 0)) ? m.cantidad : '-' }}</td>
                       <td [ngClass]="{'font-weight-bold text-success': m.tipo === 'ENTRADA' }">{{ (m.tipo === 'ENTRADA' || (m.tipo === 'AJUSTE' && m.cantidad > 0)) ? 'S/' + (m.costo_unitario | number:'1.2-2') : '-' }}</td>
                       <td [ngClass]="{'font-weight-bold bg-light text-success': m.tipo === 'ENTRADA' }">{{ (m.tipo === 'ENTRADA' || (m.tipo === 'AJUSTE' && m.cantidad > 0)) ? 'S/' + (m.costo_total | number:'1.2-2') : '-' }}</td>
                       
                       <!-- Salidas -->
                       <td [ngClass]="{'font-weight-bold text-danger': m.tipo === 'SALIDA' }">{{ (m.tipo === 'SALIDA' || (m.tipo === 'TRANSFERENCIA') || (m.tipo === 'AJUSTE' && m.cantidad < 0)) ? (m.cantidad < 0 ? -(m.cantidad) : m.cantidad) : '-' }}</td>
                       <td [ngClass]="{'font-weight-bold text-danger': m.tipo === 'SALIDA' }">{{ (m.tipo === 'SALIDA' || (m.tipo === 'TRANSFERENCIA') || (m.tipo === 'AJUSTE' && m.cantidad < 0)) ? 'S/' + (m.costo_unitario | number:'1.2-2') : '-' }}</td>
                       <td [ngClass]="{'font-weight-bold bg-light text-danger': m.tipo === 'SALIDA' }">{{ (m.tipo === 'SALIDA' || (m.tipo === 'TRANSFERENCIA') || (m.tipo === 'AJUSTE' && m.cantidad < 0)) ? 'S/' + (m.costo_total | number:'1.2-2') : '-' }}</td>

                       <!-- Saldos -->
                       <td class="font-weight-bold text-primary bg-light" style="font-size: 1.1em">{{ m.saldo_cantidad }}</td>
                       <td class="font-weight-bold text-primary bg-light">S/ {{ m.costo_promedio | number:'1.2-4' }}</td>
                       <td class="font-weight-bold text-primary" style="background-color: #e8f4fc; font-size: 1.1em">S/ {{ m.saldo_valorado | number:'1.2-2' }}</td>
                     </tr>
                   </tbody>
                 </table>
               </div>
            </div>
            
            <div class="text-center py-5" *ngIf="movimientos.length === 0 && idBienSeleccionado && !loading">
               <i class="fas fa-file-invoice fa-4x text-muted mb-4 opacity-50"></i>
               <h4 class="text-muted">Sin Movimientos</h4>
               <p class="text-muted">El bien seleccionado aún no posee un Kardex registrado o no ha tenido entradas previas.</p>
            </div>
            
            <div class="text-center py-5" *ngIf="!idBienSeleccionado && !loading">
               <i class="fas fa-search fa-4x text-muted mb-4 opacity-25"></i>
               <h4 class="text-muted">Buscador Inteligente</h4>
               <p class="text-muted">Despliegue la caja superior y presione Enter para obtener resultados.</p>
            </div>
        </div>
      </div>
    </div>
  </div>
</app-system-layout>
  `
})
export class AlmKardexComponent implements OnInit {
  bienes: any[] = [];
  movimientos: any[] = [];
  idBienSeleccionado: number | null = null;
  loading = false;

  dsService = inject(DesignSystemService);

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('almacen');
  }

  constructor(private api: AlmacenService) { }

  ngOnInit() {
    this.api.selectedUnitId$.subscribe(() => {
        this.api.getBienes().subscribe((res: any) => {
          this.bienes = res.data;
          // Si hay un bien seleccionado, recargar sus movimientos para la nueva unidad
          if (this.idBienSeleccionado) {
              this.buscarKardex();
          }
        });
    });
  }

  buscarKardex() {
    if (!this.idBienSeleccionado) return;

    this.loading = true;
    this.api.getKardex(this.idBienSeleccionado).subscribe({
      next: (res: any) => {
        this.movimientos = res.data;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        alert('Error al obtener kardex');
      }
    });
  }
}
