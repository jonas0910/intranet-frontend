import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { GestionTablasBaseService } from './gestion-tablas-base.service';

export interface OrganizationalUnit {
  id?: number;
  code: string;
  name: string;
  description?: string;
  level: number;
  parent_id?: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrganizationalUnitService extends GestionTablasBaseService<OrganizationalUnit> {
  constructor(http: HttpClient) {
    // Usar ruta protegida (CRUD completo soportado)
    super(http, '/planillas/organizational-units');
  }
}

