import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb } from 'pdf-lib';

// Configurar el worker de PDF.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

@Injectable({
  providedIn: 'root'
})
export class PdfViewerService {
  
  constructor(private http: HttpClient) {}

  /**
   * Cargar un PDF desde una URL y retornar el documento de PDF.js
   */
  async loadPdf(url: string): Promise<pdfjsLib.PDFDocumentProxy> {
    try {
      const loadingTask = pdfjsLib.getDocument({
        url: url,
        cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
        cMapPacked: true,
      });
      
      return await loadingTask.promise;
    } catch (error) {
      console.error('Error cargando PDF:', error);
      throw error;
    }
  }

  /**
   * Renderizar una página del PDF en un canvas
   */
  async renderPage(
    pdfDoc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    scale: number = 1.5
  ): Promise<void> {
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('No se pudo obtener el contexto del canvas');
      }

      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };

      await page.render(renderContext).promise;
    } catch (error) {
      console.error('Error renderizando página:', error);
      throw error;
    }
  }

  /**
   * Cargar un PDF usando pdf-lib para manipulación
   */
  async loadPdfForEditing(url: string): Promise<{ pdfDoc: PDFDocument; pdfBytes: Uint8Array }> {
    try {
      // Obtener el PDF como ArrayBuffer
      const arrayBuffer = await firstValueFrom(
        this.http.get(url, { responseType: 'arraybuffer' })
      );

      if (!arrayBuffer) {
        throw new Error('No se pudo cargar el PDF');
      }

      const pdfBytes = new Uint8Array(arrayBuffer);
      const pdfDoc = await PDFDocument.load(pdfBytes);

      return { pdfDoc, pdfBytes };
    } catch (error) {
      console.error('Error cargando PDF para edición:', error);
      throw error;
    }
  }

  /**
   * Aplicar una firma (imagen) a un PDF usando pdf-lib
   */
  async aplicarFirma(
    pdfBytes: Uint8Array,
    imagenFirmaBase64: string,
    posicionX: number,
    posicionY: number,
    pagina: number = 1,
    anchoFirma: number = 150,
    altoFirma?: number
  ): Promise<Uint8Array> {
    try {
      // Cargar el PDF
      const pdfDoc = await PDFDocument.load(pdfBytes);
      
      // Obtener la página donde se aplicará la firma
      const pages = pdfDoc.getPages();
      const paginaIndex = Math.min(pagina - 1, pages.length - 1);
      const pdfPage = pages[paginaIndex];

      // Decodificar la imagen de la firma
      const imagenFirmaBytes = this.base64ToUint8Array(imagenFirmaBase64);
      
      // Determinar el tipo de imagen (PNG o JPEG)
      let imagen;
      try {
        imagen = await pdfDoc.embedPng(imagenFirmaBytes);
      } catch {
        // Si no es PNG, intentar JPEG
        imagen = await pdfDoc.embedJpg(imagenFirmaBytes);
      }

      // Obtener dimensiones de la página
      const { width: pageWidth, height: pageHeight } = pdfPage.getSize();

      // Calcular posición en puntos (pdf-lib usa puntos como unidad)
      const x = (posicionX / 100) * pageWidth;
      const y = pageHeight - ((posicionY / 100) * pageHeight);

      // Calcular dimensiones de la firma
      const imagenDims = imagen.scale(anchoFirma / imagen.width);
      const firmaAlto = altoFirma || imagenDims.height;

      // Ajustar posición para que no se salga de la página
      const firmaX = Math.max(0, Math.min(x - anchoFirma / 2, pageWidth - anchoFirma));
      const firmaY = Math.max(firmaAlto, Math.min(y, pageHeight));

      // Aplicar la imagen en la página
      pdfPage.drawImage(imagen, {
        x: firmaX,
        y: firmaY - firmaAlto,
        width: anchoFirma,
        height: firmaAlto,
      });

      // Guardar el PDF modificado
      const pdfBytesModificado = await pdfDoc.save();
      return pdfBytesModificado;
    } catch (error) {
      console.error('Error aplicando firma al PDF:', error);
      throw error;
    }
  }

  /**
   * Aplicar un sello de texto a un PDF
   */
  async aplicarSelloTexto(
    pdfBytes: Uint8Array,
    texto: string,
    posicionX: number,
    posicionY: number,
    pagina: number = 1,
    color: { r: number; g: number; b: number } = { r: 46, g: 125, b: 50 }
  ): Promise<Uint8Array> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const pages = pdfDoc.getPages();
      const paginaIndex = Math.min(pagina - 1, pages.length - 1);
      const pdfPage = pages[paginaIndex];

      const { width: pageWidth, height: pageHeight } = pdfPage.getSize();
      const x = (posicionX / 100) * pageWidth;
      const y = pageHeight - ((posicionY / 100) * pageHeight);

      // Dibujar rectángulo de fondo
      pdfPage.drawRectangle({
        x: x - 40,
        y: y - 20,
        width: 80,
        height: 14,
        color: rgb(color.r / 255, color.g / 255, color.b / 255),
      });

      // Agregar texto
      pdfPage.drawText('FIRMADO DIGITALMENTE', {
        x: x - 38,
        y: y - 15,
        size: 8,
        color: rgb(1, 1, 1),
      });

      pdfPage.drawText(texto, {
        x: x - 38,
        y: y - 10,
        size: 6,
        color: rgb(1, 1, 1),
      });

      const pdfBytesModificado = await pdfDoc.save();
      return pdfBytesModificado;
    } catch (error) {
      console.error('Error aplicando sello al PDF:', error);
      throw error;
    }
  }

  /**
   * Convertir base64 a Uint8Array
   */
  private base64ToUint8Array(base64: string): Uint8Array {
    // Remover el prefijo data:image/...;base64, si existe
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Convertir base64 a binary string
    const binaryString = atob(base64Data);
    
    // Convertir binary string a Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    return bytes;
  }

  /**
   * Convertir Uint8Array a base64 para envío al servidor
   */
  uint8ArrayToBase64(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Descargar un PDF desde bytes
   */
  descargarPdf(pdfBytes: Uint8Array, nombreArchivo: string): void {
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

