import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-lista-inventarios',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-tasks mr-2"></i>Inventarios en Proceso</h2>
  <div class="card"><div class="card-body"><p>Ver inventarios físicos en curso</p></div></div></div>`
})
export class ListaInventariosComponent {}

