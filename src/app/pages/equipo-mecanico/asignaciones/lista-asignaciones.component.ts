import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AsignacionService, Asignacion } from '../services/asignacion.service';
import { OperadorService, Operador } from '../services/operador.service';
import { EquipoService } from '../services/equipo.service';
import { Equipo } from '../models/equipo.model';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var $: any;

@Component({
  selector: 'app-lista-asignaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-asignaciones.component.html',
  styleUrls: ['./lista-asignaciones.component.scss']
})
export class ListaAsignacionesComponent implements OnInit, AfterViewInit {
  asignaciones: Asignacion[] = [];
  equipos: Equipo[] = [];
  operadores: Operador[] = [];
  loading = false;
  dataTable: any;
  subsystem = 'equipo-mecanico';
  isFiltersCollapsed = false;

  subtitleItems = [

    { label: 'Registro y control de asignaciones', icon: 'fas fa-users-cog' },

  ];

  // Filtros
  filtros = {
    search: '',
    estado: '',
    per_page: 10
  };

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor(this.subsystem);
  }

  asignacionForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  asignacionSeleccionada: Asignacion | null = null;
  submitting = false;

  constructor(
    private asignacionService: AsignacionService,
    private equipoService: EquipoService,
    private operadorService: OperadorService,
    private fb: FormBuilder,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {
    this.asignacionForm = this.fb.group({
      id: [null],
      equipo_id: [null, Validators.required],
      operador_id: [null, Validators.required],
      fecha_inicio: [this.getFechaHoy(), Validators.required],
      fecha_fin: [''],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    console.log('🚀 ngOnInit [Asignaciones]: Iniciando componente');
    this.dsService.setActiveSubsystem(this.subsystem);
  }

  ngAfterViewInit(): void {
    console.log('🎨 ngAfterViewInit [Asignaciones]: Vista inicializada');
    setTimeout(() => {
      this.cargarEquipos();
      this.cargarOperadores();
      this.cargarAsignaciones();
    }, 100);
  }

  /** Fecha local YYYY-MM-DD (no usar toISOString: en zonas UTC−X puede ser un día distinto al calendario del usuario). */
  getFechaHoy(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  initDataTable(): void {
    console.log('🏗️ Inicializando DataTable [Asignaciones]...');

    if (this.dataTable) {
      console.log('♻️ Destruyendo DataTable existente [Asignaciones]');
      this.dataTable.destroy();
    }

    this.dataTable = $('#asignacionesTable').DataTable({
      data: this.asignaciones,
      columns: [
        {
          data: 'id',
          title: 'ID',
          width: '50px',
          visible: false
        },
        {
          data: null,
          title: 'Equipo / Maquinaria',
          render: (data: Asignacion) => {
            if (data.equipo) {
              const info = data.equipo.placa ? `<span class="badge badge-light border ml-1">${data.equipo.placa}</span>` : '';
              return `
                <div class="d-flex flex-column">
                  <div class="d-flex align-items-center">
                    <strong class="text-primary">${data.equipo.codigo_interno}</strong>
                    ${info}
                  </div>
                  <small class="text-muted text-xs">${data.equipo.marca || ''} ${data.equipo.modelo || ''}</small>
                </div>`;
            }
            return '-';
          }
        },
        {
          data: null,
          title: 'Operador Asignado',
          render: (data: Asignacion) => {
            if (data.operador) {
              const nombre = data.operador.user?.name || (`${data.operador.first_name} ${data.operador.last_name}`);
              const licencia = data.operador.license ? `<small class="badge badge-info text-xs mt-1">L: ${data.operador.license}</small>` : '';
              return `
                <div class="d-flex flex-column">
                  <strong><i class="fas fa-user-circle mr-1 text-muted"></i>${nombre}</strong>
                  ${licencia}
                </div>`;
            }
            return '-';
          }
        },
        {
          data: 'fecha_inicio',
          title: 'Vigencia',
          render: (data: string, type: any, row: Asignacion) => {
            if (!data) return '-';
            try {
              const hoy = new Date();
              hoy.setHours(0, 0, 0, 0);

              const f1 = new Date(data.substring(0, 10));
              const s1 = f1.toLocaleDateString('es-PE');
              const f2 = row.fecha_fin ? new Date(row.fecha_fin.substring(0, 10)) : null;

              // Es finalizada SOLO si tiene fecha_fin Y esa fecha ya pasó (es menor a hoy)
              const estaFinalizada = f2 && f2 < hoy;

              if (estaFinalizada) {
                const s2 = f2!.toLocaleDateString('es-PE');
                return `
                  <div class="d-flex flex-column">
                    <span class="badge badge-secondary text-xs mb-1">FINALIZADA</span>
                    <small class="text-xs">Desde: ${s1}</small>
                    <small class="text-xs text-danger">Hasta: ${s2}</small>
                  </div>`;
              } else {
                const infoFin = f2 ? `<small class="text-xs text-info">Termina: ${f2.toLocaleDateString('es-PE')}</small>` : '<small class="text-xs">Sin fecha de término</small>';
                return `
                  <div class="d-flex flex-column">
                    <span class="badge badge-success text-xs mb-1">ACTIVA</span>
                    <small class="text-xs">Desde: ${s1}</small>
                    ${infoFin}
                  </div>`;
              }
            } catch (e) {
              return data;
            }
          }
        },
        {
          data: null,
          title: 'Estado',
          className: 'text-center',
          render: (data: Asignacion) => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaFin = data.fecha_fin ? new Date(data.fecha_fin.substring(0, 10)) : null;

            if (fechaFin && fechaFin < hoy) {
              return '<span class="badge badge-pill badge-secondary">Finalizada</span>';
            } else {
              return '<span class="badge badge-pill badge-success">Activa</span>';
            }
          }
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          className: 'text-center',
          width: '120px',
          render: (data: Asignacion) => {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaFin = data.fecha_fin ? new Date(data.fecha_fin.substring(0, 10)) : null;
            const estaFinalizada = fechaFin && fechaFin < hoy;

            let buttons = `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-info btn-view" data-id="${data.id}" title="Ver Detalle">
                  <i class="fas fa-eye"></i>
                </button>
            `;

            // Solo bloquear edición si la fecha de fin YA PASÓ.
            // Si la fecha de fin es futura, aún se puede editar.
            if (!estaFinalizada) {
              buttons += `
                <button class="btn btn-warning btn-edit" data-id="${data.id}" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-delete" data-id="${data.id}" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              `;
            }

            buttons += `</div>`;
            return buttons;
          }
        }
      ],
      language: {
        url: 'assets/datatables/i18n/es-ES.json',
        search: "Buscar:",
        lengthMenu: "Mostrar _MENU_ registros",
        info: "Mostrando _START_ a _END_ de _TOTAL_ asignaciones",
        paginate: {
          first: "<<",
          last: ">>",
          next: ">",
          previous: "<"
        }
      },
      responsive: true,
      lengthChange: false,
      autoWidth: false,
      pageLength: this.cv.defaultPageSize || 10,
      dom: "<'row'<'col-sm-12'tr>>" +
        "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
      order: [[1, 'asc']]
    });

    // Eventos de botones
    $('#asignacionesTable').on('click', '.btn-view', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.verAsignacion(id);
    });

    $('#asignacionesTable').on('click', '.btn-edit', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.editarAsignacion(id);
    });

    $('#asignacionesTable').on('click', '.btn-delete', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.confirmarEliminar(id);
    });
  }

  /**
   * Solo maquinaria del departamento del usuario (API aplica global scope + tipos mecánicos).
   * No usar incluir_todos_departamentos aquí.
   */
  cargarEquipos(): void {
    this.equipoService.listarTodos().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
      },
      error: (error) => console.error('Error al cargar equipos:', error)
    });
  }

  cargarOperadores(idIncluir?: number): void {
    console.log('🔄 Cargando operadores disponibles...');
    this.operadorService.obtenerDisponibles().subscribe({
      next: (response) => {
        console.log('✅ Operadores disponibles recibidos:', response);
        if (response.success && response.data) {
          this.operadores = response.data;

          // Si estamos editando y el operador actual no está en la lista de disponibles,
          // cargamos la información del operador actual
          if (idIncluir && !this.operadores.find(o => o.id === idIncluir)) {
            this.operadorService.obtenerDetalle(idIncluir).subscribe({
              next: (opResponse) => {
                if (opResponse.success && opResponse.data) {
                  this.operadores.push(opResponse.data);
                }
              }
            });
          }
        }
      },
      error: (error) => console.error('Error al cargar operadores:', error)
    });
  }

  cargarAsignaciones(): void {
    this.loading = true;
    console.log('🔄 Cargando asignaciones...');

    this.asignacionService.listarTodos().subscribe({
      next: (asignaciones) => {
        console.log('✅ Asignaciones cargadas [todas las páginas]');

        this.asignaciones = asignaciones;

        console.log('📊 Asignaciones cargadas:', this.asignaciones.length);

        if (this.dataTable) {
          this.dataTable.clear();
          this.dataTable.rows.add(this.asignaciones);
          this.dataTable.draw();
        } else {
          setTimeout(() => {
            this.initDataTable();
          }, 50);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar asignaciones:', error);
        this.loading = false;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.asignacionSeleccionada = null;
    this.asignacionForm.enable();
    this.asignacionForm.reset({
      fecha_inicio: this.getFechaHoy()
    });
    this.cargarEquipos();
    $('#modalAsignacion').modal('show');
  }

  verAsignacion(id: number): void {
    this.asignacionService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const asignacion = response.data;
          this.modalMode = 'view';
          this.asignacionSeleccionada = asignacion;

          // Formatear fechas para los inputs
          const formData = {
            ...asignacion,
            fecha_inicio: asignacion.fecha_inicio ? asignacion.fecha_inicio.substring(0, 10) : '',
            fecha_fin: asignacion.fecha_fin ? asignacion.fecha_fin.substring(0, 10) : ''
          };

          this.asignacionForm.patchValue(formData);
          this.asignacionForm.disable();
          $('#modalAsignacion').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar la asignación', 'error');
      }
    });
  }

  editarAsignacion(id: number): void {
    this.asignacionService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const asignacion = response.data;
          this.modalMode = 'edit';
          this.asignacionSeleccionada = asignacion;
          this.asignacionForm.enable();

          // Asegurar que el operador actual esté en la lista
          if (asignacion.operador_id) {
            this.cargarOperadores(asignacion.operador_id);
          } else {
            this.cargarOperadores();
          }

          this.cargarEquipos();

          // Formatear fechas para los inputs
          const formData = {
            ...asignacion,
            fecha_inicio: asignacion.fecha_inicio ? asignacion.fecha_inicio.substring(0, 10) : '',
            fecha_fin: asignacion.fecha_fin ? asignacion.fecha_fin.substring(0, 10) : ''
          };

          this.asignacionForm.patchValue(formData);
          $('#modalAsignacion').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar la asignación', 'error');
      }
    });
  }

  finalizarAsignacion(id: number): void {
    const fechaFin = prompt('Fecha de finalización (YYYY-MM-DD):', this.getFechaHoy());
    if (!fechaFin) return;

    const observaciones = prompt('Observaciones (opcional):');

    this.asignacionService.finalizar(id, {
      fecha_fin: fechaFin,
      observaciones: observaciones
    }).subscribe({
      next: () => {
        this.showToast('Asignación finalizada exitosamente', 'success');
        this.cargarAsignaciones();
      },
      error: (error) => {
        this.showToast(error.error?.message || 'Error al finalizar asignación', 'error');
      }
    });
  }

  confirmarEliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar esta asignación?')) {
      this.asignacionService.eliminar(id).subscribe({
        next: () => {
          this.showToast('Asignación eliminada exitosamente', 'success');
          this.cargarAsignaciones();
        },
        error: (error) => {
          this.showToast(error.error?.message || 'Error al eliminar asignación', 'error');
        }
      });
    }
  }

  guardarAsignacion(): void {
    if (this.asignacionForm.invalid) {
      Object.keys(this.asignacionForm.controls).forEach(key => {
        this.asignacionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const datos = {
      ...this.asignacionForm.value,
      fecha_fin: this.asignacionForm.value.fecha_fin || null,
      observaciones: this.asignacionForm.value.observaciones || null
    };

    const operacion = this.modalMode === 'create'
      ? this.asignacionService.crear(datos)
      : this.asignacionService.actualizar(datos.id, datos);

    operacion.subscribe({
      next: () => {
        this.showToast(`Asignación ${this.modalMode === 'create' ? 'creada' : 'actualizada'} exitosamente`, 'success');
        this.cerrarModal();
        this.cargarAsignaciones();
      },
      error: (err) => {
        const msg = this.mensajeErrorApi(err, 'Error al guardar asignación');
        this.showToast(msg, 'error');
        this.submitting = false;
      }
    });
  }

  cerrarModal(): void {
    $('#modalAsignacion').modal('hide');
    this.submitting = false;
    this.asignacionForm.reset();
  }

  /** Primer mensaje de validación Laravel (422) o message genérico. */
  private mensajeErrorApi(err: any, fallback: string): string {
    const e = err?.error;
    if (e?.errors && typeof e.errors === 'object') {
      const first = Object.values(e.errors).flat()[0];
      if (typeof first === 'string') return first;
    }
    if (typeof e?.message === 'string' && e.message) return e.message;
    return fallback;
  }

  showToast(message: string, type: any = 'success'): void {
    if (type === 'error') {
      this.toast.error(message, 'Error');
    } else if (type === 'warning') {
      this.toast.warning(message, 'Advertencia');
    } else if (type === 'info') {
      this.toast.info(message, 'Información');
    } else {
      this.toast.success(message, 'Éxito');
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      estado: '',
      per_page: 10
    };
    this.onFilterChange();
  }

  onFilterChange(): void {
    if (this.dataTable) {
      this.dataTable.search(this.filtros.search).draw();

      if (this.filtros.estado !== '') {
        const estadoLabel = this.filtros.estado === 'activa' ? 'Activa' : 'Finalizada';
        this.dataTable.column(4).search(estadoLabel).draw();
      } else {
        this.dataTable.column(4).search('').draw();
      }
    }
  }
}
