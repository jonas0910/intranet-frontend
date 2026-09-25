import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PayrollConcept {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type: 'income' | 'deduction' | 'contribution';
  category: 'fixed' | 'variable' | 'calculated';
  formula?: string;
  display_order?: number;
  calculation_priority?: number;
  orden?: number;
  default_value?: number;
  min_value?: number;
  max_value?: number;
  is_visible_in_payslip?: boolean;
  is_taxable?: boolean;
  affects_vacation?: boolean;
  affects_cts?: boolean;
  affects_gratification?: boolean;
  sunat_code?: string;
  sunat_description?: string;
  regime_type?: 'private' | 'public' | 'both';
  applicable_regimes?: string[];
  applicable_departments?: number[];
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
  created_at?: string;
  updated_at?: string;
  
  // Expense item relations
  expense_item_idf?: number | null;
  expense_item_idi?: number | null;
  
  // Computed properties
  is_current?: boolean;
  formula_variables?: string[];
  usage_count?: number;
}

export interface PayrollConceptFilters {
  type?: string;
  category?: string;
  search?: string;
  is_active?: boolean;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  paginate?: boolean;
  per_page?: number;
  page?: number;
}

export interface PayrollConceptResponse {
  success: boolean;
  message: string;
  data: PayrollConcept[] | {
    data: PayrollConcept[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface SinglePayrollConceptResponse {
  success: boolean;
  message: string;
  data: PayrollConcept;
}

export interface FormulaTestResponse {
  success: boolean;
  message: string;
  data?: {
    valid: boolean;
    variables: string[];
    sample_result?: number;
    errors?: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class PayrollConceptService {
  // CRUD protegido para conceptos de planilla
  private apiUrl = `${environment.apiUrl}/planillas/payroll-concepts`;

  constructor(private http: HttpClient) {}

  /**
   * Get all payroll concepts with filters
   */
  getConcepts(filters: PayrollConceptFilters = {}): Observable<PayrollConceptResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof PayrollConceptFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<PayrollConceptResponse>(this.apiUrl, { params });
  }

  /**
   * Get payroll concept by ID
   */
  getConcept(id: number): Observable<SinglePayrollConceptResponse> {
    return this.http.get<SinglePayrollConceptResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new payroll concept
   */
  createConcept(concept: Partial<PayrollConcept>): Observable<SinglePayrollConceptResponse> {
    return this.http.post<SinglePayrollConceptResponse>(this.apiUrl, concept);
  }

  /**
   * Update payroll concept
   */
  updateConcept(id: number, concept: Partial<PayrollConcept>): Observable<SinglePayrollConceptResponse> {
    return this.http.put<SinglePayrollConceptResponse>(`${this.apiUrl}/${id}`, concept);
  }

  /**
   * Delete payroll concept
   */
  deleteConcept(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Test formula syntax
   */
  testFormula(formula: string): Observable<FormulaTestResponse> {
    return this.http.post<FormulaTestResponse>(`${this.apiUrl}/test-formula`, { formula });
  }

  /**
   * Get concepts by type
   */
  getConceptsByType(type: string): Observable<PayrollConceptResponse> {
    return this.http.get<PayrollConceptResponse>(`${this.apiUrl}/by-type/${type}`);
  }

  /**
   * Get concepts for employee
   */
  getConceptsForEmployee(employeeId: number): Observable<PayrollConceptResponse> {
    return this.http.get<PayrollConceptResponse>(`${this.apiUrl}/for-employee/${employeeId}`);
  }

  /**
   * Duplicate concept
   */
  duplicateConcept(id: number, newCode: string, newName: string): Observable<SinglePayrollConceptResponse> {
    return this.http.post<SinglePayrollConceptResponse>(`${this.apiUrl}/${id}/duplicate`, {
      code: newCode,
      name: newName
    });
  }

  /**
   * Get concept types
   */
  getTypes(): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/types`);
  }

  /**
   * Get concept categories
   */
  getCategories(): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/categories`);
  }

  /**
   * Get applicable regimes
   */
  getApplicableRegimes(): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/applicable-regimes`);
  }

  /**
   * Get concept usage statistics
   */
  getUsageStatistics(id: number): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/${id}/usage-statistics`);
  }
}
