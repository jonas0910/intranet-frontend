import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Attendance {
  id?: number;
  employee_id: number;
  date: string;
  scheduled_entry_time: string;
  scheduled_exit_time: string;
  actual_entry_time?: string;
  actual_exit_time?: string;
  status: string;
  late_minutes: number;
  early_departure_minutes: number;
  hours_worked: number;
  overtime_hours: number;
  is_justified: boolean;
  justification?: string;
  justification_document_path?: string;
  approved_by?: number;
  approved_at?: string;
  notes?: string;
  admin_notes?: string;
  entry_latitude?: number;
  entry_longitude?: number;
  exit_latitude?: number;
  exit_longitude?: number;
  entry_device?: string;
  exit_device?: string;
  employee?: {
    id: number;
    employee_code: string;
    first_name: string;
    last_name: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceStatistics {
  total_records: number;
  by_status: {
    [key: string]: number;
  };
  total_late_minutes: number;
  total_early_departure_minutes: number;
  justified_count: number;
  unjustified_count: number;
}

export interface AttendanceCalculation {
  success: boolean;
  employee?: {
    id: number;
    code: string;
    full_name: string;
    department: string;
    base_salary: number;
  };
  period?: {
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  };
  monthly_salary?: number | string;
  daily_salary?: number | string;
  summary?: {
    total_days: number;
    present_days: number;
    late_days: number;
    absent_days: number;
    justified_days: number;
    total_late_minutes: number;
    total_early_departure_minutes: number;
  };
  discounts?: {
    late_discounts: {
      count: number;
      total_minutes: number;
      total: number;
      details: any[];
    };
    absence_discounts: {
      count: number;
      total: number;
      details: any[];
    };
    early_departure_discounts: {
      count: number;
      total_minutes: number;
      total: number;
      details: any[];
    };
    converted_absences: {
      applicable: boolean;
      late_count: number;
      converted_absences: number;
      discount: number;
    };
    total_discount: number;
  };
  details?: any[];
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AttendanceService {
  private apiUrl = `${environment.apiUrl}/planillas/attendances`;

  constructor(private http: HttpClient) {}

  /**
   * Get all attendances with filters
   */
  getAttendances(params?: any): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
          httpParams = httpParams.set(key, params[key]);
        }
      });
    }

    return this.http.get<ApiResponse<any>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get attendance by ID
   */
  getAttendanceById(id: number): Observable<ApiResponse<Attendance>> {
    return this.http.get<ApiResponse<Attendance>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Create new attendance
   */
  createAttendance(data: Partial<Attendance>): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(this.apiUrl, data);
  }

  /**
   * Update attendance
   */
  updateAttendance(id: number, data: Partial<Attendance>): Observable<ApiResponse<Attendance>> {
    return this.http.put<ApiResponse<Attendance>>(`${this.apiUrl}/${id}`, data);
  }

  /**
   * Delete attendance
   */
  deleteAttendance(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`);
  }

  /**
   * Register entry time
   */
  registerEntry(data: {
    employee_id: number;
    date?: string;
    time: string;
    latitude?: number;
    longitude?: number;
    device?: string;
  }): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/register-entry`, data);
  }

  /**
   * Register exit time
   */
  registerExit(data: {
    employee_id: number;
    date?: string;
    time: string;
    latitude?: number;
    longitude?: number;
    device?: string;
  }): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/register-exit`, data);
  }

  /**
   * Justify attendance (late or absence)
   */
  justifyAttendance(id: number, data: {
    justification: string;
    document_path?: string;
  }): Observable<ApiResponse<Attendance>> {
    return this.http.post<ApiResponse<Attendance>>(`${this.apiUrl}/${id}/justify`, data);
  }

  /**
   * Calculate discounts for an employee in a period
   */
  calculateDiscounts(employeeId: number, periodId: number): Observable<AttendanceCalculation> {
    return this.http.post<AttendanceCalculation>(`${this.apiUrl}/calculate-discounts`, {
      employee_id: employeeId,
      period_id: periodId
    });
  }

  /**
   * Get period summary
   */
  getPeriodSummary(periodId: number, employeeIds?: number[]): Observable<ApiResponse<any>> {
    const data: any = { period_id: periodId };
    if (employeeIds && employeeIds.length > 0) {
      data.employee_ids = employeeIds;
    }
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/period-summary`, data);
  }

  /**
   * Import attendances
   */
  importAttendances(attendances: Partial<Attendance>[]): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/import`, { attendances });
  }

  /**
   * Get statistics
   */
  getStatistics(startDate?: string, endDate?: string, employeeId?: number, departmentId?: number): Observable<ApiResponse<AttendanceStatistics>> {
    let params = new HttpParams();
    if (startDate) params = params.set('start_date', startDate);
    if (endDate) params = params.set('end_date', endDate);
    if (employeeId) params = params.set('employee_id', employeeId.toString());
    if (departmentId) params = params.set('department_id', departmentId.toString());

    return this.http.get<ApiResponse<AttendanceStatistics>>(`${this.apiUrl}/statistics`, { params });
  }
}


