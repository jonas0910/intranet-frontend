import { Component, OnInit, AfterViewChecked, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { LoadingSpinnerComponent } from '../../../shared/components';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { UIPreviewComponent } from '../ui-preview/ui-preview.component';
import { LayoutShellPreviewComponent } from '../layout-shell-preview/layout-shell-preview.component';
import {
  DesignSystemService, SubsystemEntry, PageHeaderConfig, ConfirmDialogConfig,
  ToastConfig, SystemLayoutConfig, CrudViewConfig, LayoutConfig, ModalCrudConfig,
  ColorItem, ButtonItem, TableColumn, FormField
} from '../../../services/design-system.service';
import { SystemManagementService } from '../../../services/system-management.service';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

export interface DesignSystemConfig {
  colors: ColorItem[];
  buttonGroups: { group: string; label: string; buttons: ButtonItem[] }[];
  tableColumns: TableColumn[];
  formFields: FormField[];
  tableClasses: string;
  formInputSize: string;
  layout: LayoutConfig;
  systemLayout: SystemLayoutConfig;
  modalCrud: ModalCrudConfig;
  crudView: CrudViewConfig;
  pageHeader: PageHeaderConfig;
  confirmDialog: ConfirmDialogConfig;
  toast: ToastConfig;
}

const STORAGE_KEY = 'design-system-config';

declare var $: any;

export interface CrudListDemoRow {
  codigo: string;
  nombre: string;
  departamento: string;
  status: boolean;
}

@Component({
  selector: 'app-design-system',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    LayoutShellPreviewComponent
  ],
  templateUrl: './design-system.component.html',
  styleUrls: ['./design-system.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DesignSystemComponent implements OnInit, AfterViewChecked {
  config!: DesignSystemConfig;

  /** Vista previa pestaña 5: tabla 100 % Angular (sin jQuery / DataTables). */
  crudViewDummyData: CrudListDemoRow[] = [];
  crudListSearch = '';
  crudListPage = 1;
  /** Filas por página en la vista previa (sincronizado con opciones del patrón). */
  crudListItemsPerPage = 10;
  crudListSort: { key: 'codigo' | 'nombre' | 'departamento' | 'estado'; dir: 'asc' | 'desc' } = {
    key: 'nombre',
    dir: 'asc',
  };
  /** Texto editable para opciones "Mostrar X registros" (CSV) */
  pageSizeOptionsInput = '5, 10, 15, 25, 50';
  isFiltersCollapsed = false;
  editingSection: string | null = null;
  savedMessage = '';
  modalPreviewMode: 'add' | 'edit' = 'add';
  activeDesignTab = 'layout';

  /** Subsystem selector */
  subsystems: SubsystemEntry[] = [];
  selectedSubsystem = 'global';
  subsystemsWithConfig: string[] = [];

  readonly demoBreadcrumbs = [
    { label: 'Inicio', url: '/' },
    { label: 'Sección', url: '#' },
    { label: 'Actual' }
  ];

  readonly dummyData = [
    { id: 1, name: 'Proyecto Alpha', status: true, date: new Date() },
    { id: 2, name: 'Tarea Beta', status: false, date: new Date() },
    { id: 3, name: 'Módulo Gamma', status: true, date: new Date() },
  ];

  readonly btnClassList: string[] = [
    'btn-primary', 'btn-secondary', 'btn-success', 'btn-danger',
    'btn-warning', 'btn-info', 'btn-dark', 'btn-light',
    'btn-outline-primary', 'btn-outline-secondary', 'btn-outline-success',
    'btn-outline-danger', 'btn-outline-warning', 'btn-outline-info'
  ];

  /** Hex del color del borde Card Outlined para la vista previa en vivo (sin depender de CSS variables). */
  getCardOutlineColorHex(): string {
    const hex = this.config?.crudView?.cardOutlineColor
      ? this.dsService.getColorHex(this.config.crudView.cardOutlineColor)
      : '';
    return hex || '#dee2e6';
  }

  cachedLayoutSummary: { label: string; color: string }[] = [];

  constructor(
    private modalService: NgbModal,
    private cdr: ChangeDetectorRef,
    private dsService: DesignSystemService,
    private systemService: SystemManagementService,
    private toastService: ToastService
  ) { }

  ngOnInit(): void {
    this.loadSubsystems();
    this.loadConfig();
    this.initCrudViewData();
    this.syncCrudListPageSizeFromConfig();
  }

  ngAfterViewChecked(): void {
    this.initSelect2InPreview();
  }

  private initSelect2InPreview(): void {
    if (typeof $ === 'undefined' || this.activeDesignTab !== 'crud') return;
    const hasSelect2Types = this.config?.formFields?.some(
      (f: FormField) => ['select2-search', 'select2-danger', 'select2-purple', 'select2-minimal', 'select2-multiple'].includes(f.type)
    );
    if (!hasSelect2Types) return;
    setTimeout(() => {
      const container = document.querySelector('.ds-modal-preview');
      if (!container) return;
      const $container = $(container);
      const selects = container.querySelectorAll('select.ds-select2-preview');
      selects.forEach((el: Element) => {
        const $el = $(el);
        const sizeClass = $el.hasClass('form-control-sm') ? 'form-control-sm' : $el.hasClass('form-control-lg') ? 'form-control-lg' : '';
        const $selection = this.getSelect2SelectionFor($el);
        try {
          if ($el.data('select2')) {
            // Ya inicializado: sincronizar clase de tamaño al .select2-selection
            if ($selection.length) {
              $selection.removeClass('form-control-sm form-control-lg').addClass(sizeClass);
            }
            return;
          }
          $el.select2({
            theme: 'bootstrap4',
            width: '100%',
            minimumResultsForSearch: 0,
            placeholder: $el.prop('multiple') ? 'Seleccione...' : undefined,
            allowClear: !$el.prop('multiple'),
            dropdownParent: $container,
            language: {
              noResults: () => 'Sin resultados',
              searching: () => 'Buscando...',
              inputTooShort: () => 'Escriba para filtrar'
            }
          });
          // Aplicar clase de tamaño al .select2-selection (tras crear el widget)
          setTimeout(() => {
            const $sel = this.getSelect2SelectionFor($el);
            if ($sel.length) {
              $sel.removeClass('form-control-sm form-control-lg').addClass(sizeClass);
            }
          }, 0);
        } catch (e) {
          // ignore
        }
      });
    }, 100);
  }

  /** Obtiene el .select2-selection asociado a un select con Select2 (soporta estructura sibling o wrapper) */
  private getSelect2SelectionFor($select: JQuery): JQuery {
    const $next = $select.next('.select2-container');
    if ($next.length) {
      const $sel = $next.find('.select2-selection');
      if ($sel.length) return $sel;
    }
    return $select.closest('.select2-container--preview').find('.select2-container .select2-selection');
  }

  private initCrudViewData(): void {
    this.crudViewDummyData = [
      { codigo: 'EMP-001', nombre: 'Juan Pérez García', departamento: 'Administración', status: true },
      { codigo: 'EMP-002', nombre: 'María López Sánchez', departamento: 'Contabilidad', status: false },
      { codigo: 'EMP-003', nombre: 'Carlos Ruiz Medina', departamento: 'Logística', status: true },
      { codigo: 'EMP-004', nombre: 'Ana Martínez Vega', departamento: 'RRHH', status: true },
      { codigo: 'EMP-005', nombre: 'Pedro González Lima', departamento: 'TI', status: false },
      { codigo: 'EMP-006', nombre: 'Lucía Méndez Torrez', departamento: 'Administración', status: true },
      { codigo: 'EMP-007', nombre: 'Ricardo Palma Soriano', departamento: 'Contabilidad', status: true },
      { codigo: 'EMP-008', nombre: 'Elena de Troya', departamento: 'Logística', status: false },
      { codigo: 'EMP-009', nombre: 'Miguel Grau Seminario', departamento: 'Seguridad', status: true },
      { codigo: 'EMP-010', nombre: 'Francisco Bolognesi', departamento: 'Seguridad', status: true },
      { codigo: 'EMP-011', nombre: 'José Olaya Balandra', departamento: 'Logística', status: true },
      { codigo: 'EMP-012', nombre: 'Daniel Alcides Carrión', departamento: 'Salud', status: true },
      { codigo: 'EMP-013', nombre: 'Jorge Basadre Grohmann', departamento: 'Cultura', status: true },
      { codigo: 'EMP-014', nombre: 'César Vallejo Mendoza', departamento: 'Cultura', status: true },
      { codigo: 'EMP-015', nombre: 'Abraham Valdelomar', departamento: 'Cultura', status: false },
    ];
  }

  /** Opciones numéricas «Mostrar X» para el select de la vista previa. */
  get crudListPageSizeChoices(): number[] {
    const o = this.config?.crudView?.pageSizeOptions;
    return Array.isArray(o) && o.length ? o : [5, 10, 15, 25, 50];
  }

  private syncCrudListPageSizeFromConfig(): void {
    const def = this.config?.crudView?.defaultPageSize;
    const choices = this.crudListPageSizeChoices;
    const n = def && def > 0 ? def : 10;
    this.crudListItemsPerPage = choices.includes(n) ? n : choices[0] ?? 10;
    this.crudListPage = 1;
  }

  private crudListComparable(row: CrudListDemoRow): string | number {
    switch (this.crudListSort.key) {
      case 'codigo':
        return row.codigo.toLowerCase();
      case 'nombre':
        return row.nombre.toLowerCase();
      case 'departamento':
        return row.departamento.toLowerCase();
      case 'estado':
        return row.status ? 1 : 0;
      default:
        return '';
    }
  }

  /** Filas filtradas por búsqueda y ordenadas (toda la lógica en memoria, Angular puro). */
  get crudListFilteredSorted(): CrudListDemoRow[] {
    const cv = this.config?.crudView;
    const q = (this.crudListSearch || '').trim().toLowerCase();
    let rows = [...this.crudViewDummyData];
    if (q) {
      rows = rows.filter((r) => {
        const estadoTxt = (r.status ? cv?.statusActiveText : cv?.statusInactiveText) || '';
        return (
          r.codigo.toLowerCase().includes(q) ||
          r.nombre.toLowerCase().includes(q) ||
          r.departamento.toLowerCase().includes(q) ||
          estadoTxt.toLowerCase().includes(q)
        );
      });
    }
    const { dir } = this.crudListSort;
    const mul = dir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      const va = this.crudListComparable(a);
      const vb = this.crudListComparable(b);
      if (va < vb) return -1 * mul;
      if (va > vb) return 1 * mul;
      return 0;
    });
    return rows;
  }

  get crudListTotalFiltered(): number {
    return this.crudListFilteredSorted.length;
  }

  get crudListTotalPages(): number {
    const per = this.crudListItemsPerPage > 0 ? this.crudListItemsPerPage : 10;
    return Math.max(1, Math.ceil(this.crudListTotalFiltered / per));
  }

  get crudListPagedRows(): CrudListDemoRow[] {
    const per = this.crudListItemsPerPage > 0 ? this.crudListItemsPerPage : 10;
    const page = Math.min(Math.max(1, this.crudListPage), this.crudListTotalPages);
    const start = (page - 1) * per;
    return this.crudListFilteredSorted.slice(start, start + per);
  }

  get crudListInfoFrom(): number {
    if (this.crudListTotalFiltered === 0) {
      return 0;
    }
    const per = this.crudListItemsPerPage > 0 ? this.crudListItemsPerPage : 10;
    return (Math.min(this.crudListPage, this.crudListTotalPages) - 1) * per + 1;
  }

  get crudListInfoTo(): number {
    if (this.crudListTotalFiltered === 0) {
      return 0;
    }
    return Math.min(this.crudListInfoFrom + this.crudListPagedRows.length - 1, this.crudListTotalFiltered);
  }

  onCrudListSearchChange(): void {
    this.crudListPage = 1;
    this.cdr.markForCheck();
  }

  onCrudListItemsPerPageChange(): void {
    this.crudListPage = 1;
    this.cdr.markForCheck();
  }

  toggleCrudListSort(key: 'codigo' | 'nombre' | 'departamento' | 'estado'): void {
    if (this.crudListSort.key === key) {
      this.crudListSort = { key, dir: this.crudListSort.dir === 'asc' ? 'desc' : 'asc' };
    } else {
      this.crudListSort = { key, dir: 'asc' };
    }
    this.cdr.markForCheck();
  }

  crudListSortIcon(key: 'codigo' | 'nombre' | 'departamento' | 'estado'): string {
    if (this.crudListSort.key !== key) {
      return 'fa-sort text-muted';
    }
    return this.crudListSort.dir === 'asc' ? 'fa-sort-up' : 'fa-sort-down';
  }

  goCrudListPage(p: number): void {
    const next = Math.min(Math.max(1, p), this.crudListTotalPages);
    if (next !== this.crudListPage) {
      this.crudListPage = next;
      this.cdr.markForCheck();
    }
  }

  async crudListExportCopy(): Promise<void> {
    const cv = this.config.crudView;
    const rows = this.crudListFilteredSorted;
    const sep = '\t';
    const header = ['Código', 'Nombre', 'Departamento', 'Estado'];
    const lines = [
      header.join(sep),
      ...rows.map((r) =>
        [
          r.codigo,
          r.nombre,
          r.departamento,
          r.status ? cv.statusActiveText : cv.statusInactiveText,
        ].join(sep)
      ),
    ];
    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      this.toastService.success('Datos copiados al portapapeles (pegar en Excel).');
    } catch {
      this.toastService.error('No se pudo copiar al portapapeles.');
    }
    this.cdr.markForCheck();
  }

  /** Demostración: CSV descargable (compatible Excel). */
  crudListExportCsv(): void {
    const cv = this.config.crudView;
    const rows = this.crudListFilteredSorted;
    const sep = ';';
    const header = ['Código', 'Nombre', 'Departamento', 'Estado'];
    const lines = [
      header.join(sep),
      ...rows.map((r) =>
        [
          r.codigo,
          `"${(r.nombre || '').replace(/"/g, '""')}"`,
          `"${(r.departamento || '').replace(/"/g, '""')}"`,
          r.status ? cv.statusActiveText : cv.statusInactiveText,
        ].join(sep)
      ),
    ];
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `patrones-listado-demo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  crudListExportPrint(): void {
    window.print();
  }

  crudListExportPdfHint(): void {
    this.toastService.info(
      'En módulos reales suele usarse una librería (p. ej. pdfMake). Aquí la vista previa solo demuestra tabla Angular.',
      'Exportar PDF'
    );
  }

  private refreshCrudListPreview(): void {
    this.syncCrudListPageSizeFromConfig();
    this.cdr.markForCheck();
  }

  private loadSubsystems(): void {
    this.subsystemsWithConfig = this.dsService.getSubsystemsWithConfig();
    this.systemService.getIntegratedSystems().subscribe({
      next: (res) => {
        const list: SubsystemEntry[] = (res?.data || []).map((s: any) => ({
          id: (s.codigo || s.nombre || '').toLowerCase().replace(/\s+/g, '-'),
          label: s.nombre || s.codigo || 'Sin nombre'
        }));
        this.subsystems = list;
        this.cdr.markForCheck();
      },
      error: () => { this.subsystems = []; this.cdr.markForCheck(); }
    });
  }

  onSubsystemChange(): void {
    this.editingSection = null;
    this.loadConfigForCurrentSubsystem();
    this.dsService.refresh(this.selectedSubsystem === 'global' ? undefined : this.selectedSubsystem);
    this.cdr.markForCheck();
  }

  get isSubsystemMode(): boolean {
    return this.selectedSubsystem !== 'global';
  }

  get currentSubsystemHasConfig(): boolean {
    return this.dsService.hasSubsystemConfig(this.selectedSubsystem);
  }

  private getDefaultConfig(): DesignSystemConfig {
    return {
      colors: [
        { name: 'Primary', cssClass: 'bg-primary', hex: '#007bff', textClass: 'text-white' },
        { name: 'Secondary', cssClass: 'bg-secondary', hex: '#6c757d', textClass: 'text-white' },
        { name: 'Success', cssClass: 'bg-success', hex: '#28a745', textClass: 'text-white' },
        { name: 'Danger', cssClass: 'bg-danger', hex: '#dc3545', textClass: 'text-white' },
        { name: 'Warning', cssClass: 'bg-warning', hex: '#ffc107', textClass: 'text-dark' },
        { name: 'Info', cssClass: 'bg-info', hex: '#17a2b8', textClass: 'text-white' },
        { name: 'Facebook Blue', cssClass: '', hex: '#1877f2', textClass: 'text-white' },
      ],
      buttonGroups: [
        {
          group: 'primary', label: 'Acciones Principales',
          buttons: [
            { label: 'Nuevo', icon: 'fas fa-plus', cssClass: 'btn-primary', group: 'primary' },
            { label: 'Guardar', icon: 'fas fa-save', cssClass: 'btn-success', group: 'primary' },
            { label: 'Buscar', icon: 'fas fa-search', cssClass: 'btn-info', group: 'primary' },
          ]
        },
        {
          group: 'secondary', label: 'Acciones Secundarias',
          buttons: [
            { label: 'Cancelar', icon: 'fas fa-times', cssClass: 'btn-secondary', group: 'secondary' },
            { label: 'Editar', icon: 'fas fa-edit', cssClass: 'btn-warning', group: 'secondary' },
            { label: 'Eliminar', icon: 'fas fa-trash', cssClass: 'btn-danger', group: 'secondary' },
          ]
        },
        {
          group: 'export', label: 'Exportación (listados)',
          buttons: [
            { label: 'Excel', icon: 'fas fa-file-excel', cssClass: 'btn-success', group: 'export' },
            { label: 'PDF', icon: 'fas fa-file-pdf', cssClass: 'btn-danger', group: 'export' },
            { label: 'Imprimir', icon: 'fas fa-print', cssClass: 'btn-info', group: 'export' },
          ]
        }
      ],
      tableColumns: [
        { label: 'ID', field: 'id', align: 'left' },
        { label: 'Nombre', field: 'name', align: 'left' },
        { label: 'Fecha', field: 'date', align: 'left' },
        { label: 'Estado', field: 'status', align: 'center' },
        { label: 'Acciones', field: 'actions', align: 'right' },
      ],
      tableClasses: 'table-hover table-striped table-sm text-nowrap',
      formInputSize: 'form-control-sm',
      formFields: [
        { label: 'Campo Texto', type: 'text', colSize: 6, required: true, placeholder: 'Ej. Nombre' },
        { label: 'Campo Select', type: 'select', colSize: 6, required: false, options: ['Opción 1', 'Opción 2', 'Opción 3'] },
        { label: 'Fecha', type: 'date', colSize: 4, required: false },
        { label: 'Número', type: 'number', colSize: 4, required: false, placeholder: '0' },
        { label: 'Switch', type: 'switch', colSize: 4, required: false },
        { label: 'Select2 Minimal', type: 'select2-minimal', colSize: 6, required: false, options: ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Chiclayo'] },
        { label: 'Select2 Multiple', type: 'select2-multiple', colSize: 6, required: false, options: ['Juan Pérez', 'María López', 'Carlos Ruiz', 'Ana Martínez'] },
        { label: 'Descripción (Textarea)', type: 'textarea', colSize: 12, required: false, rows: 2, placeholder: 'Escriba aquí...' },
      ],
      layout: {
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
      },
      systemLayout: this.dsService.getDefaultSystemLayout(),
      modalCrud: {
        headerBg: '#007bff',
        headerText: '#ffffff',
        headerIcon: 'fas fa-edit',
        bodyBg: '#ffffff',
        footerBg: '#f8f9fa',
        borderRadius: 12,
        saveBtnClass: 'btn-primary',
        saveBtnIcon: 'fas fa-save',
        saveBtnLabel: 'Guardar',
        cancelBtnClass: 'btn-secondary',
        cancelBtnIcon: 'fas fa-times',
        cancelBtnLabel: 'Cancelar',
        deleteBtnClass: 'btn-danger',
        deleteBtnIcon: 'fas fa-trash',
        deleteBtnLabel: 'Eliminar',
        titleAdd: 'Nuevo Registro',
        titleEdit: 'Editar Registro',
        labelColor: '#495057',
        labelWeight: 'normal',
        inputSize: 'form-control-sm',
        labelMarginBottom: '0.25rem',
        formPadding: '1rem',
        headerPadding: '0.75rem 1rem',
        headerFontSize: '1.1rem'
      },
      crudView: {
        newBtnClass: 'btn-primary',
        newBtnIcon: 'fas fa-plus',
        newBtnLabel: 'Nuevo',
        exportBtnClass: 'btn-outline-success',
        exportBtnIcon: 'fas fa-file-excel',
        exportBtnLabel: 'Exportar',
        filterInputSize: 'form-control-sm',
        filterInputFontSize: '0.8rem',
        tableClasses: 'table-hover table-striped table-sm text-nowrap',
        paginationSize: 'pagination-sm',
        viewBtnClass: 'btn-info',
        editBtnClass: 'btn-warning',
        deleteBtnClass: 'btn-danger',
        statusActiveClass: 'badge-success',
        statusActiveText: 'Activo',
        statusInactiveClass: 'badge-secondary',
        statusInactiveText: 'Inactivo',
        cardOutlineColor: 'card-secondary',
        cardBorderRadius: 6,
        showBreadcrumbs: true,
        fontSize: '0.82rem',
        headerFontSize: '0.9rem',
        labelFontSize: '0.78rem',
        excelBtnClass: 'btn-success',
        excelBtnIcon: 'fas fa-file-excel',
        excelBtnLabel: 'Excel',
        pdfBtnClass: 'btn-danger',
        pdfBtnIcon: 'fas fa-file-pdf',
        pdfBtnLabel: 'PDF',
        printBtnClass: 'btn-info',
        printBtnIcon: 'fas fa-print',
        printBtnLabel: 'Imprimir',
        showExportButtons: true,
        defaultPageSize: 10,
        pageSizeOptions: [5, 10, 15, 25, 50],
        tableHeaderBg: '#f8f9fa',
        tableHeaderColor: '#495057',
        collapsibleFilters: true,
        cellPaddingY: '0.35rem',
        cellPaddingX: '0.5rem',
        showRecordCount: true
      },
      pageHeader: this.dsService.getDefaultPageHeader(),
      confirmDialog: this.dsService.getDefaultConfirmDialog(),
      toast: this.dsService.getDefaultToast()
    };
  }

  loadConfig(): void {
    this.loadGlobalConfig();
    this.rebuildLayoutSummary();
  }

  private loadGlobalConfig(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.config = JSON.parse(saved);
        const defaults = this.getDefaultConfig();
        if (!this.config.layout) this.config.layout = defaults.layout;
        else {
          if (this.config.layout.containerFluidPadding === undefined) this.config.layout.containerFluidPadding = defaults.layout.containerFluidPadding;
          if (this.config.layout.showTreeLines === undefined) this.config.layout.showTreeLines = defaults.layout.showTreeLines;
          if (this.config.layout.treeLineColor === undefined) this.config.layout.treeLineColor = defaults.layout.treeLineColor;
          if (this.config.layout.treeBranchLength === undefined) this.config.layout.treeBranchLength = defaults.layout.treeBranchLength;
          if (this.config.layout.treeLevel1Offset === undefined) this.config.layout.treeLevel1Offset = defaults.layout.treeLevel1Offset;
          if (this.config.layout.treeLevel2Offset === undefined) this.config.layout.treeLevel2Offset = defaults.layout.treeLevel2Offset;
          if (this.config.layout.treeLevel3Offset === undefined) this.config.layout.treeLevel3Offset = defaults.layout.treeLevel3Offset;
        }
        if (!this.config.systemLayout) this.config.systemLayout = defaults.systemLayout;
        else {
          if (this.config.systemLayout.maxWidth === undefined) this.config.systemLayout.maxWidth = defaults.systemLayout.maxWidth ?? '100%';
        }
        if (!this.config.modalCrud) this.config.modalCrud = defaults.modalCrud;
        else {
          if (this.config.modalCrud.labelMarginBottom === undefined) this.config.modalCrud.labelMarginBottom = defaults.modalCrud.labelMarginBottom;
          if (this.config.modalCrud.formPadding === undefined) this.config.modalCrud.formPadding = defaults.modalCrud.formPadding;
          if (this.config.modalCrud.headerPadding === undefined) this.config.modalCrud.headerPadding = defaults.modalCrud.headerPadding;
          if (this.config.modalCrud.headerFontSize === undefined) this.config.modalCrud.headerFontSize = defaults.modalCrud.headerFontSize;
        }
        if (!this.config.crudView) this.config.crudView = defaults.crudView;
        else {
          if (this.config.crudView.defaultPageSize === undefined) this.config.crudView.defaultPageSize = defaults.crudView.defaultPageSize;
          if (!this.config.crudView.pageSizeOptions?.length) this.config.crudView.pageSizeOptions = defaults.crudView.pageSizeOptions;
          if (this.config.crudView.filterInputFontSize === undefined) this.config.crudView.filterInputFontSize = defaults.crudView.filterInputFontSize;
          if (this.config.crudView.tableHeaderBg === undefined) this.config.crudView.tableHeaderBg = defaults.crudView.tableHeaderBg;
          if (this.config.crudView.tableHeaderColor === undefined) this.config.crudView.tableHeaderColor = defaults.crudView.tableHeaderColor;
          if (this.config.crudView.collapsibleFilters === undefined) this.config.crudView.collapsibleFilters = defaults.crudView.collapsibleFilters;
          if (!this.config.crudView.cellPaddingY) this.config.crudView.cellPaddingY = defaults.crudView.cellPaddingY;
          if (!this.config.crudView.cellPaddingX) this.config.crudView.cellPaddingX = defaults.crudView.cellPaddingX;
          if (this.config.crudView.showRecordCount === undefined) this.config.crudView.showRecordCount = defaults.crudView.showRecordCount;
        }

        // Migración: Asegurar que existan ejemplos de Select2 si no están (al principio para visibilidad)
        if (this.config.formFields && !this.config.formFields.some(f => f.type === 'select2-minimal')) {
          this.config.formFields.unshift(
            { label: 'Select2 Minimal', type: 'select2-minimal', colSize: 6, required: false, options: ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Chiclayo'] },
            { label: 'Select2 Multiple', type: 'select2-multiple', colSize: 6, required: false, options: ['Juan Pérez', 'María López', 'Carlos Ruiz', 'Ana Martínez'] }
          );
        }

        if (!this.config.pageHeader) this.config.pageHeader = defaults.pageHeader;
        if (!this.config.confirmDialog) this.config.confirmDialog = defaults.confirmDialog;
        if (!this.config.toast) this.config.toast = defaults.toast;
        else {
          if (this.config.toast.toastWidth == null) this.config.toast.toastWidth = defaults.toast.toastWidth;
          if (this.config.toast.toastMaxWidth == null) this.config.toast.toastMaxWidth = defaults.toast.toastMaxWidth;
          if (this.config.toast.progressBarColor == null) this.config.toast.progressBarColor = defaults.toast.progressBarColor;
        }
      } else {
        this.config = this.getDefaultConfig();
      }
    } catch {
      this.config = this.getDefaultConfig();
    }
    this.syncPageSizeOptionsInput();
  }

  private loadConfigForCurrentSubsystem(): void {
    if (this.selectedSubsystem === 'global') {
      this.loadGlobalConfig();
    } else {
      this.loadGlobalConfig();
      const cv = this.dsService.getCrudViewFor(this.selectedSubsystem);
      const mc = this.dsService.getModalCrudFor(this.selectedSubsystem);
      const ph = this.dsService.getPageHeaderFor(this.selectedSubsystem);
      const sl = this.dsService.getSystemLayoutFor(this.selectedSubsystem);
      const cd = this.dsService.getConfirmDialogFor(this.selectedSubsystem);
      const tc = this.dsService.getToastFor(this.selectedSubsystem);
      const ly = this.dsService.getLayoutFor(this.selectedSubsystem);
      this.config.crudView = { ...cv };
      this.config.modalCrud = { ...mc };
      this.config.pageHeader = { ...ph };
      this.config.systemLayout = { ...sl };
      this.config.confirmDialog = { ...cd };
      this.config.toast = { ...tc };
      if (ly) this.config.layout = { ...ly };
      else this.config.layout = this.getDefaultConfig().layout;
    }
    this.syncPageSizeOptionsInput();
    this.refreshCrudListPreview();
    this.rebuildLayoutSummary();
  }

  saveConfig(): void {
    // Siempre persistir la config global completa (formFields, modalCrud, etc.) para que
    // los cambios en Ventanas Modales y Formularios no se pierdan al recargar.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    if (this.selectedSubsystem === 'global') {
      // Persistir también en el servicio y en la API para que syncFromDatabase no sobrescriba con datos viejos (ej. card outline azul)
      this.dsService.saveSubsystemConfig(
        'global',
        this.config.crudView,
        this.config.modalCrud,
        this.config.layout,
        this.config.pageHeader,
        this.config.systemLayout,
        this.config.confirmDialog,
        this.config.toast
      );
      this.dsService.refresh();
    } else {
      this.dsService.saveSubsystemConfig(
        this.selectedSubsystem,
        this.config.crudView,
        this.config.modalCrud,
        this.config.layout,
        this.config.pageHeader,
        this.config.systemLayout,
        this.config.confirmDialog,
        this.config.toast
      );
      this.dsService.refresh(this.selectedSubsystem);
    }
    this.editingSection = null;
    this.subsystemsWithConfig = this.dsService.getSubsystemsWithConfig();
    this.rebuildLayoutSummary();
    this.showSaved();
    this.cdr.markForCheck();
  }

  removeSubsystemOverride(): void {
    if (this.selectedSubsystem === 'global') return;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    const label = this.subsystems.find(s => s.id === this.selectedSubsystem)?.label || this.selectedSubsystem;
    ref.componentInstance.title = 'Quitar Patrón del Subsistema';
    ref.componentInstance.message = `¿Quitar la configuración personalizada de "${label}"?`;
    ref.componentInstance.detail = 'Este subsistema pasará a usar el patrón Global por defecto.';
    ref.componentInstance.type = 'warning';
    ref.componentInstance.confirmText = 'Sí, quitar';
    ref.componentInstance.confirmIcon = 'fas fa-undo';
    ref.componentInstance.confirmClass = 'btn-warning';

    ref.result.then(
      () => {
        this.dsService.removeSubsystemConfig(this.selectedSubsystem);
        this.subsystemsWithConfig = this.dsService.getSubsystemsWithConfig();
        this.loadConfigForCurrentSubsystem();
        this.dsService.refresh(this.selectedSubsystem === 'global' ? undefined : this.selectedSubsystem);
        this.showSaved();
        this.cdr.markForCheck();
      },
      () => { }
    );
  }

  resetConfig(): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.title = 'Restablecer Configuración';
    ref.componentInstance.message = '¿Restablecer toda la configuración a los valores por defecto?';
    ref.componentInstance.detail = 'Se perderán todos los cambios personalizados de colores, botones, tablas, formularios y layout.';
    ref.componentInstance.type = 'warning';
    ref.componentInstance.confirmText = 'Sí, restablecer';
    ref.componentInstance.confirmIcon = 'fas fa-undo';
    ref.componentInstance.confirmClass = 'btn-warning';

    ref.result.then(
      () => {
        if (this.selectedSubsystem === 'global') {
          localStorage.removeItem(STORAGE_KEY);
        } else {
          this.dsService.removeSubsystemConfig(this.selectedSubsystem);
          this.subsystemsWithConfig = this.dsService.getSubsystemsWithConfig();
        }
        this.config = this.getDefaultConfig();
        this.editingSection = null;
        this.rebuildLayoutSummary();
        this.dsService.refresh(this.selectedSubsystem === 'global' ? undefined : this.selectedSubsystem);
        this.showSaved();
        this.cdr.markForCheck();
      },
      () => { }
    );
  }

  getSubsystemLabel(id: string): string {
    return this.subsystems.find(s => s.id === id)?.label || id;
  }

  copyGlobalToSubsystem(): void {
    this.loadGlobalConfig();
    this.dsService.saveSubsystemConfig(
      this.selectedSubsystem,
      this.config.crudView,
      this.config.modalCrud,
      this.config.layout,
      this.config.pageHeader,
      this.config.systemLayout,
      this.config.confirmDialog,
      this.config.toast
    );
    this.subsystemsWithConfig = this.dsService.getSubsystemsWithConfig();
    this.loadConfigForCurrentSubsystem();
    this.showSaved();
    this.cdr.markForCheck();
  }

  toggleEdit(section: string): void {
    const wasEditing = this.editingSection === section;
    this.editingSection = wasEditing ? null : section;

    if (wasEditing && section === 'table') {
      this.refreshCrudListPreview();
    }

    if (!this.editingSection) {
      this.rebuildLayoutSummary();
    }
    this.cdr.markForCheck();
  }

  isEditing(section: string): boolean {
    return this.editingSection === section;
  }

  /** Fuerza actualización de la vista previa al cambiar config de Ventanas Modales y Formularios (OnPush) */
  onModalPreviewConfigChange(): void {
    this.cdr.markForCheck();
  }

  onLayoutControlChange(): void {
    this.cdr.markForCheck();
  }

  syncPageSizeOptionsInput(): void {
    const o = this.config?.crudView?.pageSizeOptions;
    this.pageSizeOptionsInput = Array.isArray(o) && o.length ? o.join(', ') : '5, 10, 15, 25, 50';
  }

  onPageSizeOptionsBlur(): void {
    const raw = this.pageSizeOptionsInput;
    const arr = raw
      .split(',')
      .map(s => parseInt(s.trim(), 10))
      .filter(n => !isNaN(n) && n > 0);
    if (arr.length && this.config?.crudView) {
      this.config.crudView.pageSizeOptions = arr;
      this.onCrudListControlChange();
    } else {
      this.syncPageSizeOptionsInput();
    }
  }

  onCrudListControlChange(): void {
    this.refreshCrudListPreview();
  }

  toggleFiltersPreview(): void {
    this.isFiltersCollapsed = !this.isFiltersCollapsed;
    this.cdr.markForCheck();
  }

  setActiveTab(tab: string): void {
    this.activeDesignTab = tab;
    if (tab === 'crudList') {
      setTimeout(() => this.refreshCrudListPreview(), 0);
    }
    this.cdr.markForCheck();
  }

  // --- Colors ---
  addColor(): void {
    this.config.colors.push({ name: 'Nuevo Color', cssClass: '', hex: '#333333', textClass: 'text-white' });
  }

  removeColor(i: number): void {
    this.config.colors.splice(i, 1);
  }

  // --- Buttons ---
  addButton(groupIndex: number): void {
    const group = this.config.buttonGroups[groupIndex];
    group.buttons.push({ label: 'Acción', icon: 'fas fa-star', cssClass: 'btn-primary', group: group.group });
  }

  removeButton(groupIndex: number, btnIndex: number): void {
    this.config.buttonGroups[groupIndex].buttons.splice(btnIndex, 1);
  }

  addButtonGroup(): void {
    this.config.buttonGroups.push({
      group: 'custom-' + Date.now(), label: 'Nuevo Grupo',
      buttons: [{ label: 'Acción', icon: 'fas fa-bolt', cssClass: 'btn-primary', group: '' }]
    });
  }

  removeButtonGroup(i: number): void {
    this.config.buttonGroups.splice(i, 1);
  }

  // --- Table Columns ---
  addColumn(): void {
    this.config.tableColumns.push({ label: 'Nueva Columna', field: 'field', align: 'left' });
  }

  removeColumn(i: number): void {
    this.config.tableColumns.splice(i, 1);
  }

  // --- Form Fields ---
  addFormField(): void {
    this.config.formFields.push({ label: 'Nuevo Campo', type: 'text', colSize: 6, required: false, placeholder: '', rows: 2 });
  }

  removeFormField(i: number): void {
    this.config.formFields.splice(i, 1);
  }

  private showSaved(): void {
    this.savedMessage = 'Configuración guardada';
    setTimeout(() => this.savedMessage = '', 2500);
  }

  // --- Actions ---
  onView(item: any) { }
  onEdit(item: any) { }
  onDelete(item: any) { }

  previewDialog(type: 'danger' | 'warning' | 'info'): void {
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    const configs: Record<string, any> = {
      danger: {
        title: 'Eliminar Registro',
        message: '¿Estás seguro de eliminar este registro?',
        detail: 'Esta acción no se puede deshacer.',
        confirmText: 'Sí, eliminar',
        confirmIcon: 'fas fa-trash',
        confirmClass: 'btn-danger'
      },
      warning: {
        title: 'Confirmar Acción',
        message: '¿Deseas continuar con esta operación?',
        detail: 'Los cambios actuales se perderán si no los guardas.',
        confirmText: 'Sí, continuar',
        confirmIcon: 'fas fa-exclamation-circle',
        confirmClass: 'btn-warning'
      },
      info: {
        title: 'Información',
        message: '¿Deseas proceder con esta acción?',
        detail: 'Se aplicarán los cambios seleccionados al sistema.',
        confirmText: 'Aceptar',
        confirmIcon: 'fas fa-check',
        confirmClass: 'btn-info'
      }
    };
    const c = configs[type];
    ref.componentInstance.type = type;
    ref.componentInstance.title = c.title;
    ref.componentInstance.message = c.message;
    ref.componentInstance.detail = c.detail;
    ref.componentInstance.confirmText = c.confirmText;
    ref.componentInstance.confirmIcon = c.confirmIcon;
    ref.componentInstance.confirmClass = c.confirmClass;

    ref.result.then(() => { }, () => { });
  }

  previewToast(type: 'success' | 'error' | 'warning' | 'info'): void {
    const messages: Record<string, { title: string; msg: string }> = {
      success: { title: 'Éxito', msg: 'Registro guardado correctamente.' },
      error: { title: 'Error', msg: 'No se pudo completar la operación.' },
      warning: { title: 'Advertencia', msg: 'Hay campos sin completar.' },
      info: { title: 'Información', msg: 'Se encontraron 15 registros.' }
    };
    const m = messages[type];
    this.toastService[type](m.msg, m.title);
  }

  openFullPreview(): void {
    const modalRef = this.modalService.open(UIPreviewComponent, { size: 'xl', scrollable: true });
    modalRef.componentInstance.layout = this.config.layout;
  }

  private rebuildLayoutSummary(): void {
    const l = this.config.layout;
    this.cachedLayoutSummary = [
      { label: 'Sidebar', color: l.sidebarBg },
      { label: 'Brand', color: l.brandBg },
      { label: 'Navbar', color: l.navbarBg },
      { label: 'Contenido', color: l.contentBg },
      { label: 'Modal Header', color: l.modalHeaderBg },
      { label: 'Card Borde', color: l.cardBorderColor },
    ];
  }
}
