import { inject } from '@angular/core';
import { CrudExportService, CrudExportColumn } from '../../services/crud-export.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../services/design-system.service';

/**
 * Clase base para listados CRUD que usan el patrón de diseño UI.
 * Incluye inyección automática del DesignSystemService.
 */
export abstract class CrudListExportBase {
  protected dsService = inject(DesignSystemService);

  constructor(protected crudExport: CrudExportService) { }

  /** Atajo para acceder a la configuración CRUD actual (evita boilerplate) */
  get cv(): CrudViewConfig {
    return this.dsService.currentCrudView;
  }

  /** Atajo para acceder a la configuración de modales actual (evita boilerplate) */
  get mc(): ModalCrudConfig {
    return this.dsService.currentModalCrud;
  }

  /** Datos actuales de la tabla (sin columna Acciones) */
  abstract getExportData(): Record<string, unknown>[];

  /** Definición de columnas a exportar (encabezado + key o format) */
  abstract getExportColumns(): CrudExportColumn[];

  /** Título del documento (ej. "Listado de Departamentos") */
  abstract getExportTitle(): string;

  /** Nombre del archivo sin extensión (ej. "departamentos") */
  abstract getExportFilename(): string;

  onExportExcel(): void {
    this.crudExport.exportToExcel(
      this.getExportData(),
      this.getExportColumns(),
      this.getExportFilename()
    );
  }

  onExportPdf(): void {
    this.crudExport.exportToPdf(
      this.getExportData(),
      this.getExportColumns(),
      this.getExportTitle(),
      this.getExportFilename()
    ).catch((err: unknown) => console.error('Error exportando PDF', err));
  }

  onExportPrint(): void {
    this.crudExport.print();
  }
}
