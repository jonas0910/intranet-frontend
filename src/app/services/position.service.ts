import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface Position {
  id?: number;
  code: string;
  name: string;
  description?: string;
  level?: string | number;
  min_salary?: number;
  max_salary?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PositionService extends GestionTablasBaseService<Position> {
  constructor(http: HttpClient) {
    super(http, '/planillas/positions');
  }
}








