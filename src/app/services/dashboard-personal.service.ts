import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface PersonalEmployeeInfo {
  id: number;
  codigo_empleado: string;
  nombres: string;
  apellidos: string;
  cargo: string;
  departamento: string;
  fecha_ingreso: string;
  salario_base: number;
  estado: string;
}

export interface PersonalStats {
  total_pagado_año: number;
  promedio_mensual: number;
  total_deducciones: number;
  total_bonificaciones: number;
  ultimo_pago: number;
  fecha_ultimo_pago: string;
}

export interface MonthlyTotal {
  mes: string;
  anio: number;
  salario_bruto: number;
  deducciones: number;
  salario_neto: number;
  fecha_pago: string;
}

export interface PersonalDashboardData {
  employee: PersonalEmployeeInfo;
  stats: PersonalStats;
  monthly_totals: MonthlyTotal[];
}

export interface PersonalPayrollSummary {
  anio: number;
  total_bruto: number;
  total_deducciones: number;
  total_neto: number;
  meses_pagados: number;
  promedio_mensual: number;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardPersonalService {
  private apiUrl = 'http://localhost:8000/api/planillas';

  constructor(private http: HttpClient) {}

  getPersonalDashboard(employeeId: number, year?: number): Observable<PersonalDashboardData> {
    let params = new HttpParams();
    params = params.set('employee_id', employeeId.toString());
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<PersonalDashboardData>(`${this.apiUrl}/dashboard/personal`, { params });
  }

  getPersonalPayrollSummary(employeeId: number, year?: number): Observable<PersonalPayrollSummary> {
    let params = new HttpParams();
    params = params.set('employee_id', employeeId.toString());
    if (year) {
      params = params.set('year', year.toString());
    }
    return this.http.get<PersonalPayrollSummary>(`${this.apiUrl}/dashboard/personal/summary`, { params });
  }
}