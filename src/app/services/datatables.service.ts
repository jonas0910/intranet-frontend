import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface DataTableColumn {
  title: string;
  data: string;
  orderable?: boolean;
  searchable?: boolean;
  width?: string;
  className?: string;
  render?: (data: any, type: any, row: any) => string;
}

export interface DataTableOptions {
  columns: DataTableColumn[];
  data: any[];
  pageLength?: number;
  lengthMenu?: number[][];
  order?: number[][];
  searching?: boolean;
  paging?: boolean;
  info?: boolean;
  ordering?: boolean;
  responsive?: boolean;
  language?: any;
  dom?: string;
  buttons?: any[];
  select?: any;
}

@Injectable({
  providedIn: 'root'
})
export class DataTablesService {
  private dataTableInstances: Map<string, any> = new Map();
  private selectionSubject = new Subject<any[]>();

  constructor() { }

  /**
   * Inicializar DataTable con opciones personalizadas
   */
  initializeDataTable(tableId: string, options: DataTableOptions): any {
    const defaultOptions = {
      pageLength: 25,
      lengthMenu: [[10, 25, 50, 100], [10, 25, 50, 100]],
      order: [[0, 'asc']],
      searching: true,
      paging: true,
      info: true,
      ordering: true,
      responsive: true,
      language: {
        processing: "Procesando...",
        lengthMenu: "Mostrar _MENU_ registros",
        zeroRecords: "No se encontraron resultados",
        emptyTable: "Ningún dato disponible en esta tabla",
        info: "Mostrando _START_ a _END_ de _TOTAL_ registros",
        infoEmpty: "Mostrando 0 a 0 de 0 registros",
        infoFiltered: "(filtrado de _MAX_ registros)",
        infoPostFix: "",
        search: "Buscar:",
        url: "",
        infoThousands: ",",
        loadingRecords: "Cargando...",
        paginate: {
          first: "Primero",
          last: "Último",
          next: "Siguiente",
          previous: "Anterior"
        },
        aria: {
          sortAscending: ": Activar para ordenar la columna de manera ascendente",
          sortDescending: ": Activar para ordenar la columna de manera descendente"
        }
      },
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      ...options
    };

    // Destruir DataTable existente si existe
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const existingTable = (window as any).$(`#${tableId}`).DataTable();
      if (existingTable) {
        existingTable.destroy();
      }
    }

    // Inicializar nuevo DataTable
    return (window as any).$(`#${tableId}`).DataTable(defaultOptions);
  }

  /**
   * Destruir DataTable
   */
  destroyDataTable(tableId: string): void {
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const table = (window as any).$(`#${tableId}`).DataTable();
      if (table) {
        table.destroy();
      }
    }
  }

  /**
   * Actualizar datos de DataTable
   */
  updateDataTable(tableId: string, newData: any[]): void {
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const table = (window as any).$(`#${tableId}`).DataTable();
      if (table) {
        table.clear();
        table.rows.add(newData);
        table.draw();
      }
    }
  }

  /**
   * Obtener datos seleccionados de DataTable
   */
  getSelectedRows(tableId: string): any[] {
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const table = (window as any).$(`#${tableId}`).DataTable();
      if (table && table.rows) {
        return table.rows({ selected: true }).data().toArray();
      }
    }
    return [];
  }

  /**
   * Limpiar selección de DataTable
   */
  clearSelection(tableId: string): void {
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const table = (window as any).$(`#${tableId}`).DataTable();
      if (table && table.rows) {
        table.rows().deselect();
      }
    }
  }

  /**
   * Exportar datos a CSV
   */
  exportToCSV(tableId: string, filename?: string): void {
    if ((window as any).$ && (window as any).$.fn.DataTable) {
      const table = (window as any).$(`#${tableId}`).DataTable();
      if (table) {
        const data = table.data().toArray();
        const headers = table.columns().header().toArray().map((header: any) => 
          (header as HTMLElement).textContent?.trim() || ''
        );
        
        const csvContent = this.generateCSV(data, headers);
        this.downloadCSV(csvContent, filename || 'export.csv');
      }
    }
  }

  /**
   * Generar contenido CSV
   */
  private generateCSV(data: any[], headers: string[]): string {
    const csvRows = [];
    
    // Agregar headers
    csvRows.push(headers.map(header => `"${header}"`).join(','));
    
    // Agregar datos
    data.forEach(row => {
      const values = Object.values(row).map(value => 
        `"${String(value).replace(/"/g, '""')}"`
      );
      csvRows.push(values.join(','));
    });
    
    return csvRows.join('\n');
  }

  /**
   * Descargar archivo CSV
   */
  private downloadCSV(csvContent: string, filename: string): void {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Crear columnas estándar para usuarios
   */
  createUserColumns(): DataTableColumn[] {
    return [
      {
        title: 'ID',
        data: 'id',
        width: '60px',
        className: 'text-center'
      },
      {
        title: 'Usuario',
        data: 'name',
        render: (data: any, type: any, row: any) => {
          return `
            <div class="d-flex align-items-center">
              <div class="user-avatar mr-2">
                <i class="fas fa-user-circle fa-2x text-muted"></i>
              </div>
              <div>
                <strong>${data}</strong>
                <br>
                <small class="text-muted">${row.position || 'Sin cargo'}</small>
              </div>
            </div>
          `;
        }
      },
      {
        title: 'Email',
        data: 'email'
      },
      {
        title: 'Roles',
        data: 'roles',
        orderable: false,
        render: (data: any) => {
          if (!data || data.length === 0) return '<span class="text-muted">Sin roles</span>';
          return data.map((role: any) => 
            `<span class="badge badge-primary mr-1">${role.name}</span>`
          ).join('');
        }
      },
      {
        title: 'Estado',
        data: 'activo',
        width: '100px',
        className: 'text-center',
        render: (data: any) => {
          return data 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-danger">Inactivo</span>';
        }
      },
      {
        title: 'Última Actualización',
        data: 'created_at',
        render: (data: any) => {
          return new Date(data).toLocaleDateString('es-ES');
        }
      },
      {
        title: 'Acciones',
        data: 'id',
        orderable: false,
        searchable: false,
        width: '120px',
        className: 'text-center',
        render: (data: any, type: any, row: any) => {
          return `
            <div class="btn-group">
              <button class="btn btn-sm btn-info" onclick="viewUser(${data})" title="Ver detalles">
                <i class="fas fa-eye"></i>
              </button>
              <button class="btn btn-sm btn-warning" onclick="editUser(${data})" title="Editar">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-sm btn-success" onclick="manageAccess(${data})" title="Gestionar Acceso">
                <i class="fas fa-key"></i>
              </button>
            </div>
          `;
        }
      }
    ];
  }

  /**
   * Crear columnas para sistemas
   */
  createSystemColumns(): DataTableColumn[] {
    return [
      {
        title: 'ID',
        data: 'id',
        width: '60px',
        className: 'text-center'
      },
      {
        title: 'Nombre',
        data: 'nombre'
      },
      {
        title: 'Descripción',
        data: 'descripcion',
        render: (data: any) => data || '<span class="text-muted">Sin descripción</span>'
      },
      {
        title: 'Icono',
        data: 'icono',
        width: '80px',
        className: 'text-center',
        render: (data: any) => `<i class="${data || 'fas fa-server'}"></i>`
      },
      {
        title: 'Estado',
        data: 'activo',
        width: '100px',
        className: 'text-center',
        render: (data: any) => {
          return data 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-danger">Inactivo</span>';
        }
      }
    ];
  }

  /**
   * Crear columnas para menús
   */
  createMenuColumns(): DataTableColumn[] {
    return [
      {
        title: 'ID',
        data: 'id',
        width: '60px',
        className: 'text-center'
      },
      {
        title: 'Nombre',
        data: 'nombre'
      },
      {
        title: 'Ruta',
        data: 'ruta',
        render: (data: any) => data || '<span class="text-muted">Sin ruta</span>'
      },
      {
        title: 'Icono',
        data: 'icono',
        width: '80px',
        className: 'text-center',
        render: (data: any) => `<i class="${data || 'fas fa-circle'}"></i>`
      },
      {
        title: 'Sistema',
        data: 'sistema_id',
        render: (data: any) => data ? `Sistema ${data}` : '<span class="text-muted">Sin sistema</span>'
      },
      {
        title: 'Estado',
        data: 'activo',
        width: '100px',
        className: 'text-center',
        render: (data: any) => {
          return data 
            ? '<span class="badge badge-success">Activo</span>'
            : '<span class="badge badge-danger">Inactivo</span>';
        }
      }
    ];
  }
}
