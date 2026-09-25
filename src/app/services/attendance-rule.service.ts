import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GestionTablasBaseService, ApiResponse } from './gestion-tablas-base.service';

export interface AttendanceRule {
  id?: number;
  name: string;
  description?: string;
  late_tolerance_minutes: number;
  late_max_minutes: number;
  discount_per_late_minute?: number;
  lates_before_absence: number;
  accumulate_lates: boolean;
  discount_per_absence_day: number;
  discount_absence_from_salary: boolean;
  absence_day_value_divisor: number;
  early_departure_tolerance_minutes: number;
  discount_per_early_minute?: number;
  applicable_regimes?: string[] | null;
  applicable_departments?: number[] | null;
  applicable_positions?: number[] | null;
  application_period?: string;
  is_active?: boolean;
  is_default?: boolean;
  effective_from?: string;
  effective_to?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class AttendanceRuleService extends GestionTablasBaseService<AttendanceRule> {
  constructor(http: HttpClient) {
    super(http, '/planillas/attendance-rules');
  }

  getActive(): Observable<ApiResponse<AttendanceRule>> {
    return this.http.get<ApiResponse<AttendanceRule>>(`${(window as any).environment.apiUrl}/planillas/attendance-rules/active`);
  }

  setDefault(id: number): Observable<ApiResponse<AttendanceRule>> {
    return this.http.post<ApiResponse<AttendanceRule>>(`${(window as any).environment.apiUrl}/planillas/attendance-rules/${id}/set-default`, {});
  }
}



