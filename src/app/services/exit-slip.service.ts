import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface ExitSlip {
  id?: number;
  employee_id: number;
  exit_date: string; // YYYY-MM-DD
  time_from: string; // HH:mm
  time_to?: string;  // HH:mm
  reason?: string;
  status?: 'draft' | 'submitted' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: number | null;
  approved_at?: string | null;
  rejection_reason?: string | null;
  observations?: string | null;
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class ExitSlipService extends GestionTablasBaseService<ExitSlip> {
  constructor(http: HttpClient) {
    super(http, '/planillas/exit-slips');
  }

  submit(id: number) {
    return this.http.post(`${(window as any).environment.apiUrl || ''}/api/planillas/exit-slips/${id}/submit`, {});
  }

  approve(id: number) {
    return this.http.post(`${(window as any).environment.apiUrl || ''}/api/planillas/exit-slips/${id}/approve`, {});
  }

  reject(id: number, reason: string) {
    return this.http.post(`${(window as any).environment.apiUrl || ''}/api/planillas/exit-slips/${id}/reject`, { reason });
  }

  cancel(id: number) {
    return this.http.post(`${(window as any).environment.apiUrl || ''}/api/planillas/exit-slips/${id}/cancel`, {});
  }
}





