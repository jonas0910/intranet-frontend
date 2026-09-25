import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface EmployeeContract {
  id?: number;
  employee_id: number;
  contract_number: string;
  contract_type: 'indefinido' | 'plazo_fijo' | 'temporal' | 'locacion' | 'cas' | 'practicas';
  start_date: string;
  end_date?: string;
  renewal_date?: string;
  position_id?: number; // Position ID
  salary: number;
  salary_scale_id?: number;
  cost_center_id?: number;
  weekly_hours: number;
  work_schedule: 'diurno' | 'nocturno' | 'mixto' | 'rotativo';
  has_benefits: boolean;
  has_bonus: boolean;
  has_overtime: boolean;
  special_conditions?: string;
  status: 'vigente' | 'vencido' | 'renovado' | 'rescindido' | 'suspendido';
  document_path?: string;
  documents?: ContractDocument[];
  signed_date?: string;
  signed_by?: string;
  notes?: string;
  created_by?: number;
  updated_by?: number;
  created_at?: string;
  updated_at?: string;
  
  // Relationships
  employee?: any;
  position?: { id: number; name: string; code?: string }; // Position relationship
  salary_scale?: any;
  cost_center?: any;
  
  // Computed attributes
  duration_months?: number;
  is_active?: boolean;
  days_until_expiration?: number;
}

export interface ContractDocument {
  path: string;
  original_name: string;
  uploaded_at: string;
  uploaded_by: number;
}

export interface ContractFilters {
  employee_id?: number;
  status?: string;
  contract_type?: string;
  start_date_from?: string;
  start_date_to?: string;
  expiring_soon?: boolean;
  expiring_days?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: any;
}

export interface PaginatedResponse<T> {
  contracts: T[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeContractService {
  private apiUrl = `${environment.apiUrl}/planillas/employee-contracts`;

  constructor(private http: HttpClient) {}

  /**
   * Get all contracts with filters
   */
  getContracts(filters?: ContractFilters): Observable<ApiResponse<PaginatedResponse<EmployeeContract>>> {
    let params = new HttpParams();
    
    if (filters) {
      Object.keys(filters).forEach(key => {
        const value = (filters as any)[key];
        if (value !== null && value !== undefined && value !== '') {
          params = params.set(key, value.toString());
        }
      });
    }
    
    return this.http.get<ApiResponse<PaginatedResponse<EmployeeContract>>>(this.apiUrl, { params });
  }

  /**
   * Get contracts for a specific employee
   */
  getContractsByEmployee(employeeId: number): Observable<ApiResponse<EmployeeContract[]>> {
    return this.http.get<ApiResponse<EmployeeContract[]>>(`${this.apiUrl}/employee/${employeeId}`);
  }

  /**
   * Get active contract for employee
   */
  getActiveContract(employeeId: number): Observable<ApiResponse<EmployeeContract>> {
    return this.http.get<ApiResponse<EmployeeContract>>(`${this.apiUrl}/employee/${employeeId}/active`);
  }

  /**
   * Get a specific contract by ID
   */
  getContract(id: number): Observable<ApiResponse<EmployeeContract>> {
    return this.http.get<ApiResponse<EmployeeContract>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create a new contract
   */
  createContract(contract: EmployeeContract): Observable<ApiResponse<EmployeeContract>> {
    return this.http.post<ApiResponse<EmployeeContract>>(this.apiUrl, contract);
  }

  /**
   * Update a contract
   */
  updateContract(id: number, contract: Partial<EmployeeContract>): Observable<ApiResponse<EmployeeContract>> {
    return this.http.put<ApiResponse<EmployeeContract>>(`${this.apiUrl}/${id}`, contract);
  }

  /**
   * Delete a contract
   */
  deleteContract(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Upload contract document
   */
  uploadDocument(contractId: number, file: File): Observable<ApiResponse<{ path: string; url: string }>> {
    const formData = new FormData();
    formData.append('document', file);
    
    return this.http.post<ApiResponse<{ path: string; url: string }>>(
      `${this.apiUrl}/${contractId}/upload-document`,
      formData
    );
  }

  /**
   * Delete contract document
   */
  deleteDocument(contractId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/${contractId}/delete-document`);
  }

  /**
   * Get expiring contracts
   */
  getExpiringContracts(days: number = 30): Observable<ApiResponse<EmployeeContract[]>> {
    const params = new HttpParams().set('days', days.toString());
    return this.http.get<ApiResponse<EmployeeContract[]>>(`${this.apiUrl}/expiring`, { params });
  }

  /**
   * Renew a contract
   */
  renewContract(
    contractId: number, 
    data: { new_end_date: string; new_salary?: number; notes?: string }
  ): Observable<ApiResponse<{ old_contract: EmployeeContract; new_contract: EmployeeContract }>> {
    return this.http.post<ApiResponse<{ old_contract: EmployeeContract; new_contract: EmployeeContract }>>(
      `${this.apiUrl}/${contractId}/renew`,
      data
    );
  }

  /**
   * Get contract types
   */
  getContractTypes(): { value: string; label: string }[] {
    return [
      { value: 'indefinido', label: 'Indefinido' },
      { value: 'plazo_fijo', label: 'Plazo Fijo' },
      { value: 'temporal', label: 'Temporal' },
      { value: 'locacion', label: 'Locación de Servicios' },
      { value: 'cas', label: 'CAS' },
      { value: 'practicas', label: 'Prácticas' }
    ];
  }

  /**
   * Get contract statuses
   */
  getContractStatuses(): { value: string; label: string }[] {
    return [
      { value: 'vigente', label: 'Vigente' },
      { value: 'vencido', label: 'Vencido' },
      { value: 'renovado', label: 'Renovado' },
      { value: 'rescindido', label: 'Rescindido' },
      { value: 'suspendido', label: 'Suspendido' }
    ];
  }

  /**
   * Get work schedules
   */
  getWorkSchedules(): { value: string; label: string }[] {
    return [
      { value: 'diurno', label: 'Diurno' },
      { value: 'nocturno', label: 'Nocturno' },
      { value: 'mixto', label: 'Mixto' },
      { value: 'rotativo', label: 'Rotativo' }
    ];
  }

  /**
   * Format contract type label
   */
  getContractTypeLabel(type: string): string {
    const contractType = this.getContractTypes().find(t => t.value === type);
    return contractType ? contractType.label : type;
  }

  /**
   * Format contract status label
   */
  getContractStatusLabel(status: string): string {
    const contractStatus = this.getContractStatuses().find(s => s.value === status);
    return contractStatus ? contractStatus.label : status;
  }

  /**
   * Get status badge class
   */
  getStatusBadgeClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'vigente': 'badge-success',
      'vencido': 'badge-danger',
      'renovado': 'badge-info',
      'rescindido': 'badge-warning',
      'suspendido': 'badge-secondary'
    };
    return statusClasses[status] || 'badge-secondary';
  }

  /**
   * Generate contract document (Word)
   */
  generateContractDocument(contractId: number): Observable<ApiResponse<{ file_path: string; file_name: string; download_url: string }>> {
    return this.http.post<ApiResponse<{ file_path: string; file_name: string; download_url: string }>>(
      `${this.apiUrl}/${contractId}/generate-document`,
      {}
    );
  }

  /**
   * Download contract document
   */
  downloadContract(contractId: number): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/${contractId}/download`, {
      responseType: 'blob'
    });
  }

  /**
   * Get document URL
   */
  getDocumentUrl(path: string): string {
    return `${environment.apiUrl}/storage/${path}`;
  }
}

