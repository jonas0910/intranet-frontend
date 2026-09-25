import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ActivoService } from '../services/activo.service';
import { DesignSystemService, CrudViewConfig } from '../../../services/design-system.service';
import { ToastService } from '../../../services/toast.service';
import { CrudExportService, CrudExportColumn } from '../../../services/crud-export.service';
import { CrudListExportBase } from '../../../shared/base/crud-list-export.base';
import { SystemLayoutComponent } from '../../../shared/components/system-layout/system-layout.component';

declare var $: any;

@Component({
  selector: 'app-depreciacion',
  standalone: true,
  imports: [CommonModule, FormsModule, SystemLayoutComponent],
  templateUrl: './depreciacion.component.html',
  styleUrls: ['./depreciacion.component.scss']
})
export class DepreciacionComponent extends CrudListExportBase implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  periodoAno = new Date().getFullYear();
  periodoMes = new Date().getMonth() + 1;
  meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  calculando = false;
  resultado: any = null;
  historial: any[] = [];

  constructor(
    private activoService: ActivoService,
    private toast: ToastService,
    crudExport: CrudExportService
  ) {
    super(crudExport);
  }

  /** Configuración CRUD del subsistema activos-fijos (tema verde) */
  override get cv(): CrudViewConfig {
    return this.dsService.getCrudViewFor('activos-fijos');
  }

  ngOnInit(): void {
    this.dsService.setActiveSubsystem('activos-fijos');
    this.loadHistorial();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.initSelect2Form(), 300);
  }

  /** Inicializa Select2 del patrón de diseño en combos del formulario (sin modal). */
  initSelect2Form(): void {
    const $selects = $('.ds-select2');
    if ($selects.length === 0) return;
    try {
      $selects.each((_index: number, el: HTMLElement) => {
        if ($(el).data('select2')) $(el).select2('destroy');
      });
    } catch (e) { /* ignore */ }
    const opts = this.dsService.getSelect2Options({ allowClear: false, minimumResultsForSearch: 0 });
    $selects.select2(opts).on('change', (e: any) => {
      const name = $(e.target).attr('name');
      const val = $(e.target).val();
      if (name === 'periodoMes') this.periodoMes = Number(val);
    });
    const sizeClass = this.dsService.getSelect2InputSizeClass('activos-fijos');
    setTimeout(() => {
      $selects.each((_index: number, el: HTMLElement) => {
        $(el).next('.select2-container').find('.select2-selection').addClass(sizeClass);
      });
    }, 0);
  }

  getExportData(): Record<string, unknown>[] {
    return this.historial.map(item => ({
      periodo: this.meses[item.periodo_mes - 1] + ' ' + item.periodo_ano,
      total_procesados: item.total_procesados || 0,
      depreciacion_mensual: this.formatCurrency(item.depreciacion_mensual),
      depreciacion_acumulada: this.formatCurrency(item.depreciacion_acumulada),
      fecha: this.formatDate(item.created_at),
      usuario: item.usuario?.name || '-'
    }));
  }

  getExportColumns(): CrudExportColumn[] {
    return [
      { key: 'periodo', label: 'Período' },
      { key: 'total_procesados', label: 'Activos Procesados' },
      { key: 'depreciacion_mensual', label: 'Depreciación Mensual' },
      { key: 'depreciacion_acumulada', label: 'Depreciación Acumulada' },
      { key: 'fecha', label: 'Fecha Cálculo' },
      { key: 'usuario', label: 'Usuario' }
    ];
  }

  getExportTitle(): string { return 'Historial de Depreciación de Activos'; }
  getExportFilename(): string { return 'depreciacion-activos'; }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  calcularDepreciacion(): void {
    this.calculando = true;
    this.resultado = null;

    this.activoService.calcularDepreciacion(this.periodoAno, this.periodoMes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            this.resultado = response.data;
            this.loadHistorial();
            this.toast.success('Depreciación calculada exitosamente', 'Éxito');
          }
          this.calculando = false;
        },
        error: () => {
          this.toast.error('Error al calcular depreciación', 'Error');
          this.calculando = false;
        }
      });
  }

  loadHistorial(): void {
    this.activoService.listarDepreciaciones({ per_page: 50 })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response && response.success && response.data) {
            this.historial = response.data.data || [];
          }
        },
        error: (error: any) => console.error('Error loading historial:', error)
      });
  }

  formatDate(date: string | null | undefined): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-PE');
  }

  formatCurrency(value: number | null | undefined): string {
    if (!value) return 'S/ 0.00';
    return 'S/ ' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  }
}

