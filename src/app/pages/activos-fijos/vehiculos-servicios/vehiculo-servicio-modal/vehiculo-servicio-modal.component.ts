import { Component, EnvironmentInjector, inject, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import {
  PlanItemMantenimiento,
  ProgramacionPlanPersonalizado,
  VehiculoServicioService
} from '../../services/vehiculo-servicio.service';
import { ToastService } from '../../../../services/toast.service';
import { PlanItemsModalComponent } from '../plan-items-modal/plan-items-modal.component';

@Component({
  selector: 'app-vehiculo-servicio-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './vehiculo-servicio-modal.component.html',
  styleUrls: ['./vehiculo-servicio-modal.component.scss']
})
export class VehiculoServicioModalComponent implements OnInit {
  /**
   * NgbModal en contenido de modal a veces no se inyecta por constructor; usamos inject() + respaldo al raíz.
   */
  private readonly ngbModalOpt = inject(NgbModal, { optional: true });
  private readonly envInjector = inject(EnvironmentInjector);

  @Input() isEdit = false;
  @Input() isReadOnly = false;
  @Input() activo: any = null;
  /** Solo pestaña programación (activos internos y externos del departamento) */
  @Input() soloProgramacion = false;

  activeTab: 'info' | 'mantenimientos' = 'info';

  form!: FormGroup;
  saving = false;

  tiposMantenimiento: any[] = [];
  controlesMantenimiento: any[] = [];
  controlesSeleccionados: number[] = [];
  /** Planes definidos por km, horómetro y/o días */
  programacionPersonalizada: ProgramacionPlanPersonalizado[] = [];

  tiposVehiculo = [
    { value: 'camioneta', label: 'Camioneta' },
    { value: 'compactador', label: 'Compactador' },
    { value: 'volquete', label: 'Volquete' },
    { value: 'moto', label: 'Motocicleta' },
    { value: 'auto', label: 'Automóvil' },
    { value: 'maquinaria', label: 'Maquinaria' },
    { value: 'equipo', label: 'Equipo / Herramienta' }
  ];

  estadosVehiculo = [
    { value: 'operativo', label: 'Operativo' },
    { value: 'mantenimiento', label: 'Mantenimiento' },
    { value: 'fuera_servicio', label: 'Fuera de Servicio' }
  ];

  constructor(
    public activeModal: NgbActiveModal,
    private fb: FormBuilder,
    private service: VehiculoServicioService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    if (this.soloProgramacion) {
      this.activeTab = 'mantenimientos';
      this.form = this.fb.group({});
    } else {
      this.initForm();
    }
    this.loadMantenimientoData();
    if (this.activo) {
      if (!this.soloProgramacion) {
        this.patchForm();
      }
      this.loadExistentes();
      if (this.isReadOnly && !this.soloProgramacion) {
        this.form.disable();
      }
    }
  }

  loadMantenimientoData(): void {
    this.service.listarTiposMantenimiento().subscribe({
      next: (res) => {
        if (res.success) {
          this.tiposMantenimiento = res.data;
        }
      }
    });
  }

  loadExistentes(): void {
    if (!this.activo?.id) {
      return;
    }
    this.service.listarControlesMantenimiento(this.activo.id).subscribe({
      next: (res) => {
        if (!res.success) {
          return;
        }
        const raw = res.data?.data ?? res.data;
        const list = Array.isArray(raw) ? raw : [];
        this.controlesMantenimiento = list;

        const idsCat: number[] = [];
        this.programacionPersonalizada = [];
        /** Un plan por tipo AF-PERS (mismo tipo puede tener varios controles si hubo duplicados en BD) */
        const vistosPers = new Set<string>();

        for (const c of list) {
          const tipo = c.tipo_mantenimiento || c.tipoMantenimiento;
          const codigo = tipo?.codigo || '';
          if (codigo.startsWith('AF-PERS-')) {
            const dedupeKey = tipo?.id != null ? `id:${tipo.id}` : codigo;
            if (vistosPers.has(dedupeKey)) {
              continue;
            }
            vistosPers.add(dedupeKey);
            this.programacionPersonalizada.push({
              nombre: tipo.nombre || 'Plan',
              frecuencia_kilometros: tipo.frecuencia_kilometros ?? null,
              frecuencia_horas: tipo.frecuencia_horas ?? null,
              frecuencia_dias: tipo.frecuencia_dias ?? null,
              items: this.mapPlanItemsFromTipo(tipo)
            });
          } else if (tipo?.id) {
            idsCat.push(tipo.id);
          }
        }
        this.controlesSeleccionados = [...new Set(idsCat)];
      }
    });
  }

  agregarPlanPersonalizado(): void {
    this.programacionPersonalizada.push({
      nombre: '',
      frecuencia_kilometros: null,
      frecuencia_horas: null,
      frecuencia_dias: null,
      items: []
    });
  }

  /** Modal secundario: actividades y elementos de cambio del periodo */
  abrirModalElementosPlan(i: number): void {
    const p = this.programacionPersonalizada[i];
    if (!p) {
      return;
    }
    if (this.isReadOnly && (p.items?.length ?? 0) === 0) {
      return;
    }

    const modalSvc = this.ngbModalOpt ?? this.envInjector.get(NgbModal);
    if (!modalSvc) {
      this.toast.error('No se pudo abrir el editor de elementos. Recargue la página.');
      return;
    }
    const ref = modalSvc.open(PlanItemsModalComponent, {
      size: 'lg',
      centered: true,
      scrollable: true,
      backdrop: 'static'
    });
    const comp = ref.componentInstance as PlanItemsModalComponent;
    comp.cargar(
      this.textoResumenPlan(p),
      [...(p.items || [])].map((x) => ({ ...x })),
      this.isReadOnly
    );

    void ref.result.then(
      (result: PlanItemMantenimiento[]) => {
        if (!this.isReadOnly) {
          this.programacionPersonalizada[i].items = result;
        }
      },
      () => {}
    );
  }

  /**
   * Compatibilidad: si el navegador o una plantilla en caché sigue llamando al panel
   * expandible antiguo, redirige al mismo flujo que el modal de elementos.
   */
  togglePanelElementosPlan(i: number): void {
    this.abrirModalElementosPlan(i);
  }

  /** Compatibilidad: el panel inline ya no existe; siempre false. */
  panelElementosPlanAbierto(_i: number): boolean {
    return false;
  }

  private textoResumenPlan(p: ProgramacionPlanPersonalizado): string {
    const nombre = (p.nombre || '').trim() || '(Sin nombre)';
    const partes: string[] = [];
    if (p.frecuencia_kilometros != null && +p.frecuencia_kilometros > 0) {
      partes.push(`${p.frecuencia_kilometros} km`);
    }
    if (p.frecuencia_horas != null && +p.frecuencia_horas > 0) {
      partes.push(`${p.frecuencia_horas} h`);
    }
    if (p.frecuencia_dias != null && +p.frecuencia_dias > 0) {
      partes.push(`${p.frecuencia_dias} días`);
    }
    const freq = partes.length ? ` · ${partes.join(' · ')}` : '';
    return `${nombre}${freq}`;
  }

  private mapPlanItemsFromTipo(tipo: any): PlanItemMantenimiento[] {
    const raw = tipo?.plan_items ?? tipo?.planItems ?? [];
    if (!Array.isArray(raw)) {
      return [];
    }
    return raw.map((it: any) => ({
      tipo_item: it.tipo_item === 'elemento_cambio' ? 'elemento_cambio' : 'actividad',
      descripcion: it.descripcion ?? '',
      cantidad: it.cantidad != null && it.cantidad !== '' ? +it.cantidad : null,
      unidad: it.unidad ?? null
    }));
  }

  quitarPlanPersonalizado(index: number): void {
    this.programacionPersonalizada.splice(index, 1);
  }

  /** Filtra filas con nombre y al menos una frecuencia > 0; deduplica por nombre (mismo slug que el backend AF-PERS) */
  private planesValidos(): ProgramacionPlanPersonalizado[] {
    const vistos = new Set<string>();
    const out: ProgramacionPlanPersonalizado[] = [];
    for (const p of this.programacionPersonalizada) {
      const nombre = (p.nombre || '').trim();
      if (!nombre) {
        continue;
      }
      const km = +(p.frecuencia_kilometros ?? 0);
      const hr = +(p.frecuencia_horas ?? 0);
      const d = +(p.frecuencia_dias ?? 0);
      if (!(km > 0 || hr > 0 || d > 0)) {
        continue;
      }
      const clave = nombre.toLowerCase().slice(0, 80);
      if (vistos.has(clave)) {
        continue;
      }
      vistos.add(clave);
      const itemsRaw = p.items ?? [];
      const items: PlanItemMantenimiento[] = itemsRaw
        .filter((it) => (it.descripcion || '').trim().length > 0)
        .map((it) => ({
          tipo_item: it.tipo_item === 'elemento_cambio' ? 'elemento_cambio' : 'actividad',
          descripcion: (it.descripcion || '').trim(),
          cantidad: this.normalizarCantidadPlanItem(it.cantidad),
          unidad: (it.unidad || '').trim() || null
        }));
      out.push({
        nombre,
        frecuencia_kilometros: p.frecuencia_kilometros ?? null,
        frecuencia_horas: p.frecuencia_horas ?? null,
        frecuencia_dias: p.frecuencia_dias ?? null,
        items
      });
    }
    return out;
  }

  /** Acepta número o texto desde inputs; evita comparar number con '' en tipos estrictos */
  private normalizarCantidadPlanItem(
    v: number | string | null | undefined
  ): number | null {
    if (v === null || v === undefined) {
      return null;
    }
    if (typeof v === 'string' && v.trim() === '') {
      return null;
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  toggleControl(tipoId: number): void {
    const index = this.controlesSeleccionados.indexOf(tipoId);
    if (index === -1) {
      this.controlesSeleccionados.push(tipoId);
    } else {
      this.controlesSeleccionados.splice(index, 1);
    }
  }

  isControlChecked(tipoId: number): boolean {
    return this.controlesSeleccionados.includes(tipoId);
  }

  initForm(): void {
    this.form = this.fb.group({
      placa: ['', [Validators.maxLength(20)]],
      codigo_patrimonial: [''],
      tipo: ['camioneta', Validators.required],
      marca: ['', Validators.required],
      modelo: ['', Validators.required],
      anio: [new Date().getFullYear(), [Validators.min(1900), Validators.max(2100)]],
      color: [''],
      odometro_actual: [0, [Validators.min(0)]],
      horas_motor_actual: [0, [Validators.min(0)]],
      serie: [''],
      dimensiones: [''],
      numero_motor: [''],
      numero_chasis: [''],
      estado: ['operativo', Validators.required],
      valor_adquisicion: [0],
      fecha_soat: [null],
      fecha_revision_tecnica: [null],
      fecha_ultimo_mantenimiento: [null],
      fecha_proximo_mantenimiento: [null],
      observaciones: [''],
      categoria_id: [3],
      documento_adquisicion: ['']
    });

    if (!this.isReadOnly) {
      this.setValidations();
    }
  }

  setValidations(): void {
    const placaControl = this.form.get('placa');
    if (this.isVehicle) {
      placaControl?.setValidators([Validators.required, Validators.maxLength(20)]);
    } else {
      placaControl?.clearValidators();
    }
    placaControl?.updateValueAndValidity();
  }

  patchForm(): void {
    const data = { ...this.activo };
    this.form.patchValue({
      ...data,
      fecha_soat: this.formatDate(data.fecha_soat),
      fecha_revision_tecnica: this.formatDate(data.fecha_revision_tecnica),
      fecha_ultimo_mantenimiento: this.formatDate(data.fecha_ultimo_mantenimiento),
      fecha_proximo_mantenimiento: this.formatDate(data.fecha_proximo_mantenimiento)
    });
  }

  save(): void {
    if (this.soloProgramacion) {
      this.guardarSoloProgramacion();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.activeTab = 'info';
      return;
    }

    this.saving = true;
    const data: any = { ...this.form.value };
    data.controles_manuales = JSON.stringify(this.controlesSeleccionados);
    data.programacion_personalizada = this.planesValidos();

    const request = this.isEdit
      ? this.service.actualizarVehiculo(this.activo.id, data)
      : this.service.registrarVehiculo(data);

    request.subscribe({
      next: (res) => {
        this.saving = false;
        if (res.success) {
          this.toast.success(this.isEdit ? 'Vehículo actualizado' : 'Vehículo registrado');
          this.activeModal.close(true);
        }
      },
      error: (err) => {
        this.saving = false;
        const msg = err.error?.message || 'Error al guardar el vehículo';
        this.toast.error(msg);
      }
    });
  }

  private guardarSoloProgramacion(): void {
    if (!this.activo?.id) {
      return;
    }
    this.saving = true;
    this.service
      .syncProgramacionMantenimiento(this.activo.id, {
        controles_manuales: [...new Set(this.controlesSeleccionados)],
        programacion_personalizada: this.planesValidos()
      })
      .subscribe({
        next: (res) => {
          this.saving = false;
          if (res.success) {
            this.toast.success('Programación de mantenimiento guardada');
            this.activeModal.close(true);
          }
        },
        error: (err) => {
          this.saving = false;
          this.toast.error(err.error?.message || 'Error al guardar la programación');
        }
      });
  }

  formatDate(dateStr: string): string | null {
    if (!dateStr) {
      return null;
    }
    return dateStr.split('T')[0];
  }

  get isVehicle(): boolean {
    if (!this.activo) {
      return true;
    }
    const mechanicalTypes = ['camioneta', 'compactador', 'volquete', 'moto', 'auto', 'maquinaria', 'equipo', 'camion', 'retroexcavadora', 'cargador', 'minicargador'];
    return (
      this.activo.categoria_id === 3 ||
      this.activo.categoria_id === 6 ||
      mechanicalTypes.includes(this.activo.tipo) ||
      !!this.activo.placa
    );
  }
}
