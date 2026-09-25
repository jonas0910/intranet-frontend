import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-conciliacion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-balance-scale mr-2"></i>Conciliación de Inventario</h2>
  <div class="card"><div class="card-body"><p>Conciliar inventario físico vs sistema</p></div></div></div>`
})
export class ConciliacionComponent {}

