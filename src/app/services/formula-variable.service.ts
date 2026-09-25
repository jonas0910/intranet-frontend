import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FormulaVariable {
  id?: number;
  name: string;
  display_name: string;
  description?: string;
  data_type: 'integer' | 'decimal' | 'boolean' | 'string' | 'date';
  source_table?: string;
  source_column?: string;
  source_query?: string;
  default_value?: number;
  fixed_value?: number;
  min_value?: number;
  max_value?: number;
  validation_rules?: any[];
  is_system_variable?: boolean;
  requires_employee_context?: boolean;
  requires_period_context?: boolean;
  category?: string;
  display_order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  
  // Computed properties
  usage_count?: number;
  sample_value?: any;
}

export interface FormulaVariableFilters {
  category?: string;
  data_type?: string;
  is_system_variable?: boolean;
  search?: string;
  sort_by?: string;
  sort_direction?: 'asc' | 'desc';
  paginate?: boolean;
  per_page?: number;
  page?: number;
}

export interface FormulaVariableResponse {
  success: boolean;
  message: string;
  data: FormulaVariable[] | {
    data: FormulaVariable[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

export interface SingleFormulaVariableResponse {
  success: boolean;
  message: string;
  data: FormulaVariable;
}

export interface VariableTestResponse {
  success: boolean;
  message: string;
  data?: {
    value: any;
    formatted_value: string;
    errors: string[];
  };
}

@Injectable({
  providedIn: 'root'
})
export class FormulaVariableService {
  private apiUrl = `${environment.apiUrl}/planillas/formula-variables`;

  constructor(private http: HttpClient) {}

  /**
   * Get all formula variables with filters
   */
  getVariables(filters: FormulaVariableFilters = {}): Observable<FormulaVariableResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof FormulaVariableFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<FormulaVariableResponse>(this.apiUrl, { params });
  }

  /**
   * Get formula variable by ID
   */
  getVariable(id: number): Observable<SingleFormulaVariableResponse> {
    return this.http.get<SingleFormulaVariableResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new formula variable
   */
  createVariable(variable: Partial<FormulaVariable>): Observable<SingleFormulaVariableResponse> {
    return this.http.post<SingleFormulaVariableResponse>(this.apiUrl, variable);
  }

  /**
   * Update formula variable
   */
  updateVariable(id: number, variable: Partial<FormulaVariable>): Observable<SingleFormulaVariableResponse> {
    return this.http.put<SingleFormulaVariableResponse>(`${this.apiUrl}/${id}`, variable);
  }

  /**
   * Delete formula variable
   */
  deleteVariable(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Test variable value
   */
  testVariable(id: number, employeeId?: number, periodId?: number): Observable<VariableTestResponse> {
    const params = new HttpParams()
      .set('employee_id', employeeId?.toString() || '')
      .set('period_id', periodId?.toString() || '');
    
    return this.http.get<VariableTestResponse>(`${this.apiUrl}/${id}/test`, { params });
  }

  /**
   * Get variables by category
   */
  getVariablesByCategory(category: string): Observable<FormulaVariableResponse> {
    return this.http.get<FormulaVariableResponse>(`${this.apiUrl}/by-category/${category}`);
  }

  /**
   * Get system variables
   */
  getSystemVariables(): Observable<FormulaVariableResponse> {
    return this.http.get<FormulaVariableResponse>(`${this.apiUrl}/system`);
  }

  /**
   * Get user variables
   */
  getUserVariables(): Observable<FormulaVariableResponse> {
    return this.http.get<FormulaVariableResponse>(`${this.apiUrl}/user`);
  }

  /**
   * Get all variables for formula editor
   */
  getAllForFormula(): Observable<{ success: boolean; data: any[]; message: string }> {
    return this.http.get<{ success: boolean; data: any[]; message: string }>(`${this.apiUrl}/for-formula`);
  }

  /**
   * Get variable usage details
   */
  getUsageDetails(id: number): Observable<{ success: boolean; data: any[]; message: string }> {
    return this.http.get<{ success: boolean; data: any[]; message: string }>(`${this.apiUrl}/${id}/usage-details`);
  }

  /**
   * Get data types
   */
  getDataTypes(): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/data-types`);
  }

  /**
   * Get categories
   */
  getCategories(): Observable<{ success: boolean; data: any; message: string }> {
    return this.http.get<{ success: boolean; data: any; message: string }>(`${this.apiUrl}/categories`);
  }

  /**
   * Validate variable name
   */
  validateVariableName(name: string, excludeId?: number): Observable<{ success: boolean; data: { valid: boolean; message?: string }; message: string }> {
    const params = new HttpParams()
      .set('name', name)
      .set('exclude_id', excludeId?.toString() || '');
    
    return this.http.get<{ success: boolean; data: { valid: boolean; message?: string }; message: string }>(`${this.apiUrl}/validate-name`, { params });
  }
}
