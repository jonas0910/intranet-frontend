import { Component, OnInit, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, ParamMap, Router, RouterModule } from '@angular/router';
import { distinctUntilChanged, finalize, map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { NgbModalModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ToastService } from '../../../services/toast.service';
import { EquipoService } from '../services/equipo.service';
import { MantenimientoService } from '../services/mantenimiento.service';

interface TipoMantenimiento {
  id: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  criticidad: string;
}

interface ControlMantenimiento {
  id: number;
  equipo_id: number;
  tipo_mantenimiento_id: number;
  fecha_proxima?: string;
  fecha_ultima_realizacion?: string;
  estado: string;
  nivel_alerta: string;
  dias_restantes?: number;
  plan_correlativo?: number | null;
  programacion_aprobada_at?: string | null;
  mantenimiento_realizado_id?: number | null;
  equipo?: any;
  tipo_mantenimiento?: TipoMantenimiento;
  en_plan_oficial?: boolean;
  codigo_plan_oficial_vigente?: string | null;
  en_plan_documento?: boolean;
  codigo_plan_documento?: string | null;
  en_plan_mantenimiento?: boolean;
  codigo_plan_mantenimiento?: string | null;
  aprobacion_plan_mantenimiento_at?: string | null;
}

type TabVista = 'maquinarias' | 'vencidos' | 'proximos' | 'pendientes' | 'realizados' | 'planes';

interface PlanMantenimientoListado {
  id: number;
  codigo: string;
  nombre: string;
  estado: string;
  clasificacion?: string | null;
  department_id?: number | null;
  created_at?: string;
  plan_controles_count?: number;
  department?: { id: number; name?: string; nombre?: string };
}

@Component({
  selector: 'app-control-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, NgbModalModule, SystemLayoutComponent, RouterModule],
  templateUrl: './control-mantenimiento.component.html',
  styleUrls: ['./control-mantenimiento.component.scss']
})
export class ControlMantenimientoComponent implements OnInit {
  activeTab: TabVista = 'maquinarias';
  cargando = false;

  /** Catálogo completo del filtro de departamento (pestaña Maquinarias + modal editar plan documento). */
  equiposCatalogo: any[] = [];
  /** Equipos incluidos en el plan oficial vigente del ámbito (resaltado / columna N° plan). */
  private equiposIdsEnPlanOficialVigente = new Set<number>();
  /** Código del plan oficial vigente (GET /planes-mantenimiento/vigente). */
  planOficialVigenteCodigo: string | null = null;
  private equiposIdsEnPlanDocumento = new Set<number>();
  private codigoPlanMantenimientoPorEquipo = new Map<number, string>();
  alertas: ControlMantenimiento[] = [];
  controlesRealizados: ControlMantenimiento[] = [];

  /** Ámbito de datos: empleado = API usa departamento del usuario; número = departamento concreto; todos = sin filtro por departamento. */
  filtroDepartamentoValor: number | 'empleado' | 'todos' = 'empleado';
  departamentos: { id: number; nombre: string }[] = [];
  
  // Selection
  selectedEquipos = new Set<number>();
  selectedControles = new Set<number>();

  generandoPlanPreventivoDocumento = false;
  creandoNuevoPlanOficial = false;
  aprobandoPlanId: number | null = null;
  descargandoFichaIds = new Set<number>();
  
  // Modals Data
  modalRef: any;
  controlSeleccionado: ControlMantenimiento | null = null;
  mantenimientoIdSeleccionado: number | null = null;
  mantenimientosDisponibles: any[] = [];
  fechaRealizacion: string = '';
  kilometrajeRealizacion: number | null = null;
  horometroRealizacion: number | null = null;

  nuevaFecha: string = '';
  nuevoKilometraje: number | null = null;
  nuevoHorometro: number | null = null;
  motivoReprogramacion: string = '';

  nombreNuevoPlanOficial = '';
  nombrePlanPreventivoSeleccion = '';

  planesPreventivosDocumento: PlanMantenimientoListado[] = [];
  cargandoPlanesDocumento = false;
  descargandoPdfPlanId: number | null = null;

  /** Modal: editar maquinarias del plan documento */
  planIdEdicionMaquinarias: number | null = null;
  etiquetaPlanEdicionCodigo = '';
  selectedEquiposPlanEdicion = new Set<number>();
  cargandoDetallePlanEdicion = false;
  guardandoMaquinariasPlan = false;

  private baseUrl = `${environment.apiUrl}/equipo-mecanico`;
  Math = Math;

  private _draftFh: Record<number, string> = {};

  constructor(
    private http: HttpClient,
    private modalService: NgbModal,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastService,
    private equipoService: EquipoService,
    private mantenimientoService: MantenimientoService
  ) {}

  ngOnInit(): void {
    this.cargarDepartamentos();
    this.route.queryParamMap
      .pipe(
        map((pm) => `${pm.get('department_id') ?? ''}|${pm.get('todos') ?? ''}`),
        distinctUntilChanged()
      )
      .subscribe(() => {
        const pm = this.route.snapshot.queryParamMap;
        this.leerFiltroDesdeUrl(pm);
        this.selectedEquipos.clear();
        this.selectedControles.clear();
        this.cargarDatos();
        if (this.activeTab === 'planes') {
          this.cargarPlanesPreventivosDocumento();
        }
      });
  }

  cambiarTab(tab: TabVista): void {
    this.activeTab = tab;
    this.selectedControles.clear();
    if (tab === 'planes') {
      this.cargarPlanesPreventivosDocumento();
    }
  }

  onCambioFiltroDepartamento(): void {
    const v = this.filtroDepartamentoValor as unknown;
    if (v !== 'todos' && v !== 'empleado') {
      const n = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(n) && n > 0) {
        this.filtroDepartamentoValor = n;
      }
    }
    this.sincronizarUrlConFiltroDepartamento();
  }

  /**
   * Departamento numérico del filtro (p. ej. 50 en la URL). Normaliza strings del select ("50").
   * null = «Mi departamento» o valor no válido; no usar para «Todos».
   */
  private departmentIdFiltroNumerico(): number | null {
    const v = this.filtroDepartamentoValor as unknown;
    if (v === 'todos' || v === 'empleado') {
      return null;
    }
    const n = typeof v === 'number' ? v : Number(v);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n;
  }

  /** Lee `?department_id=` o `?todos=1` para compartir/enlazar la vista. */
  private leerFiltroDesdeUrl(pm: ParamMap): void {
    const todos = pm.get('todos');
    if (todos === '1' || todos === 'true') {
      this.filtroDepartamentoValor = 'todos';
      return;
    }
    const raw = pm.get('department_id');
    if (raw !== null && raw !== '') {
      const n = Number(raw);
      if (!Number.isNaN(n) && n > 0) {
        this.filtroDepartamentoValor = n;
        return;
      }
    }
    this.filtroDepartamentoValor = 'empleado';
  }

  private sincronizarUrlConFiltroDepartamento(): void {
    const q: Record<string, string | null> = {};
    if (this.filtroDepartamentoValor === 'todos') {
      q['todos'] = '1';
      q['department_id'] = null;
    } else {
      const idDept = this.departmentIdFiltroNumerico();
      if (idDept !== null) {
        q['department_id'] = String(idDept);
        q['todos'] = null;
      } else {
        q['department_id'] = null;
        q['todos'] = null;
      }
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: q,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  private ordenarDepartamentos(): void {
    this.departamentos = [...this.departamentos].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' })
    );
  }

  /**
   * Si la URL trae `department_id` y ese id no viene en el catálogo, se añade una opción
   * para que el combo no quede en blanco y el usuario vea al menos el id.
   */
  private asegurarDepartamentoSeleccionadoEnLista(): void {
    const idDept = this.departmentIdFiltroNumerico();
    if (idDept === null) {
      return;
    }
    if (this.departamentos.some((d) => d.id === idDept)) {
      return;
    }
    this.departamentos.push({ id: idDept, nombre: `Departamento (ID ${idDept})` });
    this.ordenarDepartamentos();
  }

  /** Nombre legible del filtro actual (para mostrar fuera del combo, donde no se trunca). */
  get etiquetaFiltroDepartamento(): string {
    if (this.filtroDepartamentoValor === 'todos') {
      return 'Todos los departamentos';
    }
    if (this.filtroDepartamentoValor === 'empleado') {
      return 'Mi departamento (según mi usuario)';
    }
    const idDept = this.departmentIdFiltroNumerico();
    if (idDept === null) {
      return 'Mi departamento (según mi usuario)';
    }
    const d = this.departamentos.find((x) => x.id === idDept);
    return d?.nombre ?? `Departamento (ID ${idDept})`;
  }

  private appendDepartamentoFiltro(params: HttpParams): HttpParams {
    if (this.filtroDepartamentoValor === 'todos') {
      return params.set('incluir_todos_departamentos', '1');
    }
    const idDept = this.departmentIdFiltroNumerico();
    if (idDept !== null) {
      return params.set('department_id', String(idDept));
    }
    return params;
  }

  private filtrosEquipoApi(): Record<string, string | boolean> {
    if (this.filtroDepartamentoValor === 'todos') {
      return { incluir_todos_departamentos: true };
    }
    const idDept = this.departmentIdFiltroNumerico();
    if (idDept !== null) {
      return { department_id: String(idDept) };
    }
    return {};
  }

  /** Cuerpo JSON para APIs que respetan el mismo criterio de departamento que el listado. */
  private payloadFiltroDepartamento(): Record<string, unknown> {
    if (this.filtroDepartamentoValor === 'todos') {
      return { incluir_todos_departamentos: true };
    }
    const idDept = this.departmentIdFiltroNumerico();
    if (idDept !== null) {
      return { department_id: idDept };
    }
    return {};
  }

  cargarPlanesPreventivosDocumento(): void {
    this.cargandoPlanesDocumento = true;
    let params = new HttpParams().set('per_page', '100').set('clasificacion', 'preventivo_documento');
    params = this.appendDepartamentoFiltro(params);
    this.http
      .get<any>(`${this.baseUrl}/planes-mantenimiento`, { params, withCredentials: true })
      .pipe(finalize(() => (this.cargandoPlanesDocumento = false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data) {
            this.planesPreventivosDocumento = [];
            return;
          }
          const raw = res.data.data ?? res.data;
          this.planesPreventivosDocumento = Array.isArray(raw) ? raw : [];
        },
        error: () => (this.planesPreventivosDocumento = []),
      });
  }

  cargarDepartamentos(): void {
    this.http.get<any>(`${environment.apiUrl}/public/departamentos`, { withCredentials: true }).subscribe({
      next: (res) => {
        if (res.success) {
          const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
          this.departamentos = (list as any[]).map((d) => ({
            id: Number(d.id),
            nombre: d.nombre ?? d.name ?? `Departamento #${d.id}`,
          }));
          this.ordenarDepartamentos();
          this.asegurarDepartamentoSeleccionadoEnLista();
          if (this.departamentos.length === 0) {
            this.cargarDepartamentosAutenticado();
          }
        } else {
          this.cargarDepartamentosAutenticado();
        }
      },
      error: () => this.cargarDepartamentosAutenticado(),
    });
  }

  private cargarDepartamentosAutenticado(): void {
    this.http.get<any>(`${environment.apiUrl}/departamentos`, { withCredentials: true }).subscribe({
      next: (res) => {
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : (raw?.data || []);
        if (list.length > 0) {
          this.departamentos = (list as any[]).map((d) => ({
            id: Number(d.id),
            nombre: d.nombre ?? d.name ?? `Departamento #${d.id}`,
          }));
          this.ordenarDepartamentos();
          this.asegurarDepartamentoSeleccionadoEnLista();
        }
      },
      error: () => {},
    });
  }

  cargarDatos(): void {
    this.cargando = true;
    if (this.activeTab === 'planes') {
      this.cargarPlanesPreventivosDocumento();
    }
    Promise.all([this.cargarEquipos(), this.cargarAlertas(), this.cargarControlesRealizados()]).finally(() => {
      this.cargando = false;
    });
  }

  equipoEnPlanOficialVigente(equipoId: number): boolean {
    return this.equiposIdsEnPlanOficialVigente.has(Number(equipoId));
  }

  equipoEnPlanMantenimiento(equipoId: number): boolean {
    const normalizedId = Number(equipoId);
    return this.equipoEnPlanOficialVigente(normalizedId) || this.equiposIdsEnPlanDocumento.has(normalizedId);
  }

  textoPlanMaquinaria(equipoId: number): string {
    const codigo = this.codigoPlanMantenimientoPorEquipo.get(Number(equipoId))?.trim();
    if (codigo) {
      return codigo;
    }
    if (!this.equipoEnPlanMantenimiento(equipoId)) {
      return '—';
    }
    return this.planOficialVigenteCodigo?.trim() || '—';
  }

  controlEnPlanOficial(control: ControlMantenimiento): boolean {
    if (control.en_plan_oficial === true) {
      return true;
    }
    return this.equipoEnPlanOficialVigente(control.equipo_id);
  }

  controlEstaPlanificado(control: ControlMantenimiento): boolean {
    if (control.en_plan_mantenimiento === true || control.en_plan_documento === true) {
      return true;
    }
    return this.controlEnPlanOficial(control) || this.equipoEnPlanMantenimiento(control.equipo_id);
  }

  textoCodigoPlanControl(control: ControlMantenimiento): string {
    const cod =
      control.codigo_plan_mantenimiento?.trim() ||
      control.codigo_plan_documento?.trim() ||
      control.codigo_plan_oficial_vigente?.trim();
    if (cod) {
      return cod;
    }
    if (this.controlEstaPlanificado(control) && this.planOficialVigenteCodigo) {
      return this.planOficialVigenteCodigo;
    }
    return '—';
  }

  controlPuedeSeleccionarseParaPlan(control: ControlMantenimiento): boolean {
    return !this.controlEstaPlanificado(control);
  }

  get controlesDisponiblesParaPlan(): ControlMantenimiento[] {
    return this.listadoActual.filter((control) => this.controlPuedeSeleccionarseParaPlan(control));
  }

  private sincronizarMetaPlanDocumentoDesdeAlertas(): void {
    this.equiposIdsEnPlanDocumento.clear();
    this.codigoPlanMantenimientoPorEquipo.clear();

    for (const control of this.alertas) {
      if (!this.controlEstaPlanificado(control)) {
        continue;
      }
      const equipoId = Number(control.equipo_id);
      if (Number.isNaN(equipoId) || equipoId <= 0) {
        continue;
      }
      if (control.en_plan_documento === true || !!control.codigo_plan_documento?.trim()) {
        this.equiposIdsEnPlanDocumento.add(equipoId);
      }
      const codigo = this.textoCodigoPlanControl(control);
      if (codigo !== '—' && !this.codigoPlanMantenimientoPorEquipo.has(equipoId)) {
        this.codigoPlanMantenimientoPorEquipo.set(equipoId, codigo);
      }
    }

    this.limpiarSeleccionEquiposNoDisponibles();
    this.limpiarSeleccionControlesNoDisponibles();
  }

  private cargarEquiposEnPlanOficialVigente(): Promise<void> {
    return new Promise((resolve) => {
      if (this.filtroDepartamentoValor === 'todos') {
        this.equiposIdsEnPlanOficialVigente.clear();
        this.planOficialVigenteCodigo = null;
        resolve();
        return;
      }
      let params = new HttpParams();
      const idDeptVigente = this.departmentIdFiltroNumerico();
      if (idDeptVigente !== null) {
        params = params.set('department_id', String(idDeptVigente));
      }
      this.http
        .get<any>(`${this.baseUrl}/planes-mantenimiento/vigente`, { params, withCredentials: true })
        .subscribe({
          next: (res) => {
            this.equiposIdsEnPlanOficialVigente.clear();
            this.planOficialVigenteCodigo = null;
            if (res.success && res.data) {
              this.planOficialVigenteCodigo =
                typeof res.data.codigo === 'string' && res.data.codigo.trim() !== '' ? res.data.codigo.trim() : null;
              if (Array.isArray(res.data.equipo_ids)) {
                for (const id of res.data.equipo_ids) {
                  if (id != null) {
                    this.equiposIdsEnPlanOficialVigente.add(Number(id));
                  }
                }
              } else if (Array.isArray(res.data.equipos)) {
                for (const row of res.data.equipos) {
                  const id = row.equipo_id ?? row.equipo?.id;
                  if (id != null) {
                    this.equiposIdsEnPlanOficialVigente.add(Number(id));
                  }
                }
              }
            }
            this.limpiarSeleccionEquiposNoDisponibles();
            resolve();
          },
          error: () => {
            this.equiposIdsEnPlanOficialVigente.clear();
            this.planOficialVigenteCodigo = null;
            this.limpiarSeleccionEquiposNoDisponibles();
            resolve();
          },
        });
    });
  }

  /** Solo catálogo de equipos (el plan vigente debe haberse cargado antes si se usa `cargarDatos`). */
  private cargarCatalogoEquipos(): Promise<void> {
    return new Promise((resolve) => {
      this.equipoService.listarTodos(this.filtrosEquipoApi()).subscribe({
        next: (list) => {
          this.equiposCatalogo = list || [];
          this.limpiarSeleccionEquiposNoDisponibles();
          resolve();
        },
        error: () => {
          this.equiposCatalogo = [];
          this.selectedEquipos.clear();
          resolve();
        },
      });
    });
  }

  cargarEquipos(): Promise<void> {
    return this.cargarEquiposEnPlanOficialVigente().then(() => this.cargarCatalogoEquipos());
  }

  cargarAlertas(): Promise<void> {
    return new Promise((resolve) => {
      let params = new HttpParams();
      params = this.appendDepartamentoFiltro(params);
      this.http.get<any>(`${this.baseUrl}/controles-mantenimiento/alertas`, { params, withCredentials: true }).subscribe({
        next: (response) => {
          if (response.success) {
            this.alertas = (response.data || []).map((a: any) => ({
              ...a,
              tipo_mantenimiento: a.tipo_mantenimiento || a.tipoMantenimiento
            }));
          } else {
            this.alertas = [];
          }
          this.sincronizarMetaPlanDocumentoDesdeAlertas();
          resolve();
        },
        error: () => {
          this.alertas = [];
          this.sincronizarMetaPlanDocumentoDesdeAlertas();
          resolve();
        }
      });
    });
  }

  cargarControlesRealizados(): Promise<void> {
    return new Promise((resolve) => {
      let params = new HttpParams().set('estado', 'realizado').set('per_page', '5000');
      params = this.appendDepartamentoFiltro(params);
      this.http.get<any>(`${this.baseUrl}/controles-mantenimiento`, { params, withCredentials: true }).subscribe({
        next: (response) => {
          if (response.success && response.data) {
            const data = response.data.data || response.data;
            this.controlesRealizados = (Array.isArray(data) ? data : []).map((c: any) => ({
              ...c,
              tipo_mantenimiento: c.tipo_mantenimiento || c.tipoMantenimiento
            }));
          }
          resolve();
        },
        error: () => resolve()
      });
    });
  }

  // Getters for Tabs
  get vencidos(): ControlMantenimiento[] {
    return this.alertas.filter(
      (a) => a.estado === 'vencido' || (a.dias_restantes != null && a.dias_restantes < 0)
    );
  }

  get proximos(): ControlMantenimiento[] {
    return this.alertas.filter((a) => a.estado === 'proximo');
  }

  get pendientes(): ControlMantenimiento[] {
    return this.alertas.filter((a) => a.estado === 'pendiente');
  }

  get realizados(): ControlMantenimiento[] {
    return this.controlesRealizados;
  }

  get listadoActual(): ControlMantenimiento[] {
    switch (this.activeTab) {
      case 'vencidos':
        return this.vencidos;
      case 'proximos':
        return this.proximos;
      case 'pendientes':
        return this.pendientes;
      case 'realizados':
        return this.realizados;
      default:
        return [];
    }
  }

  get equiposDisponiblesParaNuevoPlan(): any[] {
    return this.equiposCatalogo.filter((eq) => this.equipoPuedeSeleccionarseParaNuevoPlan(eq.id));
  }

  get equiposYaIncluidosEnPlan(): any[] {
    return this.equiposCatalogo.filter((eq) => this.equipoEnPlanMantenimiento(eq.id));
  }

  equipoPuedeSeleccionarseParaNuevoPlan(id: number): boolean {
    return !this.equipoEnPlanMantenimiento(id);
  }

  controlTieneProgramacionAprobada(control: ControlMantenimiento): boolean {
    return !!this.fechaAprobacionControl(control);
  }

  fechaAprobacionControl(control: ControlMantenimiento): string | null {
    return control.programacion_aprobada_at || control.aprobacion_plan_mantenimiento_at || null;
  }

  private limpiarSeleccionEquiposNoDisponibles(): void {
    const idsDisponibles = new Set(this.equiposDisponiblesParaNuevoPlan.map((eq) => Number(eq.id)));
    for (const id of Array.from(this.selectedEquipos)) {
      if (!idsDisponibles.has(Number(id))) {
        this.selectedEquipos.delete(id);
      }
    }
  }

  private limpiarSeleccionControlesNoDisponibles(): void {
    const idsDisponibles = new Set(this.controlesDisponiblesParaPlan.map((control) => Number(control.id)));
    for (const id of Array.from(this.selectedControles)) {
      if (!idsDisponibles.has(Number(id))) {
        this.selectedControles.delete(id);
      }
    }
  }

  // --- Selección Equipos ---
  isEquipoSelected(id: number): boolean {
    return this.selectedEquipos.has(id);
  }

  toggleEquipo(id: number, checked: boolean): void {
    if (!this.equipoPuedeSeleccionarseParaNuevoPlan(id)) {
      this.selectedEquipos.delete(id);
      return;
    }
    if (checked) this.selectedEquipos.add(id);
    else this.selectedEquipos.delete(id);
  }

  get hayTodosSeleccionadosListadoMaquinarias(): boolean {
    const list = this.equiposDisponiblesParaNuevoPlan;
    return list.length > 0 && list.every((eq) => this.selectedEquipos.has(eq.id));
  }

  seleccionarTodosEquipos(): void {
    const list = this.equiposDisponiblesParaNuevoPlan;
    if (list.length === 0) {
      return;
    }
    if (this.hayTodosSeleccionadosListadoMaquinarias) {
      list.forEach((eq) => this.selectedEquipos.delete(eq.id));
    } else {
      list.forEach((eq) => this.selectedEquipos.add(eq.id));
    }
  }

  // --- Selección Controles (PDF Plan) ---
  isControlSelected(id: number): boolean {
    return this.selectedControles.has(id);
  }

  toggleControl(id: number, checked: boolean): void {
    const control = this.alertas.find((item) => item.id === id);
    if (control && !this.controlPuedeSeleccionarseParaPlan(control)) {
      this.selectedControles.delete(id);
      return;
    }
    if (checked) this.selectedControles.add(id);
    else this.selectedControles.delete(id);
  }

  seleccionarTodosControles(): void {
    const arr = this.controlesDisponiblesParaPlan;
    const sameSize = Array.from(this.selectedControles).filter(id => arr.some(c => c.id === id)).length === arr.length;
    
    if (sameSize && arr.length > 0) {
      arr.forEach(c => this.selectedControles.delete(c.id));
    } else {
      arr.forEach(c => this.selectedControles.add(c.id));
    }
  }

  hayControlesSeleccionadosCompleto(): boolean {
    const arr = this.controlesDisponiblesParaPlan;
    return arr.length > 0 && arr.every(c => this.selectedControles.has(c.id));
  }

  // --- Generar Plan de Mantenimiento ---
  abrirModalNuevoPlan(tpl: TemplateRef<any>): void {
    if (this.selectedEquipos.size === 0) {
      this.mostrarMensaje('Seleccione al menos una maquinaria para generar el plan.', 'warning');
      return;
    }
    const year = new Date().getFullYear();
    this.nombreNuevoPlanOficial = `Plan de Mantenimiento ${year}`;
    this.modalRef = this.modalService.open(tpl, { centered: true, backdrop: 'static' });
  }

  confirmarNuevoPlan(): void {
    if (!this.nombreNuevoPlanOficial.trim()) {
      this.mostrarMensaje('Indique el nombre del plan.', 'warning');
      return;
    }
    const equipoIdsPlanVigente = Array.from(this.equiposIdsEnPlanOficialVigente.values()).map((id) => Number(id));
    const equipoIdsSeleccionados = Array.from(this.selectedEquipos)
      .map((id) => Number(id))
      .filter((id) => this.equipoPuedeSeleccionarseParaNuevoPlan(id));
    const equipoIds = Array.from(new Set([...equipoIdsPlanVigente, ...equipoIdsSeleccionados]));
    if (equipoIds.length === 0) {
      this.mostrarMensaje('No hay maquinarias nuevas para agregar al plan.', 'warning');
      return;
    }
    this.creandoNuevoPlanOficial = true;
    const body: Record<string, unknown> = {
      nombre: this.nombreNuevoPlanOficial.trim(),
      equipo_ids: equipoIds,
    };
    if (this.filtroDepartamentoValor === 'todos') {
      body['incluir_todos_departamentos'] = true;
    } else {
      const idDept = this.departmentIdFiltroNumerico();
      if (idDept !== null) {
        body['department_id'] = idDept;
      }
    }
    this.http
      .post<any>(`${this.baseUrl}/planes-mantenimiento/vigente`, body, { withCredentials: true })
      .pipe(finalize(() => (this.creandoNuevoPlanOficial = false)))
      .subscribe({
      next: (res) => {
        if (res.success) {
          this.mostrarMensaje('Plan de mantenimiento generado correctamente.', 'success');
          this.modalRef.close();
          this.selectedEquipos.clear();
          this.cargarDatos();
        } else {
          this.mostrarMensaje(res.message || 'Error al generar.', 'error');
        }
      },
      error: (err) => this.mostrarMensaje(err.error?.message || 'Error al generar plan', 'error')
    });
  }

  // --- Plan de mantenimiento documento (BD + PDF) ---
  abrirModalPlanPreventivo(tpl: TemplateRef<any>): void {
    if (this.selectedControles.size === 0) {
      this.mostrarMensaje('Seleccione al menos un control para generar el plan de mantenimiento.', 'warning');
      return;
    }
    const d = new Date();
    this.nombrePlanPreventivoSeleccion = `Plan preventivo ${d.toLocaleDateString('es-PE')}`;
    this.modalRef = this.modalService.open(tpl, { centered: true, backdrop: 'static' });
  }

  confirmarGenerarPlanPreventivoDocumento(): void {
    const idsDisponibles = new Set(this.controlesDisponiblesParaPlan.map((control) => Number(control.id)));
    const control_ids = Array.from(this.selectedControles).filter((id) => idsDisponibles.has(Number(id)));
    if (control_ids.length === 0) {
      this.mostrarMensaje('Seleccione controles que todavía no tengan un plan registrado.', 'warning');
      return;
    }
    const nombre = this.nombrePlanPreventivoSeleccion.trim();
    this.generandoPlanPreventivoDocumento = true;
    const body: Record<string, unknown> = {
      control_ids,
      ...this.payloadFiltroDepartamento(),
    };
    if (nombre) {
      body['nombre'] = nombre;
    }
    this.http
      .post<any>(`${this.baseUrl}/planes-mantenimiento/desde-controles`, body, { withCredentials: true })
      .pipe(finalize(() => (this.generandoPlanPreventivoDocumento = false)))
      .subscribe({
        next: (res) => {
          if (!res.success || !res.data?.id) {
            this.mostrarMensaje(res.message || 'No se pudo registrar el plan.', 'error');
            return;
          }
          const planId = res.data.id as number;
          const codigo = res.data.codigo as string;
          this.mostrarMensaje(`Plan registrado: ${codigo}. Descargando PDF…`, 'success');
          this.modalRef?.close();
          this.selectedControles.clear();
          this.activeTab = 'planes';
          this.cargarPlanesPreventivosDocumento();
          this.descargarPdfPlanAlmacenado(planId, codigo);
        },
        error: (err) =>
          this.mostrarMensaje(err.error?.message || 'Error al generar el plan de mantenimiento.', 'error'),
      });
  }

  descargarPdfPlanAlmacenado(planId: number, codigoArchivo?: string): void {
    this.descargandoPdfPlanId = planId;
    this.http
      .get(`${this.baseUrl}/planes-mantenimiento/${planId}/pdf-preventivo`, {
        responseType: 'blob',
        withCredentials: true,
      })
      .pipe(finalize(() => (this.descargandoPdfPlanId = null)))
      .subscribe({
        next: (blob) => {
          if (blob.size < 80 || blob.type === 'application/json') {
            this.mostrarMensaje('No se pudo generar el PDF del plan.', 'error');
            return;
          }
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const safe = (codigoArchivo || 'plan').replace(/[^A-Za-z0-9._-]+/g, '-');
          a.download = `plan-mantenimiento-${safe}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.mostrarMensaje('Error al descargar el PDF del plan.', 'error'),
      });
  }

  abrirModalEditarMaquinariasPlan(p: PlanMantenimientoListado, tpl: TemplateRef<any>): void {
    this.planIdEdicionMaquinarias = p.id;
    this.etiquetaPlanEdicionCodigo = p.codigo;
    this.selectedEquiposPlanEdicion.clear();

    const abrirYcargarDetalle = (): void => {
      this.cargandoDetallePlanEdicion = true;
      this.modalRef = this.modalService.open(tpl, {
        size: 'lg',
        centered: true,
        backdrop: 'static',
        scrollable: true,
      });
      this.http.get<any>(`${this.baseUrl}/planes-mantenimiento/${p.id}`, { withCredentials: true }).subscribe({
        next: (res) => {
          this.cargandoDetallePlanEdicion = false;
          if (res.success && Array.isArray(res.data?.equipos)) {
            for (const row of res.data.equipos) {
              const eid = row.equipo_id ?? row.equipo?.id;
              if (eid != null) {
                this.selectedEquiposPlanEdicion.add(Number(eid));
              }
            }
          }
        },
        error: () => {
          this.cargandoDetallePlanEdicion = false;
          this.modalRef?.close();
          this.mostrarMensaje('No se pudo cargar el detalle del plan.', 'error');
        },
      });
    };

    if (this.equiposCatalogo.length === 0) {
      void this.cargarEquipos().then(() => abrirYcargarDetalle());
    } else {
      abrirYcargarDetalle();
    }
  }

  isEquipoSeleccionadoPlanEdicion(id: number): boolean {
    return this.selectedEquiposPlanEdicion.has(id);
  }

  toggleEquipoPlanEdicion(id: number, checked: boolean): void {
    if (checked) {
      this.selectedEquiposPlanEdicion.add(id);
    } else {
      this.selectedEquiposPlanEdicion.delete(id);
    }
  }

  get todasMaquinariasListaSeleccionadasPlan(): boolean {
    return (
      this.equiposCatalogo.length > 0 &&
      this.equiposCatalogo.every((eq) => this.selectedEquiposPlanEdicion.has(eq.id))
    );
  }

  seleccionarTodosEquiposPlanEdicion(): void {
    if (this.equiposCatalogo.length === 0) {
      return;
    }
    if (this.todasMaquinariasListaSeleccionadasPlan) {
      this.equiposCatalogo.forEach((eq) => this.selectedEquiposPlanEdicion.delete(eq.id));
    } else {
      this.equiposCatalogo.forEach((eq) => this.selectedEquiposPlanEdicion.add(eq.id));
    }
  }

  guardarMaquinariasPlanDocumento(): void {
    if (this.planIdEdicionMaquinarias == null) {
      return;
    }
    this.guardandoMaquinariasPlan = true;
    this.http
      .put<any>(
        `${this.baseUrl}/planes-mantenimiento/${this.planIdEdicionMaquinarias}/maquinarias-documento`,
        { equipo_ids: Array.from(this.selectedEquiposPlanEdicion) },
        { withCredentials: true }
      )
      .pipe(finalize(() => (this.guardandoMaquinariasPlan = false)))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.mostrarMensaje(res.message || 'Plan actualizado.', 'success');
            this.modalRef?.close();
            this.cargarPlanesPreventivosDocumento();
          } else {
            this.mostrarMensaje(res.message || 'No se pudo actualizar.', 'error');
          }
        },
        error: (err) =>
          this.mostrarMensaje(err.error?.message || 'Error al guardar maquinarias del plan.', 'error'),
      });
  }

  // --- Descargar Ficha PDF Realizado ---
  descargarFicha(control: ControlMantenimiento): void {
    if (!control.mantenimiento_realizado_id) {
      this.mostrarMensaje('No se encontró el mantenimiento asociado a este control.', 'warning');
      return;
    }
    this.descargandoFichaIds.add(control.id);
    this.mantenimientoService.descargarFichaPdf(control.mantenimiento_realizado_id)
      .pipe(finalize(() => this.descargandoFichaIds.delete(control.id)))
      .subscribe({
        next: blob => {
          if (blob.size < 80 || blob.type === 'application/json') {
             this.mostrarMensaje('No se pudo generar el documento PDF.', 'error');
             return;
          }
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `ficha-mantenimiento-${control.mantenimiento_realizado_id}-${new Date().toISOString().slice(0, 10)}.pdf`;
          a.click();
          window.URL.revokeObjectURL(url);
        },
        error: () => this.mostrarMensaje('Error al descargar el documento.', 'error')
      });
  }

  // --- DateTime Logic ---
  fechaHoraAprobacionInputValue(control: ControlMantenimiento): string {
    if (this._draftFh[control.id] !== undefined) return this._draftFh[control.id];
    const fechaAprobacion = this.fechaAprobacionControl(control);
    if (fechaAprobacion) return this.isoToDatetimeLocal(fechaAprobacion);
    if (control.fecha_proxima) return `${control.fecha_proxima}T08:00`;
    return '';
  }

  onCambioFechaHoraAprobacion(id: number, val: string): void {
    this._draftFh[id] = val;
  }

  private isoToDatetimeLocal(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  aprobarProgramacionFila(control: ControlMantenimiento): void {
    let raw = this._draftFh[control.id] || this.fechaHoraAprobacionInputValue(control);
    if (!raw) {
      this.mostrarMensaje('Indique fecha y hora.', 'warning');
      return;
    }
    const fechaHora = new Date(raw).toISOString();
    const body: Record<string, unknown> = { fecha_hora: fechaHora };
    const idDeptApr = this.departmentIdFiltroNumerico();
    if (idDeptApr !== null) {
      body['department_id'] = idDeptApr;
    }
    this.aprobandoPlanId = control.id;
    this.http.post<any>(`${this.baseUrl}/controles-mantenimiento/${control.id}/aprobar-programacion`, body, { withCredentials: true })
      .pipe(finalize(() => this.aprobandoPlanId = null)).subscribe({
        next: res => {
          if (res.success && res.data) {
            this.mostrarMensaje(res.message || 'Programación aprobada.', 'success');
            const d = res.data;
            delete this._draftFh[control.id];
            const merge = (c: any) => ({ ...c, ...d, tipo_mantenimiento: d.tipo_mantenimiento || d.tipoMantenimiento || c.tipo_mantenimiento });
            const i = this.alertas.findIndex(x => x.id === control.id);
            if (i >= 0) this.alertas[i] = merge(this.alertas[i]);
          } else {
            this.mostrarMensaje(res.message || 'No se pudo grabar la aprobación.', 'error');
          }
        },
        error: err => this.mostrarMensaje(err.error?.message || 'Error al aprobar.', 'error')
      });
  }

  // --- Acciones de Registro ---
  marcarRealizado(control: ControlMantenimiento, modal: TemplateRef<any>): void {
    this.controlSeleccionado = control;
    this.mantenimientoIdSeleccionado = null;
    this.mantenimientosDisponibles = [];
    
    // Simulating loading pending maintenances
    this.http.get<any>(`${this.baseUrl}/mantenimientos?equipo_id=${control.equipo_id}&estado=cerrado`, { withCredentials: true }).subscribe(res => {
      if (res.success && res.data) {
        this.mantenimientosDisponibles = res.data.data || res.data;
      }
    });

    this.modalRef = this.modalService.open(modal, { centered: true });
  }

  onMantenimientoChange(): void {
    const mto = this.mantenimientosDisponibles.find(m => m.id === Number(this.mantenimientoIdSeleccionado));
    if (mto) {
      this.fechaRealizacion = mto.fecha_cierre || mto.fecha_inicio;
      this.kilometrajeRealizacion = mto.kilometraje_actual;
      this.horometroRealizacion = mto.horometro_actual;
    } else {
      this.fechaRealizacion = '';
      this.kilometrajeRealizacion = null;
      this.horometroRealizacion = null;
    }
  }

  confirmarMarcarRealizado(): void {
    if (!this.controlSeleccionado) {
      return;
    }
    const mid = Number(this.mantenimientoIdSeleccionado);
    if (!mid || Number.isNaN(mid)) {
      this.mostrarMensaje('Seleccione el registro de mantenimiento ejecutado.', 'warning');
      return;
    }
    let fechaRaw = (this.fechaRealizacion || '').trim();
    if (!fechaRaw) {
      const mto = this.mantenimientosDisponibles.find((m) => Number(m.id) === mid);
      fechaRaw = (mto?.fecha_cierre || mto?.fecha_inicio || '') as string;
    }
    const fechaRealizacion =
      fechaRaw.length >= 10 ? fechaRaw.slice(0, 10) : new Date().toISOString().slice(0, 10);

    this.http
      .post<any>(
        `${this.baseUrl}/controles-mantenimiento/${this.controlSeleccionado.id}/marcar-realizado`,
        {
          mantenimiento_id: mid,
          fecha_realizacion: fechaRealizacion,
          kilometraje: this.kilometrajeRealizacion ?? undefined,
          horometro: this.horometroRealizacion ?? undefined,
        },
        { withCredentials: true }
      )
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.mostrarMensaje('Mantenimiento marcado como realizado.', 'success');
            this.modalRef.close();
            this.selectedControles.clear();
            this.activeTab = 'realizados';
            this.cargarDatos();
          } else {
            this.mostrarMensaje(res.message || 'Error al marcar', 'error');
          }
        },
        error: (err) => this.mostrarMensaje(err.error?.message || 'Error', 'error'),
      });
  }

  reprogramar(control: ControlMantenimiento, modal: TemplateRef<any>): void {
    this.controlSeleccionado = control;
    this.nuevaFecha = '';
    this.nuevoKilometraje = null;
    this.nuevoHorometro = null;
    this.motivoReprogramacion = '';
    this.modalRef = this.modalService.open(modal, { centered: true });
  }

  confirmarReprogramar(): void {
    if (!this.nuevaFecha || !this.motivoReprogramacion) {
        this.mostrarMensaje('Complete los campos obligatorios.', 'warning');
        return;
    }
    this.http.post<any>(`${this.baseUrl}/controles-mantenimiento/${this.controlSeleccionado?.id}/reprogramar`, {
        nueva_fecha: this.nuevaFecha,
        nuevo_kilometraje: this.nuevoKilometraje,
        nuevo_horometro: this.nuevoHorometro,
        motivo: this.motivoReprogramacion
    }, { withCredentials: true }).subscribe({
        next: (res) => {
            if (res.success) {
                this.mostrarMensaje('Mantenimiento reprogramado.', 'success');
                this.modalRef.close();
                this.cargarDatos();
            }
        },
        error: (err) => this.mostrarMensaje(err.error?.message || 'Error', 'error')
    });
  }

  // --- Aux Functions ---
  formatearFecha(fecha: string | undefined): string {
    if (!fecha) return '—';
    const b = fecha.split(/\D/);
    if (b.length >= 3) return `${b[2]}/${b[1]}/${b[0]}`;
    return fecha;
  }

  getBadgeClaseEstado(estado: string): string {
    switch (estado?.toLowerCase()) {
      case 'vencido': return 'badge-danger';
      case 'proximo': return 'badge-warning';
      case 'pendiente': return 'badge-info';
      case 'realizado': return 'badge-success';
      default: return 'badge-secondary';
    }
  }

  getBadgeClaseAlerta(nivel: string): string {
    switch (nivel?.toLowerCase()) {
      case 'rojo': return 'bg-danger text-white';
      case 'amarillo': return 'bg-warning text-dark';
      case 'verde': return 'bg-success text-white';
      default: return 'bg-light text-muted border';
    }
  }

  trackByControlId(index: number, control: ControlMantenimiento): number {
    return control.id;
  }

  navegarAMantenimientos(): void {
    this.router.navigate(['/equipo-mecanico/mantenimientos/nuevo']);
  }

  mostrarMensaje(msg: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    if (type === 'success') this.toast.success(msg);
    else if (type === 'error') this.toast.error(msg);
    else if (type === 'warning') this.toast.warning(msg);
    else this.toast.info(msg);
  }
}
