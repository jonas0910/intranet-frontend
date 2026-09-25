import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivoService } from '../services/activo.service';
import { Categoria, Ubicacion } from '../models/activo.model';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-crear-activo',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="container-fluid">
      <div class="row mb-3">
        <div class="col-md-12">
          <h2><i class="fas fa-plus-circle mr-2"></i>Nuevo Activo Fijo</h2>
        </div>
      </div>

      <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'"
        [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">
        <div class="card-header">
          <h3 class="card-title" [style.font-size]="cv.headerFontSize">Formulario de Registro</h3>
        </div>
        <div class="card-body">
          <form (ngSubmit)="guardar()">
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Categoría <span class="text-danger">*</span></label>
                  <select class="form-control" [(ngModel)]="form.categoria_id" name="categoria_id" required>
                    <option value="">Seleccione...</option>
                    <option *ngFor="let cat of categorias" [value]="cat.id">{{cat.nombre}}</option>
                  </select>
                </div>
              </div>
              <div class="col-md-6">
                <div class="form-group">
                  <label>Descripción <span class="text-danger">*</span></label>
                  <input type="text" class="form-control" [(ngModel)]="form.descripcion" name="descripcion" required>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-4">
                <div class="form-group">
                  <label>Valor de Adquisición <span class="text-danger">*</span></label>
                  <input type="number" class="form-control" [(ngModel)]="form.valor_adquisicion" name="valor" required min="0" step="0.01">
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label>Fecha de Adquisición <span class="text-danger">*</span></label>
                  <input type="date" class="form-control" [(ngModel)]="form.fecha_adquisicion" name="fecha" required>
                </div>
              </div>
              <div class="col-md-4">
                <div class="form-group">
                  <label>Tipo de Adquisición <span class="text-danger">*</span></label>
                  <select class="form-control" [(ngModel)]="form.tipo_adquisicion" name="tipo" required>
                    <option value="compra">Compra</option>
                    <option value="donacion">Donación</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="fabricacion">Fabricación</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-6">
                <div class="form-group">
                  <label>Ubicación <span class="text-danger">*</span></label>
                  <select class="form-control" [(ngModel)]="form.ubicacion_id" name="ubicacion" required>
                    <option value="">Seleccione...</option>
                    <option *ngFor="let ubi of ubicaciones" [value]="ubi.id">{{ubi.nombre}}</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Estado <span class="text-danger">*</span></label>
                  <select class="form-control" [(ngModel)]="form.estado" name="estado" required>
                    <option value="activo">Activo</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>
              </div>
              <div class="col-md-3">
                <div class="form-group">
                  <label>Condición <span class="text-danger">*</span></label>
                  <select class="form-control" [(ngModel)]="form.condicion" name="condicion" required>
                    <option value="bueno">Bueno</option>
                    <option value="regular">Regular</option>
                    <option value="malo">Malo</option>
                    <option value="obsoleto">Obsoleto</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="col-md-12">
                <button type="submit" class="btn btn-success" [disabled]="guardando">
                  <i class="fas fa-save mr-1"></i>{{ guardando ? 'Guardando...' : 'Guardar Activo' }}
                </button>
                <a [routerLink]="['/activos-fijos/activos']" class="btn btn-secondary ml-2">
                  <i class="fas fa-times mr-1"></i>Cancelar
                </a>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class CrearActivoComponent implements OnInit {
  categorias: Categoria[] = [];
  ubicaciones: Ubicacion[] = [];
  guardando = false;

  form: any = {
    categoria_id: '',
    descripcion: '',
    valor_adquisicion: 0,
    fecha_adquisicion: '',
    tipo_adquisicion: 'compra',
    ubicacion_id: '',
    estado: 'activo',
    condicion: 'bueno'
  };

  constructor(
    private activoService: ActivoService,
    private router: Router,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {}

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  ngOnInit(): void {
    this.loadCatalogos();
  }

  loadCatalogos(): void {
    this.activoService.listarCategorias().subscribe({
      next: (response) => {
        if (response.success) {
          this.categorias = response.data;
        }
      }
    });

    this.activoService.listarUbicaciones().subscribe({
      next: (response) => {
        if (response.success) {
          this.ubicaciones = response.data;
        }
      }
    });
  }

  guardar(): void {
    this.guardando = true;

    // Convertir strings a numbers
    const datos = {
      ...this.form,
      categoria_id: Number(this.form.categoria_id),
      ubicacion_id: Number(this.form.ubicacion_id),
      valor_adquisicion: Number(this.form.valor_adquisicion)
    };

    this.activoService.crearActivo(datos).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Activo creado exitosamente', 'Éxito');
          this.router.navigate(['/activos-fijos/activos']);
        }
        this.guardando = false;
      },
      error: (error) => {
        this.toast.error('Error al crear activo: ' + (error.error?.message || error.message), 'Error');
        this.guardando = false;
      }
    });
  }
}

