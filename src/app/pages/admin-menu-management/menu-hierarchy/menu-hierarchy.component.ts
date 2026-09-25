import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TreeNodeComponent } from './tree-node/tree-node.component';

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
  selector: 'app-menu-hierarchy',
  standalone: true,
  imports: [CommonModule, RouterModule, TreeNodeComponent],
  templateUrl: './menu-hierarchy.component.html',
  styleUrl: './menu-hierarchy.component.scss'
})
export class MenuHierarchyComponent implements OnInit {
  
  menuHierarchy: MenuHierarchyItem[] = [
    {
      id: 1,
      name: 'Dashboard',
      url: '/dashboard',
      icon: 'fas fa-tachometer-alt',
      level: 0,
      order: 1,
      active: true,
      module: 'Core',
      children: []
    },
    {
      id: 2,
      name: 'Planillas',
      url: '#',
      icon: 'fas fa-money-check-alt',
      level: 0,
      order: 2,
      active: true,
      module: 'Planillas',
      children: [
        {
          id: 3,
          name: 'Empleados',
          url: '/planillas/empleados',
          icon: 'fas fa-users',
          level: 1,
          order: 1,
          active: true,
          module: 'Planillas',
          children: [
            {
              id: 7,
              name: 'Lista de Empleados',
              url: '/planillas/empleados/lista',
              icon: 'fas fa-list',
              level: 2,
              order: 1,
              active: true,
              module: 'Planillas',
              children: []
            },
            {
              id: 8,
              name: 'Nuevo Empleado',
              url: '/planillas/empleados/crear',
              icon: 'fas fa-plus',
              level: 2,
              order: 2,
              active: true,
              module: 'Planillas',
              children: []
            }
          ]
        },
        {
          id: 4,
          name: 'Generar Planilla',
          url: '/planillas/generar',
          icon: 'fas fa-file-invoice',
          level: 1,
          order: 2,
          active: true,
          module: 'Planillas',
          children: []
        },
        {
          id: 5,
          name: 'Reportes',
          url: '/planillas/reportes',
          icon: 'fas fa-chart-bar',
          level: 1,
          order: 3,
          active: true,
          module: 'Planillas',
          children: []
        }
      ]
    },
    {
      id: 6,
      name: 'Gestión Documental',
      url: '#',
      icon: 'fas fa-file-alt',
      level: 0,
      order: 3,
      active: true,
      module: 'Core',
      children: [
        {
          id: 9,
          name: 'Documentos',
          url: '/documentos',
          icon: 'fas fa-file',
          level: 1,
          order: 1,
          active: true,
          module: 'Core',
          children: []
        },
        {
          id: 10,
          name: 'Archivos Compartidos',
          url: '/documentos/compartidos',
          icon: 'fas fa-share-alt',
          level: 1,
          order: 2,
          active: true,
          module: 'Core',
          children: []
        }
      ]
    },
    {
      id: 11,
      name: 'Administración****',
      url: '#',
      icon: 'fas fa-cogs',
      level: 0,
      order: 4,
      active: true,
      module: 'Core',
      children: [
        {
          id: 12,
          name: 'Administrador de Menús',
          url: '/admin-menu-management',
          icon: 'fas fa-sitemap',
          level: 1,
          order: 1,
          active: true,
          module: 'Core',
          children: [
            {
              id: 13,
              name: 'Panel Principal',
              url: '/admin-menu-management',
              icon: 'fas fa-tachometer-alt',
              level: 2,
              order: 1,
              active: true,
              module: 'Core',
              children: []
            },
            {
              id: 14,
              name: 'Lista de Menús',
              url: '/admin-menu-management/menus',
              icon: 'fas fa-list',
              level: 2,
              order: 2,
              active: true,
              module: 'Core',
              children: []
            },
            {
              id: 15,
              name: 'Permisos y Roles',
              url: '/admin-menu-management/roles',
              icon: 'fas fa-key',
              level: 2,
              order: 3,
              active: true,
              module: 'Core',
              children: []
            }
          ]
        }
      ]
    }
  ];

  expandedItems: Set<number> = new Set();
  selectedItem: MenuHierarchyItem | null = null;
  viewMode: 'tree' | 'list' = 'tree';

  constructor() { }

  ngOnInit(): void {
    // Expandir todos los elementos por defecto
    this.expandAll();
  }

  toggleExpanded(item: MenuHierarchyItem): void {
    if (this.expandedItems.has(item.id)) {
      this.expandedItems.delete(item.id);
    } else {
      this.expandedItems.add(item.id);
    }
  }

  isExpanded(item: MenuHierarchyItem): boolean {
    return this.expandedItems.has(item.id);
  }

  expandAll(): void {
    this.expandedItems.clear();
    this.menuHierarchy.forEach(item => {
      this.expandItemRecursive(item);
    });
  }

  collapseAll(): void {
    this.expandedItems.clear();
  }

  private expandItemRecursive(item: MenuHierarchyItem): void {
    if (item.children.length > 0) {
      this.expandedItems.add(item.id);
      item.children.forEach(child => {
        this.expandItemRecursive(child);
      });
    }
  }

  selectItem(item: MenuHierarchyItem): void {
    this.selectedItem = item;
  }

  getItemIcon(item: MenuHierarchyItem): string {
    if (item.children.length > 0) {
      return this.isExpanded(item) ? 'fas fa-folder-open' : 'fas fa-folder';
    }
    return item.icon;
  }

  getLevelClass(level: number): string {
    const classes = ['level-' + level];
    if (level === 0) {
      classes.push('level-root');
    } else if (level === 1) {
      classes.push('level-primary');
    } else if (level === 2) {
      classes.push('level-secondary');
    } else {
      classes.push('level-tertiary');
    }
    return classes.join(' ');
  }

  getModuleClass(module: string): string {
    const moduleClasses: { [key: string]: string } = {
      'Core': 'module-core',
      'Planillas': 'module-planillas',
      'RRHH': 'module-rrhh',
      'Contabilidad': 'module-contabilidad',
      'Inventarios': 'module-inventarios'
    };
    return moduleClasses[module] || 'module-default';
  }

  getStatusClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  getStatusText(active: boolean): string {
    return active ? 'Activo' : 'Inactivo';
  }

  switchViewMode(mode: 'tree' | 'list'): void {
    this.viewMode = mode;
  }

  getFlatList(): MenuHierarchyItem[] {
    const flatList: MenuHierarchyItem[] = [];
    
    const flatten = (items: MenuHierarchyItem[]) => {
      items.forEach(item => {
        flatList.push(item);
        if (item.children.length > 0) {
          flatten(item.children);
        }
      });
    };
    
    flatten(this.menuHierarchy);
    return flatList;
  }

  getTotalItems(): number {
    return this.getFlatList().length;
  }

  getActiveItems(): number {
    return this.getFlatList().filter(item => item.active).length;
  }

  getInactiveItems(): number {
    return this.getFlatList().filter(item => !item.active).length;
  }

}
