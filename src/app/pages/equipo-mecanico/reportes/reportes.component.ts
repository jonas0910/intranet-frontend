import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var $: any;

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit {
  private baseUrl = `${environment.apiUrl}/equipo-mecanico`;

  reporteSeleccionado: string = 'estadisticas';
  datosReporte: any = null;
  cargando = false;
  isFiltersCollapsed = false;

  subtitleItems = [
    { label: 'Reportes Estadísticos', icon: 'fas fa-chart-bar' },
    { label: 'Reportes Detallados', icon: 'fas fa-file-alt' }
  ];

  // Filtros
  filtros = {
    fecha_desde: '',
    fecha_hasta: '',
    estado: '',
    tipo: '',
    equipo_id: '',
    activas: false
  };

  // Datos para filtros
  equipos: any[] = [];

  constructor(
    private http: HttpClient,
    private dsService: DesignSystemService
  ) { }

  /** Configuración CRUD */
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('equipo-mecanico');
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('equipo-mecanico');
    this.cargarEquipos();
  }

  cargarEquipos(): void {
    this.http.get<any>(`${this.baseUrl}/equipos`, { withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.equipos = response.data.data || response.data;
        }
      }
    });
  }

  onReporteChange(nuevoReporte: string): void {
    this.reporteSeleccionado = nuevoReporte;
    this.limpiarFiltros();
  }

  generarReporte(): void {
    if (!this.reporteSeleccionado) return;

    // Destruir tabla antes de limpiar para evitar conflictos
    if ($.fn.DataTable.isDataTable('#tablaReporte')) {
      $('#tablaReporte').DataTable().destroy();
    }

    this.cargando = true;
    this.datosReporte = null; // Forzar limpieza para que Angular refresque el *ngFor

    const endpoint = `${this.baseUrl}/reportes/${this.getEndpointReporte()}`;

    this.http.get<any>(endpoint, { params: this.getParams(), withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success) {
          this.datosReporte = response.data;
          this.initDataTable();
        }
        this.cargando = false;
      },
      error: (err) => {
        this.cargando = false;
        console.error('Error:', err);
        alert('Error al generar el reporte: ' + (err.error?.message || 'Contacte al administrador'));
      }
    });
  }

  getEndpointReporte(): string {
    const endpoints: { [key: string]: string } = {
      'estadisticas': 'estadisticas',
      'estado-equipos': 'estado-equipos',
      'mantenimientos': 'mantenimientos',
      'horas-trabajo': 'horas-trabajo',
      'utilizacion-equipos': 'utilizacion-equipos',
      'asignaciones': 'asignaciones'
    };
    return endpoints[this.reporteSeleccionado] || 'estadisticas';
  }

  getParams(): any {
    const params: any = {};

    if (this.filtros.fecha_desde) params.fecha_desde = this.filtros.fecha_desde;
    if (this.filtros.fecha_hasta) params.fecha_hasta = this.filtros.fecha_hasta;
    if (this.filtros.estado) params.estado = this.filtros.estado;
    if (this.filtros.tipo) params.tipo = this.filtros.tipo;
    if (this.filtros.equipo_id) params.equipo_id = this.filtros.equipo_id;
    if (this.filtros.activas) params.activas = '1';

    return params;
  }

  limpiarFiltros(): void {
    this.filtros = {
      fecha_desde: '',
      fecha_hasta: '',
      estado: '',
      tipo: '',
      equipo_id: '',
      activas: false
    };
    this.datosReporte = null;
    if ($.fn.DataTable.isDataTable('#tablaReporte')) {
      $('#tablaReporte').DataTable().destroy();
    }
  }

  initDataTable(): void {
    // Aumentamos el tiempo para asegurar que el *ngFor termine el renderizado
    setTimeout(() => {
      if ($.fn.DataTable.isDataTable('#tablaReporte')) {
        $('#tablaReporte').DataTable().destroy();
      }

      $('#tablaReporte').DataTable({
        language: {
          url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json'
        },
        pageLength: 25,
        responsive: true,
        destroy: true, // Forzar destrucción de instancia previa
        dom: 'Bfrtip',
        buttons: [
          {
            extend: 'excel',
            text: '<i class="fas fa-file-excel"></i> Excel',
            className: 'btn btn-success btn-sm'
          },
          {
            extend: 'pdf',
            text: '<i class="fas fa-file-pdf"></i> PDF',
            className: 'btn btn-danger btn-sm'
          },
          {
            extend: 'print',
            text: '<i class="fas fa-print"></i> Imprimir',
            className: 'btn btn-info btn-sm'
          }
        ]
      });
    }, 300);
  }

  formatearFecha(fecha: string): string {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  }

  getBadgeClase(estado: string): string {
    switch (estado) {
      case 'operativo': return 'badge-success';
      case 'completado': return 'badge-success';
      case 'mantenimiento': return 'badge-warning';
      case 'en_proceso': return 'badge-info';
      case 'fuera_servicio': return 'badge-danger';
      case 'cancelado': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }

  obtenerMesActual(): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[new Date().getMonth()];
  }
}

