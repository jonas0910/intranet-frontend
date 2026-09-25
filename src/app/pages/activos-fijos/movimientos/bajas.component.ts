import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-bajas',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-arrow-down mr-2"></i>Registro de Bajas</h2>
  <div class="card"><div class="card-body"><p>Registro de bajas de activos fijos</p></div></div></div>`
})
export class BajasComponent {}

