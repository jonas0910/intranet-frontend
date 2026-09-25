import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tema-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './tema-form.component.html'
})
export class TemaFormComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tema: any = {
    nombre: '', slug: '', descripcion: '', preview: '',
    color_primario: '#007bff', color_secundario: '#6c757d', color_acento: '#28a745',
    color_navbar: '#343a40', color_barra_accesos: '#1a1a2e', color_top_bar: '#16213e',
    color_texto_top_bar: '#ffffff', color_fondo: '#ffffff', color_texto: '#212529',
    fuente_principal: 'Roboto', tamano_fuente: 16,
    banner_altura_desktop: '500px', banner_altura_movil: '300px', banner_ancho_tipo: 'full',
    banner_padding_lateral: '0', banner_ajuste_imagen: 'cover',
    navbar_altura: '60px', navbar_transparente: false, estilo_navbar: 'fijo',
    espaciado_secciones: '60px', border_radius: 4, sombra_cards: 'md',
    boton_border_radius: '4px', boton_padding: 'md',
    animaciones_activas: true, velocidad_transicion: 'normal',
    mostrar_top_bar: true, mostrar_header_accesos: true, mostrar_footer: true, mostrar_breadcrumbs: true,
    widgets_calendario: false, widgets_estadisticas: false, widgets_notarios: false,
    widgets_galeria: false, widgets_documentos: false, widgets_enlaces_rapidos: false,
    ancho_contenedor: '1200',
    activo: true, predeterminado: false
  };

  editMode = false;
  loading = false;
  saving = false;
  private slugManuallyEdited = false;

  previewUrl: SafeResourceUrl | null = null;
  previewHtml: SafeHtml = '';
  environment = environment;
  private previewDebounce: any;

  constructor(
    private service: GestorContenidosService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.cargarTema(+id);
    } else {
      this.actualizarPreviewLive();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTema(id: number): void {
    this.loading = true;
    this.service.getTema(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success || res.data) {
          const d = res.data;
          this.tema = {
            ...d,
            predeterminado: d.es_predeterminado ?? d.predeterminado,
            banner_altura_desktop: d.banner_altura_desktop ?? d.banner_alto ?? '500',
            banner_altura_movil: d.banner_altura_movil ?? d.banner_alto_movil ?? '300'
          };
          this.slugManuallyEdited = true;
          this.actualizarPreviewUrl();
          this.actualizarPreviewLive();
        }
        this.loading = false;
      },
      error: () => {
        alert('Error al cargar el tema');
        this.loading = false;
        this.router.navigate(['/gestor-contenidos/temas']);
      }
    });
  }

  generarSlug(): void {
    if (this.slugManuallyEdited) return;
    this.tema.slug = this.tema.nombre
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  onSlugInput(): void {
    this.slugManuallyEdited = true;
  }

  actualizarPreviewUrl(): void {
    if (this.tema?.id) {
      const portalUrl = (environment as any).portalUrl || 'http://localhost:8001';
      const url = `${portalUrl}/preview/tema/${this.tema.id}`;
      this.previewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    } else {
      this.previewUrl = null;
    }
  }

  @HostListener('input')
  @HostListener('change')
  onFormChange(): void {
    clearTimeout(this.previewDebounce);
    this.previewDebounce = setTimeout(() => this.actualizarPreviewLive(), 150);
  }

  actualizarPreviewLive(): void {
    const t = this.tema;
    const px = (v: any) => (typeof v === 'number' ? v + 'px' : (v || '16'));
    const font = (t?.fuente_principal || 'Roboto').replace(/"/g, "'");
    const topBar = t?.mostrar_top_bar !== false;
    const barraAcc = t?.mostrar_header_accesos !== false;
    const footer = t?.mostrar_footer !== false;
    const br = t?.border_radius ?? 4;
    const shadow = t?.sombra_cards === 'lg' ? '0 1rem 3rem rgba(0,0,0,.175)' : t?.sombra_cards === 'sm' ? '0 .125rem .25rem rgba(0,0,0,.075)' : '0 .5rem 1rem rgba(0,0,0,.15)';
    const btnBr = t?.boton_border_radius || '4px';
    const btnPad = t?.boton_padding === 'lg' ? '12px 24px' : t?.boton_padding === 'sm' ? '4px 12px' : '8px 16px';
    const bannerH = (t?.banner_altura_desktop || '500').replace(/px/g, '') + 'px';
    const navH = (t?.navbar_altura || '60px').replace(/px/g, '') + 'px';

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=${font.replace(/\s+/g, '+')}:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--primary:${t?.color_primario||'#007bff'};--secondary:${t?.color_secundario||'#6c757d'};--accent:${t?.color_acento||'#28a745'};--bg:${t?.color_fondo||'#ffffff'};--text:${t?.color_texto||'#212529'};--navbar:${t?.color_navbar||'#343a40'};--topbar:${t?.color_top_bar||'#16213e'};--topbar-text:${t?.color_texto_top_bar||'#ffffff'};--barra-acc:${t?.color_barra_accesos||'#1a1a2e'};}
body{font-family:'${font}',sans-serif;font-size:${px(t?.tamano_fuente)};background:var(--bg);color:var(--text);margin:0;padding:0;}
.btn-primary,.btn.btn-primario{background:var(--primary)!important;border-color:var(--primary)!important;border-radius:${btnBr};padding:${btnPad};}
.btn-secondary{background:var(--secondary)!important;border-color:var(--secondary)!important;border-radius:${btnBr};padding:${btnPad};}
.text-primary{color:var(--primary)!important;}
.bg-primary{background:var(--primary)!important;}
.card{border-radius:${br}px;box-shadow:${shadow};}
</style></head><body>
${topBar ? `<div style="background:var(--topbar);color:var(--topbar-text);padding:6px 15px;font-size:13px;"><i class="fas fa-phone-alt me-2"></i>Contacto: (01) 123-4567 | <i class="fas fa-envelope me-2"></i>info@Notaria.gob.pe</div>` : ''}
${barraAcc ? `<div style="background:var(--barra-acc);color:#fff;padding:10px 15px;display:flex;gap:15px;flex-wrap:wrap;"><a href="#" style="color:#fff;text-decoration:none;"><i class="fas fa-gavel me-1"></i>Transparencia</a><a href="#" style="color:#fff;text-decoration:none;"><i class="fas fa-inbox me-1"></i>Mesa de Partes</a><a href="#" style="color:#fff;text-decoration:none;"><i class="fas fa-briefcase me-1"></i>Bolsa de Trabajo</a></div>` : ''}
<nav style="background:var(--navbar);color:#fff;padding:12px 20px;min-height:${navH};display:flex;align-items:center;">
  <span style="font-weight:700;font-size:1.3rem;">Portal Notaria</span>
  <div style="margin-left:auto;display:flex;gap:20px;"><a href="#" style="color:#fff;text-decoration:none;">Inicio</a><a href="#" style="color:#fff;text-decoration:none;">Servicios</a><a href="#" style="color:#fff;text-decoration:none;">Noticias</a><a href="#" style="color:#fff;text-decoration:none;">Contacto</a></div>
</nav>
<div style="background:linear-gradient(135deg,var(--primary),var(--accent));color:#fff;padding:80px 20px;text-align:center;min-height:${bannerH};display:flex;align-items:center;justify-content:center;">
  <div><h1 style="font-size:2.5rem;margin-bottom:1rem;">Bienvenidos al Portal</h1><p style="font-size:1.2rem;opacity:.95;">Vista previa en vivo del tema. Los colores se actualizan al editar.</p><button class="btn btn-light btn-lg mt-3" style="border-radius:${btnBr};">Más información</button></div>
</div>
<div class="container py-5">
  <h2 class="mb-4" style="color:var(--primary);">Servicios destacados</h2>
  <div class="row g-4">
    <div class="col-md-4"><div class="card p-4 h-100"><i class="fas fa-file-contract fa-3x mb-3" style="color:var(--primary);"></i><h5>Trámites</h5><p class="text-muted small">Gestión de trámites documentarios.</p><a href="#" class="btn btn-primary btn-sm">Ver más</a></div></div>
    <div class="col-md-4"><div class="card p-4 h-100"><i class="fas fa-newspaper fa-3x mb-3" style="color:var(--accent);"></i><h5>Noticias</h5><p class="text-muted small">Últimas noticias y comunicados.</p><a href="#" class="btn btn-primary btn-sm">Ver más</a></div></div>
    <div class="col-md-4"><div class="card p-4 h-100"><i class="fas fa-calendar-alt fa-3x mb-3" style="color:var(--secondary);"></i><h5>Eventos</h5><p class="text-muted small">Agenda Notaria y eventos.</p><a href="#" class="btn btn-primary btn-sm">Ver más</a></div></div>
  </div>
</div>
${footer ? `<footer style="background:#343a40;color:#fff;padding:30px 20px;margin-top:40px;"><div class="container"><div class="row"><div class="col-md-4"><h5 style="color:var(--primary);">Enlaces</h5><a href="#" style="color:#adb5bd;">Inicio</a><br><a href="#" style="color:#adb5bd;">Contacto</a></div><div class="col-md-4"><h5 style="color:var(--primary);">Contacto</h5><p class="small mb-0">Av. Principal 123</p></div></div></div></footer>` : ''}
</body></html>`;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(html);
  }

  guardar(): void {
    if (!this.tema.nombre || !this.tema.slug) {
      alert('El nombre y el slug son obligatorios.');
      return;
    }
    const payload = {
      ...this.tema,
      banner_alto: this.tema.banner_alto ?? this.tema.banner_altura_desktop,
      banner_alto_movil: this.tema.banner_alto_movil ?? this.tema.banner_altura_movil
    };
    this.saving = true;
    const obs = this.editMode
      ? this.service.actualizarTema(this.tema.id, payload)
      : this.service.crearTema(payload);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success) {
          const newId = res.data?.id ?? this.tema.id;
          if (newId && !this.editMode) {
            this.router.navigate(['/gestor-contenidos/temas', newId, 'editar']);
          } else {
            this.router.navigate(['/gestor-contenidos/temas']);
          }
        } else {
          alert(res.message || 'Error al guardar');
        }
        this.saving = false;
      },
      error: (err: any) => {
        alert(err.error?.message || 'Error al guardar el tema');
        this.saving = false;
      }
    });
  }
}
