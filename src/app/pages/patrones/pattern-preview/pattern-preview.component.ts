import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal, NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SistemaPattern } from '../../../services/pattern.service';

@Component({
  selector: 'app-pattern-preview',
  standalone: true,
  imports: [CommonModule, NgbModule],
  templateUrl: './pattern-preview.component.html',
  styleUrls: ['./pattern-preview.component.scss']
})
export class PatternPreviewComponent {
  @Input() pattern?: SistemaPattern;

  constructor(public activeModal: NgbActiveModal) {}

  getTotalSubmenus(): number {
    if (!this.pattern) return 0;
    return this.pattern.menus.reduce((t, m) => t + (m.submenus?.length || 0), 0);
  }

  getTotalPermisos(): number {
    if (!this.pattern) return 0;
    return this.pattern.menus.reduce((t, m) => t + (m.permisos_requeridos?.length || 0), 0);
  }

  getActiveMenus(): number {
    if (!this.pattern) return 0;
    return this.pattern.menus.filter(m => m.estado_default).length;
  }
}
