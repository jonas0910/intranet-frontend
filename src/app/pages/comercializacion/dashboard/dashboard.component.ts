import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ComercializacionService } from '../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../services/toast.service';

import { DesignSystemService } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, SystemLayoutComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
// Design System Dashboard for Comercializacion
export class DashboardComponent implements OnInit {
  stats: any = {
    recaudacion_mes: 0,
    tramites_pendientes: 0,
    comerciantes_morosos: 0,
    sanciones_recientes: 0
  };

  cv: any;

  constructor(
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    private dsSvc: DesignSystemService
  ) {
    this.cv = this.dsSvc.getCrudViewFor('comercializacion');
  }

  ngOnInit() {
    this.apiSvc.getDashboardStats().subscribe({
      next: (res) => this.stats = res.data,
      error: () => this.toast.error('Error al cargar estadísticas del dashboard')
    });
  }
}
