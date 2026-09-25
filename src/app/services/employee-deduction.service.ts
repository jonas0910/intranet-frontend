import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiResponse } from './gestion-tablas-base.service';
import { environment } from '../../environments/environment';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface EmployeeDeductionPayload {
  employee_id: number;
  deduction_id: number;
  total_amount: number;
  installments: number;
  start_date: string;
  notes?: string;
}

@Injectable({ providedIn: 'root' })
export class EmployeeDeductionService extends GestionTablasBaseService<EmployeeDeductionPayload> {
  constructor(http: HttpClient) { super(http, '/planillas/employee-deductions'); }

  list(filters: { employee_id?: number; deduction_id?: number }): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (filters.employee_id) params = params.set('employee_id', String(filters.employee_id));
    if (filters.deduction_id) params = params.set('deduction_id', String(filters.deduction_id));
    return this.http.get<ApiResponse<any[]>>(`${environment.apiUrl}${this.endpoint}`, { params });
  }
}


