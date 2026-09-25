import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ComercializacionService } from '../../../../services/comercializacion/comercializacion.service';
import { ToastService } from '../../../../services/toast.service';

import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../../services/crud-export.service';
import { CrudListExportBase } from '../../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  templateUrl: './reportes.component.html',
  styleUrl: './reportes.component.scss'
})
export class ReportesComponent extends CrudListExportBase implements OnInit {
  viewConfig: any = {
    title: 'Reportes de Recaudación',
    icon: 'fas fa-chart-line',
  };

  conceptos: any[] = [];
  fechaInicio: string = new Date().toISOString().split('T')[0];
  fechaFin: string = new Date().toISOString().split('T')[0];
  filtroConcepto: string = '';
  filtroArea: string = '';
  reporteData: any = null;
  isGenerating = false;

  constructor(
    private apiSvc: ComercializacionService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  ngOnInit() {
    this.apiSvc.getConceptos().subscribe({
      next: (res) => this.conceptos = res.data || res || [],
      error: () => this.toast.error('Error al cargar conceptos para filtros')
    });
  }

  generarReporte() {
    this.isGenerating = true;
    this.reporteData = null;
    this.apiSvc.getReporteTotales({
      fecha_inicio: this.fechaInicio,
      fecha_fin: this.fechaFin,
      concepto_id: this.filtroConcepto || undefined,
      centro_costos_id: this.filtroArea || undefined
    }).subscribe({
      next: (res) => {
        this.isGenerating = false;
        const data = (res as any)?.data ?? res;
        this.reporteData = data;
      },
      error: () => {
        this.isGenerating = false;
        this.toast.error('Error al generar el reporte');
      }
    });
  }

  getExportData(): Record<string, unknown>[] {
    if (!this.reporteData) return [];
    const rows: Record<string, unknown>[] = [];
    (this.reporteData.por_areas || []).forEach((r: any) => rows.push({ tipo: 'Área', concepto: r.nombre, cantidad: r.cantidad, total: r.monto_total }));
    (this.reporteData.por_conceptos || []).forEach((r: any) => rows.push({ tipo: 'Concepto', concepto: r.descripcion, cantidad: r.cantidad, total: r.monto_total }));
    return rows.length ? rows : [{ tipo: 'Total', concepto: 'General', cantidad: this.reporteData.total_general?.cantidad ?? 0, total: this.reporteData.total_general?.monto_total ?? 0 }];
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'tipo', label: 'Tipo' },
      { key: 'concepto', label: 'Concepto / Área' },
      { key: 'cantidad', label: 'Cantidad' },
      { key: 'total', label: 'Total (S/)' }
    ];
  }

  getExportTitle(): string { return `Reporte Totales ${this.fechaInicio} - ${this.fechaFin}`; }
  getExportFilename(): string { return 'reporte-totales-' + new Date().getTime(); }
}
