import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TramiteService } from '../services/documento.service';

@Component({
  selector: 'app-consulta-publica',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consulta-publica.component.html',
  styleUrl: './consulta-publica.component.scss'
})
export class ConsultaPublicaComponent {
  codigoConsulta = '';
  resultado: any = null;
  loading = false;
  error = '';

  constructor(private tramiteService: TramiteService) {}

  consultar(): void {
    if (!this.codigoConsulta || this.codigoConsulta.trim().length < 5) {
      this.error = 'Ingrese un número de expediente o código de verificación válido';
      return;
    }
    this.loading = true;
    this.resultado = null;
    this.error = '';

    this.tramiteService.consultaPublica(this.codigoConsulta.trim()).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success) {
          this.resultado = res.data;
        } else {
          this.error = 'Expediente no encontrado';
        }
      },
      error: () => {
        this.loading = false;
        this.error = 'Expediente no encontrado. Verifique el código e intente nuevamente.';
      }
    });
  }

  limpiar(): void {
    this.codigoConsulta = '';
    this.resultado = null;
    this.error = '';
  }

  getEstadoClass(estado: string): string {
    const map: any = { registrado: 'badge-secondary', en_proceso: 'badge-info', derivado: 'badge-info', observado: 'badge-warning', atendido: 'badge-success', archivado: 'badge-dark', rechazado: 'badge-danger' };
    return map[estado] || 'badge-secondary';
  }

  getEstadoLabel(estado: string): string {
    return (estado || '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }
}

