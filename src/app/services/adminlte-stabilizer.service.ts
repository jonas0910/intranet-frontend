import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AdminLTEStabilizerService {
  private isInitialized = false;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;
  private lastRestabilization = 0;
  private restabilizationThrottle = 1000; // 1 segundo
  
  // Estado de estabilización
  private stabilizationState$ = new BehaviorSubject<{
    isStable: boolean;
    isInitializing: boolean;
    hasErrors: boolean;
    lastError?: string;
  }>({
    isStable: false,
    isInitializing: false,
    hasErrors: false
  });

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    if (isPlatformBrowser(this.platformId)) {
      this.setupGlobalStabilization();
    }
  }

  /**
   * Obtiene el estado de estabilización
   */
  getStabilizationState(): Observable<any> {
    return this.stabilizationState$.asObservable();
  }

  /**
   * Verifica si AdminLTE está estable
   */
  isStable(): boolean {
    return this.stabilizationState$.value.isStable;
  }

  /**
   * Inicialización estable de AdminLTE con prevención de múltiples inicializaciones
   */
  async initializeStable(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    
    // Si ya está inicializado, no hacer nada
    if (this.isInitialized) {
      return;
    }

    // Si está en proceso de inicialización, esperar a que termine
    if (this.isInitializing && this.initializationPromise) {
      return this.initializationPromise;
    }

    // Marcar como inicializando
    this.isInitializing = true;
    this.updateStabilizationState(true, false, false);

    // Crear promesa de inicialización
    this.initializationPromise = this.performStableInitialization();
    
    try {
      await this.initializationPromise;
      this.isInitialized = true;
      this.isInitializing = false;
      this.updateStabilizationState(false, true, false);
      console.log('✅ AdminLTE inicializado de forma estable');
    } catch (error) {
      this.isInitializing = false;
      this.updateStabilizationState(false, false, true, error instanceof Error ? error.message : 'Error desconocido');
      console.error('❌ Error en inicialización estable de AdminLTE:', error);
      
      // En lugar de lanzar el error, intentar modo básico como fallback
      console.log('🔄 Intentando modo básico como último recurso...');
      try {
        await this.performBasicInitialization();
        this.isInitialized = true;
        this.updateStabilizationState(false, true, false, 'Modo básico como fallback');
        console.log('✅ AdminLTE inicializado en modo básico');
      } catch (basicError) {
        console.error('❌ Error incluso en modo básico:', basicError);
        // Solo lanzar error si incluso el modo básico falla
        throw error;
      }
    }
  }

  /**
   * Realiza la inicialización estable paso a paso
   */
  private async performStableInitialization(): Promise<void> {
    console.log('🚀 Iniciando inicialización estable de AdminLTE...');

    // Timeout de seguridad MUY REDUCIDO para desarrollo
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        console.warn('⚠️ Timeout en inicialización de AdminLTE - continuando de forma degradada');
        reject(new Error('Timeout en inicialización de AdminLTE'));
      }, 500); // 500ms - casi inmediato para desarrollo
    });

    const initializationPromise = this.performInitializationSteps();

    try {
      await Promise.race([initializationPromise, timeoutPromise]);
      console.log('✅ Inicialización estable completada');
    } catch (error) {
      console.error('❌ Error en inicialización:', error);
      // En lugar de lanzar el error, intentar una inicialización básica
      await this.performBasicInitialization();
      console.log('✅ Inicialización básica completada como fallback');
    }
  }

  /**
   * Realiza los pasos de inicialización (MODO RÁPIDO PARA DESARROLLO)
   */
  private async performInitializationSteps(): Promise<void> {
    try {
      console.log('🚀 Inicialización RÁPIDA de AdminLTE - solo clases básicas');
      
      const body = document.body;
      // Limpiar estado previo (p. ej. login-page) para que .content-wrapper y section.content tengan el tamaño correcto
      body.className = '';
      body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-navbar-fixed', 'layout-footer-fixed');
      body.classList.remove('sidebar-collapse');
      
      console.log('✅ Inicialización rápida completada');
    } catch (error) {
      console.warn('⚠️ Error en inicialización rápida:', error);
    }
  }

  /**
   * Inicialización básica como fallback
   */
  private async performBasicInitialization(): Promise<void> {
    return new Promise((resolve) => {
      try {
        console.log('🔄 Ejecutando inicialización básica como fallback...');
        
        const body = document.body;
        body.className = 'hold-transition sidebar-mini layout-fixed layout-navbar-fixed layout-footer-fixed';
        body.classList.remove('sidebar-collapse');
        
        setTimeout(() => {
          console.log('✅ Inicialización básica completada');
          resolve();
        }, 100);
        
      } catch (error) {
        console.error('❌ Error en inicialización básica:', error);
        resolve(); // Resolver incluso con error
      }
    });
  }

  /**
   * Verifica si la inicialización está deshabilitada
   */
  private isInitializationDisabled(): boolean {
    try {
      // Verificar parámetros de URL
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('disable-adminlte') === 'true') {
          return true;
        }
      }
      
      // Verificar localStorage
      if (typeof localStorage !== 'undefined') {
        const disabled = localStorage.getItem('adminlte-disabled');
        if (disabled === 'true') {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.warn('⚠️ Error verificando si AdminLTE está deshabilitado:', error);
      return false;
    }
  }

  /**
   * Prepara el DOM para AdminLTE
   */
  private async prepareDOM(): Promise<void> {
    return new Promise((resolve) => {
      // Asegurar que el DOM esté listo
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => resolve());
      } else {
        setTimeout(() => resolve(), 50);
      }
    });
  }

  /**
   * Aplica clases de AdminLTE de forma estable
   */
  private async applyStableClasses(): Promise<void> {
    return new Promise((resolve) => {
      const body = document.body;
      
      // Limpiar clases existentes de forma gradual
      const classesToRemove = [
        'login-page',
        'register-page',
        'hold-transition'
      ];
      
      classesToRemove.forEach(className => {
        body.classList.remove(className);
      });

      // Aplicar clases base de forma estable
      const baseClasses = [
        'hold-transition',
        'sidebar-mini',
        'layout-fixed',
        'layout-navbar-fixed',
        'layout-footer-fixed',
        'text-sm'
      ];

      // Aplicar clases una por una con delay mínimo
      let index = 0;
      const applyNextClass = () => {
        if (index < baseClasses.length) {
          body.classList.add(baseClasses[index]);
          index++;
          setTimeout(applyNextClass, 10); // Delay mínimo entre clases
        } else {
          resolve();
        }
      };
      
      applyNextClass();
    });
  }

  /**
   * Inicializa componentes básicos
   */
  private async initializeBasicComponents(): Promise<void> {
    return new Promise((resolve) => {
      // Verificar que jQuery esté disponible
      if (typeof window === 'undefined' || !(window as any).$) {
        console.warn('⚠️ jQuery no disponible, saltando inicialización de componentes');
        resolve();
        return;
      }

      const $ = (window as any).$;
      
      try {
        // Inicializar componentes básicos con manejo de errores
        if ($.fn.PushMenu) {
          $('[data-widget="pushmenu"]').PushMenu();
        }
        
        resolve();
      } catch (error) {
        console.error('❌ Error inicializando componentes básicos:', error);
        resolve(); // Continuar aunque haya error
      }
    });
  }

  /**
   * Configura widgets de forma estable
   * NOTA: Treeview desactivado - se usa control Angular nativo con accordion
   */
  private async configureWidgets(): Promise<void> {
    return new Promise((resolve) => {
      console.log('⚠️ Treeview de AdminLTE DESACTIVADO - usando control Angular nativo con accordion');
      
      try {
        if (typeof window === 'undefined' || !(window as any).$) {
          resolve();
          return;
        }

        const $ = (window as any).$;
        
        // DESACTIVAR Treeview de AdminLTE para no interferir con el accordion de Angular
        setTimeout(() => {
          try {
            if ($.fn && $.fn.Treeview) {
              const treeviewElements = $('[data-widget="treeview"]');
              if (treeviewElements.length > 0) {
                // Limpiar cualquier inicialización previa de AdminLTE Treeview
                treeviewElements.off('.lte.treeview');
                console.log('✅ Treeview de AdminLTE desactivado - menús controlados por Angular');
              }
            }
          } catch (error) {
            console.warn('⚠️ Error desactivando Treeview:', error);
          } finally {
            resolve();
          }
        }, 100);
        
      } catch (error) {
        console.error('❌ Error configurando widgets:', error);
        resolve();
      }
    });
  }

  /**
   * Estabiliza el layout final
   */
  private async stabilizeLayout(): Promise<void> {
    return new Promise((resolve) => {
      try {
        // Forzar recálculo de layout con timeout más corto
        const layoutTimeout = setTimeout(() => {
          try {
            // Asegurar que el sidebar esté en estado correcto
            const sidebar = document.querySelector('.main-sidebar');
            if (sidebar) {
              sidebar.classList.add('sidebar-mini');
            }

            // Estabilizar contenido principal
            const contentWrapper = document.querySelector('.content-wrapper') as HTMLElement;
            if (contentWrapper) {
              contentWrapper.style.transition = 'margin-left 0.3s ease-in-out';
            }

            console.log('✅ Layout estabilizado');
          } catch (error) {
            console.warn('⚠️ Error estabilizando layout:', error);
          } finally {
            resolve();
          }
        }, 50); // Timeout más corto

        // Fallback de seguridad
        setTimeout(() => {
          clearTimeout(layoutTimeout);
          resolve();
        }, 200);

      } catch (error) {
        console.warn('⚠️ Error en stabilizeLayout:', error);
        resolve();
      }
    });
  }

  /**
   * Configuración global de estabilización
   */
  private setupGlobalStabilization(): void {
    // Prevenir múltiples inicializaciones globales
    if ((window as any).adminLTEInitialized) {
      console.log('⚠️ AdminLTE ya fue inicializado globalmente');
      return;
    }

    // Marcar como inicializado globalmente
    (window as any).adminLTEInitialized = true;

    // Configurar observador de cambios en el DOM
    this.setupDOMObserver();
  }

  /**
   * Configura observador de cambios en el DOM para detectar layout shifts
   * DESHABILITADO para evitar reinicializaciones constantes
   */
  private setupDOMObserver(): void {
    // DESHABILITADO: El MutationObserver estaba causando reinicializaciones constantes
    // AdminLTE se mantiene estable sin necesidad de observación continua
    console.log('🔇 MutationObserver deshabilitado para evitar reinicializaciones');
  }

  /**
   * Reestabiliza AdminLTE después de cambios
   */
  private async restabilize(): Promise<void> {
    if (!this.isInitialized) return;

    try {
      // Reaplicar clases críticas para menú expandido
      const body = document.body;
      
      // Asegurar sidebar-mini pero sin colapso
      if (!body.classList.contains('sidebar-mini')) {
        body.classList.add('sidebar-mini');
      }
      body.classList.remove('sidebar-collapse');
      
      // Asegurar que el sidebar esté expandido
      const sidebar = document.querySelector('.main-sidebar');
      if (sidebar) {
        sidebar.classList.remove('sidebar-collapse');
      }

      // NO reconfigurar Treeview para evitar conflictos
      // El Treeview ya está inicializado y funcionando
    } catch (error) {
      console.error('❌ Error reestabilizando AdminLTE:', error);
    }
  }

  /**
   * Actualiza el estado de estabilización
   */
  private updateStabilizationState(isInitializing: boolean, isStable: boolean, hasErrors: boolean, error?: string): void {
    this.stabilizationState$.next({
      isInitializing,
      isStable,
      hasErrors,
      lastError: error
    });
  }

  /**
   * Reinicializa AdminLTE de forma segura
   */
  async reinitialize(): Promise<void> {
      // Reinicializando AdminLTE de forma segura...
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    await this.initializeStable();
  }

  /**
   * Limpia el estado de inicialización
   */
  cleanup(): void {
    this.isInitialized = false;
    this.isInitializing = false;
    this.initializationPromise = null;
    this.updateStabilizationState(false, false, false);
    console.log('🧹 Estado de AdminLTE limpiado');
  }

  /**
   * Inicialización específica para dependencias locales
   * SIMPLIFICADO para evitar reinicializaciones innecesarias
   */
  private async initializeForLocalDependencies(): Promise<void> {
    // SIMPLIFICADO: Solo aplicar clases básicas sin reinicializar widgets
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Solo aplicar clases de AdminLTE para menú expandido
      const body = document.body;
      
      // Asegurar sidebar-mini pero sin colapso
      if (!body.classList.contains('sidebar-mini')) {
        body.classList.add('sidebar-mini');
      }
      
      // Remover clases de colapso si existen
      body.classList.remove('sidebar-collapse');
      
      // Asegurar que el sidebar esté expandido
      const sidebar = document.querySelector('.main-sidebar');
      if (sidebar) {
        sidebar.classList.remove('sidebar-collapse');
      }
      
      console.log('✅ Clases de AdminLTE aplicadas sin reinicialización');
    } catch (error) {
      console.error('❌ Error aplicando clases de AdminLTE:', error);
    }
  }
}
