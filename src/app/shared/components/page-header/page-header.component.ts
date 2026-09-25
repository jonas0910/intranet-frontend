import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DesignSystemService, PageHeaderConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './page-header.component.html',
  styleUrls: ['./page-header.component.scss']
})
export class PageHeaderComponent implements OnInit {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  @Input() breadcrumbs: { label: string, url?: string }[] = [];
  @Input() subsystem: string = '';

  ph!: PageHeaderConfig;
  showBreadcrumbs = true;

  constructor(private ds: DesignSystemService) {}

  ngOnInit(): void {
    this.ph = this.subsystem
      ? this.ds.getPageHeaderFor(this.subsystem)
      : this.ds.pageHeader;
    const cv = this.subsystem
      ? this.ds.getCrudViewFor(this.subsystem)
      : this.ds.crudView;
    this.showBreadcrumbs = cv.showBreadcrumbs;
  }
}
