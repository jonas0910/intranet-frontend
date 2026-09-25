import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { NgbModal, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { ComunicadosService } from './comunicados.service';
import { ToastService } from '../../services/toast.service';
import { DesignSystemService } from '../../services/design-system.service';
import { ConfirmDialogComponent } from '../../shared/components/confirm-dialog/confirm-dialog.component';

export interface Comunicado {
  id: number;
  titulo: string;
  contenido: string;
  tipo: 'noticia' | 'evento' | 'alerta' | 'anuncio';
  prioridad: 'normal' | 'importante' | 'urgente';
  es_anclado: boolean;
  es_publico: boolean;
  mostrar_como_modal?: boolean;
  modal_duracion_segundos?: number;
  modal_mostrar_una_vez?: boolean;
  departamentos_objetivo: any[] | null;
  fecha_publicacion: string;
  fecha_expiracion: string | null;
  imagen: string | null;
  archivos_adjuntos: any[] | null;
  created_by: {
    id: number;
    name: string;
    email: string;
  };
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-comunicados',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbModalModule],
  templateUrl: './comunicados.component.html',
  styleUrls: ['./comunicados.component.scss']
})
export class ComunicadosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  comunicados: Comunicado[] = [];
  filteredComunicados: Comunicado[] = [];
  loading = false;
  saving = false;

  showForm = false;
  editComunicado: Partial<Comunicado> | null = null;
  comunicadoAEliminar: Comunicado | null = null;

  // Filtros
  selectedTipo: string = 'todos';
  selectedPrioridad: string = 'todos';
  searchTerm: string = '';
  showAnclados: boolean = false;

  // Stats
  stats = {
    total: 0,
    anclados: 0,
    urgentes: 0
  };

  constructor(
    private comunicadosService: ComunicadosService,
    private toast: ToastService,
    private modalService: NgbModal,
    private designSystem: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('comunicados');
    this.loadComunicados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadComunicados(): void {
    this.loading = true;

    console.log('🔔 Comunicados: Cargando comunicados...');

    this.comunicadosService.getComunicados()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('🔔 Comunicados: Response received:', response);
          console.log('🔔 Comunicados: Response structure:', {
            success: response.success,
            hasData: !!response.data,
            dataType: Array.isArray(response.data) ? 'array' : typeof response.data,
            dataLength: Array.isArray(response.data) ? response.data.length : 0
          });

          this.comunicados = response.data || [];
          this.stats = response.meta || { total: 0, anclados: 0, urgentes: 0 };
          this.applyFilters();
          this.loading = false;

          console.log('🔔 Comunicados: Loaded count:', this.comunicados.length);
          console.log('🔔 Comunicados: Stats:', this.stats);
        },
        error: (error) => {
          console.error('❌ Error loading comunicados:', error);
          this.toast.error((typeof error === 'string' ? error : error?.message) || 'Error al cargar comunicados');
          this.loading = false;
        }
      });
  }

  applyFilters(): void {
    this.filteredComunicados = this.comunicados.filter(c => {
      // Filtro por tipo
      if (this.selectedTipo !== 'todos' && c.tipo !== this.selectedTipo) {
        return false;
      }

      // Filtro por prioridad
      if (this.selectedPrioridad !== 'todos' && c.prioridad !== this.selectedPrioridad) {
        return false;
      }

      // Filtro por anclados
      if (this.showAnclados && !c.es_anclado) {
        return false;
      }

      // Filtro por búsqueda
      if (this.searchTerm) {
        const term = this.searchTerm.toLowerCase();
        return c.titulo.toLowerCase().includes(term) ||
               c.contenido.toLowerCase().includes(term);
      }

      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getTipoBadgeClass(tipo: string): string {
    const classes: { [key: string]: string } = {
      'noticia': 'badge-primary',
      'evento': 'badge-success',
      'alerta': 'badge-warning',
      'anuncio': 'badge-info'
    };
    return classes[tipo] || 'badge-secondary';
  }

  getPrioridadBadgeClass(prioridad: string): string {
    const classes: { [key: string]: string } = {
      'normal': 'badge-secondary',
      'importante': 'badge-warning',
      'urgente': 'badge-danger'
    };
    return classes[prioridad] || 'badge-secondary';
  }

  getTipoIcon(tipo: string): string {
    const icons: { [key: string]: string } = {
      'noticia': 'fas fa-newspaper',
      'evento': 'fas fa-calendar-alt',
      'alerta': 'fas fa-exclamation-triangle',
      'anuncio': 'fas fa-bullhorn'
    };
    return icons[tipo] || 'fas fa-file-alt';
  }

  getPreview(contenido: string, maxLength: number = 200): string {
    if (contenido.length <= maxLength) {
      return contenido;
    }
    return contenido.substring(0, maxLength) + '...';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  isExpired(comunicado: Comunicado): boolean {
    if (!comunicado.fecha_expiracion) {
      return false;
    }
    return new Date(comunicado.fecha_expiracion) < new Date();
  }

  toggleAnclar(comunicado: Comunicado): void {
    this.comunicadosService.toggleAnclar(comunicado.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          comunicado.es_anclado = response.es_anclado;
          this.toast.success(comunicado.es_anclado ? 'Comunicado anclado' : 'Comunicado desanclado');
          this.loadComunicados(); // Reload to reorder
        },
        error: (error) => {
          this.toast.error((typeof error === 'string' ? error : error?.message) || 'Error al cambiar anclado');
        }
      });
  }

  openCreate(): void {
    this.editComunicado = {
      titulo: '',
      contenido: '',
      tipo: 'noticia',
      prioridad: 'normal',
      es_anclado: false,
      es_publico: true,
      mostrar_como_modal: false,
      modal_duracion_segundos: 10,
      modal_mostrar_una_vez: true,
      fecha_publicacion: new Date().toISOString().split('T')[0],
      fecha_expiracion: null
    };
    this.showForm = true;
  }

  openEdit(comunicado: Comunicado): void {
    this.editComunicado = {
      id: comunicado.id,
      titulo: comunicado.titulo,
      contenido: comunicado.contenido,
      tipo: comunicado.tipo,
      prioridad: comunicado.prioridad,
      es_anclado: comunicado.es_anclado,
      es_publico: comunicado.es_publico,
      mostrar_como_modal: comunicado.mostrar_como_modal ?? false,
      modal_duracion_segundos: comunicado.modal_duracion_segundos ?? 10,
      modal_mostrar_una_vez: comunicado.modal_mostrar_una_vez ?? true,
      fecha_publicacion: comunicado.fecha_publicacion?.toString().split('T')[0] ?? '',
      fecha_expiracion: comunicado.fecha_expiracion ? comunicado.fecha_expiracion.toString().split('T')[0] : null
    };
    this.showForm = true;
  }

  cancelForm(): void {
    this.editComunicado = null;
    this.showForm = false;
  }

  save(): void {
    if (!this.editComunicado) return;
    const id = this.editComunicado.id;
    const payload = {
      titulo: this.editComunicado.titulo,
      contenido: this.editComunicado.contenido,
      tipo: this.editComunicado.tipo,
      prioridad: this.editComunicado.prioridad,
      es_anclado: this.editComunicado.es_anclado ?? false,
      es_publico: this.editComunicado.es_publico ?? true,
      mostrar_como_modal: this.editComunicado.mostrar_como_modal ?? false,
      modal_duracion_segundos: this.editComunicado.modal_duracion_segundos ?? 10,
      modal_mostrar_una_vez: this.editComunicado.modal_mostrar_una_vez ?? true,
      fecha_publicacion: this.editComunicado.fecha_publicacion,
      fecha_expiracion: this.editComunicado.fecha_expiracion || null
    };
    this.saving = true;
    const obs = id
      ? this.comunicadosService.updateComunicado(id, payload)
      : this.comunicadosService.createComunicado(payload);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success(id ? 'Comunicado actualizado' : 'Comunicado creado');
        this.cancelForm();
        this.loadComunicados();
        this.saving = false;
      },
      error: (err) => {
        this.toast.error((typeof err === 'string' ? err : err?.message) || 'Error al guardar');
        this.saving = false;
      }
    });
  }

  confirmDelete(comunicado: Comunicado): void {
    this.comunicadoAEliminar = comunicado;
    const ref = this.modalService.open(ConfirmDialogComponent, { centered: true });
    ref.componentInstance.subsystem = 'comunicados';
    ref.componentInstance.title = 'Eliminar comunicado';
    ref.componentInstance.message = `¿Está seguro de eliminar «${comunicado.titulo}»?`;
    ref.componentInstance.detail = 'Esta acción no se puede deshacer.';
    ref.componentInstance.type = 'danger';
    ref.componentInstance.confirmText = 'Sí, eliminar';
    ref.componentInstance.confirmIcon = 'fas fa-trash';
    ref.componentInstance.confirmClass = 'btn-danger';

    ref.result.then(
      () => this.doDelete(),
      () => { this.comunicadoAEliminar = null; }
    );
  }

  doDelete(): void {
    if (!this.comunicadoAEliminar) return;
    const id = this.comunicadoAEliminar.id;
    this.comunicadoAEliminar = null;
    this.comunicadosService.deleteComunicado(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.toast.success('Comunicado eliminado');
          this.loadComunicados();
        },
        error: (err) => this.toast.error((typeof err === 'string' ? err : err?.message) || 'Error al eliminar')
      });
  }

  mostrarEnLinea(comunicado: Comunicado): void {
    this.comunicadosService.mostrarEnLinea(comunicado.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.toast.success('Comunicado enviado a todos los terminales conectados'),
        error: (err) => this.toast.error((typeof err === 'string' ? err : err?.message) || 'No se pudo enviar. Compruebe el servidor WebSocket.')
      });
  }

  onRefresh(): void {
    this.loadComunicados();
  }
}
