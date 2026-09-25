import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { LpMantenimientoService } from '../services/lp-mantenimiento.service';
import { LimpiezaPublicaService } from '../services/limpieza-publica.service';
import { environment } from '../../../../environments/environment';

import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';

declare var $: any;

@Component({
  selector: 'app-lp-lista-mantenimientos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-mantenimientos.component.html',
  styleUrls: ['./lista-mantenimientos.component.scss']
})
export class LpListaMantenimientosComponent implements OnInit, AfterViewInit {
  Math = Math;
  mantenimientos: any[] = [];
  vehiculos: any[] = [];
  tiposMantenimientoPreventivo: any[] = [];
  loading = false;
  isFiltersCollapsed = true;
  dataTable: any;

  subtitleItems = [
    { label: 'Control y registro de mantenimiento de flota vehicular', icon: 'fas fa-tools' }
  ];

  filtros: any = {
    search: '',
    equipo_id: '',
    tipo: '',
    estado: '',
    per_page: 15,
    page: 1
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15
  };

  mantenimientoForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  mantenimientoSeleccionado: any = null;
  submitting = false;

  constructor(
    private mntService: LpMantenimientoService,
    private lpService: LimpiezaPublicaService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {
    this.mantenimientoForm = this.fb.group({
      id: [null],
      equipo_id: [null, Validators.required],
      tipo: ['preventivo', Validators.required],
      fecha_programada: ['', Validators.required],
      fecha_inicio: [''],
      fecha_cierre: [''],
      odometro: [null],
      horas_motor: [null],
      descripcion: ['', Validators.required],
      estado: ['programado', Validators.required],
      responsable: [''],
      costo_estimado: [null, [Validators.min(0)]],
      costo_real: [null, [Validators.min(0)]],
      observaciones: [''],
      detalles: this.fb.array([])
    });
  }

  get detalles(): FormArray {
    return this.mantenimientoForm.get('detalles') as FormArray;
  }

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('limpieza-publica');
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.cargarMantenimientos();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.cargarMantenimientos();
    }
  }

  limpiarFiltros(): void {
    this.filtros = { search: '', equipo_id: '', tipo: '', estado: '', per_page: 15, page: 1 };
    this.cargarMantenimientos();
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;
    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1); pages.push(last);
      } else if (current >= last - 2) {
        pages.push(1); pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        pages.push(1); pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1); pages.push(last);
      }
    }
    return pages;
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('limpieza-publica');
    this.cargarTiposPreventivos();
  }

  cargarTiposPreventivos(): void {
    this.mntService.obtenerTiposActivos().subscribe(res => {
      if (res.success && res.data) {
        this.tiposMantenimientoPreventivo = res.data.data || res.data;
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.cargarVehiculos();
      this.cargarMantenimientos();
    }, 100);
  }

  getFechaHoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  initDataTable(): void {
    if (!$ || typeof ($ as any).fn.DataTable === 'undefined') return;
    if ($('#lpMantenimientosTable').length === 0) return;
    if (this.dataTable) this.dataTable.destroy();

    this.dataTable = $('#lpMantenimientosTable').DataTable({
      data: this.mantenimientos,
      columns: [
        { data: 'id', title: 'ID', width: '50px' },
        {
          data: 'fecha_programada', title: 'Fecha Prog.',
          render: (data: string) => {
            if (!data) return '-';
            try { return new Date(data).toLocaleDateString('es-PE'); } catch { return data; }
          }
        },
        {
          data: null, title: 'Vehículo',
          render: (data: any) => {
            if (data.equipo) {
              const codigo = data.equipo.codigo_interno || data.equipo.placa || '-';
              const tipo = data.equipo.tipo || '';
              return `<strong>${codigo}</strong><br><small class="text-muted">${tipo}</small>`;
            }
            return 'Vehículo #' + data.equipo_id;
          }
        },
        {
          data: 'tipo', title: 'Tipo',
          render: (data: string) => {
            if (!data) return '-';
            const cls = data === 'preventivo' ? 'info' : (data === 'correctivo' ? 'warning' : 'primary');
            const icon = data === 'preventivo' ? 'calendar-check' : 'wrench';
            return `<span class="badge badge-${cls}"><i class="fas fa-${icon}"></i> ${data.charAt(0).toUpperCase() + data.slice(1)}</span>`;
          }
        },
        {
          data: 'descripcion', title: 'Descripción',
          render: (data: string) => data ? (data.length > 50 ? data.substring(0, 50) + '...' : data) : '-'
        },
        {
          data: 'estado', title: 'Estado',
          render: (data: string) => {
            const m: any = {
              'programado': '<span class="badge badge-secondary"><i class="fas fa-clock"></i> Programado</span>',
              'en_proceso': '<span class="badge badge-info"><i class="fas fa-cog fa-spin"></i> En Proceso</span>',
              'cerrado': '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Cerrado</span>',
              'cancelado': '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Cancelado</span>'
            };
            return m[data] || data;
          }
        },
        {
          data: null, title: 'Costos',
          render: (data: any) => {
            const est = parseFloat(data.costo_estimado);
            const real = parseFloat(data.costo_real);
            return `<small><strong>Est:</strong> ${!isNaN(est) ? 'S/ ' + est.toFixed(2) : '-'}<br><strong>Real:</strong> ${!isNaN(real) ? 'S/ ' + real.toFixed(2) : '-'}</small>`;
          }
        },
        {
          data: null, title: 'Acciones', orderable: false,
          render: (data: any) => {
            let b = `<div class="btn-group btn-group-sm">`;
            b += `<button class="btn btn-info btn-view" data-id="${data.id}" title="Ver"><i class="fas fa-eye"></i></button>`;
            if (data.estado !== 'cerrado' && data.estado !== 'cancelado')
              b += `<button class="btn btn-warning btn-edit" data-id="${data.id}" title="Editar"><i class="fas fa-edit"></i></button>`;
            if (data.estado === 'en_proceso')
              b += `<button class="btn btn-success btn-complete" data-id="${data.id}" title="Completar"><i class="fas fa-check"></i></button>`;
            if (data.estado === 'programado')
              b += `<button class="btn btn-danger btn-delete" data-id="${data.id}" title="Eliminar"><i class="fas fa-trash"></i></button>`;
            b += `</div>`;
            return b;
          }
        }
      ],
      language: {
        emptyTable: 'No hay mantenimientos registrados',
        info: 'Mostrando _START_ a _END_ de _TOTAL_ mantenimientos',
        search: 'Buscar:', lengthMenu: 'Mostrar _MENU_',
        paginate: { first: '«', last: '»', next: '›', previous: '‹' }
      },
      responsive: true, lengthChange: true, autoWidth: false, pageLength: 15,
      dom: "<'row'<'col-sm-12 col-md-6'l><'col-sm-12 col-md-6'f>><'row'<'col-sm-12'tr>><'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      order: [[0, 'desc']]
    });

    $('#lpMantenimientosTable').on('click', '.btn-view', (e: any) => this.verMantenimiento($(e.currentTarget).data('id')));
    $('#lpMantenimientosTable').on('click', '.btn-edit', (e: any) => this.editarMantenimiento($(e.currentTarget).data('id')));
    $('#lpMantenimientosTable').on('click', '.btn-complete', (e: any) => this.completarMantenimiento($(e.currentTarget).data('id')));
    $('#lpMantenimientosTable').on('click', '.btn-delete', (e: any) => this.confirmarEliminar($(e.currentTarget).data('id')));
  }

  cargarVehiculos(): void {
    this.lpService.getVehiculos().subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.vehiculos = Array.isArray(res.data) ? res.data : (res.data.data || []);
        }
      }
    });
  }

  cargarMantenimientos(): void {
    this.loading = true;
    this.mntService.listarMantenimientos(this.filtros, this.filtros.per_page).subscribe({
      next: (response: any) => {
        if (response.success && response.data) {
          const rawData = response.data;
          if (rawData.data && Array.isArray(rawData.data)) {
            this.mantenimientos = rawData.data;
            this.paginacion = { currentPage: rawData.current_page, lastPage: rawData.last_page, total: rawData.total, perPage: rawData.per_page };
          } else {
            this.mantenimientos = Array.isArray(rawData) ? rawData : [];
            this.paginacion.total = this.mantenimientos.length;
          }
          this.loading = false;
          setTimeout(() => {
            if (this.dataTable && $.fn.DataTable.isDataTable('#lpMantenimientosTable')) {
              this.dataTable.clear(); this.dataTable.rows.add(this.mantenimientos); this.dataTable.draw(false);
            } else { this.initDataTable(); }
          }, 50);
        } else { this.loading = false; }
      },
      error: () => { this.loading = false; }
    });
  }

  crearDetalleFormGroup(detalle?: any): FormGroup {
    return this.fb.group({
      id: [detalle?.id || null],
      descripcion: [detalle?.descripcion || '', Validators.required],
      mano_obra_horas: [detalle?.mano_obra_horas || 0, [Validators.required, Validators.min(0)]],
      mano_obra_costo: [detalle?.mano_obra_costo || 0, [Validators.required, Validators.min(0)]],
      repuestos_costo: [detalle?.repuestos_costo || 0, [Validators.min(0)]]
    });
  }

  agregarDetalle(): void { this.detalles.push(this.crearDetalleFormGroup()); }
  eliminarDetalle(i: number): void { this.detalles.removeAt(i); }

  cargarDetalles(detalles: any[]): void {
    this.detalles.clear();
    (detalles || []).forEach(d => this.detalles.push(this.crearDetalleFormGroup(d)));
  }

  calcularTotalDetalle(i: number): number {
    const d = this.detalles.at(i);
    return parseFloat(d.get('mano_obra_costo')?.value || 0) + parseFloat(d.get('repuestos_costo')?.value || 0);
  }

  calcularTotalGeneral(): number {
    let t = 0;
    for (let i = 0; i < this.detalles.length; i++) t += this.calcularTotalDetalle(i);
    return t;
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.mantenimientoSeleccionado = null;
    this.mantenimientoForm.enable();
    this.mantenimientoForm.reset({ tipo: 'preventivo', estado: 'programado', fecha_programada: this.getFechaHoy() });
    this.detalles.clear();
    $('#lpModalMantenimiento').modal('show');
  }

  verMantenimiento(id: number): void {
    this.mntService.obtenerMantenimiento(id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const m = res.data;
          this.modalMode = 'view';
          this.mantenimientoSeleccionado = m;
          this.mantenimientoForm.patchValue({
            ...m,
            fecha_programada: m.fecha_programada?.toString().substring(0, 10) || '',
            fecha_inicio: m.fecha_inicio?.toString().substring(0, 10) || '',
            fecha_cierre: m.fecha_cierre?.toString().substring(0, 10) || ''
          });
          this.cargarDetalles(m.detalles || []);
          this.mantenimientoForm.disable();
          $('#lpModalMantenimiento').modal('show');
        }
      },
      error: () => this.toast.error('Error al cargar detalle', 'Error')
    });
  }

  editarMantenimiento(id: number): void {
    this.mntService.obtenerMantenimiento(id).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          const m = res.data;
          this.modalMode = 'edit';
          this.mantenimientoSeleccionado = m;
          this.mantenimientoForm.enable();
          this.mantenimientoForm.patchValue({
            ...m,
            fecha_programada: m.fecha_programada?.toString().substring(0, 10) || '',
            fecha_inicio: m.fecha_inicio?.toString().substring(0, 10) || '',
            fecha_cierre: m.fecha_cierre?.toString().substring(0, 10) || ''
          });
          this.cargarDetalles(m.detalles || []);
          $('#lpModalMantenimiento').modal('show');
        }
      },
      error: () => this.toast.error('Error al cargar mantenimiento', 'Error')
    });
  }

  completarMantenimiento(id: number): void {
    const costoStr = prompt('Ingrese el costo real del mantenimiento (S/):', '0');
    if (costoStr === null) return;
    const obs = prompt('Observaciones finales (opcional):', '') || '';
    this.mntService.completarMantenimiento(id, { costo_real: parseFloat(costoStr) || 0, observaciones: obs }).subscribe({
      next: () => { this.toast.success('Mantenimiento completado', 'Éxito'); this.cargarMantenimientos(); },
      error: () => this.toast.error('Error al completar', 'Error')
    });
  }

  confirmarEliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este mantenimiento?')) {
      this.mntService.eliminarMantenimiento(id).subscribe({
        next: () => { this.toast.success('Eliminado', 'Éxito'); this.cargarMantenimientos(); },
        error: () => this.toast.error('Error al eliminar', 'Error')
      });
    }
  }

  guardarMantenimiento(): void {
    if (this.mantenimientoForm.invalid) {
      Object.keys(this.mantenimientoForm.controls).forEach(k => this.mantenimientoForm.get(k)?.markAsTouched());
      return;
    }
    this.submitting = true;
    const datos = this.mantenimientoForm.value;
    const op = this.modalMode === 'create'
      ? this.mntService.crearMantenimiento(datos)
      : this.mntService.actualizarMantenimiento(datos.id, datos);

    op.subscribe({
      next: () => {
        this.toast.success(`Mantenimiento ${this.modalMode === 'create' ? 'creado' : 'actualizado'}`, 'Éxito');
        this.cerrarModal();
        this.cargarMantenimientos();
      },
      error: () => { this.toast.error('Error al guardar', 'Error'); this.submitting = false; }
    });
  }

  cerrarModal(): void {
    $('#lpModalMantenimiento').modal('hide');
    this.submitting = false;
    this.mantenimientoForm.reset();
    this.detalles.clear();
  }
}
