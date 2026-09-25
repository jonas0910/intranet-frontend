import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-menu-form',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './menu-form.component.html'
})
export class MenuFormComponent implements OnInit {
  menu: any = {
    nombre: '', ubicacion: 'principal', tipo: 'pagina', url: '', pagina_id: null,
    target: '_self', icono: 'fas fa-link', parent_id: null, orden: 0, activo: true
  };

  editMode = false;
  saving = false;
  menuId: number | null = null;
  paginas: any[] = [];
  menusPadre: any[] = [];

  rutasSugeridas = [
    { nombre: 'Inicio', ruta: '/' },
    { nombre: 'Notaria', ruta: '/Notaria' },
    { nombre: 'Servicios', ruta: '/servicios' },
    { nombre: 'Noticias', ruta: '/noticias' },
    { nombre: 'Proyectos', ruta: '/proyectos' },
    { nombre: 'Contacto', ruta: '/contacto' },
    { nombre: 'Ofertas de Empleo', ruta: '/ofertas-empleo' },
    { nombre: 'Documentos', ruta: '/documentos' },
    { nombre: 'Galería', ruta: '/galeria' },
    { nombre: 'Transparencia', ruta: '/transparencia' }
  ];

  constructor(
    private service: GestorContenidosService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.cargarDependencias();
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.editMode = true;
      this.menuId = +id;
      this.cargarMenu();
    }
  }

  cargarDependencias(): void {
    this.service.getBuilderData().subscribe({
      next: (res: any) => {
        const data = res.data || res;
        this.paginas = data.paginas || [];
        const allMenus: any[] = [];
        ['principal', 'footer', 'lateral'].forEach(ub => {
          if (data.menus && data.menus[ub]) {
            this.flattenTree(data.menus[ub], allMenus);
          }
        });
        this.menusPadre = allMenus.filter((m: any) => m.id !== this.menuId);
      }
    });
  }

  private flattenTree(nodes: any[], result: any[]): void {
    nodes.forEach((n: any) => {
      result.push({ id: n.id, nombre: n.nombre, ubicacion: n.ubicacion });
      if (n.children && n.children.length > 0) this.flattenTree(n.children, result);
    });
  }

  cargarMenu(): void {
    if (!this.menuId) return;
    this.service.getMenu(this.menuId).subscribe({
      next: (res: any) => { this.menu = { ...this.menu, ...(res.data || res) }; },
      error: () => { this.router.navigate(['/gestor-contenidos/menus']); }
    });
  }

  onTipoChange(): void {
    if (this.menu.tipo === 'pagina') {
      this.menu.url = '';
    } else {
      this.menu.pagina_id = null;
    }
  }

  usarRutaSugerida(ruta: string): void {
    this.menu.url = ruta;
  }

  guardar(): void {
    if (!this.menu.nombre?.trim()) return;
    this.saving = true;
    const obs = this.editMode
      ? this.service.actualizarMenu(this.menuId!, this.menu)
      : this.service.crearMenu(this.menu);
    obs.subscribe({
      next: () => this.router.navigate(['/gestor-contenidos/menus']),
      error: () => { this.saving = false; }
    });
  }
}
