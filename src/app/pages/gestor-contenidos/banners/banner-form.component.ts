import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';

@Component({
  selector: 'app-banner-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './banner-form.component.html'
})
export class BannerFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  banner: any = {
    titulo: '', descripcion: '',
    posicion_contenido: 'centro', alineacion_texto: 'center',
    tipo_media: 'imagen',
    imagen: '', imagen_url: '', imagen_movil: '', imagen_movil_url: '',
    video: '', video_url: '', video_movil: '', video_movil_url: '', poster_url: '',
    url: '', boton_texto: '', boton_url: '',
    posicion: 'principal', orden: 0, activo: true,
    fecha_inicio: '', fecha_fin: ''
  };

  editMode = false;
  loading = false;
  saving = false;
  uploadingImagen = false;
  uploadingMovil = false;
  uploadingPoster = false;

  posicionesContenido = [
    { value: 'centro', label: 'Centro (Por defecto)' },
    { value: 'izquierda', label: 'Izquierda' },
    { value: 'derecha', label: 'Derecha' },
    { value: 'superior-izquierda', label: 'Esquina Superior Izquierda' },
    { value: 'superior-derecha', label: 'Esquina Superior Derecha' },
    { value: 'inferior-izquierda', label: 'Esquina Inferior Izquierda' },
    { value: 'inferior-derecha', label: 'Esquina Inferior Derecha' }
  ];

  constructor(private service: GestorContenidosService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.loading = true;
      this.service.getBanner(+id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => { this.banner = { ...this.banner, ...(res.data || res) }; this.loading = false; },
        error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/banners']); }
      });
    }
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  getImagenPreview(val: string): string {
    return getStorageUrl(val);
  }

  subirImagen(event: Event, campo: string): void {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    if (!file) return;
    const setUploading = (v: boolean) => {
      if (campo === 'imagen_url') this.uploadingImagen = v;
      else if (campo === 'imagen_movil_url') this.uploadingMovil = v;
      else if (campo === 'poster_url') this.uploadingPoster = v;
    };
    setUploading(true);
    this.service.uploadImagen(file, 'banners/imagenes').pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const path = res?.data?.path;
        if (path) this.banner[campo] = path;
        setUploading(false);
        input.value = '';
      },
      error: () => { setUploading(false); input.value = ''; alert('Error al subir la imagen.'); }
    });
  }

  guardar(): void {
    if (!this.banner.titulo) return;
    this.saving = true;
    const obs = this.editMode
      ? this.service.actualizarBanner(this.banner.id, this.banner)
      : this.service.crearBanner(this.banner);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/gestor-contenidos/banners']); },
      error: () => { this.saving = false; }
    });
  }
}
