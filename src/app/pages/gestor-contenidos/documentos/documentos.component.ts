import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

@Component({
  selector: 'app-documentos-gc',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './documentos.component.html'
})
export class DocumentosGcComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  documentos: any[] = [];
  categorias: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};

  tiposArchivo = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'img', 'otro'];

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadCategorias();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCategorias(): void {
    this.service.getCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => this.categorias = res.data || res,
        error: () => {}
      });
  }

  loadData(): void {
    this.loading = true;
    this.service.getDocumentos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.documentos = res.data || res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { tipo_archivo: 'pdf', publico: true };
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.showModal = true;
  }

  save(): void {
    const obs = this.editing
      ? this.service.actualizarDocumento(this.form.id, this.form)
      : this.service.crearDocumento(this.form);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { this.showModal = false; this.loadData(); },
      error: (err: any) => console.error('Error guardando documento:', err)
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este documento?')) return;
    this.service.eliminarDocumento(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  getTipoArchivoBadge(tipo: string): string {
    const map: any = { pdf: 'danger', doc: 'primary', docx: 'primary', xls: 'success', xlsx: 'success', ppt: 'warning', pptx: 'warning', img: 'info', otro: 'secondary' };
    return map[tipo] || 'secondary';
  }

  getCategoriaName(id: number): string {
    const cat = this.categorias.find((c: any) => c.id === id);
    return cat ? cat.nombre : '-';
  }
}
