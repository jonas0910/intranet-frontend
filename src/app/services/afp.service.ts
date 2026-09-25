import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface Afp {
  id?: number;
  code?: string;
  name: string;
  sunat_code?: string;
  obligatory_rate?: number;
  commission_rate: number;
  insurance_rate: number;
  total_rate?: number;
  effective_from?: string;
  effective_to?: string;
  employees_count?: number;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class AfpService extends GestionTablasBaseService<Afp> {
  constructor(http: HttpClient) {
    super(http, '/planillas/afps');
  }
}

