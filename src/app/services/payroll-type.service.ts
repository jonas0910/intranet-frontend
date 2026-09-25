import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface PayrollType {
  id?: number;
  code: string;
  name: string;
  description?: string;
  periodicity: string;
  category?: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class PayrollTypeService extends GestionTablasBaseService<PayrollType> {
  constructor(http: HttpClient) {
    super(http, '/planillas/payroll-types');
  }
}

