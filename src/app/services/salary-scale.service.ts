import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface SalaryScale {
  id?: number;
  code: string;
  name?: string;
  level?: number;
  base_salary: number;
  description?: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class SalaryScaleService extends GestionTablasBaseService<SalaryScale> {
  constructor(http: HttpClient) {
    super(http, '/planillas/salary-scales');
  }
}

