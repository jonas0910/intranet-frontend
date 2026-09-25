import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { ActivoService } from '../services/activo.service';
import { Activo } from '../models/activo.model';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-detalle-activo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid">
      <div class="row mb-3">
        <div class="col-md-12">
          <h2><i class="fas fa-box mr-2"></i>Detalle de Activo Fijo</h2>
        </div>
      </div>

      <div *ngIf="loading" class="text-center p-5">
        <i class="fas fa-spinner fa-spin fa-3x text-primary"></i>
      </div>

      <div *ngIf="!loading && activo" class="row">
        <div class="col-md-8">
          <div class="card elevation-1" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'" 
               [style.border-radius.px]="cv.cardBorderRadius">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-info-circle mr-2 text-primary"></i>Información del Activo</h3>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-sm" [ngClass]="cv.tableClasses" [style.font-size]="cv.fontSize">
                  <tr>
                    <th style="width: 250px;">Código Patrimonial:</th>
                    <td><strong>{{activo.codigo_patrimonial}}</strong></td>
                  </tr>
                  <tr>
                    <th>Descripción:</th>
                    <td>{{activo.descripcion}}</td>
                  </tr>
                  <tr>
                    <th>Categoría:</th>
                    <td><span class="badge badge-info">{{activo.categoria?.nombre}}</span></td>
                  </tr>
                  <tr>
                    <th>Ubicación:</th>
                    <td>{{activo.ubicacion?.nombre}}</td>
                  </tr>
                  <tr>
                    <th>Responsable:</th>
                    <td>{{activo.responsable?.nombre || 'Sin asignar'}}</td>
                  </tr>
                  <tr>
                    <th>Valor de Adquisición:</th>
                    <td>{{formatCurrency(activo.valor_adquisicion)}}</td>
                  </tr>
                  <tr>
                    <th>Depreciación Acumulada:</th>
                    <td>{{formatCurrency(activo.depreciacion_acumulada)}}</td>
                  </tr>
                  <tr>
                    <th>Valor Neto:</th>
                    <td><strong class="text-primary" style="font-size: 1.1rem;">{{formatCurrency(activo.valor_neto)}}</strong></td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div class="col-md-4">
          <div class="card elevation-1" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'" 
               [style.border-radius.px]="cv.cardBorderRadius">
            <div class="card-header">
              <h3 class="card-title"><i class="fas fa-tools mr-2 text-primary"></i>Acciones</h3>
            </div>
            <div class="card-body">
              <div class="d-grid gap-2">
                <a [routerLink]="['/activos-fijos/activos/editar', activo.id]" class="btn btn-warning btn-block mb-2 shadow-sm">
                  <i class="fas fa-edit mr-2"></i>Editar Activo
                </a>
                <a [routerLink]="['/activos-fijos/activos']" class="btn btn-secondary btn-block shadow-sm">
                  <i class="fas fa-arrow-left mr-2"></i>Volver al Listado
                </a>
              </div>
            </div>
          </div>

          <div class="card elevation-1 mt-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'" 
               [style.border-radius.px]="cv.cardBorderRadius">
            <div class="card-body p-3 text-center">
              <h6>Código QR del Activo</h6>
              <div class="bg-light p-3 border rounded">
                <i class="fas fa-qrcode fa-5x text-dark"></i>
                <div class="mt-2 small text-muted font-weight-bold">{{activo.codigo_patrimonial}}</div>
              </div>
              <button class="btn btn-outline-primary btn-sm btn-block mt-3">
                <i class="fas fa-print mr-1"></i> Imprimir Etiqueta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class DetalleActivoComponent implements OnInit {
  loading = false;
  activo: Activo | null = null;

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  constructor(
    private activoService: ActivoService,
    private route: ActivatedRoute,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) { }

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.loadActivo(id);
  }

  loadActivo(id: number): void {
    this.loading = true;
    this.activoService.obtenerActivo(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.activo = response.data;
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar activo', 'Error');
      }
    });
  }

  formatCurrency(value: number): string {
    return 'S/ ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
}
