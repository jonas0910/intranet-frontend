import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

declare var Swal: any;

interface MenuNode {
  id: number;
  nombre: string;
  icono: string;
  url: string;
  activo: boolean;
  parent_id: number | null;
  ubicacion: string;
  tipo: string;
  orden: number;
  children: MenuNode[];
}

interface PaginaOption {
  id: number;
  titulo: string;
  slug: string;
}

@Component({
  selector: 'app-menu-builder',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menu-builder.component.html'
})
export class MenuBuilderComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  tabs = [
    { key: 'principal', label: 'Menú Principal', icon: 'fas fa-bars' },
    { key: 'footer', label: 'Menú Footer', icon: 'fas fa-shoe-prints' },
    { key: 'lateral', label: 'Menú Lateral', icon: 'fas fa-align-left' }
  ];

  activeTab = 'principal';
  cargando = false;
  guardando = false;

  menusPrincipal: MenuNode[] = [];
  menusFooter: MenuNode[] = [];
  menusLateral: MenuNode[] = [];
  paginas: PaginaOption[] = [];

  nuevoItem: any = {
    nombre: '',
    ubicacion: 'principal',
    tipo: 'interno',
    pagina_id: null,
    url: '',
    icono: 'fas fa-link',
    activo: true,
    abrir_nueva_ventana: false
  };

  draggedItem: MenuNode | null = null;
  dragOverId: number | null = null;
  expandedNodes: Set<number> = new Set();

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    this.loadSweetAlert();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSweetAlert(): void {
    if (typeof Swal === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
      document.head.appendChild(script);
    }
  }

  cargar(): void {
    this.cargando = true;
    this.service.getBuilderData().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.menusPrincipal = data.menus?.principal || [];
        this.menusFooter = data.menus?.footer || [];
        this.menusLateral = data.menus?.lateral || [];
        this.paginas = data.paginas || [];
        this.expandAll();
        this.cargando = false;
      },
      error: () => { this.cargando = false; }
    });
  }

  getMenusActivos(): MenuNode[] {
    switch (this.activeTab) {
      case 'principal': return this.menusPrincipal;
      case 'footer': return this.menusFooter;
      case 'lateral': return this.menusLateral;
      default: return [];
    }
  }

  setMenusActivos(menus: MenuNode[]): void {
    switch (this.activeTab) {
      case 'principal': this.menusPrincipal = menus; break;
      case 'footer': this.menusFooter = menus; break;
      case 'lateral': this.menusLateral = menus; break;
    }
  }

  isExpanded(id: number): boolean {
    return this.expandedNodes.has(id);
  }

  toggleExpand(id: number): void {
    if (this.expandedNodes.has(id)) {
      this.expandedNodes.delete(id);
    } else {
      this.expandedNodes.add(id);
    }
  }

  expandAll(): void {
    const addAll = (items: MenuNode[]) => {
      items.forEach(item => {
        if (item.children && item.children.length > 0) {
          this.expandedNodes.add(item.id);
          addAll(item.children);
        }
      });
    };
    addAll(this.menusPrincipal);
    addAll(this.menusFooter);
    addAll(this.menusLateral);
  }

  collapseAll(): void {
    this.expandedNodes.clear();
  }

  onDragStart(event: DragEvent, item: MenuNode, parentList: MenuNode[]): void {
    this.draggedItem = item;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(item.id));
    }
    (event.target as HTMLElement).classList.add('dd-dragging');
  }

  onDragOver(event: DragEvent, targetItem: MenuNode): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverId = targetItem.id;
  }

  onDragLeave(event: DragEvent): void {
    this.dragOverId = null;
  }

  onDrop(event: DragEvent, targetItem: MenuNode, parentList: MenuNode[], asChild: boolean = false): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverId = null;

    if (!this.draggedItem || this.draggedItem.id === targetItem.id) {
      this.draggedItem = null;
      return;
    }

    if (asChild && this.isDescendant(this.draggedItem, targetItem)) {
      this.draggedItem = null;
      return;
    }

    const menus = this.getMenusActivos();
    this.removeFromTree(menus, this.draggedItem.id);

    if (asChild) {
      if (!targetItem.children) targetItem.children = [];
      targetItem.children.push(this.draggedItem);
      this.expandedNodes.add(targetItem.id);
    } else {
      const idx = parentList.indexOf(targetItem);
      if (idx !== -1) {
        parentList.splice(idx, 0, this.draggedItem);
      }
    }

    this.setMenusActivos([...menus]);
    this.draggedItem = null;
  }

  onDragEnd(event: DragEvent): void {
    this.draggedItem = null;
    this.dragOverId = null;
    (event.target as HTMLElement).classList.remove('dd-dragging');
  }

  private removeFromTree(items: MenuNode[], id: number): boolean {
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        items.splice(i, 1);
        return true;
      }
      if (items[i].children && this.removeFromTree(items[i].children, id)) {
        return true;
      }
    }
    return false;
  }

  private isDescendant(parent: MenuNode, child: MenuNode): boolean {
    if (!parent.children) return false;
    for (const c of parent.children) {
      if (c.id === child.id) return true;
      if (this.isDescendant(c, child)) return true;
    }
    return false;
  }

  guardarOrden(): void {
    this.guardando = true;
    const serialized = this.serializeTree(this.getMenusActivos());
    this.service.guardarOrdenMenus(this.activeTab, serialized).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.guardando = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'success', title: '¡Guardado!', text: 'El orden del menú ha sido actualizado', timer: 2000, showConfirmButton: false });
        }
      },
      error: () => {
        this.guardando = false;
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el orden' });
        }
      }
    });
  }

  private serializeTree(items: MenuNode[]): any[] {
    return items.map(item => ({
      id: item.id,
      children: item.children && item.children.length > 0 ? this.serializeTree(item.children) : []
    }));
  }

  editarMenu(id: number): void {
    window.location.href = `/gestor-contenidos/menus/${id}/editar`;
  }

  toggleEstado(item: MenuNode): void {
    this.service.toggleMenu(item.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        item.activo = res.activo;
      }
    });
  }

  eliminarMenu(item: MenuNode): void {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        title: '¿Eliminar menú?',
        text: `¿Estás seguro de eliminar "${item.nombre}"?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
      }).then((result: any) => {
        if (result.isConfirmed) {
          this.service.eliminarMenu(item.id).pipe(takeUntil(this.destroy$)).subscribe({
            next: () => {
              this.cargar();
              Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El menú ha sido eliminado', timer: 2000, showConfirmButton: false });
            },
            error: () => {
              Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el menú' });
            }
          });
        }
      });
    } else {
      if (confirm(`¿Eliminar "${item.nombre}"?`)) {
        this.service.eliminarMenu(item.id).pipe(takeUntil(this.destroy$)).subscribe({ next: () => this.cargar() });
      }
    }
  }

  agregarItem(): void {
    if (!this.nuevoItem.nombre.trim()) return;

    this.service.crearMenu(this.nuevoItem).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.nuevoItem = {
          nombre: '',
          ubicacion: this.activeTab,
          tipo: 'interno',
          pagina_id: null,
          url: '',
          icono: 'fas fa-link',
          activo: true,
          abrir_nueva_ventana: false
        };
        this.cargar();
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'success', title: '¡Agregado!', text: 'Item de menú creado', timer: 1500, showConfirmButton: false });
        }
      },
      error: () => {
        if (typeof Swal !== 'undefined') {
          Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo crear el item' });
        }
      }
    });
  }

  onTipoChange(): void {
    if (this.nuevoItem.tipo === 'interno') {
      this.nuevoItem.url = '';
    } else {
      this.nuevoItem.pagina_id = null;
    }
  }

  onIconoChange(): void {}

  getDepthClass(depth: number): string {
    return `nestable-depth-${Math.min(depth, 3)}`;
  }
}
