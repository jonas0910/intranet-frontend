import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { TramiteService } from '../services/documento.service';

@Component({
  selector: 'app-registro-documento',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './registro-documento.component.html',
  styleUrl: './registro-documento.component.scss'
})
export class RegistroDocumentoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  tipoRegistro: 'mesa_partes' | 'interno' = 'mesa_partes';
  areas: any[] = [];
  tipos: any[] = [];
  areaUsuario: number = 0;
  loading = false;
  submitted = false;
  resultado: any = null;
  previewNumero = '';

  form: any = {
    tipo_registro: 'mesa_partes',
    tipo_tramite_id: '',
    asunto: '',
    descripcion: '',
    folios: 1,
    prioridad: 'normal',
    tipo_documento: 'DNI',
    numero_documento: '',
    nombres: '',
    apellidos: '',
    email: '',
    razon_social: '',
    ruc: '',
    telefono: '',
    celular: '',
    direccion: '',
    referencia: '',
    tipo_documento_generado: '',
    area_destino_id: '',
    origen: 'ventanilla'
  };

  tiposDocIdentidad = ['DNI', 'CE', 'RUC', 'PASAPORTE', 'OTRO'];
  tiposDocGenerado = ['MEMO', 'OFICIO', 'INFORME', 'CARTA', 'RESOLUCION', 'PROVEIDO', 'SOLICITUD', 'CONSTANCIA'];

  constructor(private tramiteService: TramiteService, private router: Router) {}

  ngOnInit(): void {
    this.tramiteService.getCatalogos().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.areas = res.data.areas || [];
          this.tipos = res.data.tipos || [];
          if (this.areas.length > 0) this.areaUsuario = this.areas[0].id;
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cambiarTipoRegistro(tipo: 'mesa_partes' | 'interno'): void {
    this.tipoRegistro = tipo;
    this.form.tipo_registro = tipo === 'interno' ? 'interno' : 'mesa_partes';
    this.form.origen = tipo === 'interno' ? 'interno' : 'ventanilla';
    this.previewNumero = '';
  }

  actualizarPreviewNumero(): void {
    if (!this.form.tipo_documento_generado || !this.areaUsuario) {
      this.previewNumero = '';
      return;
    }
    this.tramiteService.previewNumero(this.areaUsuario, this.form.tipo_documento_generado)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => { if (res.success) this.previewNumero = res.data.numero || ''; },
        error: () => this.previewNumero = ''
      });
  }

  guardar(): void {
    this.submitted = true;
    if (!this.form.asunto) return;
    this.loading = true;
    const payload = { ...this.form, area_usuario_id: this.areaUsuario };
    this.tramiteService.crear(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.resultado = res.data;
        }
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  nuevoRegistro(): void {
    this.resultado = null;
    this.submitted = false;
    this.form = {
      tipo_registro: this.tipoRegistro === 'interno' ? 'interno' : 'mesa_partes',
      tipo_tramite_id: '', asunto: '', descripcion: '', folios: 1, prioridad: 'normal',
      tipo_documento: 'DNI', numero_documento: '', nombres: '', apellidos: '', email: '',
      razon_social: '', ruc: '', telefono: '', celular: '', direccion: '', referencia: '',
      tipo_documento_generado: '', area_destino_id: '', origen: this.tipoRegistro === 'interno' ? 'interno' : 'ventanilla'
    };
    this.previewNumero = '';
  }
}
