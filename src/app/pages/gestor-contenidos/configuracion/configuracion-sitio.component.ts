import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-configuracion-sitio',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './configuracion-sitio.component.html'
})
export class ConfiguracionSitioComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  configuraciones: any[] = [];
  categorias: string[] = [];
  loading = true;
  showModal = false;
  savingAll = false;

  nuevaConfig: any = { clave: '', valor: '', tipo: 'texto', categoria: 'general', descripcion: '', activo: true };
  savingNueva = false;
  categoriasOpciones = ['general', 'seo', 'redes_sociales', 'contacto', 'diseno'];

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void { this.cargar(); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  cargar(): void {
    this.loading = true;
    this.service.getConfiguracion().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const list = res.data?.data ?? res.data ?? [];
        this.configuraciones = list.map((c: any) => ({
          ...c,
          _eliminarImagen: false,
          _archivo: null as File | null
        }));
        this.extraerCategorias();
        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  private extraerCategorias(): void {
    const cats = new Set<string>();
    this.configuraciones.forEach(c => { if (c.categoria) cats.add(c.categoria); });
    this.categorias = Array.from(cats).sort();
  }

  getConfigsByCategoria(cat: string): any[] {
    return this.configuraciones.filter(c => c.categoria === cat);
  }

  guardarTodas(): void {
    const tieneImagenes = this.configuraciones.some(c =>
      (c.tipo === 'imagen' || c.tipo === 'image') && (c._archivo || c._eliminarImagen)
    );
    if (tieneImagenes) {
      const form = new FormData();
      const listSinArchivos = this.configuraciones.filter(c =>
        !((c.tipo === 'imagen' || c.tipo === 'image') && c._archivo)
      ).map(c => ({ id: c.id, valor: (c.tipo === 'imagen' || c.tipo === 'image') && c._eliminarImagen ? '' : c.valor }));
      form.append('configuraciones', JSON.stringify(listSinArchivos));
      this.configuraciones.forEach(c => {
        if (c.tipo === 'imagen' || c.tipo === 'image') {
          if (c._eliminarImagen) form.append(`eliminar_archivos[${c.id}]`, '1');
          if (c._archivo) form.append(`archivos[${c.id}]`, c._archivo);
        }
      });
      this.savingAll = true;
      this.service.guardarTodasConfiguracion(form).pipe(takeUntil(this.destroy$)).subscribe({
        next: () => { this.savingAll = false; this.cargar(); },
        error: () => { this.savingAll = false; }
      });
      return;
    }
    this.savingAll = true;
    const calls = this.configuraciones.map(c =>
      this.service.actualizarConfiguracion(c.id, { valor: c.valor })
    );
    if (calls.length === 0) { this.savingAll = false; return; }
    forkJoin(calls).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.savingAll = false; },
      error: () => { this.savingAll = false; }
    });
  }

  eliminar(config: any): void {
    if (!confirm('¿Eliminar la configuración "' + config.clave + '"?')) return;
    this.service.eliminarConfiguracion(config.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.configuraciones = this.configuraciones.filter(c => c.id !== config.id); this.extraerCategorias(); },
      error: () => alert('Error al eliminar')
    });
  }

  onImagenFile(config: any, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input?.files?.length) config._archivo = input.files[0];
    input.value = '';
  }

  getImagenPreview(config: any): string | null {
    if (config._archivo) return URL.createObjectURL(config._archivo);
    if (config.valor && !config._eliminarImagen) return config.valor;
    return null;
  }

  openCrear(): void {
    this.nuevaConfig = { clave: '', valor: '', tipo: 'texto', categoria: 'general', descripcion: '', activo: true };
    this.showModal = true;
  }

  crearConfiguracion(): void {
    if (!this.nuevaConfig.clave) return;
    this.savingNueva = true;
    const datos = { ...this.nuevaConfig, categoria: this.nuevaConfig.categoria || 'general' };
    this.service.crearConfiguracion(datos).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) { this.showModal = false; this.cargar(); }
        this.savingNueva = false;
      },
      error: () => { this.savingNueva = false; }
    });
  }

  getCategoriaIcon(cat: string): string {
    const map: any = {
      general: 'fa-cog', apariencia: 'fa-palette', seo: 'fa-search',
      redes_sociales: 'fa-share-alt', contacto: 'fa-envelope',
      correo: 'fa-at', seguridad: 'fa-shield-alt', diseno: 'fa-palette'
    };
    return map[cat] || 'fa-sliders-h';
  }
}
