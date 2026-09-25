import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of, Observable } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { SystemPatternIntegrationService } from '../../../services/system-pattern-integration.service';
import { UserMenuAccessService } from '../../../services/user-menu-access.service';

interface Usuario {
  id: number;
  nombre: string;
  email: string;
  rol?: string;
}

interface Sistema {
  id: number;
  nombre: string;
  descripcion?: string;
  menus: Menu[];
}

interface Menu {
  id: string;
  nombre: string;
  descripcion?: string;
  icono?: string;
  submenus?: Menu[];
}

interface AccesoUsuario {
  sistema_id: number;
  menu_id: string;
  permisos: string[];
  sistema_nombre?: string;
  menu_nombre?: string;
}

@Component({
  selector: 'app-accesos-nuevo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './accesos-nuevo.component.html',
  styleUrls: ['./accesos-nuevo.component.scss']
})
export class AccesosNuevoComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Estados de carga
  loading = false;
  loadingAccesos = false;
  
  // Datos principales
  usuarios: Usuario[] = [];
  sistemas: Sistema[] = [];
  accesos: AccesoUsuario[] = [];
  
  // Usuario seleccionado
  usuarioSeleccionado: Usuario | null = null;
  
  // Filtros
  filtroSistema: number | null = null;
  busquedaMenu = '';
  busquedaUsuario = '';
  usuariosFiltrados: Usuario[] = [];
  
  // Cache de nombres de menús
  private menuNameCache = new Map<number, Map<string, string>>();
  
  // Vista actual
  vistaActual: 'usuarios' | 'accesos' = 'usuarios';
  
  // Constructor
  constructor(
    private systemPatternService: SystemPatternIntegrationService,
    private userMenuAccessService: UserMenuAccessService
  ) {}
  
  ngOnInit(): void {
    this.cargarDatosIniciales();
  }
  
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  
  // Cargar datos iniciales
  private cargarDatosIniciales(): void {
    this.loading = true;
    
    forkJoin({
      usuarios: this.cargarUsuarios(),
      sistemas: this.cargarSistemas()
    })
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (resultados: any) => {
        this.usuarios = resultados.usuarios as Usuario[];
        this.usuariosFiltrados = resultados.usuarios as Usuario[];
        this.sistemas = resultados.sistemas as Sistema[];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar datos iniciales:', error);
        this.loading = false;
      }
    });
  }
  
  // Cargar usuarios
  private cargarUsuarios(): Observable<Usuario[]> {
    // Mock data temporal ya que no hay servicio de usuarios en SystemPatternIntegrationService
    return of([
      { id: 1, nombre: 'Juan Pérez', email: 'juan@empresa.com', rol: 'Administrador' },
      { id: 2, nombre: 'María García', email: 'maria@empresa.com', rol: 'Usuario' },
      { id: 3, nombre: 'Carlos López', email: 'carlos@empresa.com', rol: 'Supervisor' },
      { id: 4, nombre: 'Ana Rodríguez', email: 'ana@empresa.com', rol: 'Usuario' }
    ]);
  }
  
  // Cargar sistemas
  private cargarSistemas(): Observable<Sistema[]> {
    return this.systemPatternService.getIntegratedSystems()
      .pipe(
        catchError(() => of([])),
        map((response: any) => {
          const sistemasData = Array.isArray(response) ? response : (response?.data || []);
          return sistemasData.map((s: any) => ({
            id: s.id,
            nombre: s.nombre || s.name || `Sistema ${s.id}`,
            descripcion: s.descripcion || s.description,
            menus: this.procesarMenus(s.menus || s.patron_data?.menus || [])
          }));
        })
      );
  }
  
  // Procesar menús
  private procesarMenus(menus: any[]): Menu[] {
    return menus.map((menu: any) => ({
      id: String(menu.id),
      nombre: menu.nombre || menu.name || `Menú ${menu.id}`,
      descripcion: menu.descripcion || menu.description,
      icono: menu.icono || menu.icon,
      submenus: menu.submenus ? this.procesarMenus(menu.submenus) : undefined
    }));
  }
  
  // Seleccionar usuario
  seleccionarUsuario(usuario: Usuario): void {
    this.usuarioSeleccionado = usuario;
    this.vistaActual = 'accesos';
    this.cargarAccesosUsuario(usuario.id);
  }
  
  // Cargar accesos del usuario
  private cargarAccesosUsuario(usuarioId: number): void {
    this.loadingAccesos = true;
    
    this.systemPatternService.getUserAccesses(usuarioId)
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => of([]))
      )
      .subscribe({
        next: (response: any) => {
          const accesosData = Array.isArray(response) ? response : (response?.data || []);
          this.accesos = accesosData.map((a: any) => ({
            ...a,
            permisos: this.normalizarPermisos(a.permisos)
          }));
          
          // Cargar nombres de menús para los sistemas con accesos
          this.cargarNombresMenus();
          this.loadingAccesos = false;
        },
        error: (error) => {
          console.error('Error al cargar accesos:', error);
          this.loadingAccesos = false;
        }
      });
  }
  
  // Normalizar permisos
  private normalizarPermisos(permisos: any): string[] {
    if (Array.isArray(permisos)) {
      return permisos
        .map((p: any) => {
          if (typeof p === 'string') return p;
          if (!p) return null;
          if (typeof p === 'object') {
            if ('nombre' in p || 'name' in p || 'codigo' in p || 'code' in p) {
              return p.nombre || p.name || p.codigo || p.code;
            }
            const keys = Object.keys(p).filter(k => !!p[k]);
            if (keys.length) return keys.join(', ');
            return null;
          }
          return String(p);
        })
        .filter((p: any) => !!p);
    }
    
    if (permisos && typeof permisos === 'object') {
      return Object.keys(permisos).filter(k => !!permisos[k]);
    }
    
    return [];
  }
  
  // Cargar nombres de menús
  private cargarNombresMenus(): void {
    const sistemasConAccesos = Array.from(new Set(this.accesos.map(a => a.sistema_id)));
    
    sistemasConAccesos.forEach(sistemaId => {
      if (!this.menuNameCache.has(sistemaId)) {
        this.userMenuAccessService.getSistemaMenus(sistemaId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              const menus = response?.data || [];
              if (menus.length > 0) {
                const mapById = new Map<string, string>();
                this.procesarMenusCache(menus, mapById);
                this.menuNameCache.set(sistemaId, mapById);
              }
            },
            error: (error) => {
              console.warn(`Error al cargar menús para sistema ${sistemaId}:`, error);
            }
          });
      }
    });
  }
  
  // Procesar menús para caché
  private procesarMenusCache(menus: any[], mapById: Map<string, string>): void {
    menus.forEach((menu: any) => {
      mapById.set(String(menu.id), menu.nombre || menu.nombre_menu || `Menú ${menu.id}`);
      if (Array.isArray(menu.submenus)) {
        this.procesarMenusCache(menu.submenus, mapById);
      }
    });
  }
  
  // Obtener nombre del menú
  getNombreMenu(sistemaId: number, menuId: string): string {
    const cached = this.menuNameCache.get(sistemaId)?.get(String(menuId));
    if (cached) return cached;
    
    // Buscar en los sistemas cargados
    const sistema = this.sistemas.find(s => s.id === sistemaId);
    if (sistema) {
      const menu = this.buscarMenu(sistema.menus, menuId);
      if (menu) return menu.nombre;
    }
    
    return `Menú ${menuId}`;
  }
  
  // Buscar menú recursivamente
  private buscarMenu(menus: Menu[], menuId: string): Menu | null {
    for (const menu of menus) {
      if (String(menu.id) === String(menuId)) {
        return menu;
      }
      if (menu.submenus) {
        const submenu = this.buscarMenu(menu.submenus, menuId);
        if (submenu) return submenu;
      }
    }
    return null;
  }
  
  // Obtener nombre del sistema
  getNombreSistema(sistemaId: number): string {
    const sistema = this.sistemas.find(s => s.id === sistemaId);
    return sistema?.nombre || `Sistema ${sistemaId}`;
  }
  
  // Accesos filtrados
  get accesosFiltrados(): AccesoUsuario[] {
    let accesos = this.accesos;
    
    if (this.filtroSistema) {
      accesos = accesos.filter(a => a.sistema_id === this.filtroSistema);
    }
    
    if (this.busquedaMenu) {
      const busqueda = this.busquedaMenu.toLowerCase();
      accesos = accesos.filter(a => {
        const nombreMenu = this.getNombreMenu(a.sistema_id, a.menu_id).toLowerCase();
        return nombreMenu.includes(busqueda);
      });
    }
    
    return accesos;
  }
  
  // Filtrar usuarios
  filtrarUsuarios(): void {
    if (!this.busquedaUsuario) {
      this.usuariosFiltrados = [...this.usuarios];
      return;
    }
    
    const busqueda = this.busquedaUsuario.toLowerCase();
    this.usuariosFiltrados = this.usuarios.filter(usuario => 
      usuario.nombre.toLowerCase().includes(busqueda) ||
      usuario.email.toLowerCase().includes(busqueda) ||
      (usuario.rol && usuario.rol.toLowerCase().includes(busqueda))
    );
  }
  
  // Actualizar filtro
  actualizarFiltro(): void {
    // El filtrado se hace automáticamente con el getter accesosFiltrados
  }
  
  // Volver a la lista de usuarios
  volverUsuarios(): void {
    this.vistaActual = 'usuarios';
    this.usuarioSeleccionado = null;
    this.filtroSistema = null;
    this.busquedaMenu = '';
    this.busquedaUsuario = '';
    this.filtrarUsuarios();
  }
  
  // Formatear permisos
  formatearPermisos(permisos: string[]): string {
    if (!permisos || permisos.length === 0) return 'Sin permisos';
    return permisos.join(', ');
  }
  
  // Verificar si tiene permiso
  tienePermiso(permisos: string[], permiso: string): boolean {
    return permisos.includes(permiso);
  }
  
  // Agregar acceso
  agregarAcceso(): void {
    // Implementar lógica para agregar nuevo acceso
    console.log('Agregar nuevo acceso');
  }
  
  // Editar acceso
  editarAcceso(acceso: AccesoUsuario): void {
    // Implementar lógica para editar acceso
    console.log('Editar acceso:', acceso);
  }
  
  // Eliminar acceso
  eliminarAcceso(acceso: AccesoUsuario): void {
    if (confirm(`¿Está seguro de eliminar el acceso a ${this.getNombreMenu(acceso.sistema_id, acceso.menu_id)}?`)) {
      // Implementar lógica para eliminar acceso
      console.log('Eliminar acceso:', acceso);
    }
  }
}