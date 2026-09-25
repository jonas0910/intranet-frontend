import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CrudActionsComponent, StatusBadgeComponent } from '../../../shared/components';
import { LayoutConfig } from '../../../services/design-system.service';

const DEFAULT_LAYOUT: LayoutConfig = {
  sidebarBg: '#18191a',
  sidebarText: '#b0b3b8',
  sidebarActiveText: '#4599ff',
  brandBg: '#1877f2',
  brandText: '#ffffff',
  navbarBg: '#1877f2',
  navbarText: 'rgba(255,255,255,0.85)',
  contentBg: '#f4f6f9',
  modalHeaderBg: '#343a40',
  modalHeaderText: '#ffffff',
  cardBorderColor: '#007bff',
  sidebarWidth: 220,
  navbarHeight: 42,
  containerFluidPadding: '2rem',
  showTreeLines: true,
  treeLineColor: 'rgba(255, 255, 255, 0.15)',
  treeBranchLength: 8,
  treeLevel1Offset: '1.6rem',
  treeLevel2Offset: '2.35rem',
  treeLevel3Offset: '3.1rem'
};

@Component({
  selector: 'app-layout-shell-preview',
  standalone: true,
  imports: [CommonModule, CrudActionsComponent, StatusBadgeComponent],
  templateUrl: './layout-shell-preview.component.html',
  styleUrls: ['./layout-shell-preview.component.scss']
})
export class LayoutShellPreviewComponent {
  @Input() layout?: LayoutConfig;

  items = [
    { id: 1, name: 'Proyecto Alpha', status: true, budget: 15000 },
    { id: 2, name: 'Campaña Beta', status: false, budget: 5000 },
    { id: 3, name: 'Mantenimiento Gamma', status: false, budget: 2000 },
    { id: 4, name: 'Auditoría Delta', status: true, budget: 8500 },
    { id: 5, name: 'Capacitación Epsilon', status: true, budget: 3000 },
  ];

  get L(): LayoutConfig {
    return this.layout || DEFAULT_LAYOUT;
  }

  treeStyle(): Record<string, string> {
    const L = this.L;
    const show = L.showTreeLines !== false;
    return {
      '--ds-show-tree-lines': show ? 'block' : 'none',
      '--ds-tree-line-color': L.treeLineColor || 'rgba(255, 255, 255, 0.15)',
      '--ds-tree-branch-length': (L.treeBranchLength ?? 8) + 'px',
      '--ds-tree-level-1-offset': L.treeLevel1Offset || '1.6rem',
      '--ds-tree-level-2-offset': L.treeLevel2Offset || '2.35rem',
      '--ds-tree-level-3-offset': L.treeLevel3Offset || '3.1rem',
      '--lsp-sidebar-text': L.sidebarText,
      '--lsp-sidebar-active': L.sidebarActiveText,
      '--lsp-sidebar-muted': '#8a8d91'
    };
  }
}
