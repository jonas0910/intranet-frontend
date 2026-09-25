import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DesignSystemService } from '../../../services/design-system.service';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent implements OnInit {
  @Input() status: string | boolean | number = '';
  @Input() activeText: string = '';
  @Input() inactiveText: string = '';
  @Input() subsystem: string = '';

  private dsActiveClass = 'badge-success';
  private dsInactiveClass = 'badge-secondary';
  private dsActiveText = 'Activo';
  private dsInactiveText = 'Inactivo';

  constructor(private ds: DesignSystemService) {}

  ngOnInit(): void {
    const cv = this.subsystem
      ? this.ds.getCrudViewFor(this.subsystem)
      : this.ds.crudView;
    this.dsActiveClass = cv.statusActiveClass;
    this.dsInactiveClass = cv.statusInactiveClass;
    this.dsActiveText = cv.statusActiveText;
    this.dsInactiveText = cv.statusInactiveText;
  }

  get isActive(): boolean {
    return this.status === true ||
           this.status === 1 ||
           this.status === '1' ||
           String(this.status).toLowerCase() === 'activo' ||
           String(this.status).toLowerCase() === 'active';
  }

  get badgeClass(): string {
    return this.isActive ? this.dsActiveClass : this.dsInactiveClass;
  }

  get label(): string {
    const active = this.activeText || this.dsActiveText;
    const inactive = this.inactiveText || this.dsInactiveText;
    return this.isActive ? active : inactive;
  }
}
