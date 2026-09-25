import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { EquipoService } from '../services/equipo.service';
import { Equipo } from '../models/equipo.model';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

declare var $: any;

interface TipoMantenimiento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_medicion: string;
  categoria: string;
  criticidad: string;
  frecuencia_kilometros?: number;
  frecuencia_horas?: number;
  frecuencia_dias?: number;
  anticipacion_kilometros?: number;
  anticipacion_horas?: number;
  anticipacion_dias?: number;
  alerta_verde_dias?: number;
  alerta_amarilla_dias?: number;
  alerta_roja_dias?: number;
  activo: boolean;
  obligatorio: boolean;
  genera_alerta?: boolean;
  tipos_equipo_aplicables: string[];
}

interface ControlMantenimiento {
  id?: number;
  equipo_id?: number;
  tipo_mantenimiento_id: number;
  fecha_proxima?: string;
  kilometraje_proximo?: number;
  horometro_proximo?: number;
  estado: string;
  observaciones?: string;
  fecha_ultima_realizacion?: string;
  kilometraje_ultima_realizacion?: number;
  horometro_ultima_realizacion?: number;
}

import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-lista-equipos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-equipos.component.html',
  styleUrls: ['./lista-equipos.component.scss']
})
export class ListaEquiposComponent implements OnInit, AfterViewInit {
  subsystem = 'equipo-mecanico';
  isFiltersCollapsed = false;
  activeTab: 'lista-equipos' | 'tipos-mantenimiento' = 'lista-equipos';
  activeTabModal: 'info' | 'mantenimientos' = 'info';

  equipos: Equipo[] = [];
  loading = false;
  dataTable: any;

  // Mantenimientos programados
  tiposMantenimiento: TipoMantenimiento[] = [];
  controlesMantenimiento: ControlMantenimiento[] = [];
  controlForm: FormGroup;
  controlIndex: number = -1;
  selectedTipoMantenimiento: TipoMantenimiento | null = null;

  // Formularios
  equipoForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  equipoSeleccionado: Equipo | null = null;
  submitting = false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  apiUrl = environment.apiUrl.replace('/api', '');
  personasList: any[] = [];

  // Gestión de Tipos (Nueva sección)
  tipoMantenimientoForm: FormGroup;
  editandoTipo = false;
  tipoSeleccionado: TipoMantenimiento | null = null;

  // Filtros
  filtros = {
    search: '',
    estado: '',
    tipo: '',
    per_page: 10
  };

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor(this.subsystem);
  }

  subtitleItems = [

    { label: 'Registro y control de vehículos', icon: 'fas fa-shuttle-van' },

  ];

  opcionesTipoEquipo = [
    { label: 'Vehículo', value: 'vehiculo' },
    { label: 'Maquinaria', value: 'maquinaria' },
    { label: 'Equipo', value: 'equipo' }
  ];

  constructor(
    private equipoService: EquipoService,
    private fb: FormBuilder,
    private http: HttpClient,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {
    this.equipoForm = this.fb.group({
      id: [null],
      codigo_interno: ['', Validators.required],
      placa: [''],
      marca: [''],
      modelo: [''],
      anio: [null],
      color: [''],
      tipo: ['vehiculo', Validators.required],
      odometro_actual: [0, [Validators.required, Validators.min(0)]],
      horas_motor_actual: [0, [Validators.required, Validators.min(0)]],
      area_id: [null],
      estado: ['operativo', Validators.required],
      observaciones: [''],
      origen: ['interna', Validators.required],
      numero_motor: [''],
      numero_chasis: [''],
      fecha_soat: [null],
      fecha_revision_tecnica: [null],
      fecha_ultimo_mantenimiento: [null],
      fecha_proximo_mantenimiento: [null],
      responsable_id: [null]
    });

    this.controlForm = this.fb.group({
      id: [null],
      tipo_mantenimiento_id: [null, Validators.required],
      fecha_proxima: [''],
      kilometraje_proximo: [null],
      horometro_proximo: [null],
      estado: ['pendiente'],
      observaciones: ['']
    });

    this.tipoMantenimientoForm = this.fb.group({
      id: [null],
      codigo: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      tipo_medicion: ['horometro', Validators.required],
      frecuencia_kilometros: [null],
      frecuencia_horas: [null],
      frecuencia_dias: [null],
      anticipacion_kilometros: [null],
      anticipacion_horas: [null],
      anticipacion_dias: [null],
      alerta_verde_dias: [null],
      alerta_amarilla_dias: [null],
      alerta_roja_dias: [null],
      categoria: [''],
      criticidad: ['media'],
      activo: [true],
      obligatorio: [false],
      genera_alerta: [true],
      tipos_equipo_aplicables: [[]]
    }, {
      validators: this.validarFrecuencias.bind(this)
    });
  }

  validarFrecuencias(form: FormGroup) {
    const tipoMedicion = form.get('tipo_medicion')?.value;
    const freqKm = form.get('frecuencia_kilometros')?.value;
    const freqHoras = form.get('frecuencia_horas')?.value;
    const freqDias = form.get('frecuencia_dias')?.value;

    let error = null;

    switch (tipoMedicion) {
      case 'kilometraje':
        if (!freqKm) {
          error = { required: 'Para tipo Kilometraje debe ingresar frecuencia en KM' };
        }
        break;
      case 'horometro':
        if (!freqHoras) {
          error = { required: 'Para tipo Horómetro debe ingresar frecuencia en Horas' };
        }
        break;
      case 'ambos':
        if (!freqKm && !freqHoras) {
          error = { required: 'Para tipo Ambos debe ingresar al menos una frecuencia (KM o Horas)' };
        }
        break;
      case 'temporal':
        if (!freqDias) {
          error = { required: 'Para tipo Temporal debe ingresar frecuencia en Días' };
        }
        break;
    }

    if (!freqKm && !freqHoras && !freqDias) {
      error = { required: 'Debe ingresar al menos una frecuencia (KM, Horas o Días)' };
    }

    return error;
  }

  ngOnInit(): void {
    console.log('🚀 ngOnInit: Iniciando componente');
    this.dsService.setActiveSubsystem(this.subsystem);
    this.cargarTiposMantenimiento();
    this.loadPersonas();
  }

  ngAfterViewInit(): void {
    console.log('🎨 ngAfterViewInit: Vista inicializada');
    setTimeout(() => {
      console.log('⏰ Cargando datos después de que la vista esté lista...');
      this.cargarEquipos();
    }, 100);
  }

  cargarTiposMantenimiento(): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';
    this.http.get<any>(`${baseUrl}/tipos-mantenimiento/activos`, { withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          // Manejar tanto si viene como array directo o envuelto en .data
          const rawData = response.data.data || response.data;
          this.tiposMantenimiento = (Array.isArray(rawData) ? rawData : []).map(t => ({
            ...t,
            tipos_equipo_aplicables: t.tipos_equipo_aplicables || []
          }));
          console.log('✅ Tipos de mantenimiento cargados:', this.tiposMantenimiento.length);
        }
      },
      error: (error) => {
        console.error('Error al cargar tipos de mantenimiento:', error);
      }
    });
  }

  cargarControlesMantenimiento(equipoId: number): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';
    this.http.get<any>(`${baseUrl}/controles-mantenimiento?equipo_id=${equipoId}`, { withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const rawData = response.data.data || response.data;
          this.controlesMantenimiento = Array.isArray(rawData) ? rawData : [];
          console.log('✅ Controles cargados:', this.controlesMantenimiento.length);
        }
      },
      error: (error) => {
        console.error('Error al cargar controles de mantenimiento:', error);
      }
    });
  }

  initDataTable(): void {
    console.log('🏗️ Inicializando DataTable...');
    console.log('📊 Equipos disponibles:', this.equipos.length);

    if (this.dataTable) {
      console.log('♻️ Destruyendo DataTable existente');
      this.dataTable.destroy();
    }

    this.dataTable = $('#equiposTable').DataTable({
      data: this.equipos,
      columns: [
        {
          data: 'id',
          title: 'ID',
          width: '50px',
          visible: false
        },
        {
          data: 'codigo_interno',
          title: 'Código',
          render: (data: string) => `<strong class="text-primary">${data}</strong>`
        },
        {
          data: 'placa',
          title: 'Placa',
          render: (data: string) => data ? `<span class="badge badge-light border">${data}</span>` : '-'
        },
        {
          data: null,
          title: 'Marca/Modelo',
          render: (data: Equipo) => {
            const marca = data.marca || '-';
            const modelo = data.modelo || '';
            const anio = data.anio ? `<span class="text-xs text-muted">(${data.anio})</span>` : '';
            return `<div>${marca} ${modelo}</div>${anio}`;
          }
        },
        {
          data: 'tipo',
          title: 'Tipo',
          render: (data: string) => {
            const icon = this.getIconoEquipo(data);
            return `<div class="d-flex align-items-center"><i class="${icon} mr-2 text-muted" style="width: 20px; text-align: center;"></i>${this.capitalize(data)}</div>`;
          }
        },
        {
          data: 'estado',
          title: 'Estado',
          render: (data: string) => {
            const badges: any = {
              'operativo': 'success',
              'mantenimiento': 'warning',
              'fuera_servicio': 'danger'
            };
            const badge = badges[data] || 'secondary';
            return `<span class="badge badge-pill badge-${badge}">${this.capitalize(data)}</span>`;
          }
        },
        {
          data: 'odometro_actual',
          title: 'Odómetro',
          className: 'text-right',
          render: (data: number) => `<strong>${data.toLocaleString()}</strong> <small class="text-muted">km</small>`
        },
        {
          data: 'horas_motor_actual',
          title: 'Hrs. Motor',
          className: 'text-right',
          render: (data: number) => `<strong>${data.toLocaleString()}</strong> <small class="text-muted">h</small>`
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          className: 'text-center',
          width: '120px',
          render: (data: Equipo) => {
            return `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-info btn-view" data-id="${data.id}" title="Ver Detalle">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-warning btn-edit" data-id="${data.id}" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-delete" data-id="${data.id}" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `;
          }
        }
      ],
      language: {
        url: 'assets/datatables/i18n/es-ES.json',
        search: "Buscar:",
        lengthMenu: "Mostrar _MENU_ registros",
        info: "Mostrando _START_ a _END_ de _TOTAL_ equipos",
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
    $('#equiposTable').on('click', '.btn-view', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.verEquipo(id);
    });

    $('#equiposTable').on('click', '.btn-edit', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.editarEquipo(id);
    });

    $('#equiposTable').on('click', '.btn-delete', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.confirmarEliminar(id);
    });
  }

  loadPersonas(): void {
    this.http.get<any>(`${environment.apiUrl}/equipo-mecanico/operadores`).subscribe({
      next: (response) => {
        if (response && response.success) {
          this.personasList = response.data;
        }
      },
      error: (err) => console.error('Error cargando personal:', err)
    });
  }

  cargarEquipos(): void {
    this.loading = true;
    console.log('🔄 Cargando equipos...');

    this.equipoService.listarTodos().subscribe({
      next: (equipos) => {
        console.log('✅ Equipos cargados (todas las páginas)');

        this.equipos = equipos;

        console.log('📊 Equipos cargados:', this.equipos.length);
        console.log('📋 Primeros 3 equipos:', this.equipos.slice(0, 3));

        if (this.dataTable) {
          console.log('🔄 Actualizando DataTable existente...');
          this.dataTable.clear();
          this.dataTable.rows.add(this.equipos);
          this.dataTable.draw();
          console.log('✅ DataTable actualizada');
        } else {
          console.log('🏗️ Inicializando DataTable por primera vez con datos...');
          setTimeout(() => {
            this.initDataTable();
          }, 50);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar equipos:', error);
        this.loading = false;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.activeTabModal = 'info';
    this.equipoSeleccionado = null;
    this.equipoForm.enable();
    this.equipoForm.reset({
      tipo: 'vehiculo',
      estado: 'operativo',
      activo: true,
      odometro_actual: 0,
      horas_motor_actual: 0,
      responsable_id: null
    });
    this.selectedFile = null;
    this.imagePreview = null;
    this.controlesMantenimiento = [];
    $('#modalEquipo').modal('show');
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  getFotoUrl(foto: string | undefined): string {
    if (!foto) return 'assets/img/default-equipo.png';
    return `${this.apiUrl}/storage/${foto}`;
  }

  formatDate(dateStr: any): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  }

  verEquipo(id: number): void {
    const equipo = this.equipos.find(e => e.id === id) as any;
    if (equipo) {
      this.modalMode = 'view';
      this.activeTabModal = 'info';
      this.equipoSeleccionado = equipo;
      this.equipoForm.patchValue({
        ...equipo,
        fecha_soat: this.formatDate(equipo.fecha_soat),
        fecha_revision_tecnica: this.formatDate(equipo.fecha_revision_tecnica),
        fecha_ultimo_mantenimiento: this.formatDate(equipo.fecha_ultimo_mantenimiento),
        fecha_proximo_mantenimiento: this.formatDate(equipo.fecha_proximo_mantenimiento),
        responsable_id: equipo.responsable_id || null
      });
      this.equipoForm.disable();
      this.imagePreview = equipo.foto ? this.getFotoUrl(equipo.foto) : null;
      this.controlesMantenimiento = [];
      this.cargarControlesMantenimiento(equipo.id);
      $('#modalEquipo').modal('show');
    }
  }

  editarEquipo(id: number): void {
    const equipo = this.equipos.find(e => e.id === id) as any;
    if (equipo) {
      this.modalMode = 'edit';
      this.activeTabModal = 'info';
      this.equipoSeleccionado = equipo;
      this.equipoForm.enable();
      this.equipoForm.patchValue({
        ...equipo,
        fecha_soat: this.formatDate(equipo.fecha_soat),
        fecha_revision_tecnica: this.formatDate(equipo.fecha_revision_tecnica),
        fecha_ultimo_mantenimiento: this.formatDate(equipo.fecha_ultimo_mantenimiento),
        fecha_proximo_mantenimiento: this.formatDate(equipo.fecha_proximo_mantenimiento),
        responsable_id: equipo.responsable_id || null
      });
      this.selectedFile = null;
      this.imagePreview = equipo.foto ? this.getFotoUrl(equipo.foto) : null;
      this.controlesMantenimiento = [];
      this.cargarControlesMantenimiento(equipo.id);
      $('#modalEquipo').modal('show');
    }
  }

  confirmarEliminar(id: number): void {
    const equipo = this.equipos.find(e => e.id === id);
    if (!equipo) return;

    if (confirm(`¿Está seguro de eliminar el equipo "${equipo.codigo_interno}"?`)) {
      this.equipoService.eliminar(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showToast('Equipo eliminado exitosamente', 'success');
            this.cargarEquipos();
          }
        },
        error: () => {
          this.showToast('Error al eliminar el equipo', 'error');
        }
      });
    }
  }

  guardarEquipo(): void {
    if (this.equipoForm.invalid) {
      this.equipoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formDataValues = this.equipoForm.value;
    const formData = new FormData();

    Object.keys(formDataValues).forEach(key => {
      let value = formDataValues[key];
      if (value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          value = value ? 1 : 0;
        }
        formData.append(key, value);
      }
    });

    if (this.selectedFile) {
      formData.append('foto', this.selectedFile);
    }

    // Enviar controles seleccionados manualmente
    const idsManuales = this.controlesMantenimiento.map(c => c.tipo_mantenimiento_id);
    formData.append('controles_manuales', JSON.stringify(idsManuales));

    // Asegurar que se envíen los valores actuales de odómetro/horómetro para el cálculo inicial
    formData.append('odometro_actual', formDataValues.odometro_actual || 0);
    formData.append('horas_motor_actual', formDataValues.horas_motor_actual || 0);

    const request = this.modalMode === 'create'
      ? this.equipoService.crear(formData)
      : this.equipoService.actualizar(formDataValues.id, formData);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.finalizarGuardado();
        } else {
          this.submitting = false;
        }
      },
      error: () => {
        this.showToast('Error al guardar el equipo', 'error');
        this.submitting = false;
      }
    });
  }

  guardarControlesMantenimiento(equipoId: number): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';

    if (this.modalMode === 'edit' && this.equipoSeleccionado) {
      this.http.delete<any>(`${baseUrl}/controles-mantenimiento?equipo_id=${equipoId}`, { withCredentials: true }).subscribe({
        next: () => {
          this.crearControlesMantenimiento(equipoId);
        },
        error: () => {
          this.crearControlesMantenimiento(equipoId);
        }
      });
    } else {
      this.crearControlesMantenimiento(equipoId);
    }
  }

  crearControlesMantenimiento(equipoId: number): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';
    const controlsToSave = this.controlesMantenimiento.filter(c => c.tipo_mantenimiento_id);

    if (controlsToSave.length === 0) {
      this.finalizarGuardado();
      return;
    }

    const odometroActual = this.equipoForm.get('odometro_actual')?.value || 0;
    const horasActual = this.equipoForm.get('horas_motor_actual')?.value || 0;

    let completed = 0;
    controlsToSave.forEach(control => {
      // Obtener el tipo de mantenimiento para calcular valores por defecto
      const tipo = this.tiposMantenimiento.find(t => t.id === control.tipo_mantenimiento_id);

      // Calcular fecha_programada si no existe
      let fechaProgramada = control.fecha_proxima;
      if (!fechaProgramada && tipo) {
        // Si tiene frecuencia_dias, calcular fecha
        if (tipo.frecuencia_dias) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() + tipo.frecuencia_dias);
          fechaProgramada = fecha.toISOString().split('T')[0];
        } else {
          // Si no tiene frecuencia_dias, usar 30 días por defecto
          const fecha = new Date();
          fecha.setDate(fecha.getDate() + 30);
          fechaProgramada = fecha.toISOString().split('T')[0];
        }
      }

      // Calcular kilometraje_proximo si no existe
      let kilometrajeProximo = control.kilometraje_proximo;
      if (!kilometrajeProximo && tipo?.frecuencia_kilometros) {
        kilometrajeProximo = odometroActual + tipo.frecuencia_kilometros;
      }

      // Calcular horometro_proximo si no existe
      let horometroProximo = control.horometro_proximo;
      if (!horometroProximo && tipo?.frecuencia_horas) {
        horometroProximo = horasActual + tipo.frecuencia_horas;
      }

      const datos = {
        equipo_id: equipoId,
        tipo_mantenimiento_id: control.tipo_mantenimiento_id,
        fecha_programada: fechaProgramada,
        fecha_proxima: fechaProgramada,
        kilometraje_programado: kilometrajeProximo,
        kilometraje_proximo: kilometrajeProximo,
        horometro_programado: horometroProximo,
        horometro_proximo: horometroProximo,
        estado: control.estado || 'pendiente',
        observaciones: control.observaciones || ''
      };

      this.http.post<any>(`${baseUrl}/controles-mantenimiento`, datos, { withCredentials: true }).subscribe({
        next: () => {
          completed++;
          if (completed === controlsToSave.length) {
            this.finalizarGuardado();
          }
        },
        error: () => {
          completed++;
          if (completed === controlsToSave.length) {
            this.finalizarGuardado();
          }
        }
      });
    });
  }

  finalizarGuardado(): void {
    this.showToast(
      this.modalMode === 'create' ? 'Equipo creado exitosamente' : 'Equipo actualizado exitosamente',
      'success'
    );
    $('#modalEquipo').modal('hide');
    this.cargarEquipos();
    this.submitting = false;
  }

  abrirModalControl(): void {
    this.controlIndex = -1;
    this.selectedTipoMantenimiento = null;
    this.controlForm.reset({
      tipo_mantenimiento_id: null,
      fecha_proxima: '',
      kilometraje_proximo: this.equipoForm.get('odometro_actual')?.value || null,
      horometro_proximo: this.equipoForm.get('horas_motor_actual')?.value || null,
      estado: 'pendiente',
      observaciones: ''
    });

    this.abrirModalSecundario();
  }

  abrirModalSecundario(): void {
    const modalEquipo = $('#modalEquipo');
    const modalControl = $('#modalControlMantenimiento');

    modalEquipo.css('overflow-y', 'hidden');

    if ($('.modal-backdrop').length === 0) {
      $('body').addClass('modal-open');
      $('<div class="modal-backdrop fade show" style="z-index: 1039;"></div>').appendTo('body');
    } else {
      $('.modal-backdrop').css('opacity', '0.5');
    }

    setTimeout(() => {
      modalControl.css({
        'z-index': '1050',
        'display': 'block'
      });
      modalControl.addClass('show');
    }, 50);

    modalControl.modal('show');
  }

  editarControlMantenimiento(index: number): void {
    this.controlIndex = index;
    const control = this.controlesMantenimiento[index];
    this.selectedTipoMantenimiento = this.tiposMantenimiento.find(t => t.id === control.tipo_mantenimiento_id) || null;

    this.controlForm.patchValue({
      id: control.id || null,
      tipo_mantenimiento_id: control.tipo_mantenimiento_id,
      fecha_proxima: control.fecha_proxima ? control.fecha_proxima.split('T')[0] : '',
      kilometraje_proximo: control.kilometraje_proximo,
      horometro_proximo: control.horometro_proximo,
      estado: control.estado,
      observaciones: control.observaciones || ''
    });

    this.abrirModalSecundario();
  }

  eliminarControlMantenimiento(index: number): void {
    if (confirm('¿Está seguro de eliminar este mantenimiento programado?')) {
      this.controlesMantenimiento.splice(index, 1);
    }
  }

  guardarControlMantenimiento(): void {
    if (this.controlForm.invalid) {
      this.controlForm.markAllAsTouched();
      return;
    }

    const formData = this.controlForm.value;
    const tipoId = parseInt(formData.tipo_mantenimiento_id);

    if (this.controlIndex === -1) {
      this.controlesMantenimiento.push({
        tipo_mantenimiento_id: tipoId,
        fecha_proxima: formData.fecha_proxima || null,
        kilometraje_proximo: formData.kilometraje_proximo,
        horometro_proximo: formData.horometro_proximo,
        estado: formData.estado,
        observaciones: formData.observaciones || ''
      });
    } else {
      this.controlesMantenimiento[this.controlIndex] = {
        ...this.controlesMantenimiento[this.controlIndex],
        tipo_mantenimiento_id: tipoId,
        fecha_proxima: formData.fecha_proxima || null,
        kilometraje_proximo: formData.kilometraje_proximo,
        horometro_proximo: formData.horometro_proximo,
        estado: formData.estado,
        observaciones: formData.observaciones || ''
      };
    }

    this.cerrarModalControl();
  }

  cerrarModalControl(): void {
    const modalControl = $('#modalControlMantenimiento');
    const modalEquipo = $('#modalEquipo');

    modalControl.modal('hide');
    modalControl.removeClass('show');
    modalControl.css('display', 'none');

    this.controlForm.reset();
    this.selectedTipoMantenimiento = null;

    setTimeout(() => {
      modalEquipo.css('overflow-y', 'auto');

      if ($('.modal-backdrop').length > 0) {
        $('.modal-backdrop').css({
          'opacity': '0.5',
          'z-index': '1039'
        });
      }

      $('body').addClass('modal-open');
    }, 100);
  }

  onTipoMantenimientoChange(): void {
    const tipoId = this.controlForm.get('tipo_mantenimiento_id')?.value;
    if (tipoId) {
      this.selectedTipoMantenimiento = this.tiposMantenimiento.find(t => t.id == tipoId) || null;

      if (this.selectedTipoMantenimiento) {
        const odometroActual = this.equipoForm.get('odometro_actual')?.value || 0;
        const horasActual = this.equipoForm.get('horas_motor_actual')?.value || 0;

        let fechaProxima = this.controlForm.get('fecha_proxima')?.value;
        let kmProximo = this.controlForm.get('kilometraje_proximo')?.value;
        let hrProximo = this.controlForm.get('horometro_proximo')?.value;

        if (!fechaProxima && this.selectedTipoMantenimiento.frecuencia_dias) {
          const fecha = new Date();
          fecha.setDate(fecha.getDate() + this.selectedTipoMantenimiento.frecuencia_dias);
          fechaProxima = fecha.toISOString().split('T')[0];
        }

        if (!kmProximo && this.selectedTipoMantenimiento.frecuencia_kilometros) {
          kmProximo = odometroActual + this.selectedTipoMantenimiento.frecuencia_kilometros;
        }

        if (!hrProximo && this.selectedTipoMantenimiento.frecuencia_horas) {
          hrProximo = horasActual + this.selectedTipoMantenimiento.frecuencia_horas;
        }

        this.controlForm.patchValue({
          fecha_proxima: fechaProxima,
          kilometraje_proximo: kmProximo,
          horometro_proximo: hrProximo
        });
      }
    } else {
      this.selectedTipoMantenimiento = null;
    }
  }

  getNombreTipoMantenimiento(tipoId: any): string {
    const tipo = this.tiposMantenimiento.find(t => t.id == tipoId);
    return tipo?.nombre || 'Tipo no encontrado';
  }

  getCategoriaTipoMantenimiento(tipoId: any): string {
    const tipo = this.tiposMantenimiento.find(t => t.id == tipoId);
    return tipo?.categoria || '-';
  }

  getControlesRealizados(): any[] {
    return this.controlesMantenimiento.filter(c => c.estado === 'realizado' || c.fecha_ultima_realizacion);
  }

  getControlesNoRealizados(): any[] {
    return this.controlesMantenimiento.filter(c => c.estado !== 'realizado' && !c.fecha_ultima_realizacion);
  }

  cerrarModal(): void {
    $('#modalEquipo').modal('hide');
    this.equipoForm.enable();
    this.equipoForm.reset();
    this.equipoSeleccionado = null;
    this.selectedFile = null;
    this.imagePreview = null;
    this.controlesMantenimiento = [];
  }

  capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1).replace('_', ' ') : '';
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
      tipo: '',
      per_page: 10
    };
    this.onFilterChange();
  }

  onFilterChange(): void {
    if (this.dataTable) {
      this.dataTable.search(this.filtros.search).draw();
      this.dataTable.column(5).search(this.filtros.estado).draw();
      this.dataTable.column(4).search(this.filtros.tipo).draw();
    }
  }

  setActiveTab(tab: 'lista-equipos' | 'tipos-mantenimiento'): void {
    this.activeTab = tab;
  }

  // --- MÉTODOS GESTIÓN DE TIPOS ---

  abrirModalNuevoTipo(): void {
    this.editandoTipo = false;
    this.tipoSeleccionado = null;
    this.tipoMantenimientoForm.reset({
      codigo: '',
      nombre: '',
      descripcion: '',
      tipo_medicion: 'horometro',
      frecuencia_kilometros: null,
      frecuencia_horas: null,
      frecuencia_dias: null,
      anticipacion_kilometros: null,
      anticipacion_horas: null,
      anticipacion_dias: null,
      alerta_verde_dias: null,
      alerta_amarilla_dias: null,
      alerta_roja_dias: null,
      categoria: '',
      criticidad: 'media',
      activo: true,
      obligatorio: false,
      genera_alerta: true,
      tipos_equipo_aplicables: []
    });
    $('#modalTipoMantenimiento').modal('show');
  }

  editarTipoMantenimiento(tipo: TipoMantenimiento): void {
    this.editandoTipo = true;
    this.tipoSeleccionado = tipo;
    this.tipoMantenimientoForm.patchValue({
      ...tipo,
      tipos_equipo_aplicables: tipo.tipos_equipo_aplicables || []
    });
    $('#modalTipoMantenimiento').modal('show');
  }

  cerrarModalTipo(): void {
    $('#modalTipoMantenimiento').modal('hide');
    this.tipoMantenimientoForm.reset();
  }

  guardarTipoMantenimiento(): void {
    // Verificar validación personalizada de frecuencias
    const validationError = this.validarFrecuencias(this.tipoMantenimientoForm);
    if (validationError) {
      this.showToast(validationError['required'], 'error');
      this.tipoMantenimientoForm.markAllAsTouched();
      return;
    }

    if (this.tipoMantenimientoForm.invalid) {
      this.tipoMantenimientoForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    let datos = this.tipoMantenimientoForm.value;

    // Normalizar valores booleanos para evitar null en la BD
    datos.obligatorio = datos.obligatorio === true || datos.obligatorio === 'true' || datos.obligatorio === 1 || datos.obligatorio === '1' ? true : false;
    datos.activo = datos.activo === true || datos.activo === 'true' || datos.activo === 1 || datos.activo === '1' ? true : false;
    datos.genera_alerta = datos.genera_alerta === true || datos.genera_alerta === 'true' || datos.genera_alerta === 1 || datos.genera_alerta === '1' ? true : false;

    // Normalizar array de tipos de equipo
    if (!datos.tipos_equipo_aplicables || !Array.isArray(datos.tipos_equipo_aplicables)) {
      datos.tipos_equipo_aplicables = [];
    }

    // Valores por defecto para alertas si no se especifican
    datos.anticipacion_kilometros = datos.anticipacion_kilometros || 100;
    datos.anticipacion_horas = datos.anticipacion_horas || 10;
    datos.anticipacion_dias = datos.anticipacion_dias || 7;
    datos.alerta_verde_dias = datos.alerta_verde_dias || 15;
    datos.alerta_amarilla_dias = datos.alerta_amarilla_dias || 7;
    datos.alerta_roja_dias = datos.alerta_roja_dias || 3;

    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico/tipos-mantenimiento';

    const request = this.editandoTipo
      ? this.http.put<any>(`${baseUrl}/${datos.id}`, datos, { withCredentials: true })
      : this.http.post<any>(baseUrl, datos, { withCredentials: true });

    request.subscribe({
      next: (res) => {
        if (res.success) {
          this.showToast('Configuración guardada correctamente', 'success');
          this.cargarTiposMantenimiento();
          this.cerrarModalTipo();
        }
        this.submitting = false;
      },
      error: () => {
        this.showToast('Error al guardar la configuración', 'error');
        this.submitting = false;
      }
    });
  }

  eliminarTipoMantenimiento(id: number): void {
    if (!confirm('¿Está seguro de eliminar esta configuración? Esto no afectará a los registros ya creados pero no se podrán crear nuevos de este tipo.')) return;

    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico/tipos-mantenimiento';
    this.http.delete<any>(`${baseUrl}/${id}`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success) {
          this.showToast('Configuración eliminada', 'success');
          this.cargarTiposMantenimiento();
        }
      },
      error: () => this.showToast('Error al eliminar', 'error')
    });
  }

  estaTipoSeleccionado(tipo: string): boolean {
    const seleccionados = this.tipoMantenimientoForm.get('tipos_equipo_aplicables')?.value || [];
    return seleccionados.includes(tipo);
  }

  getIconoEquipo(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('moto')) return 'fas fa-motorcycle';
    if (t.includes('camioneta')) return 'fas fa-truck-pickup';
    if (t.includes('volquete') || t.includes('camion')) return 'fas fa-truck';
    if (t.includes('maquinaria') || t.includes('excavadora') || t.includes('tractor')) return 'fas fa-tractor';
    if (t.includes('carro') || t.includes('auto') || t.includes('vehiculo')) return 'fas fa-car';
    return 'fas fa-cog';
  }

  toggleTipoEquipo(tipo: string): void {
    let seleccionados = [...(this.tipoMantenimientoForm.get('tipos_equipo_aplicables')?.value || [])];
    if (seleccionados.includes(tipo)) {
      seleccionados = seleccionados.filter(t => t !== tipo);
    } else {
      seleccionados.push(tipo);
    }
    this.tipoMantenimientoForm.get('tipos_equipo_aplicables')?.setValue(seleccionados);
  }

  limpiarTiposEquipo(): void {
    this.tipoMantenimientoForm.get('tipos_equipo_aplicables')?.setValue([]);
  }
}

