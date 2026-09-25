import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-afp-net',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './afp-net.component.html',
  styleUrls: ['./afp-net.component.scss']
})
export class AfpNetComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  loading = false;
  generando = false;
  archivosGenerados: any[] = [];
  
  filtros = {
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    afp_id: '',
    periodo_id: ''
  };

  meses = [
    { value: 1, label: 'Enero' }, { value: 2, label: 'Febrero' }, { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' }, { value: 5, label: 'Mayo' }, { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' }, { value: 8, label: 'Agosto' }, { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' }, { value: 11, label: 'Noviembre' }, { value: 12, label: 'Diciembre' }
  ];

  afps = [
    { id: 1, nombre: 'AFP Integra', codigo: '01' },
    { id: 2, nombre: 'AFP Prima', codigo: '02' },
    { id: 3, nombre: 'AFP Profuturo', codigo: '03' },
    { id: 4, nombre: 'AFP Habitat', codigo: '04' }
  ];

  constructor() {}

  ngOnInit(): void {
    this.loadArchivosGenerados();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadArchivosGenerados(): void {
    this.loading = true;
    
    // Simulación de archivos generados
    setTimeout(() => {
      this.archivosGenerados = [
        {
          id: 1,
          periodo: '01/2025',
          afp: 'AFP Integra',
          nombre_archivo: 'AFPNET_INTEGRA_202501.txt',
          fecha_generacion: '2025-01-26T11:00:00',
          tamanio: '18 KB',
          afiliados: 45,
          total_aporte: 15750.00,
          estado: 'generado'
        },
        {
          id: 2,
          periodo: '01/2025',
          afp: 'AFP Prima',
          nombre_archivo: 'AFPNET_PRIMA_202501.txt',
          fecha_generacion: '2025-01-26T11:05:00',
          tamanio: '12 KB',
          afiliados: 30,
          total_aporte: 10500.00,
          estado: 'enviado'
        },
        {
          id: 3,
          periodo: '12/2024',
          afp: 'AFP Integra',
          nombre_archivo: 'AFPNET_INTEGRA_202412.txt',
          fecha_generacion: '2024-12-28T16:00:00',
          tamanio: '17 KB',
          afiliados: 43,
          total_aporte: 14900.00,
          estado: 'descargado'
        }
      ];
      this.loading = false;
    }, 500);
  }

  generarArchivo(): void {
    if (!this.filtros.anio || !this.filtros.mes) {
      alert('Debe seleccionar año y mes');
      return;
    }

    if (!this.filtros.afp_id) {
      if (confirm('No seleccionó una AFP específica. ¿Generar archivos para todas las AFPs?')) {
        this.generarTodos();
      }
      return;
    }

    if (confirm('¿Generar archivo AFP NET para el periodo seleccionado?')) {
      this.generando = true;
      
      // Simulación de generación
      setTimeout(() => {
        alert('✅ Archivo AFP NET generado exitosamente');
        this.generando = false;
        this.loadArchivosGenerados();
      }, 2000);
    }
  }

  generarTodos(): void {
    this.generando = true;
    
    // Simulación de generación múltiple
    setTimeout(() => {
      alert(`✅ Archivos generados para ${this.afps.length} AFPs`);
      this.generando = false;
      this.loadArchivosGenerados();
    }, 3000);
  }

  descargarArchivo(archivo: any): void {
    alert(`Descargando archivo: ${archivo.nombre_archivo}`);
    archivo.estado = 'descargado';
  }

  enviarAfp(archivo: any): void {
    if (confirm(`¿Enviar archivo a ${archivo.afp}?`)) {
      alert('Archivo enviado a la AFP exitosamente');
      archivo.estado = 'enviado';
    }
  }

  verDetalleArchivo(archivo: any): void {
    alert(`Detalles del archivo:\n\nPeriodo: ${archivo.periodo}\nAFP: ${archivo.afp}\nAfiliados: ${archivo.afiliados}\nTotal Aporte: S/ ${archivo.total_aporte.toFixed(2)}`);
  }

  formatCurrency(value: number): string {
    return 'S/ ' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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
      'enviado': 'badge-primary',
      'error': 'badge-danger'
    };
    return classes[estado] || 'badge-secondary';
  }
}

