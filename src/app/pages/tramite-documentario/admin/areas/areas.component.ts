import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../../services/documento.service';

interface ArbolItem {
  area: any;
  nivel: number;
  parent_id: number | null;
  has_children: boolean;
}

@Component({
  selector: 'app-areas-tramite',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './areas.component.html',
  styleUrl: './areas.component.scss'
})
export class AreasComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tablaAreas') tablaRef!: ElementRef<HTMLTableElement>;

  private destroy$ = new Subject<void>();
  arbolPlano: ArbolItem[] = [];
  loading = true;
  showModalCrear = false;
  showModalEditar = false;
  showModalUsuarios = false;
  showModalEliminarExpedientes = false;
  editando = false;
  processing = false;
  areaUsuarios: any = null;
  usuariosArea: any[] = [];
  usuariosDisponibles: any[] = [];
  expandidos = new Set<number>();
  searchTerm = '';
  currentPage = 1;
  pageSize = 10;
  form: any = { id: null, nombre: '', codigo: '', descripcion: '', responsable: '', email: '', telefono: '', parent_id: '', orden: 0, activo: true, es_mesa_partes: false };
  formAsignar = { user_id: '', es_responsable: false };
  formEditarUsuario: any = null;
  areaEliminarPendiente: { id: number; nombre: string; expedientes: number } | null = null;
  draggedRow: HTMLTableRowElement | null = null;

  constructor(
    private tramiteService: TramiteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngAfterViewInit(): void {}

  cargar(): void {
    this.loading = true;
    this.tramiteService.getArbolPlano().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.arbolPlano = res.data || [];
        this.loading = false;
        setTimeout(() => this.initDragDrop(), 50);
      },
      error: () => this.loading = false
    });
  }

  /** Árbol plano excluyendo área y descendientes (para selector padre en editar) */
  getArbolParaPadre(excluirIds: number[]): ArbolItem[] {
    return this.arbolPlano.filter(it => !excluirIds.includes(it.area.id));
  }

  getDescendientesIds(areaId: number): number[] {
    const ids: number[] = [];
    const byParent = new Map<number | null, number[]>();
    this.arbolPlano.forEach(it => {
      const pid = it.parent_id ?? 0;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid)!.push(it.area.id);
    });
    const collect = (id: number) => {
      const hijos = byParent.get(id) || [];
      hijos.forEach(h => { ids.push(h); collect(h); });
    };
    collect(areaId);
    return ids;
  }

  esHija(item: ArbolItem): boolean {
    return item.nivel > 0;
  }

  estaExpandido(item: ArbolItem): boolean {
    if (!item.has_children) return false;
    const parentId = item.area.parent_id ?? 0;
    return this.expandidos.has(parentId);
  }

  visible(item: ArbolItem): boolean {
    if (item.nivel === 0) return true;
    let pid: number | null = item.parent_id;
    while (pid != null) {
      const p = this.arbolPlano.find(it => it.area.id === pid);
      if (!p) return true;
      if (!this.expandidos.has(pid)) return false;
      pid = p.parent_id;
    }
    return true;
  }

  /** Filtra por búsqueda (nombre, código, descripción) e incluye ancestros y descendientes para mantener contexto del árbol */
  getArbolFiltered(): ArbolItem[] {
    const term = (this.searchTerm || '').trim().toLowerCase();
    if (!term) return this.arbolPlano;
    const matches = new Set<number>();
    this.arbolPlano.forEach(it => {
      const n = (it.area.nombre || '').toLowerCase();
      const c = (it.area.codigo || '').toLowerCase();
      const d = (it.area.descripcion || '').toLowerCase();
      if (n.includes(term) || c.includes(term) || d.includes(term)) matches.add(it.area.id);
    });
    const includeIds = new Set<number>(matches);
    matches.forEach(id => {
      let pid: number | null = this.arbolPlano.find(it => it.area.id === id)?.parent_id ?? null;
      while (pid != null) { includeIds.add(pid); pid = this.arbolPlano.find(it => it.area.id === pid)?.parent_id ?? null; }
    });
    const byParent = new Map<number | null, number[]>();
    this.arbolPlano.forEach(it => { const p = it.parent_id ?? 0; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p)!.push(it.area.id); });
    const addDesc = (id: number) => { (byParent.get(id) || []).forEach(h => { includeIds.add(h); addDesc(h); }); };
    matches.forEach(id => addDesc(id));
    return this.arbolPlano.filter(it => includeIds.has(it.area.id));
  }

  /** Items visibles (respetando expand/collapse) del árbol filtrado */
  getItemsVisible(): ArbolItem[] {
    return this.getArbolFiltered().filter(it => this.visible(it));
  }

  /** Items de la página actual (10 por página) */
  getCurrentPageItems(): ArbolItem[] {
    const items = this.getItemsVisible();
    const start = (this.currentPage - 1) * this.pageSize;
    return items.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.getItemsVisible().length / this.pageSize));
  }

  get totalFiltered(): number {
    return this.getItemsVisible().length;
  }

  min(a: number, b: number): number {
    return Math.min(a, b);
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const cur = this.currentPage;
    const pages: (number | string)[] = [];
    if (cur <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (cur >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', cur - 1, cur, cur + 1, '...', total);
    }
    return pages;
  }

  goToPage(p: number): void {
    if (p >= 1 && p <= this.totalPages) this.currentPage = p;
    setTimeout(() => this.initDragDrop(), 50);
  }

  onSearchChange(): void {
    this.currentPage = 1;
    setTimeout(() => this.initDragDrop(), 50);
  }

  toggleExpand(item: ArbolItem): void {
    if (!item.has_children) return;
    const id = item.area.id;
    if (this.expandidos.has(id)) this.expandidos.delete(id);
    else this.expandidos.add(id);
    setTimeout(() => this.initDragDrop(), 50);
  }

  expandirTodo(): void {
    this.arbolPlano.forEach(it => { if (it.has_children) this.expandidos.add(it.area.id); });
    setTimeout(() => this.initDragDrop(), 50);
  }

  colapsarTodo(): void {
    this.expandidos.clear();
    setTimeout(() => this.initDragDrop(), 50);
  }

  abrirNuevo(parentId?: number): void {
    this.editando = false;
    this.form = {
      id: null, nombre: '', codigo: '', descripcion: '', responsable: '', email: '', telefono: '',
      parent_id: parentId ?? '', orden: 0, activo: true, es_mesa_partes: false
    };
    this.showModalCrear = true;
  }

  abrirEditar(area: any): void {
    this.editando = true;
    this.form = { ...area, parent_id: area.parent_id ?? '' };
    this.showModalEditar = true;
  }

  guardar(): void {
    if (!this.form.nombre || !this.form.codigo) return;
    this.processing = true;
    const payload = { ...this.form, parent_id: this.form.parent_id || null };
    const obs = this.editando
      ? this.tramiteService.actualizarArea(this.form.id, payload)
      : this.tramiteService.crearArea(payload);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showModalCrear = false;
          this.showModalEditar = false;
          this.cargar();
        }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  eliminar(area: any): void {
    const expedientes = area.tramites_actuales_count ?? 0;
    if (expedientes > 0) {
      this.areaEliminarPendiente = { id: area.id, nombre: area.nombre, expedientes };
      this.showModalEliminarExpedientes = true;
      return;
    }
    if (!confirm('¿Eliminar esta área?')) return;
    this.tramiteService.eliminarArea(area.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargar(); },
      error: (err) => {
        if (err.status === 422 && err.error?.expedientes_count) {
          this.areaEliminarPendiente = { id: area.id, nombre: area.nombre, expedientes: err.error.expedientes_count };
          this.showModalEliminarExpedientes = true;
        }
      }
    });
  }

  confirmarEliminarConExpedientes(): void {
    if (!this.areaEliminarPendiente) return;
    this.tramiteService.eliminarArea(this.areaEliminarPendiente.id, true).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showModalEliminarExpedientes = false;
          this.areaEliminarPendiente = null;
          this.cargar();
        }
      }
    });
  }

  establecerMesaPartes(id: number): void {
    this.tramiteService.establecerMesaPartes(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargar(); }
    });
  }

  abrirUsuarios(area: any): void {
    this.areaUsuarios = area;
    this.tramiteService.getUsuariosArea(area.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.usuariosArea = res.data || []; }
    });
    this.tramiteService.getUsuariosDisponibles(area.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.usuariosDisponibles = res.data || []; }
    });
    this.showModalUsuarios = true;
  }

  asignarUsuario(): void {
    if (!this.formAsignar.user_id || !this.areaUsuarios) return;
    this.tramiteService.asignarUsuarioArea(this.areaUsuarios.id, {
      user_id: +this.formAsignar.user_id,
      es_responsable: this.formAsignar.es_responsable,
      puede_recibir: true,
      puede_derivar: true,
      puede_atender: true
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.formAsignar = { user_id: '', es_responsable: false };
          this.tramiteService.getUsuariosArea(this.areaUsuarios.id).subscribe(r => { if (r.success) this.usuariosArea = r.data || []; });
          this.tramiteService.getUsuariosDisponibles(this.areaUsuarios.id).subscribe(r => { if (r.success) this.usuariosDisponibles = r.data || []; });
        }
      }
    });
  }

  abrirEditarUsuario(u: any): void {
    this.formEditarUsuario = { ...u };
  }

  guardarUsuario(): void {
    if (!this.formEditarUsuario || !this.areaUsuarios) return;
    this.tramiteService.actualizarUsuarioArea(this.areaUsuarios.id, this.formEditarUsuario.id, {
      es_responsable: this.formEditarUsuario.es_responsable,
      puede_recibir: this.formEditarUsuario.puede_recibir,
      puede_derivar: this.formEditarUsuario.puede_derivar,
      puede_atender: this.formEditarUsuario.puede_atender,
      activo: this.formEditarUsuario.activo
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.formEditarUsuario = null;
          this.tramiteService.getUsuariosArea(this.areaUsuarios.id).subscribe(r => { if (r.success) this.usuariosArea = r.data || []; });
        }
      }
    });
  }

  desasignarUsuario(userId: number): void {
    if (!this.areaUsuarios || !confirm('¿Desasignar a este usuario?')) return;
    this.tramiteService.desasignarUsuarioArea(this.areaUsuarios.id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.tramiteService.getUsuariosArea(this.areaUsuarios.id).subscribe(r => { if (r.success) this.usuariosArea = r.data || []; });
          this.tramiteService.getUsuariosDisponibles(this.areaUsuarios.id).subscribe(r => { if (r.success) this.usuariosDisponibles = r.data || []; });
        }
      }
    });
  }

  indent(nivel: number): string {
    return '\u3000'.repeat(nivel);
  }

  getNombreAreaPadre(parentId: number | string | null): string {
    if (!parentId) return '';
    const it = this.arbolPlano.find(x => x.area.id == parentId);
    return it?.area?.nombre || '';
  }

  getArbolParaEditar(): ArbolItem[] {
    if (!this.form?.id) return [];
    const excluir = [this.form.id, ...this.getDescendientesIds(this.form.id)];
    return this.getArbolParaPadre(excluir);
  }

  irUsuariosPage(areaId: number): void {
    this.router.navigate(['/areas', areaId, 'usuarios']);
  }

  private initDragDrop(): void {
    const tbody = this.tablaRef?.nativeElement?.querySelector('tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr.fila-area');
    rows.forEach((row) => {
      const handle = row.querySelector('.drag-handle');
      if (!handle) return;
      (row as HTMLTableRowElement).draggable = true;
      row.addEventListener('dragstart', (e: Event) => this.onDragStart(e as DragEvent, row as HTMLTableRowElement));
      row.addEventListener('dragend', (e: Event) => this.onDragEnd(e as DragEvent, row as HTMLTableRowElement));
      row.addEventListener('dragover', (e: Event) => this.onDragOver(e as DragEvent, row as HTMLTableRowElement));
      row.addEventListener('dragleave', (e: Event) => this.onDragLeave(e as DragEvent, row as HTMLTableRowElement));
      row.addEventListener('drop', (e: Event) => this.onDrop(e as DragEvent, row as HTMLTableRowElement));
    });
  }

  private onDragStart(e: DragEvent, row: HTMLTableRowElement): void {
    if (!(e.target as Element).closest('.drag-handle')) return;
    this.draggedRow = row;
    row.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', row.dataset['areaId'] || '');
  }

  private onDragEnd(_e: DragEvent, row: HTMLTableRowElement): void {
    row.classList.remove('dragging');
    this.tablaRef?.nativeElement?.querySelectorAll('tr.drag-over, tr.drag-over-subarea').forEach((r: Element) => r.classList.remove('drag-over', 'drag-over-subarea'));
    this.draggedRow = null;
  }

  private onDragOver(e: DragEvent, row: HTMLTableRowElement): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
    if (!this.draggedRow || this.draggedRow === row) return;
    const rect = row.getBoundingClientRect();
    const relY = e.clientY! - rect.top;
    const comoSubarea = relY < rect.height / 2;
    row.classList.remove('drag-over', 'drag-over-subarea');
    row.classList.add(comoSubarea ? 'drag-over-subarea' : 'drag-over');
    row.dataset['dropMode'] = comoSubarea ? 'child' : 'sibling';
  }

  private onDragLeave(e: DragEvent, row: HTMLTableRowElement): void {
    if (!row.contains((e as any).relatedTarget)) {
      row.classList.remove('drag-over', 'drag-over-subarea');
      delete row.dataset['dropMode'];
    }
  }

  private onDrop(e: DragEvent, row: HTMLTableRowElement): void {
    e.preventDefault();
    row.classList.remove('drag-over', 'drag-over-subarea');
    if (!this.draggedRow || this.draggedRow === row) return;
    const areaId = +(this.draggedRow.dataset['areaId'] || 0);
    const dropMode = row.dataset['dropMode'] || 'sibling';
    const targetId = +(row.dataset['areaId'] || 0);
    let parentId: number | null;
    let orden: number;
    const targetItem = this.arbolPlano.find(it => it.area.id === targetId);
    if (dropMode === 'child') {
      parentId = targetId;
      orden = 999;
    } else {
      parentId = targetItem?.parent_id ?? null;
      orden = (targetItem?.area.orden ?? 0) + 1;
    }
    delete row.dataset['dropMode'];
    this.tramiteService.moverArea(areaId, parentId, orden).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargar(); },
      error: (err) => alert(err.error?.message || 'Error al mover')
    });
  }
}
