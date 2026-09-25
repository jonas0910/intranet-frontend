import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

declare var tinymce: any;

@Component({
  selector: 'app-proyecto-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './proyecto-form.component.html'
})
export class ProyectoFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  proyecto: any = {
    titulo: '', slug: '', descripcion_corta: '', descripcion_completa: '', meta_titulo: '', meta_descripcion: '',
    objetivos: '', hitos: '', equipo: '', observaciones: '',
    estado: 'planificacion', progreso: 0, prioridad: 'media',
    fecha_inicio: '', fecha_fin_estimada: '', presupuesto: null,
    responsable: '', ubicacion: '', imagen_principal: '',
    publicado: true, destacado: false, orden: 0
  };
  editMode = false;
  loading = false;
  saving = false;
  public slugManual = false;
  private editorReady = false;

  estados = [
    { value: 'planificacion', label: 'Planificación', color: 'info' },
    { value: 'en_curso', label: 'En Curso', color: 'primary' },
    { value: 'completado', label: 'Completado', color: 'success' },
    { value: 'pausado', label: 'Pausado', color: 'warning' },
    { value: 'cancelado', label: 'Cancelado', color: 'danger' }
  ];

  prioridades = [
    { value: 'baja', label: 'Baja' },
    { value: 'media', label: 'Media' },
    { value: 'alta', label: 'Alta' },
    { value: 'urgente', label: 'Urgente' }
  ];

  constructor(private service: GestorContenidosService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.loading = true;
      this.service.getProyecto(+id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.proyecto = res.data;
          if (this.proyecto.objetivos && typeof this.proyecto.objetivos !== 'string') this.proyecto.objetivos = JSON.stringify(this.proyecto.objetivos, null, 2);
          if (this.proyecto.hitos && typeof this.proyecto.hitos !== 'string') this.proyecto.hitos = JSON.stringify(this.proyecto.hitos, null, 2);
          if (this.proyecto.equipo && typeof this.proyecto.equipo !== 'string') this.proyecto.equipo = JSON.stringify(this.proyecto.equipo, null, 2);
          this.loading = false;
          this.slugManual = true;
          if (this.editorReady && typeof tinymce !== 'undefined') {
            const editor = tinymce.get('editor_descripcion');
            if (editor) editor.setContent(this.proyecto.descripcion_completa || '');
          }
        },
        error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/proyectos']); }
      });
    }
  }

  ngAfterViewInit(): void {
    this.loadTinyMCE();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (typeof tinymce !== 'undefined') {
      tinymce.remove('#editor_descripcion');
    }
  }

  private loadTinyMCE(): void {
    if (typeof tinymce !== 'undefined') {
      this.initEditor();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.tiny.cloud/1/no-api-key/tinymce/6/tinymce.min.js';
    script.onload = () => this.initEditor();
    document.head.appendChild(script);
  }

  private initEditor(): void {
    setTimeout(() => {
      if (typeof tinymce === 'undefined') return;
      tinymce.init({
        selector: '#editor_descripcion',
        height: 300,
        language: 'es',
        plugins: 'advlist autolink lists link image charmap anchor searchreplace visualblocks code insertdatetime media table help wordcount',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist | removeformat',
        menubar: false,
        setup: (editor: any) => {
          editor.on('init', () => {
            this.editorReady = true;
            if (this.proyecto.descripcion_completa) {
              editor.setContent(this.proyecto.descripcion_completa);
            }
          });
        }
      });
    }, 200);
  }

  generarSlug(): void {
    if (this.slugManual) return;
    this.proyecto.slug = (this.proyecto.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  getEstadoColor(): string {
    const e = this.estados.find(s => s.value === this.proyecto.estado);
    return e ? e.color : 'secondary';
  }

  guardar(): void {
    if (!this.proyecto.titulo) return;
    if (typeof tinymce !== 'undefined') {
      const editor = tinymce.get('editor_descripcion');
      if (editor) this.proyecto.descripcion_completa = editor.getContent();
    }
    this.saving = true;
    const data = { ...this.proyecto };
    ['objetivos', 'hitos', 'equipo'].forEach(f => {
      if (data[f] && typeof data[f] === 'string') { try { data[f] = JSON.parse(data[f]); } catch { /* keep as string */ } }
    });
    if (data.estado === 'completado' && !data.fecha_fin_real) {
      data.fecha_fin_real = new Date().toISOString().split('T')[0];
      data.progreso = 100;
    }
    const obs = this.editMode
      ? this.service.actualizarProyecto(this.proyecto.id, data)
      : this.service.crearProyecto(data);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/gestor-contenidos/proyectos']); },
      error: () => { this.saving = false; }
    });
  }
}
