import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Employee {
  id?: number;
  dni: string;
  ruc?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  address?: string;
  birth_date?: string;
  gender?: 'M' | 'F';
  marital_status?: 'soltero' | 'casado' | 'divorciado' | 'viudo';
  children_count: number;
  employee_code: string;
  hire_date: string;
  department_id?: number;
  position_id?: number;
  cost_center_id?: number;
  labor_regime: '728' | '276' | '1057' | 'cas';
  base_salary: number;
  pension_system: 'afp' | 'onp';
  afp_id?: number;
  cuspp?: string;
  status: 'active' | 'inactive' | 'suspended';
  termination_date?: string;
  termination_reason?: string;
  bank_name?: string;
  bank_account?: string;
  account_type?: 'ahorros' | 'corriente';
  receives_family_allowance: boolean;
  is_unionized: boolean;
  has_life_insurance: boolean;
  
  // Computed fields
  full_name?: string;
  years_of_service?: number;
  is_active?: boolean;
  monthly_family_allowance?: number;
  
  // Timestamps
  created_at?: string;
  updated_at?: string;
  
  // Relationships
  department?: Department;
  position?: Position;
  cost_center?: CostCenter;
  afp?: Afp;
}

export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  manager_id?: number;
  parent_id?: number;
  status: 'active' | 'inactive';
}

export interface Position {
  id: number;
  name: string;
  code: string;
  description?: string;
  department_id?: number;
  level: number;
  min_salary?: number;
  max_salary?: number;
  status: 'active' | 'inactive';
}

export interface CostCenter {
  id: number;
  name: string;
  code: string;
  description?: string;
  budget?: number;
  status: 'active' | 'inactive';
}

export interface Afp {
  id: number;
  name: string;
  code: string;
  obligatory_rate: number;
  commission_rate: number;
  insurance_rate: number;
  status: 'active' | 'inactive';
}

export interface EmployeeFilters {
  search?: string;
  status?: string;
  department_id?: number;
  position_id?: number;
  cost_center_id?: number;
  labor_regime?: string;
  pension_system?: string;
  hire_date_from?: string;
  hire_date_to?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface EmployeeResponse {
  success: boolean;
  message: string;
  data: {
    employees: Employee[];
    pagination: {
      current_page: number;
      last_page: number;
      per_page: number;
      total: number;
      from: number;
      to: number;
    };
  };
}

export interface SingleEmployeeResponse {
  success: boolean;
  message: string;
  data: Employee;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private apiUrl = `${environment.apiUrl}/planillas/employees`;

  constructor(private http: HttpClient) {}

  /**
   * Get all employees with filters and pagination
   */
  getEmployees(filters: EmployeeFilters = {}): Observable<EmployeeResponse> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof EmployeeFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<EmployeeResponse>(this.apiUrl, { params });
  }

  /**
   * Get employee by ID
   */
  getEmployee(id: number): Observable<SingleEmployeeResponse> {
    return this.http.get<SingleEmployeeResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new employee
   */
  createEmployee(employee: Partial<Employee>): Observable<SingleEmployeeResponse> {
    return this.http.post<SingleEmployeeResponse>(this.apiUrl, employee);
  }

  /**
   * Update employee
   */
  updateEmployee(id: number, employee: Partial<Employee>): Observable<SingleEmployeeResponse> {
    return this.http.put<SingleEmployeeResponse>(`${this.apiUrl}/${id}`, employee);
  }

  /**
   * Delete employee
   */
  deleteEmployee(id: number): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get employee payroll summary
   */
  getEmployeePayrollSummary(id: number, periodId?: number): Observable<any> {
    let params = new HttpParams();
    if (periodId) {
      params = params.set('period_id', periodId.toString());
    }
    return this.http.get(`${this.apiUrl}/${id}/payroll-summary`, { params });
  }

  /**
   * Import employees from file
   */
  importEmployees(file: File): Observable<ApiResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ApiResponse>(`${this.apiUrl}/import`, formData);
  }

  /**
   * Export employees to Excel
   */
  exportEmployees(filters: EmployeeFilters = {}): Observable<Blob> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      const value = filters[key as keyof EmployeeFilters];
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get(`${this.apiUrl}/export`, { 
      params,
      responseType: 'blob'
    });
  }

  /**
   * Get departments for dropdown
   */
  getDepartments(): Observable<{ success: boolean; data: Department[] | { data: Department[] } }> {
    return this.http.get<{ success: boolean; data: Department[] | { data: Department[] } }>(`${environment.apiUrl}/planillas/departments`);
  }

  /**
   * Get positions for dropdown
   */
  getPositions(): Observable<{ success: boolean; data: Position[] | { data: Position[] } }> {
    return this.http.get<{ success: boolean; data: Position[] | { data: Position[] } }>(`${environment.apiUrl}/planillas/positions`);
  }

  /**
   * Get cost centers for dropdown
   */
  getCostCenters(): Observable<{ success: boolean; data: CostCenter[] | { data: CostCenter[] } }> {
    return this.http.get<{ success: boolean; data: CostCenter[] | { data: CostCenter[] } }>(`${environment.apiUrl}/planillas/cost-centers`);
  }

  /**
   * Get AFPs for dropdown
   */
  getAfps(): Observable<{ success: boolean; data: Afp[] | { data: Afp[] } }> {
    return this.http.get<{ success: boolean; data: Afp[] | { data: Afp[] } }>(`${environment.apiUrl}/planillas/afps`);
  }
}