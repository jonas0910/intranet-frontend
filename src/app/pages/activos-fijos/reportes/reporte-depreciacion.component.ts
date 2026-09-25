import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reporte-depreciacion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-chart-line mr-2"></i>Reporte de Depreciación</h2>
  <div class="card"><div class="card-body"><p>Reporte consolidado de depreciaciones</p></div></div></div>`
})
export class ReporteDepreciacionComponent {}

