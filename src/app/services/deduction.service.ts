import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface Deduction {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type?: string;
  percentage?: number;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class DeductionService extends GestionTablasBaseService<Deduction> {
  constructor(http: HttpClient) {
    super(http, '/planillas/deductions');
  }
}

