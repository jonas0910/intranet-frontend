import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { DataTablesModule, DataTableDirective } from 'angular-datatables';
import { RoleService, Role, Permission } from '../../../services/role.service';
import { AccesoRolesService, AccesoRolPlantilla } from '../../../services/acceso-roles.service';
import { SystemManagementService, SystemMenu } from '../../../services/system-management.service';
import { DesignSystemService, CrudViewConfig, ModalCrudConfig } from '../../../services/design-system.service';
import { AuthService } from '../../../services/auth.service';
import { PageHeaderComponent, LoadingSpinnerComponent } from '../../../shared/components';
import {
  ADMIN_SIDEBAR_FIXED_MENU_SECTIONS,
  ADMIN_SIDEBAR_LINK_PERMS,
  ADMIN_SIDEBAR_MENU_MATRIX,
  SIDEBAR_MENU_OP_COLUMNS,
  getAllSidebarMatrixPermissionNames,
  type AdminSidebarLinkKey,
  type SidebarMenuOpKey,
} from '../../../config/admin-sidebar.config';

export type RoleMainTabId = 'roles' | 'matrix' | 'menus-rol' | 'herramientas';

export interface MenuPlantillaRow {
  sistemaId: number;
  sistemaNombre: string;
  menuId: number;
  nombre: string;
  ruta?: string;
  nivel: number;
}

/** Nodo de menú con UI expand/collapse (mismo patrón que accesos de usuario) */
export interface MenuRolTreeNode extends SystemMenu {
  expanded?: boolean;
  children?: MenuRolTreeNode[];
}

/** Un subsistema (sistema integrado) con su árbol de menús */
export interface SistemaMenusRolVista {
  id: number;
  nombre: string;
  codigo: string;
  expanded: boolean;
  menus: MenuRolTreeNode[];
}

export interface MenuPlantillaFlags {
  assigned: boolean;
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface RolePermission {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  users_count: number;
  created_at: string;
  granted: boolean;
}

@Component({
  selector: 'app-role-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, DataTablesModule, PageHeaderComponent, LoadingSpinnerComponent],
  templateUrl: './role-permissions.component.html',
  styleUrl: './role-permissions.component.scss'
})
export class RolePermissionsComponent implements OnInit, OnDestroy {
  /**
   * Nombres Spatie del menú fijo: matriz en `admin-sidebar.config.ts` + extras que aún pueden existir en BD.
   */
  private static readonly PERMISO_NAMES_MENU_LATERAL_FIJO = new Set<string>([
    ...getAllSidebarMatrixPermissionNames(),
    'tramite.dashboard.ver',
    'admin.accesos',
    'admin.sistemas',
  ]);

  roles: Role[] = [];
  selectedRole: Role | null = null;
  availablePermissions: Permission[] = [];
  permissionsByModule: { [key: string]: Permission[] } = {};

  /** Pestaña principal de la pantalla */
  activeMainTab: RoleMainTabId = 'roles';

  readonly mainTabs: Array<{ id: RoleMainTabId; label: string; desc: string; icon: string }> = [
    { id: 'roles', label: 'Roles', desc: 'Alta, edición y permisos Spatie por rol', icon: 'fas fa-user-shield' },
    { id: 'menus-rol', label: 'Menús / sistemas', desc: 'Plantillas intranet (accesos_roles)', icon: 'fas fa-sitemap' },
    { id: 'matrix', label: 'Matriz', desc: 'Quién tiene cada permiso', icon: 'fas fa-th' },
    { id: 'herramientas', label: 'Herramientas', desc: 'Copias y resumen del sistema', icon: 'fas fa-toolbox' }
  ];

  /** Subsistemas con árbol de menús (vista acordeón + chevrons) plantilla accesos_roles */
  sistemasMenusRol: SistemaMenusRolVista[] = [];
  /** Subsistema seleccionado en la pestaña «Menús / sistemas» (combo). */
  menusRolFocusedSistemaId: number | null = null;
  menuPlantillaState: Record<string, MenuPlantillaFlags> = {};
  menuRolSelectedId: number | null = null;
  menuPlantillaSearch = '';
  loadingMenuCatalog = false;
  savingPlantillas = false;
  syncingUsuariosRol = false;
  menuCatalogLoaded = false;
  /** Invalida respuestas HTTP obsoletas si se dispara una nueva carga de catálogo. */
  private menuCatalogLoadGeneration = 0;

  /** Filtro de módulo en pestaña Matriz ('all' = todos) */
  matrixModuleFilter = 'all';

  /** Copiar permisos: IDs de roles origen y destino */
  copyFromRoleId: number | null = null;
  copyToRoleId: number | null = null;

  isLoading = false;
  showPermissionModal = false;
  /** Carga del detalle del rol al abrir el modal de permisos */
  permissionModalLoading = false;
  /** Filtro de texto dentro del modal de permisos */
  permissionModalSearch = '';
  /**
   * Modal permisos: Spatie vs plantilla que materializa filas tipo accesos_usuarios (sistema_id, menu_id, permisos…).
   */
  permissionModalSection: 'spatie' | 'accesos' = 'spatie';
  /** Sub-pestaña por sistema_id (columna real accesos_usuarios.sistema_id) */
  permissionModalSistemaId: number | null = null;
  showCreateModal = false;
  showEditModal = false;

  // Design System
  cv!: CrudViewConfig;
  mc!: ModalCrudConfig;

  // DataTables (patrón sistema de diseño)
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  @ViewChild(DataTableDirective, { static: false }) dtElement!: DataTableDirective;

  readonly breadcrumbs = [
    { label: 'Administración', url: '/admin-menu-management' },
    { label: 'Gestión de roles y permisos' }
  ];

  /** Referencia visual: misma jerarquía que el sidebar (ADMINISTRACIÓN). */
  readonly adminSidebarFixedMenuSections = ADMIN_SIDEBAR_FIXED_MENU_SECTIONS;
  readonly adminSidebarLinkPerms = ADMIN_SIDEBAR_LINK_PERMS;
  readonly sidebarMenuOpColumns = SIDEBAR_MENU_OP_COLUMNS;

  /** Lista detallada por módulo (catálogo BD) — secundaria. */
  permissionModalShowSpatieByModule = false;

  /** Evita reconstruir bloques en cada CD (referencias estables para *ngFor). */
  private permissionModalModuleBlocksPermRef: Permission[] | null = null;
  private permissionModalModuleBlocksSearchSnapshot = '';
  private cachedPermissionModalModuleBlocks: Array<{
    key: string;
    title: string;
    permissions: Permission[];
  }> = [];

  roleForm = {
    name: '',
    guard_name: 'web'
  };

  constructor(
    private roleService: RoleService,
    private dsService: DesignSystemService,
    private accesoRolesService: AccesoRolesService,
    private systemManagement: SystemManagementService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    this.cv = this.dsService.getCrudViewFor('admin');
    this.mc = this.dsService.getModalCrudFor('admin');
    this.initDataTable();
    this.loadRoles();
    this.loadPermissions();
  }

  ngOnDestroy(): void {
    // No llamar dtTrigger.complete(): evita ObjectUnsubscribedError si el componente se reutiliza.
  }

  initDataTable(): void {
    const pageLength = this.cv?.defaultPageSize ?? 10;
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, 'Todos']],
      processing: true,
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>rt<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',
      language: { url: 'assets/datatables/i18n/es-ES.json' },
      order: [[0, 'asc']],
      columnDefs: [
        { targets: 0, width: '50px' },
        { targets: -1, orderable: false, searchable: false }
      ]
    };
  }

  private triggerDataTable(): void {
    const safeNext = () => {
      try {
        if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
      } catch (_) { /* Subject already closed (e.g. component destroyed) */ }
    };
    if (this.dtElement?.dtInstance) {
      this.dtElement.dtInstance.then((dtInstance: any) => {
        dtInstance.destroy();
        safeNext();
      });
    } else {
      setTimeout(safeNext, 0);
    }
  }

  loadRoles(): void {
    this.isLoading = true;
    this.roleService.obtenerRoles().subscribe({
      next: (roles: Role[]) => {
        this.roles = roles;
        this.syncCopyRoleDefaults();
        this.isLoading = false;
        this.triggerDataTable();
      },
      error: (error) => {
        console.error('Error cargando roles:', error);
        this.isLoading = false;
        this.triggerDataTable();
        alert('Error al cargar roles: ' + (error.error?.message || error.message));
      }
    });
  }

  loadPermissions(): void {
    this.roleService.obtenerPermisos().subscribe({
      next: (permissions: Permission[]) => {
        this.availablePermissions = permissions;
        this.permissionsByModule = this.roleService.agruparPermisosPorModulo(permissions);
        this.matrixModuleFilter = 'all';
      },
      error: (error) => {
        console.error('Error cargando permisos:', error);
        alert('Error al cargar permisos: ' + (error.error?.message || error.message));
      }
    });
  }

  selectRole(role: Role): void {
    this.permissionModalSearch = '';
    this.permissionModalSection = 'spatie';
    this.permissionModalSistemaId = null;
    this.permissionModalLoading = true;
    this.showPermissionModal = true;
    this.selectedRole = null;

    this.roleService.obtenerRol(role.id).subscribe({
      next: (data) => {
        const r = data?.role as Role | undefined;
        if (r) {
          this.selectedRole = {
            ...r,
            permissions: Array.isArray(r.permissions) ? r.permissions.map((p) => ({ ...p })) : [],
          };
        } else {
          this.selectedRole = {
            ...role,
            permissions: Array.isArray(role.permissions) ? role.permissions.map((p) => ({ ...p })) : [],
          };
        }
        this.permissionModalLoading = false;
        this.startMenuLoadForPermissionModal(role.id);
      },
      error: (err) => {
        console.error(err);
        this.selectedRole = {
          ...role,
          permissions: Array.isArray(role.permissions) ? role.permissions.map((p) => ({ ...p })) : [],
        };
        this.permissionModalLoading = false;
        alert(
          'No se pudo recargar el rol desde el servidor; se usan los datos de la tabla. ' +
            (err.error?.message || err.message || '')
        );
        this.startMenuLoadForPermissionModal(role.id);
      },
    });
  }

  /** Carga catálogo + plantilla accesos_roles para el mismo rol del modal (equivale a filas accesos_usuarios origen=rol). */
  private startMenuLoadForPermissionModal(roleId: number): void {
    this.menuRolSelectedId = roleId;
    this.permissionModalSistemaId = null;
    this.menuCatalogLoaded = false;
    this.loadMenuCatalogAndPlantillas();
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.permissionModalLoading = false;
    this.permissionModalSearch = '';
    this.permissionModalShowSpatieByModule = false;
    this.permissionModalSection = 'spatie';
    this.permissionModalSistemaId = null;
    this.selectedRole = null;
  }

  setPermissionModalSection(section: 'spatie' | 'accesos'): void {
    this.permissionModalSection = section;
    if (section === 'accesos') {
      this.ensureDefaultModalSistemaTab();
    }
  }

  ensureDefaultModalSistemaTab(): void {
    if (!this.sistemasMenusRol.length) {
      this.permissionModalSistemaId = null;
      return;
    }
    if (
      this.permissionModalSistemaId != null &&
      this.sistemasMenusRol.some((s) => s.id === this.permissionModalSistemaId)
    ) {
      return;
    }
    this.permissionModalSistemaId = this.sistemasMenusRol[0].id;
  }

  get permissionModalSistemaActivo(): SistemaMenusRolVista | null {
    if (this.permissionModalSistemaId == null) {
      return null;
    }
    return this.sistemasMenusRol.find((s) => s.id === this.permissionModalSistemaId) ?? null;
  }

  /** Subsistema mostrado en la pestaña principal «Menús / sistemas». */
  get menusRolSistemaActivo(): SistemaMenusRolVista | null {
    if (this.menusRolFocusedSistemaId == null) {
      return null;
    }
    return this.sistemasMenusRol.find((s) => s.id === this.menusRolFocusedSistemaId) ?? null;
  }

  private ensureMenusRolFocusedSistema(): void {
    if (!this.sistemasMenusRol.length) {
      this.menusRolFocusedSistemaId = null;
      return;
    }
    if (
      this.menusRolFocusedSistemaId != null &&
      this.sistemasMenusRol.some((s) => s.id === this.menusRolFocusedSistemaId)
    ) {
      return;
    }
    this.menusRolFocusedSistemaId = this.sistemasMenusRol[0].id;
  }

  /** Texto del botón principal del modal según pestaña activa */
  get permissionModalSaveButtonLabel(): string {
    return this.permissionModalSection === 'spatie'
      ? 'Guardar permisos Spatie (rol completo)'
      : 'Guardar plantilla menús (accesos_roles → usuarios)';
  }

  savePermissionModalPrimary(): void {
    if (this.permissionModalSection === 'spatie') {
      this.savePermissions();
    } else {
      this.guardarPlantillasMenus();
    }
  }

  /** Comparar IDs de permiso (API puede devolver número o string) */
  private samePermissionId(a: number | string | undefined, b: number | string | undefined): boolean {
    return String(a) === String(b);
  }

  togglePermission(permission: Permission): void {
    if (this.selectedRole) {
      const list = this.selectedRole.permissions || [];
      const idx = list.findIndex((p) => this.samePermissionId(p.id, permission.id));
      if (idx >= 0) {
        this.selectedRole.permissions = list.filter((_, i) => i !== idx);
      } else {
        this.selectedRole.permissions = [...list, permission];
      }
    }
  }

  /** ¿El permiso corresponde al allowlist del menú lateral fijo? */
  isPermisoSidebarFijo(permissionName: string): boolean {
    return RolePermissionsComponent.PERMISO_NAMES_MENU_LATERAL_FIJO.has(permissionName);
  }

  /** Subconjunto del catálogo Spatie = solo ítems del menú fijo */
  get permisosSpatieMenuLateralFijo(): Permission[] {
    return this.availablePermissions.filter((p) => this.isPermisoSidebarFijo(p.name));
  }

  /** Cuántos de esos permisos tiene ya asignados el rol (vista modal) */
  get permisosSidebarFijosAsignadosAlRol(): number {
    if (!this.selectedRole?.permissions?.length) {
      return 0;
    }
    return this.selectedRole.permissions.filter((p) => this.isPermisoSidebarFijo(p.name)).length;
  }

  /**
   * Misma regla que el sidebar: solo el rol **Super Admin** ve todo el bloque sin la matriz.
   * Un rol «ADMIN» u otros administrativos dependen solo de los permisos Spatie asignados.
   */
  selectedRolePreviewFullAdminBlock(): boolean {
    const role = this.selectedRole;
    if (!role) {
      return false;
    }
    const rn = (role.name || '').trim().toLowerCase();
    return (
      rn === 'super admin' ||
      rn === 'super_admin' ||
      rn.replace(/[\s_-]/g, '') === 'superadmin'
    );
  }

  /**
   * Mapa «orden del sidebar» en el modal: siempre Visible para no marcar filas como «No cubierto»
   * mientras se edita; la cobertura real sigue en la matriz y en los permisos asignados.
   */
  sidebarRowPreviewVisible(_key: AdminSidebarLinkKey): boolean {
    return true;
  }

  /** Permisos Spatie asociados a una celda Ver / CRUD / Gestionar. */
  menuMatrixNames(key: AdminSidebarLinkKey, op: SidebarMenuOpKey): readonly string[] {
    return ADMIN_SIDEBAR_MENU_MATRIX[key][op] ?? [];
  }

  /** Tooltip si faltan filas en `permissions` del API. */
  menuMatrixCellCatalogTitle(key: AdminSidebarLinkKey, op: SidebarMenuOpKey): string {
    const miss = this.menuMatrixCellMissingInCatalog(key, op);
    if (!miss.length) {
      return '';
    }
    return 'No están en el catálogo (cree en BD o ejecute seeders): ' + miss.join(', ');
  }

  /** Casilla marcada si el rol tiene al menos uno de los permisos de esa celda. */
  roleHasMenuMatrixCell(key: AdminSidebarLinkKey, op: SidebarMenuOpKey): boolean {
    const names = this.menuMatrixNames(key, op);
    if (!names.length || !this.selectedRole?.permissions?.length) {
      return false;
    }
    const granted = new Set(this.selectedRole.permissions.map((p) => p.name));
    return names.some((n) => granted.has(n));
  }

  /** Permisos de la celda que no existen en el catálogo cargado (no se pueden asignar hasta crearlos en BD). */
  menuMatrixCellMissingInCatalog(key: AdminSidebarLinkKey, op: SidebarMenuOpKey): string[] {
    const names = this.menuMatrixNames(key, op);
    if (!names.length) {
      return [];
    }
    const catalog = new Set(this.availablePermissions.map((p) => p.name));
    return names.filter((n) => !catalog.has(n));
  }

  /**
   * `na`: sin permisos mapeados para esa columna en `ADMIN_SIDEBAR_MENU_MATRIX`.
   * `missing`: hay nombres pero ninguno existe en el catálogo API.
   * `ok`: se puede marcar/desmarcar.
   */
  matrixCellMode(key: AdminSidebarLinkKey, op: SidebarMenuOpKey): 'na' | 'missing' | 'ok' {
    const names = this.menuMatrixNames(key, op);
    if (!names.length) {
      return 'na';
    }
    const catalog = new Set(this.availablePermissions.map((p) => p.name));
    if (!names.some((n) => catalog.has(n))) {
      return 'missing';
    }
    return 'ok';
  }

  matrixCellTitle(key: AdminSidebarLinkKey, op: SidebarMenuOpKey, colHint: string): string {
    const mode = this.matrixCellMode(key, op);
    if (mode === 'na') {
      return 'No hay permiso Spatie asignado a esta acción en admin-sidebar.config.ts (p. ej. el módulo solo expone consulta).';
    }
    if (mode === 'missing') {
      return (
        this.menuMatrixCellCatalogTitle(key, op) ||
        'Ninguno de los permisos de esta celda está en el catálogo cargado desde la API.'
      );
    }
    return this.menuMatrixCellCatalogTitle(key, op) || colHint;
  }

  toggleMenuMatrixCell(key: AdminSidebarLinkKey, op: SidebarMenuOpKey, checked: boolean): void {
    const names = [...this.menuMatrixNames(key, op)];
    if (!names.length || !this.selectedRole) {
      return;
    }
    const byName = new Map(this.availablePermissions.map((p) => [p.name, p]));
    let next = [...(this.selectedRole.permissions || [])];
    const nameSet = new Set(names);
    if (checked) {
      const missing = names.filter((n) => !byName.has(n));
      if (missing.length) {
        alert(
          'Estos permisos no están en el catálogo de la API (tabla permissions). ' +
            'Ejecute en el servidor: php artisan db:seed --class=SidebarFixedSpatiePermissionsSeeder\n\n' +
            missing.join(', ')
        );
        return;
      }
      for (const name of names) {
        const p = byName.get(name)!;
        if (!next.some((x) => x.name === p.name)) {
          next.push(p);
        }
      }
    } else {
      next = next.filter((x) => !nameSet.has(x.name));
    }
    this.selectedRole.permissions = next;
  }

  private filterPermsForModalSearch(perms: Permission[]): Permission[] {
    const q = (this.permissionModalSearch || '').trim().toLowerCase();
    if (!q) {
      return perms;
    }
    return perms.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        this.getPermissionName(p).toLowerCase().includes(q)
    );
  }

  private rebuildPermissionModalModuleBlocks(): Array<{
    key: string;
    title: string;
    permissions: Permission[];
  }> {
    const grouped = this.roleService.agruparPermisosPorModulo(this.permisosSpatieMenuLateralFijo);
    const keys = Object.keys(grouped).sort(
      (a, b) =>
        this.getModuleSortOrder(a) - this.getModuleSortOrder(b) || a.localeCompare(b, 'es')
    );
    const blocks: Array<{ key: string; title: string; permissions: Permission[] }> = [];
    for (const modKey of keys) {
      const perms = this.filterPermsForModalSearch(grouped[modKey] || []);
      if (perms.length) {
        blocks.push({
          key: modKey,
          title: this.getModuleCategoryTitle(modKey),
          permissions: perms,
        });
      }
    }
    return blocks;
  }

  private ensurePermissionModalModuleBlocksCache(): void {
    const permRef = this.availablePermissions;
    const q = this.permissionModalSearch || '';
    if (
      this.permissionModalModuleBlocksPermRef === permRef &&
      this.permissionModalModuleBlocksSearchSnapshot === q
    ) {
      return;
    }
    this.permissionModalModuleBlocksPermRef = permRef;
    this.permissionModalModuleBlocksSearchSnapshot = q;
    this.cachedPermissionModalModuleBlocks = this.rebuildPermissionModalModuleBlocks();
  }

  /** Bloques por área solo para permisos del menú lateral fijo */
  get permissionModalModuleBlocks(): Array<{ key: string; title: string; permissions: Permission[] }> {
    this.ensurePermissionModalModuleBlocksCache();
    return this.cachedPermissionModalModuleBlocks;
  }

  trackByModalBlockKey(_index: number, block: { key: string }): string {
    return block.key;
  }

  trackByPermissionId(_index: number, p: Permission): string | number {
    return p.id;
  }

  countGrantedInBlock(block: { key: string; permissions: Permission[] }): number {
    if (!this.selectedRole?.permissions?.length) {
      return 0;
    }
    return block.permissions.filter((p) => this.getRolePermission(this.selectedRole!, p.id)).length;
  }

  setModulePermissionsAll(modKey: string, granted: boolean): void {
    if (!this.selectedRole) {
      return;
    }
    const grouped = this.roleService.agruparPermisosPorModulo(this.permisosSpatieMenuLateralFijo);
    const perms = this.filterPermsForModalSearch(grouped[modKey] || []);
    const ids = new Set(perms.map((p) => String(p.id)));
    let next = [...(this.selectedRole.permissions || [])];
    if (granted) {
      for (const p of perms) {
        if (!next.some((x) => this.samePermissionId(x.id, p.id))) {
          next.push(p);
        }
      }
    } else {
      next = next.filter((x) => !ids.has(String(x.id)));
    }
    this.selectedRole.permissions = next;
  }

  savePermissions(): void {
    if (this.selectedRole) {
      this.isLoading = true;
      
      const permissions = this.selectedRole.permissions?.map(p => p.name) || [];
      
      this.roleService.asignarPermisos(this.selectedRole.id, permissions).subscribe({
        next: (response) => {
          if (response.success) {
            this.isLoading = false;
            this.authService.invalidateValidateTokenCache();
            this.authService.refreshSessionUser().subscribe();
            this.closePermissionModal();
            this.loadRoles(); // Recargar roles
            alert('Permisos actualizados exitosamente!');
          } else {
            this.isLoading = false;
            alert('Error al actualizar permisos: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error guardando permisos:', error);
          this.isLoading = false;
          const errBody = error.error;
          let msg = errBody?.message || error.message || 'Error desconocido';
          if (errBody?.errors && typeof errBody.errors === 'object') {
            const parts = Object.entries(errBody.errors).map(([k, v]) => {
              const val = Array.isArray(v) ? (v as string[]).join(', ') : String(v);
              return `${k}: ${val}`;
            });
            if (parts.length) {
              msg += '\n\n' + parts.join('\n');
            }
          }
          alert('Error al actualizar permisos:\n' + msg);
        }
      });
    }
  }

  getPermissionStatusClass(granted: boolean): string {
    return granted ? 'badge-success' : 'badge-secondary';
  }

  getPermissionStatusText(granted: boolean): string {
    return granted ? 'Concedido' : 'Denegado';
  }


  setMainTab(id: RoleMainTabId): void {
    this.activeMainTab = id;
    if (id === 'menus-rol') {
      if (this.menuRolSelectedId == null && this.roles.length > 0) {
        this.menuRolSelectedId = this.roles[0].id;
      }
      if (!this.menuCatalogLoaded && this.menuRolSelectedId != null) {
        this.loadMenuCatalogAndPlantillas();
      }
    }
  }

  openMenusForRole(role: Role): void {
    this.menuRolSelectedId = role.id;
    this.activeMainTab = 'menus-rol';
    this.menuCatalogLoaded = false;
    this.loadMenuCatalogAndPlantillas();
  }

  onMenuRolSelectChange(): void {
    this.menuCatalogLoaded = false;
    this.loadMenuCatalogAndPlantillas();
  }

  menuRowKey(row: MenuPlantillaRow): string {
    return `${row.sistemaId}_${row.menuId}`;
  }

  menuKeyByIds(sistemaId: number, menuId: number): string {
    return `${sistemaId}_${menuId}`;
  }

  getMenuPlantillaFlags(row: MenuPlantillaRow): MenuPlantillaFlags {
    const k = this.menuRowKey(row);
    return this.menuPlantillaState[k] ?? {
      assigned: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
    };
  }

  getFlagsBySistemaMenu(sistemaId: number, menuId: number): MenuPlantillaFlags {
    const k = this.menuKeyByIds(sistemaId, menuId);
    return this.menuPlantillaState[k] ?? {
      assigned: false,
      view: true,
      create: true,
      edit: true,
      delete: true,
    };
  }

  /** Filas planas para marcar filtrados / conteos */
  /** Exposición para plantilla: total de ítems de menú en todos los subsistemas */
  get totalMenusRolItems(): number {
    return this.flattenSistemaMenusRol().length;
  }

  get filteredMenuPlantillaRows(): MenuPlantillaRow[] {
    const all = this.flattenSistemaMenusRol();
    const q = (this.menuPlantillaSearch || '').trim().toLowerCase();
    if (!q) {
      return all;
    }
    return all.filter((r) =>
      r.nombre.toLowerCase().includes(q) ||
      (r.ruta && r.ruta.toLowerCase().includes(q)) ||
      r.sistemaNombre.toLowerCase().includes(q)
    );
  }

  /** Muestra bloque del subsistema en la búsqueda */
  sistemaVisibleInSearch(s: SistemaMenusRolVista): boolean {
    const q = (this.menuPlantillaSearch || '').trim().toLowerCase();
    if (!q) {
      return true;
    }
    if (s.nombre.toLowerCase().includes(q) || (s.codigo && s.codigo.toLowerCase().includes(q))) {
      return true;
    }
    return this.treeHasTextMatch(s.menus, q);
  }

  /** Con texto de búsqueda, abrir cuerpo del subsistema aunque el chevron esté cerrado */
  showMenusRolSistemaBody(s: SistemaMenusRolVista): boolean {
    const q = (this.menuPlantillaSearch || '').trim();
    if (!q) {
      return !!s.expanded;
    }
    return this.sistemaVisibleInSearch(s);
  }

  get menuRolSearchActive(): boolean {
    return !!(this.menuPlantillaSearch || '').trim();
  }

  /** Hijo incluido en la vista al filtrar (coincidencia en rama) */
  menuRolNodeVisibleInSearch(node: MenuRolTreeNode): boolean {
    const q = (this.menuPlantillaSearch || '').trim().toLowerCase();
    if (!q) {
      return true;
    }
    if (node.nombre.toLowerCase().includes(q) || (node.ruta && node.ruta.toLowerCase().includes(q))) {
      return true;
    }
    if (node.children?.length) {
      return node.children.some((c) => this.menuRolNodeVisibleInSearch(c));
    }
    return false;
  }

  visibleMenuRolChildren(nodes: MenuRolTreeNode[] | undefined): MenuRolTreeNode[] {
    const list = nodes || [];
    if (!this.menuRolSearchActive) {
      return list;
    }
    return list.filter((n) => this.menuRolNodeVisibleInSearch(n));
  }

  private treeHasTextMatch(nodes: MenuRolTreeNode[], q: string): boolean {
    for (const n of nodes || []) {
      if (n.nombre.toLowerCase().includes(q) || (n.ruta && n.ruta.toLowerCase().includes(q))) {
        return true;
      }
      if (n.children?.length && this.treeHasTextMatch(n.children, q)) {
        return true;
      }
    }
    return false;
  }

  toggleSistemaExpanded(s: SistemaMenusRolVista): void {
    s.expanded = !s.expanded;
  }

  toggleMenuNodeExpanded(node: MenuRolTreeNode): void {
    node.expanded = !node.expanded;
  }

  toggleMenuAssigned(row: MenuPlantillaRow): void {
    const k = this.menuRowKey(row);
    const cur = { ...this.getMenuPlantillaFlags(row) };
    cur.assigned = !cur.assigned;
    this.menuPlantillaState = { ...this.menuPlantillaState, [k]: cur };
  }

  toggleAssignedBySistemaMenu(sistemaId: number, menuId: number): void {
    const k = this.menuKeyByIds(sistemaId, menuId);
    const cur = { ...this.getFlagsBySistemaMenu(sistemaId, menuId) };
    cur.assigned = !cur.assigned;
    this.menuPlantillaState = { ...this.menuPlantillaState, [k]: cur };
  }

  setMenuFlag(row: MenuPlantillaRow, field: keyof Omit<MenuPlantillaFlags, 'assigned'>, value: boolean): void {
    const k = this.menuRowKey(row);
    const cur = { ...this.getMenuPlantillaFlags(row), [field]: value };
    this.menuPlantillaState = { ...this.menuPlantillaState, [k]: cur };
  }

  setMenuFlagBySistemaMenu(
    sistemaId: number,
    menuId: number,
    field: keyof Omit<MenuPlantillaFlags, 'assigned'>,
    value: boolean
  ): void {
    const k = this.menuKeyByIds(sistemaId, menuId);
    const cur = { ...this.getFlagsBySistemaMenu(sistemaId, menuId), [field]: value };
    this.menuPlantillaState = { ...this.menuPlantillaState, [k]: cur };
  }

  expandirTodosSubsistemas(expandir: boolean): void {
    for (const s of this.sistemasMenusRol) {
      s.expanded = expandir;
      this.setExpandedRecursive(s.menus, expandir);
    }
  }

  private setExpandedRecursive(nodes: MenuRolTreeNode[], value: boolean): void {
    for (const n of nodes || []) {
      if (n.children?.length) {
        n.expanded = value;
        this.setExpandedRecursive(n.children, value);
      }
    }
  }

  countMenusPlantillaSistema(s: SistemaMenusRolVista): { total: number; asignados: number } {
    let total = 0;
    let asignados = 0;
    const walk = (nodes: MenuRolTreeNode[]) => {
      for (const n of nodes || []) {
        total++;
        if (this.getFlagsBySistemaMenu(s.id, n.id).assigned) {
          asignados++;
        }
        if (n.children?.length) {
          walk(n.children);
        }
      }
    };
    walk(s.menus);
    return { total, asignados };
  }

  loadMenuCatalogAndPlantillas(): void {
    if (this.menuRolSelectedId == null) {
      return;
    }
    const gen = ++this.menuCatalogLoadGeneration;
    this.loadingMenuCatalog = true;
    this.systemManagement.getSystems().pipe(
      switchMap((res) => {
        const systems = res.success && res.data ? res.data : [];
        if (!systems.length) {
          this.sistemasMenusRol = [];
          return this.accesoRolesService.listByRole(this.menuRolSelectedId!);
        }
        const reqs = systems.map((s: { id: number; nombre: string; codigo?: string }) =>
          this.systemManagement.getSystemMenus(s.id).pipe(
            map((r) => ({ system: s, menus: r.success && r.data ? r.data : [] as SystemMenu[] })),
            catchError(() => of({ system: s, menus: [] as SystemMenu[] }))
          )
        );
        return forkJoin(reqs).pipe(
          switchMap((results) => {
            this.sistemasMenusRol = results.map(({ system, menus }) => ({
              id: system.id,
              nombre: system.nombre,
              codigo: system.codigo || '',
              expanded: true,
              menus: this.buildMenuRolTree(menus),
            }));
            return this.accesoRolesService.listByRole(this.menuRolSelectedId!);
          })
        );
      })
    ).subscribe({
      next: (plantillas) => {
        if (gen !== this.menuCatalogLoadGeneration) {
          return;
        }
        this.applyPlantillasToState(plantillas);
        this.loadingMenuCatalog = false;
        this.menuCatalogLoaded = true;
        this.ensureMenusRolFocusedSistema();
        if (this.showPermissionModal) {
          this.ensureDefaultModalSistemaTab();
        }
      },
      error: (e) => {
        if (gen !== this.menuCatalogLoadGeneration) {
          return;
        }
        console.error(e);
        this.loadingMenuCatalog = false;
        alert('Error cargando menús o plantillas: ' + (e.error?.message || e.message));
      },
    });
  }

  private buildMenuRolTree(menus: SystemMenu[]): MenuRolTreeNode[] {
    const list = menus || [];
    return list
      .filter((m) => {
        if (!m.activo) {
          return false;
        }
        const vis = (m as SystemMenu & { visible?: boolean }).visible;
        return vis !== false;
      })
      .map((m) => {
        const children = m.children?.length ? this.buildMenuRolTree(m.children) : [];
        return {
          ...m,
          expanded: false,
          children,
        } as MenuRolTreeNode;
      });
  }

  private flattenSistemaMenusRol(): MenuPlantillaRow[] {
    const rows: MenuPlantillaRow[] = [];
    for (const s of this.sistemasMenusRol) {
      rows.push(...this.flattenTreeToRows(s.id, s.nombre, s.menus, 0));
    }
    return rows;
  }

  private flattenTreeToRows(
    sistemaId: number,
    sistemaNombre: string,
    nodes: MenuRolTreeNode[],
    nivel: number
  ): MenuPlantillaRow[] {
    const out: MenuPlantillaRow[] = [];
    for (const m of nodes || []) {
      out.push({
        sistemaId,
        sistemaNombre,
        menuId: m.id,
        nombre: m.nombre,
        ruta: m.ruta,
        nivel,
      });
      if (m.children?.length) {
        out.push(...this.flattenTreeToRows(sistemaId, sistemaNombre, m.children, nivel + 1));
      }
    }
    return out;
  }

  private normalizePermisosRecord(
    p: Record<string, boolean> | string[] | null | undefined
  ): Pick<MenuPlantillaFlags, 'view' | 'create' | 'edit' | 'delete'> {
    const d = { view: true, create: true, edit: true, delete: true };
    if (p == null) {
      return d;
    }
    if (Array.isArray(p)) {
      return {
        view: p.includes('ver') || p.includes('view'),
        create: p.includes('crear') || p.includes('create'),
        edit: p.includes('editar') || p.includes('edit'),
        delete: p.includes('eliminar') || p.includes('delete'),
      };
    }
    return {
      view: !!p['view'],
      create: !!p['create'],
      edit: !!p['edit'],
      delete: !!p['delete'],
    };
  }

  private applyPlantillasToState(plantillas: AccesoRolPlantilla[]): void {
    const state: Record<string, MenuPlantillaFlags> = {};
    const rows = this.flattenSistemaMenusRol();
    for (const row of rows) {
      const k = this.menuRowKey(row);
      state[k] = {
        assigned: false,
        view: true,
        create: true,
        edit: true,
        delete: true,
      };
    }
    for (const p of plantillas) {
      if (!p.activo) {
        continue;
      }
      const k = `${p.sistema_id}_${p.menu_id}`;
      if (!state[k]) {
        state[k] = {
          assigned: true,
          ...this.normalizePermisosRecord(p.permisos as Record<string, boolean> | string[] | null),
        };
      } else {
        state[k] = {
          assigned: true,
          ...this.normalizePermisosRecord(p.permisos as Record<string, boolean> | string[] | null),
        };
      }
    }
    this.menuPlantillaState = state;
  }

  guardarPlantillasMenus(): void {
    if (this.menuRolSelectedId == null) {
      alert('Seleccione un rol.');
      return;
    }
    const items = this.flattenSistemaMenusRol()
      .filter((row) => this.getMenuPlantillaFlags(row).assigned)
      .map((row) => {
        const s = this.getMenuPlantillaFlags(row);
        return {
          sistema_id: row.sistemaId,
          menu_id: row.menuId,
          permisos: {
            view: s.view,
            create: s.create,
            edit: s.edit,
            delete: s.delete,
          },
          activo: true,
        };
      });
    if (!confirm(`¿Guardar plantilla de menús para este rol? Se reemplazarán las filas actuales en accesos_roles y se sincronizarán los usuarios (${items.length} menús).`)) {
      return;
    }
    this.savingPlantillas = true;
    this.accesoRolesService.bulkReplace(this.menuRolSelectedId, items).subscribe({
      next: (r) => {
        this.savingPlantillas = false;
        if (r.success) {
          alert(`Plantilla guardada. Usuarios sincronizados: ${r.usuarios_sincronizados ?? '—'}.`);
        } else {
          alert('No se pudo guardar: ' + (r.message || ''));
        }
      },
      error: (e) => {
        this.savingPlantillas = false;
        console.error(e);
        const errBody = e.error;
        let msg = errBody?.message || e.message || 'Error desconocido';
        if (errBody?.errors && typeof errBody.errors === 'object') {
          const parts = Object.entries(errBody.errors).map(([k, v]) => {
            const val = Array.isArray(v) ? (v as string[]).join(', ') : String(v);
            return `${k}: ${val}`;
          });
          if (parts.length) {
            msg += '\n\n' + parts.join('\n');
          }
        }
        alert('Error: ' + msg);
      },
    });
  }

  sincronizarUsuariosSoloRol(): void {
    if (this.menuRolSelectedId == null) {
      return;
    }
    if (!confirm('¿Volver a aplicar la plantilla actual a todos los usuarios con este rol (regenera accesos origen=rol)?')) {
      return;
    }
    this.syncingUsuariosRol = true;
    this.accesoRolesService.syncUsuariosForRole(this.menuRolSelectedId).subscribe({
      next: (r) => {
        this.syncingUsuariosRol = false;
        if (r.success) {
          alert(`Sincronización lista. Usuarios procesados: ${r.usuarios_procesados ?? '—'}.`);
        } else {
          alert(r.message || 'Error');
        }
      },
      error: (e) => {
        this.syncingUsuariosRol = false;
        alert('Error: ' + (e.error?.message || e.message));
      },
    });
  }

  marcarTodosFiltrados(valor: boolean): void {
    const next = { ...this.menuPlantillaState };
    for (const row of this.filteredMenuPlantillaRows) {
      const k = this.menuRowKey(row);
      const cur = { ...this.getMenuPlantillaFlags(row), assigned: valor };
      next[k] = cur;
    }
    this.menuPlantillaState = next;
  }

  /** Claves de módulo ordenadas para acordeón / matriz */
  get sortedModuleKeys(): string[] {
    const keys = Object.keys(this.permissionsByModule);
    return keys.sort((a, b) => this.getModuleSortOrder(a) - this.getModuleSortOrder(b) || a.localeCompare(b, 'es'));
  }

  /** Opciones del filtro “Área funcional” en matriz */
  get matrixModuleOptions(): Array<{ value: string; label: string }> {
    const opts: Array<{ value: string; label: string }> = [
      { value: 'all', label: 'Todas las áreas' }
    ];
    for (const key of this.sortedModuleKeys) {
      opts.push({ value: key, label: this.getModuleCategoryTitle(key) });
    }
    return opts;
  }

  /** Permisos visibles en la matriz según filtro */
  get permissionsForMatrix(): Permission[] {
    if (this.matrixModuleFilter === 'all') {
      return this.availablePermissions;
    }
    return this.permissionsByModule[this.matrixModuleFilter] || [];
  }

  private getModuleSortOrder(key: string): number {
    const order = [
      'Configuración lateral',
      'Maestro',
      'Administración',
      'Usuarios',
      'Roles',
      'Menús',
      'Dashboard',
      'Trámite Documentario',
      'Planillas',
      'Empleados',
      'Documentos',
      'Departamentos',
      'Tickets',
      'Chat',
      'Comunicados',
      'Activos Fijos',
      'General',
    ];
    const i = order.indexOf(key);
    return i === -1 ? 999 : i;
  }

  /** Título amigable por categoría (misma clave que agrupa permisos) */
  getModuleCategoryTitle(moduleKey: string): string {
    const titles: { [key: string]: string } = {
      'Dashboard': 'Panel e inicio',
      'Empleados': 'Recursos humanos / empleados',
      'Documentos': 'Documentos y archivos',
      'Tickets': 'Mesa de ayuda / tickets',
      'Chat': 'Mensajería y chat',
      'Comunicados': 'Comunicados institucionales',
      'Activos Fijos': 'Activos fijos',
      'Administración': 'Administración del sistema',
      'Departamentos': 'Departamentos y unidades',
      'Usuarios': 'Usuarios y cuentas',
      'Roles': 'Roles y seguridad',
      'Menús': 'Menús y navegación',
      'Planillas': 'Planillas y nómina',
      'General': 'Otros permisos',
      'Configuración lateral': 'Menú Configuración (perfil, patrones)',
      'Maestro': 'Menú Maestro (organización, trámite admin)',
      'Trámite Documentario': 'Trámite documentario',
    };
    return titles[moduleKey] || moduleKey;
  }

  /** Módulo de agrupación coherente con la matriz y el acordeón del modal */
  getPermissionModuleKey(permission: Permission): string {
    for (const key of this.sortedModuleKeys) {
      if (this.permissionsByModule[key]?.some((x) => x.id === permission.id)) {
        return key;
      }
    }
    return 'General';
  }

  private syncCopyRoleDefaults(): void {
    if (this.roles.length < 1) {
      this.copyFromRoleId = null;
      this.copyToRoleId = null;
      return;
    }
    if (this.copyFromRoleId == null || !this.roles.some(r => r.id === this.copyFromRoleId)) {
      this.copyFromRoleId = this.roles[0].id;
    }
    if (this.roles.length > 1) {
      const second = this.roles.find(r => r.id !== this.copyFromRoleId);
      if (second && (this.copyToRoleId == null || this.copyToRoleId === this.copyFromRoleId)) {
        this.copyToRoleId = second.id;
      }
    } else {
      this.copyToRoleId = this.copyFromRoleId;
    }
  }

  /** Copia permisos del rol origen al destino en servidor */
  executeCopyPermissions(): void {
    const from = this.roles.find(r => r.id === this.copyFromRoleId);
    const to = this.roles.find(r => r.id === this.copyToRoleId);
    if (!from || !to) {
      alert('Seleccione rol de origen y destino.');
      return;
    }
    if (from.id === to.id) {
      alert('El rol de origen y destino deben ser distintos.');
      return;
    }
    if (!confirm(`¿Copiar todos los permisos de «${from.name}» hacia «${to.name}»? Se reemplazará la configuración actual del rol destino.`)) {
      return;
    }
    const permissionNames = from.permissions?.map(p => p.name) || [];
    this.isLoading = true;
    this.roleService.asignarPermisos(to.id, permissionNames).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success) {
          this.loadRoles();
          alert('Permisos copiados correctamente.');
        } else {
          alert('No se pudieron copiar los permisos: ' + (response.message || ''));
        }
      },
      error: (error) => {
        console.error(error);
        this.isLoading = false;
        alert('Error al copiar permisos: ' + (error.error?.message || error.message));
      }
    });
  }

  bulkUpdatePermissions(): void {
    if (confirm('¿Actualizar todos los permisos según la configuración actual?')) {
      this.isLoading = true;
      
      setTimeout(() => {
        this.isLoading = false;
        alert('Permisos actualizados en masa exitosamente!');
      }, 1500);
    }
  }

  getRolePermission(role: Role, permissionId: number | string): boolean {
    return !!role.permissions?.some((p) => this.samePermissionId(p.id, permissionId));
  }

  getTotalGrantedPermissions(): number {
    let total = 0;
    this.roles.forEach(role => {
      total += role.permissions?.length || 0;
    });
    return total;
  }

  getGrantedPermissionsCount(role: Role): number {
    return role.permissions?.length ?? 0;
  }

  // Métodos para CRUD de roles
  openCreateModal(): void {
    this.roleForm = {
      name: '',
      guard_name: 'web'
    };
    this.showCreateModal = true;
  }

  openEditModal(role: Role): void {
    this.selectedRole = role;
    this.roleForm = {
      name: role.name,
      guard_name: role.guard_name
    };
    this.showEditModal = true;
  }

  closeModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showPermissionModal = false;
    this.permissionModalShowSpatieByModule = false;
    this.selectedRole = null;
  }

  createRole(): void {
    if (!this.roleForm.name.trim()) {
      alert('El nombre del rol es requerido');
      return;
    }

    this.isLoading = true;
    this.roleService.crearRol(this.roleForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.isLoading = false;
          this.closeModals();
          this.loadRoles();
          alert('Rol creado exitosamente!');
        } else {
          this.isLoading = false;
          alert('Error al crear rol: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error creando rol:', error);
        this.isLoading = false;
        alert('Error al crear rol: ' + (error.error?.message || error.message));
      }
    });
  }

  updateRole(): void {
    if (!this.selectedRole || !this.roleForm.name.trim()) {
      alert('El nombre del rol es requerido');
      return;
    }

    this.isLoading = true;
    this.roleService.actualizarRol(this.selectedRole.id, this.roleForm).subscribe({
      next: (response) => {
        if (response.success) {
          this.isLoading = false;
          this.closeModals();
          this.loadRoles();
          alert('Rol actualizado exitosamente!');
        } else {
          this.isLoading = false;
          alert('Error al actualizar rol: ' + response.message);
        }
      },
      error: (error) => {
        console.error('Error actualizando rol:', error);
        this.isLoading = false;
        alert('Error al actualizar rol: ' + (error.error?.message || error.message));
      }
    });
  }

  deleteRole(role: Role): void {
    if (confirm(`¿Estás seguro de eliminar el rol "${role.name}"?`)) {
      this.isLoading = true;
      this.roleService.eliminarRol(role.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.isLoading = false;
            this.loadRoles();
            alert('Rol eliminado exitosamente!');
          } else {
            this.isLoading = false;
            alert('Error al eliminar rol: ' + response.message);
          }
        },
        error: (error) => {
          console.error('Error eliminando rol:', error);
          this.isLoading = false;
          alert('Error al eliminar rol: ' + (error.error?.message || error.message));
        }
      });
    }
  }

  getPermissionName(permission: Permission): string {
    return this.roleService.obtenerNombreLegiblePermiso(permission.name);
  }

  getPermissionModule(permission: Permission): string {
    return this.getPermissionModuleKey(permission);
  }

  getModuleClass(module: string): string {
    const moduleClasses: { [key: string]: string } = {
      'Dashboard': 'badge-primary',
      'Empleados': 'badge-info',
      'Documentos': 'badge-success',
      'Tickets': 'badge-warning',
      'Chat': 'badge-secondary',
      'Comunicados': 'badge-danger',
      'Activos Fijos': 'badge-dark',
      'Administración': 'badge-primary',
      'Departamentos': 'badge-info',
      'Usuarios': 'badge-success',
      'Roles': 'badge-warning',
      'Menús': 'badge-secondary',
      'Planillas': 'badge-danger',
      'General': 'badge-light',
      'Configuración lateral': 'badge-info',
      'Maestro': 'badge-success',
      'Trámite Documentario': 'badge-dark',
    };
    return moduleClasses[module] || 'badge-secondary';
  }

}
