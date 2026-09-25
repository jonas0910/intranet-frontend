import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-escanear',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-camera mr-2"></i>Escanear Activos</h2>
  <div class="card"><div class="card-body"><p>Escanear códigos QR/Barras de activos</p></div></div></div>`
})
export class EscanearComponent {}

