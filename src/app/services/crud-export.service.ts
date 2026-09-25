import { Injectable } from '@angular/core';
import { PDFDocument, StandardFonts, rgb, degrees } from 'pdf-lib';
import * as XLSX from 'xlsx';

/**
 * Definición de columna para exportación Excel/PDF.
 * Todas las vistas CRUD del patrón de diseño pueden usar esta interfaz.
 */
export interface CrudExportColumn {
  /** Clave del campo en cada objeto de datos */
  key: string;
  /** Encabezado en el archivo exportado */
  label: string;
  /** Opcional: formatear valor para exportación (recibe valor y fila completa) */
  format?: (value: unknown, row?: Record<string, unknown>) => string;
}

/**
 * Servicio reutilizable para exportar listas CRUD a Excel y PDF.
 * Lo usan todos los componentes que siguen el patrón "8. Vista CRUD (Lista)" del design system.
 *
 * Uso en un componente:
 *   constructor(private crudExport: CrudExportService) {}
 *   onExportExcel(): void {
 *     this.crudExport.exportToExcel(this.items, this.getExportColumns(), 'departamentos');
 *   }
 *   onExportPdf(): void {
 *     this.crudExport.exportToPdf(this.items, this.getExportColumns(), 'Departamentos', 'departamentos');
 *   }
 */
@Injectable({ providedIn: 'root' })
export class CrudExportService {

  /**
   * Exporta los datos a un archivo Excel (.xlsx).
   * @param data Array de objetos (filas)
   * @param columns Columnas a exportar (sin incluir "Acciones")
   * @param filename Nombre del archivo sin extensión
   */
  exportToExcel(
    data: Record<string, unknown>[],
    columns: CrudExportColumn[],
    filename: string
  ): void {
    const rows = data.map(row => {
      const out: Record<string, string> = {};
      columns.forEach(col => {
        const raw = row[col.key];
        const value = col.format ? col.format(raw, row) : this.formatCell(raw);
        out[col.label] = value;
      });
      return out;
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Datos');
    const name = `${filename}_${this.dateSuffix()}.xlsx`;
    XLSX.writeFile(wb, name);
  }

  /**
   * Exporta los datos a un PDF con tabla.
   * @param data Array de objetos (filas)
   * @param columns Columnas a exportar
   * @param title Título del documento
   * @param filename Nombre del archivo sin extensión
   */
  async exportToPdf(
    data: Record<string, unknown>[],
    columns: CrudExportColumn[],
    title: string,
    filename: string
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 9;
    const headerFontSize = 10;
    const rowHeight = 14;
    const margin = 40;
    const pageWidth = 595;
    const pageHeight = 842;
    const tableWidth = pageWidth - margin * 2;
    const colCount = columns.length;
    const colWidth = tableWidth / colCount;

    let y = pageHeight - margin;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);

    const drawText = (x: number, yVal: number, text: string, useBold = false) => {
      const f = useBold ? fontBold : font;
      const size = useBold ? headerFontSize : fontSize;
      page.drawText(text, { x, y: yVal, size, font: f, color: rgb(0, 0, 0) });
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      page.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: 0.5,
        color: rgb(0.6, 0.6, 0.6)
      });
    };

    // Título
    drawText(margin, y, title, true);
    y -= rowHeight + 4;
    drawLine(margin, y, pageWidth - margin, y);
    y -= 10;

    // Encabezados
    columns.forEach((col, i) => {
      const x = margin + i * colWidth + 2;
      const text = this.truncate(col.label, 18);
      drawText(x, y, text, true);
    });
    y -= rowHeight;
    drawLine(margin, y, pageWidth - margin, y);

    for (const row of data) {
      if (y < margin + rowHeight + 10) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      columns.forEach((col, i) => {
        const raw = row[col.key];
        const value = col.format ? col.format(raw, row) : this.formatCell(raw);
        const x = margin + i * colWidth + 2;
        drawText(x, y, this.truncate(value, 22));
      });
      y -= rowHeight;
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${this.dateSuffix()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Exporta el reporte de Cierre de Caja a PDF: detalle de recibos primero, luego consolidado por conceptos, partidas (MEF) y área.
   */
  async exportCierreCajaPdf(
    title: string,
    resumenPorConcepto: Array<{ concepto_codigo?: string; concepto_descripcion?: string; cantidad: number; monto_total: number }>,
    resumenPorPartida: Array<{ partida_ingreso?: string; partida_descripcion?: string; cantidad: number; monto_total: number }>,
    resumenPorArea: Array<{ nombre?: string; centro_costos_id?: string; cantidad: number; monto_total: number }>,
    detalle: Array<Record<string, unknown>>,
    filename: string
  ): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontSize = 8;
    const headerFontSize = 9;
    const rowHeight = 12;
    const margin = 40;
    const pageWidth = 595;
    const pageHeight = 842;
    const tableWidth = pageWidth - margin * 2;

    let y = pageHeight - margin;
    let page = pdfDoc.addPage([pageWidth, pageHeight]);

    const drawText = (x: number, yVal: number, text: string, useBold = false, size = fontSize) => {
      const f = useBold ? fontBold : font;
      page.drawText((text ?? '').substring(0, 50), { x, y: yVal, size, font: f, color: rgb(0, 0, 0) });
    };
    const drawLine = () => {
      page.drawLine({ start: { x: margin, y: y }, end: { x: pageWidth - margin, y: y }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
      y -= 4;
    };
    const maybeNewPage = () => {
      if (y < margin + rowHeight + 20) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    };

    drawText(margin, y, title, true, 12);
    y -= rowHeight + 4;
    drawLine();
    y -= 8;

    // 1. Detalle de recibos procesados (ordenado por nro. recibo)
    drawText(margin, y, 'Detalle de recibos procesados (ordenado por nro. recibo)', true, headerFontSize);
    y -= rowHeight + 2;
    const colW4 = [tableWidth * 0.12, tableWidth * 0.22, tableWidth * 0.15, tableWidth * 0.18, tableWidth * 0.18, tableWidth * 0.15];
    ['Nº Recibo', 'Contribuyente', 'Área', 'Concepto', 'Fecha', 'Monto (S/)'].forEach((h, i) => {
      drawText(margin + colW4.slice(0, i).reduce((a, b) => a + b, 0) + 2, y, h, true);
    });
    y -= rowHeight;
    drawLine();
    for (const row of detalle) {
      maybeNewPage();
      const nr = (row['numero_recibo'] ?? row['numero_correlativo'] ?? '').toString();
      const contrib = (row['contribuyente_nombre'] ?? row['contribuyente'] ?? '').toString();
      const area = (row['centro_costos_id'] ?? '').toString();
      const concepto = (row['concepto_descripcion'] ?? row['concepto_codigo'] ?? '').toString();
      const fecha = (row['fecha_pago'] ?? row['fecha'] ?? row['updated_at'] ?? '').toString().substring(0, 16);
      const monto = row['monto_total'] != null ? Number(row['monto_total']).toFixed(2) : '';
      drawText(margin + 2, y, nr);
      drawText(margin + colW4[0] + 2, y, contrib);
      drawText(margin + colW4[0] + colW4[1] + 2, y, area);
      drawText(margin + colW4[0] + colW4[1] + colW4[2] + 2, y, concepto);
      drawText(margin + colW4[0] + colW4[1] + colW4[2] + colW4[3] + 2, y, fecha);
      drawText(margin + colW4[0] + colW4[1] + colW4[2] + colW4[3] + colW4[4] + 2, y, monto);
      y -= rowHeight;
    }
    y -= 10;

    // 2. Consolidado por conceptos
    maybeNewPage();
    drawText(margin, y, 'Consolidado por conceptos', true, headerFontSize);
    y -= rowHeight + 2;
    const colW1 = [tableWidth * 0.15, tableWidth * 0.55, tableWidth * 0.12, tableWidth * 0.18];
    ['Código', 'Concepto', 'Cant.', 'Monto (S/)'].forEach((h, i) => {
      drawText(margin + colW1.slice(0, i).reduce((a, b) => a + b, 0) + 2, y, h, true);
    });
    y -= rowHeight;
    drawLine();
    for (const r of resumenPorConcepto) {
      maybeNewPage();
      drawText(margin + 2, y, (r.concepto_codigo ?? '').toString());
      drawText(margin + colW1[0] + 2, y, (r.concepto_descripcion ?? '').toString());
      drawText(margin + colW1[0] + colW1[1] + 2, y, String(r.cantidad));
      drawText(margin + colW1[0] + colW1[1] + colW1[2] + 2, y, Number(r.monto_total).toFixed(2));
      y -= rowHeight;
    }
    y -= 10;

    // 3. Consolidado por partidas de ingreso (MEF)
    maybeNewPage();
    drawText(margin, y, 'Consolidado por partidas de ingreso (MEF)', true, headerFontSize);
    y -= rowHeight + 2;
    const colW2 = [tableWidth * 0.2, tableWidth * 0.42, tableWidth * 0.12, tableWidth * 0.26];
    ['Partida', 'Desc. partida', 'Cant.', 'Monto (S/)'].forEach((h, i) => {
      drawText(margin + colW2.slice(0, i).reduce((a, b) => a + b, 0) + 2, y, h, true);
    });
    y -= rowHeight;
    drawLine();
    for (const r of resumenPorPartida) {
      maybeNewPage();
      drawText(margin + 2, y, (r.partida_ingreso ?? '').toString());
      drawText(margin + colW2[0] + 2, y, (r.partida_descripcion ?? '').toString());
      drawText(margin + colW2[0] + colW2[1] + 2, y, String(r.cantidad));
      drawText(margin + colW2[0] + colW2[1] + colW2[2] + 2, y, Number(r.monto_total).toFixed(2));
      y -= rowHeight;
    }
    y -= 10;

    // 4. Consolidado por área
    maybeNewPage();
    drawText(margin, y, 'Consolidado por área', true, headerFontSize);
    y -= rowHeight + 2;
    const colW3 = [tableWidth * 0.5, tableWidth * 0.25, tableWidth * 0.25];
    ['Área / Centro de costo', 'Cantidad', 'Monto (S/)'].forEach((h, i) => {
      drawText(margin + colW3.slice(0, i).reduce((a, b) => a + b, 0) + 2, y, h, true);
    });
    y -= rowHeight;
    drawLine();
    for (const r of resumenPorArea) {
      maybeNewPage();
      drawText(margin + 2, y, (r.nombre ?? r.centro_costos_id ?? '').toString());
      drawText(margin + colW3[0] + 2, y, String(r.cantidad));
      drawText(margin + colW3[0] + colW3[1] + 2, y, Number(r.monto_total).toFixed(2));
      y -= rowHeight;
    }

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${this.dateSuffix()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Genera un PDF formal de Acta de Inspección Sanitaria (Estilo Perú).
   */
  async exportInspeccionSanitariaPdf(data: any): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595; // A4
    const pageHeight = 842;
    const margin = 50;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, size = 10, useBold = false) => {
      page.drawText(text || '', {
        x, y: yPos, size,
        font: useBold ? fontBold : font,
        color: rgb(0, 0, 0)
      });
    };

    const drawLine = (yPos: number) => {
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 1,
        color: rgb(0, 0, 0)
      });
    };

    // Header
    drawText("Notaria PROVINCIAL DE HUANCAYO", pageWidth / 2 - 120, y, 12, true);
    y -= 15;
    drawText("GERENCIA DE PROMOCIÓN ECONÓMICA Y TURISMO", pageWidth / 2 - 135, y, 10, true);
    y -= 12;
    drawText("ÁREA DE BROMATOLOGÍA Y SALUD AMBIENTAL", pageWidth / 2 - 110, y, 9, false);
    y -= 30;

    drawLine(y);
    y -= 25;

    // Title
    drawText(`ACTA DE INSPECCIÓN SANITARIA Nº ${data.nro_acta}`, pageWidth / 2 - 110, y, 14, true);
    y -= 35;

    // Content Section 1: General Data
    drawText("I. DATOS GENERALES", margin, y, 11, true);
    y -= 20;

    drawText(`RAZÓN SOCIAL / COMERCIANTE:`, margin, y, 9, true);
    drawText(data.comerciante, margin + 160, y, 10, false);
    y -= 15;

    drawText(`INSPECTOR RESPONSABLE:`, margin, y, 9, true);
    drawText(data.inspector, margin + 160, y, 10, false);
    y -= 15;

    drawText(`FECHA DE INSPECCIÓN:`, margin, y, 9, true);
    drawText(new Date(data.fecha).toLocaleDateString('es-PE'), margin + 160, y, 10, false);
    y -= 15;

    drawText(`ESTADO DEL REGISTRO:`, margin, y, 9, true);
    drawText(data.estado || 'ACTIVO', margin + 160, y, 10, false);
    y -= 35;

    // Content Section 2: Evaluation
    drawText("II. RESULTADO DE EVALUACIÓN SANITARIA", margin, y, 11, true);
    y -= 20;

    const resColor = data.resultado === 'SATISFACTORIO' ? rgb(0, 0.5, 0) : (data.resultado === 'RECHAZADO' ? rgb(0.8, 0, 0) : rgb(0.8, 0.5, 0));
    drawText(`RESULTADO FINAL:`, margin, y, 9, true);
    page.drawText(data.resultado, { x: margin + 160, y, size: 12, font: fontBold, color: resColor });
    y -= 35;

    // Content Section 3: Observations
    drawText("III. OBSERVACIONES Y RECOMENDACIONES", margin, y, 11, true);
    y -= 20;

    const obsLines = this.splitTextToLines(data.observaciones || 'Sin observaciones registradas en el acta.', 85);
    obsLines.forEach(line => {
      drawText(line, margin + 10, y, 10, false);
      y -= 14;
    });

    y -= 60;
    drawLine(y);
    y -= 20;

    // Footer
    drawText("En señal de conformidad se firma la presente acta, siendo las ________ horas del día de la fecha.", margin, y, 9);

    y -= 100;

    // Signature Lines
    const lineW = 150;
    page.drawLine({ start: { x: margin + 20, y }, end: { x: margin + 20 + lineW, y }, thickness: 0.5 });
    page.drawLine({ start: { x: pageWidth - margin - 20 - lineW, y }, end: { x: pageWidth - margin - 20, y }, thickness: 0.5 });

    y -= 15;
    drawText("FIRMA DEL INSPECTOR", margin + 40, y, 8, true);
    drawText("FIRMA DEL COMERCIANTE", pageWidth - margin - 150, y, 8, true);

    y -= 60;
    drawText("Documento generado por el Sistema de Comercialización - Intranet Notaria", margin, y, 7, false);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Genera un PDF formal de Resolución de Sanción Administrativa.
   */
  async exportResolucionSancionPdf(data: any): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 60;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, size = 10, useBold = false) => {
      page.drawText(text || '', {
        x, y: yPos, size,
        font: useBold ? fontBold : font,
        color: rgb(0, 0, 0)
      });
    };

    const drawCenteredText = (text: string, yPos: number, size = 10, useBold = false) => {
      const f = useBold ? fontBold : font;
      const textWidth = f.widthOfTextAtSize(text, size);
      drawText(text, (pageWidth - textWidth) / 2, yPos, size, useBold);
    };

    // Header
    drawCenteredText("Notaria PROVINCIAL DE HUANCAYO", y, 12, true);
    y -= 15;
    drawCenteredText("GERENCIA DE PROMOCIÓN ECONÓMICA Y TURISMO", y, 10, true);
    y -= 30;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 1.5 });
    y -= 25;

    // Resolución Title
    drawCenteredText(`RESOLUCIÓN DE GERENCIA Nº ${data.nro_resolucion}-GPEyT/MPH`, y, 13, true);
    y -= 40;

    // Body text (Formal style)
    drawText("VISTO:", margin, y, 10, true);
    y -= 15;
    const vistoText = `El Informe de Fiscalización y el Acta de Control respectiva, donde se detallan las infracciones detectadas en el establecimiento del administrado ${data.infractor}.`;
    const vistoLines = this.splitTextToLines(vistoText, 80);
    vistoLines.forEach(line => { drawText(line, margin + 20, y); y -= 12; });
    y -= 10;

    drawText("CONSIDERANDO:", margin, y, 10, true);
    y -= 15;
    const considText = "Que, es facultad de la autoridad administrativa sancionar las conductas que contravengan las ordenanzas Notariaes vigentes en materia de comercialización y salud pública. Que, se ha verificado el incumplimiento de las normas Notariaes vigentes.";
    const considLines = this.splitTextToLines(considText, 80);
    considLines.forEach(line => { drawText(line, margin + 20, y); y -= 12; });
    y -= 15;

    drawText("SE RESUELVE:", margin, y, 10, true);
    y -= 20;

    drawText("ARTÍCULO PRIMERO.-", margin + 20, y, 9, true);
    drawText(`SANCIONAR a ${data.infractor}`, margin + 130, y);
    y -= 12;
    drawText(`con la medida de:`, margin + 130, y);
    drawText(data.monto_medida, margin + 220, y, 10, true);
    y -= 20;

    drawText("ARTÍCULO SEGUNDO.-", margin + 20, y, 9, true);
    drawText(`POR LA INFRACCIÓN:`, margin + 130, y);
    y -= 12;
    drawText(data.infraccion, margin + 130, y, 10, true);
    y -= 30;

    drawText("ARTÍCULO TERCERO.-", margin + 20, y, 9, true);
    drawText("NOTIFICAR la presente resolución al interesado conforme a Ley.", margin + 130, y);
    y -= 80;

    // Date
    drawText(`Huancayo, ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y);
    y -= 80;

    // Signatures
    const lineW = 180;
    page.drawLine({ start: { x: pageWidth / 2 - lineW / 2, y }, end: { x: pageWidth / 2 + lineW / 2, y }, thickness: 0.5 });
    y -= 15;
    drawCenteredText("GERENTE DE PROMOCIÓN ECONÓMICA", y, 9, true);
    drawCenteredText("Notaria PROVINCIAL DE HUANCAYO", y - 12, 8);

    const bytes = await pdfDoc.save();
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  /**
   * Genera un PDF formal de Licencia de Funcionamiento / Certificado (Modelo Actual Peruano).
   */
  async exportLicenciaFuncionamientoPdf(data: any): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      page.drawText(text || '', {
        x, y: yPos, size,
        font: useBold ? fontBold : font,
        color
      });
    };

    const drawCenteredText = (text: string, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      const f = useBold ? fontBold : font;
      const textWidth = f.widthOfTextAtSize(text, size);
      drawText(text, (pageWidth - textWidth) / 2, yPos, size, useBold, color);
    };

    // Color Corporativo (Verde Notaria Intenso)
    const primaryColor = rgb(0, 0.45, 0.2);
    const secondaryColor = rgb(0.2, 0.2, 0.2);

    // Fondo / Marca de Agua (Diagonal)
    page.drawText('DOCUMENTO OFICIAL - Notaria DE HUANCAYO', {
      x: 50, y: 150, size: 30,
      font: fontBold,
      color: rgb(0.9, 0.9, 0.9),
      rotate: degrees(45),
      opacity: 0.3
    });

    // Borde decorativo PREMIUM
    page.drawRectangle({
      x: 20, y: 20,
      width: pageWidth - 40,
      height: pageHeight - 40,
      borderWidth: 1.5,
      borderColor: primaryColor,
      opacity: 0
    });

    // Header con cintillo de color
    page.drawRectangle({
      x: 20, y: pageHeight - 110,
      width: pageWidth - 40,
      height: 90,
      color: primaryColor
    });

    y = pageHeight - 50;
    drawCenteredText("Notaria PROVINCIAL DE HUANCAYO", y, 16, true, rgb(1, 1, 1));
    y -= 18;
    drawCenteredText("GERENCIA DE PROMOCIÓN ECONÓMICA Y TURISMO", y, 11, true, rgb(1, 1, 1));
    y -= 14;
    drawCenteredText("Gestión de Desarrollo Humano e Inclusión Social", y, 9, false, rgb(0.9, 0.9, 0.9));

    y = pageHeight - 140;

    // Title Box
    const docTitle = data.tipo === 'LICENCIA' ? 'LICENCIA DE FUNCIONAMIENTO' :
      (data.tipo === 'CERTIFICADO' ? 'CERTIFICADO DE SEGURIDAD' : 'CONSTANCIA Notaria');

    page.drawRectangle({
      x: margin + 20, y: y - 10,
      width: pageWidth - (margin + 20) * 2,
      height: 40,
      borderColor: primaryColor,
      borderWidth: 2,
      opacity: 0
    });
    drawCenteredText(docTitle, y + 5, 20, true, primaryColor);
    y -= 50;

    // License Number
    drawCenteredText(`Nº ${data.nro_constancia || '2026-000001'}-MPH-GPEyT`, y, 14, true, secondaryColor);
    y -= 40;

    // Sección de Datos Estructurada
    const drawSection = (title: string, yPos: number) => {
      page.drawRectangle({ x: margin, y: yPos - 5, width: pageWidth - margin * 2, height: 18, color: rgb(0.95, 0.95, 0.95) });
      drawText(title, margin + 10, yPos, 9, true, primaryColor);
      return yPos - 30;
    };

    y = drawSection("I. DATOS DEL TITULAR", y);
    drawText("NOMBRE / RAZÓN SOCIAL:", margin + 20, y, 9, true);
    drawText(data.solicitante.toUpperCase(), margin + 180, y, 10);
    y -= 25;

    y = drawSection("II. DATOS DEL ESTABLECIMIENTO", y);
    drawText("DIRECCIÓN / UBICACIÓN:", margin + 20, y, 9, true);
    drawText(data.direccion || 'No especificado', margin + 180, y, 10);
    y -= 20;
    drawText("GIRO DE NEGOCIO:", margin + 20, y, 9, true);
    drawText((data.giro || 'ADMINISTRATIVO').toUpperCase(), margin + 180, y, 10);
    y -= 20;
    drawText("NRO. EXPEDIENTE:", margin + 20, y, 9, true);
    drawText(data.nro_expediente || '-', margin + 180, y, 10);
    y -= 25;

    y = drawSection("III. VIGENCIA Y EMISIÓN", y);
    drawText("TIPO DE VIGENCIA:", margin + 20, y, 9, true);
    drawText("INDETERMINADA (Ley 28976)", margin + 180, y, 10);
    y -= 20;
    drawText("FECHA DE EMISIÓN:", margin + 20, y, 9, true);
    drawText(new Date(data.fecha_emision).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }), margin + 180, y, 10);
    y -= 40;

    // Cuadro de Advertencia Legal
    page.drawRectangle({ x: margin, y: y - 50, width: pageWidth - margin * 2, height: 60, color: rgb(0.98, 0.98, 0.98), borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });
    const legalNotices = [
      "• La presente licencia debe ser exhibida en un lugar visible del establecimiento.",
      "• Cualquier modificación de giro o ampliación requiere autorización Notaria previa.",
      "• El incumplimiento de las normas Notariaes conlleva la revocación del presente documento."
    ];
    let ty = y - 5;
    legalNotices.forEach(txt => { drawText(txt, margin + 10, ty, 7, false, rgb(0.3, 0.3, 0.3)); ty -= 12; });

    y -= 120;

    // Signatures Area
    const lineW = 160;
    const signY = y + 40;
    page.drawLine({ start: { x: pageWidth / 2 - lineW / 2, y: signY }, end: { x: pageWidth / 2 + lineW / 2, y: signY }, thickness: 1, color: primaryColor });
    drawCenteredText("GERENTE DE PROMOCIÓN ECONÓMICA", signY - 15, 9, true, primaryColor);
    drawCenteredText("Notaria Provincial de Huancayo", signY - 25, 8);

    // QR y Código de Barras decorativo
    page.drawRectangle({ x: margin + 10, y: margin + 10, width: 70, height: 70, color: rgb(0.9, 0.9, 0.9) });
    drawText("QR SEGURIDAD", margin + 15, margin + 40, 6, false, rgb(0.5, 0.5, 0.5));

    const bytes = await pdfDoc.save();
    this.openPdf(bytes);
  }

  async exportCertificadoItsePdf(data: any): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 40;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      page.drawText(text || '', { x, y: yPos, size, font: useBold ? fontBold : font, color });
    };

    const drawCenteredText = (text: string, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      const f = useBold ? fontBold : font;
      const textWidth = f.widthOfTextAtSize(text, size);
      drawText(text, (pageWidth - textWidth) / 2, yPos, size, useBold, color);
    };

    // Color Corporativo ITSE (Dorado/Naranja Seguridad)
    const primaryColor = rgb(0.8, 0.4, 0);
    const secondaryColor = rgb(0.2, 0.2, 0.2);

    // Fondo Crema Suave
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(0.99, 0.98, 0.95) });

    // Borde Doble
    page.drawRectangle({ x: 15, y: 15, width: pageWidth - 30, height: pageHeight - 30, borderWidth: 2, borderColor: primaryColor, opacity: 0 });
    page.drawRectangle({ x: 20, y: 20, width: pageWidth - 40, height: pageHeight - 40, borderWidth: 1, borderColor: primaryColor, opacity: 0 });

    // Header
    y = pageHeight - 60;
    drawCenteredText("Notaria PROVINCIAL DE HUANCAYO", y, 14, true, primaryColor);
    y -= 15;
    drawCenteredText("GERENCIA DE SEGURIDAD CIUDADANA", y, 11, true, secondaryColor);
    y -= 15;
    drawCenteredText("SUBGERENCIA DE GESTIÓN DE RIESGOS DE DESASTRES", y, 10, false);

    y -= 60;
    // Título en Cintillo
    page.drawRectangle({ x: margin, y: y - 10, width: pageWidth - margin * 2, height: 40, color: primaryColor });
    drawCenteredText("CERTIFICADO DE INSPECCIÓN TÉCNICA", y + 18, 16, true, rgb(1, 1, 1));
    drawCenteredText("DE SEGURIDAD EN EDIFICACIONES - ITSE", y + 4, 11, true, rgb(1, 1, 1));

    y -= 50;
    drawCenteredText(`Nº ${data.nro_constancia || '2026-000001'}-MPH-GSC-SGRD`, y, 14, true, secondaryColor);

    y -= 50;
    const drawRow = (label: string, value: string) => {
      drawText(label, margin + 20, y, 9, true, primaryColor);
      drawText(value.toUpperCase(), margin + 180, y, 10, false, secondaryColor);
      y -= 25;
    };

    drawRow("ADMINISTRADO:", data.solicitante);
    drawRow("LOCAL / ESTABLECIMIENTO:", data.direccion || 'SEGÚN EXPEDIENTE');
    drawRow("GIRO DE NEGOCIO:", data.giro || 'COMERCIAL');
    drawRow("NIVEL DE RIESGO:", data.nivel_riesgo || 'MEDIO');
    drawRow("CAPACIDAD / AFORO:", data.capacidad || 'CONFORME A PLANOS');
    drawRow("NRO. EXPEDIENTE:", data.nro_expediente || '-');

    y -= 20;
    // Línea divisoria
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) });
    y -= 30;

    drawText("VIGENCIA DEL CERTIFICADO:", margin + 20, y, 10, true);
    drawText("DOS (02) AÑOS", margin + 180, y, 11, true, primaryColor);
    y -= 25;
    drawText("FECHA DE EMISIÓN:", margin + 20, y, 10, true);
    drawText(new Date(data.fecha_emision).toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }), margin + 180, y, 10);

    y -= 100;
    // Firmas
    const lineW = 150;
    page.drawLine({ start: { x: margin + 30, y }, end: { x: margin + 30 + lineW, y }, thickness: 1 });
    page.drawLine({ start: { x: pageWidth - margin - 30 - lineW, y }, end: { x: pageWidth - margin - 30, y }, thickness: 1 });

    drawText("EL INSPECTOR ITSE", margin + 50, y - 15, 8, true);
    drawText("SUBGERENTE DE G.R.D.", pageWidth - margin - 150, y - 15, 8, true);

    // QR Placeholder
    page.drawRectangle({ x: pageWidth - 110, y: 40, width: 70, height: 70, color: rgb(0.9, 0.9, 0.9) });
    drawText("QR VALIDACIÓN", pageWidth - 105, 50, 6);

    const bytes = await pdfDoc.save();
    this.openPdf(bytes);
  }

  /**
   * Genera un PDF de Constancia de Cese de Actividades.
   */
  async exportConstanciaCesePdf(data: any): Promise<void> {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pageWidth = 595;
    const pageHeight = 842;
    const margin = 50;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    const drawText = (text: string, x: number, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      page.drawText(text || '', { x, y: yPos, size, font: useBold ? fontBold : font, color });
    };

    const drawCenteredText = (text: string, yPos: number, size = 10, useBold = false, color = rgb(0, 0, 0)) => {
      const f = useBold ? fontBold : font;
      const textWidth = f.widthOfTextAtSize(text, size);
      drawText(text, (pageWidth - textWidth) / 2, yPos, size, useBold, color);
    };

    // Color Corporativo Cerúleo/Gris (Administrativo)
    const primaryColor = rgb(0.2, 0.4, 0.6);
    const secondaryColor = rgb(0.2, 0.2, 0.2);

    // Fondo Blanco Puro
    page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: pageHeight, color: rgb(1, 1, 1) });

    // Borde Simple Elegante
    page.drawRectangle({ x: margin / 2, y: margin / 2, width: pageWidth - margin, height: pageHeight - margin, borderWidth: 1, borderColor: rgb(0.8, 0.8, 0.8), opacity: 0 });

    // Header
    y = pageHeight - 60;
    drawCenteredText("Notaria PROVINCIAL DE HUANCAYO", y, 14, true, primaryColor);
    y -= 15;
    drawCenteredText("GERENCIA DE PROMOCIÓN ECONÓMICA Y TURISMO", y, 10, true, secondaryColor);
    y -= 15;
    drawCenteredText("DIVISIÓN DE LICENCIAS Y COMERCIALIZACIÓN", y, 9, false);

    y -= 80;
    const title = "CONSTANCIA DE CESE DE ACTIVIDADES";
    drawCenteredText(title, y, 18, true, primaryColor);
    y -= 25;
    drawCenteredText(`Nº ${data.nro_constancia || 'CESE-2026-001'}`, y, 12, true, secondaryColor);

    y -= 60;
    // Contexto narrativo formal
    const narrative = `La Gerencia de Promoción Económica y Turismo de la Notaria Provincial de Huancayo, a través de la División de Licencias, hace constar que a solicitud del administrado(a) ${data.solicitante.toUpperCase()}, con expediente Nº ${data.nro_expediente || '-'}, se procedió al CESE DEFINITIVO de las actividades comerciales en el establecimiento ubicado en ${data.direccion || 'la dirección registrada'}, con giro de ${(data.giro || 'NEGOCIO').toUpperCase()}.`;

    const lines = this.splitTextToLines(narrative, 85);
    lines.forEach(line => {
      drawText(line, margin, y, 11);
      y -= 18;
    });

    y -= 40;
    drawText("FUNDAMENTO:", margin, y, 10, true);
    y -= 15;
    drawText("El presente se expide conforme al D.S. Nº 006-2013-PCM y Ley Nº 28976.", margin + 20, y, 9);

    y -= 150;
    // Firma Centralizada
    const signY = y;
    page.drawLine({ start: { x: pageWidth / 2 - 90, y: signY }, end: { x: pageWidth / 2 + 90, y: signY }, thickness: 1, color: primaryColor });
    drawCenteredText("JEFE DE LA DIVISIÓN DE LICENCIAS", signY - 15, 9, true, primaryColor);
    drawCenteredText("Notaria Provincial de Huancayo", signY - 25, 8);

    y = 60;
    drawText(`Fecha de emisión: ${new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' })}`, margin, y, 8, false, rgb(0.5, 0.5, 0.5));

    const bytes = await pdfDoc.save();
    this.openPdf(bytes);
  }

  private openPdf(bytes: Uint8Array) {
    const blob = new Blob([bytes as any], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }

  private splitTextToLines(text: string, maxChars: number): string[] {
    const lines: string[] = [];
    let currentLine = '';
    const words = text.split(' ');

    words.forEach(word => {
      if ((currentLine + word).length > maxChars) {
        lines.push(currentLine.trim());
        currentLine = word + ' ';
      } else {
        currentLine += word + ' ';
      }
    });
    lines.push(currentLine.trim());
    return lines;
  }

  print(): void {
    window.print();
  }

  private formatCell(value: unknown): string {
    if (value == null) return '';
    if (typeof value === 'boolean') return value ? 'Sí' : 'No';
    if (value instanceof Date) return value.toLocaleDateString('es-PE');
    return String(value);
  }

  private truncate(s: string, max: number): string {
    if (s.length <= max) return s;
    return s.slice(0, max - 1) + '…';
  }

  private dateSuffix(): string {
    const d = new Date();
    return [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
      String(d.getHours()).padStart(2, '0'),
      String(d.getMinutes()).padStart(2, '0')
    ].join('');
  }
}
