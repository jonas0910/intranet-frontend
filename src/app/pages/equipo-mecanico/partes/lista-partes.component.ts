import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ParteService } from '../services/parte.service';
import { EquipoService } from '../services/equipo.service';
import { OperadorService, Operador } from '../services/operador.service';
import { Parte, Equipo, ParteDetalle } from '../models/equipo.model';
import { environment } from '../../../../environments/environment';
import { NotificationCenterService, NotificationType } from '../../../services/notification-center.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';
import { MechanicalDepartmentService } from '../services/mechanical-department.service';
import { ActivatedRoute, Router } from '@angular/router';

declare var $: any;

@Component({
  selector: 'app-lista-partes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, SystemLayoutComponent],
  templateUrl: './lista-partes.component.html',
  styleUrls: ['./lista-partes.component.scss']
})
export class ListaPartesComponent implements OnInit {
  Math = Math;
  partes: Parte[] = [];
  equipos: Equipo[] = [];
  operadores: Operador[] = [];
  centrosCosto: any[] = [];
  bienes: any[] = [];
  activeTab: 'actividades' | 'recursos' = 'actividades';
  loading = false;
  /** Filtros visibles por defecto (Equipo / fechas no quedan ocultos tras «Mostrar filtros»). */
  isFiltersCollapsed = false;

  subtitleItems = [
    { label: 'Registro y control de consumo de combustible', icon: 'fas fa-gas-pump' },
  ];

  // Filtros y Paginación
  filtros: any = {
    search: '',
    equipo_id: '',
    operador_id: '',
    fecha_inicio: '',
    fecha_fin: '',
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
  parteForm: FormGroup;
  modalMode: 'create' | 'edit' | 'view' = 'create';
  parteSeleccionado: Parte | null = null;
  submitting = false;

  isServiceMode = false;
  fixedCostCenterId?: number;

  constructor(
    private parteService: ParteService,
    private equipoService: EquipoService,
    private operadorService: OperadorService,
    private mechanicalDeptService: MechanicalDepartmentService,
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private notificationService: NotificationCenterService,
    private dsService: DesignSystemService,
    private toast: ToastService
  ) {
    this.parteForm = this.fb.group({
      id: [null],
      equipo_id: [null, Validators.required],
      operador_id: [null, Validators.required],
      fecha: [this.getFechaHoy(), Validators.required],
      kilometraje_inicio: [0, [Validators.required, Validators.min(0)]],
      kilometraje_fin: [0, [Validators.required, Validators.min(0)]],
      horas_inicio: [0, [Validators.required, Validators.min(0)]],
      horas_fin: [0, [Validators.required, Validators.min(0)]],
      observaciones: [''],
      estado: ['borrador'],
      fecha_aprobacion: [null],
      aprobado_por: [null],
      firma_digital: [null],
      motivo_rechazo: [null],
      centro_costo_id: [null],
      detalles: this.fb.array([]),
      recursos: this.fb.array([])
    });

    // Suscribirse a cambios de equipo para auto-rellenar
    this.parteForm.get('equipo_id')?.valueChanges.subscribe(equipoId => {
      this.onEquipoChange(equipoId);
    });
  }

  onEquipoChange(equipoId: number): void {
    if (!equipoId) return;

    const equipo = this.equipos.find(e => e.id === equipoId);
    if (equipo) {
      this.parteForm.patchValue({
        kilometraje_inicio: equipo.odometro_actual,
        horas_inicio: equipo.horas_motor_actual,
        kilometraje_fin: equipo.odometro_actual,
        horas_fin: equipo.horas_motor_actual
      });
    }
  }

  get detalles(): FormArray {
    return this.parteForm.get('detalles') as FormArray;
  }

  get recursos(): FormArray {
    return this.parteForm.get('recursos') as FormArray;
  }

  crearRecursoFormGroup(datos?: any): FormGroup {
    // Detectamos tipo basándonos en si ya trae cantidad o litros
    const tipo = datos?.tipo_recurso || (datos?.litros !== undefined ? 'combustible' : 'repuesto');
    return this.fb.group({
      id: [datos?.id || null],
      tipo_recurso: [tipo, Validators.required],
      id_bien: [datos?.id_bien || null, Validators.required],
      cantidad: [datos?.cantidad || datos?.litros || 1, [Validators.required, Validators.min(0.01)]],
      vale: [datos?.vale || ''],
      origen: [datos?.origen || 'almacen'],
      costo_unitario: [datos?.costo_unitario || 0, [Validators.required, Validators.min(0)]],
      costo_total: [datos?.costo_total || 0],
      descripcion: [datos?.descripcion || ''],
      unidad_medida: [datos?.unidad_medida || datos?.bien?.unidad?.nombre || '']
    });
  }

  agregarRecurso(): void {
    this.recursos.push(this.crearRecursoFormGroup());
  }

  eliminarRecurso(index: number): void {
    this.recursos.removeAt(index);
  }

  /** Configuración CRUD (tema naranja/marrón para equipo-mecanico si existiera, sino default) */
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('equipo-mecanico');
  }

  onFilterChange(): void {
    this.paginacion.currentPage = 1;
    this.filtros.page = 1;
    this.cargarPartes();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.paginacion.currentPage = page;
      this.filtros.page = page;
      this.cargarPartes();
    }
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      equipo_id: '',
      operador_id: '',
      fecha_inicio: '',
      fecha_fin: '',
      estado: '',
      per_page: 15,
      page: 1
    };
    this.cargarPartes();
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
    this.isServiceMode = this.router.url.includes('/servicios/');
    
    this.cargarEquipos();
    this.cargarOperadores();
    this.cargarCentrosCosto();
    this.cargarBienes();
    this.cargarPartes();

    if (this.isServiceMode) {
      this.mechanicalDeptService.getDepartmentInfo().subscribe(res => {
        if (res.success && res.data) {
          this.fixedCostCenterId = res.data.centro_costo_id;
        }
      });
    }
  }

  onSort(field: string): void {
    if (this.filtros.sort === field) {
      this.filtros.order = this.filtros.order === 'asc' ? 'desc' : 'asc';
    } else {
      this.filtros.sort = field;
      this.filtros.order = 'desc';
    }
    this.cargarPartes();
  }

  getSortIconClass(field: string): string {
    if (this.filtros.sort !== field) return 'fas fa-sort text-muted';
    return this.filtros.order === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
  }

  /** API Laravel serializa relaciones en snake_case */
  private detallesDe(p: any): ParteDetalle[] {
    return p?.detalles ?? [];
  }

  private consumosCombustibleDe(p: any): any[] {
    return p?.consumos_combustible ?? p?.consumosCombustible ?? [];
  }

  private consumosRepuestosDe(p: any): any[] {
    return p?.consumos_repuestos ?? p?.consumosRepuestos ?? [];
  }

  resumenActividades(parte: Parte): string {
    const d = this.detallesDe(parte);
    if (!d.length) {
      return 'Sin actividades';
    }
    const h = d.reduce((s, x) => s + (+x.horas || 0), 0);
    const primera = (d[0].descripcion || '').trim();
    const corta = primera.length > 52 ? primera.slice(0, 50) + '…' : primera;
    const extra = d.length > 1 ? ` (+${d.length - 1})` : '';
    return `${d.length} act. · ${h.toFixed(1)} h — ${corta}${extra}`;
  }

  resumenConsumos(parte: Parte): string {
    const cc = this.consumosCombustibleDe(parte);
    const cr = this.consumosRepuestosDe(parte);
    const litros = cc.reduce((s, x) => s + (+x.litros || 0), 0);
    const parts: string[] = [];
    if (litros > 0) {
      parts.push(`Comb. ${litros.toFixed(1)} L`);
    }
    if (cr.length > 0) {
      parts.push(`Rep. ${cr.length}`);
    }
    return parts.length ? parts.join(' · ') : 'Sin consumos';
  }

  cargarEquipos(): void {
    this.equipoService.listarTodos().subscribe({
      next: (equipos) => {
        this.equipos = equipos;
      }
    });
  }

  cargarOperadores(): void {
    this.operadorService.obtenerDisponibles().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.operadores = response.data;
        }
      },
      error: (error) => console.error('Error al cargar operadores:', error)
    });
  }

  cargarCentrosCosto(): void {
    this.http.get<any>(`${environment.apiUrl}/centros-costo`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.centrosCosto = response.data;
        }
      }
    });
  }

  cargarBienes(): void {
    // Los bienes vendrán filtrados por department_id desde el backend gracias al Global Scope
    this.http.get<any>(`${environment.apiUrl}/v1/almacen/bienes`).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.bienes = response.data;
        }
      },
      error: () => console.warn('No se pudo cargar el catálogo de bienes')
    });
  }

  cargarPartes(): void {
    this.loading = true;
    const f = this.filtros;
    const apiFiltros: Record<string, string | number> = {
      per_page: f.per_page,
      page: f.page,
    };
    if (f.equipo_id) apiFiltros['equipo_id'] = f.equipo_id;
    if (f.operador_id) apiFiltros['operador_id'] = f.operador_id;
    if (f.estado) apiFiltros['estado'] = f.estado;
    if (f.fecha_inicio) apiFiltros['fecha_desde'] = f.fecha_inicio;
    if (f.fecha_fin) apiFiltros['fecha_hasta'] = f.fecha_fin;

    this.parteService.listar(apiFiltros, f.per_page).subscribe({
      next: (response) => {
        console.log('✅ Respuesta recibida [Partes]:', response);

        if (response.success && response.data) {
          const rawData: any = response.data;

          if (rawData.data && Array.isArray(rawData.data)) {
            this.partes = rawData.data;
            this.paginacion = {
              currentPage: rawData.current_page,
              lastPage: rawData.last_page,
              total: rawData.total,
              perPage: rawData.per_page
            };
          } else {
            this.partes = Array.isArray(rawData) ? rawData : [];
            this.paginacion.total = this.partes.length;
          }

          console.log('📊 Partes cargados:', this.partes.length);
          this.loading = false;
        } else {
          this.loading = false;
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar partes:', error);
        this.loading = false;
        this.showToast('Error al cargar la lista de partes', 'error');
      }
    });
  }

  crearDetalleFormGroup(detalle?: ParteDetalle): FormGroup {
    return this.fb.group({
      id: [detalle?.id || null],
      centro_costo_id: [detalle?.centro_costo_id || null, Validators.required],
      tipo: [detalle?.tipo || 'trabajo', Validators.required],
      descripcion: [detalle?.descripcion || '', Validators.required],
      horas: [detalle?.horas || 0, [Validators.required, Validators.min(0)]]
    });
  }

  agregarDetalle(): void {
    const group = this.crearDetalleFormGroup();
    if (this.isServiceMode && this.fixedCostCenterId) {
      group.get('centro_costo_id')?.setValue(this.fixedCostCenterId);
    }
    this.detalles.push(group);
  }

  eliminarDetalle(index: number): void {
    this.detalles.removeAt(index);
  }

  cargarDetalles(detalles: ParteDetalle[]): void {
    this.detalles.clear();
    if (detalles && detalles.length > 0) {
      detalles.forEach(detalle => {
        this.detalles.push(this.crearDetalleFormGroup(detalle));
      });
    }
  }

  onBienChange(index: number, group: any): void {
    const bienId = group.get('id_bien')?.value;
    const bien = this.bienes.find(b => b.id_bien == bienId);
    if (bien) {
      // Lógica de detección: si es combustible o lubricante
      const name = (bien.nombre || '').toLowerCase();
      const isFuel = name.includes('diesel') || name.includes('gasoh') || name.includes('aceite') || name.includes('lubricante');
      
      group.patchValue({
        tipo_recurso: isFuel ? 'combustible' : 'repuesto',
        descripcion: bien.nombre,
        costo_unitario: bien.precio_unitario || 0,
        unidad_medida: bien.unidad?.nombre || 'UND'
      });
      this.recalcurarSubtotal(group, 'cantidad');
    }
  }



  recalcurarSubtotal(group: any, quantityField: string): void {
    const qty = group.get(quantityField)?.value || 0;
    const unit = group.get('costo_unitario')?.value || 0;
    group.patchValue({ costo_total: qty * unit });
  }

  calcularTotalHoras(): number {
    let total = 0;
    for (let i = 0; i < this.detalles.length; i++) {
      const detalle = this.detalles.at(i);
      total += parseFloat(detalle.get('horas')?.value || 0);
    }
    return total;
  }

  abrirModalNuevo(): void {
    this.modalMode = 'create';
    this.parteSeleccionado = null;
    this.parteForm.enable();
    this.parteForm.reset({
      fecha: this.getFechaHoy(),
      estado: 'borrador',
      kilometraje_inicio: 0,
      horas_inicio: 0,
      horas_fin: 0,
    });
    this.detalles.clear();
    this.recursos.clear();
    this.activeTab = 'actividades';

    if (this.isServiceMode && this.fixedCostCenterId) {
      this.parteForm.get('centro_costo_id')?.setValue(this.fixedCostCenterId);
    }

    $('#modalParte').modal('show');
  }

  verParte(id: number): void {
    // Cargar el detalle completo del parte con sus detalles
    this.parteService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const parte = response.data;
          this.modalMode = 'view';
          this.parteSeleccionado = parte;

          const formData = {
            ...parte,
            fecha: parte.fecha ? parte.fecha.toString().substring(0, 10) : ''
          };

          this.parteForm.patchValue(formData);
          this.cargarDetalles(parte.detalles || []);
          
          this.recursos.clear();
          if (parte.consumos_combustible) {
            parte.consumos_combustible.forEach((c: any) => this.recursos.push(this.crearRecursoFormGroup({ ...c, tipo_recurso: 'combustible' })));
          }

          if (parte.consumos_repuestos) {
            parte.consumos_repuestos.forEach((c: any) => this.recursos.push(this.crearRecursoFormGroup({ ...c, tipo_recurso: 'repuesto' })));
          }

          this.parteForm.disable();
          $('#modalParte').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar el detalle del parte', 'error');
      }
    });
  }

  editarParte(id: number): void {
    // Cargar el detalle completo del parte con sus detalles
    this.parteService.obtenerDetalle(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const parte = response.data;
          this.modalMode = 'edit';
          this.parteSeleccionado = parte;
          this.parteForm.enable();

          const formData = {
            ...parte,
            fecha: parte.fecha ? parte.fecha.toString().substring(0, 10) : ''
          };

          this.parteForm.patchValue(formData);
          this.cargarDetalles(parte.detalles || []);

          this.recursos.clear();
          if (parte.consumos_combustible) {
            parte.consumos_combustible.forEach((c: any) => this.recursos.push(this.crearRecursoFormGroup({ ...c, tipo_recurso: 'combustible' })));
          }

          if (parte.consumos_repuestos) {
            parte.consumos_repuestos.forEach((c: any) => this.recursos.push(this.crearRecursoFormGroup({ ...c, tipo_recurso: 'repuesto' })));
          }

          if (this.isServiceMode && this.fixedCostCenterId) {
            this.parteForm.get('centro_costo_id')?.setValue(this.fixedCostCenterId);
          }

          $('#modalParte').modal('show');
        }
      },
      error: () => {
        this.showToast('Error al cargar el parte para editar', 'error');
      }
    });
  }

  guardarParte(): void {
    if (this.parteForm.invalid) {
      this.parteForm.markAllAsTouched();
      return;
    }

    this.submitting = true;
    const formData = this.parteForm.getRawValue();
    const equipoId = formData.equipo_id;
    const nuevoKilometraje = formData.kilometraje_fin;
    const nuevasHoras = formData.horas_fin;

    // Asegurar que el centro de costo principal se asigne del primer detalle
    if (!formData.centro_costo_id && formData.detalles && formData.detalles.length > 0) {
      formData.centro_costo_id = formData.detalles[0].centro_costo_id;
    }

    // Adaptar estructura para el backend (separar por tipos)
    const payload = {
      ...formData,
      consumos: {
        combustible: formData.recursos
          .filter((r: any) => r.tipo_recurso === 'combustible')
          .map((r: any) => ({ ...r, litros: r.cantidad, tipo: 'diesel' })), // TODO: mapear tipo real de combustible
        repuestos: formData.recursos
          .filter((r: any) => r.tipo_recurso === 'repuesto')
      }
    };

    const request = this.modalMode === 'create'
      ? this.parteService.crear(payload)
      : this.parteService.actualizar(formData.id, payload);

    request.subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast(
            this.modalMode === 'create' ? 'Parte creado exitosamente' : 'Parte actualizado exitosamente',
            'success'
          );

          if (equipoId && nuevoKilometraje) {
            this.verificarMantenimientos(equipoId, nuevoKilometraje, nuevasHoras);
          }

          this.cerrarModal();
          this.cargarPartes();
        }
        this.submitting = false;
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al guardar el parte', 'error');
        this.submitting = false;
      }
    });
  }

  verificarMantenimientos(equipoId: number, kilometraje: number, horas: number): void {
    const baseUrl = environment.apiUrl.replace('/api', '') + '/api/equipo-mecanico';

    this.http.get<any>(`${baseUrl}/controles-mantenimiento?equipo_id=${equipoId}`, { withCredentials: true }).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          const rawData = response.data.data || response.data;
          const controles = Array.isArray(rawData) ? rawData : [];

          const equipo = this.equipos.find(e => e.id === equipoId);
          const equipoNombre = equipo ? `${equipo.codigo_interno} - ${equipo.marca} ${equipo.modelo}` : `Equipo #${equipoId}`;

          controles.forEach((control: any) => {
            if (control.estado === 'realizado') return;

            let mensaje = '';
            let prioridad: 'low' | 'normal' | 'high' | 'urgent' = 'normal';

            if (control.kilometraje_proximo && kilometraje >= control.kilometraje_proximo - 500) {
              const kmRestantes = control.kilometraje_proximo - kilometraje;
              if (kmRestantes <= 0) {
                mensaje = `Mantenimiento URGENTE: ${control.tipo_mantenimiento?.nombre} requiere atención inmediata. Kilometraje actual: ${kilometraje} km`;
                prioridad = 'urgent';
              } else if (kmRestantes <= 200) {
                mensaje = `Mantenimiento próximo: ${control.tipo_mantenimiento?.nombre} en ${equipoNombre}. Faltan ${kmRestantes} km`;
                prioridad = 'high';
              }
            }

            if (control.horometro_proximo && horas >= control.horometro_proximo - 50) {
              const horasRestantes = control.horometro_proximo - horas;
              if (horasRestantes <= 0) {
                mensaje = `Mantenimiento URGENTE: ${control.tipo_mantenimiento?.nombre} requiere atención inmediata. Horas actuales: ${horas}`;
                prioridad = 'urgent';
              } else if (horasRestantes <= 20) {
                mensaje = `Mantenimiento próximo: ${control.tipo_mantenimiento?.nombre} en ${equipoNombre}. Faltan ${horasRestantes} horas`;
                prioridad = 'high';
              }
            }

            if (control.fecha_proxima) {
              const fechaProx = new Date(control.fecha_proxima);
              const hoy = new Date();
              const diffDias = Math.ceil((fechaProx.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

              if (diffDias <= 0) {
                mensaje = `Mantenimiento VENCIDO: ${control.tipo_mantenimiento?.nombre} en ${equipoNombre}. Pasaron ${Math.abs(diffDias)} días`;
                prioridad = 'urgent';
              } else if (diffDias <= 7) {
                mensaje = `Mantenimiento próximo: ${control.tipo_mantenimiento?.nombre} en ${equipoNombre}. Faltan ${diffDias} días`;
                prioridad = 'high';
              }
            }

            if (mensaje) {
              this.crearNotificacionMantenimiento(
                `${control.tipo_mantenimiento?.nombre || 'Mantenimiento'}`,
                mensaje,
                prioridad,
                equipoId
              );
            }
          });
        }
      },
      error: (error) => {
        console.error('Error al verificar mantenimientos:', error);
      }
    });
  }

  crearNotificacionMantenimiento(titulo: string, mensaje: string, prioridad: 'low' | 'normal' | 'high' | 'urgent', equipoId: number): void {
    const notification = {
      id: `mant-${equipoId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: NotificationType.MAINTENANCE,
      title: titulo,
      message: mensaje,
      icon: 'fas fa-wrench',
      iconColor: '#fd7e14',
      timestamp: new Date(),
      read: false,
      actionUrl: '/equipo-mecanico/control-mantenimiento',
      actionLabel: 'Ver',
      priority: prioridad
    };

    this.notificationService.addNotification(notification);
  }

  aprobarParte(id: number): void {
    if (!confirm('¿Está seguro de aprobar y firmar este parte diario?')) return;

    this.parteService.aprobar(id).subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast('Parte aprobado correctamente', 'success');
          this.cargarPartes();
        }
      },
      error: () => {
        this.showToast('Error al aprobar el parte', 'error');
      }
    });
  }

  rechazarParte(id: number): void {
    const motivo = prompt('Motivo del rechazo:');
    if (!motivo) return;

    this.parteService.rechazar(id, motivo).subscribe({
      next: (response) => {
        if (response.success) {
          this.showToast('Parte rechazado', 'success');
          this.cargarPartes();
        }
      },
      error: (err) => {
        this.showToast(err.error?.message || 'Error al rechazar el parte', 'error');
      }
    });
  }

  confirmarEliminar(id: number): void {
    if (confirm('¿Está seguro de eliminar este parte diario?')) {
      this.parteService.eliminar(id).subscribe({
        next: (response) => {
          if (response.success) {
            this.showToast('Parte eliminado exitosamente', 'success');
            this.cargarPartes();
          }
        },
        error: (err) => {
          this.showToast(err.error?.message || 'Error al eliminar el parte', 'error');
        }
      });
    }
  }

  cerrarModal(): void {
    $('#modalParte').modal('hide');
    this.parteForm.enable();
    this.parteForm.reset();
    this.detalles.clear();
    this.recursos.clear();
    this.parteSeleccionado = null;
  }

  getFechaHoy(): string {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  }

  capitalize(text: string): string {
    return text ? text.charAt(0).toUpperCase() + text.slice(1).replace('_', ' ') : '';
  }

  showToast(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success'): void {
    switch (type) {
      case 'success': this.toast.success(message, 'Éxito'); break;
      case 'error': this.toast.error(message, 'Error'); break;
      case 'warning': this.toast.warning(message, 'Atencon'); break;
      case 'info': this.toast.info(message, 'Información'); break;
    }
  }
  getBadgeEstado(estado: string): string {
    const map: any = {
      'pendiente': 'badge-warning',
      'aprobado': 'badge-success',
      'rechazado': 'badge-danger',
      'borrador': 'badge-secondary'
    };
    return map[estado] || 'badge-secondary';
  }

  getIconoEquipo(tipo: string): string {
    const iconMap: any = {
      'camioneta': 'fas fa-truck-pickup',
      'camion': 'fas fa-truck',
      'volquete': 'fas fa-truck-moving',
      'motocicleta': 'fas fa-motorcycle',
      'tractor': 'fas fa-tractor',
      'barredora': 'fas fa-broom',
      'cisterna': 'fas fa-faucet',
      'retroexcavadora': 'fas fa-snowplow',
      'rodillo': 'fas fa-compact-disc'
    };
    return iconMap[(tipo || '').toLowerCase()] || 'fas fa-car';
  }

  getNombreCentroCosto(id: number | null): string {
    if (!id) return '';
    const cc = this.centrosCosto.find(c => c.id == id);
    return cc ? `${cc.code} - ${cc.name}` : '';
  }
}
