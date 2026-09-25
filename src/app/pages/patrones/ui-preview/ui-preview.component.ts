import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { LayoutConfig } from '../../../services/design-system.service';
import { LayoutShellPreviewComponent } from '../layout-shell-preview/layout-shell-preview.component';

@Component({
  selector: 'app-ui-preview',
  standalone: true,
  imports: [CommonModule, LayoutShellPreviewComponent],
  templateUrl: './ui-preview.component.html',
  styleUrls: ['./ui-preview.component.scss']
})
export class UIPreviewComponent {
  @Input() layout?: LayoutConfig;

  constructor(public activeModal: NgbActiveModal) { }

  get L(): LayoutConfig {
    return this.layout || {
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
  }
}
