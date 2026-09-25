import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { AsesoriaLegalService } from '../services/asesoria-legal.service';

@Component({
  selector: 'app-jurisprudencia',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './jurisprudencia.component.html',
  styleUrl: './jurisprudencia.component.scss'
})
export class JurisprudenciaComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  items: any[] = [];
  tipos: string[] = ['Jurisprudencia', 'Normativa', 'Circular', 'Resolución', 'Ordenanza'];
  busqueda = '';
  tipoFiltro = '';
  loading = true;
  processing = false;
  showModalDetalle = false;
  showModalForm = false;
  editando = false;
  itemSeleccionado: any = null;
  form: any = {
    tipo: 'Jurisprudencia',
    titulo: '',
    descripcion: '',
    fuente: '',
    numero_expediente: '',
    fecha_emision: '',
    contenido: '',
    palabras_clave: '',
    url_externa: ''
  };

  constructor(private svc: AsesoriaLegalService) {}

  ngOnInit(): void {
    this.cargarTipos();
    this.buscar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarTipos(): void {
    this.svc.getJurisprudenciaTipos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success && res.data?.length) this.tipos = res.data;
      }
    });
  }

  buscar(): void {
    this.loading = true;
    this.svc.getJurisprudencia({ q: this.busqueda || undefined, tipo: this.tipoFiltro || undefined })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) this.items = res.data || [];
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  verDetalle(item: any): void {
    this.itemSeleccionado = item;
    this.showModalDetalle = true;
  }

  cerrarModalDetalle(): void {
    this.showModalDetalle = false;
    this.itemSeleccionado = null;
  }

  abrirModalNuevo(): void {
    this.editando = false;
    this.form = {
      tipo: 'Jurisprudencia',
      titulo: '',
      descripcion: '',
      fuente: '',
      numero_expediente: '',
      fecha_emision: '',
      contenido: '',
      palabras_clave: '',
      url_externa: ''
    };
    this.showModalForm = true;
  }

  abrirModalEditar(item: any): void {
    if (!item) return;
    this.editando = true;
    this.form = {
      tipo: item.tipo,
      titulo: item.titulo,
      descripcion: item.descripcion || '',
      fuente: item.fuente || '',
      numero_expediente: item.numero_expediente || '',
      fecha_emision: item.fecha_emision || '',
      contenido: item.contenido || '',
      palabras_clave: item.palabras_clave || '',
      url_externa: item.url_externa || ''
    };
    this.itemSeleccionado = item;
    this.showModalForm = true;
  }

  cerrarModalForm(): void {
    this.showModalForm = false;
    this.itemSeleccionado = null;
  }

  guardar(): void {
    if (!this.form.titulo || !this.form.tipo || this.processing) return;
    this.processing = true;
    const data = { ...this.form };
    const obs = this.editando
      ? this.svc.actualizarJurisprudencia(this.itemSeleccionado.id, data)
      : this.svc.crearJurisprudencia(data);
    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.buscar();
          this.cerrarModalForm();
        }
        this.processing = false;
      },
      error: (err) => {
        this.processing = false;
        alert(err?.error?.message || 'Error al guardar');
      }
    });
  }

  confirmarEliminar(item: any): void {
    if (!confirm('¿Eliminar este registro de la base de conocimiento?')) return;
    this.processing = true;
    this.svc.eliminarJurisprudencia(item.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) this.buscar();
        this.processing = false;
      },
      error: () => this.processing = false
    });
  }
}
