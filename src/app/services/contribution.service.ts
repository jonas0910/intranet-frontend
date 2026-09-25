import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface Contribution {
  id?: number;
  code: string;
  name: string;
  sunat_code?: string;
  type?: string;
  percentage?: number;
  rate: number;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ContributionService extends GestionTablasBaseService<Contribution> {
  constructor(http: HttpClient) {
    super(http, '/planillas/contributions');
  }
}

