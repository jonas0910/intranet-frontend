import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SelectedSystem {
  id: number;
  nombre: string;
  codigo: string;
  descripcion?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DevSystemSelectorService {
  private readonly STORAGE_KEY = 'dev_selected_system';
  private selectedSystemSubject = new BehaviorSubject<SelectedSystem | null>(null);
  public selectedSystem$: Observable<SelectedSystem | null> = this.selectedSystemSubject.asObservable();

  constructor() {
    // Cargar sistema seleccionado desde localStorage al iniciar
    this.loadSelectedSystem();
  }

  /**
   * Verifica si el modo desarrollo está habilitado
   */
  isDevelopmentModeEnabled(): boolean {
    return environment.development.enabled && !environment.production;
  }

  /**
   * Verifica si el modo de sistema único está activo
   */
  isSingleSystemMode(): boolean {
    return environment.development.singleSystemMode && this.isDevelopmentModeEnabled();
  }

  /**
   * Obtiene el sistema seleccionado actualmente
   */
  getSelectedSystem(): SelectedSystem | null {
    return this.selectedSystemSubject.value;
  }

  /**
   * Selecciona un sistema para desarrollo
   */
  selectSystem(system: SelectedSystem): void {
    if (!this.isDevelopmentModeEnabled()) {
      console.warn('⚠️ Modo desarrollo no está habilitado');
      return;
    }

    // Guardar en localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(system));
    
    // Actualizar el subject
    this.selectedSystemSubject.next(system);
    
    console.log('✅ Sistema seleccionado para desarrollo:', system);
  }

  /**
   * Deselecciona el sistema (carga todos los sistemas)
   */
  clearSelection(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.selectedSystemSubject.next(null);
    console.log('🔄 Selección de sistema limpiada - cargando todos los sistemas');
  }

  /**
   * Carga el sistema seleccionado desde localStorage
   */
  private loadSelectedSystem(): void {
    if (!this.isDevelopmentModeEnabled()) {
      return;
    }

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const system = JSON.parse(stored) as SelectedSystem;
        this.selectedSystemSubject.next(system);
        console.log('📦 Sistema seleccionado cargado desde localStorage:', system);
      }
    } catch (error) {
      console.error('❌ Error cargando sistema seleccionado:', error);
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  /**
   * Verifica si hay un sistema seleccionado
   */
  hasSelectedSystem(): boolean {
    return this.selectedSystemSubject.value !== null;
  }

  /**
   * Obtiene el ID del sistema seleccionado
   */
  getSelectedSystemId(): number | null {
    const system = this.selectedSystemSubject.value;
    return system ? system.id : null;
  }
}
