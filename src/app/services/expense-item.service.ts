import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface ExpenseItem {
  id?: number;
  code: string;
  name: string;
  description?: string;
  type: string;
  is_active: boolean;
}

@Injectable({ providedIn: 'root' })
export class ExpenseItemService extends GestionTablasBaseService<ExpenseItem> {
  constructor(http: HttpClient) {
    super(http, '/planillas/expense-items');
  }
}

