import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';

@Component({
  selector: 'app-buzon-legal',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './buzon.component.html',
  styleUrl: './buzon.component.scss'
})
export class BuzonComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  items: any[] = [];
  loading = true;
  processing = false;

  constructor(private svc: AsesoriaLegalService) {}

  ngOnInit(): void {
    this.cargar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargar(): void {
    this.loading = true;
    this.svc.getBuzon().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.items = res.data || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  /** Indica si el documento fue recibido en Asesoría Legal (pendiente_recepcion = false/0) */
  estaRecibido(t: any): boolean {
    if (!t) return false;
    const p = t.pendiente_recepcion;
    return p === false || p === 0 || p === '0';
  }

  crearCaso(t: any): void {
    if (this.processing || !this.estaRecibido(t)) return;
    this.processing = true;
    this.svc.crearCasoDesdeTramite(t.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.cargar();
          alert('Caso legal creado: ' + (res.data?.numero_expediente_legal || res.data?.id));
        }
        this.processing = false;
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error');
      }
    });
  }

  getEstadoClass(e: string): string {
    const m: Record<string, string> = { registrado: 'badge-secondary', en_proceso: 'badge-info', derivado: 'badge-info', atendido: 'badge-success', archivado: 'badge-dark' };
    return m[e] || 'badge-secondary';
  }

  getPrioridadClass(p: string): string {
    const m: Record<string, string> = { baja: 'badge-secondary', normal: 'badge-info', alta: 'badge-warning', urgente: 'badge-danger' };
    return m[p] || 'badge-secondary';
  }
}
