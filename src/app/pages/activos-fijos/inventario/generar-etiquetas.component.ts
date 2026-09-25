import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-generar-etiquetas',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-qrcode mr-2"></i>Generar Etiquetas QR</h2>
  <div class="card"><div class="card-body"><p>Generar etiquetas con código QR para inventario</p></div></div></div>`
})
export class GenerarEtiquetasComponent {}

