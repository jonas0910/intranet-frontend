import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PayrollPeriod {
  id?: number;
  period_name: string;
  year: number;
  month: number;
  start_date: string;
  end_date: string;
  status: 'draft' | 'calculated' | 'approved' | 'closed';
  notes?: string;
  calculated_at?: string;
  approved_at?: string;
  closed_at?: string;
  created_by?: number;
  approved_by?: number;
  created_at?: string;
  updated_at?: string;
  
  // Totales calculados
  total_employees?: number;
  total_gross_salary?: number | string;
  total_net_salary?: number | string;
  total_deductions?: number | string;
  total_employer_contributions?: number | string;
  
  // Relationships
  createdBy?: { id: number; name: string };
  approvedBy?: { id: number; name: string };
  payrollDetails?: any[];
}

export interface PayrollPeriodFilters {
  year?: number;
  month?: number;
  status?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  paginate?: boolean;
  per_page?: number;
  page?: number;
}

export interface PayrollPeriodResponse {
  success: boolean;
  message: string;
  data: PayrollPeriod[] | {
    data: PayrollPeriod[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface SinglePayrollPeriodResponse {
  success: boolean;
  message: string;
  data: PayrollPeriod;
}

export interface ProcessPayrollData {
  employee_ids?: number[];
  auto_approve?: boolean;
  auto_close?: boolean;
  notify_employees?: boolean;
  manual_values?: any[];
}

export interface ProcessPayrollResponse {
  success: boolean;
  message: string;
  data: {
    period: PayrollPeriod;
    results: {
      calculation?: any;
      approval?: any;
      closure?: any;
      notifications?: any;
    };
    employees_processed?: number;
    successful_calculations?: number;
    failed_calculations?: number;
    duration?: string;
  };
}

export interface EmployeePayrollDetail {
  employee_id: number;
  employee_code: string;
  employee_name: string;
  incomes: ConceptDetail[];
  deductions: ConceptDetail[];
  contributions: ConceptDetail[];
  total_income: number;
  total_deductions: number;
  total_contributions: number;
  net_salary: number;
}

export interface ConceptDetail {
  concept_id: number;
  concept_code: string;
  concept_name: string;
  concept_category: string;
  quantity: number;
  unit_value: number;
  calculated_value: number;
  manual_value: number | null;
  final_value: number;
  is_manual_override: boolean;
}

export interface ProcessedPayrollResponse {
  success: boolean;
  message: string;
  data: {
    period: PayrollPeriod;
    template?: any; // Template info if viewing specific template
    process_meta?: {
      template_process_id?: number;
      payroll_number?: string;
      funding_source_id?: number | null;
      cost_center_id?: number | null;
    };
    employees: EmployeePayrollDetail[];
    summary: {
      total_employees: number;
      total_gross_salary: number;
      total_deductions: number;
      total_net_salary: number;
      total_employer_contributions: number;
    };
  };
}

@Injectable({
  providedIn: 'root'
})
export class PayrollPeriodService {
  private apiUrl = `${environment.apiUrl}/planillas/payroll-periods`;

  constructor(private http: HttpClient) {}

  /**
   * Get all payroll periods with filters
   */
  getPeriods(filters: PayrollPeriodFilters = {}): Observable<PayrollPeriodResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof PayrollPeriodFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PayrollPeriodResponse>(this.apiUrl, { params });
  }

  /**
   * Get payroll period by ID
   */
  getPeriod(id: number): Observable<SinglePayrollPeriodResponse> {
    return this.http.get<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new payroll period
   */
  createPeriod(period: Partial<PayrollPeriod>): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(this.apiUrl, period);
  }

  /**
   * Update payroll period
   */
  updatePeriod(id: number, period: Partial<PayrollPeriod>): Observable<SinglePayrollPeriodResponse> {
    return this.http.put<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}`, period);
  }

  /**
   * Delete payroll period
   */
  deletePeriod(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Calculate payroll for period
   */
  calculatePayroll(id: number, data: any = {}): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}/calculate`, data);
  }

  /**
   * Process payroll for period
   */
  processPayroll(id: number, data: ProcessPayrollData): Observable<ProcessPayrollResponse> {
    return this.http.post<ProcessPayrollResponse>(`${this.apiUrl}/${id}/process`, data);
  }

  /**
   * Reopen payroll period
   */
  reopenPeriod(id: number): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}/reopen`, {});
  }

  /**
   * Get payroll summary for period
   */
  getSummary(id: number): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/${id}/summary`);
  }

  /**
   * Get current payroll period
   */
  getCurrentPeriod(): Observable<SinglePayrollPeriodResponse> {
    return this.http.get<SinglePayrollPeriodResponse>(`${this.apiUrl}/current`);
  }

  /**
   * Create next period automatically
   */
  createNextPeriod(): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/create-next`, {});
  }

  /**
   * Get available years
   */
  getAvailableYears(): Observable<{ success: boolean; data: number[]; message: string }> {
    return this.http.get<{ success: boolean; data: number[]; message: string }>(`${this.apiUrl}/available-years`);
  }

  /**
   * Recalculate specific employee in period
   */
  recalculateEmployee(periodId: number, employeeId: number, data: any = {}): Observable<any> {
    return this.http.post(`${this.apiUrl}/${periodId}/recalculate/${employeeId}`, data);
  }

  /**
   * Delete payroll process (reset period to draft)
   */
  deleteProcess(id: number): Observable<{ success: boolean; message: string; data: PayrollPeriod }> {
    return this.http.delete<{ success: boolean; message: string; data: PayrollPeriod }>(`${this.apiUrl}/${id}/delete-process`);
  }

  /**
   * View processed payroll details
   */
  viewProcessed(id: number, templateId?: number): Observable<ProcessedPayrollResponse> {
    let params = new HttpParams();
    if (templateId) {
      params = params.set('template_id', templateId.toString());
    }
    return this.http.get<ProcessedPayrollResponse>(`${this.apiUrl}/${id}/view-processed`, { params });
  }

  /**
   * Approve payroll period
   */
  approvePeriod(id: number): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}/approve`, {});
  }

  /**
   * Unapprove payroll period
   */
  unapprovePeriod(id: number): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}/unapprove`, {});
  }

  /**
   * Close payroll period
   */
  closePeriod(id: number): Observable<SinglePayrollPeriodResponse> {
    return this.http.post<SinglePayrollPeriodResponse>(`${this.apiUrl}/${id}/close`, {});
  }

  /**
   * Get template processes for a period
   */
  getTemplateProcesses(periodId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${periodId}/template-processes`);
  }

  /**
   * Approve template process
   */
  approveTemplateProcess(periodId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/approve`, {});
  }

  /**
   * Unapprove template process
   */
  unapproveTemplateProcess(periodId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/unapprove`, {});
  }

  /**
   * Close template process
   */
  closeTemplateProcess(periodId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/close`, {});
  }

  /**
   * Reprocess template: recalculate and update payroll details in place (no delete)
   */
  reprocessTemplateProcess(periodId: number, templateId: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/reprocess`, {});
  }

  /**
   * Update concept value (manual override)
   * @param templateProcessId Optional - required when viewing a specific template's payroll for correct record lookup
   */
  updateConceptValue(periodId: number, employeeId: number, conceptId: number, value: number, templateProcessId?: number): Observable<any> {
    const body: any = {
      manual_value: value,
      override_reason: 'Valor modificado manualmente desde la interfaz'
    };
    if (templateProcessId) {
      body.template_process_id = templateProcessId;
    }
    return this.http.put<any>(`${this.apiUrl}/${periodId}/employees/${employeeId}/concepts/${conceptId}`, body);
  }

  /**
   * Delete template process
   */
  deleteTemplateProcess(periodId: number, templateId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/delete`);
  }

  /**
   * Update template process meta (funding_source_id, cost_center_id, expense_item_id, payroll_number)
   */
  updateTemplateProcessMeta(periodId: number, templateId: number, meta: Partial<{ funding_source_id: number | null; cost_center_id: number | null; expense_item_id: number | null; payroll_number: string | null; }>): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${periodId}/templates/${templateId}/meta`, meta);
  }

  /**
   * Reporte de planillas: lista de planillas (procesos de plantilla) con totales desde la BD.
   * Filtros: year, month (opcional), tipo_planilla (template type), estado (draft|calculated|approved|closed).
   */
  getReportPlanillas(filters: {
    anio?: number;
    mes?: number | string;
    tipo_planilla?: string;
    estado?: string;
  } = {}): Observable<{ success: boolean; data: any[]; message: string }> {
    let params = new HttpParams();
    if (filters.anio != null) params = params.set('year', filters.anio.toString());
    const mes = filters.mes;
    if (mes != null && mes !== '') params = params.set('month', String(mes));
    if (filters.tipo_planilla != null && filters.tipo_planilla !== '') params = params.set('tipo_planilla', filters.tipo_planilla);
    if (filters.estado != null && filters.estado !== '') params = params.set('estado', filters.estado);
    return this.http.get<{ success: boolean; data: any[]; message: string }>(`${this.apiUrl}/report/planillas`, { params });
  }

  /**
   * Reporte de descuentos: lista de descuentos aplicados desde la BD (payroll_details tipo deduction).
   * Filtros: year, month (opcional), tipo_descuento (código concepto), empleado (DNI o nombre).
   */
  getReportDescuentos(filters: {
    anio?: number;
    mes?: number | string;
    tipo_descuento?: string;
    empleado?: string;
  } = {}): Observable<{ success: boolean; data: any[]; message: string }> {
    let params = new HttpParams();
    if (filters.anio != null) params = params.set('year', filters.anio.toString());
    const mes = filters.mes;
    if (mes != null && mes !== '') params = params.set('month', String(mes));
    if (filters.tipo_descuento != null && filters.tipo_descuento !== '') params = params.set('tipo_descuento', filters.tipo_descuento);
    if (filters.empleado != null && filters.empleado.trim() !== '') params = params.set('empleado', filters.empleado.trim());
    return this.http.get<{ success: boolean; data: any[]; message: string }>(`${this.apiUrl}/report/descuentos`, { params });
  }
}
