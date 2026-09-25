import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-altas',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-arrow-up mr-2"></i>Registro de Altas</h2>
  <div class="card"><div class="card-body"><p>Registro de nuevas altas de activos fijos</p></div></div></div>`
})
export class AltasComponent {}

