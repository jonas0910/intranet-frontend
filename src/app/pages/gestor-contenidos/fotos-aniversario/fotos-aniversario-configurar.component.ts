import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { GestorContenidosService } from '../services/gestor-contenidos.service';

interface ModalAniversarioConfig {
  modal_aniversario_activo: string;
  modal_aniversario_auto_abrir: string;
  modal_aniversario_mostrar_boton: string;
  modal_aniversario_delay: string;
  modal_aniversario_titulo: string;
  modal_aniversario_frecuencia: string;
  modal_aniversario_mostrar_texto: string;
  modal_aniversario_backdrop_opacity: string;
  modal_aniversario_intervalo: string;
  modal_aniversario_tamano: string;
  modal_aniversario_transicion: string;
}

@Component({
  selector: 'app-fotos-aniversario-configurar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './fotos-aniversario-configurar.component.html'
})
export class FotosAniversarioConfigurarComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  config: ModalAniversarioConfig = {
    modal_aniversario_activo: '1',
    modal_aniversario_auto_abrir: '1',
    modal_aniversario_mostrar_boton: '1',
    modal_aniversario_delay: '2000',
    modal_aniversario_titulo: 'Galería de Aniversario',
    modal_aniversario_frecuencia: 'siempre',
    modal_aniversario_mostrar_texto: '1',
    modal_aniversario_backdrop_opacity: '90',
    modal_aniversario_intervalo: '4000',
    modal_aniversario_tamano: '85',
    modal_aniversario_transicion: '600',
  };
  fotosActivas = 0;
  loading = false;
  saving = false;
  successMsg = '';

  constructor(private service: GestorContenidosService) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadData(): void {
    this.loading = true;
    this.service.getConfiguracionModalAniversario().pipe(takeUntil(this.destroy$)).subscribe({
      next: (res: any) => {
        if (res.data) Object.assign(this.config, res.data);
        this.fotosActivas = res.fotos_activas ?? 0;
        this.loading = false;
      },
      error: () => this.loading = false
    });
  }

  guardar(): void {
    if (this.config.modal_aniversario_auto_abrir === '1' && this.fotosActivas === 0) {
      alert('No tienes fotos activas. Agrega fotos antes de activar la apertura automática.');
      return;
    }
    this.saving = true;
    this.service.guardarConfiguracionModalAniversario(this.config).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = 'Configuración guardada exitosamente.';
        setTimeout(() => this.successMsg = '', 4000);
      },
      error: () => this.saving = false
    });
  }
}
