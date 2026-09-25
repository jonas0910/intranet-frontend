import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ValorizacionService } from '../services/valorizacion.service';
import { Valorizacion } from '../models/equipo.model';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var $: any;

@Component({
  selector: 'app-lista-valorizaciones',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-valorizaciones.component.html',
  styleUrls: ['./lista-valorizaciones.component.scss']
})
export class ListaValorizacionesComponent implements OnInit, AfterViewInit {
  Math = Math;
  valorizaciones: Valorizacion[] = [];
  loading = false;
  isFiltersCollapsed = true;
  dataTable: any;

  subtitleItems = [
    { label: 'Valorizaciones de mantenimientos y repuestos', icon: 'fas fa-truck-monster' }
  ];

  // Filtros y Paginación
  filtros: any = {
    search: '',
    periodo_desde: '',
    periodo_hasta: '',
    centro_costo_id: '',
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

  // Formularios
  valorizacionForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  valorizacionSeleccionada: Valorizacion | null = null;
  submitting = false;

  constructor(
    private valorizacionService: ValorizacionService,
    private fb: FormBuilder,
    private dsService: DesignSystemService
  ) {
    this.valorizacionForm = this.fb.group({
      id: [null],
      periodo_desde: ['', Validators.required],
      periodo_hasta: ['', Validators.required],
      centro_costo_id: [null],
      estado: ['generado', Validators.required]
    });
  }

  /** Configuración CRUD */
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('equipo-mecanico');
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.cargarValorizaciones();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.cargarValorizaciones();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      periodo_desde: '',
      periodo_hasta: '',
      centro_costo_id: '',
      estado: '',
      per_page: 15,
      page: 1
    };
    this.cargarValorizaciones();
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
        pages.push(-1);
        pages.push(last);
      } else if (current >= last - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      }
    }
    return pages;
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('equipo-mecanico');
    console.log('🚀 ngOnInit [Valorizaciones]: Iniciando componente');
  }

  ngAfterViewInit(): void {
    console.log('🎨 ngAfterViewInit [Valorizaciones]: Vista inicializada');
    setTimeout(() => {
      console.log('⏰ Cargando datos [Valorizaciones] después de que la vista esté lista...');
      this.cargarValorizaciones();
    }, 100);
  }

  getFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  initDataTable(): void {
    console.log('🏗️ Inicializando DataTable [Valorizaciones]...');
    console.log('📊 Valorizaciones disponibles:', this.valorizaciones.length);
    console.log('🔍 jQuery disponible?', typeof $ !== 'undefined');
    console.log('🔍 DataTable disponible?', typeof ($ as any)?.fn?.DataTable !== 'undefined');
    console.log('🔍 Tabla existe en DOM?', $('#valorizacionesTable').length);

    if (!$) {
      console.error('❌ jQuery no está disponible');
      return;
    }

    if (typeof ($ as any).fn.DataTable === 'undefined') {
      console.error('❌ DataTables no está disponible');
      return;
    }

    if ($('#valorizacionesTable').length === 0) {
      console.error('❌ Tabla #valorizacionesTable no encontrada en el DOM');
      return;
    }

    if (this.dataTable) {
      console.log('♻️ Destruyendo DataTable existente [Valorizaciones]');
      this.dataTable.destroy();
    }

    console.log('✅ Iniciando configuración DataTable...');
    this.dataTable = $('#valorizacionesTable').DataTable({
      data: this.valorizaciones,
      columns: [
        {
          data: 'id',
          title: 'ID',
          width: '50px'
        },
        {
          data: null,
          title: 'Período',
          render: (data: Valorizacion) => {
            const desde = new Date(data.periodo_desde).toLocaleDateString('es-PE');
            const hasta = new Date(data.periodo_hasta).toLocaleDateString('es-PE');
            return `<strong>${desde}</strong><br><small class="text-muted">hasta ${hasta}</small>`;
          }
        },
        {
          data: null,
          title: 'Centro de Costo',
          render: (data: Valorizacion) => {
            return data.centro_costo ? data.centro_costo.name : '<span class="text-muted">General</span>';
          }
        },
        {
          data: 'total_horas',
          title: 'Total Horas',
          render: (data: any) => {
            const horas = parseFloat(data) || 0;
            return `<strong>${horas.toFixed(2)}</strong> hrs`;
          }
        },
        {
          data: 'total_costo',
          title: 'Total Costo',
          render: (data: any) => {
            const costo = parseFloat(data) || 0;
            return `<strong>S/ ${costo.toFixed(2)}</strong>`;
          }
        },
        {
          data: 'estado',
          title: 'Estado',
          render: (data: string) => {
            const estados: any = {
              'generado': '<span class="badge badge-info"><i class="fas fa-file-alt"></i> Generado</span>',
              'aprobado': '<span class="badge badge-success"><i class="fas fa-check-circle"></i> Aprobado</span>',
              'rechazado': '<span class="badge badge-danger"><i class="fas fa-times-circle"></i> Rechazado</span>'
            };
            return estados[data] || data;
          }
        },
        {
          data: 'generado_en',
          title: 'Generado',
          render: (data: string) => {
            const fecha = new Date(data);
            return `<small>${fecha.toLocaleDateString('es-PE')}<br>${fecha.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })}</small>`;
          }
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          render: (data: Valorizacion) => {
            let buttons = `<div class="btn-group btn-group-sm">`;

            // Botón Ver
            buttons += `
              <button class="btn btn-info btn-view" data-id="${data.id}" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-danger btn-pdf" data-id="${data.id}" title="Exportar PDF">
                <i class="fas fa-file-pdf"></i>
              </button>
            `;

            // Botón Editar (solo si está en generado)
            if (data.estado === 'generado') {
              buttons += `
                <button class="btn btn-warning btn-edit" data-id="${data.id}" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
              `;
            }

            // Botón Aprobar (solo si está en generado)
            if (data.estado === 'generado') {
              buttons += `
                <button class="btn btn-success btn-approve" data-id="${data.id}" title="Aprobar">
                  <i class="fas fa-check"></i>
                </button>
              `;
            }

            // Botón Rechazar (solo si está en generado)
            if (data.estado === 'generado') {
              buttons += `
                <button class="btn btn-danger btn-reject" data-id="${data.id}" title="Rechazar">
                  <i class="fas fa-times"></i>
                </button>
              `;
            }

            // Botón Eliminar (solo si está en generado)
            if (data.estado === 'generado') {
              buttons += `
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
        "decimal": "",
        "emptyTable": "No hay valorizaciones registradas",
        "info": "Mostrando _START_ a _END_ de _TOTAL_ valorizaciones",
        "infoEmpty": "Mostrando 0 a 0 de 0 valorizaciones",
        "infoFiltered": "(filtrado de _MAX_ valorizaciones totales)",
        "infoPostFix": "",
        "thousands": ",",
        "lengthMenu": "Mostrar _MENU_ valorizaciones",
        "loadingRecords": "Cargando...",
        "processing": "Procesando...",
        "search": "Buscar:",
        "zeroRecords": "No se encontraron valorizaciones coincidentes",
        "paginate": {
          "first": "Primero",
          "last": "Último",
          "next": "Siguiente",
          "previous": "Anterior"
        },
        "aria": {
          "sortAscending": ": activar para ordenar la columna de manera ascendente",
          "sortDescending": ": activar para ordenar la columna de manera descendente"
        }
      },
      responsive: true,
      lengthChange: false,
      autoWidth: false,
      pageLength: this.paginacion.perPage,
      dom: "tr", // Controlamos paginación y búsqueda con Angular
      order: [[0, 'desc']]
    });

    // Eventos de botones
    $('#valorizacionesTable').on('click', '.btn-view', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.verValorizacion(id);
    });

    $('#valorizacionesTable').on('click', '.btn-edit', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.editarValorizacion(id);
    });

    $('#valorizacionesTable').on('click', '.btn-approve', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.aprobarValorizacion(id);
    });

    $('#valorizacionesTable').on('click', '.btn-reject', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.rechazarValorizacion(id);
    });

    $('#valorizacionesTable').on('click', '.btn-delete', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.confirmarEliminar(id);
    });

    $('#valorizacionesTable').on('click', '.btn-pdf', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.descargarPDF(id);
    });

    console.log('✅ DataTable inicializado correctamente [Valorizaciones]');
    console.log('📊 Filas en DataTable:', this.dataTable.rows().count());
  }

  cargarValorizaciones(): void {
    this.loading = true;
    console.log('🔄 Cargando valorizaciones...');

    this.valorizacionService.listar(this.filtros, this.filtros.per_page).subscribe({
      next: (response) => {
        console.log('✅ Respuesta recibida [Valorizaciones]:', response);

        if (response.success && response.data) {
          const rawData: any = response.data;

          if (rawData.data && Array.isArray(rawData.data)) {
            this.valorizaciones = rawData.data;
            this.paginacion = {
              currentPage: rawData.current_page,
              lastPage: rawData.last_page,
              total: rawData.total,
              perPage: rawData.per_page
            };
          } else {
            this.valorizaciones = Array.isArray(rawData) ? rawData : [];
            this.paginacion.total = this.valorizaciones.length;
          }

          console.log('📊 Valorizaciones cargadas:', this.valorizaciones.length);

          if (this.dataTable) {
            this.dataTable.clear();
            this.dataTable.rows.add(this.valorizaciones);
            this.dataTable.draw(false);
          } else {
            setTimeout(() => {
              this.initDataTable();
            }, 50);
          }
        } else {
          console.log('❌ Respuesta sin éxito o sin datos [Valorizaciones]');
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar valorizaciones:', error);
        this.loading = false;
      }
    });
  }

  abrirModalGenerar(): void {
    this.modalMode = 'create';
    this.valorizacionSeleccionada = null;
    this.valorizacionForm.enable();

    // Establecer período por defecto (mes actual)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const ultimoDia = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    this.valorizacionForm.reset({
      periodo_desde: primerDia.toISOString().split('T')[0],
      periodo_hasta: ultimoDia.toISOString().split('T')[0],
      estado: 'generado'
    });

    $('#modalValorizacion').modal('show');
  }

  verValorizacion(id: number): void {
    this.valorizacionService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.modalMode = 'view';
          this.valorizacionSeleccionada = response.data;

          const formData = {
            ...response.data,
            periodo_desde: response.data.periodo_desde ? response.data.periodo_desde.split('T')[0] : '',
            periodo_hasta: response.data.periodo_hasta ? response.data.periodo_hasta.split('T')[0] : ''
          };

          this.valorizacionForm.patchValue(formData);
          this.valorizacionForm.disable();
          $('#modalValorizacion').modal('show');
        }
      },
      error: (error) => {
        console.error('Error al obtener valorización:', error);
        this.showToast('Error al obtener valorización', 'error');
      }
    });
  }

  editarValorizacion(id: number): void {
    const valorizacion = this.valorizaciones.find(v => v.id === id);
    if (valorizacion && valorizacion.estado === 'generado') {
      this.modalMode = 'edit';
      this.valorizacionSeleccionada = valorizacion;
      this.valorizacionForm.enable();

      const formData = {
        ...valorizacion,
        periodo_desde: valorizacion.periodo_desde ? valorizacion.periodo_desde.split('T')[0] : '',
        periodo_hasta: valorizacion.periodo_hasta ? valorizacion.periodo_hasta.split('T')[0] : ''
      };

      this.valorizacionForm.patchValue(formData);
      $('#modalValorizacion').modal('show');
    }
  }

  aprobarValorizacion(id: number): void {
    if (confirm('¿Desea aprobar esta valorización? Esta acción no se puede deshacer.')) {
      this.valorizacionService.aprobar(id).subscribe({
        next: () => {
          this.showToast('Valorización aprobada exitosamente', 'success');
          this.cargarValorizaciones();
        },
        error: () => {
          this.showToast('Error al aprobar valorización', 'error');
        }
      });
    }
  }

  rechazarValorizacion(id: number): void {
    const motivo = prompt('Ingrese el motivo del rechazo:');
    if (motivo) {
      this.valorizacionService.rechazar(id, motivo).subscribe({
        next: () => {
          this.showToast('Valorización rechazada', 'success');
          this.cargarValorizaciones();
        },
        error: () => {
          this.showToast('Error al rechazar valorización', 'error');
        }
      });
    }
  }

  confirmarEliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar esta valorización?')) {
      this.valorizacionService.eliminar(id).subscribe({
        next: () => {
          this.showToast('Valorización eliminada exitosamente', 'success');
          this.cargarValorizaciones();
        },
        error: () => {
          this.showToast('Error al eliminar valorización', 'error');
        }
      });
    }
  }

  generarValorizacion(): void {
    if (this.valorizacionForm.invalid) {
      Object.keys(this.valorizacionForm.controls).forEach(key => {
        this.valorizacionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const datos = this.valorizacionForm.value;

    this.valorizacionService.generar(datos).subscribe({
      next: () => {
        this.showToast('Valorización generada exitosamente', 'success');
        this.cerrarModal();
        this.cargarValorizaciones();
      },
      error: () => {
        this.showToast('Error al generar valorización', 'error');
        this.submitting = false;
      }
    });
  }

  cerrarModal(): void {
    $('#modalValorizacion').modal('hide');
    this.submitting = false;
    this.valorizacionForm.reset();
  }

  descargarPDF(id: number | undefined): void {
    if (!id) return;

    this.showToast('Generando PDF...', 'success');

    this.valorizacionService.exportarPDF(id).subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `valorizacion_${id}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (err) => {
        console.error('Error al descargar PDF:', err);
        this.showToast('Error al descargar PDF', 'error');
      }
    });
  }

  showToast(message: string, type: 'success' | 'error'): void {
    if (typeof $ !== 'undefined' && ($ as any).Swal) {
      const Toast = ($ as any).Swal.mixin({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
      Toast.fire({
        icon: type,
        title: message
      });
    } else {
      alert(message);
    }
  }
}

