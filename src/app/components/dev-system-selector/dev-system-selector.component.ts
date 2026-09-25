import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { SystemManagementService } from '../../services/system-management.service';
import { DevSystemSelectorService, SelectedSystem } from '../../services/dev-system-selector.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-dev-system-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dev-system-selector.component.html',
  styleUrl: './dev-system-selector.component.scss'
})
export class DevSystemSelectorComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  sistemas: any[] = [];
  sistemaSeleccionado: SelectedSystem | null = null;
  isLoading = false;
  isVisible = false;

  constructor(
    private systemManagementService: SystemManagementService,
    private devSystemSelector: DevSystemSelectorService
  ) {}

  ngOnInit(): void {
    // Solo mostrar si el modo desarrollo está habilitado
    this.isVisible = this.devSystemSelector.isDevelopmentModeEnabled();
    
    console.log('🔧 DevSystemSelector: Inicializando...', {
      isVisible: this.isVisible,
      isDevelopmentModeEnabled: this.devSystemSelector.isDevelopmentModeEnabled(),
      environment: environment.development
    });
    
    if (!this.isVisible) {
      console.warn('⚠️ DevSystemSelector: Modo desarrollo no habilitado, componente oculto');
      return;
    }

    console.log('✅ DevSystemSelector: Componente visible, cargando sistemas...');

    // Suscribirse a cambios en el sistema seleccionado
    this.devSystemSelector.selectedSystem$
      .pipe(takeUntil(this.destroy$))
      .subscribe(system => {
        this.sistemaSeleccionado = system;
        console.log('🔄 DevSystemSelector: Sistema seleccionado actualizado:', system);
      });

    // Cargar sistemas disponibles
    this.loadSistemas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadSistemas(): void {
    this.isLoading = true;
    console.log('🔄 DevSystemSelector: Cargando sistemas disponibles...');
    
    this.systemManagementService.getIntegratedSystems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && response.data) {
            this.sistemas = response.data;
            console.log('✅ DevSystemSelector: Sistemas cargados:', this.sistemas.length, this.sistemas);
          } else {
            console.warn('⚠️ DevSystemSelector: No se recibieron sistemas válidos:', response);
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ DevSystemSelector: Error cargando sistemas:', error);
          this.isLoading = false;
        }
      });
  }

  onSystemChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const systemId = parseInt(selectElement.value, 10);

    if (isNaN(systemId)) {
      // "Todos los sistemas" seleccionado
      this.devSystemSelector.clearSelection();
      return;
    }

    const sistema = this.sistemas.find(s => s.id === systemId);
    if (sistema) {
      this.devSystemSelector.selectSystem({
        id: sistema.id,
        nombre: sistema.nombre,
        codigo: sistema.codigo,
        descripcion: sistema.descripcion
      });
    }
  }

  getSelectedSystemId(): string {
    return this.sistemaSeleccionado ? this.sistemaSeleccionado.id.toString() : '';
  }

  clearSelection(): void {
    this.devSystemSelector.clearSelection();
  }
}
