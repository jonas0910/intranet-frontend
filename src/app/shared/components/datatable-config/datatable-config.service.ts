import { Injectable } from '@angular/core';

const DS_KEY = 'design-system-config';

export interface DtExportButton {
  extend: string;
  text: string;
  className: string;
}

/**
 * Servicio centralizado para generar configuraciones de DataTables
 * consistentes con el Design System del proyecto.
 *
 * Uso:
 *   constructor(private dtConfig: DataTableConfigService) {}
 *   this.dtOptions = this.dtConfig.getStandardOptions();
 *   this.dtOptions = this.dtConfig.getStandardOptions({ pageLength: 25, order: [[1, 'desc']] });
 */
@Injectable({ providedIn: 'root' })
export class DataTableConfigService {

  /**
   * Devuelve opciones estándar de DataTables con exportación,
   * idioma español y configuración consistente.
   */
  getStandardOptions(overrides: Record<string, any> = {}): any {
    const buttons = this.getExportButtons();
    return {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      stateSave: true,
      stateDuration: 0,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      dom: 'Bfrtip',
      buttons,
      order: [[0, 'asc']],
      columnDefs: [{ targets: -1, orderable: false, searchable: false }],
      ...overrides
    };
  }

  /**
   * Opciones compactas sin exportación (para tablas simples).
   */
  getCompactOptions(overrides: Record<string, any> = {}): any {
    return {
      pagingType: 'simple_numbers',
      pageLength: 10,
      processing: true,
      responsive: true,
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']],
      columnDefs: [{ targets: -1, orderable: false, searchable: false }],
      ...overrides
    };
  }

  /**
   * Genera los botones de exportación leyendo los estilos
   * del Design System si están disponibles.
   */
  getExportButtons(): DtExportButton[] {
    let excelClass = 'btn btn-success btn-sm';
    let pdfClass = 'btn btn-danger btn-sm';
    let printClass = 'btn btn-info btn-sm';

    try {
      const raw = localStorage.getItem(DS_KEY);
      if (raw) {
        const cfg = JSON.parse(raw);
        const exportGroup = cfg.buttonGroups?.find((g: any) => g.group === 'export');
        if (exportGroup?.buttons?.length >= 3) {
          const [excel, pdf, print] = exportGroup.buttons;
          excelClass = `btn ${excel.cssClass} btn-sm`;
          pdfClass = `btn ${pdf.cssClass} btn-sm`;
          printClass = `btn ${print.cssClass} btn-sm`;
        }
      }
    } catch { /* use defaults */ }

    return [
      { extend: 'excel', text: '<i class="fas fa-file-excel mr-1"></i> Excel', className: excelClass },
      { extend: 'pdf', text: '<i class="fas fa-file-pdf mr-1"></i> PDF', className: pdfClass },
      { extend: 'print', text: '<i class="fas fa-print mr-1"></i> Imprimir', className: printClass }
    ];
  }
}
