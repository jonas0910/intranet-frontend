import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { ComunicadosInstitucionalService, ModalMensaje } from '../../services/comunicados-institucional.service';
import { AuthService } from '../../services/auth.service';
import { ModalMensajeComunicadosComponent } from './modal-mensaje-comunicados.component';

const STORAGE_KEY = 'comunicados_modales_vistos';

@Component({
  selector: 'app-modal-mensaje-comunicados-container',
  standalone: true,
  imports: [CommonModule, ModalMensajeComunicadosComponent],
  template: `
    <app-modal-mensaje-comunicados
      *ngIf="mostrarModal && modales.length > 0"
      [modales]="modales"
      [modalActual]="modalActual"
      [indiceActual]="indiceActual"
      (cerrar)="cerrar()"
      (siguiente)="siguiente()"
      (marcarVisto)="marcarVisto($event)">
    </app-modal-mensaje-comunicados>
  `,
})
export class ModalMensajeComunicadosContainerComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  modales: ModalMensaje[] = [];
  modalActual: ModalMensaje | null = null;
  indiceActual = 0;
  mostrarModal = false;

  constructor(
    private svc: ComunicadosInstitucionalService,
    private auth: AuthService
  ) {}

  ngOnInit(): void {
    if (!this.auth.isLoggedIn()) return;
    this.svc.getModalesActivos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        const todos = r.data || [];
        const vistos = this.getVistosIds();
        this.modales = todos.filter((m) => !m.mostrar_una_vez || !vistos.includes(m.id));
        if (this.modales.length > 0) {
          this.indiceActual = 0;
          this.modalActual = this.modales[0];
          this.mostrarModal = true;
        }
      },
    });
  }

  getVistosIds(): number[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const ids = JSON.parse(raw);
      return Array.isArray(ids) ? ids : [];
    } catch {
      return [];
    }
  }

  marcarVisto(id: number): void {
    const vistos = this.getVistosIds();
    if (!vistos.includes(id)) vistos.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vistos));
  }

  cerrar(): void {
    if (this.modalActual?.mostrar_una_vez) {
      this.marcarVisto(this.modalActual.id);
    }
    this.mostrarModal = false;
    this.modalActual = null;
  }

  siguiente(): void {
    if (this.modalActual?.mostrar_una_vez) {
      this.marcarVisto(this.modalActual.id);
    }
    this.indiceActual++;
    if (this.indiceActual < this.modales.length) {
      this.modalActual = this.modales[this.indiceActual];
    } else {
      this.mostrarModal = false;
      this.modalActual = null;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
