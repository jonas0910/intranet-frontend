import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-categorias',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  template: `
    <app-system-layout [title]="'Categorías de Activos'" [subtitle]="'Gestión de categorías según catálogo SBN'"
      [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Activos Fijos', url: '/activos-fijos'}, {label: 'Categorías'}]"
      [subsystem]="'activos-fijos'">

      <div class="row">
        <div class="col-12">
          <div class="card elevation-1" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'" 
               [style.border-radius.px]="cv.cardBorderRadius">
            <div class="card-header py-2">
              <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
                <i class="fas fa-tags mr-2"></i>Catálogo de Categorías
              </h3>
            </div>
            <div class="card-body">
              <div class="text-center p-5">
                <i class="fas fa-tools fa-4x text-muted mb-3 d-block"></i>
                <p class="text-muted">Módulo en construcción: Integración con catálogo SBN en progreso.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </app-system-layout>
  `
})
export class CategoriasComponent {
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }
  constructor(private dsService: DesignSystemService) { }
}
