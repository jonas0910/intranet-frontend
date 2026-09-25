import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-kardex',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-clipboard-list mr-2"></i>Kardex Patrimonial</h2>
  <div class="card"><div class="card-body"><p>Kardex detallado por activo</p></div></div></div>`
})
export class KardexComponent {}

