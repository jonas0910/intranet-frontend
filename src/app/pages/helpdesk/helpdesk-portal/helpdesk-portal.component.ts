import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService } from '../../../services/design-system.service';

@Component({
  selector: 'app-helpdesk-portal',
  standalone: true,
  imports: [CommonModule, RouterModule, SystemLayoutComponent],
  templateUrl: './helpdesk-portal.component.html',
})
export class HelpdeskPortalComponent implements OnInit {
  constructor(private designSystem: DesignSystemService) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
  }
}
