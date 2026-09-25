import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, switchMap } from 'rxjs';
import { TramiteService } from '../../services/documento.service';

@Component({
  selector: 'app-areas-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './areas-usuarios.component.html',
  styleUrl: './areas-usuarios.component.scss'
})
export class AreasUsuariosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  areaId = 0;
  area: any = null;
  usuarios: any[] = [];
  usuariosDisponibles: any[] = [];
  loading = true;
  showModalAsignar = false;
  showModalEditar = false;
  formAsignar = { user_id: '', es_responsable: false, puede_recibir: true, puede_derivar: true, puede_atender: true };
  formEditarUsuario: any = null;
  processing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tramiteService: TramiteService
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(
      takeUntil(this.destroy$),
      switchMap(params => {
        this.areaId = +(params.get('id') || 0);
        this.loading = true;
        return this.tramiteService.getArea(this.areaId);
      })
    ).subscribe({
      next: (res) => {
        if (res.success) this.area = res.data;
        this.loading = false;
        this.cargarUsuarios();
      },
      error: () => this.loading = false
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarUsuarios(): void {
    this.tramiteService.getUsuariosArea(this.areaId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.usuarios = res.data || []; }
    });
    this.tramiteService.getUsuariosDisponibles(this.areaId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.usuariosDisponibles = res.data || []; }
    });
  }

  toggleMesaPartes(): void {
    const nuevoValor = !this.area?.es_mesa_partes;
    this.tramiteService.establecerMesaPartes(this.areaId, nuevoValor).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.area = { ...this.area, es_mesa_partes: nuevoValor };
      }
    });
  }

  abrirAsignar(): void {
    this.formAsignar = { user_id: '', es_responsable: false, puede_recibir: true, puede_derivar: true, puede_atender: true };
    this.showModalAsignar = true;
  }

  asignarUsuario(): void {
    if (!this.formAsignar.user_id) return;
    this.processing = true;
    this.tramiteService.asignarUsuarioArea(this.areaId, {
      user_id: +this.formAsignar.user_id,
      es_responsable: this.formAsignar.es_responsable,
      puede_recibir: this.formAsignar.puede_recibir,
      puede_derivar: this.formAsignar.puede_derivar,
      puede_atender: this.formAsignar.puede_atender
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showModalAsignar = false;
          this.cargarUsuarios();
        }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  abrirEditarUsuario(u: any): void {
    this.formEditarUsuario = { ...u };
    this.showModalEditar = true;
  }

  guardarUsuario(): void {
    if (!this.formEditarUsuario) return;
    this.processing = true;
    this.tramiteService.actualizarUsuarioArea(this.areaId, this.formEditarUsuario.id, {
      es_responsable: this.formEditarUsuario.es_responsable,
      puede_recibir: this.formEditarUsuario.puede_recibir,
      puede_derivar: this.formEditarUsuario.puede_derivar,
      puede_atender: this.formEditarUsuario.puede_atender,
      activo: this.formEditarUsuario.activo
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.showModalEditar = false;
          this.formEditarUsuario = null;
          this.cargarUsuarios();
        }
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }

  desasignarUsuario(userId: number): void {
    if (!confirm('¿Está seguro de desasignar a este usuario del área?')) return;
    this.tramiteService.desasignarUsuarioArea(this.areaId, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => { if (res.success) this.cargarUsuarios(); }
    });
  }

  volver(): void {
    this.router.navigate(['/areas']);
  }
}
