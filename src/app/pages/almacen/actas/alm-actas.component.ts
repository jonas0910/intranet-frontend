import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { AlmacenService } from '../services/almacen.service';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

import { AlmacenUnitSelectorComponent } from '../components/unit-selector/unit-selector.component';

@Component({
  selector: 'app-alm-actas',
  standalone: true,
  imports: [CommonModule, SystemLayoutComponent, AlmacenUnitSelectorComponent],
  providers: [DatePipe],
  template: `
<app-system-layout [title]="'Actas de Entrega / Asignación'" [subtitle]="'Control de documentos y expedientes firmados por usuarios'"
  [breadcrumbs]="[{label: 'Inicio', url: '/'}, {label: 'Almacén', url: '/almacen'}, {label: 'Actas'}]"
  [subsystem]="'almacen'">

  <div class="row">
    <div class="col-12">
      <div class="mb-3 d-flex justify-content-end align-items-center">
            <app-almacen-unit-selector></app-almacen-unit-selector>
      </div>
      <div class="card elevation-1 mb-3" [ngClass]="cv.cardOutlineColor ? 'card-outline ' + cv.cardOutlineColor : 'card-outline card-warning'"
        [style.border-radius.px]="cv.cardBorderRadius != null ? cv.cardBorderRadius : 6">
        
        <!-- Toolbar -->
        <div class="d-flex justify-content-between align-items-center px-4 py-3 border-bottom bg-white">
          <div class="d-flex align-items-center flex-wrap" style="gap: 6px;">
            <h3 class="card-title mb-0" [style.font-size]="cv.headerFontSize">
              <i class="fas fa-file-signature mr-2"></i> Listado Oficial de Actas
            </h3>
            <span class="badge ml-2" [ngClass]="cv.cardOutlineColor ? 'bg-' + cv.cardOutlineColor.replace('card-', '') : 'badge-warning'">
              {{ actas.length }} Docs
            </span>
          </div>
        </div>

        <div class="card-body p-0">
            <div *ngIf="loading" class="text-center p-5">
              <i class="fas fa-spinner fa-spin fa-3x text-primary mb-3"></i>
              <p class="text-muted">Consultando documentos en la base de datos...</p>
            </div>
            
            <div class="table-responsive p-2" *ngIf="!loading">
              <table class="table table-hover table-striped align-middle mb-0 w-100" [ngClass]="cv.tableClasses">
                <thead [style.background-color]="cv.tableHeaderBg" [style.color]="cv.tableHeaderColor">
                  <tr>
                    <th class="border-0 px-3">Identificador</th>
                    <th class="text-left border-0">Afectación del Bien</th>
                    <th class="border-0 text-center">Clasificación</th>
                    <th class="border-0">Destinatario / Cargo</th>
                    <th class="border-0">Emisión Autorizada</th>
                    <th class="border-0 text-center">Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let acta of actas" class="fade-in">
                    <td class="font-weight-bold px-3">
                      <span class="badge border border-primary text-primary px-3 py-2 bg-light shadow-sm" style="font-size: 0.9em; letter-spacing: 0.5px">
                          <i class="fas fa-file-alt mr-2"></i> {{ acta.nro_acta }}
                      </span>
                    </td>
                    <td class="text-left">
                      <div class="font-weight-bold text-dark">{{ acta.movimiento?.bien?.nombre || 'Desconocido' }}</div>
                      <small class="text-muted font-italic">Cant Expedida: {{ acta.movimiento?.cantidad }} {{ acta.movimiento?.bien?.unidad?.codigo }}</small>
                    </td>
                    <td class="text-center">
                      <span class="badge badge-secondary shadow-sm px-2">{{ acta.tipo_acta }}</span>
                    </td>
                    <td>
                      <div class="font-weight-bold text-dark"><i class="fas fa-user-circle mr-1 text-primary"></i> {{ acta.receptor_nombre }} <small>({{ acta.receptor_dni }})</small></div>
                      <small class="text-muted d-block pl-3"><i class="fas fa-briefcase mr-1 text-warning"></i>{{ acta.receptor_cargo || 'Cargo no registrado' }}</small>
                    </td>
                    <td>
                        <i class="far fa-calendar-alt text-muted mr-1"></i>
                        <span class="font-weight-bold">{{ acta.fecha_emision | date:'dd/MM/yyyy' }}</span>
                        <small class="text-muted d-block ml-3">{{ acta.fecha_emision | date:'HH:mm:ss a' }}</small>
                    </td>
                    <td class="text-center">
                      <button class="btn btn-sm shadow-sm rounded-pill font-weight-bold px-3" [ngClass]="cv.pdfBtnClass || 'btn-outline-danger'" (click)="verPdf(acta)" title="Visualizar y Descargar Documento">
                        <i class="fas fa-file-pdf mr-1"></i> Visualizar
                      </button>
                    </td>
                  </tr>
                  <tr *ngIf="actas.length === 0">
                    <td colspan="6" class="text-center p-5">
                      <div class="p-3">
                          <i class="fas fa-folder-open fa-4x text-muted mb-3 opacity-50"></i>
                          <h4 class="text-muted">Bandeja Vacía</h4>
                          <p class="text-muted">No existen actas generadas para los movimientos actuales bajo su jurisdicción.</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div *ngIf="!loading" class="card-footer clearfix bg-white border-top">
                <div class="text-muted small">
                    Mostrando {{ actas.length }} actas en el historial
                </div>
            </div>
        </div>
      </div>
    </div>
  </div>
</app-system-layout>
  `,
  styles: [`
    .fade-in { animation: fadeIn 0.3s; }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  `]
})
export class AlmActasComponent implements OnInit {
  actas: any[] = [];
  loading = false;

  dsService = inject(DesignSystemService);

  get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('almacen');
  }

  constructor(private api: AlmacenService) { }

  ngOnInit() {
    this.api.selectedUnitId$.subscribe(() => {
        this.cargarActas();
    });
  }

  cargarActas() {
    this.loading = true;
    this.api.getActas().subscribe({
      next: (res: any) => {
        this.actas = res.data;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  async verPdf(acta: any) {
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 Size
      const { width, height } = page.getSize();

      // Membrete
      page.drawText('Notaria DISTRITAL DE POCOLLAY', { x: 190, y: height - 60, size: 12, font: fontBold });
      page.drawText('UNIDAD DE ALMACÉN CENTRAL', { x: 220, y: height - 75, size: 10, font: font });
      page.drawLine({ start: { x: 50, y: height - 90 }, end: { x: width - 50, y: height - 90 }, thickness: 1 });

      // Título
      page.drawText(`ACTA DE ENTREGA DE BIENES Nº ${acta.nro_acta}`, { x: 170, y: height - 130, size: 14, font: fontBold });

      // Información
      let yPos = height - 170;
      const marginL = 60;

      const drawInfoLine = (label: string, value: string, y: number) => {
        page.drawText(label, { x: marginL, y, size: 10, font: fontBold });
        page.drawText(value, { x: marginL + 120, y, size: 10, font: font });
      };

      const dateStr = new Date(acta.fecha_emision).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      drawInfoLine('FECHA DE EMISIÓN:', dateStr, yPos);
      yPos -= 20;
      drawInfoLine('TIPO DE ACTA:', acta.tipo_acta || 'ASIGNACIÓN DE BIENES', yPos);
      yPos -= 20;
      drawInfoLine('RECEPTOR:', `${acta.receptor_nombre} (DNI: ${acta.receptor_dni})`, yPos);
      yPos -= 20;
      drawInfoLine('CARGO:', acta.receptor_cargo || 'No especificado', yPos);
      yPos -= 40;

      // Declaración
      page.drawText('Por la presente, se hace constar la entrega oficial de los siguientes bienes pertenecientes a esta', { x: marginL, y: yPos, size: 10, font: font });
      yPos -= 15;
      page.drawText('entidad en calidad de asignación para el cumplimiento de funciones:', { x: marginL, y: yPos, size: 10, font: font });
      yPos -= 30;

      // Tabla Simple
      page.drawRectangle({ x: marginL, y: yPos - 15, width: width - (marginL * 2), height: 25, color: rgb(0.9, 0.9, 0.9), borderColor: rgb(0, 0, 0), borderWidth: 1 });
      page.drawText('CÓDIGO', { x: marginL + 10, y: yPos - 5, size: 9, font: fontBold });
      page.drawText('DESCRIPCIÓN DEL BIEN', { x: marginL + 90, y: yPos - 5, size: 9, font: fontBold });
      page.drawText('CANT', { x: marginL + 380, y: yPos - 5, size: 9, font: fontBold });
      page.drawText('UND', { x: marginL + 430, y: yPos - 5, size: 9, font: fontBold });

      yPos -= 40;
      page.drawText(acta.movimiento?.bien?.codigo || '-', { x: marginL + 10, y: yPos, size: 9, font: font });
      page.drawText(acta.movimiento?.bien?.nombre || 'Bien Desconocido', { x: marginL + 90, y: yPos, size: 9, font: font });
      page.drawText(acta.movimiento?.cantidad?.toString() || '1', { x: marginL + 380, y: yPos, size: 9, font: font });
      page.drawText(acta.movimiento?.bien?.unidad?.codigo || 'UND', { x: marginL + 430, y: yPos, size: 9, font: font });

      yPos -= 60;
      page.drawText(`OBSERVACIONES:`, { x: marginL, y: yPos, size: 9, font: fontBold });
      page.drawText(acta.movimiento?.notas || 'Sin observaciones adicionales.', { x: marginL + 90, y: yPos, size: 9, font: font });

      // Firmas
      yPos = 180;
      page.drawLine({ start: { x: 100, y: yPos }, end: { x: 250, y: yPos }, thickness: 1 });
      page.drawLine({ start: { x: width - 250, y: yPos }, end: { x: width - 100, y: yPos }, thickness: 1 });

      yPos -= 15;
      page.drawText('ENTREGUÉ CONFORME', { x: 120, y: yPos, size: 9, font: fontBold });
      page.drawText('RECIBÍ CONFORME', { x: width - 210, y: yPos, size: 9, font: fontBold });

      yPos -= 15;
      page.drawText('Responsable de Almacén', { x: 120, y: yPos, size: 8, font: font });
      page.drawText(acta.receptor_nombre, { x: width - 225, y: yPos, size: 8, font: font });

      yPos -= 15;
      page.drawText(`DNI: ${acta.receptor_dni}`, { x: width - 200, y: yPos, size: 8, font: font });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      console.error(err);
      alert('Error al generar internamente el PDF del Acta.');
    }
  }
}
