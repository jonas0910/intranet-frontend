import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-historial-depreciacion',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-history mr-2"></i>Historial de Depreciación</h2>
  <div class="card"><div class="card-body"><p>Consultar histórico de depreciaciones</p></div></div></div>`
})
export class HistorialDepreciacionComponent {}

