import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-calcular-depreciacion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-calculator mr-2"></i>Cálculo de Depreciación</h2>
  <div class="card"><div class="card-body"><p>Calcular depreciación mensual de activos</p></div></div></div>`
})
export class CalcularDepreciacionComponent {}

