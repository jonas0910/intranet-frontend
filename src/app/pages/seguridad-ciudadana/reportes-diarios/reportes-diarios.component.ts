import { Component, OnInit, OnDestroy, AfterViewInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';

import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';

@Component({
  selector: 'app-reportes-diarios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DataTablesModule, SystemLayoutComponent],
  templateUrl: './reportes-diarios.component.html',
  styleUrls: ['./reportes-diarios.component.scss'],
  styles: [`
    .ds-crud-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; color: #6c757d; display: block; margin-bottom: 2px; }
    .ds-crud-filter { border-radius: 4px; border: 1px solid #ced4da; }
    .transition-all { transition: all 0.3s ease-in-out; }
    .badge-info-light { background-color: #f0f7ff; color: #004085; border: 1px solid #cce5ff; }
    .badge-success-light { background-color: #f0fff4; color: #155724; border: 1px solid #c3e6cb; }
    .badge-warning-light { background-color: #fffdf0; color: #856404; border: 1px solid #ffeeba; }
    .badge-danger-light { background-color: #fff5f5; color: #721c24; border: 1px solid #f5c6cb; }
    .bg-white-10 { background: rgba(0,0,0,0.02); }
    .bg-light-gray { background: #f8f9fa; }
    .italic { font-style: italic; }
    .report-icon { width: 32px; height: 32px; background: #f1f3f5; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .icon-circle { width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
    .table thead th { border-top: none !important; border-bottom: 2px solid #e9ecef !important; color: #495057; font-weight: 700; }
    .table td { vertical-align: middle !important; border-top: 1px solid #f1f3f5 !important; }
    .transition { transition: transform 0.2s; }
    .transition:hover { background-color: rgba(26, 35, 126, 0.02) !important; }
  `]
})
export class ReportesDiariosComponent implements OnInit, OnDestroy, AfterViewInit {
  subtitleItems = [
    { label: 'Reportes Detallados', icon: 'fas fa-file-alt' }
  ];
  private destroy$ = new Subject<void>();

  reportes: any[] = [];
  loading = false;

  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  showModalDetalle = false;
  showModalAprobar = false;
  showModalObservar = false;
  showModalEditarObservaciones = false;

  reporteSeleccionado: any = null;
  observacionesRevision = '';

  // Para editar observaciones del reporte
  observacionesOperativas = '';
  incidentesRelevantes = '';
  accionesPreventivas = '';

  // Para generar nuevo reporte
  fechaReporte = new Date().toISOString().split('T')[0];
  fechaMaxima = new Date().toISOString().split('T')[0]; // Fecha máxima = hoy
  generandoReporte = false;

  // Flag para controlar si DataTables ya fue inicializado
  private dtInitialized = false;
  isFiltersCollapsed = false;

  // Servicios
  private ds = inject(DesignSystemService);
  private toast = inject(ToastService);

  get cv(): CrudViewConfig {
    return {
      ...this.ds.getCrudViewFor('global'),
      newBtnClass: 'btn-primary',
      viewBtnClass: 'btn-info',
      editBtnClass: 'btn-warning',
      deleteBtnClass: 'btn-danger',
      excelBtnClass: 'btn-success',
      pdfBtnClass: 'btn-danger',
      printBtnClass: 'btn-info',
      statusActiveClass: 'badge-success',
      statusInactiveClass: 'badge-secondary',
      cardOutlineColor: 'card-primary'
    };
  }
  get mc() {
    return {
      ...this.ds.getModalCrudFor('global'),
      headerBg: '#007bff'
    };
  }

  constructor(private http: HttpClient, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.inicializarDataTable();
    this.cargarReportes();
    this.dtInitialized = false;
  }

  ngAfterViewInit(): void {
    // No trigger here to avoid "no data" message before HTTP completes
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.dtTrigger.unsubscribe();
  }

  inicializarDataTable(): void {
    this.dtOptions = {
      pageLength: 25,
      lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
      order: [[0, 'desc']],
      searching: true,
      paging: true,
      info: true,
      ordering: true,
      responsive: true,
      dom: 'rt<"d-flex justify-content-between align-items-center p-2"ip>',
      language: {
        processing: "Procesando...",
        lengthMenu: "Mostrar _MENU_ reportes",
        zeroRecords: "No se encontraron reportes",
        emptyTable: "No hay reportes generados",
        info: "Mostrando _START_ a _END_ de _TOTAL_",
        infoEmpty: "0 a 0 de 0",
        infoFiltered: "(filtrado de _MAX_)",
        search: "Buscar:",
        paginate: { first: "«", last: "»", next: "›", previous: "‹" }
      },
      columnDefs: [{ targets: [8], orderable: false, searchable: false }]
    };
  }

  cargarReportes(): void {
    this.loading = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response.success) {
          this.reportes = response.data;
          console.log(`✅ ${this.reportes.length} reportes cargados`);

          setTimeout(() => {
            if (this.dtInitialized) {
              // 1. Destruir la instancia anterior de DataTables
              const $ = (window as any).$;
              if ($ && $.fn.DataTable && $.fn.DataTable.isDataTable('#tablaReportes')) {
                $('#tablaReportes').DataTable().destroy();
              }
              // 2. Forzar a Angular a re-renderizar el *ngFor con los nuevos datos
              //    ANTES de que DataTables lea el DOM. Sin esto, la tabla aparece vacía.
              this.cdr.detectChanges();
            }
            // 3. Ahora sí, inicializar DataTables con las filas ya en el DOM
            this.dtTrigger.next(null);
            this.dtInitialized = true;
          }, 150);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error cargando reportes:', error);
        this.loading = false;
        // Solo inicializar en el primer error para no reinicializar
        if (!this.dtInitialized) {
          this.dtTrigger.next(null);
          this.dtInitialized = true;
        }
      }
    });
  }

  refrescarDataTable(): void {
    if (typeof (window as any).$ !== 'undefined' && (window as any).$.fn.DataTable) {
      setTimeout(() => {
        const table = (window as any).$('#tablaReportes');
        if (table.length && (window as any).$.fn.DataTable.isDataTable('#tablaReportes')) {
          table.DataTable().draw();
        }
      }, 100);
    }
  }

  generarReporte(): void {
    if (!this.fechaReporte) {
      this.toast.warning('Seleccione una fecha para el reporte', 'Atención');
      return;
    }

    this.generandoReporte = true;
    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes/generar`;

    this.http.post<any>(url, { fecha: this.fechaReporte }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success(`Reporte generado exitosamente para ${this.fechaReporte}`, 'Éxito');
          this.cargarReportes();
        }
        this.generandoReporte = false;
      },
      error: (error) => {
        const mensaje = error.error?.message || 'Error desconocido';
        this.toast.error(mensaje, 'Error');
        this.generandoReporte = false;
      }
    });
  }

  verDetalle(reporte: any): void {
    this.reporteSeleccionado = reporte;
    this.showModalDetalle = true;
  }

  abrirModalAprobar(reporte: any): void {
    this.reporteSeleccionado = reporte;
    this.observacionesRevision = '';
    this.showModalAprobar = true;
  }

  abrirModalObservar(reporte: any): void {
    this.reporteSeleccionado = reporte;
    this.observacionesRevision = '';
    this.showModalObservar = true;
  }

  aprobarReporte(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes/${this.reporteSeleccionado.id}/estado`;

    this.http.put<any>(url, {
      estado: 'aprobado',
      observaciones_revision: this.observacionesRevision || 'Aprobado sin observaciones'
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Reporte aprobado exitosamente', 'Éxito');
          this.cerrarModales();
          this.cargarReportes();
        }
      },
      error: (error) => this.toast.error('Error al aprobar el reporte', 'Error')
    });
  }

  observarReporte(): void {
    if (!this.observacionesRevision || this.observacionesRevision.trim().length < 10) {
      this.toast.warning('Las observaciones deben tener al menos 10 caracteres', 'Atención');
      return;
    }

    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes/${this.reporteSeleccionado.id}/estado`;

    this.http.put<any>(url, {
      estado: 'observado',
      observaciones_revision: this.observacionesRevision
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Reporte observado exitosamente', 'Éxito');
          this.cerrarModales();
          this.cargarReportes();
        }
      },
      error: (error) => this.toast.error('Error al observar el reporte', 'Error')
    });
  }

  abrirModalEditarObservaciones(reporte: any): void {
    this.reporteSeleccionado = reporte;
    this.observacionesOperativas = reporte.observaciones_operativas || '';
    this.incidentesRelevantes = reporte.incidentes_relevantes || '';
    this.accionesPreventivas = reporte.acciones_preventivas || '';
    this.showModalEditarObservaciones = true;
  }

  guardarObservaciones(): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes/${this.reporteSeleccionado.id}/observaciones`;

    this.http.put<any>(url, {
      observaciones_operativas: this.observacionesOperativas,
      incidentes_relevantes: this.incidentesRelevantes,
      acciones_preventivas: this.accionesPreventivas
    }).subscribe({
      next: (response) => {
        if (response.success) {
          this.toast.success('Observaciones guardadas exitosamente', 'Éxito');
          this.cerrarModales();
          this.cargarReportes();
        }
      },
      error: (error) => this.toast.error('Error al guardar observaciones', 'Error')
    });
  }

  exportarPDF(reporte: any): void {
    const url = `${environment.apiUrl}/seguridad-ciudadana/reportes/${reporte.id}/pdf`;

    this.http.get<any>(url).subscribe({
      next: (response) => {
        if (response.success) {
          // Crear ventana de impresión
          const ventana = window.open('', '_blank');
          if (ventana) {
            ventana.document.write(response.data.html);
            ventana.document.close();
            setTimeout(() => {
              ventana.print();
            }, 500);
          }
        }
      },
      error: (error) => this.toast.error('Error al generar el PDF', 'Error')
    });
  }

  cerrarModales(): void {
    this.showModalDetalle = false;
    this.showModalAprobar = false;
    this.showModalObservar = false;
    this.showModalEditarObservaciones = false;
    this.reporteSeleccionado = null;
    this.observacionesRevision = '';
    this.observacionesOperativas = '';
    this.incidentesRelevantes = '';
    this.accionesPreventivas = '';
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: any = {
      'pendiente': 'badge-warning',
      'aprobado': 'badge-success',
      'observado': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }

  parsearJSON(json: string | null): any {
    if (!json) return {};
    try {
      return typeof json === 'string' ? JSON.parse(json) : json;
    } catch {
      return {};
    }
  }

  getKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }
}

