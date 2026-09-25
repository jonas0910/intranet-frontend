import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AuditoriaService } from '../services/auditoria.service';

@Component({
  selector: 'app-reportes',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './reportes.component.html',
  styleUrls: ['./reportes.component.scss']
})
export class ReportesComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // UI Tabs
  activeTab: 'estadisticas' | 'accesos' | 'modificaciones' = 'estadisticas';
  
  loading = false;
  estadisticas: any = null;
  accesos: any[] = [];
  modificaciones: any[] = [];

  filtros = {
    fecha_inicio: this.getPrimeraFechaMes(),
    fecha_fin: this.getUltimaFechaMes(),
    usuario_id: undefined as number | undefined,
    accion: '',
    documento_id: undefined as number | undefined
  };

  paginacion = {
    currentPage: 1,
    lastPage: 1,
    total: 0,
    perPage: 20
  };

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.loadEstadisticas();
    this.loadAccesos();
    this.loadModificaciones();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: 'estadisticas' | 'accesos' | 'modificaciones'): void {
    this.activeTab = tab;
  }

  getPrimeraFechaMes(): string {
    const date = new Date();
    date.setDate(1);
    return date.toISOString().split('T')[0];
  }

  getUltimaFechaMes(): string {
    const date = new Date();
    return date.toISOString().split('T')[0];
  }

  loadEstadisticas(): void {
    this.loading = true;
    
    this.auditoriaService.obtenerEstadisticas(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.estadisticas = response.data;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading estadisticas:', error);
          this.loading = false;
        }
      });
  }

  loadAccesos(): void {
    this.auditoriaService.obtenerAccesos(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.accesos = response.data.data || response.data;
            if (response.data.current_page) {
              this.paginacion = {
                currentPage: response.data.current_page,
                lastPage: response.data.last_page,
                total: response.data.total,
                perPage: response.data.per_page
              };
            }
          }
        },
        error: (error) => {
          console.error('Error loading accesos:', error);
        }
      });
  }

  loadModificaciones(): void {
    this.auditoriaService.obtenerModificaciones(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.modificaciones = response.data.data || response.data;
          }
        },
        error: (error) => {
          console.error('Error loading modificaciones:', error);
        }
      });
  }

  onFilterChange(): void {
    this.loadEstadisticas();
    this.loadAccesos();
    this.loadModificaciones();
  }

  exportarReporte(): void {
    this.auditoriaService.exportarReporte(this.filtros)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const filename = `auditoria-${this.filtros.fecha_inicio}-${this.filtros.fecha_fin}.xlsx`;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          alert('✅ Reporte exportado exitosamente');
        },
        error: (error) => {
          console.error('Error exportando:', error);
          alert('❌ Error al exportar reporte');
        }
      });
  }

  getAccionBadgeClass(accion: string): string {
    const classes: { [key: string]: string } = {
      'crear': 'badge-success',
      'ver': 'badge-info',
      'descargar': 'badge-primary',
      'editar': 'badge-warning',
      'eliminar': 'badge-danger',
      'compartir': 'badge-purple',
      'bloquear_manual': 'badge-dark',
      'desbloquear_manual': 'badge-secondary',
      'firmar': 'badge-success',
      'derivar': 'badge-info'
    };
    return classes[accion] || 'badge-secondary';
  }

  formatDate(dateString: string): string {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-PE');
  }

  getAccionesPorTipo(accion: string): number {
    if (!this.estadisticas || !this.estadisticas.acciones_por_tipo) return 0;
    const found = this.estadisticas.acciones_por_tipo.find((a: any) => a.accion === accion);
    return found ? found.total : 0;
  }

  getPercentage(total: number): number {
    if (!this.estadisticas || !this.estadisticas.total_acciones) return 0;
    return (total / this.estadisticas.total_acciones) * 100;
  }

  getAccionColor(accion: string): string {
    const colors: { [key: string]: string } = {
      'crear': 'success',
      'ver': 'info',
      'descargar': 'primary',
      'editar': 'warning',
      'eliminar': 'danger',
      'compartir': 'purple',
      'bloquear_manual': 'dark',
      'desbloquear_manual': 'secondary',
      'firmar': 'success',
      'derivar': 'info'
    };
    return colors[accion] || 'secondary';
  }

  getAccionIcon(accion: string): string {
    const icons: { [key: string]: string } = {
      'crear': 'fas fa-plus-circle',
      'ver': 'fas fa-eye',
      'descargar': 'fas fa-download',
      'editar': 'fas fa-edit',
      'eliminar': 'fas fa-trash',
      'compartir': 'fas fa-share-alt',
      'bloquear_manual': 'fas fa-lock',
      'desbloquear_manual': 'fas fa-unlock',
      'firmar': 'fas fa-signature',
      'derivar': 'fas fa-share'
    };
    return icons[accion] || 'fas fa-circle';
  }

  verDetallesCambios(registro: any): void {
    let mensaje = `📝 Detalles del cambio:\n\n`;
    
    if (registro.datos_anteriores) {
      mensaje += `🔴 Datos anteriores:\n${JSON.stringify(registro.datos_anteriores, null, 2)}\n\n`;
    }
    
    if (registro.datos_nuevos) {
      mensaje += `🟢 Datos nuevos:\n${JSON.stringify(registro.datos_nuevos, null, 2)}`;
    }
    
    alert(mensaje);
  }
}

