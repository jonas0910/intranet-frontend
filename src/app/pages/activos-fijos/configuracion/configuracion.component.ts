import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivoService } from '../services/activo.service';
import { Categoria, Ubicacion } from '../models/activo.model';
import { SystemManagementService } from '../../../services/system-management.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { CrudActionsComponent } from '../../../shared/components';

declare var $: any;

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent, CrudActionsComponent],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.scss']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  get mc(): ModalCrudConfig {
    return this.dsService.getModalCrudFor('activos-fijos');
  }
  activeTab: 'categorias' | 'ubicaciones' = 'categorias';

  // Categorías
  categorias: Categoria[] = [];
  categoriaSeleccionada: Partial<Categoria> = {};
  modoCategoriaModal: 'crear' | 'editar' = 'crear';

  // Ubicaciones
  ubicaciones: Ubicacion[] = [];
  ubicacionSeleccionada: Partial<Ubicacion> = {};
  modoUbicacionModal: 'crear' | 'editar' = 'crear';

  constructor(
    private activoService: ActivoService,
    private systemService: SystemManagementService,
    private dsService: DesignSystemService,
    private toast: ToastService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {

    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['tab'] && (params['tab'] === 'categorias' || params['tab'] === 'ubicaciones')) {
        this.activeTab = params['tab'];
      }
    });

    this.loadCategorias();
    this.loadUbicaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== CATEGORÍAS ====================
  loadCategorias(): void {
    this.activoService.listarCategorias()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.categorias = response.data;
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  abrirModalCrearCategoria(): void {
    this.modoCategoriaModal = 'crear';
    this.categoriaSeleccionada = {};
    $('#modalCategoria').modal('show');
  }

  abrirModalEditarCategoria(id: number): void {
    const cat = this.categorias.find(c => c.id === id);
    if (cat) {
      this.modoCategoriaModal = 'editar';
      this.categoriaSeleccionada = { ...cat };
      $('#modalCategoria').modal('show');
    }
  }

  guardarCategoria(): void {
    if (this.modoCategoriaModal === 'crear') {
      this.activoService.crearCategoria(this.categoriaSeleccionada)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalCategoria').modal('hide');
              this.loadCategorias();
              this.toast.success('Categoría creada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al crear categoría', 'Error');
          }
        });
    } else {
      if (!this.categoriaSeleccionada.id) return;

      this.activoService.actualizarCategoria(this.categoriaSeleccionada.id, this.categoriaSeleccionada)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalCategoria').modal('hide');
              this.loadCategorias();
              this.toast.success('Categoría actualizada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al actualizar categoría', 'Error');
          }
        });
    }
  }

  eliminarCategoria(id: number): void {
    if (confirm('¿Está seguro de eliminar esta categoría?')) {
      this.activoService.eliminarCategoria(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadCategorias();
              this.toast.success('Categoría eliminada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al eliminar categoría', 'Error');
          }
        });
    }
  }

  // ==================== UBICACIONES ====================
  loadUbicaciones(): void {
    this.activoService.listarUbicaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.ubicaciones = response.data;
          }
        },
        error: (error: any) => console.error('Error:', error)
      });
  }

  abrirModalCrearUbicacion(): void {
    this.modoUbicacionModal = 'crear';
    this.ubicacionSeleccionada = {};
    $('#modalUbicacion').modal('show');
    setTimeout(() => this.initSelect2InModal('modalUbicacion'), 350);
  }

  abrirModalEditarUbicacion(id: number): void {
    const ub = this.ubicaciones.find(u => u.id === id);
    if (ub) {
      this.modoUbicacionModal = 'editar';
      this.ubicacionSeleccionada = { ...ub };
      $('#modalUbicacion').modal('show');
      setTimeout(() => this.initSelect2InModal('modalUbicacion'), 350);
    }
  }

  guardarUbicacion(): void {
    if (this.modoUbicacionModal === 'crear') {
      this.activoService.crearUbicacion(this.ubicacionSeleccionada)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalUbicacion').modal('hide');
              this.loadUbicaciones();
              this.toast.success('Ubicación creada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al crear ubicación', 'Error');
          }
        });
    } else {
      if (!this.ubicacionSeleccionada.id) return;

      this.activoService.actualizarUbicacion(this.ubicacionSeleccionada.id, this.ubicacionSeleccionada)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              $('#modalUbicacion').modal('hide');
              this.loadUbicaciones();
              this.toast.success('Ubicación actualizada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al actualizar ubicación', 'Error');
          }
        });
    }
  }

  /** Inicializa Select2 del patrón de diseño en los combos del modal indicado. */
  initSelect2InModal(modalId: string): void {
    const $modal = $('#' + modalId);
    const $selects = $modal.find('.ds-select2');
    if ($selects.length === 0) return;
    try {
      $selects.each((_index: number, el: HTMLElement) => {
        if ($(el).data('select2')) $(el).select2('destroy');
      });
    } catch (e) { /* ignore */ }
    const opts = this.dsService.getSelect2Options({
      dropdownParent: $modal,
      allowClear: true,
      minimumResultsForSearch: 0
    });
    $selects.select2(opts).on('change', (e: any) => {
      const name = $(e.target).attr('name');
      const val = $(e.target).val();
      if (name === 'tipo' && this.ubicacionSeleccionada) {
        this.ubicacionSeleccionada.tipo = val as any;
      }
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('activos-fijos');
    setTimeout(() => {
      $selects.each((_index: number, el: HTMLElement) => {
        $(el).next('.select2-container').find('.select2-selection').addClass(sizeClass);
      });
    }, 0);
  }

  eliminarUbicacion(id: number): void {
    if (confirm('¿Está seguro de eliminar esta ubicación?')) {
      this.activoService.eliminarUbicacion(id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.loadUbicaciones();
              this.toast.success('Ubicación eliminada exitosamente', 'Éxito');
            }
          },
          error: (error: any) => {
            console.error('Error:', error);
            this.toast.error('Error al eliminar ubicación', 'Error');
          }
        });
    }
  }

  setActiveTab(tab: 'categorias' | 'ubicaciones'): void {
    this.activeTab = tab;
  }
}
