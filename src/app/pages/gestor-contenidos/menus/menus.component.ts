import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './menus.component.html'
})
export class MenusComponent implements OnInit {
  menus: any[] = [];
  menusFiltrados: any[] = [];
  cargando = false;
  filtroUbicacion = '';
  ubicaciones = ['principal', 'footer', 'lateral'];

  constructor(private gestorService: GestorContenidosService) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando = true;
    this.gestorService.getMenus().subscribe({
      next: (res) => {
        this.menus = res.data || res;
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  aplicarFiltro(): void {
    if (this.filtroUbicacion) {
      this.menusFiltrados = this.menus.filter(m => m.ubicacion === this.filtroUbicacion);
    } else {
      this.menusFiltrados = [...this.menus];
    }
  }

  getNombrePadre(parentId: number): string {
    const padre = this.menus.find(m => m.id === parentId);
    return padre ? padre.nombre : '—';
  }

  getUbicacionBadgeClass(ubicacion: string): string {
    const clases: Record<string, string> = {
      principal: 'badge-primary',
      footer: 'badge-info',
      lateral: 'badge-warning'
    };
    return clases[ubicacion] || 'badge-secondary';
  }

  eliminar(id: number): void {
    if (!confirm('¿Está seguro de eliminar este elemento de menú?')) return;
    this.gestorService.eliminarMenu(id).subscribe({
      next: () => this.cargar(),
      error: () => alert('Error al eliminar el menú')
    });
  }
}
