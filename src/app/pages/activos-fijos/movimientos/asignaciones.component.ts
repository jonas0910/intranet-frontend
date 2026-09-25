import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-asignaciones',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-user-check mr-2"></i>Asignación de Responsables</h2>
  <div class="card"><div class="card-body"><p>Asignar activos a responsables</p></div></div></div>`
})
export class AsignacionesComponent {}

