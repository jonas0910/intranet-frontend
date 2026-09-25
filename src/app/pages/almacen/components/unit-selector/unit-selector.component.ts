import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlmacenService } from '../../services/almacen.service';
import { AuthService } from '../../../../services/auth.service';

@Component({
  selector: 'app-almacen-unit-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isAdmin" class="unit-selector-minimal fade-in d-inline-block">
      <div class="input-group input-group-sm">
        <div class="input-group-prepend">
          <span class="input-group-text bg-transparent border-0 text-muted">
            <i class="fas fa-filter mr-1"></i> Unidad:
          </span>
        </div>
        <select class="form-control form-control-sm border-0 bg-light font-weight-bold" 
                [(ngModel)]="selectedUnitId" (change)="onUnitChange()"
                style="border-radius: 4px; color: #495057; width: auto; min-width: 150px; max-width: 250px;">
          <option [ngValue]="null" disabled>--- Seleccionar Unidad ---</option>
          <option *ngFor="let unit of units" [ngValue]="unit.id">
            {{ unit.name }}
          </option>
        </select>
      </div>
    </div>
  `,
  styles: [`
    .unit-selector-minimal {
      vertical-align: middle;
      padding: 2px 8px;
    }
    select:focus {
      outline: none;
      box-shadow: none;
    }
  `]
})
export class AlmacenUnitSelectorComponent implements OnInit {
  isAdmin = false;
  units: any[] = [];
  selectedUnitId: number | null = null;

  constructor(
    private almacenService: AlmacenService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.isAdmin = this.authService.isSuperAdmin() || 
                   this.authService.hasRole('Admin') || 
                   this.authService.hasPermission('almacen.admin');

    if (this.isAdmin) {
      this.selectedUnitId = this.almacenService.getSelectedUnitId();
      this.loadUnits();
    }
  }

  loadUnits(): void {
    this.almacenService.getOrganizationalUnits().subscribe(res => {
      if (res.success) {
        this.units = res.data;
      }
    });
  }

  onUnitChange(): void {
    this.almacenService.setSelectedUnitId(this.selectedUnitId);
  }

  clearFilter(): void {
    this.selectedUnitId = null;
    this.onUnitChange();
  }
}
