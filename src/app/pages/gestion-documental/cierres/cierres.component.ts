import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CierreService } from '../services/cierre.service';
import { CatalogoService } from '../services/catalogo.service';
import { Cierre, Area } from '../models/documento.model';

@Component({
  selector: 'app-cierres',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './cierres.component.html',
  styleUrls: ['./cierres.component.scss']
})
export class CierresComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  cierres: Cierre[] = [];
  loading = false;
  
  areas: Area[] = [];
  tiposPeriodo: any[] = [];
  
  filtros = {
    estado: '',
    anio: new Date().getFullYear(),
    tipo_periodo: '',
    area_id: undefined as number | undefined
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0
  };

  // Modales
  showModal = false;
  showDetalleModal = false;
  isEditMode = false;
  editingCierreId: number | null = null;
  cierreDetalle: Cierre | null = null;
  modalData: {
    tipo_periodo: 'mensual' | 'trimestral' | 'anual';
    anio: number;
    mes?: number;
    trimestre?: number;
    area_id?: number;
    observaciones: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    responsable_validacion?: string;
    requiere_backup: boolean;
  } = {
    tipo_periodo: 'mensual' as const,
    anio: new Date().getFullYear(),
    mes: undefined,
    trimestre: undefined,
    area_id: undefined,
    observaciones: '',
    fecha_inicio: undefined,
    fecha_fin: undefined,
    responsable_validacion: '',
    requiere_backup: true
  };

  constructor(
    private cierreService: CierreService,
    private catalogoService: CatalogoService
  ) {}

  ngOnInit(): void {
    this.loadCatalogos();
    this.loadCierres();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadCatalogos(): void {
    this.catalogoService.obtenerAreas()
      .pipe(takeUntil(this.destroy$))
      .subscribe(areas => this.areas = areas);

    this.catalogoService.obtenerTiposPeriodo()
      .pipe(takeUntil(this.destroy$))
      .subscribe(tipos => this.tiposPeriodo = tipos);
  }

  loadCierres(): void {
    this.loading = true;

    this.cierreService.listar(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.cierres = response.data.data;
            this.paginacion = {
              currentPage: response.data.current_page,
              lastPage: response.data.last_page,
              total: response.data.total
            };
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading cierres:', error);
          this.loading = false;
        }
      });
  }

  onFilterChange(): void {
    this.loadCierres();
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.editingCierreId = null;
    this.resetModalData();
    this.showModal = true;
  }

  openEditModal(cierre: Cierre): void {
    this.isEditMode = true;
    this.editingCierreId = cierre.id;
    this.modalData = {
      tipo_periodo: cierre.tipo_periodo,
      anio: cierre.anio,
      mes: cierre.mes,
      trimestre: cierre.trimestre,
      area_id: cierre.area_id,
      observaciones: cierre.observaciones || '',
      fecha_inicio: cierre.fecha_inicio,
      fecha_fin: cierre.fecha_fin,
      responsable_validacion: '',
      requiere_backup: true
    };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetModalData();
  }

  resetModalData(): void {
    this.isEditMode = false;
    this.editingCierreId = null;
    this.modalData = {
      tipo_periodo: 'mensual' as const,
      anio: new Date().getFullYear(),
      mes: new Date().getMonth() + 1,
      trimestre: undefined,
      area_id: undefined,
      observaciones: '',
      fecha_inicio: undefined,
      fecha_fin: undefined,
      responsable_validacion: '',
      requiere_backup: true
    };
  }

  onSubmitCierre(): void {
    const observable = this.isEditMode && this.editingCierreId
      ? this.cierreService.actualizar(this.editingCierreId, this.modalData)
      : this.cierreService.crear(this.modalData);

    observable
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            alert(this.isEditMode 
              ? '✅ Cierre actualizado exitosamente' 
              : '✅ Cierre creado exitosamente');
            this.closeModal();
            this.loadCierres();
          }
        },
        error: (error) => {
          console.error('Error en cierre:', error);
          alert('❌ Error: ' + (error.error?.message || 'Error desconocido'));
        }
      });
  }

  aprobarCierre(cierre: Cierre): void {
    const confirmacion = confirm(
      `⚠️ ¿Está seguro de APROBAR este cierre?\n\n` +
      `Cierre: ${cierre.codigo}\n` +
      `Periodo: ${cierre.tipo_periodo} ${cierre.anio}${cierre.mes ? '-' + cierre.mes : ''}\n` +
      `Documentos: ${cierre.total_documentos}\n\n` +
      `Al aprobar:\n` +
      `✅ Los ${cierre.total_documentos} documentos quedarán BLOQUEADOS\n` +
      `✅ Se generará un hash consolidado del periodo\n` +
      `✅ No podrán editarse ni eliminarse\n\n` +
      `Esta acción es PERMANENTE y solo se puede revertir rechazando el cierre.`
    );

    if (!confirmacion) {
      return;
    }

    this.cierreService.aprobar(cierre.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert(
            `✅ Cierre aprobado exitosamente\n\n` +
            `🔒 ${cierre.total_documentos} documentos han sido bloqueados\n` +
            `📊 Hash consolidado generado`
          );
          this.loadCierres();
        },
        error: (error) => {
          alert('❌ Error al aprobar cierre: ' + (error.error?.message || 'Error desconocido'));
        }
      });
  }

  rechazarCierre(cierre: Cierre): void {
    const motivo = prompt('Ingrese el motivo de rechazo:');
    if (!motivo) return;

    this.cierreService.rechazar(cierre.id, motivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('✅ Cierre rechazado exitosamente');
          this.loadCierres();
        },
        error: (error) => {
          alert('❌ Error al rechazar cierre: ' + (error.error?.message || 'Error desconocido'));
        }
      });
  }

  verDetalleCierre(cierre: Cierre): void {
    this.cierreDetalle = cierre;
    this.showDetalleModal = true;
  }

  closeDetalleModal(): void {
    this.showDetalleModal = false;
    this.cierreDetalle = null;
  }

  getNombreMes(mes: number): string {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[mes - 1] || mes.toString();
  }

  getPeriodoCompleto(cierre: Cierre): string {
    if (cierre.tipo_periodo === 'mensual') {
      return `${this.getNombreMes(cierre.mes!)} ${cierre.anio}`;
    } else if (cierre.tipo_periodo === 'trimestral') {
      return `Trimestre ${cierre.trimestre} - ${cierre.anio}`;
    } else {
      return `Año ${cierre.anio}`;
    }
  }

  getNombreArea(areaId?: number): string {
    if (!areaId) return 'Todas las áreas';
    const area = this.areas.find(a => a.id === areaId);
    return area?.nombre || `Área ${areaId}`;
  }

  reabrirCierre(cierre: Cierre): void {
    const confirmacion = confirm(
      `⚠️ ¿Está seguro de REABRIR este cierre?\n\n` +
      `Cierre: ${cierre.codigo}\n` +
      `Periodo: ${cierre.tipo_periodo} ${cierre.anio}\n\n` +
      `Esto desbloqueará los ${cierre.total_documentos} documentos asociados.\n\n` +
      `Esta acción debería usarse solo en casos excepcionales.`
    );

    if (!confirmacion) return;

    const motivo = prompt('Ingrese el motivo de reapertura:');
    if (!motivo) return;

    this.cierreService.rechazar(cierre.id, motivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          alert('✅ Cierre reabierto exitosamente\n\nLos documentos han sido desbloqueados.');
          this.loadCierres();
        },
        error: (error) => {
          alert('❌ Error al reabrir cierre: ' + (error.error?.message || 'Error desconocido'));
        }
      });
  }

  getEstadisticas() {
    return {
      total: this.cierres.length,
      pendientes: this.cierres.filter(c => c.estado === 'pendiente').length,
      cerrados: this.cierres.filter(c => c.estado === 'cerrado').length,
      rechazados: this.cierres.filter(c => c.estado === 'rechazado').length,
      validados: this.cierres.filter(c => c.estado === 'validado').length
    };
  }

  getEstadoBadgeClass(estado: string): string {
    const classes: { [key: string]: string } = {
      'pendiente': 'badge-warning',
      'en_proceso': 'badge-info',
      'validado': 'badge-primary',
      'rechazado': 'badge-danger',
      'cerrado': 'badge-success'
    };
    return classes[estado] || 'badge-secondary';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE');
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

