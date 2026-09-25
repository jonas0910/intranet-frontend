import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { NgxEditorComponent, NgxEditorMenuComponent, Editor } from 'ngx-editor';

@Component({
  selector: 'app-pagina-form',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgxEditorComponent, NgxEditorMenuComponent],
  templateUrl: './pagina-form.component.html'
})
export class PaginaFormComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('previewFrame') previewFrame?: ElementRef<HTMLIFrameElement>;
  private destroy$ = new Subject<void>();
  editor!: Editor;

  pagina: any = {
    titulo: '', slug: '', descripcion: '', contenido: '',
    meta_titulo: '', meta_descripcion: '', meta_keywords: '',
    tipo: 'pagina', plantilla_id: null,
    imagen_principal: '', orden: 0, activa: true, mostrar_en_menu: false
  };

  plantillas: any[] = [];
  componentesReutilizables: any[] = [];
  mostrarDropdownComponentes = false;
  editMode = false;
  loading = false;
  saving = false;
  modoHtml = false;
  tabContenido: 'preview' | 'html' = 'preview';
  previewHtml: SafeHtml = '';
  private slugManuallyEdited = false;
  syncFromPreview = false;

  constructor(
    private service: GestorContenidosService,
    private route: ActivatedRoute,
    private router: Router,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    this.editor = new Editor();
    this.cargarPlantillas();
    this.cargarComponentesReutilizables();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.cargarPagina(+id);
    } else {
      this.modoHtml = true;
      this.tabContenido = 'preview';
    }
  }

  ngAfterViewInit(): void {
    // El iframe se configura en el load handler
  }

  ngOnDestroy(): void {
    this.editor?.destroy();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onPreviewLoad(): void {
    const iframe = this.previewFrame?.nativeElement;
    if (!iframe?.contentDocument?.body) return;
    const body = iframe.contentDocument.body;
    body.setAttribute('contenteditable', 'true');
    body.setAttribute('tabindex', '0');
    body.addEventListener('blur', () => this.syncPreviewToContenido());
    body.addEventListener('input', () => this.syncPreviewToContenidoDebounced());
  }

  private syncDebounceTimer: any;
  private syncPreviewToContenidoDebounced(): void {
    clearTimeout(this.syncDebounceTimer);
    this.syncDebounceTimer = setTimeout(() => this.syncPreviewToContenido(), 600);
  }

  private syncPreviewToContenido(): void {
    const iframe = this.previewFrame?.nativeElement;
    if (!iframe?.contentDocument?.body) return;
    const html = iframe.contentDocument.body.innerHTML;
    if (html === (this.pagina?.contenido || '')) return;
    this.syncFromPreview = true;
    this.pagina.contenido = html;
    setTimeout(() => { this.syncFromPreview = false; }, 0);
  }

  cargarPlantillas(): void {
    this.service.getPlantillas().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.plantillas = res.data || []; },
      error: () => {}
    });
  }

  cargarComponentesReutilizables(): void {
    this.service.getComponentesReutilizables(false).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.componentesReutilizables = res.data || []; },
      error: () => {}
    });
  }

  @HostListener('document:click', ['$event']) onDocumentClick(e: MouseEvent): void {
    const target = (e.target as HTMLElement);
    if (this.mostrarDropdownComponentes && !target.closest('.dropdown-componentes')) {
      this.mostrarDropdownComponentes = false;
    }
  }

  insertarComponente(c: any): void {
    this.modoHtml = true;
    this.tabContenido = 'preview';
    let html = c.html_template || '';
    if (html.includes('carouselComponent') || html.includes('carousel-component')) {
      const uid = 'carousel-' + Math.random().toString(36).slice(2, 10);
      html = html.replace(/carouselComponent|carousel-component/g, uid);
    }
    const actual = (this.pagina.contenido || '').trim();
    this.pagina.contenido = actual ? actual + '\n\n' + html : html;
    this.actualizarPreview();
    this.mostrarDropdownComponentes = false;
  }

  cargarPagina(id: number): void {
    this.loading = true;
    this.service.getPagina(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.success || res.data) {
          this.pagina = res.data || res;
          this.slugManuallyEdited = true;
          this.modoHtml = true;
          this.tabContenido = 'preview';
          this.actualizarPreview();
        }
        this.loading = false;
      },
      error: () => { this.loading = false; this.router.navigate(['/gestor-contenidos/paginas']); }
    });
  }

  esPaginaRegidores(): boolean {
    return (this.pagina?.slug || '').toLowerCase() === 'regidores';
  }

  cambiarModoHtml(activar: boolean): void {
    if (activar) {
      this.modoHtml = true;
      this.tabContenido = 'preview';
      return;
    }
    if (this.esPaginaRegidores()) {
      const ok = window.confirm(
        'La página Regidores usa HTML con clases de Bootstrap (cards, badges, etc.). ' +
        'El editor visual puede eliminar esos estilos. ¿Desea cambiar a modo Visual de todos modos?'
      );
      if (!ok) return;
    }
    this.modoHtml = false;
  }

  actualizarPreview(): void {
    const contenido = (this.pagina?.contenido || '').trim();
    if (!contenido) {
      this.previewHtml = this.sanitizer.bypassSecurityTrustHtml('');
      return;
    }
    const doc = `<!DOCTYPE html><html><head>
      <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
      <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
      <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet">
      <style>body{font-family:system-ui,sans-serif}.card,.card-regidor,.regidores-contenido .card{border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06);transition:box-shadow .3s,transform .2s}.card:hover,.card-regidor:hover,.regidores-contenido .card:hover{box-shadow:0 4px 16px rgba(0,0,0,0.1);transform:translateY(-2px)}.badge,.badge-partido,.regidores-contenido .badge{border-radius:50px;padding:0.35em 0.85em;font-weight:500}.rounded-circle,.avatar-regidor,.regidores-contenido .rounded-circle{min-width:80px;min-height:80px}.shadow-sm{box-shadow:0 .125rem .25rem rgba(0,0,0,.075)!important}</style>
    </head><body class="bg-white p-3" contenteditable="true" tabindex="0">${contenido}</body></html>`;
    this.previewHtml = this.sanitizer.bypassSecurityTrustHtml(doc);
  }

  generarSlug(): void {
    if (this.slugManuallyEdited) return;
    this.pagina.slug = this.pagina.titulo
      .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim();
  }

  onSlugInput(): void {
    this.slugManuallyEdited = true;
    if (this.esPaginaRegidores()) this.modoHtml = true;
  }

  insertarPlantillaRegidores(): void {
    this.modoHtml = true;
    this.tabContenido = 'preview';
    this.pagina.contenido = `<div class="container py-5">
  <h2 class="text-primary text-center mb-5"><i class="fas fa-users me-2"></i>Concejo Notaria 2023 - 2026</h2>
  <div class="row">
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
            <i class="fas fa-user fa-2x"></i>
          </div>
          <h5 class="card-title">Guillermo Fernando Aranda Hurtado</h5>
          <p class="text-muted">Regidor</p>
          <span class="badge bg-info">Avanza País</span>
        </div>
      </div>
    </div>
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-danger text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
            <i class="fas fa-user fa-2x"></i>
          </div>
          <h5 class="card-title">Danitza Yessica Perez Calizaya</h5>
          <p class="text-muted">Regidora</p>
          <span class="badge bg-info">Avanza País</span>
        </div>
      </div>
    </div>
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-success text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
            <i class="fas fa-user fa-2x"></i>
          </div>
          <h5 class="card-title">Rolando Froilan Mamani Calizaya</h5>
          <p class="text-muted">Regidor</p>
          <span class="badge bg-info">Avanza País</span>
        </div>
      </div>
    </div>
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-warning text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
            <i class="fas fa-user fa-2x"></i>
          </div>
          <h5 class="card-title">Evelia Yunca Yunca</h5>
          <p class="text-muted">Regidora</p>
          <span class="badge bg-info">Avanza País</span>
        </div>
      </div>
    </div>
    <div class="col-md-6 col-lg-4 mb-4">
      <div class="card h-100 shadow-sm">
        <div class="card-body text-center">
          <div class="rounded-circle bg-secondary text-white d-inline-flex align-items-center justify-content-center mb-3" style="width: 80px; height: 80px;">
            <i class="fas fa-user fa-2x"></i>
          </div>
          <h5 class="card-title">Sandra Teresa Briceño Navarro</h5>
          <p class="text-muted">Regidora</p>
          <span class="badge bg-warning text-dark">Acción Popular</span>
        </div>
      </div>
    </div>
  </div>
  <div class="row mt-4">
    <div class="col-12">
      <div class="card bg-light">
        <div class="card-body">
          <h5><i class="fas fa-gavel me-2 text-primary"></i>Funciones del Concejo Notaria</h5>
          <ul class="mb-0">
            <li>Aprobar, modificar o derogar las ordenanzas y dejar sin efecto los acuerdos</li>
            <li>Aprobar el Plan de Desarrollo Notaria Concertado</li>
            <li>Aprobar el régimen de organización interior y funcionamiento del gobierno local</li>
            <li>Aprobar el Plan de Desarrollo Urbano y Plan de Desarrollo Rural</li>
            <li>Fiscalizar la gestión de los funcionarios de la Notaria</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>`;
    this.actualizarPreview();
  }

  guardar(): void {
    if (!this.pagina.titulo || !this.pagina.slug) return;

    this.saving = true;
    const obs = this.editMode
      ? this.service.actualizarPagina(this.pagina.id, this.pagina)
      : this.service.crearPagina(this.pagina);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.saving = false; this.router.navigate(['/gestor-contenidos/paginas']); },
      error: () => { this.saving = false; }
    });
  }
}
