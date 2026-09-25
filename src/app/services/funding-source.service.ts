import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface FundingSource {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type?: string;
  budget_year?: number;
  annual_budget?: number;
  available_balance?: number;
  mef_code?: string;
  siaf_code?: string;
  valid_from?: string;
  valid_to?: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class FundingSourceService extends GestionTablasBaseService<FundingSource> {
  constructor(http: HttpClient) {
    super(http, '/planillas/funding-sources');
  }
}

