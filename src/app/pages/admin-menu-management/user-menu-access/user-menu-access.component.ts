import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { UserMenuAccessService } from '../../../services/user-menu-access.service';
import { NotificationService } from '../../../services/notification.service';
import { AuthService } from '../../../services/auth.service';

interface User {
  id: number;
  name: string;
  email: string;
  roles: string[];
  active: boolean;
}

interface Sistema {
  id: number;
  nombre: string;
  codigo: string;
  activo: boolean;
  menus: Menu[];
}

interface Menu {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  icono: string;
  activo: boolean;
  expanded?: boolean; // Propiedad para controlar expansión
  submenus: Submenu[];
}

interface Submenu {
  id: number;
  nombre: string;
  codigo: string;
  ruta: string;
  icono: string;
  activo: boolean;
}

interface UserAccess {
  id: number;
  usuario_id: number;
  sistema_id: number;
  menu_id: number;
  permisos: string[];
  activo: boolean;
  usuario?: User;
  sistema?: Sistema;
  menu?: Menu;
}

interface Permission {
  key: string;
  name: string;
  description: string;
}

@Component({
  selector: 'app-user-menu-access',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-menu-access.component.html',
  styleUrls: ['./user-menu-access.component.scss']
})
export class UserMenuAccessComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  usuarios: User[] = [];
  sistemas: Sistema[] = [];
  accesos: UserAccess[] = [];
  selectedUser: User | null = null;
  selectedSistema: Sistema | null = null;
  selectedMenu: Menu | null = null;
  selectedSubmenu: Submenu | null = null;

  // UI State
  loading = false;
  showUserModal = false;
  showAccessModal = false;
  showPermissionsModal = false;

  // Forms
  userAccessForm = {
    usuario_id: 0,
    sistema_id: 0,
    menu_id: 0,
    permisos: [] as string[],
    activo: true
  };

  // Available permissions
  availablePermissions: Permission[] = [
    { key: 'lectura', name: 'Lectura', description: 'Ver el menú y su contenido' },
    { key: 'escritura', name: 'Escritura', description: 'Crear y modificar contenido' },
    { key: 'configuracion', name: 'Configuración', description: 'Configurar opciones del menú' },
    { key: 'eliminacion', name: 'Eliminación', description: 'Eliminar contenido' },
    { key: 'exportacion', name: 'Exportación', description: 'Exportar datos' },
    { key: 'importacion', name: 'Importación', description: 'Importar datos' },
    { key: 'aprobacion', name: 'Aprobación', description: 'Aprobar cambios' },
    { key: 'supervision', name: 'Supervisión', description: 'Supervisar operaciones' }
  ];

  // Filters
  userFilter = '';
  sistemaFilter = '';
  menuFilter = '';

  constructor(
    private userMenuAccessService: UserMenuAccessService,
    private notificationService: NotificationService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadInitialData(): void {
    this.loading = true;
    
    // Load users, systems, and accesses in parallel
    Promise.all([
      this.loadUsuarios(),
      this.loadSistemas(),
      this.loadAccesos()
    ]).finally(() => {
      this.loading = false;
    });
  }

  private loadUsuarios(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userMenuAccessService.getUsuarios()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.usuarios = response.data;
              console.log('✅ Usuarios cargados:', this.usuarios.length);
            }
            resolve();
          },
          error: (error) => {
            console.error('❌ Error cargando usuarios:', error);
            this.notificationService.error('Error al cargar usuarios');
            reject(error);
          }
        });
    });
  }

  private loadSistemas(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userMenuAccessService.getSistemas()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.sistemas = response.data;
              console.log('✅ Sistemas cargados:', this.sistemas.length);
            }
            resolve();
          },
          error: (error) => {
            console.error('❌ Error cargando sistemas:', error);
            this.notificationService.error('Error al cargar sistemas');
            reject(error);
          }
        });
    });
  }

  private loadAccesos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userMenuAccessService.getAccesos()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.accesos = response.data;
              console.log('✅ Accesos cargados:', this.accesos.length);
            }
            resolve();
          },
          error: (error) => {
            console.error('❌ Error cargando accesos:', error);
            this.notificationService.error('Error al cargar accesos');
            reject(error);
          }
        });
    });
  }

  // User Management
  openUserModal(): void {
    this.showUserModal = true;
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedUser = null;
  }

  selectUser(user: User): void {
    this.selectedUser = user;
    this.userAccessForm.usuario_id = user.id;
    this.loadUserAccesses(user.id);
  }

  // Access Management
  openAccessModal(): void {
    if (!this.selectedUser) {
      this.notificationService.warning('Debe seleccionar un usuario primero');
      return;
    }
    this.showAccessModal = true;
  }

  closeAccessModal(): void {
    this.showAccessModal = false;
    this.resetAccessForm();
  }

  selectSistema(sistema: Sistema): void {
    this.selectedSistema = sistema;
    this.userAccessForm.sistema_id = sistema.id;
    this.selectedMenu = null;
    this.userAccessForm.menu_id = 0;
  }

  selectMenu(menu: Menu): void {
    this.selectedMenu = menu;
    this.selectedSubmenu = null; // Limpiar submenú seleccionado
    this.userAccessForm.menu_id = menu.id;
  }

  selectSubmenu(submenu: Submenu): void {
    this.selectedSubmenu = submenu;
    this.userAccessForm.menu_id = submenu.id; // Usar el ID del submenú
  }

  toggleMenuExpanded(menu: Menu): void {
    menu.expanded = !menu.expanded;
  }

  // Permission Management
  togglePermission(permission: string): void {
    const index = this.userAccessForm.permisos.indexOf(permission);
    if (index > -1) {
      this.userAccessForm.permisos.splice(index, 1);
    } else {
      this.userAccessForm.permisos.push(permission);
    }
  }

  hasPermission(permission: string): boolean {
    return this.userAccessForm.permisos.includes(permission);
  }

  // CRUD Operations
  saveAccess(): void {
    if (!this.validateAccessForm()) {
      return;
    }

    this.loading = true;
    this.userMenuAccessService.createAccess(this.userAccessForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Acceso asignado correctamente');
            this.loadAccesos();
            this.closeAccessModal();
          } else {
            this.notificationService.error(response.message || 'Error al asignar acceso');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error asignando acceso:', error);
          this.notificationService.error('Error al asignar acceso');
          this.loading = false;
        }
      });
  }

  updateAccess(acceso: UserAccess): void {
    this.userAccessForm = {
      usuario_id: acceso.usuario_id,
      sistema_id: acceso.sistema_id,
      menu_id: acceso.menu_id,
      permisos: [...acceso.permisos],
      activo: acceso.activo
    };
    this.selectedUser = acceso.usuario || null;
    this.selectedSistema = this.sistemas.find(s => s.id === acceso.sistema_id) || null;
    this.selectedMenu = this.selectedSistema?.menus.find(m => m.id === acceso.menu_id) || null;
    this.showAccessModal = true;
  }

  deleteAccess(acceso: UserAccess): void {
    if (confirm('¿Está seguro de que desea eliminar este acceso?')) {
      this.loading = true;
      this.userMenuAccessService.deleteAccess(acceso.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Acceso eliminado correctamente');
              this.loadAccesos();
            } else {
              this.notificationService.error(response.message || 'Error al eliminar acceso');
            }
            this.loading = false;
          },
          error: (error) => {
            console.error('❌ Error eliminando acceso:', error);
            this.notificationService.error('Error al eliminar acceso');
            this.loading = false;
          }
        });
    }
  }

  toggleAccessStatus(acceso: UserAccess): void {
    this.loading = true;
    this.userMenuAccessService.updateAccess(acceso.id, { activo: !acceso.activo })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.notificationService.success('Estado del acceso actualizado');
            this.loadAccesos();
          } else {
            this.notificationService.error(response.message || 'Error al actualizar acceso');
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error actualizando acceso:', error);
          this.notificationService.error('Error al actualizar acceso');
          this.loading = false;
        }
      });
  }

  // Helper Methods
  private validateAccessForm(): boolean {
    if (!this.userAccessForm.usuario_id) {
      this.notificationService.warning('Debe seleccionar un usuario');
      return false;
    }
    if (!this.userAccessForm.sistema_id) {
      this.notificationService.warning('Debe seleccionar un sistema');
      return false;
    }
    if (!this.userAccessForm.menu_id) {
      this.notificationService.warning('Debe seleccionar un menú');
      return false;
    }
    if (this.userAccessForm.permisos.length === 0) {
      this.notificationService.warning('Debe seleccionar al menos un permiso');
      return false;
    }
    return true;
  }

  private resetAccessForm(): void {
    this.userAccessForm = {
      usuario_id: 0,
      sistema_id: 0,
      menu_id: 0,
      permisos: [],
      activo: true
    };
    this.selectedSistema = null;
    this.selectedMenu = null;
    this.selectedSubmenu = null;
  }

  private loadUserAccesses(userId: number): void {
    this.userMenuAccessService.getUserAccesses(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            // Filter accesos for this user
            this.accesos = this.accesos.filter(a => a.usuario_id === userId);
            console.log('✅ Accesos del usuario cargados:', this.accesos.length);
          }
        },
        error: (error) => {
          console.error('❌ Error cargando accesos del usuario:', error);
        }
      });
  }

  // Filter Methods
  get filteredUsuarios(): User[] {
    if (!this.userFilter) return this.usuarios;
    return this.usuarios.filter(user => 
      user.name.toLowerCase().includes(this.userFilter.toLowerCase()) ||
      user.email.toLowerCase().includes(this.userFilter.toLowerCase())
    );
  }

  get filteredSistemas(): Sistema[] {
    if (!this.sistemaFilter) return this.sistemas;
    return this.sistemas.filter(sistema => 
      sistema.nombre.toLowerCase().includes(this.sistemaFilter.toLowerCase()) ||
      sistema.codigo.toLowerCase().includes(this.sistemaFilter.toLowerCase())
    );
  }

  get filteredMenus(): Menu[] {
    if (!this.selectedSistema) return [];
    if (!this.menuFilter) return this.selectedSistema.menus;
    return this.selectedSistema.menus.filter(menu => 
      menu.nombre.toLowerCase().includes(this.menuFilter.toLowerCase()) ||
      menu.codigo.toLowerCase().includes(this.menuFilter.toLowerCase())
    );
  }

  get filteredAccesos(): UserAccess[] {
    let filtered = this.accesos;
    
    if (this.selectedUser) {
      filtered = filtered.filter(a => a.usuario_id === this.selectedUser!.id);
    }
    
    if (this.selectedSistema) {
      filtered = filtered.filter(a => a.sistema_id === this.selectedSistema!.id);
    }
    
    return filtered;
  }

  // Utility Methods
  getPermissionName(key: string): string {
    const permission = this.availablePermissions.find(p => p.key === key);
    return permission ? permission.name : key;
  }

  getPermissionDescription(key: string): string {
    const permission = this.availablePermissions.find(p => p.key === key);
    return permission ? permission.description : '';
  }

  getSistemaName(sistemaId: number): string {
    const sistema = this.sistemas.find(s => s.id === sistemaId);
    return sistema ? sistema.nombre : 'Sistema desconocido';
  }

  getMenuName(menuId: number): string {
    if (!this.selectedSistema) return 'Menú desconocido';
    const menu = this.selectedSistema.menus.find(m => m.id === menuId);
    return menu ? menu.nombre : 'Menú desconocido';
  }

  getUserName(userId: number): string {
    const user = this.usuarios.find(u => u.id === userId);
    return user ? user.name : 'Usuario desconocido';
  }

  refreshData(): void {
    this.loadInitialData();
  }
}
