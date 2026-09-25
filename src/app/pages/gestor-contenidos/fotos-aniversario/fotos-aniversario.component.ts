import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';

@Component({
  selector: 'app-fotos-aniversario',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fotos-aniversario.component.html'
})
export class FotosAniversarioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  fotos: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};
  uploadingImagen = false;
  uploadingThumbnail = false;
  page = 1;
  total = 0;
  perPage = 15;
  lastPage = 1;

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.service.getFotosAniversario({ page: this.page, per_page: this.perPage })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.fotos = res.data || res;
          this.total = res.meta?.total ?? this.fotos.length;
          this.lastPage = res.meta?.last_page ?? 1;
          this.perPage = res.meta?.per_page ?? 15;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  getImagenUrl(foto: any): string {
    const path = foto?.imagen_url || foto?.imagen || foto?.thumbnail || foto?.thumbnail_url;
    return getStorageUrl(path);
  }

  openCreate(): void {
    this.editing = false;
    this.form = {
      titulo: '', nombre_actividad: '', descripcion: '',
      anio: new Date().getFullYear(), fecha: '', fecha_inicio: '', fecha_fin: '',
      imagen: '', imagen_thumbnail: '', orden: 0, activo: true, es_anuncio: false
    };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = {
      ...item,
      imagen: item.imagen || item.imagen_url,
      imagen_thumbnail: item.imagen_thumbnail || item.thumbnail
    };
    this.showModal = true;
  }

  subirImagen(event: Event, campo: 'imagen' | 'imagen_thumbnail'): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const carpeta = campo === 'imagen' ? 'aniversario' : 'aniversario/thumbnails';
    if (campo === 'imagen') this.uploadingImagen = true; else this.uploadingThumbnail = true;
    this.service.uploadImagen(file, carpeta).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const path = res?.data?.path;
        if (path) this.form[campo] = path;
        if (campo === 'imagen') this.uploadingImagen = false; else this.uploadingThumbnail = false;
        input.value = '';
      },
      error: () => {
        if (campo === 'imagen') this.uploadingImagen = false; else this.uploadingThumbnail = false;
        input.value = '';
        alert('Error al subir la imagen.');
      }
    });
  }

  getPreviewUrl(path: string): string {
    return getStorageUrl(path);
  }

  save(): void {
    if (!this.form.titulo) { alert('El título es obligatorio.'); return; }
    if (!this.form.imagen && !this.editing) { alert('La imagen es obligatoria.'); return; }
    const datos = {
      titulo: this.form.titulo,
      nombre_actividad: this.form.nombre_actividad,
      descripcion: this.form.descripcion,
      anio: this.form.anio ?? new Date().getFullYear(),
      fecha: this.form.fecha || null,
      fecha_inicio: this.form.fecha_inicio || null,
      fecha_fin: this.form.fecha_fin || null,
      imagen: this.form.imagen,
      imagen_thumbnail: this.form.imagen_thumbnail || this.form.thumbnail,
      orden: this.form.orden ?? 0,
      activo: !!this.form.activo,
      es_anuncio: !!this.form.es_anuncio
    };
    const obs = this.editing
      ? this.service.actualizarFotoAniversario(this.form.id, datos)
      : this.service.crearFotoAniversario(datos);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => { console.error(err); alert(err?.error?.message || 'Error al guardar'); }
    });
  }

  toggleEstado(foto: any): void {
    this.service.toggleFotoAniversario(foto.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => { foto.activo = res.activo; },
        error: (err: any) => console.error('Error toggling foto:', err)
      });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar esta foto de aniversario?')) return;
    this.service.eliminarFotoAniversario(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  goPage(p: number): void {
    if (p >= 1 && p <= this.lastPage) {
      this.page = p;
      this.loadData();
    }
  }
}
