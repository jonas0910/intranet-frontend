import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { DesignSystemService } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-kb-list',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './kb-list.component.html',
})
export class KbListComponent implements OnInit {
  categorias: any[] = [];
  articulos: any[] = [];
  meta: { current_page: number; last_page: number; total: number } = { current_page: 1, last_page: 1, total: 0 };
  loading = false;
  loadingArticulos = false;
  categoriaId: number | null = null;
  busqueda = '';
  page = 1;

  constructor(
    private kbService: KnowledgeBaseService,
    private designSystem: DesignSystemService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('helpdesk');
    this.cargarCategorias();
    this.cargarArticulos();
  }

  cargarCategorias(): void {
    this.loading = true;
    this.kbService.getCategorias().subscribe({
      next: (res) => {
        this.categorias = res.data || [];
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.toast.error('Error al cargar categorías');
      },
    });
  }

  cargarArticulos(): void {
    this.loadingArticulos = true;
    const params: any = { page: this.page, per_page: 15 };
    if (this.categoriaId != null) params.categoria_id = this.categoriaId;
    if (this.busqueda?.trim()) params.q = this.busqueda.trim();
    this.kbService.getArticulos(params).subscribe({
      next: (res) => {
        this.articulos = res.data || [];
        this.meta = res.meta || this.meta;
        this.loadingArticulos = false;
      },
      error: () => {
        this.loadingArticulos = false;
        this.toast.error('Error al cargar artículos');
      },
    });
  }

  filtrar(): void {
    this.page = 1;
    this.cargarArticulos();
  }

  cambiarCategoria(id: number | null): void {
    this.categoriaId = id;
    this.page = 1;
    this.cargarArticulos();
  }

  cambiarPagina(p: number): void {
    this.page = p;
    this.cargarArticulos();
  }
}
