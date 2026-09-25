import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PayrollPeriodService } from '../../../services/payroll-period.service';

@Component({
  selector: 'app-reporte-boletas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reporte-boletas.component.html',
  styleUrls: ['./reporte-boletas.component.scss']
})
export class ReporteBoletasComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  loadingPlanillas = false;
  planillas: any[] = [];
  selectedPlanilla: any = null;
  /** Todas las boletas de la planilla seleccionada (sin filtro empleado) */
  rawBoletas: any[] = [];
  /** Boletas mostradas (filtradas por empleado si aplica) */
  boletas: any[] = [];
  periodInfo: { period_name?: string; template_name?: string; template_type?: string; payroll_number?: string } = {};

  filtros = {
    anio: new Date().getFullYear(),
    mes: '' as number | string,
    empleado: '',
    tipo_planilla: ''
  };

  meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  tiposPlanilla = [
    { value: 'Permanente', label: 'Permanente' },
    { value: 'CAS', label: 'CAS' },
    { value: 'Practicante', label: 'Practicante' },
    { value: 'Locación', label: 'Locación' }
  ];

  constructor(private payrollPeriodService: PayrollPeriodService) {}

  ngOnInit(): void {
    this.loadPlanillas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlanillas(): void {
    this.loadingPlanillas = true;
    this.planillas = [];
    this.selectedPlanilla = null;
    this.boletas = [];
    const params: any = { anio: this.filtros.anio };
    if (this.filtros.mes !== '' && this.filtros.mes != null) params.mes = this.filtros.mes;
    if (this.filtros.tipo_planilla) params.tipo_planilla = this.filtros.tipo_planilla;

    this.payrollPeriodService.getReportPlanillas(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.planillas = res.success && Array.isArray(res.data) ? res.data : [];
          this.loadingPlanillas = false;
          if (this.planillas.length > 0 && !this.selectedPlanilla) {
            this.selectedPlanilla = this.planillas[0];
            this.loadBoletas();
          }
        },
        error: () => {
          this.planillas = [];
          this.loadingPlanillas = false;
        }
      });
  }

  onPlanillaChange(): void {
    this.loadBoletas();
  }

  loadBoletas(): void {
    if (!this.selectedPlanilla || !this.selectedPlanilla.period_id || !this.selectedPlanilla.template_id) {
      this.boletas = [];
      return;
    }
    this.loading = true;
    this.payrollPeriodService.viewProcessed(
      this.selectedPlanilla.period_id,
      this.selectedPlanilla.template_id
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (!res.success || !res.data) {
          this.boletas = [];
          this.loading = false;
          return;
        }
        const data = res.data;
        this.periodInfo = {
          period_name: data.period?.period_name,
          template_name: data.template?.name,
          template_type: data.template?.type,
          payroll_number: data.process_meta?.payroll_number ?? this.selectedPlanilla?.codigo ?? null
        };
        const employees: any[] = data.employees || [];
        const periodName = (data.period?.period_name || '').replace(/\s+/g, '-');
        this.rawBoletas = employees.map((emp: any) => ({
          id: emp.employee_id,
          codigo: `BOL-${periodName}-${(emp.employee_code || '').replace(/\s+/g, '')}`,
          empleado: {
            id: emp.employee_id,
            nombre: emp.employee_name || '',
            documento: emp.dni || ''
          },
          periodo: this.periodInfo.period_name || '',
          tipo_planilla: this.periodInfo.template_type || this.selectedPlanilla.tipo_planilla || '',
          total_ingresos: emp.total_income ?? 0,
          total_descuentos: emp.total_deductions ?? 0,
          total_neto: emp.net_salary ?? 0,
          _raw: emp
        }));
        this.applyFilter();
        this.loading = false;
      },
      error: () => {
        this.boletas = [];
        this.loading = false;
      }
    });
  }

  /** Filtra rawBoletas por empleado (DNI o nombre) y actualiza boletas */
  applyFilter(): void {
    const search = (this.filtros.empleado || '').toLowerCase().trim();
    if (!search) {
      this.boletas = [...this.rawBoletas];
      return;
    }
    this.boletas = this.rawBoletas.filter((b: any) => {
      const nombre = (b.empleado?.nombre || '').toLowerCase();
      const dni = (b.empleado?.documento || '').toString().toLowerCase();
      const codigo = (b.codigo || '').toLowerCase();
      return nombre.includes(search) || dni.includes(search) || codigo.includes(search);
    });
  }

  onFilterChange(): void {
    this.loadPlanillas();
  }

  exportarExcel(): void {
    alert('Exportar boletas a Excel...');
  }

  imprimirBoleta(boleta: any): void {
    if (!boleta._raw) return;
    const emp = boleta._raw;
    const periodName = this.periodInfo.period_name || boleta.periodo || '';
    let periodoFormato = periodName;
    const mm = periodName.match(/(\d{1,2})[\/\-](\d{4})/);
    if (mm) periodoFormato = `${mm[1].padStart(2, '0')}/${mm[2]}`;
    else {
      const yy = periodName.match(/(\d{4})[\/\-](\d{1,2})/);
      if (yy) periodoFormato = `${String(yy[2]).padStart(2, '0')}/${yy[1]}`;
    }
    const nroPlla = this.periodInfo.payroll_number || boleta.codigo || '—';
    const fmt = (v: number) => (v ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const fmtDate = (s: string | null) => {
      if (!s) return '—';
      const d = new Date(s);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };
    const lastNames = (emp.last_name || '').trim().split(/\s+/);
    const apellidoPaterno = lastNames[0] || '—';
    const apellidoMaterno = lastNames.slice(1).join(' ') || '—';
    const nombres = (emp.first_name || emp.employee_name || '').trim() || '—';
    const contrato = (emp.contract_info && emp.contract_info.contract_type) ? emp.contract_info.contract_type : (this.periodInfo.template_type || '—');
    const nivelRemunerativo = (emp.salary_scale_info && emp.salary_scale_info.scale_description) ? emp.salary_scale_info.scale_description : (emp.position_name || '—');
    const cargo = emp.position_name || nivelRemunerativo || '—';
    const afp = emp.afp_name || '—';
    const cuspp = emp.cuspp || '—';
    const dni = emp.dni || '—';
    const fechaIngreso = fmtDate(emp.hire_date);
    const regimenLaboral = emp.labor_regime ? String(emp.labor_regime) : '—';

    const hoy = new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });

    let filasConceptos = '';
    (emp.incomes || []).forEach((c: any) => {
      filasConceptos += `<tr><td>${(c.concept_name || '').toUpperCase()}</td><td class="text-end">S/ ${fmt(c.final_value)}</td><td class="text-end">—</td><td class="text-end">—</td></tr>`;
    });
    (emp.deductions || []).forEach((c: any) => {
      filasConceptos += `<tr><td>${(c.concept_name || '').toUpperCase()}</td><td class="text-end">—</td><td class="text-end">S/ ${fmt(c.final_value)}</td><td class="text-end">—</td></tr>`;
    });
    (emp.contributions || []).forEach((c: any) => {
      filasConceptos += `<tr><td>${(c.concept_name || '').toUpperCase()}</td><td class="text-end">—</td><td class="text-end">—</td><td class="text-end">S/ ${fmt(c.final_value)}</td></tr>`;
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Boleta de Pago - ${boleta.codigo}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 11px; padding: 16px; max-width: 800px; margin: 0 auto; }
    .boleta-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 4px; }
    .top-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
    .top-right { text-align: right; }
    .info-block { margin-bottom: 10px; }
    .info-block label { font-weight: bold; }
    .two-cols { display: flex; gap: 24px; margin-bottom: 10px; }
    .two-cols > div { flex: 1; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    th, td { border: 1px solid #333; padding: 4px 6px; text-align: left; }
    th { background: #e8e8e8; font-weight: bold; }
    .text-end { text-align: right; }
    .dias-table th, .dias-table td { text-align: center; }
    .totales-row { font-weight: bold; background: #f0f0f0; }
    .neto-row { font-weight: bold; background: #e0e0e0; font-size: 12px; }
    .section-label { font-weight: bold; margin-top: 8px; margin-bottom: 2px; }
  </style>
</head>
<body>
  <div class="boleta-title">BOLETA DE PAGO</div>
  <div class="top-row">
    <div></div>
    <div class="top-right">
      <div>Fecha de impresión: ${hoy}</div>
      <div>Pag. 1</div>
    </div>
  </div>

  <div class="two-cols">
    <div class="info-block">
      <div>RUC: <span>—</span></div>
      <div>Nombre: <span>—</span></div>
      <div>Período: <span>${periodoFormato || periodName}</span></div>
      <div>Meta: <span>—</span></div>
    </div>
    <div class="info-block">
      <div>REG. SIAF: <span>—</span></div>
      <div>N° Plla: <span>${nroPlla}</span></div>
    </div>
  </div>

  <table>
    <thead>
      <tr><th>Código del Trabajador</th><th>Apellido Paterno</th><th>Apellido Materno</th><th>Nombres</th><th>Contrato</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>${emp.employee_code || '—'}</td>
        <td>${apellidoPaterno}</td>
        <td>${apellidoMaterno}</td>
        <td>${nombres}</td>
        <td>${contrato}</td>
      </tr>
    </tbody>
  </table>

  <table>
    <thead>
      <tr><th>Tipo Doc.</th><th>Nro doc.</th><th>Fecha ingreso o reingreso</th><th>Fecha de Fin</th><th>Régimen Laboral</th><th>Nivel Remunerativo</th></tr>
    </thead>
    <tbody>
      <tr>
        <td>DNI</td>
        <td>${dni}</td>
        <td>${fechaIngreso}</td>
        <td>—</td>
        <td>${regimenLaboral}</td>
        <td>${nivelRemunerativo}</td>
      </tr>
      <tr>
        <td colspan="2">DNI: ${dni}</td>
        <td colspan="4">CARGO: ${cargo}</td>
      </tr>
    </tbody>
  </table>

  <div class="info-block">
    <div>AFP: <span>${afp}</span></div>
    <div>CUSPP: <span>${cuspp}</span></div>
  </div>

  <div class="section-label">Días</div>
  <table class="dias-table">
    <thead>
      <tr><th>Trab</th><th>Fer</th><th>Dom</th><th>Sab</th><th>S.Enf</th><th>S.Mat</th><th>TOT</th><th>Hor</th><th>Min</th></tr>
    </thead>
    <tbody>
      <tr><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
    </tbody>
  </table>

  <table>
    <thead>
      <tr><th>Conceptos</th><th class="text-end">Ingreso</th><th class="text-end">Descuentos</th><th class="text-end">Aportes</th></tr>
    </thead>
    <tbody>
      ${filasConceptos}
      <tr class="totales-row">
        <td>Totales S/.</td>
        <td class="text-end">S/ ${fmt(emp.total_income)}</td>
        <td class="text-end">S/ ${fmt(emp.total_deductions)}</td>
        <td class="text-end">S/ ${fmt(emp.total_contributions ?? 0)}</td>
      </tr>
      <tr class="neto-row">
        <td colspan="3">Neto a Pagar S/.</td>
        <td class="text-end">S/ ${fmt(emp.net_salary)}</td>
      </tr>
    </tbody>
  </table>
</body>
</html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.focus();
      setTimeout(() => { w.print(); w.close(); }, 300);
    }
  }

  enviarEmail(boleta: any): void {
    if (confirm(`¿Enviar boleta ${boleta.codigo} al email del empleado?`)) {
      alert('Funcionalidad de envío por email pendiente de implementar.');
    }
  }

  formatCurrency(value: number): string {
    return 'S/ ' + (value ?? 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleDateString('es-PE');
  }
}
