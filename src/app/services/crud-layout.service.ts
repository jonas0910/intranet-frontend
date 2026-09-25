import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

/**
 * Configuración dinámica del patrón CRUD: colores, clases, posición de elementos y características.
 * Permite cambiar la apariencia y disposición sin tocar el código del componente.
 */
export interface CrudThemeConfig {
  /** Clase del borde/outline del card (ej: card-primary, card-success, card-info) */
  cardOutlineClass: string;
  /** Clase del header del card (ej: bg-light, bg-primary, bg-transparent) */
  cardHeaderClass: string;
  /** Clase del botón "Nuevo" / Crear (ej: btn-primary, btn-success) */
  btnCreateClass: string;
  /** Clase del header del modal crear/editar (ej: bg-primary, bg-info, bg-success) */
  modalEditHeaderClass: string;
  /** Clase del header del modal ver (ej: bg-info, bg-secondary) */
  modalViewHeaderClass: string;
  /** Clase del botón guardar en el modal (ej: btn-primary, btn-success) */
  btnSaveClass: string;
  /** Clase del thead de la tabla (ej: bg-light, bg-primary, table-dark) */
  tableHeaderClass: string;
  /** Clases para los botones Ver/Editar/Eliminar en fila */
  btnViewClass: string;
  btnEditClass: string;
  btnDeleteClass: string;
}

export interface CrudLayoutConfig {
  /** Posición del bloque de acciones (botón Nueva + herramientas): 'start' | 'end' */
  actionsPosition: 'start' | 'end';
  /** Tamaño del modal crear/editar: 'modal-sm' | 'modal-lg' | 'modal-xl' */
  modalSize: string;
  /** Tema (colores y clases) */
  theme: Partial<CrudThemeConfig>;
  /** Mostrar/ocultar acciones */
  showViewButton: boolean;
  showEditButton: boolean;
  showDeleteButton: boolean;
  showExportButtons: boolean;
}

const DEFAULT_THEME: CrudThemeConfig = {
  cardOutlineClass: 'card-outline card-primary',
  cardHeaderClass: '',
  btnCreateClass: 'btn-primary',
  modalEditHeaderClass: 'bg-primary text-white',
  modalViewHeaderClass: 'bg-info text-white',
  btnSaveClass: 'btn-primary',
  tableHeaderClass: 'bg-light',
  btnViewClass: 'btn-info',
  btnEditClass: 'btn-warning',
  btnDeleteClass: 'btn-danger'
};

const DEFAULT_LAYOUT: CrudLayoutConfig = {
  actionsPosition: 'end',
  modalSize: 'modal-lg',
  theme: { ...DEFAULT_THEME },
  showViewButton: true,
  showEditButton: true,
  showDeleteButton: true,
  showExportButtons: true
};

const STORAGE_KEY = 'crud_layout_config';
const STORAGE_KEY_PREFIX = 'crud_layout_'; // crud_layout_reglas-asistencia

@Injectable({ providedIn: 'root' })
export class CrudLayoutService {
  private configByScreen = new Map<string, CrudLayoutConfig>();
  private global$ = new BehaviorSubject<CrudLayoutConfig>(DEFAULT_LAYOUT);

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Obtiene la configuración para una pantalla. Si existe config guardada para `screenKey`, la usa.
   */
  getConfig(screenKey?: string): CrudLayoutConfig {
    if (screenKey && this.configByScreen.has(screenKey)) {
      return this.mergeWithDefaults(this.configByScreen.get(screenKey)!);
    }
    return this.mergeWithDefaults(this.global$.getValue());
  }

  /**
   * Observable de la configuración global (para reaccionar a cambios).
   */
  getConfig$(screenKey?: string): Observable<CrudLayoutConfig> {
    return new Observable(sub => {
      sub.next(this.getConfig(screenKey));
      const subscription = this.global$.subscribe(() => sub.next(this.getConfig(screenKey)));
      return () => subscription.unsubscribe();
    });
  }

  /**
   * Actualiza la configuración (global o por pantalla) y persiste.
   */
  setConfig(config: Partial<CrudLayoutConfig>, screenKey?: string): void {
    const current = screenKey ? this.getConfig(screenKey) : this.global$.getValue();
    const merged = this.mergeWithDefaults({ ...current, ...config });
    if (screenKey) {
      this.configByScreen.set(screenKey, merged);
      this.saveToStorage(screenKey, merged);
    } else {
      this.global$.next(merged);
      this.saveToStorage(null, merged);
    }
  }

  /**
   * Actualiza solo el tema (colores/clases).
   */
  setTheme(theme: Partial<CrudThemeConfig>, screenKey?: string): void {
    const current = this.getConfig(screenKey);
    this.setConfig({ theme: { ...current.theme, ...theme } }, screenKey);
  }

  /**
   * Actualiza solo el layout (posición, tamaño modal, visibilidad de botones).
   */
  setLayout(layout: Partial<Pick<CrudLayoutConfig, 'actionsPosition' | 'modalSize' | 'showViewButton' | 'showEditButton' | 'showDeleteButton' | 'showExportButtons'>>, screenKey?: string): void {
    const current = this.getConfig(screenKey);
    this.setConfig({ ...layout }, screenKey);
  }

  /**
   * Restaura la configuración por defecto.
   */
  resetConfig(screenKey?: string): void {
    if (screenKey) {
      this.configByScreen.delete(screenKey);
      this.removeFromStorage(screenKey);
    } else {
      this.global$.next(DEFAULT_LAYOUT);
      this.removeFromStorage(null);
    }
  }

  /**
   * Temas predefinidos para aplicar de una vez.
   */
  getPresetThemes(): { name: string; theme: Partial<CrudThemeConfig> }[] {
    return [
      { name: 'Por defecto (Primary)', theme: DEFAULT_THEME },
      { name: 'Verde (Success)', theme: { cardOutlineClass: 'card-outline card-success', btnCreateClass: 'btn-success', modalEditHeaderClass: 'bg-success text-white', btnSaveClass: 'btn-success', btnViewClass: 'btn-success' } },
      { name: 'Azul info', theme: { cardOutlineClass: 'card-outline card-info', btnCreateClass: 'btn-info', modalEditHeaderClass: 'bg-info text-white', btnSaveClass: 'btn-info', btnViewClass: 'btn-info' } },
      { name: 'Naranja (Warning)', theme: { cardOutlineClass: 'card-outline card-warning', btnCreateClass: 'btn-warning', modalEditHeaderClass: 'bg-warning text-dark', btnSaveClass: 'btn-warning', btnViewClass: 'btn-warning' } },
      { name: 'Oscuro', theme: { cardOutlineClass: 'card-outline card-dark', cardHeaderClass: 'bg-dark text-white', btnCreateClass: 'btn-dark', modalEditHeaderClass: 'bg-dark text-white', tableHeaderClass: 'table-dark', btnSaveClass: 'btn-dark' } }
    ];
  }

  private mergeWithDefaults(partial: Partial<CrudLayoutConfig>): CrudLayoutConfig {
    const theme = { ...DEFAULT_THEME, ...partial.theme };
    return {
      actionsPosition: partial.actionsPosition ?? DEFAULT_LAYOUT.actionsPosition,
      modalSize: partial.modalSize ?? DEFAULT_LAYOUT.modalSize,
      theme,
      showViewButton: partial.showViewButton ?? DEFAULT_LAYOUT.showViewButton,
      showEditButton: partial.showEditButton ?? DEFAULT_LAYOUT.showEditButton,
      showDeleteButton: partial.showDeleteButton ?? DEFAULT_LAYOUT.showDeleteButton,
      showExportButtons: partial.showExportButtons ?? DEFAULT_LAYOUT.showExportButtons
    };
  }

  private loadFromStorage(): void {
    try {
      const global = localStorage.getItem(STORAGE_KEY);
      if (global) {
        const parsed = JSON.parse(global) as Partial<CrudLayoutConfig>;
        this.global$.next(this.mergeWithDefaults(parsed));
      }
      // Cargar por pantalla
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(STORAGE_KEY_PREFIX) && key !== STORAGE_KEY) {
          const screenKey = key.replace(STORAGE_KEY_PREFIX, '');
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as Partial<CrudLayoutConfig>;
            this.configByScreen.set(screenKey, this.mergeWithDefaults(parsed));
          }
        }
      }
    } catch (_) {}
  }

  private saveToStorage(screenKey: string | null, config: CrudLayoutConfig): void {
    try {
      if (screenKey) {
        localStorage.setItem(STORAGE_KEY_PREFIX + screenKey, JSON.stringify(config));
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      }
    } catch (_) {}
  }

  private removeFromStorage(screenKey: string | null): void {
    try {
      if (screenKey) {
        localStorage.removeItem(STORAGE_KEY_PREFIX + screenKey);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (_) {}
  }
}
