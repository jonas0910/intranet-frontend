import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { CensusReportesService, ReporteResumen, ReporteVulnerables, ReporteCobertura, ReporteDemografico } from '../services/censo-reportes.service';
import { CensoPoblacionalService, Organizacion } from '../services/censo-poblacional.service';
import { ToastService } from '../../../services/toast.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-censo-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, RouterModule, DataTablesModule],
  templateUrl: './censo-reportes.component.html',
  styles: [`
    .stat-card { border-left: 4px solid; transition: all 0.2s; }
    .stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .stat-card.primary { border-left-color: #0d6efd; }
    .stat-card.success { border-left-color: #198754; }
    .stat-card.warning { border-left-color: #ffc107; }
    .stat-card.danger { border-left-color: #dc3545; }
    .stat-card.info { border-left-color: #0dcaf0; }
    .ds-crud-filter { height: 31px; font-size: 0.75rem; }
    .ds-crud-label { font-size: 0.7rem; font-weight: 700; color: #555; text-transform: uppercase; margin-bottom: 2px; }
  `]
})
export class CensusReportesComponent extends CrudListExportBase implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  activeTab = 'ciudadanos';
  loading = false;
  isFiltersCollapsed = false;

  // Catalogos
  sectores: any[] = [];
  eventos: any[] = [];
  organizaciones: Organizacion[] = [];

  // Datos de Reportes
  resumen: ReporteResumen | null = null;
  vulnerables: ReporteVulnerables | null = null;
  cobertura: ReporteCobertura | null = null;
  demografico: ReporteDemografico | null = null;

  // Listados (Tablas)
  ciudadanosList: any[] = [];
  entregasEventosList: any[] = [];

  // Filtros
  filtrosCiudadanos = {
    id_sector: '',
    sexo: '',
    tiene_discapacidad: '',
    id_organizacion: ''
  };

  filtrosEventos = {
    id_evento: ''
  };

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  constructor(
    private reportesService: CensusReportesService,
    private censoService: CensoPoblacionalService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  ngOnInit() {
    this.dsService.setActiveSubsystem('censo-poblacional');
    this.initDataTable();
    this.loadCatalogos();
    this.loadReportes();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  initDataTable() {
    this.dtOptions = {
      paging: true,
      searching: true,
      info: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      pageLength: 25,
      order: [[1, 'asc']]
    };
  }

  private triggerDataTable() {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((instance: any) => {
        instance.destroy();
        this.safeDtTriggerNext();
      });
    } else {
      setTimeout(() => this.safeDtTriggerNext(), 100);
    }
  }

  loadCatalogos() {
    this.censoService.getSectores().subscribe(res => {
      if (res.success) this.sectores = res.data;
    });
    this.censoService.getEventos().subscribe(res => {
      if (res.success) this.eventos = res.data;
    });
    this.censoService.getOrganizaciones().subscribe(res => {
      if (res.success) this.organizaciones = res.data;
    });
  }

  changeTab(tab: string) {
    this.activeTab = tab;
    this.loadReportes();
  }

  loadReportes() {
    this.loading = true;
    switch (this.activeTab) {
      case 'resumen': this.loadResumen(); break;
      case 'ciudadanos': this.loadCiudadanosList(); break;
      case 'eventos': this.loadEventosReport(); break;
      case 'vulnerables': this.loadVulnerables(); break;
      case 'cobertura': this.loadCobertura(); break;
      case 'demografico': this.loadDemografico(); break;
    }
  }

  loadResumen() {
    this.reportesService.getResumenPadron().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.resumen = res.data;
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar resumen'); this.loading = false; }
    });
  }

  loadCiudadanosList() {
    this.reportesService.getCiudadanos(this.filtrosCiudadanos).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.ciudadanosList = res.data;
          this.triggerDataTable();
        }
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar ciudadanos'); this.loading = false; }
    });
  }

  loadEventosReport() {
    if (!this.filtrosEventos.id_evento) {
      this.entregasEventosList = [];
      this.loading = false;
      return;
    }
    this.reportesService.getEntregasPorEvento(+this.filtrosEventos.id_evento).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.entregasEventosList = res.data;
          this.triggerDataTable();
        }
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar reporte de evento'); this.loading = false; }
    });
  }

  loadVulnerables() {
    this.reportesService.getGruposVulnerables().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.vulnerables = res.data;
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar grupos vulnerables'); this.loading = false; }
    });
  }

  loadCobertura() {
    this.reportesService.getCoberturaSector().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.cobertura = res.data;
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar cobertura'); this.loading = false; }
    });
  }

  loadDemografico() {
    this.reportesService.getEstadisticasDemograficas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.demografico = res.data;
        this.loading = false;
      },
      error: () => { this.toast.error('Error al cargar estadísticas'); this.loading = false; }
    });
  }

  limpiarFiltros() {
    this.filtrosCiudadanos = { id_sector: '', sexo: '', tiene_discapacidad: '', id_organizacion: '' };
    this.filtrosEventos = { id_evento: '' };
    this.loadReportes();
  }

  // --- Implementación CrudListExportBase ---

  override getExportData(): Record<string, unknown>[] {
    if (this.activeTab === 'ciudadanos') {
      return this.ciudadanosList.map(c => ({
        dni: c.dni,
        nombres: c.nombres,
        sexo: c.sexo === 'M' ? 'Masc' : 'Fem',
        edad: c.edad,
        sector: c.sector?.nombre_sector || '-',
        organizaciones: c.organizaciones?.map((o: any) => o.nombre).join(', ') || '-',
        discapacidad: c.tiene_discapacidad ? 'Si' : 'No',
        direccion: c.direccion
      }));
    }
    if (this.activeTab === 'eventos') {
      return this.entregasEventosList.map(e => ({
        dni: e.ciudadano?.dni,
        ciudadano: e.ciudadano?.nombres,
        fecha: e.fecha_entrega,
        operador: e.operador?.name,
        observacion: e.observacion || '-'
      }));
    }
    return [];
  }

  override getExportColumns(): CrudExportColumn[] {
    if (this.activeTab === 'ciudadanos') {
      return [
        { key: 'dni', label: 'DNI' },
        { key: 'nombres', label: 'Apellidos y Nombres' },
        { key: 'sexo', label: 'Sexo' },
        { key: 'edad', label: 'Edad' },
        { key: 'sector', label: 'Sector' },
        { key: 'organizaciones', label: 'Organizaciones' },
        { key: 'discapacidad', label: 'Disc.' },
        { key: 'direccion', label: 'Dirección' }
      ];
    }
    if (this.activeTab === 'eventos') {
      return [
        { key: 'dni', label: 'DNI' },
        { key: 'ciudadano', label: 'Ciudadano' },
        { key: 'fecha', label: 'Fecha' },
        { key: 'operador', label: 'Operador' },
        { key: 'observacion', label: 'Obs.' }
      ];
    }
    return [];
  }

  override getExportTitle(): string {
    const titles: any = {
      'ciudadanos': 'Reporte de Ciudadanos',
      'eventos': 'Reporte de Entregas por Evento',
      'vulnerables': 'Grupos Vulnerables',
      'cobertura': 'Cobertura por Sector',
      'demografico': 'Estadísticas Demográficas',
      'resumen': 'Resumen de Padrón'
    };
    return titles[this.activeTab] || 'Reporte de Censo';
  }

  override getExportFilename(): string {
    return `reporte-censo-${this.activeTab}`;
  }

  override onExportExcel() {
    if (['resumen', 'vulnerables', 'cobertura', 'demografico'].includes(this.activeTab)) {
      // Podríamos migrar estos también, pero por ahora permitimos los que son listas
      this.toast.info('Use los botones de exportación específicos para indicadores');
      return;
    }
    super.onExportExcel();
  }

  override onExportPdf() {
    if (['resumen', 'vulnerables', 'cobertura', 'demografico'].includes(this.activeTab)) {
      this.toast.info('Use los botones de exportación específicos para indicadores');
      return;
    }
    super.onExportPdf();
  }

  // Métodos antiguos para PDF/Excel de indicadores (mantener por compatibilidad si se desea)
  exportarPDF(tab: string) {
    if (tab === 'ciudadanos' || tab === 'eventos') { this.onExportPdf(); return; }
    // Aquí iría la lógica antigua si se prefiere mantener el formato personalizado de indicadores
    this.toast.info('Generando vista de impresión...');
    window.print();
  }

  exportarExcel(tab: string) {
    if (tab === 'ciudadanos' || tab === 'eventos') { this.onExportExcel(); return; }
    this.toast.info('Exportación de indicadores a Excel en desarrollo...');
  }
}
