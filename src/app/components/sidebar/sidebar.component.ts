import { Component, OnInit, OnDestroy, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { Subject, takeUntil, filter } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { FormsModule } from '@angular/forms';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';

import { MenuService, MenuItem, IntranetConsumibleMenuItem, MenuIntranetSidebarItem } from '../../services/menu.service';
import { AuthService } from '../../services/auth.service';
import { MenuPermissionsService } from '../../services/menu-permissions.service';
import { ADMIN_SIDEBAR_LINK_PERMS } from '../../config/admin-sidebar.config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NgbCollapseModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css'
})
export class SidebarComponent implements OnInit, OnDestroy {
  // Menús dinámicos
  menuItems: MenuItem[] = [];
  permisosUsuario: string[] = [];

  // Sistemas integrados
  sistemasIntegrados: any[] = [];
  originalSistemasIntegrados: any[] = []; // Para restaurar después de búsqueda

  // Menús consumibles por toda la intranet (visible_en_intranet) - fallback si no hay menu_intranet
  menusIntranetConsumibles: IntranetConsumibleMenuItem[] = [];
  // Menús dinámicos desde menu_intranet (prioridad sobre consumibles)
  menusIntranetDinamicos: MenuIntranetSidebarItem[] = [];

  // Búsqueda en menús
  searchQuery: string = '';

  // Control de estado de menús
  menuStates: { [key: string]: boolean } = {};

  private destroy$ = new Subject<void>();
  private menusLoaded = false;

  /** Mapa permiso → ítems del menú ADMINISTRACIÓN (plantilla HTML). */
  readonly adminSidebarPerms = ADMIN_SIDEBAR_LINK_PERMS;

  constructor(
    private router: Router,
    private menuService: MenuService,
    private authService: AuthService,
    private menuPermissionsService: MenuPermissionsService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object
  ) { }

  ngOnInit(): void {
    // Cargar estado de menús guardado
    this.loadMenuState();

    // Cargar menús iniciales
    this.loadDynamicMenus();

    // Suscribirse a cambios de ruta para actualizar estado de menús
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      this.updateMenuStateOnNavigation(event.url);
    });

    // Refrescar menús INTRANET y sistemas integrados cuando se actualizan desde admin (tiempo real)
    this.menuService.menuRefresh$.pipe(
      debounceTime(200),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.loadMenusIntranetDinamicos();
      this.loadMenusIntranetConsumibles();
      this.loadSistemasIntegrados();
    });

    // Actualizar visibilidad ADMINISTRACIÓN si cambian permisos en sesión (p. ej. tras login / refresh user).
    this.authService.currentUser$.pipe(takeUntil(this.destroy$)).subscribe(() => {
      this.cdr.markForCheck();
    });

    // Rutas /admin-menu-management omiten validateToken en el guard; al montar el lateral sincronizamos permisos Spatie (una vez por pestaña).
    if (isPlatformBrowser(this.platformId) && this.authService.isLoggedIn()) {
      const key = 'sidebarSessionUserRefreshed';
      if (!sessionStorage.getItem(key)) {
        sessionStorage.setItem(key, '1');
        this.authService.refreshSessionUser().subscribe({ error: () => {} });
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDynamicMenus(): void {
    if (this.menusLoaded) return;
    this.menusLoaded = true;

    this.loadUserPermissions();
    this.loadSistemasIntegrados();
    this.loadMenusIntranetConsumibles();
    this.loadMenusIntranetDinamicos();
  }

  private loadUserPermissions(): void {
    if (!this.authService.isLoggedIn()) return;

    this.menuPermissionsService.getUserPermissions()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (permissions) => {
          this.permisosUsuario = permissions.permisos.map((p: any) =>
            `${p.sistema_id}-${p.menu_id}`
          );
        }
      });
  }

  /**
   * Carga sistemas integrados desde menu-integrado (filtrado por accesos del usuario).
   * Reemplaza getIntegratedSystems + getSystemMenus para respetar accesos_usuarios.
   */
  private loadSistemasIntegrados(): void {
    this.menuService.obtenerMenuIntegrado()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (menuItems) => {
          this.menuItems = menuItems;
          this.sistemasIntegrados = this.agruparMenusPorSistema(menuItems);
          this.originalSistemasIntegrados = JSON.parse(JSON.stringify(this.sistemasIntegrados));
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error cargando menús integrados:', error);
          this.sistemasIntegrados = [];
          this.originalSistemasIntegrados = [];
          this.menusLoaded = false;
          this.cdr.detectChanges();
        }
      });
  }

  /** Agrupa menús planos por sistema para la sección SISTEMAS del sidebar */
  private agruparMenusPorSistema(menuItems: MenuItem[]): any[] {
    const porSistema = new Map<number, { sistema: any; menus: any[] }>();

    for (const item of menuItems) {
      const se = (item as any).sistema_externo;
      if (!se || !se.id) continue;

      if (!porSistema.has(se.id)) {
        porSistema.set(se.id, {
          sistema: { id: se.id, nombre: se.nombre, codigo: se.codigo, url_base: se.url_base },
          menus: []
        });
      }
      porSistema.get(se.id)!.menus.push(item);
    }

    return Array.from(porSistema.values())
      .map(({ sistema, menus }) => ({ ...sistema, menus }))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }

  private loadMenusIntranetConsumibles(): void {
    if (!this.authService.isLoggedIn()) return;

    this.menuService.getMenusIntranetConsumibles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            this.menusIntranetConsumibles = res.data;
            this.cdr.detectChanges();
          }
        }
      });
  }

  private loadMenusIntranetDinamicos(): void {
    if (!this.authService.isLoggedIn()) return;

    this.menuService.getMenusIntranetDinamicos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data && res.data.length > 0) {
            this.menusIntranetDinamicos = res.data;
            this.cdr.detectChanges();
          }
        }
      });
  }

  // --- Lógica de UI ---

  toggleMenu(menuId: string, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    const isCurrentlyOpen = this.menuStates[menuId];

    // Accordion: cerrar hermanos
    const menuLevel = menuId.split('-').slice(0, -1).join('-');
    Object.keys(this.menuStates).forEach(key => {
      const keyLevel = key.split('-').slice(0, -1).join('-');
      if (keyLevel === menuLevel) {
        this.menuStates[key] = false;
      }
    });

    if (!isCurrentlyOpen) {
      this.menuStates[menuId] = true;
    }

    this.saveMenuState();
    this.cdr.detectChanges();
  }

  isMenuOpen(menuId: string): boolean {
    return this.menuStates[menuId] || false;
  }

  private saveMenuState(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('menuStates', JSON.stringify(this.menuStates));
    }
  }

  private loadMenuState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const saved = localStorage.getItem('menuStates');
      if (saved) {
        this.menuStates = JSON.parse(saved);
      }
    }
  }

  private updateMenuStateOnNavigation(url: string): void {
    if (url.includes('/organizacion') || url.includes('/tramite-documentario/admin/')) {
      this.menuStates['maestro'] = true;
      this.cdr.detectChanges();
    }
    if (
      url.includes('/patrones') ||
      url.includes('/activos-fijos/configuracion') ||
      url.includes('/admin-menu-management') ||
      url.includes('/perfil')
    ) {
      this.menuStates['config'] = true;
      this.cdr.detectChanges();
    }
    if (url.includes('/asesoria-legal')) {
      this.menuStates['asesoria-legal'] = true;
      this.cdr.detectChanges();
    }
  }

  // --- Búsqueda ---

  onSearchMenu(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.toLowerCase().trim();
    this.searchQuery = query;

    if (!query) {
      this.clearSearch();
      return;
    }

    this.sistemasIntegrados = this.originalSistemasIntegrados
      .map(sistema => {
        const sistemaClonado = { ...sistema };
        const menusFilterados = this.filterMenusRecursively(sistema.menus || [], query);
        sistemaClonado.menus = menusFilterados;
        return sistemaClonado;
      })
      .filter(sistema =>
        sistema.nombre?.toLowerCase().includes(query) ||
        (sistema.menus && sistema.menus.length > 0)
      );

    // Auto-expandir resultados
    this.expandSearchResults();
    this.cdr.detectChanges();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.sistemasIntegrados = JSON.parse(JSON.stringify(this.originalSistemasIntegrados));
    this.cdr.detectChanges();
  }

  private filterMenusRecursively(menus: any[], query: string): any[] {
    const result: any[] = [];
    menus.forEach(menu => {
      const menuClonado = { ...menu };
      const match = (menu.nombre || menu.titulo || '').toLowerCase().includes(query);

      if (menu.submenus && menu.submenus.length > 0) {
        menuClonado.submenus = this.filterMenusRecursively(menu.submenus, query);
      }

      if (match || (menuClonado.submenus && menuClonado.submenus.length > 0)) {
        result.push(menuClonado);
      }
    });
    return result;
  }

  private expandSearchResults(): void {
    this.sistemasIntegrados.forEach((sistema, i) => {
      if (sistema.menus && sistema.menus.length > 0) {
        this.menuStates['sistema-' + i] = true;
        sistema.menus.forEach((menu: any, j: number) => {
          if (menu.submenus && menu.submenus.length > 0) {
            this.menuStates['menu-' + i + '-' + j] = true;
          }
        });
      }
    });
  }

  // --- Utilidades ---

  /**
   * Ítem del bloque ADMINISTRACIÓN: visible si tiene algún permiso del ítem (matriz en `admin-sidebar.config.ts`).
   * Solo **Super Admin** ignora la matriz y ve todo el bloque.
   */
  canAdminNavItem(permissionNames: readonly string[]): boolean {
    if (!this.authService.isLoggedIn()) {
      return false;
    }
    if (this.authService.hasAdminSidebarSuperAdminBypass()) {
      return true;
    }
    return permissionNames.some((name) => this.authService.hasPermission(name));
  }

  /** Rama «Configuración» del sidebar: al menos un hijo visible. */
  get showAdminConfigBranch(): boolean {
    const p = this.adminSidebarPerms;
    return (
      this.canAdminNavItem(p.perfil) ||
      this.canAdminNavItem(p.panelAdmin) ||
      this.canAdminNavItem(p.usuarios) ||
      this.canAdminNavItem(p.roles) ||
      this.canAdminNavItem(p.auditoria) ||
      this.canAdminNavItem(p.patrones)
    );
  }

  /** Rama «Maestro»: al menos un hijo visible. */
  get showAdminMaestroBranch(): boolean {
    const p = this.adminSidebarPerms;
    return (
      this.canAdminNavItem(p.organizacion) ||
      this.canAdminNavItem(p.tramiteAreas) ||
      this.canAdminNavItem(p.tramiteTipos) ||
      this.canAdminNavItem(p.tramiteUsuarios)
    );
  }

  /** Cabecera «ADMINISTRACIÓN» y bloque completo. */
  get showAdministrationSection(): boolean {
    return this.showAdminConfigBranch || this.showAdminMaestroBranch;
  }

  getSistemaIcon(nombreSistema: string): string {
    const nombre = (nombreSistema || '').toLowerCase();
    if (nombre.includes('planillas')) return 'fas fa-money-check-alt';
    if (nombre.includes('documental')) return 'fas fa-file-alt';
    if (nombre.includes('tramites')) return 'fas fa-clipboard-list';
    if (nombre.includes('contabilidad')) return 'fas fa-calculator';
    if (nombre.includes('recursos humanos')) return 'fas fa-users';
    return 'fas fa-desktop';
  }

  getMenuUrl(menu: any): string {
    if (!menu) return '#';
    const menuRoute = menu.route || menu.ruta || menu.url;
    const sistema = menu.sistema_externo || menu.sistema_integrado;

    if (menuRoute && menuRoute !== '#') {
      if (menu.tipo_ruta === 'externa') return menuRoute;
      if (menu.tipo_ruta === 'interna' && sistema?.url_base) {
        const urlBase = sistema.url_base.replace(/\/$/, '');
        const ruta = menuRoute.replace(/^\//, '');
        return `${urlBase}/${ruta}`;
      }
      return menuRoute;
    }

    if (sistema?.url_base) return sistema.url_base;
    if (menu.url && menu.url !== '#') return menu.url;

    return '#';
  }

  getIntranetConsumibleUrl(item: IntranetConsumibleMenuItem): string {
    return (item.ruta || item.route || '#').trim();
  }

  /** Ruta para ítem del menú intranet dinámico */
  getIntranetDinamicoRuta(item: { ruta: string }): string {
    return (item.ruta || '#').trim();
  }

  /** Query params para ítem (o null si no tiene) */
  getIntranetDinamicoQueryParams(item: { query_params?: Record<string, string> }): Record<string, string> | null {
    const qp = item.query_params;
    return qp && Object.keys(qp).length > 0 ? qp : null;
  }

  handleMenuClick(event: Event, menu: any): void {
    if (menu.submenus && menu.submenus.length > 0) return;

    event.preventDefault();
    event.stopPropagation();

    const url = this.getMenuUrl(menu);
    if (url === '#') return;

    const target = menu.abrir_nueva_pestana ? '_blank' : (menu.target || '_self');

    if (menu.tipo_ruta === 'externa' || menu.abrir_nueva_pestana || url.startsWith('http')) {
      window.open(url, target);
    } else {
      this.router.navigate([url]);
    }
  }
}
