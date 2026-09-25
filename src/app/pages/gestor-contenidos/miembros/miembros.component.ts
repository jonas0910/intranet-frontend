import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';
import { getStorageUrl } from '../utils/storage-url.util';

@Component({
  selector: 'app-miembros',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './miembros.component.html'
})
export class MiembrosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  miembros: any[] = [];
  loading = false;
  showModal = false;
  editing = false;
  form: any = {};
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadingFoto = false;

  tipos = [
    { value: 'notario', label: 'Notario' },
    { value: 'junta_directiva', label: 'Junta Directiva' },
    { value: 'tribunal_honor', label: 'Tribunal de Honor' },
    { value: 'decano_historico', label: 'Decano Histórico' }
  ];

  distritos = ['Cercado', 'Alto de la Alianza', 'Ciudad Nueva', 'Pocollay', 'Gregorio Albarracín', 'Candarave', 'Tarata', 'Jorge Basadre'];

  filtros: any = { tipo: '', buscar: '' };

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.service.getMiembros(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          this.miembros = res;
          this.loading = false;
        },
        error: () => this.loading = false
      });
  }

  openCreate(): void {
    this.editing = false;
    this.form = { tipo: 'notario', activo: true, orden: 0, distrito: 'Cercado', foto: '' };
    this.selectedFile = null;
    this.previewUrl = null;
    this.showModal = true;
  }

  openEdit(item: any): void {
    this.editing = true;
    this.form = { ...item };
    this.selectedFile = null;
    this.previewUrl = item.foto ? getStorageUrl(item.foto) : null;
    this.showModal = true;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.uploadingFoto = true;
      
      this.service.uploadImagen(file, 'miembros').pipe(takeUntil(this.destroy$)).subscribe({
        next: (res: any) => {
          this.form.foto = res.data.path;
          this.previewUrl = getStorageUrl(this.form.foto);
          this.uploadingFoto = false;
        },
        error: () => {
          this.uploadingFoto = false;
          alert('Error al subir la imagen');
        }
      });
    }
  }

  save(): void {
    if (!this.form.nombre) { alert('El nombre es obligatorio'); return; }

    const formData = new FormData();
    const allowedFields = [
      'nombre', 'apellidos', 'tipo', 'cargo', 'periodo', 'notaria', 
      'direccion', 'distrito', 'telefono', 'email', 'orden', 'activo', 'biografia', 'foto'
    ];

    Object.entries(this.form).forEach(([key, value]) => {
      // Si el campo está en allowedFields y no es nulo/undefined
      if (allowedFields.includes(key) && value !== null && value !== undefined) {
        if (typeof value === 'boolean') {
          formData.append(key, value ? '1' : '0');
        } else {
          formData.append(key, String(value));
        }
      }
    });

    const obs = this.editing
      ? this.service.actualizarMiembro(this.form.id, formData)
      : this.service.crearMiembro(formData);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => { 
        this.showModal = false; 
        this.loadData(); 
      },
      error: (err: any) => {
        console.error('Error guardando miembro:', err);
        if (err.error && err.error.errors) {
          alert('Error de validación: ' + JSON.stringify(err.error.errors));
        } else {
          alert('Error al guardar el miembro. Verifique los datos.');
        }
      }
    });
  }

  eliminarFoto(): void {
    if (!this.editing || !this.form.id) return;
    if (!confirm('¿Eliminar la foto de este miembro?')) return;

    this.service.eliminarFotoMiembro(this.form.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        this.form.foto = null;
        this.previewUrl = null;
        this.loadData();
      },
      error: (err: any) => {
        console.error('Error eliminando foto:', err);
        alert('Error al eliminar la foto');
      }
    });
  }

  delete(id: number): void {
    if (!confirm('¿Eliminar este miembro?')) return;
    this.service.eliminarMiembro(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadData());
  }

  getTipoLabel(tipo: string): string {
    return this.tipos.find(t => t.value === tipo)?.label || tipo;
  }

  getTipoClass(tipo: string): string {
    const map: any = { 
      notario: 'bg-primary-subtle text-primary', 
      junta_directiva: 'bg-success-subtle text-success', 
      tribunal_honor: 'bg-warning-subtle text-warning', 
      decano_historico: 'bg-info-subtle text-info' 
    };
    return map[tipo] || 'bg-light text-dark';
  }
}
