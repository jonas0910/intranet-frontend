import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface MenuHierarchyItem {
  id: number;
  name: string;
  url: string;
  icon: string;
  level: number;
  order: number;
  active: boolean;
  module: string;
  children: MenuHierarchyItem[];
  parent?: MenuHierarchyItem;
}

@Component({
  selector: 'app-tree-node',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tree-node.component.html',
  styleUrl: './tree-node.component.scss'
})
export class TreeNodeComponent {
  @Input() item!: MenuHierarchyItem;
  @Input() expandedItems!: Set<number>;
  @Input() selectedItem: MenuHierarchyItem | null = null;
  
  @Output() toggleExpanded = new EventEmitter<MenuHierarchyItem>();
  @Output() selectItem = new EventEmitter<MenuHierarchyItem>();

  isExpanded(): boolean {
    return this.expandedItems.has(this.item.id);
  }

  isSelected(): boolean {
    return this.selectedItem?.id === this.item.id;
  }

  onToggleExpanded(event: Event): void {
    event.stopPropagation();
    this.toggleExpanded.emit(this.item);
  }

  onSelectItem(): void {
    this.selectItem.emit(this.item);
  }

  getItemIcon(): string {
    if (this.item.children.length > 0) {
      return this.isExpanded() ? 'fas fa-folder-open' : 'fas fa-folder';
    }
    return this.item.icon;
  }

  getLevelClass(): string {
    const classes = ['level-' + this.item.level];
    if (this.item.level === 0) {
      classes.push('level-root');
    } else if (this.item.level === 1) {
      classes.push('level-primary');
    } else if (this.item.level === 2) {
      classes.push('level-secondary');
    } else {
      classes.push('level-tertiary');
    }
    return classes.join(' ');
  }

  getModuleClass(): string {
    const moduleClasses: { [key: string]: string } = {
      'Core': 'module-core',
      'Planillas': 'module-planillas',
      'RRHH': 'module-rrhh',
      'Contabilidad': 'module-contabilidad',
      'Inventarios': 'module-inventarios'
    };
    return moduleClasses[this.item.module] || 'module-default';
  }

  getStatusClass(): string {
    return this.item.active ? 'status-active' : 'status-inactive';
  }

  getStatusText(): string {
    return this.item.active ? 'Activo' : 'Inactivo';
  }
}
