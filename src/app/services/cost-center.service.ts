import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface CostCenter {
  id?: number;
  code: string;
  name: string;
  description?: string;
  budget?: number;
  responsible_person?: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class CostCenterService extends GestionTablasBaseService<CostCenter> {
  constructor(http: HttpClient) {
    super(http, '/planillas/cost-centers');
  }
}



