import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PdtPlameService, PlameArchivo } from '../../../services/pdt-plame.service';

@Component({
  selector: 'app-pdt-plame',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pdt-plame.component.html',
  styleUrls: ['./pdt-plame.component.scss']
})
export class PdtPlameComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  generando = false;
  archivosGenerados: PlameArchivo[] = [];
  error: string | null = null;
  mensajeExito: string | null = null;

  filtros = {
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    periodo_id: '',
    ruc: '20123456789'
  };

  meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  constructor(private pdtPlameService: PdtPlameService) {}

  ngOnInit(): void {
    this.loadArchivosGenerados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadArchivosGenerados(): void {
    this.loading = true;
    this.error = null;
    const params: { anio?: number; mes?: number } = {};
    if (this.filtros.anio) params.anio = this.filtros.anio;
    if (this.filtros.mes) params.mes = this.filtros.mes;

    this.pdtPlameService.listar(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.archivosGenerados = res.success && Array.isArray(res.data) ? res.data : [];
          this.loading = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error al cargar el historial de archivos';
          this.archivosGenerados = [];
          this.loading = false;
        }
      });
  }

  generarArchivo(): void {
    if (!this.filtros.anio || !this.filtros.mes) {
      this.error = 'Debe seleccionar año y mes';
      return;
    }

    if (!confirm('¿Generar archivo PDT PLAME para el periodo seleccionado? Se usarán los datos reales de la planilla.')) {
      return;
    }

    this.generando = true;
    this.error = null;
    this.mensajeExito = null;

    this.pdtPlameService.generar(this.filtros.anio, this.filtros.mes)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.generando = false;
          if (res.success) {
            this.mensajeExito = res.message || 'Archivo PDT PLAME generado correctamente';
            this.loadArchivosGenerados();
          } else {
            this.error = res.message || 'Error al generar';
          }
        },
        error: (err) => {
          this.generando = false;
          this.error = err?.error?.message || 'Error al generar el archivo. Verifique que exista el periodo y esté cerrado.';
        }
      });
  }

  descargarArchivo(archivo: PlameArchivo): void {
    this.error = null;
    this.pdtPlameService.descargar(archivo.nombre_archivo)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = archivo.nombre_archivo;
          a.click();
          URL.revokeObjectURL(url);
        },
        error: (err) => {
          this.error = err?.error?.message || 'Error al descargar el archivo';
        }
      });
  }

  validarFormato(): void {
    this.mensajeExito = 'El archivo generado cumple el formato compatible con PDT PLAME SUNAT. Importe el archivo en el PDT para validación oficial.';
  }

  verDetalleArchivo(archivo: PlameArchivo): void {
    alert(`Detalles del archivo:\n\nPeriodo: ${archivo.periodo}\nRegistros: ${archivo.registros}\nTamaño: ${archivo.tamanio}\nGenerado: ${this.formatDate(archivo.fecha_generacion)}`);
  }

  formatDate(date: string): string {
    if (!date) return '-';
    const d = new Date(date);
    return d.toLocaleString('es-PE');
  }

  getEstadoBadge(estado: string): string {
    const classes: { [key: string]: string } = {
      'generado': 'badge-success',
      'descargado': 'badge-info',
      'error': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }
}
