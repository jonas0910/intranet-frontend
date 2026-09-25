import { Component, OnInit, OnDestroy, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef, ElementRef, ViewChild, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin, of, catchError, timeout } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';
import Sortable from 'sortablejs';

@Component({
  selector: 'app-plantilla-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './plantilla-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .componente-profesional { border-left: 3px solid #28a745; transition: all 0.3s ease; }
    .componente-profesional:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .componente-profesional .card-header { background-color: #f8f9fa !important; border-bottom: 1px solid #dee2e6; }
    .sidebar-widget-card { border-left: 3px solid #ffc107; }

    .preview-item { cursor: move; transition: all 0.3s ease; }
    .preview-item:hover { background-color: #f8f9fa !important; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transform: translateX(5px); }
    .preview-item.sortable-ghost { opacity: 0.4; background-color: #e3f2fd !important; }
    .preview-item.sortable-drag { opacity: 0.8; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
    .preview-item .drag-handle { cursor: grab; color: #999; font-size: 1.1rem; }
    .preview-item .drag-handle:active { cursor: grabbing; }
    .preview-item.full-width-item { border-left: 3px solid #28a745; }

    .nav-tabs-custom .nav-link { font-weight: 500; color: #6c757d; transition: all 0.3s ease; }
    .nav-tabs-custom .nav-link:hover { color: #495057; background-color: #f8f9fa; }
    .nav-tabs-custom .nav-link.active { color: #fff; background-color: #28a745; border-color: #28a745; }
  `]
})
export class PlantillaFormComponent implements OnInit, OnDestroy, AfterViewChecked {
  private destroy$ = new Subject<void>();
  private sortableInstance: Sortable | null = null;
  private needsSortableInit = false;

  @ViewChild('previewContainer', { static: false }) previewContainer!: ElementRef;

  plantilla: any = {
    nombre: '', slug: '', icono: 'fas fa-file-alt', descripcion: '', vista: '', categoria: 'basica', nivel: 'basico',
    componentes: [], campos_personalizados: {}, configuracion: {},
    sidebar_habilitado: false, sidebar_widgets: {},
    permite_galeria: false, permite_tablas: false, permite_formularios: false, es_dinamica: false,
    preview_imagen: '', orden: 0, activa: true
  };

  componentesDisponibles: Record<string, any> = {};
  sidebarWidgetsDisponibles: Record<string, any> = {};
  sidebarWidgetKeys: string[] = [];

  editMode = false;
  loading = true;
  saving = false;
  activeComponentTab = 'visuales';

  cachedTabComponents: { key: string; comp: any }[] = [];
  cachedActiveComponentes: { key: string; comp: any; orden: number; anchoCompleto: boolean }[] = [];
  cachedActiveSidebarWidgets: { key: string; widget: any; orden: number }[] = [];

  constructor(
    private service: GestorContenidosService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  getPreviewUrl(path: string): string {
    return getStorageUrl(path);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    const safetyTimer = setTimeout(() => {
      if (this.loading) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    }, 8000);

    const componentes$ = this.service.getComponentesDisponibles().pipe(
      timeout(10000),
      catchError(() => of({ componentes_disponibles: {}, sidebar_widgets_disponibles: {} }))
    );

    if (id) {
      this.editMode = true;
      const plantilla$ = this.service.getPlantilla(+id).pipe(
        timeout(10000),
        catchError(() => of({ data: null }))
      );

      forkJoin([componentes$, plantilla$]).pipe(takeUntil(this.destroy$)).subscribe({
        next: ([compRes, plantRes]: any[]) => {
          clearTimeout(safetyTimer);
          this.applyComponentesDisponibles(compRes);
          const data = plantRes?.data;
          if (data) {
            this.plantilla = { ...this.plantilla, ...data };
            this.ensureArraysAndObjects();
          }
          this.rebuildCaches();
          this.loading = false;
          this.needsSortableInit = true;
          this.cdr.markForCheck();
        },
        error: () => {
          clearTimeout(safetyTimer);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    } else {
      componentes$.pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          clearTimeout(safetyTimer);
          this.applyComponentesDisponibles(res);
          this.rebuildCaches();
          this.loading = false;
          this.needsSortableInit = true;
          this.cdr.markForCheck();
        },
        error: () => {
          clearTimeout(safetyTimer);
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
    }
  }

  ngAfterViewChecked(): void {
    if (this.needsSortableInit && this.previewContainer?.nativeElement) {
      this.needsSortableInit = false;
      this.initSortable();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroySortable();
  }

  private initSortable(): void {
    this.destroySortable();
    const el = this.previewContainer?.nativeElement;
    if (!el) return;

    this.ngZone.runOutsideAngular(() => {
      this.sortableInstance = new Sortable(el, {
        animation: 150,
        handle: '.drag-handle',
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-drag',
        dragClass: 'sortable-drag',
        onEnd: (evt) => {
          this.ngZone.run(() => {
            this.onDragEnd(evt);
          });
        }
      });
    });
  }

  private destroySortable(): void {
    if (this.sortableInstance) {
      this.sortableInstance.destroy();
      this.sortableInstance = null;
    }
  }

  private onDragEnd(evt: Sortable.SortableEvent): void {
    const el = this.previewContainer?.nativeElement;
    if (!el) return;

    const items = el.querySelectorAll('.preview-item');
    let newOrder = 1;
    items.forEach((item: Element) => {
      const key = (item as HTMLElement).dataset['key'];
      if (key && this.plantilla.configuracion) {
        if (!this.plantilla.configuracion[key]) {
          this.plantilla.configuracion[key] = {};
        }
        this.plantilla.configuracion[key].orden = newOrder;
        newOrder++;
      }
    });

    this.rebuildCaches();
    this.cdr.markForCheck();

    setTimeout(() => this.initSortable(), 50);
  }

  private applyComponentesDisponibles(res: any): void {
    this.componentesDisponibles = res?.componentes_disponibles ?? {};
    this.sidebarWidgetsDisponibles = res?.sidebar_widgets_disponibles ?? {};
    this.sidebarWidgetKeys = Object.keys(this.sidebarWidgetsDisponibles);
  }

  private ensureArraysAndObjects(): void {
    if (typeof this.plantilla.componentes === 'string') {
      try { this.plantilla.componentes = JSON.parse(this.plantilla.componentes); } catch { this.plantilla.componentes = []; }
    }
    if (!Array.isArray(this.plantilla.componentes)) this.plantilla.componentes = [];

    if (typeof this.plantilla.campos_personalizados === 'string') {
      try { this.plantilla.campos_personalizados = JSON.parse(this.plantilla.campos_personalizados); } catch { this.plantilla.campos_personalizados = {}; }
    }
    if (!this.plantilla.campos_personalizados || typeof this.plantilla.campos_personalizados !== 'object') this.plantilla.campos_personalizados = {};

    if (typeof this.plantilla.configuracion === 'string') {
      try { this.plantilla.configuracion = JSON.parse(this.plantilla.configuracion); } catch { this.plantilla.configuracion = {}; }
    }
    if (!this.plantilla.configuracion || typeof this.plantilla.configuracion !== 'object') this.plantilla.configuracion = {};

    if (typeof this.plantilla.sidebar_widgets === 'string') {
      try { this.plantilla.sidebar_widgets = JSON.parse(this.plantilla.sidebar_widgets); } catch { this.plantilla.sidebar_widgets = {}; }
    }
    if (!this.plantilla.sidebar_widgets || typeof this.plantilla.sidebar_widgets !== 'object') this.plantilla.sidebar_widgets = {};
  }

  rebuildCaches(): void {
    this.cachedTabComponents = this.computeTabComponents();
    this.cachedActiveComponentes = this.computeActiveComponentes();
    this.cachedActiveSidebarWidgets = this.computeActiveSidebarWidgets();
  }

  private computeTabComponents(): { key: string; comp: any }[] {
    return Object.entries(this.componentesDisponibles)
      .filter(([_, comp]: [string, any]) => comp.categoria_tab === this.activeComponentTab)
      .map(([key, comp]) => ({ key, comp }));
  }

  private computeActiveComponentes(): { key: string; comp: any; orden: number; anchoCompleto: boolean }[] {
    if (!Array.isArray(this.plantilla.componentes)) return [];
    return this.plantilla.componentes
      .filter((k: string) => this.componentesDisponibles[k])
      .map((k: string) => ({
        key: k,
        comp: this.componentesDisponibles[k],
        orden: this.plantilla.configuracion?.[k]?.orden ?? 999,
        anchoCompleto: this.plantilla.configuracion?.[k]?.ancho_completo ?? false
      }))
      .sort((a: any, b: any) => a.orden - b.orden);
  }

  private computeActiveSidebarWidgets(): { key: string; widget: any; orden: number }[] {
    if (!this.plantilla.sidebar_widgets) return [];
    return Object.entries(this.sidebarWidgetsDisponibles)
      .filter(([key]) => this.plantilla.sidebar_widgets[key]?.activo)
      .map(([key, widget]) => ({ key, widget, orden: this.plantilla.sidebar_widgets[key]?.orden ?? 1 }))
      .sort((a, b) => a.orden - b.orden);
  }

  generarSlug(): void {
    this.plantilla.slug = (this.plantilla.nombre || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  isComponenteActivo(key: string): boolean {
    return Array.isArray(this.plantilla.componentes) && this.plantilla.componentes.includes(key);
  }

  toggleComponente(key: string): void {
    if (!Array.isArray(this.plantilla.componentes)) this.plantilla.componentes = [];
    const idx = this.plantilla.componentes.indexOf(key);
    if (idx >= 0) {
      this.plantilla.componentes.splice(idx, 1);
      delete this.plantilla.configuracion[key];
    } else {
      this.plantilla.componentes.push(key);
      if (!this.plantilla.configuracion[key]) {
        this.plantilla.configuracion[key] = { activo: true, orden: this.plantilla.componentes.length, fondo: 'white' };
      }
    }
    this.rebuildCaches();
    this.needsSortableInit = true;
    this.cdr.markForCheck();
  }

  getConfigValue(key: string, prop: string, fallback: any = null): any {
    return this.plantilla.configuracion?.[key]?.[prop] ?? fallback;
  }

  setConfig(key: string, prop: string, value: any): void {
    if (!this.plantilla.configuracion) this.plantilla.configuracion = {};
    if (!this.plantilla.configuracion[key]) this.plantilla.configuracion[key] = {};
    this.plantilla.configuracion[key][prop] = value;
    this.rebuildCaches();
    this.needsSortableInit = true;
    this.cdr.markForCheck();
  }

  hasConfigOption(comp: any, option: string): boolean {
    return Array.isArray(comp?.configuracion) && comp.configuracion.includes(option);
  }

  switchTab(tab: string): void {
    this.activeComponentTab = tab;
    this.cachedTabComponents = this.computeTabComponents();
    this.cdr.markForCheck();
  }

  isSidebarWidgetActivo(key: string): boolean {
    return this.plantilla.sidebar_widgets?.[key]?.activo ?? false;
  }

  toggleSidebarWidget(key: string): void {
    if (!this.plantilla.sidebar_widgets) this.plantilla.sidebar_widgets = {};
    if (!this.plantilla.sidebar_widgets[key]) this.plantilla.sidebar_widgets[key] = { activo: false, orden: 1 };
    this.plantilla.sidebar_widgets[key].activo = !this.plantilla.sidebar_widgets[key].activo;
    this.rebuildCaches();
    this.cdr.markForCheck();
  }

  getSidebarWidgetOrden(key: string): number {
    return this.plantilla.sidebar_widgets?.[key]?.orden ?? 1;
  }

  setSidebarWidgetOrden(key: string, val: number): void {
    if (!this.plantilla.sidebar_widgets) this.plantilla.sidebar_widgets = {};
    if (!this.plantilla.sidebar_widgets[key]) this.plantilla.sidebar_widgets[key] = { activo: true, orden: val };
    else this.plantilla.sidebar_widgets[key].orden = val;
    this.rebuildCaches();
    this.cdr.markForCheck();
  }

  onSidebarToggle(): void {
    this.rebuildCaches();
    this.needsSortableInit = true;
    this.cdr.markForCheck();
  }

  guardar(): void {
    if (!this.plantilla.nombre) { alert('El nombre es obligatorio'); return; }
    this.saving = true;
    this.cdr.markForCheck();

    const data = { ...this.plantilla };
    const obs = this.editMode
      ? this.service.actualizarPlantilla(this.plantilla.id, data)
      : this.service.crearPlantilla(data);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/gestor-contenidos/plantillas']); },
      error: () => { this.saving = false; this.cdr.markForCheck(); alert('Error al guardar'); }
    });
  }

  trackByKey(index: number, item: any): string {
    return item.key;
  }
}
