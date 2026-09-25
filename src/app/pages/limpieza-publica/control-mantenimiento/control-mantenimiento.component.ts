import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { NgbModalModule, NgbModal, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { LpMantenimientoService } from '../services/lp-mantenimiento.service';

declare var $: any;

@Component({
  selector: 'app-lp-control-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, NgbDatepickerModule, SystemLayoutComponent],
  templateUrl: './control-mantenimiento.component.html',
  styleUrls: ['./control-mantenimiento.component.scss']
})
export class LpControlMantenimientoComponent implements OnInit, AfterViewInit {
  controles: any[] = [];
  alertas: any[] = [];
  estadisticas: any = { total: 0, pendientes: 0, proximos: 0, vencidos: 0, realizados: 0, alertas_rojas: 0, alertas_amarillas: 0, alertas_verdes: 0 };
  vehiculos: any[] = [];
  tiposMantenimiento: any[] = [];
  mantenimientosDisponibles: any[] = [];

  vistaActual: 'alertas' | 'controles' = 'alertas';
  cargando = false;
  filtroAlertas = '';

  subtitleItems = [{ label: 'Alertas de mantenimiento', icon: 'fas fa-tools' }];

  controlSeleccionado: any = null;
  modalRef: any;

  fechaRealizacion: string = '';
  kilometrajeRealizacion: number | null = null;
  horometroRealizacion: number | null = null;
  mantenimientoIdSeleccionado: number | null = null;

  nuevaFecha: string = '';
  nuevoKilometraje: number | null = null;
  nuevoHorometro: number | null = null;
  motivoReprogramacion: string = '';

  Math = Math;
  private dataTable: any;

  filtroEquipoId: number | null = null;
  paginaActual = 1;
  totalRegistros = 0;
  porPagina = 25;
  totalPaginas = 1;

  constructor(
    private http: HttpClient,
    private modalService: NgbModal,
    private router: Router,
    private toast: ToastService,
    private lpService: LimpiezaPublicaService,
    private mntService: LpMantenimientoService
  ) {}

  ngOnInit(): void { this.cargarDatos(); }
  ngAfterViewInit(): void { setTimeout(() => this.initDataTable(), 500); }

  cargarDatos(): void {
    this.cargando = true;
    Promise.all([
      this.cargarAlertas(),
      this.cargarEstadisticas(),
      this.cargarVehiculos(),
      this.cargarTiposMantenimiento()
    ]).finally(() => this.cargando = false);
  }

  get alertasFiltradas(): any[] {
    if (!this.filtroAlertas.trim()) return this.alertas;
    const busqueda = this.filtroAlertas.toLowerCase().trim();
    return this.alertas.filter(a => {
      const codigo = (a.equipo?.codigo_interno || '').toLowerCase();
      const placa = (a.equipo?.placa || '').toLowerCase();
      const mantenimiento = (a.tipo_mantenimiento?.nombre || a.tipoMantenimiento?.nombre || '').toLowerCase();
      return codigo.includes(busqueda) || placa.includes(busqueda) || mantenimiento.includes(busqueda);
    });
  }

  cargarAlertas(): Promise<void> {
    return new Promise((resolve) => {
      this.mntService.obtenerAlertas().subscribe({
        next: (response: any) => {
          if (response.success) {
            this.alertas = (response.data || []).map((a: any) => ({ ...a, tipo_mantenimiento: a.tipo_mantenimiento || a.tipoMantenimiento }));
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cargarControles(pagina: number = 1): void {
    this.paginaActual = pagina;
    this.cargando = true;
    let filtros: any = { page: pagina, per_page: this.porPagina };
    if (this.filtroEquipoId) filtros.equipo_id = this.filtroEquipoId;

    this.mntService.listarControles(filtros, this.porPagina).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const data = response.data;
          const rawData = data.data || data;
          this.controles = (Array.isArray(rawData) ? rawData : []).map((c: any) => ({
            ...c, tipo_mantenimiento: c.tipo_mantenimiento || c.tipoMantenimiento
          }));
          this.totalRegistros = data.total || this.controles.length;
          this.totalPaginas = data.last_page || 1;
        }
        this.cargando = false;
      },
      error: () => this.cargando = false
    });
  }

  cargarEstadisticas(): Promise<void> {
    return new Promise((resolve) => {
      this.mntService.obtenerEstadisticasControles().subscribe({
        next: (response: any) => {
          if (response.success && response.data) this.estadisticas = response.data;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cargarVehiculos(): Promise<void> {
    return new Promise((resolve) => {
      this.lpService.getVehiculos().subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
             this.vehiculos = Array.isArray(res.data) ? res.data : (res.data.data || []);
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cargarTiposMantenimiento(): Promise<void> {
    return new Promise((resolve) => {
      this.mntService.obtenerTiposActivos().subscribe({
        next: (response: any) => {
          if (response.success && response.data) this.tiposMantenimiento = response.data;
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  cambiarVista(vista: 'alertas' | 'controles'): void {
    this.vistaActual = vista;
    if (vista === 'controles' && this.controles.length === 0) this.cargarControles();
  }

  initDataTable(): void {
    if (this.vistaActual !== 'controles') return;
    if ($.fn.DataTable.isDataTable('#tablaLpControles')) {
      $('#tablaLpControles').DataTable().destroy();
    }
    this.dataTable = $('#tablaLpControles').DataTable({
      language: { url: '//cdn.datatables.net/plug-ins/1.13.7/i18n/es-ES.json' },
      order: [[6, 'asc']], pageLength: 25, responsive: true, dom: 'Bfrtip',
      buttons: [
        { extend: 'excel', text: '<i class="fas fa-file-excel"></i> Excel', className: 'btn btn-success btn-sm' },
        { extend: 'pdf', text: '<i class="fas fa-file-pdf"></i> PDF', className: 'btn btn-danger btn-sm' }
      ]
    });
  }

  marcarRealizado(control: any, content?: any): void {
    this.controlSeleccionado = control;
    this.fechaRealizacion = '';
    this.kilometrajeRealizacion = null;
    this.horometroRealizacion = null;
    this.mantenimientoIdSeleccionado = null;
    this.mantenimientosDisponibles = [];

    this.cargarMantenimientosEquipo(control.equipo_id);

    if (content) {
      this.modalRef = this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
    } else {
      if (confirm(`¿Desea registrar un nuevo mantenimiento para atender esta alerta?`)) {
        this.router.navigate(['/limpieza-publica/mantenimientos'], {
          queryParams: { equipo_id: control.equipo_id, control_id: control.id, tipo_preventivo_id: control.tipo_mantenimiento_id, auto_create: true }
        });
      }
    }
  }

  cargarMantenimientosEquipo(equipoId: number | undefined): void {
    if (!equipoId) return;
    this.mntService.listarMantenimientos({ equipo_id: equipoId, estado: 'cerrado' }, 100).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const data = response.data.data || response.data;
          this.mantenimientosDisponibles = Array.isArray(data) ? data : [];
        }
      },
      error: () => this.mantenimientosDisponibles = []
    });
  }

  onMantenimientoChange(): void {
    if (!this.mantenimientoIdSeleccionado) {
      this.fechaRealizacion = ''; this.kilometrajeRealizacion = null; this.horometroRealizacion = null; return;
    }
    const mto = this.mantenimientosDisponibles.find(m => m.id == this.mantenimientoIdSeleccionado);
    if (mto) {
      this.fechaRealizacion = (mto.fecha_cierre || mto.fecha_inicio || '').split('T')[0];
      this.kilometrajeRealizacion = mto.odometro || null;
      this.horometroRealizacion = mto.horas_motor || null;
    }
  }

  confirmarMarcarRealizado(): void {
    if (!this.controlSeleccionado) return;
    if (!this.mantenimientoIdSeleccionado) { this.mostrarMensaje('Debe seleccionar un mantenimiento realizado', 'warning'); return; }
    
    const datos: any = {
      fecha_realizacion: this.fechaRealizacion, kilometraje: this.kilometrajeRealizacion,
      horometro: this.horometroRealizacion, mantenimiento_id: this.mantenimientoIdSeleccionado
    };

    this.mntService.marcarControlRealizado(this.controlSeleccionado.id, datos).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.mostrarMensaje('✅ Mantenimiento marcado como realizado correctamente', 'success');
          this.cargarDatos(); this.limpiarFormulario();
          if (this.modalRef) this.modalRef.close();
        } else { this.mostrarMensaje('Error: ' + response.message, 'error'); }
      },
      error: (err: any) => this.mostrarMensaje('Error al marcar mantenimiento', 'error')
    });
  }

  reprogramar(control: any, content?: any): void {
    this.controlSeleccionado = control;
    this.nuevaFecha = control.fecha_proxima ? control.fecha_proxima.split('T')[0] : '';
    this.nuevoKilometraje = control.kilometraje_proximo || null;
    this.nuevoHorometro = control.horometro_proximo || null;
    this.motivoReprogramacion = '';

    if (content) {
      this.modalRef = this.modalService.open(content, { size: 'lg', centered: true, backdrop: 'static' });
    } else {
      const nuevaFecha = prompt('Nueva fecha (YYYY-MM-DD):', control.fecha_proxima || '');
      const motivo = prompt('Motivo de la reprogramación:');
      if (!nuevaFecha || !motivo) return;
      this.ejecutarReprogramar(control, nuevaFecha, motivo);
    }
  }

  confirmarReprogramar(): void {
    if (!this.controlSeleccionado) return;
    if (!this.nuevaFecha) { this.mostrarMensaje('Debe seleccionar una nueva fecha', 'warning'); return; }
    if (!this.motivoReprogramacion.trim()) { this.mostrarMensaje('Debe ingresar el motivo', 'warning'); return; }
    this.ejecutarReprogramar(this.controlSeleccionado, this.nuevaFecha, this.motivoReprogramacion);
    if (this.modalRef) this.modalRef.close();
  }

  private ejecutarReprogramar(control: any, nuevaFecha: string, motivo: string): void {
    // Implementar en backend si se requiere, por ahora se actualiza el control normal
    const datos = {
        fecha_proxima: nuevaFecha,
        kilometraje_proximo: this.nuevoKilometraje,
        horometro_proximo: this.nuevoHorometro,
        observaciones: (control.observaciones ? control.observaciones + '\n' : '') + 'Reprogramado. Motivo: ' + motivo
    };
    this.mntService.actualizarControl(control.id, datos).subscribe({
        next: (response: any) => {
            if (response.success) {
                this.mostrarMensaje('✅ Mantenimiento reprogramado', 'success');
                this.cargarDatos(); this.limpiarFormulario();
            }
        },
        error: () => this.mostrarMensaje('Error al reprogramar', 'error')
    });
  }

  private limpiarFormulario(): void {
    this.controlSeleccionado = null; this.fechaRealizacion = ''; this.kilometrajeRealizacion = null;
    this.horometroRealizacion = null; this.mantenimientoIdSeleccionado = null; this.mantenimientosDisponibles = [];
    this.nuevaFecha = ''; this.nuevoKilometraje = null; this.nuevoHorometro = null; this.motivoReprogramacion = '';
  }

  generarControlesEquipo(equipoId: number): void {
    if (!confirm('¿Generar controles obligatorios para este equipo?')) return;
    this.mntService.generarControlesParaVehiculo(equipoId).subscribe({
      next: (response: any) => {
        if (response.success) {
          const gen = response.data?.generados || 0;
          this.mostrarMensaje(`${gen} controles generados`, 'success'); this.cargarDatos();
        }
      },
      error: () => this.mostrarMensaje('Error al generar controles', 'error')
    });
  }

  actualizarEstados(): void {
    this.mostrarMensaje('Estados de alerta verificados automáticamentente al cargar.', 'info');
  }

  getBadgeClaseAlerta(nivel: string): string {
    switch (nivel) { case 'rojo': return 'badge-danger'; case 'amarillo': return 'badge-warning'; case 'verde': return 'badge-success'; default: return 'badge-secondary'; }
  }
  getBadgeClaseEstado(estado: string): string {
    switch (estado) { case 'vencido': return 'badge-danger'; case 'proximo': return 'badge-warning'; case 'pendiente': return 'badge-info'; case 'realizado': return 'badge-success'; default: return 'badge-secondary'; }
  }
  getBadgeCriticidad(criticidad: string): string {
    switch (criticidad) { case 'critica': return 'badge-danger'; case 'alta': return 'badge-warning'; case 'media': return 'badge-info'; case 'baja': return 'badge-secondary'; default: return 'badge-secondary'; }
  }
  getIconoAlerta(nivel: string): string {
    switch (nivel) { case 'rojo': return 'fas fa-exclamation-triangle'; case 'amarillo': return 'fas fa-exclamation-circle'; case 'verde': return 'fas fa-info-circle'; default: return 'fas fa-check-circle'; }
  }
  formatearFecha(fecha: string | undefined): string { return fecha ? new Date(fecha).toLocaleDateString('es-ES') : '-'; }
  formatearNumero(num: number | undefined): string { return num == null ? '-' : num.toLocaleString('es-ES', { maximumFractionDigits: 2 }); }
  mostrarMensaje(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info'): void {
    switch (tipo) { case 'success': this.toast.success(mensaje, 'Éxito'); break; case 'error': this.toast.error(mensaje, 'Error'); break; case 'warning': this.toast.warning(mensaje, 'Atención'); break; case 'info': this.toast.info(mensaje, 'Info'); break; }
  }
}
