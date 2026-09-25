import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { TicketsService } from '../services/tickets.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../services/permission.service';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './ticket-detail.component.html',
})
export class TicketDetailComponent implements OnInit {
  ticket: any = null;
  usuarios: any[] = [];
  nuevoComentario = '';
  esComentarioInterno = false;
  archivosSeleccionados: File[] = [];
  loading = false;
  enviandoComentario = false;

  constructor(
    private route: ActivatedRoute,
    private ticketsService: TicketsService,
    private designSystem: DesignSystemService,
    private toast: ToastService,
    private permissionService: PermissionService,
    private authService: AuthService
  ) {}

  get cv(): CrudViewConfig {
    return this.designSystem.getCrudViewFor('helpdesk');
  }

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
    this.cargarUsuarios();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.cargar(id);
  }

  cargarUsuarios(): void {
    this.ticketsService.getUsuariosParaAsignar().subscribe({
      next: (res) => {
        const data = res.data;
        this.usuarios = Array.isArray(data) ? data : (data?.data || []);
      },
      error: () => {},
    });
  }

  cargar(id: string): void {
    this.loading = true;
    this.ticketsService.getTicket(id).subscribe({
      next: (res) => {
        const d = res.data;
        if (d.archivos_adjuntos != null && typeof d.archivos_adjuntos === 'string') {
          try {
            d.archivos_adjuntos = JSON.parse(d.archivos_adjuntos);
          } catch {
            d.archivos_adjuntos = [];
          }
        }
        if (!Array.isArray(d.archivos_adjuntos)) {
          d.archivos_adjuntos = d.archivos_adjuntos ? [d.archivos_adjuntos] : [];
        }
        this.ticket = d;
        this.normalizarComentarios(this.ticket);
        this.loading = false;
      },
      error: (err) => {
        this.toast.error(err?.message || 'Error al cargar el ticket');
        this.loading = false;
      },
    });
  }

  asignarColaborador(userId: string): void {
    if (!this.ticket) return;
    const id = userId === '' ? null : Number(userId);
    this.ticketsService.asignar(this.ticket.id, id).subscribe({
      next: (res) => {
        this.ticket = res.data;
        this.toast.success(id ? 'Colaborador asignado' : 'Asignación quitada');
      },
      error: (err) => this.toast.error(err?.message || 'Error al asignar'),
    });
  }

  onArchivosSeleccionados(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.archivosSeleccionados = Array.from(input.files);
    }
  }

  /** Soporte: ver todos los hilos + nota interna. Usuario: solo mensajes públicos (API ya filtra al cargar). */
  get esSoporteEnEsteTicket(): boolean {
    const uid = this.authService.getCurrentUser()?.id;
    if (!this.ticket || uid == null) return false;
    if (this.permissionService.hasPermission('tickets.ver')) return true;
    return Number(this.ticket.asignado_a) === Number(uid);
  }

  get esSolicitante(): boolean {
    const uid = this.authService.getCurrentUser()?.id;
    if (!this.ticket || uid == null) return false;
    return Number(this.ticket.solicitante_id) === Number(uid);
  }

  private normalizarComentarios(t: any): void {
    const list = t?.comentarios;
    if (!Array.isArray(list)) {
      t.comentarios = [];
      return;
    }
    for (const c of list) {
      let adj = c.archivos_adjuntos;
      if (adj != null && typeof adj === 'string') {
        try {
          adj = JSON.parse(adj);
        } catch {
          adj = [];
        }
      }
      c.archivos_adjuntos = Array.isArray(adj) ? adj : [];
    }
  }

  enviarRespuesta(): void {
    if (!this.ticket || !this.nuevoComentario.trim()) return;
    this.enviandoComentario = true;
    const esInterno = this.esSoporteEnEsteTicket && this.esComentarioInterno;
    const files = this.archivosSeleccionados;
    const run = (archivos_base64: { nombre: string; data: string }[]) => {
      this.ticketsService
        .agregarComentarioCompleto(this.ticket.id, {
          comentario: this.nuevoComentario.trim(),
          es_interno: esInterno,
          archivos_base64: archivos_base64.length ? archivos_base64 : undefined,
        })
        .subscribe({
          next: (res) => {
            if (!this.ticket.comentarios) this.ticket.comentarios = [];
            this.ticket.comentarios.push(res.data);
            this.normalizarComentarios(this.ticket);
            this.nuevoComentario = '';
            this.esComentarioInterno = false;
            this.archivosSeleccionados = [];
            const input = document.querySelector('#adjuntos-respuesta-ticket') as HTMLInputElement;
            if (input) input.value = '';
            this.enviandoComentario = false;
            this.toast.success(this.esSoporteEnEsteTicket && !this.esSolicitante ? 'Respuesta de soporte enviada' : 'Mensaje enviado al soporte');
          },
          error: (err) => {
            this.toast.error(err?.message || 'Error al enviar');
            this.enviandoComentario = false;
          },
        });
    };
    if (!files.length) {
      run([]);
      return;
    }
    const archivos_base64: { nombre: string; data: string }[] = [];
    let pending = files.length;
    for (const f of files) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = String(reader.result || '');
        const base64 = data.includes(',') ? data.split(',')[1] : data;
        archivos_base64.push({ nombre: f.name, data: base64 });
        pending--;
        if (pending === 0) run(archivos_base64);
      };
      reader.onerror = () => {
        pending--;
        if (pending === 0) run(archivos_base64);
      };
      reader.readAsDataURL(f);
    }
  }

  agregarComentario(): void {
    this.enviarRespuesta();
  }

  cambiarEstado(estado: string): void {
    if (!this.ticket) return;
    this.ticketsService.cambiarEstado(this.ticket.id, estado).subscribe({
      next: (res) => {
        this.ticket = res.data;
        this.toast.success('Estado actualizado');
      },
      error: (err) => this.toast.error(err?.message || 'Error'),
    });
  }

  private storageBase(): string {
    return environment.apiUrl.replace(/\/api\/?$/, '');
  }

  /** URL que sirve el archivo (ruta web Laravel; no depende de symlink public/storage). */
  urlAdjunto(adj: { url?: string; path?: string; nombre?: string }): string {
    const base = this.storageBase();
    const path = adj?.path ? String(adj.path) : '';
    if (path.startsWith('helpdesk/tickets/')) {
      return `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
    }
    if (adj?.url && !adj.url.includes('/storage/')) {
      if (adj.url.startsWith('/')) return base + adj.url;
      return adj.url;
    }
    if (path) return `${base}/helpdesk/archivo?p=${encodeURIComponent(path)}`;
    if (adj?.url?.startsWith('/')) return base + adj.url;
    return adj?.url || '';
  }

  esImagen(nombre: string): boolean {
    if (!nombre) return false;
    const ext = nombre.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
  }

  esImagenAdjunto(adj: { nombre?: string; path?: string }): boolean {
    const n = adj?.nombre || '';
    const p = (adj?.path || '').split('/').pop() || '';
    return this.esImagen(n) || this.esImagen(p);
  }

  get adjuntosIniciales(): any[] {
    const a = this.ticket?.archivos_adjuntos;
    return Array.isArray(a) ? a : [];
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
    return new Date(d).toLocaleString('es-PE');
  }
}
