import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfViewerService } from '../../../../services/pdf-viewer.service';
import * as pdfjsLib from 'pdfjs-dist';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdf-viewer.component.html',
  styleUrl: './pdf-viewer.component.scss'
})
export class PdfViewerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() pdfUrl: string | null = null;
  @Input() enableSignature: boolean = false;
  @Input() signaturePosition: { x: number; y: number; page: number } | null = null;
  @Input() signatureImage: string | null = null; // Base64 image
  @Output() signaturePositionSelected = new EventEmitter<{ x: number; y: number; page: number }>();
  
  @ViewChild('pdfContainer', { static: false }) pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('canvas', { static: false }) canvas!: ElementRef<HTMLCanvasElement>;
  
  pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
  currentPage = 1;
  totalPages = 0;
  scale = 1.5;
  loading = false;
  error: string | null = null;
  
  // Controles
  zoomLevel = 100;
  rotation = 0;

  constructor(private pdfViewerService: PdfViewerService) {}

  ngOnInit(): void {
    if (this.pdfUrl) {
      this.loadPdf();
    }
  }

  ngOnDestroy(): void {
    // Cleanup
  }

  ngAfterViewInit(): void {
    // Initial render
  }

  async loadPdf(): Promise<void> {
    if (!this.pdfUrl) return;

    this.loading = true;
    this.error = null;

    try {
      this.pdfDoc = await this.pdfViewerService.loadPdf(this.pdfUrl);
      this.totalPages = this.pdfDoc.numPages;
      await this.renderPage(this.currentPage);
    } catch (err: any) {
      this.error = err.message || 'Error al cargar el PDF';
      console.error('Error cargando PDF:', err);
    } finally {
      this.loading = false;
    }
  }

  async renderPage(pageNum: number): Promise<void> {
    if (!this.pdfDoc || !this.canvas) return;

    try {
      const scale = this.scale * (this.zoomLevel / 100);
      await this.pdfViewerService.renderPage(
        this.pdfDoc,
        pageNum,
        this.canvas.nativeElement,
        scale
      );

      // Aplicar rotación si existe
      if (this.rotation !== 0) {
        const ctx = this.canvas.nativeElement.getContext('2d');
        if (ctx) {
          // Rotación se manejará en el CSS con transform
        }
      }
    } catch (err) {
      console.error('Error renderizando página:', err);
    }
  }

  async goToPage(pageNum: number): Promise<void> {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    await this.renderPage(this.currentPage);
  }

  async nextPage(): Promise<void> {
    if (this.currentPage < this.totalPages) {
      await this.goToPage(this.currentPage + 1);
    }
  }

  async prevPage(): Promise<void> {
    if (this.currentPage > 1) {
      await this.goToPage(this.currentPage - 1);
    }
  }

  async zoomIn(): Promise<void> {
    this.zoomLevel = Math.min(200, this.zoomLevel + 10);
    await this.renderPage(this.currentPage);
  }

  async zoomOut(): Promise<void> {
    this.zoomLevel = Math.max(50, this.zoomLevel - 10);
    await this.renderPage(this.currentPage);
  }

  async resetZoom(): Promise<void> {
    this.zoomLevel = 100;
    await this.renderPage(this.currentPage);
  }

  async rotate(): Promise<void> {
    this.rotation = (this.rotation + 90) % 360;
    await this.renderPage(this.currentPage);
  }

  async fitToWidth(): Promise<void> {
    // Implementar ajuste al ancho
    await this.renderPage(this.currentPage);
  }

  async fitToPage(): Promise<void> {
    // Implementar ajuste a la página
    await this.renderPage(this.currentPage);
  }

  onCanvasClick(event: MouseEvent): void {
    if (!this.enableSignature || !this.canvas) return;

    const rect = this.canvas.nativeElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;

    // Emitir evento de posición de firma
    this.signaturePositionSelected.emit({
      x,
      y,
      page: this.currentPage
    });
  }

  // Método público para refrescar cuando cambia la posición de firma
  async refresh(): Promise<void> {
    if (this.currentPage) {
      await this.renderPage(this.currentPage);
    }
  }
}

