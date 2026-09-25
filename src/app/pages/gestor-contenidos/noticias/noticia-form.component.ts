import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

declare var tinymce: any;

@Component({
  selector: 'app-noticia-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './noticia-form.component.html'
})
export class NoticiaFormComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  noticia: any = {
    titulo: '', slug: '', resumen: '', contenido: '', meta_titulo: '', meta_descripcion: '', meta_keywords: '',
    imagen_principal: '', imagen_miniatura: '', archivo_adjunto: '', categoria: 'Institucional', tags: '', autor: '',
    publicada: false, destacada: false, fecha_publicacion: '', orden: 0
  };
  editMode = false;
  loading = false;
  saving = false;
  public slugManual = false;
  private editorReady = false;
  files: any = {};

  categorias = ['Institucional', 'Eventos', 'Comunicados', 'Capacitaciones', 'Legal', 'Otros'];

  constructor(private service: GestorContenidosService, private route: ActivatedRoute, private router: Router) {}

  getStorageUrl(path: string): string {
    if (!path) return 'assets/images/placeholder.jpg';
    if (path.startsWith('http')) return path;
    const cleanPath = path.replace(/^storage\//, '');
    return `${this.service.getMediaUrl()}/${cleanPath}`;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.loading = true;
      this.service.getNoticia(+id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.noticia = res.data;
          this.loading = false;
          this.slugManual = true;
          if (this.editorReady && typeof tinymce !== 'undefined') {
            const editor = tinymce.get('editor_contenido');
            if (editor) editor.setContent(this.noticia.contenido || '');
          }
        },
        error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/noticias']); }
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
      tinymce.remove('#editor_contenido');
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
        selector: '#editor_contenido',
        height: 400,
        language: 'es',
        plugins: 'advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount',
        toolbar: 'undo redo | blocks | bold italic forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | removeformat | help',
        menubar: 'file edit view insert format tools table help',
        setup: (editor: any) => {
          editor.on('init', () => {
            this.editorReady = true;
            if (this.noticia.contenido) {
              editor.setContent(this.noticia.contenido);
            }
          });
        }
      });
    }, 200);
  }

  generarSlug(): void {
    if (this.slugManual) return;
    this.noticia.slug = (this.noticia.titulo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  marcarSlugManual(): void { this.slugManual = true; }

  onFileSelected(event: any, field: string): void {
    const file = event.target.files[0];
    if (!file) return;

    if (field === 'archivo_adjunto') {
      this.files[field] = file;
      this.noticia[field] = file.name; // Para mostrar en el UI
      return;
    }

    // Para imagenes mantenemos la subida instantánea para la vista previa,
    // o podemos meterlos a FormData. Se mantendrá igual para imagenes:
    let folder = 'noticias';
    if (field === 'imagen_miniatura') folder = 'noticias/miniaturas';

    this.service.uploadImagen(file, folder).subscribe({
      next: (res: any) => {
        if (res.success && res.data) {
          this.noticia[field] = res.data.path;
        } else if (res.path) {
          this.noticia[field] = res.path;
        }
      },
      error: (err: any) => {
        console.error('Error subiendo imagen:', err);
        alert('Error al subir la imagen');
      }
    });
  }

  guardar(): void {
    if (!this.noticia.titulo) return;
    if (typeof tinymce !== 'undefined') {
      const editor = tinymce.get('editor_contenido');
      if (editor) this.noticia.contenido = editor.getContent();
    }
    this.saving = true;

    const formData = new FormData();
    Object.keys(this.noticia).forEach(key => {
      let val = this.noticia[key];
      // Skip the fake base string added for visual of PDF
      if (key === 'archivo_adjunto' && this.files['archivo_adjunto']) {
        return; 
      }
      if (val !== null && val !== undefined) {
        formData.append(key, val);
      }
    });

    Object.keys(this.files).forEach(key => {
      formData.append(key, this.files[key]);
    });

    if (this.editMode) {
      formData.append('_method', 'PUT');
    }

    const obs = this.editMode
      ? this.service.actualizarNoticiaConArchivos(this.noticia.id, formData)
      : this.service.crearNoticia(formData);
      
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { 
        this.saving = false; 
        this.router.navigate(['/gestor-contenidos/noticias']); 
      },
      error: (err: any) => { 
        this.saving = false; 
        console.error('Error guardando noticia:', err);
        alert('Error al guardar la noticia');
      }
    });
  }
}
