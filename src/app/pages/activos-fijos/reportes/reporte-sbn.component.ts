import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-reporte-sbn',
  standalone: true,
  imports: [CommonModule],
  template: `<div class="container-fluid"><h2><i class="fas fa-landmark mr-2"></i>Reporte SBN</h2>
  <div class="card"><div class="card-body"><p>Reportes oficiales según formato SBN</p></div></div></div>`
})
export class ReporteSbnComponent {}

