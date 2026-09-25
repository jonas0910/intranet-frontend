import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { AuditService, AuditLog, AuditStats } from '../../../services/audit.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { PageHeaderComponent, LoadingSpinnerComponent } from '../../../shared/components';

@Component({
  selector: 'app-audit-system',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, DataTablesModule, PageHeaderComponent, LoadingSpinnerComponent],
  templateUrl: './audit-system.component.html',
  styleUrls: ['./audit-system.component.scss']
})
export class AuditSystemComponent implements OnInit, OnDestroy {
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  // Configuración de UI (patrón Design System)
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  breadcrumbs = [
    { label: 'Administración', url: '/admin-menu-management' },
    { label: 'Auditoría de Sistema' }
  ];

  // DataTables (patrón del sistema de diseño)
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // Datos
  logs: AuditLog[] = [];
  stats: AuditStats | null = null;
  loadingLogs = false;
  loadingStats = false;
  totalLogs = 0;
  
  // Filtros
  filters = {
    user: '',
    module: '',
    action: '',
    dateStart: '',
    dateEnd: ''
  };

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;

  constructor(
    private auditService: AuditService,
    private dsService: DesignSystemService
  ) { }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('admin');
    this.mc = this.dsService.getModalCrudFor('admin');
    this.initDataTable();
    this.loadStats();
    this.loadLogs();
  }

  ngOnDestroy(): void {
    // No llamar dtTrigger.complete(): evita ObjectUnsubscribedError si el componente se reutiliza.
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'Todos']],
      processing: true,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: {
        url: 'assets/datatables/i18n/es-ES.json'
      },
      order: [[0, 'desc']],
      columnDefs: [
        { targets: 0, width: '50px' },
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  loadStats(): void {
    this.loadingStats = true;
    this.auditService.getStats().subscribe({
      next: (stats: AuditStats) => {
        this.stats = stats;
        this.loadingStats = false;
      },
      error: (err: any) => {
        console.error('Error cargando estadísticas', err);
        this.loadingStats = false;
      }
    });
  }

  loadLogs(): void {
    this.loadingLogs = true;
    this.auditService.getLogs(this.filters).subscribe({
      next: (response: any) => {
        // Manejar tanto el formato { data: [], total: 0 } como el formato directo [] o ApiResponse
        if (response.data && Array.isArray(response.data)) {
          this.logs = response.data;
          this.totalLogs = response.total || response.data.length;
        } else if (Array.isArray(response)) {
          this.logs = response;
          this.totalLogs = response.length;
        } else {
          this.logs = [];
          this.totalLogs = 0;
        }
        this.loadingLogs = false;
        this.triggerDataTable();
      },
      error: (err: any) => {
        console.error('Error cargando logs', err);
        this.logs = [];
        this.totalLogs = 0;
        this.loadingLogs = false;
        this.triggerDataTable();
      }
    });
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) { /* Subject already closed (e.g. component destroyed) */ }
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }
  
  // Método eliminado para usar solo datos reales
  generateLocalMockLogs(): void {
    // Implementación eliminada
  }

  generateTestLogs(): void {
    if (confirm('¿Generar datos de prueba en la base de datos? Esto creará registros de auditoría reales.')) {
      this.loadingLogs = true;
      
      // Crear varios logs de prueba
      const actions = ['Login', 'Logout', 'Consulta', 'Exportación'];
      const modules = ['Usuarios', 'Roles', 'Auditoría', 'Sistema'];
      
      let completed = 0;
      const total = 5;
      
      for (let i = 0; i < total; i++) {
        const action = actions[Math.floor(Math.random() * actions.length)];
        const module = modules[Math.floor(Math.random() * modules.length)];
        
        this.auditService.createLog({
          action,
          module,
          description: `Log de prueba generado automáticamente #${i+1}`,
          status: 'success',
          user_agent: navigator.userAgent
        }).subscribe({
          next: () => {
            completed++;
            if (completed === total) {
              this.loadLogs();
              this.loadingLogs = false;
              alert('Datos de prueba generados exitosamente.');
            }
          },
          error: (err) => {
            console.error('Error generando log de prueba', err);
            completed++;
            if (completed === total) {
              this.loadLogs();
              this.loadingLogs = false;
            }
          }
        });
      }
    }
  }

  search(): void {
    this.currentPage = 1;
    this.loadLogs();
  }

  clearFilters(): void {
    this.filters = {
      user: '',
      module: '',
      action: '',
      dateStart: '',
      dateEnd: ''
    };
    this.loadLogs();
  }

  exportData(): void {
    this.auditService.exportLogs(this.filters).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.csv`;
      link.click();
    });
  }

  getStatusClass(status: string): string {
    return status === 'success' ? 'badge-success' : 'badge-danger';
  }

  getActionIcon(action: string): string {
    const icons: {[key: string]: string} = {
      'Login': 'fas fa-sign-in-alt',
      'Logout': 'fas fa-sign-out-alt',
      'Crear': 'fas fa-plus',
      'Actualizar': 'fas fa-edit',
      'Eliminar': 'fas fa-trash',
      'Exportar': 'fas fa-download'
    };
    return icons[action] || 'fas fa-circle';
  }
}
