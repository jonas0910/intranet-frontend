import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';
import { EquipoGpsService, AlertaGPS } from '../../services/equipo-gps.service';
import { SystemLayoutComponent } from '../../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../../services/design-system.service';
import { ToastService } from '../../../../services/toast.service';

@Component({
  selector: 'app-equipo-mecanico-alertas',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    DataTablesModule,
    SystemLayoutComponent
  ],
  templateUrl: './lista-alertas.component.html',
  styleUrls: ['./lista-alertas.component.scss']
})
export class ListaAlertasGpsComponent implements OnInit, OnDestroy {
  Math = Math;
  alertas: AlertaGPS[] = [];
  loading = false;
  isFiltersCollapsed = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  filtros: any = {
    search: '',
    estado: '',
    tipo_alerta_id: '',
    fecha_desde: new Date().toISOString().split('T')[0],
    fecha_hasta: new Date().toISOString().split('T')[0],
    per_page: 10,
    page: 1
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10
  };

  tiposAlerta: any[] = [];
  alertaParaResolver: AlertaGPS | null = null;
  observacionResolucion = '';
  guardandoResolucion = false;

  private destroy$ = new Subject<void>();

  constructor(
    private gpsService: EquipoGpsService,
    private dsService: DesignSystemService,
    private toast: ToastService,
    private modalService: NgbModal,
    private http: HttpClient
  ) {}

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('equipo-mecanico');
  }

  ngOnInit(): void {
    this.initDataTable();
    this.cargarTiposAlerta();
    this.loadAlertas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (!this.dtTrigger.closed) this.dtTrigger.complete();
  }

  initDataTable(): void {
    this.dtOptions = {
      paging: false,
      searching: false,
      info: false,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'desc']]
    };
  }

  private triggerDataTable(): void {
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        this.dtTrigger.next(null);
      });
    } else {
      setTimeout(() => this.dtTrigger.next(null), 0);
    }
  }

  cargarTiposAlerta(): void {
    this.gpsService.listarTiposAlerta().subscribe(res => {
      if (res.success) this.tiposAlerta = res.data;
    });
  }

  loadAlertas(): void {
    this.loading = true;
    this.gpsService.listarAlertas(this.filtros).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.alertas = res.data || [];
          // Update pagination if the API returns paginated data (not the case here by default from service but let's be robust)
          this.paginacion.total = this.alertas.length; 
          this.loading = false;
          this.triggerDataTable();
        } else {
          this.loading = false;
        }
      },
      error: () => this.loading = false
    });
  }

  onFilterChange(): void {
    this.loadAlertas();
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      estado: '',
      tipo_alerta_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      per_page: 10,
      page: 1
    };
    this.loadAlertas();
  }

  verDetalle(a: AlertaGPS, modal: any): void {
    this.alertaParaResolver = a;
    this.observacionResolucion = a.observaciones || '';
    this.modalService.open(modal, { centered: true, size: 'lg' });
  }

  resolverAlerta(): void {
    if (!this.alertaParaResolver) return;
    this.guardandoResolucion = true;
    this.gpsService.resolverAlerta(this.alertaParaResolver.id, {
      observaciones: this.observacionResolucion
    }).subscribe({
      next: (res) => {
        this.guardandoResolucion = false;
        if (res.success) {
          this.toast.success('Alerta gestionada correctamente');
          this.modalService.dismissAll();
          this.loadAlertas();
        }
      },
      error: () => this.guardandoResolucion = false
    });
  }

  getEstadoLabel(estado: string): string {
    const map: any = { 'pendiente': 'Pendiente', 'resuelta': 'Resuelta', 'rechazada': 'Rechazada' };
    return map[estado] || estado;
  }

  getEstadoClass(estado: string): string {
    const map: any = { 'pendiente': 'badge-danger', 'resuelta': 'badge-success', 'rechazada': 'badge-secondary' };
    return map[estado] || 'badge-light';
  }
}
