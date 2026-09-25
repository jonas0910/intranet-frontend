import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PayrollTemplate {
  id?: number;
  name: string;
  description?: string;
  type: string; // standard, executive, contractor, intern
  category: string; // monthly, biweekly, weekly, daily
  header_config?: any;
  concept_config?: any;
  selected_concepts?: number[]; // Array de IDs de conceptos seleccionados
  footer_config?: any;
  display_config?: any;
  applicable_regimes?: string[];
  applicable_departments?: number[];
  is_default: boolean;
  is_active: boolean;
  created_by?: number;
  version?: number;
  usage_count?: number;
  is_current?: boolean;
  active_employees_count?: number; // ✅ Contador de empleados con contratos vigentes
  created_at?: string;
  updated_at?: string;
}

export interface PayrollTemplateFilters {
  type?: string;
  category?: string;
  search?: string;
  sort_by?: string;
  sort_direction?: string;
  paginate?: boolean;
  per_page?: number;
  only_with_employees?: boolean; // ✅ Filtrar solo plantillas con empleados
  with_employee_count?: boolean; // ✅ Incluir contador de empleados
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

@Injectable({
  providedIn: 'root'
})
export class PayrollTemplateService {
  private apiUrl = `${environment.apiUrl}/planillas`;

  constructor(private http: HttpClient) {}

  getTemplates(filters: PayrollTemplateFilters = {}): Observable<ApiResponse<any>> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = (filters as any)[key];
      if (value !== null && value !== undefined && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/public/payroll-templates`, { params });
  }

  getTemplate(id: number): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.get<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/public/payroll-templates/${id}`);
  }

  createTemplate(data: Partial<PayrollTemplate>): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.post<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/public/payroll-templates`, data);
  }

  updateTemplate(id: number, data: Partial<PayrollTemplate>): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.put<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/public/payroll-templates/${id}`, data);
  }

  deleteTemplate(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/public/payroll-templates/${id}`);
  }

  duplicateTemplate(id: number, data: any): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.post<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/public/payroll-templates/${id}/duplicate`, data);
  }

  activateTemplate(id: number): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.post<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/public/payroll-templates/${id}/activate`, {});
  }

  getForEmployee(employeeId: number): Observable<ApiResponse<PayrollTemplate>> {
    return this.http.get<ApiResponse<PayrollTemplate>>(`${this.apiUrl}/payroll-templates/for-employee`, {
      params: { employee_id: employeeId.toString() }
    });
  }

  generatePreview(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/payroll-templates/preview`, data);
  }
}

