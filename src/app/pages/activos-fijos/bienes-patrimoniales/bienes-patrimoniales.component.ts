import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ActivoService } from '../services/activo.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { Activo, Categoria } from '../models/activo.model';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

@Component({
  selector: 'app-bienes-patrimoniales',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, SystemLayoutComponent],
  templateUrl: './bienes-patrimoniales.component.html',
  styleUrls: ['./bienes-patrimoniales.component.scss']
})
export class BienesPatrimonialesComponent extends CrudListExportBase implements OnInit {
  activos: Activo[] = [];
  categorias: Categoria[] = [];
  loading = false;
  isFiltersCollapsed = false;

  filtros: any = {
    search: '',
    categoria_id: '',
    estado: '',
    condicion: '',
    per_page: 10,
    page: 1
  };
  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 10,
    from: 0,
    to: 0
  };

  constructor(
    private activoService: ActivoService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  /** Configuración CRUD del subsistema activos-fijos (Card Outlined, etc.) */
  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  ngOnInit(): void {
    // Forzar valor del DS al inicio
    this.filtros.per_page = this.cv?.defaultPageSize || 10;
    this.paginacion.perPage = this.cv?.defaultPageSize || 10;
    this.loadCategorias();
    this.loadMisBienes();
  }

  loadCategorias(): void {
    this.activoService.listarCategorias().subscribe({
      next: (res) => {
        if (res?.success && res.data) this.categorias = res.data;
      }
    });
  }

  loadMisBienes(): void {
    this.loading = true;
    const params = {
      ...this.filtros,
      page: this.filtros.page
    };
    this.activoService.listarMisBienes(params).subscribe({
      next: (res) => {
        this.loading = false;
        if (res?.success && res.data) {
          this.activos = res.data.data || [];
          this.paginacion = {
            currentPage: res.data.current_page,
            lastPage: res.data.last_page,
            total: res.data.total,
            perPage: +(res.data.per_page || this.filtros.per_page || 10),
            from: res.data.from ?? 0,
            to: res.data.to ?? 0
          };
        }
      },
      error: () => { this.loading = false; }
    });
  }

  onFilterChange(): void {
    this.filtros.page = 1;
    this.paginacion.currentPage = 1;
    // Sincronizar perPage como número
    this.paginacion.perPage = +this.filtros.per_page || 10;
    this.loadMisBienes();
  }

  onPageChange(page: number): void {
    if (page >= 1 && page <= this.paginacion.lastPage) {
      this.filtros.page = page;
      this.loadMisBienes();
    }
  }

  getPaginationPages(): number[] {
    const pages: number[] = [];
    const current = this.paginacion.currentPage;
    const last = this.paginacion.lastPage;
    if (last <= 7) {
      for (let i = 1; i <= last; i++) pages.push(i);
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      } else if (current >= last - 2) {
        pages.push(1);
        pages.push(-1);
        for (let i = last - 3; i <= last; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push(-1);
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push(-1);
        pages.push(last);
      }
    }
    return pages;
  }

  limpiarFiltros(): void {
    this.filtros = {
      search: '',
      categoria_id: '',
      estado: '',
      condicion: '',
      per_page: this.cv?.defaultPageSize || 10,
      page: 1
    };
    this.loadMisBienes();
  }

  formatMoneda(valor: number | undefined): string {
    if (valor == null) return '-';
    return 'S/ ' + Number(valor).toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  estadoLabel(estado: string): string {
    const map: Record<string, string> = {
      activo: 'Activo',
      baja: 'Baja',
      transferido: 'Transferido',
      extraviado: 'Extraviado'
    };
    return map[estado] || estado;
  }

  condicionLabel(cond: string): string {
    const map: Record<string, string> = {
      bueno: 'Bueno',
      regular: 'Regular',
      malo: 'Malo',
      obsoleto: 'Obsoleto'
    };
    return map[cond] || cond;
  }

  getEstadoBadgeClass(estado: string): string {
    const clases: Record<string, string> = {
      activo: 'ds-badge-success',
      baja: 'ds-badge-danger',
      transferido: 'ds-badge-info',
      extraviado: 'ds-badge-warning'
    };
    return clases[estado] || 'ds-badge-secondary';
  }

  getCondicionBadgeClass(condicion: string): string {
    const clases: Record<string, string> = {
      bueno: 'ds-badge-success',
      regular: 'ds-badge-warning',
      malo: 'ds-badge-danger',
      obsoleto: 'ds-badge-secondary'
    };
    return clases[condicion] || 'ds-badge-secondary';
  }

  getExportData(): Record<string, unknown>[] {
    return this.activos.map(a => ({
      codigo_patrimonial: a.codigo_patrimonial,
      codigo_sbn: a.codigo_sbn,
      descripcion: a.descripcion,
      categoria: a.categoria?.nombre,
      estado: a.estado,
      condicion: a.condicion,
      valor_neto: a.valor_neto
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'codigo_patrimonial', label: 'Código patrimonial' },
      { key: 'codigo_sbn', label: 'Código SBN' },
      { key: 'descripcion', label: 'Descripción' },
      { key: 'categoria', label: 'Categoría', format: (v) => (v as string) || '-' },
      { key: 'valor_neto', label: 'Valor neto', format: (v) => v != null ? `S/ ${Number(v).toLocaleString('es-PE', { minimumFractionDigits: 2 })}` : '' },
      { key: 'estado', label: 'Estado', format: (v) => (v as string) ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '' },
      { key: 'condicion', label: 'Condición', format: (v) => (v as string) ? String(v).charAt(0).toUpperCase() + String(v).slice(1) : '' }
    ];
  }

  getExportTitle(): string {
    return 'Bienes patrimoniales asignados';
  }

  getExportFilename(): string {
    return 'bienes-patrimoniales';
  }
}
