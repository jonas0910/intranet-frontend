import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';

@Component({
  selector: 'app-abogados-legal',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './abogados.component.html',
  styleUrl: './abogados.component.scss'
})
export class AbogadosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  abogados: any[] = [];
  usuariosDisponibles: any[] = [];
  loading = true;
  processing = false;
  showModal = false;
  selectedUserId = 0;
  esJefeLegal = false;

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
    this.svc.getAbogados().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.abogados = res.data || [];
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  abrirModal(): void {
    this.showModal = true;
    this.selectedUserId = 0;
    this.esJefeLegal = false;
    this.svc.getUsuariosParaAbogados().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.usuariosDisponibles = res.data || [];
      }
    });
  }

  cerrarModal(): void {
    this.showModal = false;
  }

  agregarAbogado(): void {
    if (!this.selectedUserId || this.processing) return;
    this.processing = true;
    this.svc.crearAbogado(this.selectedUserId, this.esJefeLegal).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.cargar();
          this.cerrarModal();
        }
        this.processing = false;
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error al agregar');
      }
    });
  }

  toggleJefe(id: number, actual: boolean): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.actualizarAbogado(id, { es_jefe_legal: !actual }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.cargar();
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  toggleActivo(id: number, actual: boolean): void {
    if (this.processing) return;
    this.processing = true;
    this.svc.actualizarAbogado(id, { activo: !actual }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.cargar();
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }
}
