import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-nuevo-inventario',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-plus mr-2"></i>Nuevo Inventario Físico</h2>
  <div class="card"><div class="card-body"><p>Iniciar nuevo proceso de inventario físico</p></div></div></div>`
})
export class NuevoInventarioComponent {}

