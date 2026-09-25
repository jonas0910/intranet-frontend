import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { TicketsService } from '../services/tickets.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../services/permission.service';
import { environment } from '../../../../environments/environment';
import { MultiFileUploadComponent } from '../../../shared/components/multi-file-upload/multi-file-upload.component';

@Component({
  selector: 'app-tickets-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbModalModule, SystemLayoutComponent, MultiFileUploadComponent],
  templateUrl: './tickets-list.component.html',
})
export class TicketsListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('nuevoTicketModal') nuevoTicketModal!: TemplateRef<any>;
  @ViewChild('editarTicketModal') editarTicketModal!: TemplateRef<any>;
  @ViewChild('verTicketModal') verTicketModal!: TemplateRef<any>;

  tickets: any[] = [];
  meta: { current_page: number; last_page: number; per_page: number; total: number } = { current_page: 1, last_page: 1, per_page: 15, total: 0 };
  loading = false;
  filtros = { estado: '', prioridad: '', categoria: '', per_page: 15, page: 1 };

  /** Modelo del formulario "Nuevo ticket" en el modal */
  nuevoTicket: {
    titulo: string;
    descripcion: string;
    prioridad: string;
    categoria: string;
    asignado_a: number | null;
    fecha_limite: string;
  } = {
    titulo: '',
    descripcion: '',
    prioridad: 'media',
    categoria: 'General',
    asignado_a: null,
    fecha_limite: '',
  };
  /** Adjuntos al crear ticket: documentos y fotos */
  archivosNuevoTicket: File[] = [];
  savingTicket = false;
  private modalRef: any = null;

  /** Modelo del formulario "Editar ticket" en el modal */
  editTicket: {
    id: number;
    titulo: string;
    descripcion: string;
    prioridad: string;
    categoria: string;
    asignado_a: number | null;
    fecha_limite: string;
    archivos_adjuntos: { nombre: string; path: string; url: string }[];
  } | null = null;
  /** Paths marcados para eliminar al guardar */
  adjuntosEliminarEdit: string[] = [];
  /** Nuevos archivos al editar (multi imagen / documentos) */
  archivosEditTicket: File[] = [];
  loadingEditTicket = false;
  savingEdit = false;
  private editModalRef: any = null;

  ticketAEliminar: any = null;

  /** Soporte: asignar al crear/editar y en tabla. */
  usuariosSoporte: any[] = [];
  /** Reloj para texto de plazo (días/horas/min). */
  plazoTick = 0;
  private plazoInterval: ReturnType<typeof setInterval> | null = null;

  /** Modal Ver detalles del ticket */
  viewTicket: any = null;
  loadingViewTicket = false;
  private viewModalRef: any = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private modalService: NgbModal,
    private ticketsService: TicketsService,
    private designSystem: DesignSystemService,
    private toast: ToastService,
    private permissionService: PermissionService
  ) {}

  /** Ruta /helpdesk/mis-tickets: vista solo para quien crea tickets. */
  get soloMisTickets(): boolean {
    return this.route.snapshot.data['soloMisTickets'] === true;
  }

  /** Listado completo, asignar, SLA: ver todos los tickets. */
  get puedeGestionarTickets(): boolean {
    return this.permissionService.hasPermission('tickets.ver');
  }

  /** Editar/Eliminar visibles solo en gestor /helpdesk/tickets (no en «mis tickets»). El API valida permisos. */
  get puedeEditarTickets(): boolean {
    return !this.soloMisTickets;
  }
  get puedeEliminarTickets(): boolean {
    return !this.soloMisTickets;
  }

  get cv(): CrudViewConfig {
    return this.designSystem.getCrudViewFor('helpdesk');
  }

  get mc(): ModalCrudConfig {
    return this.designSystem.getModalCrudFor('helpdesk');
  }

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
    this.cargar();
    if (this.puedeGestionarTickets || (!this.soloMisTickets && this.puedeEditarTickets)) {
      this.cargarUsuariosSoporte();
    }
    this.plazoInterval = setInterval(() => {
      this.plazoTick = Date.now();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.plazoInterval) {
      clearInterval(this.plazoInterval);
      this.plazoInterval = null;
    }
  }

  cargarUsuariosSoporte(): void {
    this.ticketsService.getUsuariosParaAsignar().subscribe({
      next: (res) => {
        const data = res.data;
        this.usuariosSoporte = Array.isArray(data) ? data : data?.data || [];
      },
      error: () => {},
    });
  }

  /** Horas SLA por prioridad (alineado al backend). */
  slaHoras(prioridad: string): number {
    const m: Record<string, number> = { critica: 8, alta: 24, media: 72, baja: 120 };
    return m[prioridad] ?? 72;
  }

  /** Fecha límite efectiva (BD o creado + SLA si legacy sin fecha_limite). */
  fechaLimiteEfectiva(t: any): Date | null {
    if (t?.fecha_limite) return new Date(t.fecha_limite);
    if (t?.created_at) {
      const h = this.slaHoras(t.prioridad || 'media');
      return new Date(new Date(t.created_at).getTime() + h * 3600 * 1000);
    }
    return null;
  }

  plazoCerrado(t: any): boolean {
    return t?.estado === 'cerrado' || t?.estado === 'resuelto';
  }

  /**
   * Texto monitoreo: días, horas, minutos restantes o vencido.
   * Usa plazoTick para refresco.
   */
  textoPlazo(t: any): { clase: string; linea1: string; linea2: string } {
    void this.plazoTick;
    if (this.plazoCerrado(t)) {
      return { clase: 'text-success', linea1: 'Atendido', linea2: t.estado };
    }
    const fin = this.fechaLimiteEfectiva(t);
    if (!fin) return { clase: 'text-muted', linea1: '—', linea2: '' };
    const ms = fin.getTime() - Date.now();
    const abs = Math.abs(ms);
    const dias = Math.floor(abs / 86400000);
    const horas = Math.floor((abs % 86400000) / 3600000);
    const mins = Math.floor((abs % 3600000) / 60000);
    const bloque = `${dias}d ${horas}h ${mins}m`;
    if (ms >= 0) {
      return { clase: dias === 0 && horas < 2 ? 'text-warning font-weight-bold' : 'text-dark', linea1: 'Quedan', linea2: bloque };
    }
    return { clase: 'text-danger font-weight-bold', linea1: 'Vencido hace', linea2: bloque };
  }

  asignarEnLinea(t: any, userId: string): void {
    if (!this.puedeGestionarTickets) return;
    const id = userId === '' ? null : Number(userId);
    this.ticketsService.asignar(t.id, id).subscribe({
      next: (res) => {
        Object.assign(t, res.data);
        this.toast.success(id ? 'Asignado a soporte' : 'Sin asignar');
      },
      error: (err) => this.toast.error(err?.message || 'No se pudo asignar'),
    });
  }

  ngAfterViewInit(): void {
    const openNew = this.route.snapshot.data['openNewModal'] === true ||
      (typeof this.router.url === 'string' && this.router.url.includes('tickets/nuevo'));
    if (openNew) {
      setTimeout(() => this.openNuevoTicketModal(), 350);
    }
  }

  cargar(): void {
    this.loading = true;
    const params: any = { per_page: this.filtros.per_page, page: this.filtros.page };
    if (this.filtros.estado) params.estado = this.filtros.estado;
    if (this.filtros.prioridad) params.prioridad = this.filtros.prioridad;
    if (this.filtros.categoria) params.categoria = this.filtros.categoria;
    this.ticketsService.getTickets(params).subscribe({
      next: (res) => {
        this.tickets = res.data || [];
        this.meta = res.meta || this.meta;
        this.loading = false;
      },
      error: (err) => {
        this.toast.error(err?.message || 'Error al cargar tickets');
        this.loading = false;
      },
    });
  }

  aplicarFiltros(): void {
    this.filtros.page = 1;
    this.cargar();
  }

  cambiarPagina(p: number): void {
    this.filtros.page = p;
    this.cargar();
  }

  badgeEstado(e: string): string {
    const m: Record<string, string> = { abierto: 'badge-primary', en_proceso: 'badge-info', pendiente_usuario: 'badge-warning', resuelto: 'badge-success', cerrado: 'badge-secondary' };
    return m[e] || 'badge-secondary';
  }

  badgePrioridad(p: string): string {
    const m: Record<string, string> = { baja: 'badge-secondary', media: 'badge-info', alta: 'badge-warning', critica: 'badge-danger' };
    return m[p] || 'badge-secondary';
  }

  formatDate(d: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-PE', { dateStyle: 'short' });
  }

  verTicket(t: any): void {
    this.openVerTicketModal(t);
  }

  /** Base del backend sin /api (para /storage/...) */
  private get storageBase(): string {
    return environment.apiUrl.replace(/\/api\/?$/, '');
  }

  /** Unifica adjuntos del API y asegura URL absoluta para <img src> desde localhost:4200 */
  normalizeAdjuntos(raw: unknown): { nombre: string; path: string; url: string }[] {
    let arr: any[] = [];
    if (raw == null) return [];
    if (typeof raw === 'string') {
      try {
        arr = JSON.parse(raw);
      } catch {
        return [];
      }
    } else if (Array.isArray(raw)) {
      arr = raw;
    } else {
      return [];
    }
    const base = this.storageBase;
    return arr.map((a: any) => {
      const path = (a && a.path) || '';
      const nombre = (a && a.nombre) || (path ? path.split('/').pop() : '') || 'archivo';
      let url = '';
      if (path && path.startsWith('helpdesk/tickets/')) {
        url = `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
      } else if (!path && a?.url) {
        url = a.url.startsWith('/') ? `${base}${a.url}` : a.url;
      } else if (path) {
        url = `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
      }
      return { nombre, path, url };
    });
  }

  urlAdjunto(adj: { url?: string; path?: string }): string {
    const base = this.storageBase;
    const path = adj?.path || '';
    if (path && path.startsWith('helpdesk/tickets/')) {
      return `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
    }
    if (adj?.url) {
      if (adj.url.includes('/storage/') && path) {
        return `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
      }
      if (adj.url.startsWith('/')) return `${base}${adj.url}`;
      return adj.url;
    }
    if (path) return `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
    return '';
  }

  /** Imagen por nombre o por extensión en path */
  esImagenAdjunto(adj: { nombre?: string; path?: string }): boolean {
    const n = adj?.nombre || '';
    const p = adj?.path || '';
    return this.esImagenNombre(n) || this.esImagenNombre(p.split('/').pop() || '');
  }

  tieneAlgunaImagenEnComentarios(): boolean {
    const comentarios = this.viewTicket?.comentarios;
    if (!Array.isArray(comentarios)) return false;
    return comentarios.some((c: any) =>
      Array.isArray(c.archivos_adjuntos) &&
      c.archivos_adjuntos.some((a: any) => this.esImagenAdjunto(a))
    );
  }

  /** Comentarios del modal Ver, ordenados por fecha (historial completo). */
  comentariosHistorial(): any[] {
    const list = this.viewTicket?.comentarios;
    if (!Array.isArray(list)) return [];
    return [...list].sort((a: any, b: any) => {
      const ta = new Date(a.created_at || 0).getTime();
      const tb = new Date(b.created_at || 0).getTime();
      return ta - tb;
    });
  }

  /** Solo adjuntos que son imagen (galería) */
  adjuntosImagenesIniciales(): { nombre: string; path: string; url: string }[] {
    const list = this.normalizeAdjuntos(this.viewTicket?.archivos_adjuntos);
    return list.filter((a) => this.esImagenAdjunto(a));
  }

  /** Adjuntos iniciales que no son imagen */
  adjuntosNoImagenIniciales(): { nombre: string; path: string; url: string }[] {
    const list = this.normalizeAdjuntos(this.viewTicket?.archivos_adjuntos);
    return list.filter((a) => !this.esImagenAdjunto(a));
  }

  openVerTicketModal(t: any): void {
    this.viewTicket = null;
    this.loadingViewTicket = true;
    this.viewModalRef = this.modalService.open(this.verTicketModal!, {
      size: 'xl',
      centered: true,
      scrollable: true,
    });
    this.viewModalRef.result.catch(() => {
      this.viewTicket = null;
      this.viewModalRef = null;
      this.loadingViewTicket = false;
    });
    this.ticketsService.getTicket(t.id).subscribe({
      next: (res) => {
        const d = res.data;
        d.archivos_adjuntos = this.normalizeAdjuntos(d.archivos_adjuntos);
        if (Array.isArray(d.comentarios)) {
          d.comentarios = d.comentarios.map((c: any) => ({
            ...c,
            archivos_adjuntos: this.normalizeAdjuntos(c.archivos_adjuntos),
          }));
        }
        this.viewTicket = d;
        this.loadingViewTicket = false;
      },
      error: (err) => {
        this.loadingViewTicket = false;
        this.toast.error(err?.message || 'Error al cargar el ticket');
        if (this.viewModalRef) {
          this.viewModalRef.dismiss();
          this.viewModalRef = null;
        }
      },
    });
  }

  cancelVerTicketModal(): void {
    if (this.viewModalRef) {
      this.viewModalRef.dismiss();
      this.viewModalRef = null;
    }
    this.viewTicket = null;
  }

  irAGestionarTicket(t: any): void {
    this.cancelVerTicketModal();
    this.router.navigate(['/helpdesk/tickets', t.id]);
  }

  esImagenNombre(nombre: string): boolean {
    if (!nombre) return false;
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
  }

  formatDateTime(d: string | null): string {
    if (!d) return '-';
    return new Date(d).toLocaleString('es-PE');
  }

  openNuevoTicketModal(): void {
    this.nuevoTicket = {
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      categoria: 'General',
      asignado_a: null as number | null,
      fecha_limite: '' as string,
    };
    if (this.puedeGestionarTickets && !this.usuariosSoporte.length) {
      this.cargarUsuariosSoporte();
    }
    this.archivosNuevoTicket = [];
    this.modalRef = this.modalService.open(this.nuevoTicketModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    this.modalRef.result.catch(() => {
      this.modalRef = null;
    });
  }

  cancelNuevoTicketModal(): void {
    if (this.modalRef) {
      this.modalRef.dismiss();
      this.modalRef = null;
    }
    this.archivosNuevoTicket = [];
  }

  saveNuevoTicket(): void {
    if (!this.nuevoTicket.titulo?.trim() || !this.nuevoTicket.descripcion?.trim()) {
      this.toast.error('Título y descripción son obligatorios');
      return;
    }
    this.savingTicket = true;
    const files = this.archivosNuevoTicket || [];
    const payloadBase: any = {
      titulo: this.nuevoTicket.titulo.trim(),
      descripcion: this.nuevoTicket.descripcion.trim(),
      prioridad: this.nuevoTicket.prioridad,
      categoria: this.nuevoTicket.categoria || 'General',
    };
    if (this.puedeGestionarTickets) {
      if (this.nuevoTicket.asignado_a) {
        payloadBase.asignado_a = this.nuevoTicket.asignado_a;
      }
      if (this.nuevoTicket.fecha_limite) {
        payloadBase.fecha_limite = new Date(this.nuevoTicket.fecha_limite).toISOString();
      }
    }
    if (files.length === 0) {
      this.ticketsService.createTicket(payloadBase).subscribe({
        next: (res) => this.onTicketCreado(res, 0),
        error: (err) => this.onTicketError(err),
      });
      return;
    }
    /** JSON + Base64: no depende de multipart (suele fallar en algunos entornos). */
    Promise.all(files.map((f) => this.fileToBase64Entry(f)))
      .then((archivos_base64) => {
        this.ticketsService
          .createTicket({
            ...payloadBase,
            archivos_base64,
          })
          .subscribe({
            next: (res) => this.onTicketCreado(res, archivos_base64.length),
            error: (err) => this.onTicketError(err),
          });
      })
      .catch(() => {
        this.savingTicket = false;
        this.toast.error('No se pudieron leer los archivos seleccionados');
      });
  }

  private fileToBase64Entry(file: File): Promise<{ nombre: string; data: string }> {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve({ nombre: file.name, data: r.result as string });
      r.onerror = () => reject(new Error('read'));
      r.readAsDataURL(file);
    });
  }

  private onTicketCreado(res: any, enviados: number): void {
    this.savingTicket = false;
    const n = res?.archivos_recibidos ?? enviados;
    this.toast.success(
      n > 0 ? `Ticket creado con ${n} archivo(s) adjunto(s).` : 'Ticket creado correctamente.'
    );
    if (this.modalRef) {
      this.modalRef.close();
      this.modalRef = null;
    }
    this.nuevoTicket = {
      titulo: '',
      descripcion: '',
      prioridad: 'media',
      categoria: 'General',
      asignado_a: null,
      fecha_limite: '',
    };
    this.archivosNuevoTicket = [];
    this.cargar();
    const id = res?.data?.id;
    if (id) {
      this.router.navigate(['/helpdesk/tickets', id]);
    }
  }

  private onTicketError(err: any): void {
    this.savingTicket = false;
    this.toast.error(err?.message || 'Error al crear el ticket');
  }

  openEditTicketModal(t: any): void {
    this.adjuntosEliminarEdit = [];
    this.archivosEditTicket = [];
    this.loadingEditTicket = true;
    this.editTicket = null;
    this.editModalRef = this.modalService.open(this.editarTicketModal, {
      size: 'lg',
      centered: true,
      backdrop: 'static',
    });
    this.editModalRef.result.catch(() => {
      this.resetEditModalState();
    });
    this.ticketsService.getTicket(t.id).subscribe({
      next: (res) => {
        const d = res.data;
        const fl = d.fecha_limite
          ? new Date(d.fecha_limite).toISOString().slice(0, 16)
          : '';
        this.editTicket = {
          id: d.id,
          titulo: d.titulo || '',
          descripcion: d.descripcion || '',
          prioridad: d.prioridad || 'media',
          categoria: d.categoria || 'General',
          asignado_a: d.asignado_a ?? null,
          fecha_limite: fl,
          archivos_adjuntos: Array.isArray(d.archivos_adjuntos) ? [...d.archivos_adjuntos] : [],
        };
        if (this.puedeGestionarTickets && !this.usuariosSoporte.length) {
          this.cargarUsuariosSoporte();
        }
        this.loadingEditTicket = false;
      },
      error: (err) => {
        this.loadingEditTicket = false;
        this.toast.error(err?.message || 'Error al cargar el ticket');
        if (this.editModalRef) {
          this.editModalRef.dismiss();
          this.editModalRef = null;
        }
      },
    });
  }

  private resetEditModalState(): void {
    this.editTicket = null;
    this.editModalRef = null;
    this.adjuntosEliminarEdit = [];
    this.archivosEditTicket = [];
    this.loadingEditTicket = false;
  }

  cancelEditTicketModal(): void {
    if (this.editModalRef) {
      this.editModalRef.dismiss();
      this.editModalRef = null;
    }
    this.resetEditModalState();
  }

  /** Adjuntos que siguen visibles en edición (no marcados para borrar) */
  get adjuntosEditVisibles(): { nombre: string; path: string; url: string }[] {
    if (!this.editTicket?.archivos_adjuntos) return [];
    return this.editTicket.archivos_adjuntos.filter((a) => !this.adjuntosEliminarEdit.includes(a.path));
  }

  marcarEliminarAdjuntoEdit(path: string): void {
    if (!this.adjuntosEliminarEdit.includes(path)) {
      this.adjuntosEliminarEdit = [...this.adjuntosEliminarEdit, path];
    }
  }

  desmarcarEliminarAdjuntoEdit(path: string): void {
    this.adjuntosEliminarEdit = this.adjuntosEliminarEdit.filter((p) => p !== path);
  }

  saveEditTicket(): void {
    if (!this.editTicket || !this.editTicket.titulo?.trim() || !this.editTicket.descripcion?.trim()) {
      this.toast.error('Título y descripción son obligatorios');
      return;
    }
    this.savingEdit = true;
    const id = this.editTicket.id;
    const base: any = {
      titulo: this.editTicket.titulo.trim(),
      descripcion: this.editTicket.descripcion.trim(),
      prioridad: this.editTicket.prioridad,
      categoria: this.editTicket.categoria || 'General',
    };
    if (this.puedeGestionarTickets) {
      base.asignado_a = this.editTicket.asignado_a ?? null;
      base.fecha_limite = this.editTicket.fecha_limite
        ? new Date(this.editTicket.fecha_limite).toISOString()
        : null;
    }
    const files = this.archivosEditTicket || [];
    const del = this.adjuntosEliminarEdit || [];

    const done = () => {
      this.savingEdit = false;
      this.toast.success('Ticket actualizado correctamente');
      if (this.editModalRef) {
        this.editModalRef.close();
        this.editModalRef = null;
      }
      this.resetEditModalState();
      this.cargar();
    };
    const fail = (err: any) => {
      this.savingEdit = false;
      this.toast.error(err?.message || 'Error al actualizar el ticket');
    };

    if (files.length === 0 && del.length === 0) {
      this.ticketsService.updateTicket(id, base).subscribe({ next: done, error: fail });
      return;
    }
    if (files.length === 0) {
      this.ticketsService.updateTicket(id, { ...base, adjuntos_eliminar: del }).subscribe({ next: done, error: fail });
      return;
    }
    Promise.all(files.map((f) => this.fileToBase64Entry(f)))
      .then((archivos_base64) => {
        this.ticketsService
          .updateTicket(id, {
            ...base,
            adjuntos_eliminar: del.length ? del : undefined,
            archivos_base64,
          })
          .subscribe({ next: done, error: fail });
      })
      .catch(() => {
        this.savingEdit = false;
        this.toast.error('No se pudieron leer los archivos');
      });
  }

  confirmDelete(t: any): void {
    this.ticketAEliminar = t;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'helpdesk';
    ref.componentInstance.title = 'Eliminar ticket';
    ref.componentInstance.message = `¿Está seguro de eliminar el ticket «${t.numero_ticket} - ${t.titulo}»?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';
    ref.result.then(
      () => this.doDelete(),
      () => { this.ticketAEliminar = null; }
    );
  }

  doDelete(): void {
    if (!this.ticketAEliminar) return;
    const id = this.ticketAEliminar.id;
    this.ticketAEliminar = null;
    this.ticketsService.deleteTicket(id).subscribe({
      next: () => {
        this.toast.success('Ticket eliminado');
        this.cargar();
      },
      error: (err) => this.toast.error(err?.message || 'Error al eliminar'),
    });
  }
}
