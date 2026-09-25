import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-parametros-depreciacion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-cog mr-2"></i>Parámetros de Depreciación</h2>
  <div class="card"><div class="card-body"><p>Configurar parámetros y tasas de depreciación</p></div></div></div>`
})
export class ParametrosDepreciacionComponent {}

