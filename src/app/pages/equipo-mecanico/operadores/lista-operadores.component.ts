import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { OperadorService, Operador } from '../services/operador.service';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ServiceModalComponent } from './service-modal/service-modal.component';
import { EmployeeContractService, EmployeeContract } from '../../../services/employee-contract.service';

declare var $: any;

@Component({
  selector: 'app-lista-operadores',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    ReactiveFormsModule, 
    SystemLayoutComponent,
    ServiceModalComponent
  ],
  templateUrl: './lista-operadores.component.html',
  styleUrls: ['./lista-operadores.component.scss']
})
export class ListaOperadoresComponent implements OnInit, AfterViewInit {
  operadores: Operador[] = [];
  usuarios: any[] = [];
  loading = false;
  dataTable: any;
  subsystem = 'equipo-mecanico';
  isFiltersCollapsed = false;

  subtitleItems = [
    { label: 'Registro y Control de Personal', icon: 'fas fa-users-cog' },
  ];

  // Filtros
  filtros = {
    search: '',
    activo: '',
    per_page: 10
  };

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor(this.subsystem);
  }

  operadorForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  operadorSeleccionado: Operador | null = null;
  submitting = false;

  // Contracts & Tabs
  activeTab = 'info';
  contracts: EmployeeContract[] = [];
  loadingContracts = false;
  showContractModal = false;
  contractModalData?: EmployeeContract;

  constructor(
    private operadorService: OperadorService,
    private fb: FormBuilder,
    private http: HttpClient,
    private dsService: DesignSystemService,
    private toast: ToastService,
    private contractService: EmployeeContractService
  ) {
    this.operadorForm = this.fb.group({
      id: [null],
      first_name: ['', Validators.required],
      last_name: ['', Validators.required],
      dni: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(8)]],
      employee_code: [''],
      licencia: [''],
      categoria_licencia: [''],
      fecha_vencimiento_licencia: [''],
      fecha_ingreso: [this.getFechaHoy(), Validators.required],
      activo: [true]
    });
  }

  ngOnInit(): void {
    console.log('🚀 ngOnInit [Operadores]: Iniciando componente');
    this.dsService.setActiveSubsystem(this.subsystem);
  }

  ngAfterViewInit(): void {
    console.log('🎨 ngAfterViewInit [Operadores]: Vista inicializada');
    setTimeout(() => {
      this.cargarUsuarios();
      this.cargarOperadores();
    }, 100);
  }

  getFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  initDataTable(): void {
    console.log('🏗️ Inicializando DataTable [Operadores]...');

    if (this.dataTable) {
      console.log('♻️ Destruyendo DataTable existente [Operadores]');
      this.dataTable.destroy();
    }

    this.dataTable = $('#operadoresTable').DataTable({
      data: this.operadores,
      columns: [
        {
          data: 'id',
          title: 'ID',
          width: '50px',
          visible: false
        },
        {
          data: null,
          title: 'Operador / Usuario',
          render: (data: Operador) => {
            const name = `${data.first_name} ${data.last_name}`;
            const badge = data.is_planilla ? '<span class="badge badge-primary ml-1 small">Planilla</span>' : '';
            const email = data.user?.email ? `<br><small class="text-muted">${data.user.email}</small>` : '';
            return `<div><strong>${name}</strong> ${badge}${email}</div>`;
          }
        },
        {
          data: 'license',
          title: 'Licencia',
          render: (data: string) => data ? `<span class="badge badge-light border">${data}</span>` : '-'
        },
        {
          data: 'license_category',
          title: 'Categoría',
          className: 'text-center',
          render: (data: string) => data ? `<span class="badge badge-info">${data}</span>` : '-'
        },
        {
          data: 'license_expiration',
          title: 'Vencimiento',
          render: (data: string) => {
            if (!data) return '-';

            const fechaStr = data.substring(0, 10);
            const [year, month, day] = fechaStr.split('-').map(Number);
            const fecha = new Date(year, month - 1, day);

            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const diff = fecha.getTime() - hoy.getTime();
            const dias = Math.ceil(diff / (1000 * 60 * 60 * 24));

            let badge = 'success';
            if (dias < 0) badge = 'danger';
            else if (dias < 30) badge = 'warning';

            return `
              <div class="d-flex flex-column">
                <span class="badge badge-${badge} mb-1">${fecha.toLocaleDateString('es-PE')}</span>
                ${dias < 0 ? '<small class="text-danger">Vencida</small>' : `<small class="text-muted">${dias} días rest.</small>`}
              </div>
            `;
          }
        },
        {
          data: null,
          title: 'Equipo Actual',
          render: (data: Operador) => {
            if (data.asignacion_actual?.equipo) {
              return `
                <div class="d-flex align-items-center">
                  <i class="fas fa-truck text-muted mr-2"></i>
                  <span class="text-primary font-weight-bold">${data.asignacion_actual.equipo.codigo_interno}</span>
                </div>
              `;
            }
            return '<span class="text-muted small italic">Sin asignación</span>';
          }
        },
        {
          data: 'status',
          title: 'Estado',
          className: 'text-center',
          render: (data: string) => {
            return data === 'active'
              ? '<span class="badge badge-pill badge-success">Activo</span>'
              : '<span class="badge badge-pill badge-secondary">Inactivo</span>';
          }
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          className: 'text-center',
          width: '120px',
          render: (data: Operador) => {
            const disabled = data.is_planilla ? 'disabled title="No se puede gestionar personal de planilla desde este módulo"' : '';
            return `
              <div class="btn-group btn-group-sm">
                <button class="btn btn-info btn-view" data-id="${data.id}" title="Ver Detalle">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-warning btn-edit" data-id="${data.id}" title="Editar" ${disabled}>
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-delete" data-id="${data.id}" title="Eliminar" ${disabled}>
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
        info: "Mostrando _START_ a _END_ de _TOTAL_ operadores",
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
    $('#operadoresTable').on('click', '.btn-view', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.verOperador(id);
    });

    $('#operadoresTable').on('click', '.btn-edit', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.editarOperador(id);
    });

    $('#operadoresTable').on('click', '.btn-delete', (e: any) => {
      const id = $(e.currentTarget).data('id');
      this.confirmarEliminar(id);
    });
  }

  cargarUsuarios(): void {
    this.http.get<any>(`${environment.apiUrl}/users`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.usuarios = Array.isArray(response.data) ? response.data : (response.data.data || []);
        }
      },
      error: () => {
        console.warn('No se pudieron cargar los usuarios');
        this.usuarios = [];
      }
    });
  }

  cargarOperadores(): void {
    this.loading = true;
    console.log('🔄 Cargando operadores...');

    this.operadorService.listar({}, 1000).subscribe({
      next: (response) => {
        console.log('✅ Respuesta recibida [Operadores]:', response);

        if (response.success && response.data) {
          this.operadores = Array.isArray(response.data) ? response.data : (response.data.data || []);

          console.log('📊 Operadores cargados:', this.operadores.length);

          if (this.dataTable) {
            this.dataTable.clear();
            this.dataTable.rows.add(this.operadores);
            this.dataTable.draw();
          } else {
            setTimeout(() => {
              this.initDataTable();
            }, 50);
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error al cargar operadores:', error);
        this.loading = false;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.operadorSeleccionado = null;
    this.operadorForm.enable();
    this.operadorForm.reset({
      activo: true
    });
    
    this.activeTab = 'info';
    setTimeout(() => { $('#info-tab').tab('show'); }, 50);

    $('#modalOperador').modal('show');
  }

  verOperador(id: number): void {
    this.operadorService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const operador = response.data;
          this.modalMode = 'view';
          this.operadorSeleccionado = operador;

          const formData = {
            id: operador.id,
            first_name: operador.first_name,
            last_name: operador.last_name,
            dni: operador.dni,
            employee_code: operador.employee_code,
            licencia: operador.license,
            categoria_licencia: operador.license_category,
            fecha_vencimiento_licencia: operador.license_expiration
              ? operador.license_expiration.substring(0, 10)
              : '',
            fecha_ingreso: operador.hire_date
              ? operador.hire_date.substring(0, 10)
              : '',
            activo: operador.status === 'active'
          };

          this.operadorForm.patchValue(formData);
          this.operadorForm.disable();

          this.activeTab = 'info';
          setTimeout(() => { $('#info-tab').tab('show'); }, 50);

          $('#modalOperador').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar el operador', 'error');
      }
    });
  }

  editarOperador(id: number): void {
    this.operadorService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const operador = response.data;
          
          if (operador.is_planilla) {
            this.showToast('No se puede editar personal de planilla desde este módulo.', 'warning');
            return;
          }

          this.modalMode = 'edit';
          this.operadorSeleccionado = operador;
          this.operadorForm.enable();

          const formData = {
            id: operador.id,
            first_name: operador.first_name,
            last_name: operador.last_name,
            dni: operador.dni,
            employee_code: operador.employee_code,
            licencia: operador.license,
            categoria_licencia: operador.license_category,
            fecha_vencimiento_licencia: operador.license_expiration
              ? operador.license_expiration.substring(0, 10)
              : '',
            fecha_ingreso: operador.hire_date
              ? operador.hire_date.substring(0, 10)
              : '',
            activo: operador.status === 'active'
          };

          this.operadorForm.patchValue(formData);

          this.activeTab = 'info';
          setTimeout(() => { $('#info-tab').tab('show'); }, 50);

          $('#modalOperador').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar el operador', 'error');
      }
    });
  }

  confirmarEliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este operador?')) {
      this.operadorService.eliminar(id).subscribe({
        next: () => {
          this.showToast('Operador eliminado exitosamente', 'success');
          this.cargarOperadores();
        },
        error: (error) => {
          this.showToast(error.error?.message || 'Error al eliminar operador', 'error');
        }
      });
    }
  }

  guardarOperador(): void {
    if (this.operadorForm.invalid) {
      Object.keys(this.operadorForm.controls).forEach(key => {
        this.operadorForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.submitting = true;
    const datos = this.operadorForm.value;

    const operacion = this.modalMode === 'create'
      ? this.operadorService.crear(datos)
      : this.operadorService.actualizar(datos.id, datos);

    operacion.subscribe({
      next: () => {
        this.showToast(`Operador ${this.modalMode === 'create' ? 'creado' : 'actualizado'} exitosamente`, 'success');
        this.cerrarModal();
        this.cargarOperadores();
      },
      error: (error) => {
        this.showToast(error.error?.message || 'Error al guardar operador', 'error');
        this.submitting = false;
      }
    });
  }

  cerrarModal(): void {
    $('#modalOperador').modal('hide');
    this.submitting = false;
    this.operadorForm.reset();
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
      activo: '',
      per_page: 10
    };
    this.onFilterChange();
  }

  onFilterChange(): void {
    if (this.dataTable) {
      this.dataTable.search(this.filtros.search).draw();
      // Filtrado por estado si es necesario
      if (this.filtros.activo !== '') {
        const estadoLabel = this.filtros.activo === 'true' ? 'Activo' : 'Inactivo';
        this.dataTable.column(6).search(estadoLabel).draw();
      } else {
        this.dataTable.column(6).search('').draw();
      }
    }
  }

  // --- CONTRACTS MANAGEMENT ---

  loadContracts() {
    if (!this.operadorSeleccionado?.id) return;
    this.loadingContracts = true;
    this.contractService.getContractsByEmployee(this.operadorSeleccionado.id).subscribe({
      next: (res: any) => {
        if (res.success) this.contracts = res.data;
        this.loadingContracts = false;
      },
      error: () => this.loadingContracts = false
    });
  }

  openContractModal() {
    this.contractModalData = undefined;
    this.showContractModal = true;
  }

  editContract(contract: EmployeeContract) {
    this.contractModalData = contract;
    this.showContractModal = true;
  }

  deleteContract(contract: EmployeeContract) {
    if (confirm('¿Está seguro de eliminar este contrato/orden?')) {
      this.contractService.deleteContract(contract.id!).subscribe({
        next: (res: any) => {
          if (res.success) {
            this.showToast('Contrato eliminado exitosamente', 'success');
            this.loadContracts();
          }
        }
      });
    }
  }

  onContractModalClosed(saved: boolean) {
    this.showContractModal = false;
    if (saved) this.loadContracts();
  }

  getContractStatusClass(status: string): string {
    switch (status) {
      case 'vigente': return 'badge-success';
      case 'vencido': return 'badge-danger';
      case 'renovado': return 'badge-info';
      case 'rescindido': return 'badge-warning';
      case 'suspendido': return 'badge-secondary';
      default: return 'badge-secondary';
    }
  }
}

