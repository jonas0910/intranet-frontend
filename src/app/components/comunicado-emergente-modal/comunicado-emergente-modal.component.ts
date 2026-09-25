import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

export interface ComunicadoModalItem {
  id: number;
  titulo: string;
  contenido: string;
  tipo: string;
  prioridad: string;
  modal_duracion_segundos?: number;
  modal_mostrar_una_vez?: boolean;
}

@Component({
  selector: 'app-comunicado-emergente-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="modal-header" [ngClass]="headerClass">
      <h5 class="modal-title">
        <i [class]="tipoIcon + ' mr-2'"></i>{{ comunicado.titulo }}
      </h5>
      <button type="button" class="close text-white" aria-label="Cerrar" (click)="cerrar()">
        <span aria-hidden="true">&times;</span>
      </button>
    </div>
    <div class="modal-body">
      <div class="comunicado-contenido" [innerHTML]="contenidoFormateado"></div>
      <div class="mt-3 d-flex justify-content-between align-items-center">
        <small class="text-muted" *ngIf="segundosRestantes > 0">
          Se cerrará en <strong>{{ segundosRestantes }}</strong> segundos
        </small>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="cerrar()">
          Cerrar ahora
        </button>
      </div>
    </div>
  `,
  styles: [`
    .comunicado-contenido {
      white-space: pre-wrap;
      max-height: 60vh;
      overflow-y: auto;
    }
  `]
})
export class ComunicadoEmergenteModalComponent implements OnInit, OnDestroy {
  @Input() comunicado!: ComunicadoModalItem;
  @Input() duracionSegundos = 10;

  segundosRestantes = 0;
  private intervalId: any;

  constructor(public activeModal: NgbActiveModal) {}

  get headerClass(): string {
    const tipo = (this.comunicado.tipo || 'noticia') as string;
    const map: Record<string, string> = {
      noticia: 'bg-primary text-white',
      evento: 'bg-success text-white',
      alerta: 'bg-warning text-dark',
      anuncio: 'bg-info text-white'
    };
    return map[tipo] || 'bg-primary text-white';
  }

  get tipoIcon(): string {
    const tipo = (this.comunicado.tipo || 'noticia') as string;
    const map: Record<string, string> = {
      noticia: 'fas fa-newspaper',
      evento: 'fas fa-calendar-alt',
      alerta: 'fas fa-exclamation-triangle',
      anuncio: 'fas fa-bullhorn'
    };
    return map[tipo] || 'fas fa-bullhorn';
  }

  get contenidoFormateado(): string {
    if (!this.comunicado.contenido) return '';
    return this.comunicado.contenido
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  ngOnInit(): void {
    this.segundosRestantes = Math.max(5, Math.min(300, this.duracionSegundos || 10));
    this.intervalId = setInterval(() => {
      this.segundosRestantes--;
      if (this.segundosRestantes <= 0) {
        this.cerrar();
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  cerrar(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.activeModal.close('closed');
  }
}
