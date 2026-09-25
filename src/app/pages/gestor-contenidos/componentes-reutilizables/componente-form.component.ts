import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-componente-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './componente-form.component.html'
})
export class ComponenteFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  componente: any = {
    nombre: '', tipo: '', icono: 'fas fa-puzzle-piece', descripcion: '',
    html_template: '', configuracion: null, orden: 0, activo: true
  };
  editMode = false;
  loading = false;
  saving = false;

  tiposDisponibles = [
    { value: 'tabla_basica', label: 'Tabla Básica' },
    { value: 'tabla_compleja', label: 'Tabla Compleja' },
    { value: 'carrusel', label: 'Carrusel' },
    { value: 'foto_texto', label: 'Foto con Texto' },
    { value: 'foto_texto_inv', label: 'Foto con Texto (invertido)' },
    { value: 'tarjetas', label: 'Tarjetas' },
    { value: 'cita', label: 'Cita / Testimonio' },
    { value: 'cta', label: 'Llamada a la Acción' },
    { value: 'lista_iconos', label: 'Lista con Iconos' },
    { value: 'dos_columnas', label: 'Dos Columnas' },
    { value: 'otro', label: 'Otro' }
  ];

  constructor(
    private service: GestorContenidosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id && id !== 'crear') {
      this.editMode = true;
      this.cargar(+id);
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cargar(id: number): void {
    this.loading = true;
    this.service.getComponenteReutilizable(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res?.success && res.data) this.componente = res.data;
        this.loading = false;
      },
      error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/componentes-reutilizables']); }
    });
  }

  guardar(): void {
    if (!this.componente.nombre || !this.componente.tipo || !this.componente.html_template) return;
    this.saving = true;
    const obs = this.editMode
      ? this.service.actualizarComponenteReutilizable(this.componente.id, this.componente)
      : this.service.crearComponenteReutilizable(this.componente);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/gestor-contenidos/componentes-reutilizables']); },
      error: () => { this.saving = false; }
    });
  }
}
