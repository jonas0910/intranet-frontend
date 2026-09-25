import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { PermissionService } from '../../services/permission.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MenuService } from '../../services/menu.service';
import { RoleService } from '../../services/role.service';
import { ModuleDiscoveryService, ModuleInfo } from '../../services/module-discovery.service';
import { SystemManagementService, System } from '../../services/system-management.service';
import { MenuIntranetService, MenuIntranetItem, MenuIntranetDetailItem } from '../../services/menu-intranet.service';

@Component({
  selector: 'app-admin-menu-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './admin-menu-management.component.html',
  styleUrl: './admin-menu-management.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AdminMenuManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Estados
  loading = false;
  currentTab = 'discovery';
  discovering = false;

  // Permisos
  canManageMenus = false;
  canManageRoles = false;
  canManageUsers = false;
  canViewReports = false;

  // Estadísticas
  totalMenus = 0;
  totalRoles = 0;
  totalUsers = 0;
  totalPermissions = 0;

  // Sistemas
  sistemasIntegrados: any[] = [];
  sistemasDescubiertos: any[] = [];
  sistemas: any[] = [];
  selectedSistema = '';
  menusPorSistema: { [key: string]: any[] } = {};

  // Cache para evitar recalculos en template
  private _menusToShowCache = new Map<number, any[]>();
  private _totalPermissionsCache = new Map<number, number>();
  private _activeMenusCache = new Map<number, number>();

  // Sistemas eliminados (persistido en localStorage)
  private sistemasEliminados = new Set<number>();

  // Modal de detalles
  showDetailsModal = false;
  selectedSystemDetails: any = null;
  /** Marcar menús como "consumible por la intranet" (clave: sistemaCode|ruta|nombre) */
  menuVisibleEnIntranet: { [key: string]: boolean } = {};
  /** Si true, al integrar se ejecutan las migraciones del subsistema (tablas nuevas o actualizadas) */
  runMigrationTables = false;
  /** Si true, al integrar se ejecuta el seeder del subsistema (datos iniciales o de ejemplo) */
  runSeederTables = false;
  /** Si true, al integrar se instalan las dependencias (librerías) del subsistema desde su composer.json */
  runInstallDependencies = false;
  /** Modal con el log de la última integración (resumen de pasos) */
  showIntegrationLogModal = false;
  lastIntegrationSummaryText = '';
  private integrationPollingTimer: any = null;

  /** Extrae del resumen la sección "Detalle de error" para mostrarla destacada en el modal */
  get integrationErrorDetail(): { hasErrors: boolean; lines: string[]; tableNames: string[] } {
    const text = this.lastIntegrationSummaryText || '';
    const lines: string[] = [];
    const tableNames: string[] = [];
    const allLines = text.split(/\r?\n/);
    let inErrorBlock = false;
    for (const line of allLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('Detalle de error:')) {
        inErrorBlock = true;
        continue;
      }
      if (inErrorBlock) {
        if (trimmed.match(/^─+$/) || (trimmed === '' && lines.length > 0)) {
          break;
        }
        if (trimmed) {
          const content = trimmed.replace(/^└\s*/, '');
          lines.push(content);
          const m = content.match(/Tabla afectada:\s*([a-z0-9_]+)/i);
          if (m) {
            tableNames.push(m[1]);
          }
        }
      }
    }
    // Si no hay bloque "Detalle de error:" pero hay "Tabla afectada:" en el texto (ej. en la línea del paso)
    if (tableNames.length === 0 && text.includes('Tabla afectada:')) {
      const m = text.match(/Tabla afectada:\s*([a-z0-9_]+)/gi);
      if (m) {
        m.forEach(match => {
          const cap = match.match(/Tabla afectada:\s*([a-z0-9_]+)/i);
          if (cap) {
            tableNames.push(cap[1]);
          }
        });
        lines.push('Ver detalle en el resumen debajo.');
      }
    }
    return {
      hasErrors: lines.length > 0 || tableNames.length > 0,
      lines: lines.length > 0 ? lines : (tableNames.length > 0 ? ['Tabla(s) con error: ' + tableNames.join(', ')] : []),
      tableNames: [...new Set(tableNames)]
    };
  }

  // Modal de agregar sistema
  showAddSystemModal = false;

  // Menú Intranet
  menusIntranet: MenuIntranetItem[] = [];
  showMenuIntranetModal = false;
  showMenuIntranetDetailModal = false;
  editingMenuIntranet: MenuIntranetItem | null = null;
  editingMenuIntranetDetail: MenuIntranetDetailItem | null = null;
  menuIntranetParentForDetail: MenuIntranetItem | null = null;
  menuIntranetForm: { nombre: string; codigo: string; icono: string; ruta: string; activo: boolean; sistema_integrado_id?: number } = {
    nombre: '', codigo: '', icono: 'fas fa-circle', ruta: '', activo: true
  };
  menuIntranetDetailForm: { nombre: string; ruta: string; icono: string; activo: boolean } = {
    nombre: '', ruta: '', icono: 'far fa-circle', activo: true
  };
  newSystem: any = {
    nombre: '',
    codigo: '',
    descripcion: '',
    url_base: '',
    icono: 'fas fa-server',
    modo_ejecucion: 'iframe',
    usa_sso: true
  };

  constructor(
    private permissionService: PermissionService,
    private authService: AuthService,
    private notificationService: NotificationService,
    private menuService: MenuService,
    private roleService: RoleService,
    private moduleDiscoveryService: ModuleDiscoveryService,
    private systemManagementService: SystemManagementService,
    private menuIntranetService: MenuIntranetService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.checkPermissions();
    this.loadEliminadosFromStorage();
    this.loadStatistics();
    this.loadSistemas();
    // Menú Intranet se carga al cambiar a esa pestaña (evita bloquear carga inicial)
  }

  ngOnDestroy(): void {
    if (this.integrationPollingTimer) {
      clearTimeout(this.integrationPollingTimer);
    }
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Persistencia de sistemas eliminados ───

  private loadEliminadosFromStorage(): void {
    try {
      const raw = localStorage.getItem('sistemas_eliminados');
      if (raw) {
        this.sistemasEliminados = new Set(JSON.parse(raw).map(Number));
      }
    } catch {
      this.sistemasEliminados = new Set();
    }
  }

  private saveEliminadosToStorage(): void {
    try {
      localStorage.setItem('sistemas_eliminados', JSON.stringify([...this.sistemasEliminados]));
    } catch { /* silently fail */ }
  }

  // ─── Permisos ───

  private checkPermissions(): void {
    try {
      const user = this.authService.getCurrentUser();
      const roles = user?.roles || [];
      const isAdmin = ['Super Admin', 'Admin', 'Administrador del Sistema', 'admin', 'super_admin']
        .some(r => roles.includes(r));

      if (isAdmin) {
        this.canManageMenus = this.canManageRoles = this.canManageUsers = this.canViewReports = true;
      } else {
        this.canManageMenus = this.permissionService.canManageMenus();
        this.canManageRoles = this.permissionService.canManageRoles();
        this.canManageUsers = this.permissionService.canManageUsers();
        this.canViewReports = this.permissionService.hasPermission('reportes.ver');
      }
    } catch {
      this.canManageMenus = this.canManageRoles = this.canManageUsers = this.canViewReports = true;
    }
  }

  // ─── Estadísticas ───

  private loadStatistics(): void {
    this.menuService.obtenerEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            this.totalMenus = res.data.total_menus || 0;
            this.totalPermissions = res.data.menus_con_permisos || 0;
          }
          this.loadRoleStatistics();
        },
        error: () => {
          this.totalMenus = 0;
          this.totalPermissions = 0;
          this.loadRoleStatistics();
        }
      });
  }

  private loadRoleStatistics(): void {
    this.roleService.obtenerEstadisticas()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (res.success && res.data) {
            this.totalRoles = res.data.total_roles || 0;
            this.totalUsers = res.data.total_users || 0;
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.totalRoles = 0;
          this.totalUsers = 0;
          this.cdr.markForCheck();
        }
      });
  }

  // ─── Navegación de tabs (sin manipulación DOM directa) ───

  switchTab(tabName: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.currentTab = tabName;
    if (tabName === 'menu-intranet') {
      this.loadMenusIntranet();
      this.loadSistemas();
    }
  }

  isActiveTab(tab: string): boolean {
    return this.currentTab === tab;
  }

  handleTabClick(event: Event, tab: string): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.canAccessTab(tab)) {
      this.currentTab = tab;
    }
  }

  handleUsersNavigation(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.canManageUsers) {
      this.router.navigate(['/usuarios']);
    } else {
      this.notificationService.error('No tienes permisos para acceder a la gestión de usuarios');
    }
  }

  canAccessTab(tab: string): boolean {
    const user = this.authService.getCurrentUser();
    const roles = user?.roles || [];
    const isAdmin = ['Super Admin', 'Admin', 'Administrador del Sistema', 'admin', 'super_admin']
      .some(r => roles.includes(r));

    if (isAdmin) return true;

    switch (tab) {
      case 'menus': return this.canManageMenus || this.permissionService.hasPermission('menus.ver');
      case 'roles': return this.canManageRoles || this.permissionService.hasPermission('roles.ver');
      case 'users': return this.canManageUsers || this.permissionService.hasPermission('usuarios.ver');
      default: return true;
    }
  }

  // ─── Acciones rápidas ───

  refreshData(): void {
    this.loadStatistics();
    this.notificationService.success('Datos actualizados');
  }

  exportPermissions(): void {
    this.notificationService.info('Exportando permisos...');
  }

  importPermissions(): void {
    this.notificationService.info('Importando permisos...');
  }

  // ─── Carga de sistemas integrados ───

  loadSistemas(): void {
    this.systemManagementService.getIntegratedSystems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && Array.isArray(response.data)) {
            this.sistemasIntegrados = response.data
              .filter((s: any) => {
                const id = Number(s.id);
                return !this.sistemasEliminados.has(id) && !s.deleted_at;
              })
              .map((s: any) => {
                const menus = Array.isArray(s.menus) ? s.menus : [];
                return {
                  id: Number(s.id),
                  nombre: s.nombre,
                  descripcion: s.descripcion || 'Sin descripción',
                  totalMenus: menus.length,
                  menusActivos: menus.filter((m: any) => m.activo !== false).length,
                  totalRoles: 0,
                  activo: s.activo !== false,
                  url_base: s.url_base || '',
                  codigo: s.codigo || '',
                  sso_habilitado: s.sso_habilitado || false,
                  solo_intranet: s.solo_intranet === true,
                  menus,
                  created_at: s.created_at,
                  updated_at: s.updated_at
                };
              });

            this.clearCaches();
          } else {
            this.sistemasIntegrados = [];
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.sistemasIntegrados = [];
          this.notificationService.error('Error al cargar sistemas integrados');
          this.cdr.markForCheck();
        }
      });
  }

  refreshIntegratedSystems(): void {
    this.loadSistemas();
  }

  /** Sistemas para la pestaña Integrados: excluye los que solo están en INTRANET (solo_intranet) */
  get sistemasParaTabIntegrados(): any[] {
    return this.sistemasIntegrados.filter((s: any) => !s.solo_intranet);
  }

  // ─── Helpers de menús (con cache) ───

  private clearCaches(): void {
    this._menusToShowCache.clear();
    this._totalPermissionsCache.clear();
    this._activeMenusCache.clear();
  }

  /**
   * Extrae el nombre de un menú de forma robusta,
   * buscando en múltiples campos posibles.
   */
  private extractMenuName(menu: any): string {
    return menu?.name || menu?.nombre || menu?.display_name || menu?.titulo || '';
  }

  /**
   * Verifica si un menú tiene nombre válido.
   */
  private hasValidName(menu: any): boolean {
    return !!this.extractMenuName(menu).trim();
  }

  getMenusToShow(sistema: any): any[] {
    if (!sistema) return [];

    const cacheKey = sistema.id || 'temp';
    const cached = this._menusToShowCache.get(cacheKey);
    if (cached) return cached;

    // Buscar menús en el sistema integrado o en el objeto directo
    const integrado = sistema.id ? this.sistemasIntegrados.find(s => s.id === sistema.id) : null;
    const rawMenus = integrado?.menus || sistema.menus || sistema.menusDetallados || [];
    if (!Array.isArray(rawMenus) || rawMenus.length === 0) {
      return [];
    }

    const menus = rawMenus.map((menu: any) => ({
      id: menu.id,
      name: this.extractMenuName(menu),
      nombre: this.extractMenuName(menu),
      route: menu.ruta || menu.route || menu.codigo || '',
      codigo: menu.codigo || '',
      icon: menu.icono || menu.icon || 'fas fa-circle',
      icono: menu.icono || menu.icon || 'fas fa-circle',
      order: menu.orden || menu.order || 0,
      orden: menu.orden || menu.order || 0,
      active: menu.activo !== false,
      activo: menu.activo !== false,
      visible_en_intranet: !!menu.visible_en_intranet,
      permissions: menu.permisos_requeridos || menu.permissions || [],
      description: menu.descripcion || menu.description || '',
      expanded: false,
      submenus: (menu.submenus || []).map((sub: any) => ({
        id: sub.id,
        name: this.extractMenuName(sub),
        nombre: this.extractMenuName(sub),
        route: sub.ruta || sub.route || sub.codigo || '',
        icon: sub.icono || sub.icon || 'fas fa-file',
        order: sub.orden || sub.order || 0,
        active: sub.activo !== false,
        activo: sub.activo !== false,
        visible_en_intranet: !!sub.visible_en_intranet,
        permissions: sub.permisos_requeridos || sub.permisos || sub.permissions || [],
        description: sub.descripcion || sub.description || ''
      }))
    }));

    this._menusToShowCache.set(cacheKey, menus);
    return menus;
  }

  /** Lista plana de menús (raíz + hijos) para la tabla del modal de integración */
  getMenusToShowFlat(sistema: any): any[] {
    const tree = this.getMenusToShow(sistema);
    const flat: any[] = [];
    const push = (m: any, level: number) => {
      flat.push({ ...m, _level: level });
      (m.submenus || []).forEach((sub: any) => push(sub, level + 1));
    };
    tree.forEach(m => push(m, 0));
    return flat;
  }

  getMenuVisibleEnIntranetKey(sistema: any, menu: any): string {
    const code = sistema?.codigo || sistema?.moduleInfo?.name || 'sys';
    const route = menu?.route ?? menu?.ruta ?? '';
    const name = (this.extractMenuName(menu) || '').trim();
    return `${String(code).toLowerCase()}|${route}|${name}`;
  }

  getMenuVisibleEnIntranet(sistema: any, menu: any): boolean {
    return !!this.menuVisibleEnIntranet[this.getMenuVisibleEnIntranetKey(sistema, menu)];
  }

  setMenuVisibleEnIntranet(sistema: any, menu: any, value: boolean): void {
    const key = this.getMenuVisibleEnIntranetKey(sistema, menu);
    if (value) {
      this.menuVisibleEnIntranet[key] = true;
    } else {
      delete this.menuVisibleEnIntranet[key];
    }
    this.cdr.markForCheck();
  }

  getTotalSubmenus(sistema: any): number {
    if (!sistema?.menus || !Array.isArray(sistema.menus)) return 0;
    return sistema.menus.reduce((total: number, menu: any) =>
      total + (Array.isArray(menu.submenus) ? menu.submenus.length : 0), 0);
  }

  getTotalPermissions(sistema: any): number {
    if (!sistema?.id) return 0;

    const cached = this._totalPermissionsCache.get(sistema.id);
    if (cached !== undefined) return cached;

    const menus = this.getMenusToShow(sistema);
    const allPerms = new Set<string>();
    menus.forEach((m: any) => {
      const perms = m.permissions || [];
      if (Array.isArray(perms)) perms.forEach((p: string) => allPerms.add(p));
    });

    const count = allPerms.size;
    this._totalPermissionsCache.set(sistema.id, count);
    return count;
  }

  getActiveMenusCount(sistema: any): number {
    if (!sistema?.id) return 0;

    const cached = this._activeMenusCache.get(sistema.id);
    if (cached !== undefined) return cached;

    const menus = this.getMenusToShow(sistema);
    const count = menus.filter((m: any) => m.active || m.activo).length;
    this._activeMenusCache.set(sistema.id, count);
    return count;
  }

  getLastUpdate(sistema: any): string {
    const date = sistema?.moduleInfo?.updated_at || sistema?.updated_at;
    return date ? new Date(date).toLocaleDateString() : 'Hoy';
  }

  getTotalMenus(): number {
    return this.sistemasIntegrados.reduce((t, s) => t + (s.totalMenus || 0), 0);
  }

  getActiveUsersCount(): number {
    return 0;
  }

  getMenuStatistics(sistema: any): any {
    const menus = sistema?.moduleInfo?.menus;
    if (!menus || !Array.isArray(menus)) {
      return { total: 0, principales: 0, submenus: 0, activos: 0, inactivos: 0 };
    }
    return {
      total: menus.length,
      principales: menus.filter((m: any) => m.level === 1).length,
      submenus: menus.filter((m: any) => m.level === 2).length,
      activos: menus.filter((m: any) => m.active === true).length,
      inactivos: menus.filter((m: any) => m.active === false).length
    };
  }

  // ─── Helpers de permisos ───

  getPermisosArray(menu: any): string[] {
    if (!menu) return [];
    const perms = menu.permisos || menu.permisos_requeridos;
    if (Array.isArray(perms)) return perms.filter((p: any) => p != null && p !== '');
    if (perms && typeof perms === 'object') return Object.keys(perms).filter(k => k !== '');
    if (typeof perms === 'string' && perms.trim()) return perms.split(',').map((p: string) => p.trim()).filter((p: string) => p !== '');
    return [];
  }

  // ─── TrackBy para ngFor ───

  trackByMenuId(index: number, menu: any): any {
    return menu.id || menu.name || index;
  }

  trackByPermiso(index: number, permiso: string): string {
    return permiso || index.toString();
  }

  trackBySistemaId(index: number, sistema: any): any {
    return sistema.id || sistema.nombre || index;
  }

  trackByMenuIntranetId(index: number, item: MenuIntranetItem): number {
    return item.id;
  }

  trackByDetailId(index: number, d: MenuIntranetDetailItem): number {
    return d.id;
  }

  // ─── Menú Intranet ───

  loadMenusIntranet(): void {
    this.menuIntranetService.list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && Array.isArray(res.data)) {
            this.menusIntranet = res.data.map((item: any) => ({
              ...item,
              expanded: false,
              todosDetalles: item.todosDetalles || item.todos_detalles || []
            }));
          } else {
            this.menusIntranet = [];
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.menusIntranet = [];
          this.cdr.markForCheck();
        }
      });
  }

  toggleMenuIntranetExpanded(item: MenuIntranetItem): void {
    (item as any).expanded = !(item as any).expanded;
    this.cdr.markForCheck();
  }

  getMenuIntranetDetails(item: MenuIntranetItem): MenuIntranetDetailItem[] {
    const detalles = item.todosDetalles || item.todos_detalles || [];
    const raiz = detalles.filter((d: MenuIntranetDetailItem) => !d.parent_id);
    return raiz.sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  getMenuIntranetDetailCount(item: MenuIntranetItem): number {
    const detalles = item.todosDetalles || item.todos_detalles || [];
    return detalles.length;
  }

  openMenuIntranetForm(): void {
    this.editingMenuIntranet = null;
    this.menuIntranetForm = { nombre: '', codigo: '', icono: 'fas fa-circle', ruta: '', activo: true };
    this.showMenuIntranetModal = true;
    this.cdr.markForCheck();
  }

  /** Selección para agregar a Intranet: { sistemaId: { whole: boolean, menuIds: number[] } } */
  intranetSelection: { [sistemaId: number]: { whole: boolean; menuIds: number[] } } = {};
  /** Modal de selección de sistemas para Intranet (se abre tras escanear) */
  showIntranetSelectModal = false;
  /** Modal Intranet desde pestaña Descubrir (un solo módulo) */
  showIntranetFromDiscoveryModal = false;
  selectedModuleForIntranet: any = null;
  /** Selección de menús para Intranet desde Descubrir: clave = nombre|ruta */
  intranetDiscoveryMenuSelection: { [key: string]: boolean } = {};

  /** Indica si un sistema ya está en el menú INTRANET */
  isSistemaEnIntranet(sistema: any): boolean {
    const id = sistema?.id ? Number(sistema.id) : 0;
    return this.menusIntranet.some(m => (m as any).sistema_integrado_id === id);
  }

  /** Menús aplanados de un sistema (padres + hijos) para checkboxes */
  getMenusFlatForIntranet(sistema: any): any[] {
    const out: any[] = [];
    const menus = sistema?.menus || [];
    const padres = menus.filter((m: any) => !m.parent_id);
    padres.forEach((m: any) => {
      out.push({ ...m, _level: 0 });
      const hijos = m.submenus || m.children || [];
      hijos.forEach((s: any) => out.push({ ...s, _level: 1 }));
    });
    return out;
  }

  isIntranetWholeChecked(sistema: any): boolean {
    const id = sistema?.id ? Number(sistema.id) : 0;
    return !!this.intranetSelection[id]?.whole;
  }

  /** Indica si hay algún menú individual seleccionado para Intranet (deshabilita "Subsistema completo") */
  hasIntranetMenuSelected(sistema: any): boolean {
    return this.getMenusFlatForIntranet(sistema).some(m => this.isIntranetMenuChecked(sistema, m));
  }

  isIntranetMenuChecked(sistema: any, menu: any): boolean {
    const sid = sistema?.id ? Number(sistema.id) : 0;
    const mid = menu?.id ? Number(menu.id) : 0;
    return (this.intranetSelection[sid]?.menuIds || []).includes(mid);
  }

  toggleIntranetWhole(sistema: any): void {
    const id = sistema?.id ? Number(sistema.id) : 0;
    if (!id) return;
    if (!this.intranetSelection[id]) this.intranetSelection[id] = { whole: false, menuIds: [] };
    this.intranetSelection[id].whole = !this.intranetSelection[id].whole;
    if (this.intranetSelection[id].whole) this.intranetSelection[id].menuIds = [];
    this.cdr.markForCheck();
  }

  toggleExpandSistema(sistema: any): void {
    (sistema as any)._expanded = !(sistema as any)._expanded;
    this.cdr.markForCheck();
  }

  toggleIntranetMenu(sistema: any, menu: any): void {
    const sid = sistema?.id ? Number(sistema.id) : 0;
    const mid = menu?.id ? Number(menu.id) : 0;
    if (!sid || !mid) return;
    if (!this.intranetSelection[sid]) this.intranetSelection[sid] = { whole: false, menuIds: [] };
    const sel = this.intranetSelection[sid];
    if (sel.whole) return;
    const idx = sel.menuIds.indexOf(mid);
    if (idx >= 0) sel.menuIds.splice(idx, 1);
    else sel.menuIds.push(mid);
    this.cdr.markForCheck();
  }

  aplicarIntranetSeleccion(): void {
    const toApply: { sistemaId: number; menuIds?: number[] }[] = [];
    Object.entries(this.intranetSelection).forEach(([sid, sel]) => {
      const sistemaId = Number(sid);
      if (sel.whole) toApply.push({ sistemaId });
      else if (sel.menuIds.length > 0) toApply.push({ sistemaId, menuIds: sel.menuIds });
    });
    if (toApply.length === 0) {
      this.notificationService.warning('Seleccione al menos un subsistema o menú.');
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    let done = 0;
    const total = toApply.length;
    toApply.forEach(({ sistemaId, menuIds }) => {
      this.menuIntranetService.fromSistema(sistemaId, menuIds).pipe(takeUntil(this.destroy$)).subscribe({
        next: (r) => {
          done++;
          if (r.success) {
            const nom = this.sistemasIntegrados.find(s => Number(s.id) === sistemaId)?.nombre || '';
            this.notificationService.success(`"${nom}" agregado a INTRANET`);
          } else {
            this.notificationService.warning(r.message || 'No se pudo agregar');
          }
          if (done >= total) {
            this.loading = false;
            this.intranetSelection = {};
            this.showIntranetSelectModal = false;
            this.loadMenusIntranet();
            this.menuService.triggerMenuRefresh();
            this.cdr.markForCheck();
          }
        },
        error: () => {
          done++;
          this.notificationService.error('Error al agregar a INTRANET');
          if (done >= total) {
            this.loading = false;
            this.cdr.markForCheck();
          }
        }
      });
    });
  }

  /** Agregar un sistema integrado a la sección INTRANET (subsistema completo) */
  addSistemaToIntranet(sistema: any): void {
    const id = sistema.id ? Number(sistema.id) : null;
    if (!id) {
      this.notificationService.warning('El sistema no tiene ID.');
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.menuIntranetService.fromSistema(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (r) => {
        this.loading = false;
        if (r.success) {
          this.currentTab = 'menu-intranet';
          this.loadMenusIntranet();
          this.menuService.triggerMenuRefresh();
          this.notificationService.success('Subsistema agregado al menú INTRANET. Aparecerá en el menú lateral.');
        } else {
          this.notificationService.warning(r.message || 'No se pudo agregar a INTRANET.');
        }
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Error al agregar a INTRANET.');
        this.cdr.markForCheck();
      }
    });
  }

  closeMenuIntranetModal(): void {
    this.showMenuIntranetModal = false;
    this.editingMenuIntranet = null;
    this.cdr.markForCheck();
  }

  editMenuIntranet(item: MenuIntranetItem): void {
    this.editingMenuIntranet = item;
    this.menuIntranetForm = {
      nombre: item.nombre,
      codigo: item.codigo,
      icono: item.icono || 'fas fa-circle',
      ruta: item.ruta || '',
      activo: item.activo
    };
    this.showMenuIntranetModal = true;
    this.cdr.markForCheck();
  }

  saveMenuIntranet(): void {
    if (!this.menuIntranetForm.nombre?.trim() || !this.menuIntranetForm.codigo?.trim()) return;
    this.loading = true;
    this.cdr.markForCheck();

    const obs = this.editingMenuIntranet
      ? this.menuIntranetService.update(this.editingMenuIntranet.id, this.menuIntranetForm)
      : this.menuIntranetService.create(this.menuIntranetForm);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.closeMenuIntranetModal();
          this.loadMenusIntranet();
          this.notificationService.success(res.message || 'Guardado correctamente');
          this.menuService.triggerMenuRefresh();
        } else {
          this.notificationService.error(res.message || 'Error al guardar');
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(err.error?.message || 'Error al guardar');
        this.cdr.markForCheck();
      }
    });
  }

  deleteMenuIntranet(item: MenuIntranetItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    if (!confirm(`¿Eliminar el subsistema "${item.nombre}" y todos sus ítems?`)) return;
    this.loading = true;
    this.cdr.markForCheck();
    this.menuIntranetService.delete(item.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.loadMenusIntranet();
            this.notificationService.success('Subsistema eliminado');
            this.menuService.triggerMenuRefresh();
          } else {
            this.notificationService.error(res.message || 'Error al eliminar');
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.notificationService.error('Error al eliminar');
          this.cdr.markForCheck();
        }
      });
  }

  addMenuIntranetDetail(item: MenuIntranetItem): void {
    this.menuIntranetParentForDetail = item;
    this.editingMenuIntranetDetail = null;
    this.menuIntranetDetailForm = { nombre: '', ruta: '', icono: 'far fa-circle', activo: true };
    this.showMenuIntranetDetailModal = true;
    (item as any).expanded = true;
    this.cdr.markForCheck();
  }

  editMenuIntranetDetail(item: MenuIntranetItem, d: MenuIntranetDetailItem): void {
    this.menuIntranetParentForDetail = item;
    this.editingMenuIntranetDetail = d;
    this.menuIntranetDetailForm = {
      nombre: d.nombre,
      ruta: d.ruta,
      icono: d.icono || 'far fa-circle',
      activo: d.activo
    };
    this.showMenuIntranetDetailModal = true;
    this.cdr.markForCheck();
  }

  closeMenuIntranetDetailModal(): void {
    this.showMenuIntranetDetailModal = false;
    this.menuIntranetParentForDetail = null;
    this.editingMenuIntranetDetail = null;
    this.cdr.markForCheck();
  }

  saveMenuIntranetDetail(): void {
    if (!this.menuIntranetParentForDetail || !this.menuIntranetDetailForm.nombre?.trim() || !this.menuIntranetDetailForm.ruta?.trim()) return;
    this.loading = true;
    this.cdr.markForCheck();

    const obs = this.editingMenuIntranetDetail
      ? this.menuIntranetService.updateDetail(this.menuIntranetParentForDetail.id, this.editingMenuIntranetDetail.id, this.menuIntranetDetailForm)
      : this.menuIntranetService.createDetail(this.menuIntranetParentForDetail.id, this.menuIntranetDetailForm);

    obs.pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        if (res.success) {
          this.closeMenuIntranetDetailModal();
          this.loadMenusIntranet();
          this.notificationService.success('Ítem guardado');
          this.menuService.triggerMenuRefresh();
        } else {
          this.notificationService.error(res.message || 'Error al guardar');
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.loading = false;
        this.notificationService.error('Error al guardar');
        this.cdr.markForCheck();
      }
    });
  }

  deleteMenuIntranetDetail(item: MenuIntranetItem, d: MenuIntranetDetailItem): void {
    if (!confirm(`¿Eliminar el ítem "${d.nombre}"?`)) return;
    this.menuIntranetService.deleteDetail(item.id, d.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success) {
            this.loadMenusIntranet();
            this.notificationService.success('Ítem eliminado');
            this.menuService.triggerMenuRefresh();
          } else {
            this.notificationService.error(res.message || 'Error al eliminar');
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.notificationService.error('Error al eliminar');
          this.cdr.markForCheck();
        }
      });
  }

  // ─── Organización de menús por sistema ───

  organizarMenusPorSistema(menus: any[]): void {
    const map = new Map<string, any>();

    menus.forEach(menu => {
      const key = menu.modulo || 'Sin Sistema';
      if (!map.has(key)) {
        map.set(key, {
          nombre: key,
          icono: this.getSistemaIcon(key),
          color: this.getSistemaColor(key),
          menus: [],
          totalMenus: 0,
          menusActivos: 0
        });
      }
      const data = map.get(key);
      data.menus.push(menu);
      data.totalMenus++;
      if (menu.visible) data.menusActivos++;
    });

    this.sistemas = Array.from(map.values());
    this.menusPorSistema = Object.fromEntries(map);
    if (this.sistemas.length > 0 && !this.selectedSistema) {
      this.selectedSistema = this.sistemas[0].nombre;
    }
  }

  getSistemaIcon(sistema: string): string {
    const icons: Record<string, string> = {
      'Planillas': 'fas fa-file-invoice-dollar',
      'Tesoreria': 'fas fa-cash-register',
      'TestModule': 'fas fa-flask',
      'Core': 'fas fa-cogs',
      'Sin Sistema': 'fas fa-question-circle'
    };
    return icons[sistema] || 'fas fa-cube';
  }

  getSistemaColor(sistema: string): string {
    const colors: Record<string, string> = {
      'Planillas': 'success',
      'Tesoreria': 'warning',
      'TestModule': 'info',
      'Core': 'primary',
      'Sin Sistema': 'secondary'
    };
    return colors[sistema] || 'secondary';
  }

  selectSistema(sistema: string): void {
    this.selectedSistema = sistema;
  }

  getMenusDelSistema(): any[] {
    return this.menusPorSistema[this.selectedSistema] || [];
  }

  getSistemaSeleccionado(): any {
    return this.sistemas.find(s => s.nombre === this.selectedSistema);
  }

  // ─── Modales y formularios ───

  isAnyModalOpen(): boolean {
    return this.showDetailsModal || this.showAddSystemModal || this.showMenuIntranetModal || this.showMenuIntranetDetailModal;
  }

  hasSystemsWithDetailedMenus(): boolean {
    return this.sistemasDescubiertos.some(s => s.menusDetallados?.length > 0);
  }

  toggleMenusExpanded(sistema: any): void {
    sistema.menusExpanded = !sistema.menusExpanded;
  }

  toggleMenuExpanded(item: any): void {
    item.menusExpanded = !item.menusExpanded;
  }

  openSystemForm(): void {
    this.showAddSystemModal = true;
    this.cdr.markForCheck();
  }

  closeAddSystemModal(): void {
    this.showAddSystemModal = false;
    this.newSystem = {
      nombre: '', codigo: '', descripcion: '', url_base: '',
      icono: 'fas fa-server', modo_ejecucion: 'iframe', usa_sso: true
    };
    this.cdr.markForCheck();
  }

  closeIntranetSelectModal(): void {
    this.showIntranetSelectModal = false;
    this.cdr.markForCheck();
  }

  /** Abre modal Intranet desde pestaña Descubrir */
  openIntranetFromDiscovery(sistema: any): void {
    if (!sistema.autorizado) return;
    this.selectedModuleForIntranet = sistema;
    this.intranetDiscoveryMenuSelection = {};
    const menus = this.getMenusFlatFromDiscovery(sistema);
    menus.forEach(m => {
      const key = this.getMenuKeyForDiscovery(m);
      this.intranetDiscoveryMenuSelection[key] = true;
    });
    this.showIntranetFromDiscoveryModal = true;
    this.cdr.detectChanges();
  }

  closeIntranetFromDiscoveryModal(): void {
    this.showIntranetFromDiscoveryModal = false;
    this.selectedModuleForIntranet = null;
    this.intranetDiscoveryMenuSelection = {};
    this.cdr.markForCheck();
  }

  /** Menús aplanados de un módulo descubierto (padres primero, luego hijos) */
  getMenusFlatFromDiscovery(sistema: any): any[] {
    const out: any[] = [];
    const raw = sistema?.menusDetallados || sistema?.moduleInfo?.menus || [];
    const padres = raw.filter((m: any) => !m.parent_id && m.parent_id !== 0 && (m.level === 1 || m.nivel === 1 || !m.level));
    if (padres.length > 0) {
      padres.forEach((m: any) => {
        out.push({ ...m, _level: 0 });
        const hijos = m.submenus || m.children || raw.filter((r: any) => r.parent_id === m.id || r.parent_name === (m.name || m.nombre));
        (hijos || []).forEach((s: any) => out.push({ ...s, _level: 1 }));
      });
    } else {
      raw.forEach((m: any) => out.push({ ...m, _level: m.level === 2 || m.nivel === 2 ? 1 : 0 }));
    }
    return out;
  }

  getMenuKeyForDiscovery(menu: any): string {
    return `${this.extractMenuName(menu)}|${menu.route || menu.ruta || ''}`;
  }

  isDiscoveryMenuSelected(menu: any): boolean {
    return !!this.intranetDiscoveryMenuSelection[this.getMenuKeyForDiscovery(menu)];
  }

  toggleDiscoveryMenuSelection(menu: any): void {
    const key = this.getMenuKeyForDiscovery(menu);
    this.intranetDiscoveryMenuSelection[key] = !this.intranetDiscoveryMenuSelection[key];
    this.cdr.markForCheck();
  }

  selectAllDiscoveryMenus(): void {
    const menus = this.getMenusFlatFromDiscovery(this.selectedModuleForIntranet);
    menus.forEach(m => {
      this.intranetDiscoveryMenuSelection[this.getMenuKeyForDiscovery(m)] = true;
    });
    this.cdr.markForCheck();
  }

  deselectAllDiscoveryMenus(): void {
    this.intranetDiscoveryMenuSelection = {};
    this.cdr.markForCheck();
  }

  /** Integrar el módulo y agregar menús seleccionados a INTRANET */
  aplicarIntranetFromDiscovery(): void {
    const mod = this.selectedModuleForIntranet;
    if (!mod) return;
    const menus = this.getMenusFlatFromDiscovery(mod);
    const selected = menus.filter(m => this.isDiscoveryMenuSelected(m));
    if (selected.length === 0) {
      this.notificationService.warning('Seleccione al menos un menú.');
      return;
    }
    const onSuccess = (response: any) => {
      const created = response?.data;
      if (!created?.id) return;
      this.systemManagementService.getSystemMenus(created.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            const hierarchical = res?.data?.menus || res?.data || [];
            const allMenus: any[] = [];
            const flatten = (arr: any[]) => {
              (arr || []).forEach((m: any) => {
                allMenus.push(m);
                flatten(m.children || m.submenus || []);
              });
            };
            flatten(Array.isArray(hierarchical) ? hierarchical : [hierarchical]);
            const menuIds: number[] = [];
            const norm = (s: string) => (s || '').toLowerCase().trim().replace(/\/+/g, '/').replace(/^\//, '');
            selected.forEach(sel => {
              const selName = this.extractMenuName(sel);
              const selRoute = norm(sel.route || sel.ruta || '');
              const match = allMenus.find((dm: any) => {
                const dmName = this.extractMenuName(dm) || (dm.nombre || '').trim();
                const dmRoute = norm(dm.ruta || dm.route || dm.codigo || '');
                return dmName === selName && (!selRoute || dmRoute === selRoute || dmRoute.endsWith(selRoute) || selRoute.endsWith(dmRoute));
              });
              if (match?.id) menuIds.push(match.id);
            });
            if (menuIds.length === 0) {
              this.loading = false;
              this.notificationService.error('No se pudieron identificar los menús seleccionados. Intente de nuevo.');
              this.cdr.markForCheck();
              return;
            }
            this.menuIntranetService.fromSistema(created.id, menuIds)
              .pipe(takeUntil(this.destroy$))
              .subscribe({
                next: (r) => {
                  this.loading = false;
                  this.closeIntranetFromDiscoveryModal();
                  this.loadSistemas();
                  this.loadMenusIntranet();
                  this.menuService.triggerMenuRefresh();
                  this.notificationService.success(r.success ? 'Agregado a INTRANET' : (r.message || 'Listo'));
                  this.cdr.detectChanges();
                },
                error: () => {
                  this.loading = false;
                  this.notificationService.error('Error al agregar a INTRANET');
                  this.cdr.markForCheck();
                }
              });
          },
          error: () => {
            this.loading = false;
            this.notificationService.error('Error al obtener menús del sistema');
            this.cdr.markForCheck();
          }
        });
    };
    this.integrateSystem(mod, false, false, false, onSuccess, selected.length);
  }

  viewSystemDetails(sistema: any): void {
    // Funciona tanto para sistemas integrados como descubiertos
    const integrado = sistema?.id
      ? this.sistemasIntegrados.find(s => s.id === sistema.id)
      : null;

    if (integrado) {
      // Sistema integrado: copiar datos y cargar menús desde API
      this.selectedSystemDetails = { ...integrado };
      this.showDetailsModal = true;
      this.cdr.markForCheck();
      this.loadHierarchicalMenus(integrado.id);
    } else if (sistema?.moduleInfo || sistema?.menusDetallados) {
      // Sistema descubierto: usar los datos que ya tiene
      this.selectedSystemDetails = { ...sistema };
      // Convertir menusDetallados a formato compatible con el modal
      if (sistema.menusDetallados?.length) {
        this.selectedSystemDetails.menus = sistema.menusDetallados.map((m: any) => ({
          id: m.id || Math.random(),
          nombre: this.extractMenuName(m),
          name: this.extractMenuName(m),
          ruta: m.route || m.ruta || '',
          route: m.route || m.ruta || '',
          icono: m.icon || m.icono || 'fas fa-circle',
          icon: m.icon || m.icono || 'fas fa-circle',
          orden: m.order || m.orden || 0,
          order: m.order || m.orden || 0,
          activo: m.active !== false,
          active: m.active !== false,
          nivel: m.nivel || m.level,
          level: m.nivel || m.level,
          parent_name: m.parent_name,
          permisos_requeridos: m.permisos_requeridos || m.permissions,
          submenus: m.submenus || []
        }));
        this.clearCaches();
        const flat = this.getMenusToShowFlat(this.selectedSystemDetails);
        const rawMenus = sistema.menusDetallados || sistema.moduleInfo?.menus || [];
        flat.forEach((norm: any, idx: number) => {
          const raw = rawMenus.find((r: any) =>
            (this.extractMenuName(r) === (norm.nombre || norm.name)) && ((r.route || r.ruta) === (norm.route || norm.ruta))
          ) || rawMenus[idx];
          if (raw && raw.visible_en_intranet) {
            this.setMenuVisibleEnIntranet(this.selectedSystemDetails, norm, true);
          }
        });
      }
      this.showDetailsModal = true;
      this.cdr.markForCheck();
    } else {
      this.notificationService.warning('No hay datos disponibles para este sistema.');
    }
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedSystemDetails = null;
    this.runMigrationTables = false;
    this.runSeederTables = false;
    this.runInstallDependencies = false;
    this.cdr.markForCheck();
  }

  /** Cierra el modal de detalles e inicia la integración (usa los checkboxes del modal) */
  confirmAndIntegrate(sistema: any): void {
    const runMigration = this.runMigrationTables;
    const runSeeder = this.runSeederTables;
    const runInstallDeps = this.runInstallDependencies;
    this.closeDetailsModal();
    this.integrateSystem(sistema, runMigration, runSeeder, runInstallDeps);
  }

  loadHierarchicalMenus(sistemaId: number): void {
    this.menuService.getMenusBySystem(sistemaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          if (this.selectedSystemDetails) {
            const data = res.success && res.data ? res.data : [];
            // Guardar en .menus para que getMenusToShow() lo encuentre
            this.selectedSystemDetails.menus = data;
            this.clearCaches();
            const flat = this.getMenusToShowFlat(this.selectedSystemDetails);
            flat.forEach((m: any) => {
              if (m.visible_en_intranet) {
                this.setMenuVisibleEnIntranet(this.selectedSystemDetails, m, true);
              }
            });
            this.cdr.markForCheck();
          }
        },
        error: () => {
          if (this.selectedSystemDetails) {
            // Si falla la API, mantener los menus que ya tenga el sistema
            if (!this.selectedSystemDetails.menus?.length) {
              this.selectedSystemDetails.menus = [];
            }
            this.cdr.markForCheck();
          }
        }
      });
  }

  // ─── CRUD de sistemas ───

  addSystem(): void {
    if (!this.newSystem.nombre?.trim()) {
      this.notificationService.error('El nombre del sistema es requerido');
      return;
    }
    if (!this.newSystem.codigo?.trim()) {
      this.notificationService.error('El código del sistema es requerido');
      return;
    }
    if (!this.newSystem.url_base?.trim()) {
      this.notificationService.error('La URL base del sistema es requerida');
      return;
    }

    try { new URL(this.newSystem.url_base); } catch {
      this.notificationService.error('La URL base no tiene un formato válido');
      return;
    }

    const duplicado = this.sistemasIntegrados.find(s =>
      s.codigo?.toUpperCase() === this.newSystem.codigo.toUpperCase()
    );
    if (duplicado && !confirm(`Ya existe un sistema con el código "${this.newSystem.codigo}" (${duplicado.nombre}). ¿Continuar?`)) {
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    const data = {
      nombre: this.newSystem.nombre.trim(),
      codigo: this.newSystem.codigo.trim().toUpperCase(),
      descripcion: this.newSystem.descripcion?.trim() || `Sistema ${this.newSystem.nombre}`,
      url_base: this.newSystem.url_base.trim(),
      activo: true,
      sso_habilitado: this.newSystem.usa_sso !== false,
      sso_force: false,
      sso_provider: 'basic',
      icono: this.newSystem.icono || 'fas fa-server',
      modo_ejecucion: this.newSystem.modo_ejecucion || 'iframe'
    };

    this.systemManagementService.createSystem(data)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.closeAddSystemModal();
            this.notificationService.success(`Sistema "${response.data.nombre}" agregado exitosamente`);
            setTimeout(() => this.loadSistemas(), 300);
          } else {
            this.loading = false;
            this.notificationService.error(`Error al agregar sistema: ${response.message || 'Error desconocido'}`);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(`Error de conexión: ${err.message || 'Error desconocido'}`);
          this.cdr.markForCheck();
        }
      });
  }

  editSystem(sistema: any): void {
    this.notificationService.info(`Editando sistema: ${sistema.nombre}`);
  }

  deactivateSystem(sistema: any): void {
    if (!sistema.id) {
      this.notificationService.error('ID del sistema no disponible');
      return;
    }

    this.systemManagementService.updateSystem(sistema.id, { activo: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const idx = this.sistemasIntegrados.findIndex(s => s.id === sistema.id);
            if (idx !== -1) this.sistemasIntegrados[idx].activo = false;
            this.notificationService.success(`Sistema ${sistema.nombre} desactivado`);
          } else {
            this.notificationService.error('Error al desactivar sistema: ' + response.message);
          }
          this.cdr.markForCheck();
        },
        error: () => {
          this.notificationService.error('Error al conectar con el servidor');
          this.cdr.markForCheck();
        }
      });
  }

  deleteSystem(sistema: any, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (!sistema.id) {
      this.notificationService.error('ID del sistema no disponible');
      return;
    }

    const msg = `¿Eliminar permanentemente el sistema "${sistema.nombre}"?\n\n` +
      `• ${sistema.totalMenus || 0} menús serán eliminados\n` +
      `• Todos los permisos y accesos serán eliminados\n\n` +
      `Esta acción no se puede deshacer.`;

    if (!confirm(msg)) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.systemManagementService.deleteSystem(sistema.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const idEliminar = Number(sistema.id);
            this.sistemasEliminados.add(idEliminar);
            this.saveEliminadosToStorage();
            this.sistemasIntegrados = this.sistemasIntegrados.filter(s => Number(s.id) !== idEliminar);
            this.clearCaches();
            this.notificationService.success(`Sistema "${sistema.nombre}" eliminado exitosamente`);

            // Refrescar el menú dinámico del sidebar para que desaparezcan los menús del sistema eliminado
            this.menuService.triggerMenuRefresh();
          } else {
            this.notificationService.error(`Error: ${response.message || 'No se pudo eliminar el sistema'}`);
          }
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          let errorMsg = 'Error desconocido';
          if (err.error?.message) errorMsg = err.error.message;
          else if (err.status === 500) errorMsg = 'Error interno del servidor';
          else if (err.status === 404) errorMsg = 'Sistema no encontrado';
          else if (err.status === 403) errorMsg = 'Sin permisos para eliminar';
          this.notificationService.error(`Error al eliminar "${sistema.nombre}": ${errorMsg}`);
          this.cdr.markForCheck();
        }
      });
  }

  // ─── Descubrimiento de sistemas ───

  discoverSystems(): void {
    const allowedTabs = ['discovery', 'menu-intranet'];
    if (!allowedTabs.includes(this.currentTab)) {
      this.notificationService.warning('El descubrimiento está disponible en Descubrir o Menú Intranet');
      return;
    }

    this.discovering = true;
    if (this.currentTab === 'discovery') {
      this.sistemasDescubiertos = [];
    }
    this.cdr.markForCheck();

    this.moduleDiscoveryService.discoverModules()
      .pipe(takeUntil(this.destroy$), finalize(() => { this.discovering = false; this.cdr.markForCheck(); }))
      .subscribe({
        next: (response: any) => {
          try {
            const responseData = response?.data ?? response;
            const modules: any[] = responseData?.modules ?? (Array.isArray(responseData) ? responseData : []);

            if (response?.success && modules.length > 0) {
              if (this.currentTab === 'discovery') {
                const noIntegrados = modules.filter((m: any) => {
                  if (m.status === 'error') return false;
                  if (m.already_integrated === true) return false;
                  const code = (m.name || '').toLowerCase();
                  // Ocultar solo si ya está como subsistema integrado (no solo menú INTRANET)
                  return !this.sistemasIntegrados.some(s =>
                    (s.codigo || '').toLowerCase() === code && !s.solo_intranet
                  );
                });
                const modulosConError = modules.filter((m: any) => m.status === 'error');
                const yaIntegrados = modules.filter((m: any) => m.already_integrated === true);
                this.sistemasDescubiertos = noIntegrados.map((module: any) => this.mapDiscoveredModule(module));
                const autorizados = this.sistemasDescubiertos.filter(s => s.autorizado).length;
                let msg = `${this.sistemasDescubiertos.length} módulos disponibles`;
                if (yaIntegrados.length > 0) msg += `, ${yaIntegrados.length} ya integrados`;
                if (modulosConError.length > 0) msg += `, ${modulosConError.length} no autorizados`;
                if (autorizados > 0) msg += ` — ${autorizados} listos para integrar`;
                this.notificationService.success(msg);
              }
              if (this.currentTab === 'menu-intranet') {
                this.showIntranetSelectModal = true;
                this.intranetSelection = {};
                // No llamar loadSistemas en el callback para evitar ciclo; sistemasIntegrados ya están cargados al cambiar a la pestaña
                this.notificationService.success(`${modules.length} módulos escaneados.`);
                this.cdr.detectChanges(); // Forzar actualización inmediata del modal (OnPush)
              }
            } else {
              this.notificationService.info('No se encontraron módulos disponibles para descubrir');
            }
          } finally {
            this.discovering = false;
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          this.discovering = false;
          let errorMsg = 'Error desconocido';
          if (err.name === 'TimeoutError' || err.message?.includes('timeout')) {
            errorMsg = 'Tiempo de espera agotado. El backend puede estar procesando muchos módulos. Intente de nuevo.';
          } else if (err.error?.message) errorMsg = err.error.message;
          else if (err.status === 401 || err.status === 403) errorMsg = 'Sin autorización para descubrir módulos';
          else if (err.status === 404) errorMsg = 'Endpoint de descubrimiento no encontrado';
          else if (err.status === 500) errorMsg = 'Error interno del servidor';
          this.notificationService.error(`Error al descubrir sistemas: ${errorMsg}`);
          this.cdr.markForCheck();
        }
      });
  }

  /**
   * Mapea un módulo descubierto a la estructura que espera el componente.
   * Busca menús en múltiples campos posibles y normaliza los nombres.
   */
  private mapDiscoveredModule(module: any): any {
    let rawMenus: any[] = [];
    if (Array.isArray(module.menus)) rawMenus = module.menus;
    else if (module.patron_data?.menus) rawMenus = module.patron_data.menus;

    // Filtrar menús que tengan nombre válido en cualquier campo posible
    const menusValidos = rawMenus.filter((m: any) => this.hasValidName(m));
    const menusPrincipales = menusValidos.filter((m: any) => !m.level || m.level === 1 || m.nivel === 1).length;
    const submenus = menusValidos.filter((m: any) => m.level === 2 || m.nivel === 2).length;

    const statsTotal = menusValidos.length || module.menus_count || module.total_menus || 0;
    const statsPrinc = menusPrincipales || module.main_menus || 0;
    const statsSub = submenus || (typeof module.submenus === 'number' ? module.submenus : 0);

    // Mapear menús detallados con nombres robustos
    const menusDetallados = menusValidos.map((menu: any) => ({
      id: menu.id || Math.random(),
      name: this.extractMenuName(menu),
      nombre: this.extractMenuName(menu),
      route: menu.route || menu.ruta || '#',
      ruta: menu.route || menu.ruta || '#',
      icon: menu.icon || menu.icono || 'fas fa-circle',
      icono: menu.icon || menu.icono || 'fas fa-circle',
      level: menu.level || menu.nivel || 1,
      nivel: menu.level || menu.nivel || 1,
      parent_id: menu.parent_id || null,
      parent_name: menu.parent_name || null,
      active: menu.active !== false,
      activo: menu.active !== false,
      visible: menu.visible !== false,
      order: menu.order || menu.orden || 1,
      description: menu.description || menu.descripcion || ''
    }));

    // Un módulo está autorizado si no tiene error y reporta menús (propios o vía contadores del backend)
    const esAutorizado = module.status !== 'error' && statsTotal > 0;

    return {
      nombre: module.display_name || module.name,
      descripcion: module.description || `Módulo ${module.name}`,
      modulos: 1,
      rutasApi: 0,
      menus: statsTotal,
      menusPrincipales: statsPrinc,
      submenus: statsSub,
      moduleInfo: { ...module, menus: menusValidos.length > 0 ? menusValidos : undefined },
      menusDetallados,
      menusExpanded: false,
      tieneMenus: statsTotal > 0,
      autorizado: esAutorizado,
      status: module.status || 'available'
    };
  }

  loadSystemMenus(sistema: any): void {
    if (!sistema.moduleInfo?.menus) {
      this.notificationService.warning(`No se encontraron menús para ${sistema.nombre}`);
      return;
    }

    sistema.menusDetallados = sistema.moduleInfo.menus.map((menu: any) => ({
      id: menu.id || Math.random(),
      name: this.extractMenuName(menu),
      route: menu.route,
      icon: menu.icon || 'fas fa-circle',
      level: menu.level || 1,
      parent_id: menu.parent_id,
      parent_name: menu.parent_name,
      active: menu.active !== false,
      visible: menu.visible !== false,
      order: menu.order || menu.orden || 1,
      badge: menu.badge,
      color: menu.color
    }));

    this.notificationService.success(`${sistema.menusDetallados.length} menús cargados para ${sistema.nombre}`);
    this.cdr.markForCheck();
  }

  // ─── Integración de sistemas ───

  integrateSystem(sistema: any, runMigrationTables = false, runSeederTables = false, runInstallDependencies = false, onSuccess?: (response: any) => void, selectedMenusCount?: number): void {
    if (sistema.autorizado === false) {
      this.notificationService.error(`El módulo "${sistema.nombre}" no está autorizado para integrarse.`);
      return;
    }

    if (!sistema.moduleInfo) {
      this.notificationService.error('Información del módulo no disponible');
      return;
    }

    const menusParaIntegracion = sistema.menusDetallados || sistema.moduleInfo.menus || [];

    // Si no hay menús cargados pero el backend reporta que existen, cargarlos primero
    if (menusParaIntegracion.length === 0 && (sistema.menus > 0 || sistema.moduleInfo.menus_count > 0)) {
      this.notificationService.info(`Cargando menús de "${sistema.nombre}"...`);
      const moduleName = sistema.moduleInfo.name || sistema.nombre;
      this.moduleDiscoveryService.getModuleMenus(moduleName)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            if (res.success && res.data?.menus?.length > 0) {
              sistema.moduleInfo.menus = res.data.menus;
              sistema.menusDetallados = res.data.menus.map((menu: any) => ({
                id: menu.id || Math.random(),
                name: this.extractMenuName(menu),
                nombre: this.extractMenuName(menu),
                route: menu.route || menu.ruta || '#',
                icon: menu.icon || menu.icono || 'fas fa-circle',
                level: menu.level || menu.nivel || 1,
                nivel: menu.level || menu.nivel || 1,
                parent_id: menu.parent_id || null,
                parent_name: menu.parent_name || null,
                active: menu.active !== false,
                order: menu.order || menu.orden || 1,
                permissions: menu.permissions || [],
                description: menu.description || ''
              }));
              this.cdr.markForCheck();
              // Reintentar integración con los menús cargados
              this.integrateSystem(sistema, runMigrationTables, runSeederTables, runInstallDependencies);
            } else {
              this.notificationService.error(`No se encontraron menús para "${sistema.nombre}".`);
            }
          },
          error: () => {
            this.notificationService.error(`Error cargando menús de "${sistema.nombre}".`);
          }
        });
      return;
    }

    if (menusParaIntegracion.length === 0) {
      this.notificationService.error(`"${sistema.nombre}" no tiene menús configurados.`);
      return;
    }

    const menusValidados = menusParaIntegracion
      .filter((m: any) => this.hasValidName(m))
      .map((menu: any) => {
        const menuName = this.extractMenuName(menu) || 'Menú sin nombre';
        return {
          name: menuName,
          nombre: menuName,
          codigo: menu.route
            ? menu.route.replace(/^\//, '').replace(/\//g, '_').toUpperCase()
            : `MENU_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          route: menu.route || menu.ruta || '/',
          ruta: menu.route || menu.ruta || '/',
          descripcion: menu.description || menu.descripcion || `Menú ${menuName}`,
          icono: menu.icon || menu.icono || 'fas fa-circle',
          icon: menu.icon || menu.icono || 'fas fa-circle',
          orden: menu.order || menu.orden || 0,
          order: menu.order || menu.orden || 0,
          estado_default: menu.active !== undefined ? menu.active : true,
          active: menu.active !== undefined ? menu.active : true,
          visible_en_intranet: this.getMenuVisibleEnIntranet(sistema, menu) || !!menu.visible_en_intranet,
          permisos_requeridos: Array.isArray(menu.permissions) ? menu.permissions
            : (Array.isArray(menu.permisos_requeridos) ? menu.permisos_requeridos : []),
          permissions: Array.isArray(menu.permissions) ? menu.permissions
            : (Array.isArray(menu.permisos_requeridos) ? menu.permisos_requeridos : []),
          nivel: menu.level || menu.nivel || 1,
          level: menu.level || menu.nivel || 1,
          parent_id: menu.parent_id || null,
          parent_name: menu.parent_name || null,
          submenus: menu.submenus || []
        };
      });

    const codigoUnico = sistema.moduleInfo.name.toLowerCase();

    const sistemaCompleto = {
      nombre: sistema.nombre || sistema.moduleInfo.display_name || sistema.moduleInfo.name,
      codigo: codigoUnico,
      descripcion: sistema.descripcion || sistema.moduleInfo.description || `Sistema ${sistema.moduleInfo.name}`,
      url_base: `http://localhost:8000/api/${sistema.moduleInfo.name.toLowerCase()}`,
      activo: true,
      sso_habilitado: true,
      sso_force: false,
      sso_provider: 'basic',
      run_migration_tables: runMigrationTables,
      run_seeder_tables: runSeederTables,
      run_install_dependencies: runInstallDependencies,
      patron_data: {
        id: `patron_${sistema.moduleInfo.name.toLowerCase()}_${Date.now()}`,
        nombre: `Patrón ${sistema.nombre}`,
        codigo: sistema.moduleInfo.name.toUpperCase(),
        descripcion: `Patrón para ${sistema.nombre}`,
        categoria: 'sistema_descubierto',
        menus: menusValidados
      }
    };

    const confirmMsg = selectedMenusCount !== undefined
      ? `¿Integrar "${sistemaCompleto.nombre}" y agregar ${selectedMenusCount} menú(s) seleccionado(s) a INTRANET?`
      : `¿Integrar "${sistemaCompleto.nombre}" con ${menusValidados.length} menús?`;
    if (!confirm(confirmMsg)) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.systemManagementService.createSystem(sistemaCompleto)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            const created: any = response.data;
            if (onSuccess) {
              onSuccess(response);
            } else {
              this.loading = false;
            }
            this.sistemasDescubiertos = this.sistemasDescubiertos.filter(s => s.nombre !== sistema.nombre);
            this.notificationService.success(`Sistema "${sistemaCompleto.nombre}" integrado exitosamente`);
            this.loadSistemas();
            // Sidebar con retraso para evitar parpadeo/refresh de la vista
            setTimeout(() => this.menuService.triggerMenuRefresh(), 600);

            // Mostrar ventana de log con el resumen de integración (migraciones, seeder, dependencias)
            const summary = (response as any).integration_summary;
            if (summary) {
              this.lastIntegrationSummaryText = summary;
              this.showIntegrationLogModal = true;
              this.cdr.markForCheck();
            }
            // Si no vino resumen en la respuesta pero se pidió algo en segundo plano, sondear (ej. solo dependencias)
            if ((runMigrationTables || runSeederTables || runInstallDependencies) && !summary) {
              this.startPollingIntegrationSummary();
            }
            if (!onSuccess) {
              this.cdr.markForCheck();
            }
          } else {
            this.loading = false;
            this.notificationService.error(`Error: ${response.message || 'Error desconocido'}`);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.loading = false;
          this.notificationService.error(`Error de conexión: ${err.message || 'Error desconocido'}`);
          this.cdr.markForCheck();
        }
      });
  }

  /** Sonda el backend cada 5s para obtener el resumen de la última integración (máx. 12 intentos = 1 min). */
  startPollingIntegrationSummary(attempt = 0): void {
    const maxAttempts = 12;
    const intervalMs = 5000;

    if (attempt >= maxAttempts) {
      this.integrationPollingTimer = null;
      this.notificationService.info(
        'El resumen del proceso no está disponible aún. Si usa cola en segundo plano, asegure tener un worker activo (php artisan queue:work). Puede ver el log en el servidor buscando [INTEGRACIÓN SUBSISTEMA].'
      );
      this.cdr.markForCheck();
      return;
    }

    this.systemManagementService.getLastIntegrationSummary()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          if (res.success && res.data?.summary) {
            this.integrationPollingTimer = null;
            this.lastIntegrationSummaryText = res.data.summary;
            this.showIntegrationLogModal = true;
            this.cdr.markForCheck();
            return;
          }
          this.integrationPollingTimer = setTimeout(() => this.startPollingIntegrationSummary(attempt + 1), intervalMs);
        },
        error: () => {
          this.integrationPollingTimer = setTimeout(() => this.startPollingIntegrationSummary(attempt + 1), intervalMs);
        }
      });
  }

  closeIntegrationLogModal(): void {
    this.showIntegrationLogModal = false;
    this.lastIntegrationSummaryText = '';
    this.cdr.markForCheck();
  }

  // ─── Acciones de menús ───

  editMenu(menu: any): void {
    this.currentTab = 'menus';
  }

  toggleMenu(menu: any): void {
    this.notificationService.info(`Cambiando estado del menú: ${menu.nombre}`);
  }

  deleteMenu(menu: any): void {
    if (confirm(`¿Eliminar el menú "${menu.nombre}"?`)) {
      this.notificationService.warning(`Eliminando menú: ${menu.nombre}`);
    }
  }

  // ─── Navegación ───

  navigateToSystemManagement(): void {
    this.router.navigate(['/admin-menu-management/systems']);
  }

  navigateToModuleDiscovery(): void {
    this.router.navigate(['/admin-menu-management/module-discovery']);
  }

  openUserAccessManagement(): void {
    this.router.navigate(['/admin-menu-management/user-access']);
  }

  refreshAccessData(): void {
    this.loadSistemas();
    this.notificationService.success('Datos de accesos actualizados');
  }

  openProfessionalRoles(): void {
    this.currentTab = 'professional-roles';
  }

  openProfessionalMenuPermissions(): void {
    this.currentTab = 'professional-menu-permissions';
  }

  getTabIcon(tab: string): string {
    const icons: Record<string, string> = {
      'overview': 'fas fa-tachometer-alt', 'menus': 'fas fa-bars',
      'roles': 'fas fa-users-cog', 'users': 'fas fa-users',
      'permissions': 'fas fa-key', 'reports': 'fas fa-chart-bar'
    };
    return icons[tab] || 'fas fa-circle';
  }

  getTabColor(tab: string): string {
    const colors: Record<string, string> = {
      'overview': 'primary', 'menus': 'info', 'roles': 'warning',
      'users': 'success', 'permissions': 'danger', 'reports': 'secondary'
    };
    return colors[tab] || 'secondary';
  }
}
