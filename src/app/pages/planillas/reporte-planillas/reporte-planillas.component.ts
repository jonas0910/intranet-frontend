import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayrollPeriodService } from '../../../services/payroll-period.service';

@Component({
  selector: 'app-reporte-planillas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-planillas.component.html',
  styleUrls: ['./reporte-planillas.component.scss']
})
export class ReportePlanillasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  planillas: any[] = [];

  filtros = {
    anio: new Date().getFullYear(),
    mes: '' as string | number,
    tipo_planilla: '',
    estado: ''
  };

  tiposPlanilla = [
    { value: 'Permanente', label: 'Permanente' },
    { value: 'CAS', label: 'CAS' },
    { value: 'Practicante', label: 'Practicante' },
    { value: 'Locación', label: 'Locación' }
  ];

  estados = [
    { value: 'draft', label: 'Borrador' },
    { value: 'calculated', label: 'Calculado' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'closed', label: 'Cerrado' }
  ];

  meses = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  constructor(
    private payrollPeriodService: PayrollPeriodService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadPlanillas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlanillas(): void {
    this.loading = true;
    const params: any = { anio: this.filtros.anio };
    if (this.filtros.mes !== '' && this.filtros.mes != null) params.mes = this.filtros.mes;
    if (this.filtros.tipo_planilla) params.tipo_planilla = this.filtros.tipo_planilla;
    if (this.filtros.estado) params.estado = this.filtros.estado;

    this.payrollPeriodService.getReportPlanillas(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.planillas = res.success && Array.isArray(res.data) ? res.data : [];
          this.loading = false;
        },
        error: () => {
          this.planillas = [];
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadPlanillas();
  }

  exportarExcel(): void {
    alert('Exportar reporte a Excel...');
    // TODO: implementar exportación con datos reales
  }

  exportarPDF(): void {
    alert('Exportar reporte a PDF...');
    // TODO: implementar exportación con datos reales
  }

  verDetalle(planilla: any): void {
    if (planilla.period_id && planilla.template_id) {
      this.router.navigate(['/planillas/procesar'], {
        queryParams: { period_id: planilla.period_id, template_id: planilla.template_id, solo_preview: '1' }
      });
    }
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'draft': 'badge-secondary',
      'calculated': 'badge-info',
      'approved': 'badge-success',
      'closed': 'badge-dark'
    };
    return classes[estado || ''] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    const item = this.estados.find(e => e.value === estado);
    return item ? item.label : (estado || '');
  }

  formatCurrency(value: number): string {
    return 'S/ ' + (value ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  formatDate(date: string | null): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-PE');
  }
}

