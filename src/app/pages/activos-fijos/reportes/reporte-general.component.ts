import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-reporte-general',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid">
      <h2><i class="fas fa-file-alt mr-2"></i>Reporte General de Activos</h2>
      <div class="card elevation-1" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-success'" 
           [style.border-radius.px]="cv.cardBorderRadius">
        <div class="card-body">
          <p>Reporte completo de todos los activos fijos</p>
        </div>
      </div>
    </div>
  `
})
export class ReporteGeneralComponent {
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }
  constructor(private dsService: DesignSystemService) { }
}
