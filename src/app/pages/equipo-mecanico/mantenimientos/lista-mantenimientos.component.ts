import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MantenimientoService } from '../services/mantenimiento.service';
import { EquipoService } from '../services/equipo.service';
import { MechanicalDepartmentService } from '../services/mechanical-department.service';
import { Mantenimiento, Equipo, MantenimientoDetalle } from '../models/equipo.model';
import { environment } from '../../../../environments/environment';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';
import { Subject, takeUntil, interval, finalize } from 'rxjs';

declare var $: any;

@Component({
  selector: 'app-lista-mantenimientos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-mantenimientos.component.html',
  styleUrls: ['./lista-mantenimientos.component.scss']
})
export class ListaMantenimientosComponent implements OnInit {
  Math = Math;
  subsystem = 'equipo-mecanico';
  mantenimientos: Mantenimiento[] = [];
  equipos: Equipo[] = [];
  centrosCosto: any[] = [];
  tiposMantenimientoPreventivo: any[] = [];
  loading = false;
  /** Filtros visibles al entrar (incluye combo Departamento). */
  isFiltersCollapsed = false;
  /** Pestañas CRUD (mismo patrón que lista-equipos). */
  activeTab: 'lista' | 'historial' = 'lista';
  departamentos: any[] = [];

  subtitleItems = [
    { label: 'Control y registro de mantenimiento de maquinarias', icon: 'fas fa-tools' }
  ];

  // Filtros y Paginación
  filtros: any = {
    search: '',
    department_id: null as number | null,
    equipo_id: '',
    tipo: '',
    estado: '',
    per_page: 15,
    page: 1,
    sort: 'id',
    order: 'desc'
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 15
  };

  // Formularios
  mantenimientoForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  mantenimientoSeleccionado: Mantenimiento | null = null;
  submitting = false;
  pdfDownloading = false;

  isServiceMode = false;
  userDepartmentId: number | null = null;
  fixedCostCenterId?: number;

  private destroy$ = new Subject<void>();

  constructor(
    private mantenimientoService: MantenimientoService,
    private equipoService: EquipoService,
    private mechanicalDeptService: MechanicalDepartmentService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {
    this.mantenimientoForm = this.fb.group({
      id: [null],
      department_id: [null, Validators.required],
      equipo_id: [null, Validators.required],
      centro_costo_id: [null, Validators.required],
      tipo_mantenimiento_preventivo_id: [null],
      control_mantenimiento_id: [null],
      tipo: ['preventivo', Validators.required],
      fecha_programada: ['', Validators.required],
      fecha_inicio: [''],
      fecha_cierre: [''],
      odometro: [null],
      horas_motor: [null],
      descripcion: ['', Validators.required],
      estado: ['programado', Validators.required],
      responsable: [''],
      costo_estimado: [0, [Validators.required, Validators.min(0)]],
      costo_total: [0, [Validators.required, Validators.min(0)]],
      observaciones: [''],
      detalles: this.fb.array([])
    });
  }

  get detalles(): FormArray {
    return this.mantenimientoForm.get('detalles') as FormArray;
  }

  setActiveTab(tab: 'lista' | 'historial'): void {
    if (this.activeTab === tab) {
      return;
    }
    this.activeTab = tab;
    this.filtros.estado = tab === 'historial' ? 'cerrado' : '';
    this.filtros.page = 1;
    this.paginacion.currentPage = 1;
    this.cargarMantenimientos();
  }

  /** Configuración CRUD */
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('equipo-mecanico');
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('equipo-mecanico');
    this.isServiceMode = this.router.url.includes('/servicios/');

    this.cargarDepartamentos();
    this.cargarTiposPreventivos();
    this.cargarCentrosCosto();
    this.cargarEquiposSegunFiltroDepartamento();
    this.cargarMantenimientos();

    // Obtener información del departamento del usuario siempre
    this.mechanicalDeptService.getDepartmentInfo().subscribe(res => {
      if (res.success && res.data) {
        this.userDepartmentId = res.data.department_id || res.data.id; // Soportar ambas formas
        this.fixedCostCenterId = res.data.centro_costo_id;

        if (this.isServiceMode) {
          this.mantenimientoForm.patchValue({
            department_id: this.userDepartmentId,
            centro_costo_id: this.fixedCostCenterId
          });
        }
      }
    });
    
    this.route.queryParams.subscribe(params => {
      if (params['auto_create'] && params['equipo_id']) {
        setTimeout(() => this.abrirNuevoDesdeAlerta(params), 500);
      }
    });

    interval(30000).pipe(takeUntil(this.destroy$)).subscribe(() => {
        if (!this.submitting) this.cargarMantenimientos();
    });

    // Suscribirse a cambios en los detalles para automatizar el costo total
    this.detalles.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.actualizarCostoTotalDesdeDetalles();
    });
  }

  /** Lógica para sincronizar el total de la cabecera con la suma de detalles */
  private actualizarCostoTotalDesdeDetalles(): void {
    if (this.detalles.length > 0) {
      const total = this.calcularTotalGeneral();
      this.mantenimientoForm.get('costo_total')?.patchValue(total, { emitEvent: false });
    }
  }

  cargarDepartamentos(): void {
    this.http.get<any>(`${environment.apiUrl}/public/departamentos`).subscribe({
      next: (res) => {
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          this.departamentos = list;
          if (list.length === 0) {
            this.cargarDepartamentosAutenticado();
          }
        } else {
          this.cargarDepartamentosAutenticado();
        }
      },
      error: () => this.cargarDepartamentosAutenticado(),
    });
  }

  /** Misma fuente Planillas que `public/departamentos`, vía ruta protegida si la pública falla o viene vacía. */
  private cargarDepartamentosAutenticado(): void {
    this.http.get<any>(`${environment.apiUrl}/departamentos`).subscribe({
      next: (res) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || []);
        if (list.length > 0) {
          this.departamentos = list.map((d: any) => ({
            id: d.id,
            nombre: d.nombre ?? d.name ?? `Departamento #${d.id}`,
            codigo: d.codigo ?? d.code,
            centro_costo_id: d.centro_costo_id ?? d.centro_costos_id,
            centro_costos_id: d.centro_costos_id ?? d.centro_costo_id,
          }));
        }
      },
      error: (err) => console.error('Error al cargar departamentos (API autenticada):', err),
    });
  }

  onDepartmentChange(deptId: any): void {
    if (deptId === null || deptId === undefined || deptId === '' || deptId === 'null') {
      this.equipos = [];
      this.mantenimientoForm.patchValue({ equipo_id: null, centro_costo_id: null });
      return;
    }

    const deptNum = typeof deptId === 'number' ? deptId : Number(deptId);
    if (Number.isNaN(deptNum)) {
      return;
    }

    // 1. Filtrar equipos por este departamento
    this.loading = true;
    this.equipoService.listarTodos({ department_id: deptNum }).subscribe({
      next: (equipos) => {
        this.equipos = equipos;

        const currentEquipoId = this.mantenimientoForm.get('equipo_id')?.value;
        if (!currentEquipoId || !this.equipos.find(e => e.id == currentEquipoId)) {
          this.mantenimientoForm.get('equipo_id')?.setValue(null);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.showToast('Error al cargar equipos del departamento seleccionado', 'error');
      }
    });

    // 2. Establecer Centro de Costos automático
    const depto = this.departamentos.find(d => Number(d.id) === deptNum);
    if (depto) {
      const ccId = depto.centro_costo_id || depto.centro_costos_id || depto.id_centro_costo;
      if (ccId) {
        this.mantenimientoForm.get('centro_costo_id')?.setValue(ccId);
      }
    }
  }

  cargarCentrosCosto(): void {
    this.http.get<any>(`${environment.apiUrl}/centros-costo`).subscribe({
      next: (res) => {
        if (res.success) {
          // Adaptar si viene paginado o directo
          this.centrosCosto = Array.isArray(res.data) ? res.data : (res.data.data || []);
        }
      },
      error: (err) => console.error('Error al cargar centros de costo:', err)
    });
  }

  getNombreCentroCosto(id: any): string {
    if (!id) return 'No asignado';
    const cc = this.centrosCosto.find(c => c.id == id);
    if (!cc) return `C.C. #${id}`;
    
    // Probar varios campos posibles para el nombre y código
    const nombre = cc.nombre || cc.name || cc.descripcion || '';
    const codigo = cc.codigo || cc.code || '';
    
    if (!nombre && !codigo) return `C.C. #${id}`;
    return codigo ? `${codigo} - ${nombre}` : nombre;
  }

  cargarTiposPreventivos(): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';
    this.http.get<any>(`${baseUrl}/tipos-mantenimiento/activos`).subscribe(res => {
      if (res.success && res.data) {
        this.tiposMantenimientoPreventivo = res.data.data || res.data;
      }
    });
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.mantenimientoSeleccionado = null;
    this.mantenimientoForm.enable();
    
    // Valores por defecto
    const preselectedDeptId = this.userDepartmentId || null;

    this.mantenimientoForm.reset({
      tipo: 'preventivo',
      estado: 'programado',
      fecha_programada: this.getFechaHoy(),
      department_id: preselectedDeptId,
      costo_estimado: 0,
      costo_total: 0
    });
    
    this.detalles.clear();
    
    // Si ya tenemos departamento seleccionado (por defecto o service mode), cargar sus datos
    if (preselectedDeptId) {
       this.onDepartmentChange(preselectedDeptId);
    }

    if (this.isServiceMode) {
      this.mantenimientoForm.get('centro_costo_id')?.disable();
      this.mantenimientoForm.get('department_id')?.disable();
    }
    
    this.mantenimientoForm.get('estado')?.disable(); 
    $('#modalMantenimiento').modal('show');
  }

  // ... (Resto de métodos básicos)

  /** Lista de equipos para la barra de filtros (según departamento elegido o todos). */
  cargarEquiposSegunFiltroDepartamento(): void {
    const dept = this.filtros.department_id;
    const req =
      dept !== '' && dept !== null && dept !== undefined && !Number.isNaN(Number(dept))
        ? this.equipoService.listarTodos({ department_id: dept })
        : this.equipoService.listarTodos();
    req.subscribe({
      next: (equipos) => {
        this.equipos = equipos;
      },
    });
  }

  onDepartamentoFiltroChange(): void {
    this.filtros.equipo_id = '';
    this.cargarEquiposSegunFiltroDepartamento();
    this.onFilterChange();
  }

  cargarMantenimientos(): void {
    this.loading = true;
    this.mantenimientoService.listar(this.filtros, this.filtros.per_page).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const raw: any = response.data;
          if (raw.data && Array.isArray(raw.data)) {
            this.mantenimientos = raw.data;
            this.paginacion = {
              currentPage: raw.current_page,
              lastPage: raw.last_page,
              total: raw.total,
              perPage: raw.per_page
            };
          } else {
            this.mantenimientos = Array.isArray(raw) ? raw : [];
            this.paginacion.total = this.mantenimientos.length;
          }
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  descargarFichaPdf(id: number): void {
    this.pdfDownloading = true;
    this.mantenimientoService
      .descargarFichaPdf(id)
      .pipe(finalize(() => (this.pdfDownloading = false)))
      .subscribe({
        next: (blob) => {
          if (blob.size < 100 || blob.type === 'application/json') {
            this.toast.error('No se pudo generar la ficha PDF', 'Error');
            return;
          }
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ficha-mantenimiento-meq-${String(id).padStart(6, '0')}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
          this.toast.success('Ficha PDF descargada', 'SIGEM');
        },
        error: () => {
          this.toast.error('No se pudo generar la ficha PDF', 'Error');
        },
      });
  }

  /**
   * Carga la flota del departamento antes de hacer patchValue (evita que el async de onDepartmentChange
   * borre equipo_id o deje el combo de departamento sin coincidencia por carrera de red).
   */
  private cargarEquiposPorDepartamentoYLuego(deptId: number | null, luego: () => void): void {
    if (deptId === null || Number.isNaN(deptId)) {
      luego();
      return;
    }
    this.loading = true;
    this.equipoService.listarTodos({ department_id: deptId }).subscribe({
      next: (equipos) => {
        this.equipos = equipos;
        this.loading = false;
        luego();
      },
      error: () => {
        this.loading = false;
        this.showToast('Error al cargar equipos del departamento', 'error');
        luego();
      },
    });
  }

  /** Normaliza `department_id` del API (número, string o ausente). */
  private departamentoIdDesdeEquipo(equipo?: { department_id?: number | string | null } | null): number | null {
    const v = equipo?.department_id;
    if (v === null || v === undefined) {
      return null;
    }
    if (typeof v === 'string' && v.trim() === '') {
      return null;
    }
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  }

  verMantenimiento(id: number): void {
    this.mantenimientoService.obtenerDetalle(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const raw = res.data;
          this.modalMode = 'view';
          this.mantenimientoSeleccionado = raw;

          const deptId = this.departamentoIdDesdeEquipo(raw.equipo);

          this.cargarEquiposPorDepartamentoYLuego(
            deptId !== null && !Number.isNaN(deptId) ? deptId : null,
            () => {
              this.mantenimientoForm.patchValue({
                ...raw,
                department_id: deptId !== null && !Number.isNaN(deptId) ? deptId : null,
                fecha_programada: raw.fecha_programada?.substring(0, 10),
                fecha_inicio: raw.fecha_inicio?.substring(0, 10),
                fecha_cierre: raw.fecha_cierre?.substring(0, 10),
              });
              this.cargarDetalles(raw.detalles || []);
              this.mantenimientoForm.disable();
              $('#modalMantenimiento').modal('show');
            }
          );
        }
      },
    });
  }

  editarMantenimiento(id: number): void {
    this.mantenimientoService.obtenerDetalle(id).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const raw = res.data;
          this.modalMode = 'edit';
          this.mantenimientoSeleccionado = raw;
          this.mantenimientoForm.enable();

          const deptId = this.departamentoIdDesdeEquipo(raw.equipo);

          this.cargarEquiposPorDepartamentoYLuego(
            deptId !== null && !Number.isNaN(deptId) ? deptId : null,
            () => {
              this.mantenimientoForm.patchValue({
                ...raw,
                department_id: deptId !== null && !Number.isNaN(deptId) ? deptId : null,
                fecha_programada: raw.fecha_programada?.substring(0, 10),
                fecha_inicio: raw.fecha_inicio?.substring(0, 10),
                fecha_cierre: raw.fecha_cierre?.substring(0, 10),
              });
              this.cargarDetalles(raw.detalles || []);

              if (this.isServiceMode) {
                this.mantenimientoForm.get('department_id')?.disable();
                this.mantenimientoForm.get('centro_costo_id')?.disable();
              }
              this.mantenimientoForm.get('estado')?.disable();
              $('#modalMantenimiento').modal('show');
            }
          );
        }
      },
    });
  }

  // Métodos auxiliares permanecen similares pero con robustez añadida
  crearDetalleFormGroup(detalle?: MantenimientoDetalle): FormGroup {
    return this.fb.group({
      id: [detalle?.id || null],
      descripcion: [detalle?.descripcion || '', Validators.required],
      mano_obra_horas: [detalle?.mano_obra_horas || 0],
      mano_obra_costo: [detalle?.mano_obra_costo || 0],
      repuestos_costo: [detalle?.repuestos_costo || 0]
    });
  }

  agregarDetalle(): void { this.detalles.push(this.crearDetalleFormGroup()); }
  eliminarDetalle(index: number): void { this.detalles.removeAt(index); }
  cargarDetalles(detalles: MantenimientoDetalle[]): void {
    this.detalles.clear();
    detalles.forEach(d => this.detalles.push(this.crearDetalleFormGroup(d)));
  }

  calcularTotalDetalle(index: number): number {
    const d = this.detalles.at(index).value;
    return (parseFloat(d.mano_obra_costo) || 0) + (parseFloat(d.repuestos_costo) || 0);
  }

  calcularTotalGeneral(): number {
    return this.detalles.controls.reduce((acc, _, i) => acc + this.calcularTotalDetalle(i), 0);
  }

  guardarMantenimiento(): void {
    if (this.mantenimientoForm.invalid) {
      this.mantenimientoForm.markAllAsTouched();
      return;
    }
    this.submitting = true;
    const data = this.mantenimientoForm.getRawValue();
    const obs = this.modalMode === 'create' ? this.mantenimientoService.crear(data) : this.mantenimientoService.actualizar(data.id, data);
    
    obs.subscribe({
      next: () => {
        this.showToast(`Éxito al ${this.modalMode === 'create' ? 'crear' : 'actualizar'}`, 'success');
        this.cerrarModal();
        this.cargarMantenimientos();
      },
      error: () => { this.submitting = false; this.showToast('Error al procesar solicitud', 'error'); }
    });
  }

  cerrarModal(): void {
    $('#modalMantenimiento').modal('hide');
    this.submitting = false;
    this.mantenimientoForm.enable();
    this.mantenimientoForm.reset();
    this.detalles.clear();
    this.cargarEquiposSegunFiltroDepartamento();
  }

  getFechaHoy(): string { return new Date().toISOString().split('T')[0]; }
  showToast(msg: string, type: any): void { (this.toast as any)[type](msg); }
  getIconoEquipo(tipo: string): string {
    const map: any = { 'camioneta': 'fas fa-truck-pickup', 'camion': 'fas fa-truck', 'motocicleta': 'fas fa-motorcycle' };
    return map[tipo?.toLowerCase()] || 'fas fa-car';
  }
  
  onFilterChange(): void { this.paginacion.currentPage = 1; this.filtros.page = 1; this.cargarMantenimientos(); }
  onPageChange(p: number): void { this.paginacion.currentPage = p; this.filtros.page = p; this.cargarMantenimientos(); }
  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      department_id: null,
      equipo_id: '',
      tipo: '',
      estado: this.activeTab === 'historial' ? 'cerrado' : '',
      per_page: this.cv.defaultPageSize ?? 15,
      page: 1,
      sort: 'id',
      order: 'desc'
    };
    this.cargarEquiposSegunFiltroDepartamento();
    this.cargarMantenimientos();
  }
  onSort(f: string): void { 
    this.filtros.order = this.filtros.sort === f ? (this.filtros.order === 'asc' ? 'desc' : 'asc') : 'desc';
    this.filtros.sort = f;
    this.cargarMantenimientos();
  }
  getSortIconClass(f: string): string { return this.filtros.sort !== f ? 'fas fa-sort' : (this.filtros.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down'); }

  /** Paginación numérica (patrón valorizaciones / design system). */
  getPaginationPages(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;
    if (!last || last < 1) {
      return [1];
    }
    if (last <= 7) {
      for (let i = 1; i <= last; i++) {
        pages.push(i);
      }
    } else if (current <= 3) {
      for (let i = 1; i <= 4; i++) {
        pages.push(i);
      }
      pages.push(-1);
      pages.push(last);
    } else if (current >= last - 2) {
      pages.push(1);
      pages.push(-1);
      for (let i = last - 3; i <= last; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      pages.push(-1);
      for (let i = current - 1; i <= current + 1; i++) {
        pages.push(i);
      }
      pages.push(-1);
      pages.push(last);
    }
    return pages;
  }

  cambiarEstado(mant: any, estado: 'programado' | 'en_proceso' | 'cerrado' | 'cancelado'): void {
      if (confirm('¿Confirmar cambio de estado?')) {
          const updateData: any = { 
            estado, 
            fecha_inicio: estado === 'en_proceso' ? this.getFechaHoy() : undefined 
          };
          this.mantenimientoService.actualizar(mant.id, updateData).subscribe(() => this.cargarMantenimientos());
      }
  }

  completarMantenimiento(id: number): void {
      const costo = prompt('Costo real:');
      if (costo) this.mantenimientoService.completar(id, { costo_real: parseFloat(costo) }).subscribe(() => this.cargarMantenimientos());
  }

  confirmarEliminar(id: number): void {
      if (confirm('¿Eliminar registro?')) this.mantenimientoService.eliminar(id).subscribe(() => this.cargarMantenimientos());
  }

  abrirNuevoDesdeAlerta(params: any): void {
    this.abrirModalNuevo();
    this.mantenimientoForm.patchValue({ equipo_id: parseInt(params['equipo_id']), estado: 'en_proceso' });
  }
}
