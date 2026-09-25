import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-oferta-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './oferta-form.component.html'
})
export class OfertaFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  form: any = {};
  editing = false;
  loading = false;
  saving = false;
  ofertaId: number | null = null;

  tiposContrato = ['tiempo_completo', 'medio_tiempo', 'temporal', 'practicas', 'consultoria', 'cas', 'locacion'];
  modalidades = ['presencial', 'remoto', 'hibrido'];
  estados = ['borrador', 'abierta', 'cerrada', 'finalizada'];

  files: any = {};

  constructor(
    private service: GestorContenidosService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.ofertaId = +id;
      this.editing = true;
      this.loadOferta();
    } else {
      this.initForm();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  initForm(): void {
    this.form = {
      titulo: '', 
      slug: '', 
      descripcion: '', 
      requisitos: '', 
      beneficios: '',
      tipo_contrato: 'tiempo_completo', 
      modalidad: 'presencial', 
      ubicacion: '',
      vacantes: 1, 
      salario_minimo: null, 
      salario_maximo: null, 
      estado: 'borrador',
      fecha_publicacion: '', 
      fecha_cierre: '', 
      pdf_bases: '', 
      pdf_evaluacion: '',
      pdf_ganadores: ''
    };
  }

  loadOferta(): void {
    this.loading = true;
    this.service.getOfertaEmpleo(this.ofertaId!)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.form = res.data || res;
          if (this.form.fecha_publicacion) this.form.fecha_publicacion = this.form.fecha_publicacion.substring(0, 10);
          if (this.form.fecha_cierre) this.form.fecha_cierre = this.form.fecha_cierre.substring(0, 10);
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  onFileSelected(event: any, field: string): void {
    const file = event.target.files[0];
    if (file) {
      this.files[field] = file;
    }
  }

  generateSlug(): void {
    if (!this.editing || !this.form.slug) {
      this.form.slug = (this.form.titulo || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    }
  }

  save(): void {
    this.saving = true;
    
    // Usamos FormData para enviar archivos
    const formData = new FormData();
    
    // Agregar campos normales
    Object.keys(this.form).forEach(key => {
      const val = this.form[key];
      if (val !== null && val !== undefined) {
        formData.append(key, val);
      }
    });

    // Agregar archivos seleccionados
    Object.keys(this.files).forEach(key => {
      formData.append(key, this.files[key]);
    });

    // Si estamos editando, Laravel a veces requiere _method=PUT en un POST de FormData
    if (this.editing) {
      formData.append('_method', 'PUT');
    }

    // Determinar observable según si es creación o edición
    const obs = this.editing
      ? this.service.actualizarOfertaConArchivos(this.ofertaId!, formData)
      : this.service.crearOfertaEmpleo(formData);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.router.navigate(['/gestor-contenidos/ofertas-empleo']);
      },
      error: (err: any) => {
        this.saving = false;
        console.error('Error guardando oferta:', err);
        alert('Error al guardar la oferta. Verifique los datos e intente nuevamente.');
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/gestor-contenidos/ofertas-empleo']);
  }
}
