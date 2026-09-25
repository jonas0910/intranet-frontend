import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface Department {
  id?: number;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
  status?: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

@Injectable({ providedIn: 'root' })
export class DepartmentService extends GestionTablasBaseService<Department> {
  constructor(http: HttpClient) {
    super(http, '/planillas/departments');
  }
}

