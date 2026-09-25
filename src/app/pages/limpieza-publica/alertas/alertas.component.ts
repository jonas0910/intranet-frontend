import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-lp-gestion-residuos',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, RouterModule],
  template: `
    <app-system-layout [title]="'Gestión de Residuos'" 
      [subtitle]="'Configuración de catálogos para clasificación y trazabilidad de recolección'"
      [subtitleItems]="[
        { label: 'Registro y control de recolección de residuos sólidos selectivos inorgánicos y orgánicos', icon: 'fas fa-recycle' }
      ]"
      [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Limpieza Pública', url: '/limpieza-publica'}, {label: 'Residuos'}]"
      [subsystem]="'limpieza-publica'">

      <!-- TABS DE NAVEGACIÓN -->
      <ul class="nav nav-tabs" role="tablist">
            <li class="nav-item">
              <a class="nav-link pointer" role="tab" [class.active]="tabActiva === 'tipos'" (click)="tabActiva = 'tipos'">
                <i class="fas fa-recycle mr-2"></i> Tipos de Residuo
              </a>
            </li>
            <li class="nav-item">
              <a class="nav-link pointer" role="tab" [class.active]="tabActiva === 'origenes'" (click)="tabActiva = 'origenes'">
                <i class="fas fa-building mr-2"></i> Origen de Residuos
              </a>
            </li>
          </ul>
<div class="tab-content mt-3">

      <!-- CONTENIDO TRASH TYPES (Tipos de Residuo) -->
      <div *ngIf="tabActiva === 'tipos'" class="animate__animated animate__fadeIn">
        <div class="card elevation-1 border-0" [style.border-radius.px]="6">
          <div class="d-flex justify-content-between align-items-center px-3 py-2 border-bottom bg-white m-0">
            <div class="d-flex align-items-center flex-wrap" style="gap: 6px;">
              <h3 class="card-title mb-0" style="font-size: 1.1rem">
                <i class="fas fa-list-ul mr-1 text-primary"></i> Clasificación de Residuos
              </h3>
            </div>
            <div class="ms-auto flex-shrink-0">
              <button class="btn btn-sm btn-primary" (click)="abrirModal('tipo')">
                <i class="fas fa-plus mr-1"></i> Nuevo Tipo
              </button>
            </div>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-light">
                  <tr>
                    <th class="border-0 px-4">Nombre / Categoría</th>
                    <th class="border-0">Descripción</th>
                    <th class="border-0 text-center">Estado</th>
                    <th class="border-0 text-right px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let t of tiposResiduo">
                    <td class="align-middle px-4">
                      <div class="d-flex align-items-center">
                        <div class="icon-circle bg-light-primary mr-2">
                          <i class="fas fa-leaf text-primary"></i>
                        </div>
                        <span class="font-weight-bold text-dark">{{ t.nombre }}</span>
                      </div>
                    </td>
                    <td class="align-middle text-muted small">{{ t.descripcion || 'Sin descripción' }}</td>
                    <td class="align-middle text-center">
                      <span class="badge px-3 rounded-pill" [class.badge-success]="t.activo" [class.badge-secondary]="!t.activo">
                        {{ t.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="align-middle text-right px-4">
                      <div class="btn-group">
                        <button class="btn btn-sm btn-icon btn-light mr-2" (click)="editarItem('tipo', t)" title="Editar">
                          <i class="fas fa-edit text-primary"></i>
                        </button>
                        <button class="btn btn-sm btn-icon btn-light" (click)="eliminarItem('tipo', t.id_tipo_residuo)" title="Eliminar">
                          <i class="fas fa-trash text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="!tiposResiduo.length && !loading">
                    <td colspan="4" class="text-center py-5 text-muted">
                      <i class="fas fa-folder-open fa-3x mb-3 opacity-25"></i>
                      <p>No hay tipos de residuo configurados</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTENIDO ORIGENS (Origen de Residuos) -->
      <div *ngIf="tabActiva === 'origenes'" class="animate__animated animate__fadeIn">
        <div class="card elevation-1 border-0" [style.border-radius.px]="6">
          <div class="card-header bg-white py-3 d-flex justify-content-between align-items-center">
            <h3 class="card-title font-weight-bold mb-0">
              <i class="fas fa-map-signs mr-2 text-primary"></i> Fuentes de Generación
            </h3>
            <button class="btn btn-primary btn-sm rounded-pill px-3 shadow-sm" (click)="abrirModal('origen')">
              <i class="fas fa-plus-circle mr-1"></i> Nuevo Origen
            </button>
          </div>
          <div class="card-body p-0">
            <div class="table-responsive">
              <table class="table table-hover mb-0">
                <thead class="bg-light">
                  <tr>
                    <th class="border-0 px-4">Nombre del Origen</th>
                    <th class="border-0">Descripción</th>
                    <th class="border-0 text-center">Estado</th>
                    <th class="border-0 text-right px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let o of origenesResiduo">
                    <td class="align-middle px-4">
                      <div class="d-flex align-items-center">
                        <div class="icon-circle bg-light-primary mr-2">
                          <i class="fas fa-home text-primary"></i>
                        </div>
                        <span class="font-weight-bold text-dark">{{ o.nombre }}</span>
                      </div>
                    </td>
                    <td class="align-middle text-muted small">{{ o.descripcion || 'Sin descripción' }}</td>
                    <td class="align-middle text-center">
                      <span class="badge px-3 rounded-pill" [class.badge-success]="o.activo" [class.badge-secondary]="!o.activo">
                        {{ o.activo ? 'Activo' : 'Inactivo' }}
                      </span>
                    </td>
                    <td class="align-middle text-right px-4">
                      <div class="btn-group">
                        <button class="btn btn-sm btn-icon btn-light mr-2" (click)="editarItem('origen', o)" title="Editar">
                          <i class="fas fa-edit text-primary"></i>
                        </button>
                        <button class="btn btn-sm btn-icon btn-light" (click)="eliminarItem('origen', o.id_origen)" title="Eliminar">
                          <i class="fas fa-trash text-danger"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="!origenesResiduo.length && !loading">
                    <td colspan="4" class="text-center py-5 text-muted">
                      <i class="fas fa-warehouse fa-3x mb-3 opacity-25"></i>
                      <p>No hay orígenes de residuo configurados</p>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- MODAL ÚNICO PARA AMBOS CRUDs -->
      <div class="modal fade" [class.show]="mostrarModal" [style.display]="mostrarModal ? 'block' : 'none'" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header border-bottom-0 bg-light">
              <h5 class="modal-title font-weight-bold text-dark">
                {{ itemEdicion?.id ? 'Editar' : 'Nuevo' }} {{ modoModal === 'tipo' ? 'Tipo de Residuo' : 'Origen de Residuo' }}
              </h5>
              <button type="button" class="close" (click)="cerrarModal()">&times;</button>
            </div>
            <div class="modal-body p-4">
              <div class="form-group mb-3">
                <label class="small font-weight-bold text-muted">NOMBRE</label>
                <input type="text" class="form-control" [(ngModel)]="formItem.nombre" placeholder="Ej: Orgánicos, Comercial, etc." />
              </div>
              <div class="form-group mb-3">
                <label class="small font-weight-bold text-muted">DESCRIPCIÓN</label>
                <textarea class="form-control" [(ngModel)]="formItem.descripcion" rows="3" placeholder="Detalle adicional..."></textarea>
              </div>
              <div class="form-group mb-0">
                <label class="small font-weight-bold text-muted">ESTADO</label>
                <div class="custom-control custom-switch pt-1">
                  <input type="checkbox" class="custom-control-input" id="estadoItem" [(ngModel)]="formItem.activo">
                  <label class="custom-control-label" for="estadoItem">{{ formItem.activo ? 'Activo' : 'Inactivo' }}</label>
                </div>
              </div>
            </div>
            <div class="modal-footer border-top-0 bg-light">
              <button type="button" class="btn btn-link text-muted" (click)="cerrarModal()">Cancelar</button>
              <button type="button" class="btn px-4 rounded-pill shadow-sm" 
                [class.btn-primary]="modoModal === 'tipo'"
                [class.btn-primary]="modoModal === 'origen'"
                (click)="guardarItem()">
                <i class="fas fa-save mr-1"></i> Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-backdrop fade" [class.show]="mostrarModal" *ngIf="mostrarModal"></div>

    </div>
    </app-system-layout>
  `,
  styles: [`
    .pointer { cursor: pointer; }
    .bg-light-primary { background-color: rgba(0, 123, 255, 0.08); }
    .text-primary { color: #007bff !important; }
    .btn-primary { background-color: #007bff; color: white; }
    .btn-primary:hover { background-color: #0056b3; color: white; }
    .icon-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .btn-icon { width: 30px; height: 30px; padding: 0; display: inline-flex; align-items: center; justify-content: center; border-radius: 6px; }
    .nav-pills .nav-link.active { box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
  `]
})
export class LpAlertasComponent implements OnInit {
  // Tabs y Estado
  tabActiva: 'tipos' | 'origenes' = 'tipos';
  loading = false;

  // Datos
  tiposResiduo: any[] = [];
  origenesResiduo: any[] = [];

  // Formulario y Modales
  mostrarModal = false;
  modoModal: 'tipo' | 'origen' = 'tipo';
  formItem: any = { nombre: '', descripcion: '', activo: true };
  itemEdicion: any = null;

  private lpService = inject(LimpiezaPublicaService);
  private toast = inject(ToastService);

  ngOnInit(): void {
    this.cargarCatalogos();
  }

  cargarCatalogos(): void {
    this.loading = true;
    this.lpService.getCatalogos().subscribe({
      next: (res: any) => {
        this.tiposResiduo = res.data.tipos_residuo || [];
        this.origenesResiduo = res.data.origenes_residuo || [];
        this.loading = false;
      },
      error: (err: any) => {
        this.toast.error('No se pudieron cargar los catálogos');
        this.loading = false;
      }
    });
  }

  // --- Lógica CRUD ---

  abrirModal(modo: 'tipo' | 'origen'): void {
    this.modoModal = modo;
    this.itemEdicion = null;
    this.formItem = { nombre: '', descripcion: '', activo: true };
    this.mostrarModal = true;
  }

  cerrarModal(): void {
    this.mostrarModal = false;
  }

  editarItem(modo: 'tipo' | 'origen', item: any): void {
    this.modoModal = modo;
    this.itemEdicion = { ...item, id: modo === 'tipo' ? item.id_tipo_residuo : item.id_origen };
    this.formItem = {
      nombre: item.nombre,
      descripcion: item.descripcion,
      activo: !!item.activo
    };
    this.mostrarModal = true;
  }

  guardarItem(): void {
    if (!this.formItem.nombre) {
      this.toast.warning('El nombre es obligatorio');
      return;
    }

    const obs = this.itemEdicion?.id
      ? this.getUpdateObservable()
      : this.getCreateObservable();

    obs.subscribe({
      next: () => {
        this.toast.success('Cambios guardados correctamente');
        this.cerrarModal();
        this.cargarCatalogos();
      },
      error: () => this.toast.error('Error al procesar la solicitud')
    });
  }

  private getCreateObservable() {
    return this.modoModal === 'tipo'
      ? this.lpService.createTipoResiduo(this.formItem)
      : this.lpService.createOrigenResiduo(this.formItem);
  }

  private getUpdateObservable() {
    return this.modoModal === 'tipo'
      ? this.lpService.updateTipoResiduo(this.itemEdicion.id, this.formItem)
      : this.lpService.updateOrigenResiduo(this.itemEdicion.id, this.formItem);
  }

  eliminarItem(modo: 'tipo' | 'origen', id: number): void {
    if (!confirm('¿Está seguro de eliminar este elemento?')) return;

    const obs = modo === 'tipo'
      ? this.lpService.eliminarTipoResiduo(id)
      : this.lpService.eliminarOrigenResiduo(id);

    obs.subscribe({
      next: () => {
        this.toast.success('Elemento eliminado');
        this.cargarCatalogos();
      },
      error: () => this.toast.error('No se pudo eliminar el elemento')
    });
  }
}
