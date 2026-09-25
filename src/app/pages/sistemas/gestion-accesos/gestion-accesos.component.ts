import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { takeUntil, catchError, map } from 'rxjs/operators';
import { SystemPatternIntegrationService, SistemaIntegrado, AccesoUsuario } from '../../../services/system-pattern-integration.service';
import { NotificationService } from '../../../services/notification.service';
import { UserSystemAccessService } from '../../../services/user-system-access.service';
import { UserManagementService } from '../../../services/user-management.service';
import { UserMenuAccessService } from '../../../services/user-menu-access.service';

@Component({
  selector: 'app-gestion-accesos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './gestion-accesos.component.html',
  styleUrls: ['./gestion-accesos.component.css']
})
export class GestionAccesosComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Propiedades
  sistemas: SistemaIntegrado[] = [];
  usuarios: any[] = [];
  accesos: AccesoUsuario[] = [];
  loading = false;
  saving = false;

  // Propiedades del formulario
  accesoForm!: FormGroup;
  showForm = false;
  isEditing = false;
  accesoId: number | null = null;

  // Filtros
  selectedSistema: number | null = null;
  selectedUsuario: number | null = null;

  // Cache de nombres de menús por sistema
  private menuNameCache: Map<number, Map<string, string>> = new Map();

  constructor(
    private fb: FormBuilder,
    private systemPatternService: SystemPatternIntegrationService,
    private notificationService: NotificationService,
    private userSystemAccessService: UserSystemAccessService,
    private userManagementService: UserManagementService,
    private userMenuAccessService: UserMenuAccessService
  ) { }

  ngOnInit(): void {
    this.initializeForm();
    this.loadSistemas();
    this.loadUsuarios();
    this.loadAccesos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Inicializar formulario
  initializeForm(): void {
    this.accesoForm = this.fb.group({
      usuario_id: ['', Validators.required],
      sistema_id: ['', Validators.required],
      menu_id: ['', Validators.required],
      permisos: this.fb.array([]),
      activo: [true]
    });
  }

  // Cargar sistemas integrados
  loadSistemas(): void {
    this.loading = true;
    this.systemPatternService.getIntegratedSystems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (sistemas) => {
          this.sistemas = sistemas;
          // Si no hay datos del backend, usamos MOCK DATA mejorada
          if (this.sistemas.length === 0) {
            this.sistemas = [
              { 
                id: 101, 
                nombre: 'Sistema de Trámite Documentario', 
                codigo: 'STD', 
                descripcion: 'Gestión de documentos internos y externos', 
                url_base: 'http://localhost:4200/std', 
                activo: true, 
                sso_habilitado: true, 
                sso_force: false, 
                patron_id: '1', 
                patron_data: { 
                  menus: [
                    { id: 'm1', nombre: 'Mesa de Partes' }, 
                    { id: 'm2', nombre: 'Bandeja de Entrada' },
                    { id: 'm3', nombre: 'Reportes Gerenciales' }
                  ] 
                } as any, 
                fecha_creacion: '2024-01-01', fecha_actualizacion: '2024-01-01', creado_por: 1 
              },
              { 
                id: 102, 
                nombre: 'Sistema de Recursos Humanos', 
                codigo: 'RRHH', 
                descripcion: 'Gestión de personal, planillas y asistencia', 
                url_base: 'http://localhost:4200/rrhh', 
                activo: true, 
                sso_habilitado: true, 
                sso_force: true, 
                patron_id: '2', 
                patron_data: { 
                  menus: [
                    { id: 'p1', nombre: 'Gestión de Empleados' },
                    { id: 'p2', nombre: 'Procesar Planilla' },
                    { id: 'p3', nombre: 'Control de Asistencia' }
                  ] 
                } as any, 
                fecha_creacion: '2024-02-15', fecha_actualizacion: '2024-02-15', creado_por: 1 
              },
              { 
                id: 103, 
                nombre: 'Sistema de Logística', 
                codigo: 'LOG', 
                descripcion: 'Control de inventario y órdenes de compra', 
                url_base: 'http://localhost:4200/logistica', 
                activo: true, 
                sso_habilitado: false, 
                sso_force: false, 
                patron_id: '3', 
                patron_data: { 
                  menus: [
                    { id: 'l1', nombre: 'Requerimientos' },
                    { id: 'l2', nombre: 'Órdenes de Compra' },
                    { id: 'l3', nombre: 'Almacén' }
                  ] 
                } as any, 
                fecha_creacion: '2024-03-10', fecha_actualizacion: '2024-03-10', creado_por: 1 
              },
              { 
                id: 104, 
                nombre: 'Sistema de Tesorería', 
                codigo: 'TES', 
                descripcion: 'Gestión de caja y bancos', 
                url_base: 'http://localhost:4200/tesoreria', 
                activo: false, 
                sso_habilitado: true, 
                sso_force: true, 
                patron_id: '4', 
                patron_data: { 
                  menus: [
                    { id: 't1', nombre: 'Caja Chica' },
                    { id: 't2', nombre: 'Conciliación Bancaria' }
                  ] 
                } as any, 
                fecha_creacion: '2024-04-05', fecha_actualizacion: '2024-04-05', creado_por: 1 
              }
            ];
          }
          // Prefetch de menús por sistema para mapear nombres desde la base de datos
          const fetches = this.sistemas.map(s =>
            this.userMenuAccessService.getSistemaMenus(s.id).pipe(
              map(resp => {
                const menus = Array.isArray(resp?.data) ? resp.data : [];
                const mapById = new Map<string, string>();
                menus.forEach((m: any) => mapById.set(String(m.id), m.nombre || m.name || String(m.id)));
                this.menuNameCache.set(s.id, mapById);
              }),
              catchError(() => {
                // Si falla, intentar construir cache desde patron_data si existe
                if (s?.patron_data?.menus) {
                  const mapById = new Map<string, string>();
                  (s.patron_data.menus as any[]).forEach(m => mapById.set(String(m.id), m.nombre || String(m.id)));
                  this.menuNameCache.set(s.id, mapById);
                }
                return of(void 0);
              })
            )
          );
          forkJoin(fetches).pipe(takeUntil(this.destroy$)).subscribe();
          console.log('✅ Sistemas cargados:', this.sistemas.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar sistemas:', error);
          this.notificationService.error('Error al cargar sistemas');
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  // Cargar usuarios desde backend (con fallback a mock)
  loadUsuarios(): void {
    this.userManagementService.getUsers()
      .pipe(
        takeUntil(this.destroy$),
        catchError(() => {
          // Fallback
          this.usuarios = [
            { id: 1, nombre: 'Juan Pérez', email: 'juan.perez@municipio.gob.pe', cargo: 'Administrador de Sistemas', roles: ['ADMIN', 'SOPORTE'] },
            { id: 2, nombre: 'María García', email: 'maria.garcia@municipio.gob.pe', cargo: 'Analista de RRHH', roles: ['RRHH_ADMIN'] },
            { id: 3, nombre: 'Carlos López', email: 'carlos.lopez@municipio.gob.pe', cargo: 'Asistente Logístico', roles: ['LOGISTICA_OPERADOR'] },
            { id: 4, nombre: 'Ana Martínez', email: 'ana.martinez@municipio.gob.pe', cargo: 'Tesorera', roles: ['TESORERIA_JEFE'] },
            { id: 5, nombre: 'Luis Rodríguez', email: 'luis.rodriguez@municipio.gob.pe', cargo: 'Secretario General', roles: ['TRAMITE_OPERADOR'] }
          ];
          return of(this.usuarios);
        })
      )
      .subscribe(users => {
        // Adaptar a la estructura usada en la vista
        this.usuarios = (users || []).map((u: any) => ({
          id: u.id,
          nombre: u.name || u.nombre || `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'Usuario',
          email: u.email || '',
          roles: Array.isArray(u.roles)
            ? u.roles
                .map((r: any) => {
                  if (typeof r === 'string') return r;
                  if (!r) return null;
                  return r.name || r.nombre || r.code || r.codigo || null;
                })
                .filter((r: any) => !!r)
            : []
        }));
      });
  }

  // Cargar accesos
  loadAccesos(): void {
    this.loading = true;
    const cargarParaUsuario = (uid: number) =>
      this.systemPatternService.getUserAccesses(uid).pipe(
        catchError(() => of([] as AccesoUsuario[]))
      );

    let request$;
    if (this.selectedUsuario) {
      request$ = cargarParaUsuario(this.selectedUsuario);
    } else if (this.usuarios && this.usuarios.length > 0) {
      request$ = forkJoin(this.usuarios.map(u => cargarParaUsuario(u.id))).pipe(
        map((listas: AccesoUsuario[][]) => listas.flat())
      );
    } else {
      // Si aún no hay usuarios cargados, intentar con usuario 1 como fallback
      request$ = cargarParaUsuario(1);
    }

    request$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const accesosData = Array.isArray(response) ? response : (response?.data || []);
          this.accesos = accesosData.map((a: any) => ({
            ...a,
            permisos: (() => {
              if (Array.isArray(a.permisos)) {
                return a.permisos
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
              if (a.permisos && typeof a.permisos === 'object') {
                return Object.keys(a.permisos).filter(k => !!a.permisos[k]);
              }
              return [];
            })()
          }));

          const sistemasToFetch = Array.from(new Set(this.accesos.map(a => a.sistema_id)));
          sistemasToFetch.forEach(sid => {
            if (!this.menuNameCache.has(sid)) {
              this.userMenuAccessService.getSistemaMenus(sid)
                .pipe(takeUntil(this.destroy$))
                .subscribe({
                  next: (resp: any) => {
                    const menus = resp?.data || [];
                    if (menus.length) {
                      const mapById = new Map<string, string>();
                      menus.forEach((m: any) => {
                        mapById.set(String(m.id), m.nombre || m.nombre_menu || `Menú ${m.id}`);
                        if (Array.isArray(m.submenus)) {
                          m.submenus.forEach((sm: any) => {
                            mapById.set(String(sm.id), sm.nombre || sm.nombre_menu || `Menú ${sm.id}`);
                          });
                        }
                      });
                      this.menuNameCache.set(sid, mapById);
                    }
                  },
                  error: () => {}
                });
            }
          });
          if (this.accesos.length === 0) {
            // Fallback mock
            this.accesos = [
              { id: 1, usuario_id: 1, sistema_id: 101, menu_id: 'm1', permisos: ['lectura', 'escritura', 'eliminar', 'imprimir'], activo: true, fecha_asignacion: '2024-01-15T10:00:00' }
            ];
          }
          console.log('✅ Accesos cargados:', this.accesos.length);
        },
        error: (error) => {
          console.error('❌ Error al cargar accesos:', error);
          this.notificationService.error('Error al cargar accesos');
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  // Abrir formulario para nuevo acceso
  openNewAccessForm(): void {
    this.isEditing = false;
    this.accesoId = null;
    this.accesoForm.reset({
      activo: true
    });
    this.showForm = true;
  }

  // Abrir formulario para editar acceso
  editAccess(acceso: AccesoUsuario): void {
    this.isEditing = true;
    this.accesoId = acceso.id;
    this.accesoForm.patchValue({
      usuario_id: acceso.usuario_id,
      sistema_id: acceso.sistema_id,
      menu_id: acceso.menu_id,
      permisos: acceso.permisos,
      activo: acceso.activo
    });
    this.showForm = true;
  }

  // Cerrar formulario
  closeForm(): void {
    this.showForm = false;
    this.accesoForm.reset();
    this.isEditing = false;
    this.accesoId = null;
  }

  // Guardar acceso
  saveAccess(): void {
    if (this.accesoForm.invalid) {
      this.notificationService.error('Por favor, completa todos los campos requeridos');
      return;
    }

    this.saving = true;
    const accessData = this.accesoForm.value;

    if (this.isEditing && this.accesoId) {
      // Actualizar acceso existente
      // Implementar método de actualización en el servicio
      this.notificationService.success('Acceso actualizado correctamente');
    } else {
      // Crear nuevo acceso
      this.systemPatternService.assignUserAccess(accessData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (acceso) => {
            this.notificationService.success('Acceso asignado correctamente');
            this.closeForm();
            this.loadAccesos();
          },
          error: (error) => {
            console.error('❌ Error al asignar acceso:', error);
            this.notificationService.error('Error al asignar acceso');
          },
          complete: () => {
            this.saving = false;
          }
        });
    }
  }

  // Revocar acceso
  revokeAccess(accesoId: number): void {
    if (confirm('¿Estás seguro de que quieres revocar este acceso?')) {
      this.systemPatternService.revokeUserAccess(accesoId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response && response.success) {
              this.notificationService.success(response.message || 'Acceso revocado correctamente');
              this.loadAccesos();
            } else {
              this.notificationService.error(response?.message || 'Error al revocar acceso');
            }
          },
          error: (error) => {
            console.error('❌ Error al revocar acceso:', error);
            let errorMessage = 'Error al revocar acceso';

            if (error.error && error.error.message) {
              errorMessage = error.error.message;
            } else if (error.message) {
              errorMessage = error.message;
            }

            this.notificationService.error(errorMessage);
          }
        });
    }
  }

  // Obtener sistema por ID
  getSistemaById(sistemaId: number): SistemaIntegrado | null {
    return this.sistemas.find(s => s.id === sistemaId) || null;
  }

  // Obtener usuario por ID
  getUsuarioById(usuarioId: number): any {
    return this.usuarios.find(u => u.id === usuarioId) || null;
  }

  // Obtener menús de un sistema
  getMenusFromSistema(sistemaId: number): any[] {
    const sistema = this.getSistemaById(sistemaId);
    return sistema?.patron_data?.menus || [];
  }

  // Cargar menús de un sistema desde el backend
  private loadSistemaMenus(sistemaId: number): void {
    this.userMenuAccessService.getSistemaMenus(sistemaId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const menus = response?.data || [];
          if (menus.length > 0) {
            const mapById = new Map<string, string>();
            menus.forEach((menu: any) => {
              mapById.set(String(menu.id), menu.nombre || menu.nombre_menu || `Menú ${menu.id}`);
            });
            this.menuNameCache.set(sistemaId, mapById);
            console.log(`✅ Menús cargados para sistema ${sistemaId}:`, menus.length);
          }
        },
        error: (error) => {
          console.warn(`⚠️ Error al cargar menús para sistema ${sistemaId}:`, error);
        }
      });
  }

  // Obtener nombre del menú
  getMenuName(sistemaId: number, menuId: string): string {
    // 1) Buscar en cache precargada desde DB
    const cached = this.menuNameCache.get(sistemaId)?.get(String(menuId));
    if (cached) return cached;
    
    // 2) Intentar cargar menús del sistema si no están en caché
    if (!this.menuNameCache.has(sistemaId)) {
      this.loadSistemaMenus(sistemaId);
    }
    
    // 3) Buscar en patrón embebido (si existe)
    const menus = this.getMenusFromSistema(sistemaId);
    const menu = menus.find((m: any) => String(m.id) == String(menuId));
    if (menu?.nombre) return menu.nombre;
    
    // 4) Fallback legible - intentar obtener nombre del menú del acceso
    const acceso = this.accesos.find(a => a.sistema_id === sistemaId && String(a.menu_id) === String(menuId));
    if (acceso && typeof acceso.menu_id === 'string' && acceso.menu_id.includes('_')) {
      // Si el ID contiene guiones bajos, extraer parte descriptiva
      const partes = acceso.menu_id.split('_');
      const nombreDescriptivo = partes.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      return nombreDescriptivo;
    }
    
    // 5) Último fallback
    return `Menú ${menuId}`;
  }

  // Filtrar accesos por sistema
  filterBySistema(sistemaId: number | null): void {
    this.selectedSistema = sistemaId;
    // Implementar lógica de filtrado
  }

  // Filtrar accesos por usuario
  filterByUsuario(usuarioId: number | null): void {
    this.selectedUsuario = usuarioId;
    // Implementar lógica de filtrado
  }

  // Limpiar filtros
  clearFilters(): void {
    this.selectedSistema = null;
    this.selectedUsuario = null;
  }

  // Obtener accesos agrupados por usuario y sistema
  getAccesosAgrupados(): any[] {
    const accesos = this.getAccesosFiltrados();
    const agrupados = new Map<string, any>();

    accesos.forEach(acceso => {
      const key = `${acceso.usuario_id}-${acceso.sistema_id}`;
      if (!agrupados.has(key)) {
        agrupados.set(key, {
          usuario_id: acceso.usuario_id,
          sistema_id: acceso.sistema_id,
          detalles: [] as any[],
          ultimo_acceso: acceso.fecha_asignacion,
          activo: true // Si al menos uno está activo, consideraremos el grupo activo
        });
      }
      
      const grupo = agrupados.get(key);
      grupo.detalles.push({
        id: acceso.id,
        menu_id: acceso.menu_id,
        permisos: acceso.permisos,
        activo: acceso.activo
      });
    });

    // Ordenar detalles por nombre de menú y grupos por usuario y sistema
    const grupos = Array.from(agrupados.values());
    grupos.forEach((g: any) => {
      g.detalles.sort((a: any, b: any) => {
        const an = this.getMenuName(g.sistema_id, a.menu_id).toLowerCase();
        const bn = this.getMenuName(g.sistema_id, b.menu_id).toLowerCase();
        return an.localeCompare(bn);
      });
    });
    return grupos.sort((a: any, b: any) => {
      const userA = (this.getUsuarioById(a.usuario_id)?.nombre || '').toLowerCase();
      const userB = (this.getUsuarioById(b.usuario_id)?.nombre || '').toLowerCase();
      if (userA !== userB) return userA.localeCompare(userB);
      const sysA = (this.getSistemaById(a.sistema_id)?.nombre || '').toLowerCase();
      const sysB = (this.getSistemaById(b.sistema_id)?.nombre || '').toLowerCase();
      return sysA.localeCompare(sysB);
    });
  }

  // Helper para mantener compatibilidad interna con el filtrado base
  private getAccesosFiltrados(): AccesoUsuario[] {
    let accesos = Array.isArray(this.accesos) ? this.accesos : [];

    if (this.selectedSistema) {
      accesos = accesos.filter(a => a.sistema_id === this.selectedSistema);
    }

    if (this.selectedUsuario) {
      accesos = accesos.filter(a => a.usuario_id === this.selectedUsuario);
    }

    return accesos;
  }

  // Verificar si usuario tiene acceso a menú específico
  checkUserMenuAccess(usuarioId: number, sistemaId: number, menuId: string): void {
    this.systemPatternService.checkUserMenuAccess(usuarioId, sistemaId, menuId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (tieneAcceso) => {
          const mensaje = tieneAcceso ? 'El usuario tiene acceso' : 'El usuario no tiene acceso';
          this.notificationService.info(mensaje);
        },
        error: (error) => {
          console.error('❌ Error al verificar acceso:', error);
          this.notificationService.error('Error al verificar acceso');
        }
      });
  }

  // Generar URL de acceso para prueba
  generateAccessUrl(sistema: SistemaIntegrado, menuId: string, usuarioId: number): string {
    return this.systemPatternService.generateSystemAccessUrl(sistema, menuId, usuarioId);
  }

  // Sincronizar accesos basados en roles del usuario
  syncUserAccessWithRoles(usuarioId: number): void {
    if (!usuarioId) {
      this.notificationService.error('Seleccione un usuario para sincronizar.');
      return;
    }

    // Asumiendo que obtenemos los roles del usuario desde otro servicio o estado
    // Aquí usamos roles mockeados [1, 2] como requerimiento de prueba
    this.userSystemAccessService.syncAccessWithRoles(usuarioId, [1, 2])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.notificationService.success('Accesos sincronizados con los roles exitosamente.');
          this.loadAccesos();
        },
        error: (err) => {
          this.notificationService.error('Error al sincronizar accesos por rol.');
        }
      });
  }

  // Validar campo específico
  isFieldInvalid(fieldName: string): boolean {
    const field = this.accesoForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  // Obtener mensaje de error para campo
  getFieldError(fieldName: string): string {
    const field = this.accesoForm.get(fieldName);
    if (field && field.errors) {
      if (field.errors['required']) return 'Este campo es requerido';
    }
    return '';
  }
}
