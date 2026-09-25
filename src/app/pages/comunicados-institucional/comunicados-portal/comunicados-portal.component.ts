import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ComunicadosService } from '../../comunicados/comunicados.service';
import { DesignSystemService } from '../../../services/design-system.service';

@Component({
  selector: 'app-comunicados-portal',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SystemLayoutComponent],
  templateUrl: './comunicados-portal.component.html',
})
export class ComunicadosPortalComponent implements OnInit {
  comunicados: any[] = [];
  filteredComunicados: any[] = [];
  loading = false;
  stats = { total: 0, anclados: 0, urgentes: 0 };
  selectedTipo = 'todos';
  selectedPrioridad = 'todos';
  searchTerm = '';
  showAnclados = false;

  constructor(
    private comunicadosService: ComunicadosService,
    private designSystem: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('comunicados');
    this.loadComunicados();
  }

  loadComunicados(): void {
    this.loading = true;
    this.comunicadosService.getComunicadosVigentes(true).subscribe({
      next: (r: any) => {
        this.comunicados = r.data || [];
        this.stats = r.meta || { total: 0, anclados: 0, urgentes: 0 };
        this.applyFilters();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  applyFilters(): void {
    this.filteredComunicados = this.comunicados.filter((c: any) => {
      if (this.selectedTipo !== 'todos' && c.tipo !== this.selectedTipo) return false;
      if (this.selectedPrioridad !== 'todos' && c.prioridad !== this.selectedPrioridad) return false;
      if (this.showAnclados && !c.es_anclado) return false;
      if (this.searchTerm) {
        const t = this.searchTerm.toLowerCase();
        return (c.titulo || '').toLowerCase().includes(t) || (c.contenido || '').toLowerCase().includes(t);
      }
      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  getTipoBadge(tipo: string): string {
    const m: Record<string, string> = { noticia: 'badge-primary', evento: 'badge-success', alerta: 'badge-warning', anuncio: 'badge-info' };
    return m[tipo] || 'badge-secondary';
  }
  getPrioridadBadge(p: string): string {
    const m: Record<string, string> = { normal: 'badge-secondary', importante: 'badge-warning', urgente: 'badge-danger' };
    return m[p] || 'badge-secondary';
  }
  formatDate(d: string): string {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
  }
}
