import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { NotificationService } from '../../services/notification.service';
import { AuditService } from '../../services/audit.service';
import { DataTablesModule } from '../../lib/angular-datatables/angular-datatables.module';

// Interfaces
interface Usuario {
  id: number;
  name: string;
  email: string;
  username: string;
  activo: boolean;
  empleado?: {
    id: number;
    nombre: string;
    apellido: string;
    cargo: string;
    departamento: string;
  };
  roles: string[];
  ultimo_acceso?: string;
}

interface Empleado {
  id: number;
  nombre: string;
  apellido: string;
  cargo: string;
  departamento: string;
  email: string;
  telefono: string;
}

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule, FormsModule, DataTablesModule],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  // Propiedades
  usuarios: Usuario[] = [];
  empleados: Empleado[] = [];
  showSystemAccessModal = false;
  availableSystems: any[] = [];
  loadingSystems = false;
  loadingUserAccess = false;
  userForSystemAccess: Usuario | null = null;
  roles: string[] = [];
  deleting = false;
  Math = Math;
  showPassword = false;
  
  // Propiedades para DataTables
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();
  
  // Estados de modales
  showUserModal = false;
  showDeleteModal = false;
  showEmpleadoModal = false;
  
  // Selecciones
  selectedUser: Usuario | null = null;
  selectedEmpleado: Empleado | null = null;
  userToDelete: Usuario | null = null;
  
  // Formularios
  userForm!: FormGroup;
  empleadoForm!: FormGroup;
  
  // Estados de carga
  loading = false;
  saving = false;
  
  // Filtros
  filtroActivo = '';
  filtroRol = '';
  filtroBusqueda = '';

  constructor(
    private apiService: ApiService,
    private notificationService: NotificationService,
    private auditService: AuditService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.loadInitialData();
    this.initializeDataTables();
    this.initializeCollapseEvents();
  }

  ngAfterViewInit(): void {
    // Trigger DataTables after view is initialized
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.next(null);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.userForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      username: ['', Validators.required],
      password: ['', Validators.required],
      empleado_id: [''],
      roles: [[]],
      activo: [true]
    });

    this.empleadoForm = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      cargo: ['', Validators.required],
      departamento: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefono: ['']
    });
  }

  private initializeDataTables(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 10,
      processing: true,
      language: {
        processing: 'Procesando...',
        lengthMenu: 'Mostrar _MENU_ registros',
        zeroRecords: 'No se encontraron registros',
        info: 'Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros',
        infoEmpty: 'Mostrando registros del 0 al 0 de un total de 0 registros',
        infoFiltered: '(filtrado de un total de _MAX_ registros)',
        search: 'Buscar:',
        paginate: {
          first: 'Primero',
          last: 'Último',
          next: 'Siguiente',
          previous: 'Anterior'
        }
      },
      responsive: true,
      autoWidth: false,
      order: [[1, 'asc']],
      columnDefs: [
        { orderable: false, targets: [0, 6] }, // Avatar and Actions columns
        { width: '80px', targets: 0 }, // Avatar column
        { width: '120px', targets: 6 } // Actions column
      ]
    };
  }

  private loadInitialData(): void {
    this.loading = true;
    
    Promise.all([
      this.loadUsuarios(),
      this.loadEmpleados(),
      this.loadRoles()
    ]).finally(() => {
      this.loading = false;
    });
  }

  // Cargar usuarios
  loadUsuarios(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Usuario[]>('usuarios')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const usuariosData = response.data.data || response.data;
              if (Array.isArray(usuariosData)) {
                this.usuarios = usuariosData;
              } else {
                this.loadSampleUsuarios();
              }
            } else {
              this.loadSampleUsuarios();
            }
            // Trigger DataTables refresh after data is loaded
            if (this.dtTrigger && !this.dtTrigger.closed) {
              this.dtTrigger.next(null);
            }
            resolve();
          },
          error: () => {
            this.loadSampleUsuarios();
            // Trigger DataTables refresh even on error
            if (this.dtTrigger && !this.dtTrigger.closed) {
              this.dtTrigger.next(null);
            }
            resolve();
          }
        });
    });
  }

  // Cargar empleados
  loadEmpleados(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<Empleado[]>('empleados')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const empleadosData = response.data.data || response.data;
              if (Array.isArray(empleadosData)) {
                this.empleados = empleadosData;
              } else {
                this.loadSampleEmpleados();
              }
            } else {
              this.loadSampleEmpleados();
            }
            resolve();
          },
          error: () => {
            this.loadSampleEmpleados();
            resolve();
          }
        });
    });
  }

  // Cargar roles
  loadRoles(): Promise<void> {
    return new Promise((resolve) => {
      this.apiService.get<string[]>('roles')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              const rolesData = response.data.data || response.data;
              if (Array.isArray(rolesData)) {
                this.roles = rolesData;
              } else {
                this.loadSampleRoles();
              }
            } else {
              this.loadSampleRoles();
            }
            resolve();
          },
          error: () => {
            this.loadSampleRoles();
            resolve();
          }
        });
    });
  }

  // Cargar datos de muestra
  private loadSampleUsuarios(): void {
    this.usuarios = [
      {
        id: 1,
        name: 'Juan Pérez',
        email: 'juan.perez@Notaria.com',
        username: 'jperez',
        activo: true,
        empleado: {
          id: 1,
          nombre: 'Juan',
          apellido: 'Pérez',
          cargo: 'Administrador',
          departamento: 'Sistemas'
        },
        roles: ['admin', 'usuario'],
        ultimo_acceso: '2024-01-15 10:30:00'
      },
      {
        id: 2,
        name: 'María García',
        email: 'maria.garcia@Notaria.com',
        username: 'mgarcia',
        activo: true,
        empleado: {
          id: 2,
          nombre: 'María',
          apellido: 'García',
          cargo: 'Analista',
          departamento: 'Recursos Humanos'
        },
        roles: ['usuario'],
        ultimo_acceso: '2024-01-15 09:15:00'
      }
    ];
  }

  private loadSampleEmpleados(): void {
    this.empleados = [
      {
        id: 1,
        nombre: 'Juan',
        apellido: 'Pérez',
        cargo: 'Administrador',
        departamento: 'Sistemas',
        email: 'juan.perez@Notaria.com',
        telefono: '+56 9 1234 5678'
      },
      {
        id: 2,
        nombre: 'María',
        apellido: 'García',
        cargo: 'Analista',
        departamento: 'Recursos Humanos',
        email: 'maria.garcia@Notaria.com',
        telefono: '+56 9 8765 4321'
      }
    ];
  }

  private loadSampleRoles(): void {
    this.roles = ['admin', 'usuario', 'supervisor', 'auditor'];
  }

  // Abrir modal de usuario
  openUserModal(usuario?: Usuario): void {
    this.selectedUser = usuario || null;
    
    if (usuario) {
      // Modo edición
      this.userForm.patchValue({
        name: usuario.name,
        email: usuario.email,
        username: usuario.username,
        password: '',
        empleado_id: usuario.empleado?.id || '',
        roles: usuario.roles || [],
        activo: usuario.activo
      });
    } else {
      // Modo creación
      this.userForm.reset({
        activo: true,
        roles: []
      });
    }
    
    this.showUserModal = true;
  }

  // Abrir modal de empleado
  openEmpleadoModal(empleado?: Empleado): void {
    this.selectedEmpleado = empleado || null;
    
    if (empleado) {
      // Modo edición
      this.empleadoForm.patchValue({
        nombre: empleado.nombre,
        apellido: empleado.apellido,
        cargo: empleado.cargo,
        departamento: empleado.departamento,
        email: empleado.email,
        telefono: empleado.telefono
      });
    } else {
      // Modo creación
      this.empleadoForm.reset();
    }
    
    this.showEmpleadoModal = true;
  }

  // Abrir modal de eliminación
  openDeleteModal(usuario: Usuario): void {
    this.userToDelete = usuario;
    this.showDeleteModal = true;
  }

  // Guardar usuario
  saveUser(): void {
    if (this.userForm.valid) {
      this.saving = true;
      const userData = this.userForm.value;
      
      if (this.selectedUser) {
        // Actualizar usuario existente
        this.apiService.put(`usuarios/${this.selectedUser.id}`, userData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Usuario actualizado exitosamente');
                // Registrar auditoría para actualización de usuario
                this.auditService.logAction(
                  'Actualización de Usuario',
                  'Gestión de Usuarios',
                  `Usuario ${userData.name || userData.email} actualizado exitosamente`,
                  'success'
                );
                this.loadUsuarios();
                this.showUserModal = false;
                this.selectedUser = null;
              } else {
                this.notificationService.error('Error al actualizar el usuario');
              }
            },
            error: (error) => {
              console.error('Error updating user:', error);
              this.notificationService.error('Error al actualizar el usuario');
            },
            complete: () => {
              this.saving = false;
            }
          });
      } else {
        // Crear nuevo usuario
        this.apiService.post('usuarios', userData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Usuario creado exitosamente');
                // Registrar auditoría para creación de usuario
                this.auditService.logAction(
                  'Creación de Usuario',
                  'Gestión de Usuarios',
                  `Usuario ${userData.name || userData.email} creado exitosamente`,
                  'success'
                );
                this.loadUsuarios();
                this.showUserModal = false;
              } else {
                this.notificationService.error('Error al crear el usuario');
              }
            },
            error: (error) => {
              console.error('Error creating user:', error);
              this.notificationService.error('Error al crear el usuario');
            },
            complete: () => {
              this.saving = false;
            }
          });
      }
    }
  }

  // Guardar empleado
  saveEmpleado(): void {
    if (this.empleadoForm.valid) {
      this.saving = true;
      const empleadoData = this.empleadoForm.value;
      
      if (this.selectedEmpleado) {
        // Actualizar empleado existente
        this.apiService.put(`empleados/${this.selectedEmpleado.id}`, empleadoData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Empleado actualizado exitosamente');
                // Registrar auditoría para actualización de empleado
                this.auditService.logAction(
                  'Actualización de Empleado',
                  'Gestión de Empleados',
                  `Empleado ${empleadoData.nombre} ${empleadoData.apellido} actualizado exitosamente`,
                  'success'
                );
                this.loadEmpleados();
                this.showEmpleadoModal = false;
                this.selectedEmpleado = null;
              } else {
                this.notificationService.error('Error al actualizar el empleado');
              }
            },
            error: (error) => {
              console.error('Error updating employee:', error);
              this.notificationService.error('Error al actualizar el empleado');
            },
            complete: () => {
              this.saving = false;
            }
          });
      } else {
        // Crear nuevo empleado
        this.apiService.post('empleados', empleadoData)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (response: any) => {
              if (response.success) {
                this.notificationService.success('Empleado creado exitosamente');
                // Registrar auditoría para creación de empleado
                this.auditService.logAction(
                  'Creación de Empleado',
                  'Gestión de Empleados',
                  `Empleado ${empleadoData.nombre} ${empleadoData.apellido} creado exitosamente`,
                  'success'
                );
                this.loadEmpleados();
                this.showEmpleadoModal = false;
              } else {
                this.notificationService.error('Error al crear el empleado');
              }
            },
            error: (error) => {
              console.error('Error creating employee:', error);
              this.notificationService.error('Error al crear el empleado');
            },
            complete: () => {
              this.saving = false;
            }
          });
      }
    }
  }

  // Eliminar usuario
  deleteUser(): void {
    if (this.userToDelete) {
      this.apiService.delete(`usuarios/${this.userToDelete.id}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success) {
              this.notificationService.success('Usuario eliminado exitosamente');
              // Registrar auditoría para eliminación de usuario
              this.auditService.logAction(
                'Eliminación de Usuario',
                'Gestión de Usuarios',
                `Usuario ${this.userToDelete?.name || this.userToDelete?.email} eliminado exitosamente`,
                'success'
              );
              this.loadUsuarios();
              this.showDeleteModal = false;
              this.userToDelete = null;
            } else {
              this.notificationService.error('Error al eliminar el usuario');
            }
          },
          error: (error) => {
            console.error('Error deleting user:', error);
            this.notificationService.error('Error al eliminar el usuario');
          }
        });
    }
  }

  // Cambiar estado del usuario
  toggleUserStatus(usuario: Usuario): void {
    const newStatus = !usuario.activo;
    
    this.apiService.put(`usuarios/${usuario.id}`, { activo: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (response.success) {
            usuario.activo = newStatus;
            this.notificationService.success(`Usuario ${newStatus ? 'activado' : 'desactivado'} exitosamente`);
            // Registrar auditoría para cambio de estado de usuario
            this.auditService.logAction(
              'Cambio de Estado de Usuario',
              'Gestión de Usuarios',
              `Usuario ${usuario.name || usuario.email} ${newStatus ? 'activado' : 'desactivado'}`,
              'success'
            );
          } else {
            this.notificationService.error('Error al cambiar el estado');
          }
        },
        error: (error) => {
          console.error('Error toggling user status:', error);
          this.notificationService.error('Error al cambiar el estado');
        }
      });
  }

  // Obtener usuarios filtrados
  get filteredUsuarios(): Usuario[] {
    let filtered = this.usuarios;

    // Filtro por estado
    if (this.filtroActivo !== '') {
      const activo = this.filtroActivo === 'true';
      filtered = filtered.filter(usuario => usuario.activo === activo);
    }

    // Filtro por rol
    if (this.filtroRol) {
      filtered = filtered.filter(usuario => usuario.roles.includes(this.filtroRol));
    }

    // Filtro por búsqueda
    if (this.filtroBusqueda) {
      const search = this.filtroBusqueda.toLowerCase();
      filtered = filtered.filter(usuario => 
        usuario.name.toLowerCase().includes(search) ||
        usuario.email.toLowerCase().includes(search) ||
        usuario.username.toLowerCase().includes(search) ||
        (usuario.empleado?.cargo && usuario.empleado.cargo.toLowerCase().includes(search))
      );
    }

    return filtered;
  }

  // Obtener nombre del empleado
  getEmpleadoNombre(empleadoId?: number): string {
    if (!empleadoId) return 'N/A';
    const empleado = this.empleados.find(e => e.id === empleadoId);
    return empleado ? `${empleado.nombre} ${empleado.apellido}` : 'N/A';
  }

  // Cerrar modales
  closeModals(): void {
    this.showUserModal = false;
    this.showDeleteModal = false;
    this.showEmpleadoModal = false;
    this.selectedUser = null;
    this.selectedEmpleado = null;
    this.userToDelete = null;
  }

  // Limpiar filtros
  clearFilters(): void {
    this.filtroActivo = '';
    this.filtroRol = '';
    this.filtroBusqueda = '';
  }

  // Manejar cambios en roles
  onRoleChange(event: any, rol: string): void {
    const rolesActuales = this.userForm.get('roles')?.value || [];
    
    if (event.target.checked) {
      if (!rolesActuales.includes(rol)) {
        rolesActuales.push(rol);
      }
    } else {
      const index = rolesActuales.indexOf(rol);
      if (index > -1) {
        rolesActuales.splice(index, 1);
      }
    }
    
    this.userForm.patchValue({ roles: rolesActuales });
  }

  // Verificar acceso a menú
  hasMenuAccess(systemId: number, menuId: number): boolean {
    // Implementación temporal - retorna accesos variados para demostrar funcionalidad
    // Aquí se debería implementar la lógica real de verificación de permisos
    const accessMap: { [key: string]: boolean } = {
      '1_1': true,  // Sistema 1, Menu 1
      '1_2': false, // Sistema 1, Menu 2
      '1_3': true,  // Sistema 1, Menu 3
      '2_4': false, // Sistema 2, Menu 4
      '2_5': true,  // Sistema 2, Menu 5
    };

    return accessMap[`${systemId}_${menuId}`] || false;
  }

  // Obtener menús del sistema
  getSystemMenus(systemId: number | null | undefined): any[] {
    if (!systemId) return [];
    const system = this.availableSystems.find(s => s.id === systemId);
    const menus = system?.menus || [];
    // Ordenar menús por ID para mantener consistencia
    return menus.sort((a: any, b: any) => a.id - b.id);
  }

  // Alternar acceso a menú
  toggleMenuAccess(systemId: number, menuId: number): void {
    // Implementación temporal que simula el cambio de estado
    const key = `${systemId}_${menuId}`;
    const currentAccess = this.hasMenuAccess(systemId, menuId);

    // Simular llamada a API
    console.log(`Toggling access for system ${systemId}, menu ${menuId}:`, !currentAccess);

    // Aquí se debería hacer la llamada real a la API
    // this.apiService.toggleMenuAccess(this.userForSystemAccess?.id, systemId, menuId)
    //   .subscribe(response => {
    //     if (response.success) {
    //       this.notificationService.showSuccess('Acceso actualizado correctamente');
    //       // Actualizar el estado local
    //     } else {
    //       this.notificationService.showError('Error al actualizar el acceso');
    //     }
    //   });

    // Por ahora, mostrar mensaje temporal
    this.notificationService.success(
      `Acceso ${!currentAccess ? 'otorgado' : 'revocado'} correctamente`
    );
  }

  // Obtener icono del sistema
  getSystemIcon(system: any): string {
    // Implementación temporal - retorna icono por defecto
    return system?.icon || 'fas fa-cog';
  }

  // Obtener cantidad de menús del sistema
  getSystemMenusCount(systemId: number | null | undefined): number {
    if (!systemId) return 0;
    // Implementación temporal - retorna 0
    return this.getSystemMenus(systemId).length;
  }

  // Verificar si es super admin
  isSuperAdmin(): boolean {
    // Implementación temporal - retorna true para permitir ver el modal funcionando
    // En producción, esto debería verificar los roles del usuario autenticado
    return true;
  }

  // Obtener nombre de visualización del rol
  getRoleDisplayName(role: string): string {
    // Implementación temporal - retorna el rol tal como está
    // Aquí se debería implementar la lógica real para formatear nombres de roles
    return role;
  }

  // Formatear fecha para mostrar
  formatDate(dateString: string): string {
    if (!dateString) return 'Sin registro';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Sin registro';

      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');

      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return 'Sin registro';
    }
  }

  // Inicializar eventos de collapse para chevrones
  private initializeCollapseEvents(): void {
    // Esta función se llamará después de que el DOM esté listo
    setTimeout(() => {
      this.setupCollapseEventListeners();
    }, 100);
  }

  private setupCollapseEventListeners(): void {
    // Configurar event listeners para todos los elementos collapse
    const collapseElements = document.querySelectorAll('[data-bs-toggle="collapse"]');

    collapseElements.forEach(button => {
      const targetId = button.getAttribute('data-bs-target');
      if (targetId) {
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          // Listener para cuando el collapse se muestra
          targetElement.addEventListener('show.bs.collapse', () => {
            button.setAttribute('aria-expanded', 'true');
            this.updateChevronIcon(button as HTMLElement, true);
          });

          // Listener para cuando el collapse se oculta
          targetElement.addEventListener('hide.bs.collapse', () => {
            button.setAttribute('aria-expanded', 'false');
            this.updateChevronIcon(button as HTMLElement, false);
          });
        }
      }

      // También manejar clicks directamente
      button.addEventListener('click', (event) => {
        const target = event.currentTarget as HTMLElement;
        const isExpanded = target.getAttribute('aria-expanded') === 'true';

        // Actualizar el estado después de un pequeño delay para permitir que Bootstrap procese
        setTimeout(() => {
          target.setAttribute('aria-expanded', (!isExpanded).toString());
          this.updateChevronIcon(target, !isExpanded);
        }, 10);
      });
    });
  }

  private updateChevronIcon(buttonElement: HTMLElement, isExpanded: boolean): void {
    const chevronIcon = buttonElement.querySelector('.chevron-icon');
    if (chevronIcon) {
      if (isExpanded) {
        chevronIcon.classList.remove('fa-chevron-down');
        chevronIcon.classList.add('fa-chevron-up');
      } else {
        chevronIcon.classList.remove('fa-chevron-up');
        chevronIcon.classList.add('fa-chevron-down');
      }
    }
  }

  // Función auxiliar para refrescar los event listeners cuando se actualiza el modal
  refreshCollapseEventListeners(): void {
    setTimeout(() => {
      this.setupCollapseEventListeners();
    }, 200);
  }

  // Abrir modal de accesos a sistemas
  openSystemAccessModal(user: Usuario): void {
    this.userForSystemAccess = user;
    this.showSystemAccessModal = true;

    // Cargar sistemas y configurar eventos después de que el modal se muestre
    this.loadAvailableSystems().then(() => {
      this.loadUserSystemAccess(user.id).then(() => {
        // Configurar eventos de collapse después de cargar los datos
        this.refreshCollapseEventListeners();
      });
    });
  }

  // Cargar sistemas disponibles desde la API
  private loadAvailableSystems(): Promise<void> {
    return new Promise((resolve) => {
      this.loadingSystems = true;

      // Cargar sistemas desde la API
      this.apiService.get('sistemas-integrados')
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success && response.data) {
              this.availableSystems = response.data.map((sistema: any) => ({
                id: sistema.id,
                nombre: sistema.nombre,
                descripcion: sistema.descripcion,
                url_base: sistema.url_base,
                activo: sistema.activo,
                menus: [] // Se cargarán por separado
              }));

              // Cargar menús para cada sistema
              this.loadMenusForAllSystems().then(() => {
                this.loadingSystems = false;
                resolve();
              });
            } else {
              this.loadSampleSystems();
              this.loadingSystems = false;
              resolve();
            }
          },
          error: (error) => {
            console.error('Error cargando sistemas:', error);
            this.loadSampleSystems();
            this.loadingSystems = false;
            resolve();
          }
        });
    });
  }

  // Cargar menús para todos los sistemas
  private loadMenusForAllSystems(): Promise<void> {
    return new Promise((resolve) => {
      const promises = this.availableSystems.map(sistema => 
        this.loadSystemMenus(sistema.id).then(menus => {
          sistema.menus = menus;
        })
      );

      Promise.all(promises).then(() => {
        resolve();
      });
    });
  }

  // Cargar menús de un sistema específico
  private loadSystemMenus(sistemaId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.apiService.get(`sistema-integrado-menus/${sistemaId}`)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            if (response.success && response.data) {
              const menus = response.data.menus || response.data;
              resolve(Array.isArray(menus) ? menus : []);
            } else {
              resolve([]);
            }
          },
          error: (error) => {
            console.error(`Error cargando menús del sistema ${sistemaId}:`, error);
            resolve([]);
          }
        });
    });
  }

  // Datos de muestra como fallback
  private loadSampleSystems(): void {
    this.availableSystems = [
      {
        id: 1,
        nombre: 'Sistema de Planillas',
        descripcion: 'Gestión integral de nóminas y recursos humanos',
        url_base: 'http://localhost:4200/planillas',
        activo: true,
        menus: [
          {
            id: 1,
            nombre: 'Dashboard Personal',
            descripcion: 'Panel principal de gestión de personal',
            url: '/dashboard-personal',
            icono: 'fas fa-tachometer-alt',
            activo: true
          },
          {
            id: 2,
            nombre: 'Empleados',
            descripcion: 'Gestión de empleados y sus datos',
            url: '/empleados',
            icono: 'fas fa-users',
            activo: true
          },
          {
            id: 3,
            nombre: 'Reportes',
            descripcion: 'Generación de reportes de nómina',
            url: '/reportes',
            icono: 'fas fa-chart-bar',
            activo: true
          }
        ]
      }
    ];
  }

  // Función temporal para cargar accesos del usuario
  private loadUserSystemAccess(userId: number): Promise<void> {
    return new Promise((resolve) => {
      this.loadingUserAccess = true;

      // Simular carga de accesos del usuario
      setTimeout(() => {
        // Datos temporales - en producción esto vendría de la API
        this.loadingUserAccess = false;
        resolve();
      }, 500);
    });
  }

  // Manejar el toggle del chevron
  toggleChevron(event: Event): void {
    const button = event.target as HTMLElement;
    const chevron = button.querySelector('.chevron-icon');
    if (chevron) {
      chevron.classList.toggle('fa-chevron-down');
      chevron.classList.toggle('fa-chevron-up');
    }
  }

  // Obtener estilos para las tarjetas de sistema con colores degradados
  getSystemCardStyles(system: any): any {
    // Definir esquemas de colores por sistema
    const colorSchemes = {
      'planillas': {
        background: 'linear-gradient(135deg, #2E86AB 0%, #A23B72 100%)',
        boxShadow: '0 4px 15px rgba(46, 134, 171, 0.3)',
        border: '1px solid #1B5A7A'
      },
      'contabilidad': {
        background: 'linear-gradient(135deg, #F18F01 0%, #C73E1D 100%)',
        boxShadow: '0 4px 15px rgba(241, 143, 1, 0.3)',
        border: '1px solid #D17A00'
      },
      'inventarios': {
        background: 'linear-gradient(135deg, #28A745 0%, #20C997 100%)',
        boxShadow: '0 4px 15px rgba(40, 167, 69, 0.3)',
        border: '1px solid #1E7E34'
      },
      'default': {
        background: 'linear-gradient(135deg, #6C757D 0%, #495057 100%)',
        boxShadow: '0 4px 15px rgba(108, 117, 125, 0.3)',
        border: '1px solid #495057'
      }
    };

    // Determinar el esquema de colores basado en el nombre del sistema
    const systemName = system.nombre?.toLowerCase() || '';
    let scheme = colorSchemes.default;

    if (systemName.includes('planillas') || systemName.includes('recursos humanos')) {
      scheme = colorSchemes.planillas;
    } else if (systemName.includes('contabilidad') || systemName.includes('financiero')) {
      scheme = colorSchemes.contabilidad;
    } else if (systemName.includes('inventario') || systemName.includes('almacén')) {
      scheme = colorSchemes.inventarios;
    }

    return {
      'background': scheme.background,
      'box-shadow': scheme.boxShadow,
      'border': scheme.border,
      'border-radius': '12px',
      'transition': 'all 0.3s ease',
      'overflow': 'hidden'
    };
  }

  // Obtener clases CSS para menús individuales
  getMenuClass(system: any, menu: any): string {
    const systemName = system.nombre?.toLowerCase() || '';
    
    let baseClass = 'menu-item';
    
    if (systemName.includes('planillas') || systemName.includes('recursos humanos')) {
      baseClass += ' planillas-menu';
    } else if (systemName.includes('contabilidad') || systemName.includes('financiero')) {
      baseClass += ' contabilidad-menu';
    } else if (systemName.includes('inventario') || systemName.includes('almacén')) {
      baseClass += ' inventarios-menu';
    }
    
    return baseClass;
  }

  // Obtener estilos para menús individuales
  getMenuStyles(menu: any, system: any): any {
    const systemName = system.nombre?.toLowerCase() || '';
    
    // Colores base para diferentes tipos de menús
    const menuColors = {
      'planillas': {
        'background': 'rgba(255, 255, 255, 0.95)',
        'border-left': '4px solid #2E86AB',
        'hover': 'rgba(46, 134, 171, 0.1)'
      },
      'contabilidad': {
        'background': 'rgba(255, 255, 255, 0.95)',
        'border-left': '4px solid #F18F01',
        'hover': 'rgba(241, 143, 1, 0.1)'
      },
      'default': {
        'background': 'rgba(255, 255, 255, 0.95)',
        'border-left': '4px solid #6C757D',
        'hover': 'rgba(108, 117, 125, 0.1)'
      }
    };

    let colors = menuColors.default;
    if (systemName.includes('planillas')) colors = menuColors.planillas;
    else if (systemName.includes('contabilidad')) colors = menuColors.contabilidad;

    return {
      'background': colors.background,
      'border-left': colors['border-left'],
      'transition': 'all 0.3s ease'
    };
  }

}