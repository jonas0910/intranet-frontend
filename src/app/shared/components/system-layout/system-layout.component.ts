import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DesignSystemService, SystemLayoutConfig as ServiceSystemLayoutConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-system-layout',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './system-layout.component.html',
  styleUrls: ['./system-layout.component.scss']
})
export class SystemLayoutComponent implements OnInit, OnChanges {
  @Input() title: string = '';
  @Input() subtitle: string = '';
  /** Líneas extra bajo el subtítulo (p. ej. icono + texto en módulo Equipo Mecánico). */
  @Input() subtitleItems: { label: string; icon?: string }[] = [];
  @Input() breadcrumbs: { label: string, url?: string }[] = [];
  @Input() subsystem: string = '';
  @Input() config?: Partial<ServiceSystemLayoutConfig>;
  @Input() showHeader: boolean = true;
  @Input() showFooter: boolean = false;
  @Input() showBreadcrumbs: boolean = true;
  @Input() containerFluid: boolean = true;
  @Input() stickyHeader?: boolean;

  constructor(private ds: DesignSystemService) { }

  ngOnInit(): void {
    this.applyDesignSystem();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['subsystem']) {
      this.applyDesignSystem();
    }
  }

  private applyDesignSystem(): void {
    const activeSys = this.subsystem || 'global';
    this.ds.setActiveSubsystem(activeSys);
    this.ds.applyCrudViewCssVariables(activeSys === 'global' ? undefined : activeSys);
  }

  get mergedConfig(): ServiceSystemLayoutConfig {
    const base = this.subsystem ? this.ds.getSystemLayoutFor(this.subsystem) : this.ds.systemLayout;
    const merged = { ...base, ...this.config } as ServiceSystemLayoutConfig;
    const effectiveStickyHeader = this.stickyHeader ?? (merged.stickyHeader ?? true);

    return { ...merged, stickyHeader: effectiveStickyHeader };
  }

  get layoutStyles() {
    const c = this.mergedConfig;
    const styles: Record<string, string> = {
      'padding': c.padding,
      'margin': c.margin,
      'background-color': (c as any).bg || (c as any).backgroundColor || '#ffffff',
      'border-radius': c.borderRadius,
      'border': c.border,
      'box-shadow': c.boxShadow
    };
    if (c.maxWidth != null && c.maxWidth !== '') {
      styles['max-width'] = c.maxWidth;
    }
    return styles;
  }

  get headerStyles() {
    const isSticky = this.mergedConfig.stickyHeader;
    return {
      'padding': this.mergedConfig.headerPadding,
      'border-bottom': this.mergedConfig.showHeader ? '1px solid #e9ecef' : 'none',
      'position': isSticky ? 'sticky' : 'static',
      'top': isSticky ? '42px' : null,
      'z-index': isSticky ? '1020' : null,
      'background-color': (this.mergedConfig as any).headerBackgroundColor || (this.mergedConfig as any).bg || (this.mergedConfig as any).backgroundColor || '#ffffff'
    };
  }

  get contentStyles() {
    return {
      'padding': this.mergedConfig.contentPadding
    };
  }

  get footerStyles() {
    return {
      'padding': this.mergedConfig.footerPadding,
      'border-top': '1px solid #e9ecef'
    };
  }

  get titleStyles() {
    return {
      'font-size': this.mergedConfig.titleSize,
      'color': this.mergedConfig.titleColor
    };
  }

  get subtitleStyles() {
    return {
      'font-size': this.mergedConfig.subtitleSize,
      'color': this.mergedConfig.subtitleColor
    };
  }

  get breadcrumbStyles() {
    return {
      'font-size': this.mergedConfig.breadcrumbSize
    };
  }
}
