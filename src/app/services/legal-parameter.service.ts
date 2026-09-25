import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GestionTablasBaseService, ApiResponse } from './gestion-tablas-base.service';
import { environment } from '../../environments/environment';

export interface LegalParameter {
  id?: number;
  // Frontend aliases
  code?: string;
  name?: string;
  // Backend fields
  parameter_code?: string;
  parameter_name?: string;
  description?: string;
  value: number;
  unit?: string;
  frequency?: 'monthly' | 'yearly' | 'one_time' | string; // alias
  update_frequency?: string;
  effective_from?: string;
  effective_until?: string | null; // alias
  effective_to?: string | null;
  is_active?: boolean;
  notes?: string;
  legal_reference?: string;
  previous_value?: number;
  last_updated?: string;
  updated_by?: number;
  updated_at?: string;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class LegalParameterService extends GestionTablasBaseService<LegalParameter> {
  constructor(http: HttpClient) {
    super(http, '/planillas/legal-parameters');
  }

  getActive(): Observable<ApiResponse<Record<string, number>>> {
    return this.http.get<ApiResponse<Record<string, number>>>(`${environment.apiUrl}/planillas/legal-parameters/active`);
  }
}
