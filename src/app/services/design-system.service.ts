import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

const GLOBAL_KEY = 'design-system-config';
const SUBSYSTEM_PREFIX = 'ds-config:';

/** Tema CRUD por defecto por subsistema (se aplica cuando no hay config guardada).
 * No incluir cardOutlineColor/tableHeader* para que hereden del patrón global y reflejen el color elegido (ej. amarillo). */
const SUBSYSTEM_CRUD_DEFAULTS: Record<string, Partial<CrudViewConfig>> = {
  'activos-fijos': {
    newBtnClass: 'btn-success',
    viewBtnClass: 'btn-success',
    editBtnClass: 'btn-warning',
    excelBtnClass: 'btn-success',
    pdfBtnClass: 'btn-danger',
    printBtnClass: 'btn-info',
    statusActiveClass: 'badge-success'
  },
  'censo-poblacional': {
    newBtnClass: 'btn-primary',
    viewBtnClass: 'btn-info',
    editBtnClass: 'btn-warning',
    deleteBtnClass: 'btn-danger',
    excelBtnClass: 'btn-success',
    pdfBtnClass: 'btn-danger',
    printBtnClass: 'btn-info',
    statusActiveClass: 'badge-success',
    statusInactiveClass: 'badge-secondary'
  }
};

/** IDs de subsistemas que usan system-layout; la URL los contiene (ej. /activos-fijos/lista). */
const SUBSYSTEM_URL_IDS = ['activos-fijos', 'planillas', 'admin', 'patrones', 'censo-poblacional', 'helpdesk'] as const;

export interface ColorItem {
  name: string;
  cssClass: string;
  hex: string;
  textClass: string;
}

export interface ButtonItem {
  label: string;
  icon: string;
  cssClass: string;
  group: string;
}

export interface TableColumn {
  label: string;
  field: string;
  align: 'left' | 'center' | 'right';
}

export interface FormField {
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'select2-search' | 'select2-danger' | 'select2-purple' | 'select2-minimal' | 'select2-multiple' | 'icheck' | 'switch' | 'textarea';
  colSize: number;
  required: boolean;
  placeholder?: string;
  options?: string[];
  rows?: number;
}

export interface CrudViewConfig {
  newBtnClass: string;
  newBtnIcon: string;
  newBtnLabel: string;
  exportBtnClass: string;
  exportBtnIcon: string;
  exportBtnLabel: string;
  filterInputSize: string;
  /** Tamaño de letra de los inputs de filtros (ej. Buscar) */
  filterInputFontSize: string;
  tableClasses: string;
  paginationSize: string;
  viewBtnClass: string;
  editBtnClass: string;
  deleteBtnClass: string;
  statusActiveClass: string;
  statusActiveText: string;
  statusInactiveClass: string;
  statusInactiveText: string;
  cardOutlineColor: string;
  /** Border radius de las cards CRUD en px (0 = esquinas rectas) */
  cardBorderRadius: number;
  showBreadcrumbs: boolean;
  fontSize: string;
  headerFontSize: string;
  labelFontSize: string;
  excelBtnClass: string;
  excelBtnIcon: string;
  excelBtnLabel: string;
  pdfBtnClass: string;
  pdfBtnIcon: string;
  pdfBtnLabel: string;
  printBtnClass: string;
  printBtnIcon: string;
  printBtnLabel: string;
  showExportButtons: boolean;
  /** Registros por página por defecto en listados CRUD */
  defaultPageSize: number;
  /** Opciones del selector "Mostrar X registros" */
  pageSizeOptions: number[];
  /** Color de fondo de la cabecera de la tabla */
  tableHeaderBg: string;
  /** Color de texto de la cabecera de la tabla */
  tableHeaderColor: string;
  /** Permite colapsar la sección de filtros */
  collapsibleFilters: boolean;
  /** Padding vertical de celdas de la tabla (th y td). Ej: 0.3rem, 0.5rem */
  cellPaddingY: string;
  /** Padding horizontal de celdas de la tabla (th y td). Ej: 0.5rem, 0.75rem */
  cellPaddingX: string;
  /** Muestra u oculta el número de registros en el toolbar (ej. "15 registros") */
  showRecordCount: boolean;
}

export interface LayoutConfig {
  sidebarBg: string;
  sidebarText: string;
  sidebarActiveText: string;
  brandBg: string;
  brandText: string;
  navbarBg: string;
  navbarText: string;
  contentBg: string;
  modalHeaderBg: string;
  modalHeaderText: string;
  cardBorderColor: string;
  sidebarWidth: number;
  navbarHeight: number;
  /** Padding del div.container-fluid (content-header y section.content). Ej: 2rem, 1rem 0.5rem */
  containerFluidPadding: string;
  // Árbol de menús
  showTreeLines: boolean;
  treeLineColor: string;
  treeBranchLength: number;
  treeLevel1Offset: string;
  treeLevel2Offset: string;
  treeLevel3Offset: string;
}

export interface ModalCrudConfig {
  headerBg: string;
  headerText: string;
  headerIcon: string;
  bodyBg: string;
  footerBg: string;
  borderRadius: number;
  saveBtnClass: string;
  saveBtnIcon: string;
  saveBtnLabel: string;
  cancelBtnClass: string;
  cancelBtnIcon: string;
  cancelBtnLabel: string;
  deleteBtnClass: string;
  deleteBtnIcon: string;
  deleteBtnLabel: string;
  titleAdd: string;
  titleEdit: string;
  labelColor: string;
  labelWeight: string;
  inputSize: string;
  labelMarginBottom: string;
  formPadding: string;
  headerPadding: string;
  headerFontSize: string;
}

export interface PageHeaderConfig {
  padding: string;
  titleSize: string;
  titleWeight: string;
  titleColor: string;
  subtitleSize: string;
  subtitleColor: string;
  breadcrumbSize: string;
  bg: string;
  borderBottom: string;
  /** Espacio entre Page Header y el contenido inferior (tabla/card). Ej: 0.5rem, 0, 8px */
  headerToContentGap: string;
}

export interface SystemLayoutConfig {
  /** Ancho máximo del contenedor .system-layout (ej. 100%, 1400px, 90%, none). Vacío = 100% */
  maxWidth: string;
  padding: string;
  margin: string;
  backgroundColor: string;
  borderRadius: string;
  border: string;
  boxShadow: string;
  contentPadding: string;
  headerPadding: string;
  footerPadding: string;
  titleSize: string;
  titleColor: string;
  subtitleSize: string;
  subtitleColor: string;
  breadcrumbSize: string;
  showHeader: boolean;
  showFooter: boolean;
  showBreadcrumbs: boolean;
  containerFluid: boolean;
  stickyHeader: boolean;
  headerBackgroundColor: string;
}

export interface ConfirmDialogConfig {
  dangerBg: string;
  dangerText: string;
  warningBg: string;
  warningText: string;
  infoBg: string;
  infoText: string;
  bodyBg: string;
  footerBg: string;
  footerBorder: string;
  borderRadius: number;
  iconSize: string;
  messageColor: string;
  detailColor: string;
  cancelBtnClass: string;
}

export interface ToastConfig {
  successBg: string;
  successBorder: string;
  errorBg: string;
  errorBorder: string;
  warningBg: string;
  warningBorder: string;
  warningText: string;
  infoBg: string;
  infoBorder: string;
  bodyBg: string;
  bodyText: string;
  borderRadius: number;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'top-full-width' | 'bottom-full-width';
  /** Ancho del toast en px */
  toastWidth?: number;
  /** Ancho máximo del toast en px */
  toastMaxWidth?: number;
  /** Opacidad del toast (0–1). Ej: 0.95 = 95% opaco, más transparente si menor */
  toastOpacity?: number;
  /** Animación de entrada/salida: slide-right (desde la derecha) o slide-up (de abajo hacia arriba) */
  toastAnimation?: 'slide-right' | 'slide-up';
  /** Color de la barra de progreso (un solo color, ej. rgba(255,255,255,0.7)) */
  progressBarColor?: string;
}

export interface SubsystemDesignConfig {
  crudView: CrudViewConfig;
  modalCrud: ModalCrudConfig;
  layout?: LayoutConfig;
  pageHeader?: PageHeaderConfig;
  systemLayout?: SystemLayoutConfig;
  confirmDialog?: ConfirmDialogConfig;
  toast?: ToastConfig;
}

export interface SubsystemEntry {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class DesignSystemService {

  private globalCrudView$ = new BehaviorSubject<CrudViewConfig>(this.getDefaultCrudView());
  private globalModalCrud$ = new BehaviorSubject<ModalCrudConfig>(this.getDefaultModalCrud());
  private globalPageHeader$ = new BehaviorSubject<PageHeaderConfig>(this.getDefaultPageHeader());
  private globalSystemLayout$ = new BehaviorSubject<SystemLayoutConfig>(this.getDefaultSystemLayout());
  private globalConfirmDialog$ = new BehaviorSubject<ConfirmDialogConfig>(this.getDefaultConfirmDialog());
  private globalToast$ = new BehaviorSubject<ToastConfig>(this.getDefaultToast());

  private currentSubsystem$ = new BehaviorSubject<string>('global');

  private apiUrl = environment.apiUrl + '/design-system-configs';

  constructor(private http: HttpClient) {
    this.loadGlobal();
    this.applyContainerFluidPadding();
    // Aplicar variables de CRUD en cuanto tengamos config (no depender solo de system-layout)
    this.applyCrudViewCssVariables(undefined);
    this.syncFromDatabase();
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', () => {
        this.loadGlobal();
        this.applyContainerFluidPadding();
      });
    }
  }

  /** Gets the active subsystem identifier */
  get activeSubsystem(): string {
    return this.currentSubsystem$.value;
  }

  /** Observable para reaccionar al cambio de subsistema (ej. Toast container usa config del subsistema) */
  get activeSubsystemChanges$(): Observable<string> {
    return this.currentSubsystem$.asObservable();
  }

  /** Sets the active subsystem globally so components don't have to specify it everywhere */
  setActiveSubsystem(subsystemId: string): void {
    if (this.currentSubsystem$.value !== subsystemId) {
      this.currentSubsystem$.next(subsystemId || 'global');
    }
  }

  /** Shorthand for UI components to get the active CrudViewConfig directly */
  get currentCrudView(): CrudViewConfig {
    return this.getCrudViewFor(this.activeSubsystem);
  }

  get currentModalCrud(): ModalCrudConfig {
    return this.getModalCrudFor(this.activeSubsystem);
  }


  /**
   * Descarga todas las configuraciones de la base de datos y las guarda en LocalStorage.
   */
  syncFromDatabase(): void {
    this.http.get<any>(this.apiUrl).subscribe({
      next: (res) => {
        if (res.status === 'success' && res.data) {
          if (typeof localStorage !== 'undefined') {
            res.data.forEach((item: any) => {
              const key = item.subsystem_id === 'global' ? GLOBAL_KEY : SUBSYSTEM_PREFIX + item.subsystem_id;
              const apiConfig = item.config || {};
              if (item.subsystem_id === 'global') {
                try {
                  const raw = localStorage.getItem(GLOBAL_KEY);
                  if (raw) {
                    const local = JSON.parse(raw);
                    if (local.crudView?.cardOutlineColor && apiConfig.crudView) {
                      apiConfig.crudView = { ...apiConfig.crudView, cardOutlineColor: local.crudView.cardOutlineColor };
                    }
                  }
                } catch { /* ignore */ }
                localStorage.setItem(key, JSON.stringify(apiConfig));
              } else {
                localStorage.setItem(key, JSON.stringify(apiConfig));
              }
            });
          }
          this.loadGlobal();
          this.refresh();
        }
      },
      error: (err) => console.error('Error syncing design system from DB:', err)
    });
  }

  /** Global config (fallback when subsystem has no override) */
  get crudView(): CrudViewConfig {
    return this.globalCrudView$.value;
  }

  get crudViewChanges(): Observable<CrudViewConfig> {
    return this.globalCrudView$.asObservable();
  }

  get modalCrud(): ModalCrudConfig {
    return this.globalModalCrud$.value;
  }

  get modalCrudChanges(): Observable<ModalCrudConfig> {
    return this.globalModalCrud$.asObservable();
  }

  get pageHeader(): PageHeaderConfig { return this.globalPageHeader$.value; }
  get pageHeaderChanges(): Observable<PageHeaderConfig> { return this.globalPageHeader$.asObservable(); }

  get systemLayout(): SystemLayoutConfig { return this.globalSystemLayout$.value; }
  get systemLayoutChanges(): Observable<SystemLayoutConfig> { return this.globalSystemLayout$.asObservable(); }

  get confirmDialog(): ConfirmDialogConfig { return this.globalConfirmDialog$.value; }
  get confirmDialogChanges(): Observable<ConfirmDialogConfig> { return this.globalConfirmDialog$.asObservable(); }

  get toast(): ToastConfig { return this.globalToast$.value; }
  get toastChanges(): Observable<ToastConfig> { return this.globalToast$.asObservable(); }

  /**
   * Returns the CrudViewConfig for a specific subsystem.
   * cardOutlineColor (y colores de cabecera de tabla) siempre heredan del patrón Global para que el color elegido se vea en todos los subsistemas.
   */
  getCrudViewFor(subsystem: string): CrudViewConfig {
    const global = this.crudView;
    const defaultOverrides = SUBSYSTEM_CRUD_DEFAULTS[subsystem] ?? {};
    const cfg = this.loadSubsystemConfig(subsystem);
    const saved = cfg?.crudView;
    const merged = saved
      ? { ...global, ...defaultOverrides, ...saved }
      : { ...global, ...defaultOverrides };
    // Que el borde del card y la cabecera de tabla hereden siempre del Global (así el color elegido en Patrones se aplica en activos-fijos, etc.)
    merged.cardOutlineColor = global.cardOutlineColor;
    merged.tableHeaderBg = global.tableHeaderBg;
    merged.tableHeaderColor = global.tableHeaderColor;
    return merged;
  }

  getModalCrudFor(subsystem: string): ModalCrudConfig {
    const cfg = this.loadSubsystemConfig(subsystem);
    return cfg?.modalCrud ? { ...this.modalCrud, ...cfg.modalCrud } : this.modalCrud;
  }

  getLayoutFor(subsystem: string): LayoutConfig | null {
    const cfg = this.loadSubsystemConfig(subsystem);
    return cfg?.layout || null;
  }

  getPageHeaderFor(subsystem: string): PageHeaderConfig {
    const cfg = this.loadSubsystemConfig(subsystem);
    return cfg?.pageHeader ? { ...this.pageHeader, ...cfg.pageHeader } : this.pageHeader;
  }

  getSystemLayoutFor(subsystem: string): SystemLayoutConfig {
    const cfg = this.loadSubsystemConfig(subsystem);
    return cfg?.systemLayout ? { ...this.systemLayout, ...cfg.systemLayout } : this.systemLayout;
  }

  getConfirmDialogFor(subsystem: string): ConfirmDialogConfig {
    const global = this.confirmDialog;
    const cfg = this.loadSubsystemConfig(subsystem);
    const saved = cfg?.confirmDialog;
    if (saved) return { ...global, ...saved };
    return global;
  }

  getToastFor(subsystem: string): ToastConfig {
    const global = this.toast;
    const cfg = this.loadSubsystemConfig(subsystem);
    const saved = cfg?.toast;
    if (saved) return { ...global, ...saved };
    return global;
  }

  saveSubsystemConfig(
    subsystemId: string,
    crudView: CrudViewConfig,
    modalCrud: ModalCrudConfig,
    layout?: LayoutConfig,
    pageHeader?: PageHeaderConfig,
    systemLayout?: SystemLayoutConfig,
    confirmDialog?: ConfirmDialogConfig,
    toast?: ToastConfig
  ): void {
    if (subsystemId === 'global') {
      this.saveGlobalConfig(crudView, modalCrud, layout, pageHeader, systemLayout, confirmDialog, toast);
    } else {
      const payload: SubsystemDesignConfig = { crudView, modalCrud, layout, pageHeader, systemLayout, confirmDialog, toast };
      localStorage.setItem(SUBSYSTEM_PREFIX + subsystemId, JSON.stringify(payload));
    }

    // Persistir en Base de Datos
    const configToSave = subsystemId === 'global' ? JSON.parse(localStorage.getItem(GLOBAL_KEY) || '{}') : { crudView, modalCrud, layout, pageHeader, systemLayout, confirmDialog, toast };

    this.http.post(this.apiUrl, {
      subsystem_id: subsystemId,
      config: configToSave
    }).subscribe({
      error: (err) => console.error('Error saving design system to DB:', err)
    });
  }

  /** Remove override for a subsystem (will fall back to global) */
  removeSubsystemConfig(subsystemId: string): void {
    if (subsystemId !== 'global') {
      localStorage.removeItem(SUBSYSTEM_PREFIX + subsystemId);
      this.http.delete(`${this.apiUrl}/${subsystemId}`).subscribe({
        error: (err) => console.error('Error deleting design system from DB:', err)
      });
    }
  }

  /** List all subsystems that have a custom config saved */
  getSubsystemsWithConfig(): string[] {
    const result: string[] = [];
    if (typeof localStorage === 'undefined') return result;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(SUBSYSTEM_PREFIX)) {
        result.push(key.replace(SUBSYSTEM_PREFIX, ''));
      }
    }
    return result;
  }

  /** Check if a subsystem has a custom override */
  hasSubsystemConfig(subsystemId: string): boolean {
    if (typeof localStorage === 'undefined') return false;
    return localStorage.getItem(SUBSYSTEM_PREFIX + subsystemId) !== null;
  }

  /** Devuelve el id del subsistema si la URL lo contiene (ej. /activos-fijos/lista -> 'activos-fijos'). */
  getSubsystemIdFromUrl(url: string): string | undefined {
    const lower = url.toLowerCase();
    return SUBSYSTEM_URL_IDS.find(id => lower.includes(id));
  }

  /** Called by DesignSystemComponent after saving the global config */
  refresh(subsystem?: string): void {
    this.loadGlobal();
    this.applyContainerFluidPadding();
    this.applyCrudViewCssVariables(subsystem);
  }

  /**
   * Aplica CSS custom properties de CrudViewConfig al :root del documento.
   * Llamado por SystemLayoutComponent al inicializarse con un subsistema.
   * Permite que todos los módulos del subsistema hereden automáticamente los estilos.
   */
  applyCrudViewCssVariables(subsystem?: string): void {
    if (typeof document === 'undefined') return;
    const cv = subsystem ? this.getCrudViewFor(subsystem) : this.crudView;
    const mc = subsystem ? this.getModalCrudFor(subsystem) : this.modalCrud;
    const lo = subsystem ? this.getLayoutFor(subsystem) : null;
    const root = document.documentElement.style;

    root.setProperty('--ds-font-size', cv.fontSize);
    root.setProperty('--ds-header-font-size', cv.headerFontSize);
    root.setProperty('--ds-label-font-size', cv.labelFontSize);
    root.setProperty('--ds-cell-padding-y', cv.cellPaddingY);
    root.setProperty('--ds-cell-padding-x', cv.cellPaddingX);
    root.setProperty('--ds-table-header-bg', cv.tableHeaderBg);
    root.setProperty('--ds-table-header-color', cv.tableHeaderColor);
    root.setProperty('--ds-filter-input-font-size', cv.filterInputFontSize);
    // Card Outline and Badges
    const outlineColorValue = cv.cardOutlineColor ? this.getColorHex(cv.cardOutlineColor) : '#6c757d';
    root.setProperty('--ds-card-outline-color', outlineColorValue);

    // Status Badges
    const activeColor = cv.statusActiveClass ? this.getColorHex(cv.statusActiveClass) : '#28a745';
    const inactiveColor = cv.statusInactiveClass ? this.getColorHex(cv.statusInactiveClass) : '#6c757d';
    root.setProperty('--ds-status-active-color', activeColor);
    root.setProperty('--ds-status-inactive-color', inactiveColor);

    // Bootstrap utility for the badge background
    const badgeColorClass = cv.cardOutlineColor ? cv.cardOutlineColor.replace('card-', '') : 'secondary';
    root.setProperty('--ds-badge-bg-class', badgeColorClass);
    root.setProperty('--ds-card-border-radius', cv.cardBorderRadius + 'px');

    // Nuevas variables para formularios y modales
    root.setProperty('--ds-modal-header-bg', mc.headerBg);
    root.setProperty('--ds-modal-header-text', mc.headerText);
    root.setProperty('--ds-modal-header-padding', mc.headerPadding || '0.75rem 1rem');
    root.setProperty('--ds-modal-header-title-size', mc.headerFontSize || '1.1rem');
    root.setProperty('--ds-modal-body-bg', mc.bodyBg);
    root.setProperty('--ds-modal-footer-bg', mc.footerBg);
    root.setProperty('--ds-modal-border-radius', mc.borderRadius + 'px');

    root.setProperty('--ds-label-color', mc.labelColor);
    root.setProperty('--ds-label-weight', mc.labelWeight);

    // Variables para Confirm Dialog y Toasts
    const cd = subsystem ? this.getConfirmDialogFor(subsystem) : this.confirmDialog;
    const ts = subsystem ? this.getToastFor(subsystem) : this.toast;

    root.setProperty('--ds-confirm-danger-bg', cd.dangerBg);
    root.setProperty('--ds-confirm-danger-text', cd.dangerText);
    root.setProperty('--ds-confirm-warning-bg', cd.warningBg);
    root.setProperty('--ds-confirm-warning-text', cd.warningText);
    root.setProperty('--ds-confirm-info-bg', cd.infoBg);
    root.setProperty('--ds-confirm-info-text', cd.infoText);
    root.setProperty('--ds-confirm-border-radius', cd.borderRadius + 'px');

    root.setProperty('--ds-toast-success-bg', ts.successBg);
    root.setProperty('--ds-toast-error-bg', ts.errorBg);
    root.setProperty('--ds-toast-warning-bg', ts.warningBg);
    root.setProperty('--ds-toast-info-bg', ts.infoBg);
    root.setProperty('--ds-toast-border-radius', ts.borderRadius + 'px');

    // Sidebar Tree Lines & Global Layout properties
    try {
      let layout = lo;
      if (!layout) {
        const raw = localStorage.getItem(GLOBAL_KEY);
        layout = raw ? JSON.parse(raw).layout : null;
      }

      if (layout) {
        // Asegurar valores por defecto si no existen en el objeto layout
        const show = layout.showTreeLines !== false; // Default true
        root.setProperty('--ds-show-tree-lines', show ? 'block' : 'none');
        root.setProperty('--ds-tree-line-color', layout.treeLineColor || 'rgba(255, 255, 255, 0.15)');
        root.setProperty('--ds-tree-branch-length', (layout.treeBranchLength || 8) + 'px');
        root.setProperty('--ds-tree-level-1-offset', layout.treeLevel1Offset || '1.6rem');
        root.setProperty('--ds-tree-level-2-offset', layout.treeLevel2Offset || '2.35rem');
        root.setProperty('--ds-tree-level-3-offset', layout.treeLevel3Offset || '3.1rem');
      } else {
        // Si no hay layout, forzar defaults visibles
        root.setProperty('--ds-show-tree-lines', 'block');
        root.setProperty('--ds-tree-line-color', 'rgba(255, 255, 255, 0.15)');
      }
    } catch (e) { }
  }

  /**
   * Aplica el padding de container-fluid desde el Design System al DOM.
   * Lee de localStorage (design-system-config) y establece --container-fluid-padding.
   */
  applyContainerFluidPadding(): void {
    if (typeof document === 'undefined') return;
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      const val = raw ? (JSON.parse(raw)?.layout?.containerFluidPadding) : null;
      const padding = val && typeof val === 'string' ? val : '2rem';
      document.documentElement.style.setProperty('--container-fluid-padding', padding);
    } catch { /* fallback: no change */ }
  }

  getDefaultCrudView(): CrudViewConfig {
    return {
      newBtnClass: 'btn-primary', newBtnIcon: 'fas fa-plus', newBtnLabel: 'Nuevo',
      exportBtnClass: 'btn-outline-success', exportBtnIcon: 'fas fa-file-excel', exportBtnLabel: 'Exportar',
      filterInputSize: 'form-control-sm',
      filterInputFontSize: '0.8rem',
      tableClasses: 'table-hover table-striped table-sm text-nowrap',
      paginationSize: 'pagination-sm',
      viewBtnClass: 'btn-info', editBtnClass: 'btn-warning', deleteBtnClass: 'btn-danger',
      statusActiveClass: 'badge-success', statusActiveText: 'Activo',
      statusInactiveClass: 'badge-secondary', statusInactiveText: 'Inactivo',
      cardOutlineColor: 'card-secondary', cardBorderRadius: 6, showBreadcrumbs: true,
      fontSize: '0.82rem', headerFontSize: '0.9rem', labelFontSize: '0.78rem',
      excelBtnClass: 'btn-success', excelBtnIcon: 'fas fa-file-excel', excelBtnLabel: 'Excel',
      pdfBtnClass: 'btn-danger', pdfBtnIcon: 'fas fa-file-pdf', pdfBtnLabel: 'PDF',
      printBtnClass: 'btn-info', printBtnIcon: 'fas fa-print', printBtnLabel: 'Imprimir',
      showExportButtons: true,
      defaultPageSize: 10,
      pageSizeOptions: [5, 10, 15, 25, 50],
      tableHeaderBg: '#f8f9fa',
      tableHeaderColor: '#495057',
      collapsibleFilters: true,
      cellPaddingY: '0.35rem',
      cellPaddingX: '0.5rem',
      showRecordCount: true
    };
  }

  getDefaultModalCrud(): ModalCrudConfig {
    return {
      headerBg: '#007bff', headerText: '#ffffff', headerIcon: 'fas fa-edit',
      bodyBg: '#ffffff', footerBg: '#f8f9fa', borderRadius: 12,
      saveBtnClass: 'btn-primary', saveBtnIcon: 'fas fa-save', saveBtnLabel: 'Guardar',
      cancelBtnClass: 'btn-secondary', cancelBtnIcon: 'fas fa-times', cancelBtnLabel: 'Cancelar',
      deleteBtnClass: 'btn-danger', deleteBtnIcon: 'fas fa-trash', deleteBtnLabel: 'Eliminar',
      titleAdd: 'Nuevo Registro', titleEdit: 'Editar Registro',
      labelColor: '#495057', labelWeight: 'normal', inputSize: 'form-control-sm',
      labelMarginBottom: '0.25rem', formPadding: '1rem',
      headerPadding: '0.75rem 1rem', headerFontSize: '1.1rem'
    };
  }

  getDefaultPageHeader(): PageHeaderConfig {
    return {
      padding: '10px 0.5rem',
      titleSize: '1.4rem',
      titleWeight: '500',
      titleColor: '#1c1e21',
      subtitleSize: '0.6em',
      subtitleColor: '#6c757d',
      breadcrumbSize: '0.85rem',
      bg: 'transparent',
      borderBottom: 'none',
      headerToContentGap: '0.5rem'
    };
  }

  getDefaultSystemLayout(): SystemLayoutConfig {
    return {
      maxWidth: '100%',
      padding: '1.5rem',
      margin: '0 0 1.5rem 0',
      backgroundColor: '#ffffff',
      borderRadius: '8px',
      border: '1px solid #e9ecef',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      contentPadding: '1.5rem',
      headerPadding: '1rem 1.5rem',
      footerPadding: '1rem 1.5rem',
      titleSize: '1.5rem',
      titleColor: '#1c1e21',
      subtitleSize: '0.9rem',
      subtitleColor: '#6c757d',
      breadcrumbSize: '0.85rem',
      showHeader: true,
      showFooter: false,
      showBreadcrumbs: true,
      containerFluid: true,
      stickyHeader: true,
      headerBackgroundColor: '#ffffff'
    };
  }

  getDefaultConfirmDialog(): ConfirmDialogConfig {
    return {
      dangerBg: '#dc3545', dangerText: '#ffffff',
      warningBg: '#ffc107', warningText: '#1c1e21',
      infoBg: '#17a2b8', infoText: '#ffffff',
      bodyBg: '#ffffff', footerBg: '#f8f9fa',
      footerBorder: '#e9ecef', borderRadius: 12,
      iconSize: '2.5rem', messageColor: '#1c1e21', detailColor: '#6c757d',
      cancelBtnClass: 'btn-secondary'
    };
  }

  getDefaultToast(): ToastConfig {
    return {
      successBg: '#28a745', successBorder: '#28a745',
      errorBg: '#dc3545', errorBorder: '#dc3545',
      warningBg: '#ffc107', warningBorder: '#ffc107', warningText: '#212529',
      infoBg: '#17a2b8', infoBorder: '#17a2b8',
      bodyBg: '#ffffff', bodyText: '#212529',
      borderRadius: 6,
      position: 'top-right',
      toastWidth: 380,
      toastMaxWidth: 520,
      toastOpacity: 0.92,
      toastAnimation: 'slide-up',
      progressBarColor: 'rgba(255, 193, 7, 0.95)'
    };
  }

  private loadGlobal(): void {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) {
        const config = JSON.parse(raw);
        if (config.crudView) this.globalCrudView$.next({ ...this.getDefaultCrudView(), ...config.crudView });
        if (config.modalCrud) this.globalModalCrud$.next({ ...this.getDefaultModalCrud(), ...config.modalCrud });
        if (config.pageHeader) this.globalPageHeader$.next({ ...this.getDefaultPageHeader(), ...config.pageHeader });
        if (config.systemLayout) this.globalSystemLayout$.next({ ...this.getDefaultSystemLayout(), ...config.systemLayout });
        if (config.confirmDialog) this.globalConfirmDialog$.next({ ...this.getDefaultConfirmDialog(), ...config.confirmDialog });
        if (config.toast) this.globalToast$.next({ ...this.getDefaultToast(), ...config.toast });
      }
    } catch { /* use defaults */ }
  }

  private saveGlobalConfig(
    crudView: CrudViewConfig,
    modalCrud: ModalCrudConfig,
    layout?: LayoutConfig,
    pageHeader?: PageHeaderConfig,
    systemLayout?: SystemLayoutConfig,
    confirmDialog?: ConfirmDialogConfig,
    toast?: ToastConfig
  ): void {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      const existing = raw ? JSON.parse(raw) : {};
      existing.crudView = crudView;
      existing.modalCrud = modalCrud;
      if (layout) existing.layout = layout;
      if (pageHeader) existing.pageHeader = pageHeader;
      if (systemLayout) existing.systemLayout = systemLayout;
      if (confirmDialog) existing.confirmDialog = confirmDialog;
      if (toast) existing.toast = toast;
      localStorage.setItem(GLOBAL_KEY, JSON.stringify(existing));
      this.loadGlobal();
    } catch { /* ignore */ }
  }

  private loadSubsystemConfig(subsystemId: string): SubsystemDesignConfig | null {
    try {
      const raw = localStorage.getItem(SUBSYSTEM_PREFIX + subsystemId);
      if (raw) {
        return JSON.parse(raw) as SubsystemDesignConfig;
      }
    } catch { /* ignore */ }
    return null;
  }

  /**
   * Opciones estándar de Select2 del patrón de diseño (tema Bootstrap 4, idioma español).
   * Uso: $(selector).select2(this.designSystem.getSelect2Options({ dropdownParent: $('#modalId') }));
   * Luego aplicar clase de tamaño: $(selector).next('.select2-container').find('.select2-selection').addClass(this.designSystem.getSelect2InputSizeClass('activos-fijos'));
   */
  getSelect2Options(overrides?: {
    dropdownParent?: any;
    allowClear?: boolean;
    placeholder?: string;
    minimumResultsForSearch?: number;
    width?: string;
  }): Record<string, unknown> {
    const opts: Record<string, unknown> = {
      theme: 'bootstrap4',
      width: overrides?.width ?? '100%',
      minimumResultsForSearch: overrides?.minimumResultsForSearch ?? 0,
      allowClear: overrides?.allowClear !== false,
      language: {
        noResults: () => 'Sin resultados',
        searching: () => 'Buscando...',
        inputTooShort: () => 'Escriba para filtrar'
      }
    };
    if (overrides?.placeholder !== undefined) opts['placeholder'] = overrides.placeholder;
    if (overrides?.dropdownParent !== undefined) opts['dropdownParent'] = overrides.dropdownParent;
    return opts;
  }

  /** Clase de tamaño del input para Select2 (form-control-sm / form-control-lg) según el modal del subsistema. */
  getSelect2InputSizeClass(subsystem?: string): string {
    const mc = subsystem ? this.getModalCrudFor(subsystem) : this.currentModalCrud;
    return mc?.inputSize || 'form-control-sm';
  }

  /**
   * Convierte una clase de AdminLTE/Bootstrap (badge-success, card-primary) a su código HEX.
   * Público para que la vista previa del patrón de diseño pueda mostrar los colores en vivo.
   */
  getColorHex(className: string): string {
    if (!className) return '';
    if (className.startsWith('#')) return className;

    const colors: { [key: string]: string } = {
      'primary': '#007bff',
      'secondary': '#6c757d',
      'success': '#28a745',
      'info': '#17a2b8',
      'warning': '#ffc107',
      'danger': '#dc3545',
      'light': '#f8f9fa',
      'dark': '#343a40',
      'white': '#ffffff',
      'indigo': '#6610f2',
      'purple': '#6f42c1',
      'pink': '#e83e8c',
      'orange': '#fd7e14',
      'teal': '#20c997',
      'cyan': '#17a2b8',
      // Condición de activos
      'bueno': '#28a745',
      'regular': '#ffc107',
      'malo': '#dc3545',
      'obsoleto': '#6c757d'
    };

    // Extraer el nombre del color de clases como badge-success o card-primary
    const parts = className.split('-');
    const colorName = parts.length > 1 ? parts[1] : parts[0];

    return colors[colorName] || className;
  }
}
