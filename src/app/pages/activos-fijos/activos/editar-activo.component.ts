import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-editar-activo',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="container-fluid">
      <h2><i class="fas fa-edit mr-2"></i>Editar Activo Fijo</h2>
      <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'"
        [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">
        <div class="card-body">
          <p>Formulario de edición de activo (por implementar)</p>
          <a [routerLink]="['/activos-fijos/activos']" class="btn btn-secondary">Volver</a>
        </div>
      </div>
    </div>
  `
})
export class EditarActivoComponent {
  constructor(private dsService: DesignSystemService) {}

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }
}

