import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { ComunicadosInstitucionalService, CategoriaDocumento, Documento } from '../../../services/comunicados-institucional.service';
import { DesignSystemService } from '../../../services/design-system.service';

@Component({
  selector: 'app-comunicados-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, SystemLayoutComponent],
  templateUrl: './comunicados-documentos.component.html',
})
export class ComunicadosDocumentosComponent implements OnInit {
  categorias: CategoriaDocumento[] = [];
  documentos: Documento[] = [];
  loading = false;
  filtroCategoria = '';

  constructor(
    private svc: ComunicadosInstitucionalService,
    private designSystem: DesignSystemService
  ) {}

  ngOnInit(): void {
    this.designSystem.setActiveSubsystem('comunicados');
    this.load();
  }

  load(): void {
    this.loading = true;
    this.svc.getCategorias(true).subscribe({
      next: (r) => {
        this.categorias = r.data || [];
        this.loadDocumentos();
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  loadDocumentos(): void {
    const params: any = { solo_activos: true };
    if (this.filtroCategoria) params.categoria_id = +this.filtroCategoria;
    this.svc.getDocumentos(params).subscribe({
      next: (r) => (this.documentos = r.data || []),
    });
  }

  onFiltroChange(): void {
    this.loadDocumentos();
  }

  descargar(doc: Documento): void {
    this.svc.descargarDocumento(doc.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.archivo_nombre || doc.titulo + '.pdf';
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  getTipoLabel(tipo: string): string {
    const m: Record<string, string> = { rit: 'RIT', directiva: 'Directiva', manual: 'Manual', general: 'Documento' };
    return m[tipo || ''] || tipo || 'Documento';
  }
}
