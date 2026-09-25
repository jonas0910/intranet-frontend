import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

declare var $: any;

/**
 * Servicio encargado de la inicialización y gestión de AdminLTE 3.2.0
 * Maneja: widgets jQuery, dropdowns del navbar, sidebar, tooltips/popovers
 */
@Injectable({ providedIn: 'root' })
export class AdminLTEInitService {

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Inicialización completa de AdminLTE (clases, widgets, dropdowns y menús)
   */
  initializeComplete(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    this.applyBodyClasses();

    setTimeout(() => {
      this.closeAllDropdowns();
      this.initializeDropdowns();
    }, 500);
  }

  /**
   * Aplica las clases CSS del body para AdminLTE 3.2.0
   */
  applyBodyClasses(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    const body = document.body;
    body.className = 'hold-transition';
    ['sidebar-mini', 'layout-fixed', 'layout-navbar-fixed', 'layout-footer-fixed', 'text-sm']
      .forEach(cls => body.classList.add(cls));

    setTimeout(() => this.initializeWidgets(), 200);
  }

  /**
   * Aplica las clases de layout estándar para la navegación (sin text-sm)
   */
  applyNavigationClasses(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const body = document.body;
    body.className = '';
    body.classList.add('hold-transition', 'sidebar-mini', 'layout-fixed', 'layout-navbar-fixed', 'layout-footer-fixed');
    body.classList.remove('sidebar-collapse');
  }

  /**
   * Aplica las clases del login (limpieza)
   */
  applyLoginClasses(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.className = 'hold-transition login-page';
  }

  /**
   * Inicializa los widgets jQuery de AdminLTE
   */
  private initializeWidgets(): void {
    if (typeof window === 'undefined' || !(window as any).$) {
      setTimeout(() => this.initializeWidgets(), 500);
      return;
    }

    const $ = (window as any).$;

    try {
      // Desactivar Treeview nativo — Angular usa ngbCollapse
      if ($.fn.Treeview) {
        $('[data-widget="treeview"]').off('.lte.treeview');
        $('.nav-treeview').removeClass('menu-open').css('display', '');
        $('.has-treeview').removeClass('menu-open menu-is-opening');
      }

      if ($.fn.SidebarSearch) $('[data-widget="sidebar-search"]').SidebarSearch();
      if ($.fn.NavbarSearch)  $('[data-widget="navbar-search"]').NavbarSearch();
      if ($.fn.Fullscreen)    $('[data-widget="fullscreen"]').Fullscreen();
      if ($.fn.ControlSidebar) $('[data-widget="control-sidebar"]').ControlSidebar();

      // Widget event bindings
      ['user-menu', 'notifications', 'messages'].forEach(widget => {
        $(`[data-widget="${widget}"]`).on('show.bs.dropdown', function(this: any) {
          $(this).addClass('show');
        });
      });

      if ($.fn.tooltip) $('[data-toggle="tooltip"]').tooltip();
      if ($.fn.popover) $('[data-toggle="popover"]').popover();

    } catch (error) {
      console.warn('Error inicializando AdminLTE widgets:', error);
    }
  }

  /**
   * Inicializa los dropdowns manuales del navbar
   */
  initializeDropdowns(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      this.closeAllDropdowns();

      const dropdownToggles = document.querySelectorAll('[data-toggle="dropdown"]');

      dropdownToggles.forEach((toggle) => {
        const newToggle = toggle.cloneNode(true) as Element;
        toggle.parentNode?.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();

          const dropdownMenu = newToggle.nextElementSibling;
          if (dropdownMenu?.classList.contains('dropdown-menu')) {
            const isOpen = dropdownMenu.classList.contains('show');
            this.closeAllDropdowns();

            if (!isOpen) {
              dropdownMenu.classList.add('show');
              newToggle.classList.add('show');
              newToggle.setAttribute('aria-expanded', 'true');
            }
          }
        });
      });

      document.addEventListener('click', (event) => {
        const target = event.target as Element;
        if (!target.closest('.dropdown')) this.closeAllDropdowns();
      });

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') this.closeAllDropdowns();
      });
    }, 100);
  }

  /**
   * Inicializa los dropdowns del navbar con manejo de apertura/cierre
   */
  initializeNavbarDropdowns(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    setTimeout(() => {
      const navbarDropdowns = document.querySelectorAll('.navbar-nav .nav-item.dropdown');

      navbarDropdowns.forEach((dropdownItem) => {
        const toggle = dropdownItem.querySelector('[data-toggle="dropdown"]') as HTMLElement;
        const menu = dropdownItem.querySelector('.dropdown-menu') as HTMLElement;

        if (!toggle || !menu) return;

        const newToggle = toggle.cloneNode(true) as HTMLElement;
        toggle.parentNode?.replaceChild(newToggle, toggle);

        newToggle.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const isOpen = dropdownItem.classList.contains('show');

          if (isOpen) {
            dropdownItem.classList.remove('show');
            menu.classList.remove('show');
            newToggle.classList.remove('show');
            newToggle.setAttribute('aria-expanded', 'false');
          } else {
            // Close siblings first
            document.querySelectorAll('.navbar-nav .nav-item.dropdown.show').forEach(item => {
              item.classList.remove('show');
              (item.querySelector('.dropdown-menu') as HTMLElement)?.classList.remove('show');
              const t = item.querySelector('[data-toggle="dropdown"]') as HTMLElement;
              if (t) { t.classList.remove('show'); t.setAttribute('aria-expanded', 'false'); }
            });
            dropdownItem.classList.add('show');
            menu.classList.add('show');
            newToggle.classList.add('show');
            newToggle.setAttribute('aria-expanded', 'true');
          }
        });
      });

      document.addEventListener('click', (e) => {
        if (!(e.target as Element).closest('.navbar-nav .nav-item.dropdown')) {
          document.querySelectorAll('.navbar-nav .nav-item.dropdown.show').forEach(item => {
            item.classList.remove('show');
            (item.querySelector('.dropdown-menu') as HTMLElement)?.classList.remove('show');
            const t = item.querySelector('[data-toggle="dropdown"]') as HTMLElement;
            if (t) { t.classList.remove('show'); t.setAttribute('aria-expanded', 'false'); }
          });
        }
      });
    }, 500);
  }

  /**
   * Cierra todos los dropdowns abiertos
   */
  closeAllDropdowns(): void {
    document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
      menu.classList.remove('show');
      const toggle = menu.previousElementSibling as Element;
      if (toggle) {
        toggle.classList.remove('show');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /**
   * Cierra el menú de usuario por Bootstrap o fallback manual
   */
  closeUserMenu(): void {
    const dropdownElement = document.querySelector('[data-widget="user-menu"] .dropdown-toggle');
    if (!dropdownElement) return;

    if (typeof $ !== 'undefined' && $.fn.dropdown) {
      try { $(dropdownElement).dropdown('hide'); return; } catch {}
    }

    const dropdownMenu = dropdownElement.nextElementSibling;
    if (dropdownMenu?.classList.contains('dropdown-menu')) {
      dropdownMenu.classList.remove('show');
      dropdownElement.classList.remove('show');
      dropdownElement.setAttribute('aria-expanded', 'false');
    }
  }

  /**
   * Toggle sidebar collapse
   */
  toggleSidebar(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    document.body.classList.toggle('sidebar-collapse');
  }
}
