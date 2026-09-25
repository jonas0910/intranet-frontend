import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayrollPeriodService } from '../../../services/payroll-period.service';

@Component({
  selector: 'app-reporte-descuentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-descuentos.component.html',
  styleUrls: ['./reporte-descuentos.component.scss']
})
export class ReporteDescuentosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  descuentos: any[] = [];
  errorMessage: string | null = null;

  filtros = {
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    tipo_descuento: '',
    empleado: ''
  };

  meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  tiposDescuento = [
    { value: 'AFP', label: 'AFP' },
    { value: 'ONP', label: 'ONP' },
    { value: 'IR5TA', label: '5ta Categoría' },
    { value: 'TARDANZA', label: 'Tardanzas' },
    { value: 'FALTA', label: 'Faltas' },
    { value: 'PRESTAMO', label: 'Préstamos' },
    { value: 'JUDICIAL', label: 'Desc. Judicial' },
    { value: 'OTROS', label: 'Otros' }
  ];

  constructor(private payrollPeriodService: PayrollPeriodService) {}

  ngOnInit(): void {
    this.loadDescuentos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDescuentos(): void {
    this.loading = true;
    this.errorMessage = null;
    this.payrollPeriodService
      .getReportDescuentos({
        anio: this.filtros.anio,
        mes: this.filtros.mes,
        tipo_descuento: this.filtros.tipo_descuento || undefined,
        empleado: this.filtros.empleado || undefined
      })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.descuentos = res.success && Array.isArray(res.data) ? res.data : [];
          this.loading = false;
        },
        error: (err) => {
          this.errorMessage = err?.error?.message || 'Error al cargar el reporte de descuentos';
          this.descuentos = [];
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadDescuentos();
  }

  exportarExcel(): void {
    alert('Exportando descuentos a Excel...');
  }

  exportarResumen(): void {
    alert('Exportando resumen de descuentos agrupados...');
  }

  getDescuentoIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'AFP': 'fas fa-university',
      'ONP': 'fas fa-landmark',
      'IR5TA': 'fas fa-file-invoice-dollar',
      'TARDANZA': 'fas fa-clock',
      'FALTA': 'fas fa-user-times',
      'PRESTAMO': 'fas fa-hand-holding-usd',
      'JUDICIAL': 'fas fa-gavel',
      'OTROS': 'fas fa-minus-circle'
    };
    return icons[tipo] || 'fas fa-minus-circle';
  }

  formatCurrency(value: number): string {
    return 'S/ ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  getTotalDescuentos(): number {
    return this.descuentos.reduce((sum, desc) => sum + desc.monto, 0);
  }
}

