import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-accesos-directos',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './accesos-directos.component.html'
})
export class AccesosDirectosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  accesos: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};
  draggedItem: any = null;
  dragOverIndex: number = -1;
  barraSuperiorActiva = true;
  mostrarLogoHeader = true;
  mostrarNavbar = true;
  mostrarFooterBar = true;
  footerCollapsed = true;

  tipos = ['enlace', 'lema', 'titulo', 'interes', 'red_social'];

  iconosSugeridos = [
    { clase: 'fas fa-search', nombre: 'Transparencia' },
    { clase: 'fas fa-inbox', nombre: 'Mesa de Partes' },
    { clase: 'fas fa-briefcase', nombre: 'Empleo' },
    { clase: 'fas fa-file-alt', nombre: 'TUPA' },
    { clase: 'fas fa-envelope', nombre: 'Correo' },
    { clase: 'fas fa-images', nombre: 'Logotipos' },
    { clase: 'fas fa-phone', nombre: 'Teléfono' },
    { clase: 'fas fa-globe', nombre: 'Web' },
    { clase: 'fab fa-facebook-f', nombre: 'Facebook' },
    { clase: 'fab fa-x-twitter', nombre: 'X (Twitter)' },
    { clase: 'fab fa-instagram', nombre: 'Instagram' },
    { clase: 'fab fa-youtube', nombre: 'YouTube' }
  ];

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void { 
    this.loadData();
    this.loadGlobalConfigs();
  }
  
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  loadData(): void {
    this.loading = true;
    this.service.getAccesosDirectos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => { this.accesos = res.data || res || []; this.loading = false; },
      error: () => this.loading = false
    });
  }

  loadGlobalConfigs(): void {
    this.service.getConfiguracion().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        const configs = res.data?.data ?? res.data ?? [];
        const barraConfig = configs.find((c: any) => c.clave === 'barra_superior_activa');
        const headerConfig = configs.find((c: any) => c.clave === 'mostrar_logo_header');
        const navbarConfig = configs.find((c: any) => c.clave === 'mostrar_navbar');
        const footerBarConfig = configs.find((c: any) => c.clave === 'mostrar_footer_bar');
        
        if (barraConfig) this.barraSuperiorActiva = barraConfig.valor === '1' || barraConfig.valor === 1 || barraConfig.valor === true;
        if (headerConfig) this.mostrarLogoHeader = headerConfig.valor === '1' || headerConfig.valor === 1 || headerConfig.valor === true;
        if (navbarConfig) this.mostrarNavbar = navbarConfig.valor === '1' || navbarConfig.valor === 1 || navbarConfig.valor === true;
        if (footerBarConfig) this.mostrarFooterBar = footerBarConfig.valor === '1' || footerBarConfig.valor === 1 || footerBarConfig.valor === true;
      }
    });
  }

  toggleGlobalConfig(clave: string, valorActual: boolean): void {
    const nuevoValor = !valorActual;
    const valorApi = nuevoValor ? '1' : '0';
    
    this.service.actualizarConfiguracionPorClave(clave, valorApi).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        if (clave === 'barra_superior_activa') this.barraSuperiorActiva = nuevoValor;
        if (clave === 'mostrar_logo_header') this.mostrarLogoHeader = nuevoValor;
        if (clave === 'mostrar_navbar') this.mostrarNavbar = nuevoValor;
        if (clave === 'mostrar_footer_bar') this.mostrarFooterBar = nuevoValor;
      },
      error: (err: any) => console.error('Error actualizando config global', err)
    });
  }


  getBarraItems(): any[] {
    return this.accesos.filter((a: any) => a.mostrar_en_barra_superior).sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
  }
  getBarraLema(): any {
    return this.getBarraItems().find((a: any) => a.tipo === 'lema');
  }
  getBarraEnlaces(): any[] {
    return this.getBarraItems().filter((a: any) => a.tipo !== 'lema' && a.tipo !== 'red_social');
  }
  getHeaderItems(): any[] {
    return this.accesos.filter((a: any) => a.mostrar_en_header && a.tipo !== 'red_social').sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
  }
  getFooterItems(): any[] {
    return this.accesos.filter((a: any) => a.mostrar_en_footer && a.tipo !== 'red_social').sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
  }

  countBarra(): number { return this.accesos.filter((a: any) => a.mostrar_en_barra_superior).length; }
  countHeader(): number { return this.accesos.filter((a: any) => a.mostrar_en_header).length; }
  countFooter(): number { return this.accesos.filter((a: any) => a.mostrar_en_footer).length; }
  countSocial(): number { return this.accesos.filter((a: any) => a.tipo === 'red_social').length; }

  getSocialItems(): any[] {
    return this.accesos.filter((a: any) => a.tipo === 'red_social').sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0));
  }

  openCreate(section: string, tipo?: string): void {
    this.editing = false;
    this.form = {
      tipo: tipo || 'enlace', target: '_self', activo: true,
      orden: 0, color: '#007bff', icono: 'fas fa-link',
      mostrar_en_barra_superior: section === 'barra',
      mostrar_en_header: section === 'header',
      mostrar_en_footer: section === 'footer'
    };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarAccesoDirecto(this.form.id, this.form)
      : this.service.crearAccesoDirecto(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error(err)
    });
  }

  deleteItem(id: number): void {
    if (!confirm('¿Eliminar este elemento?')) return;
    this.service.eliminarAccesoDirecto(id).pipe(takeUntil(this.destroy$)).subscribe(() => this.loadData());
  }

  onDragStart(event: DragEvent, item: any, index: number): void {
    this.draggedItem = item;
    if (event.dataTransfer) { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', String(index)); }
    (event.target as HTMLElement).classList.add('sortable-ghost');
  }
  onDragOver(event: DragEvent, index: number): void { event.preventDefault(); this.dragOverIndex = index; }
  onDragLeave(): void { this.dragOverIndex = -1; }
  onDrop(event: DragEvent, items: any[], targetIndex: number): void {
    event.preventDefault();
    this.dragOverIndex = -1;
    if (!this.draggedItem) return;
    const fromIndex = items.indexOf(this.draggedItem);
    if (fromIndex === -1 || fromIndex === targetIndex) return;
    items.splice(fromIndex, 1);
    items.splice(targetIndex, 0, this.draggedItem);
    const orden = items.map((item: any) => item.id);
    this.service.reorderAccesosDirectosSortable(orden).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => this.loadData(), error: (err: any) => console.error(err)
    });
    this.draggedItem = null;
  }
  onDragEnd(event: DragEvent): void {
    this.draggedItem = null;
    this.dragOverIndex = -1;
    (event.target as HTMLElement).classList.remove('sortable-ghost');
  }
}
