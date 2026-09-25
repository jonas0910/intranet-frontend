import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormArray } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject } from 'rxjs';

interface ModuleInfo {
  name: string;
  path: string;
  display_name: string;
  description: string;
  version: string;
  status: string;
  menus: Array<{ name: string; route: string; icon: string; order: number; active: boolean; permissions: string[] }>;
  has_menu_config: boolean;
}

interface System {
  id: number;
  nombre: string;
  codigo: string;
  descripcion: string;
  url_base: string;
  activo: boolean;
  sso_habilitado: boolean;
  sso_force: boolean;
  menus_count: number;
  active_menus_count: number;
  created_at: string;
  updated_at: string;
}

interface Role {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
}

interface Permission {
  id: number;
  name: string;
  guard_name: string;
  created_at: string;
}

@Component({
  selector: 'app-module-discovery-public',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">Descubrimiento de Módulos</h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a routerLink="/dashboard">Dashboard</a></li>
                <li class="breadcrumb-item"><a routerLink="/admin-menu-management">Administrador</a></li>
                <li class="breadcrumb-item active">Descubrimiento de Módulos</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="card">
            <div class="card-header p-0 border-bottom-0">
              <ul class="nav nav-tabs card-header-tabs" role="tablist">
                <li class="nav-item">
                  <a class="nav-link active" data-toggle="tab" href="#resumen" role="tab" (click)="switchTab('resumen', $event)">
                    <i class="fas fa-chart-pie mr-1"></i> Resumen
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" data-toggle="tab" href="#modulos" role="tab" (click)="switchTab('modulos', $event)">
                    <i class="fas fa-search mr-1"></i> Módulos Descubiertos
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" data-toggle="tab" href="#sistemas" role="tab" (click)="switchTab('sistemas', $event)">
                    <i class="fas fa-cogs mr-1"></i> Sistemas Registrados
                  </a>
                </li>
                <li class="nav-item">
                  <a class="nav-link" data-toggle="tab" href="#permisos" role="tab" (click)="switchTab('permisos', $event)">
                    <i class="fas fa-shield-alt mr-1"></i> Gestión de Permisos
                  </a>
                </li>
              </ul>
            </div>
            <div class="card-body">
              <div class="tab-content">
                <!-- Resumen Tab -->
                <div class="tab-pane fade show active" id="resumen" role="tabpanel">
                  <div class="row">
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-info"><i class="fas fa-search"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Módulos Descubiertos</span>
                          <span class="info-box-number">{{ discoveredModules.length }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-success"><i class="fas fa-check"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Sistemas Registrados</span>
                          <span class="info-box-number">{{ getRegisteredModulesCount() }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-warning"><i class="fas fa-list"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Con Configuración</span>
                          <span class="info-box-number">{{ getModulesWithMenuConfigCount() }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-primary"><i class="fas fa-route"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Con API Routes</span>
                          <span class="info-box-number">{{ getModulesWithApiRoutesCount() }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div class="row mt-3">
                    <div class="col-md-12">
                      <div class="alert alert-info">
                        <h5><i class="icon fas fa-info"></i> Información</h5>
                        Esta herramienta permite descubrir y registrar módulos del sistema automáticamente.
                        <br><br>
                        <strong>Funcionalidades:</strong>
                        <ul>
                          <li>Descubrimiento automático de módulos en /Modules/</li>
                          <li>Registro de módulos como sistemas integrados</li>
                          <li>Gestión de permisos por sistema y rol</li>
                          <li>Configuración de menús y accesos</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Módulos Descubiertos Tab -->
                <div class="tab-pane fade" id="modulos" role="tabpanel">
                  <div class="row mb-3">
                    <div class="col-md-12">
                      <button class="btn btn-primary" (click)="discoverModules()" [disabled]="discovering">
                        <i class="fas fa-search mr-2"></i>
                        {{ discovering ? 'Descubriendo...' : 'Descubrir Módulos' }}
                      </button>
                    </div>
                  </div>

                  <div class="row" *ngIf="discoveredModules.length > 0">
                    <div class="col-md-12">
                      <div class="table-responsive">
                        <table class="table table-bordered table-striped">
                          <thead>
                            <tr>
                              <th>Nombre</th>
                              <th>Descripción</th>
                              <th>Estado</th>
                              <th>Versión</th>
                              <th>Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr *ngFor="let module of discoveredModules">
                              <td>{{ module.display_name }}</td>
                              <td>{{ module.description }}</td>
                              <td>
                                <span class="badge badge-success">{{ module.status }}</span>
                              </td>
                              <td>{{ module.version }}</td>
                              <td>
                                <button class="btn btn-sm btn-info mr-1" (click)="viewModuleDetails(module)">
                                  <i class="fas fa-eye"></i> Ver
                                </button>
                                <button class="btn btn-sm btn-success" 
                                        (click)="openRegistrationModal(module)"
                                        [disabled]="isModuleRegistered(module.name)">
                                  <i class="fas fa-plus"></i> Registrar
                                </button>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Sistemas Registrados Tab -->
                <div class="tab-pane fade" id="sistemas" role="tabpanel">
                  <div class="row" *ngIf="registeredSystems.length > 0">
                    <div class="col-md-6" *ngFor="let system of registeredSystems; let i = index">
                      <div class="card">
                        <div class="card-header">
                          <h5 class="card-title">{{ system.nombre }}</h5>
                        </div>
                        <div class="card-body">
                          <p><strong>Código:</strong> {{ system.codigo }}</p>
                          <p><strong>Descripción:</strong> {{ system.descripcion }}</p>
                          <p><strong>URL Base:</strong> {{ system.url_base }}</p>
                          <p><strong>Estado:</strong> 
                            <span class="badge" [class.badge-success]="system.activo" [class.badge-danger]="!system.activo">
                              {{ system.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </p>
                          <p><strong>Menús:</strong> {{ system.active_menus_count }}/{{ system.menus_count }}</p>
                          <div class="mt-2">
                            <button class="btn btn-sm btn-warning mr-1" (click)="openPermissionModal(system)">
                              <i class="fas fa-shield-alt"></i> Permisos
                            </button>
                            <button class="btn btn-sm btn-info">
                              <i class="fas fa-eye"></i> Ver
                            </button>
                          </div>
                        </div>
                      </div>
                      <hr *ngIf="!isLastSystem(i)">
                    </div>
                  </div>
                </div>

                <!-- Gestión de Permisos Tab -->
                <div class="tab-pane fade" id="permisos" role="tabpanel">
                  <div class="row">
                    <div class="col-md-12">
                      <button class="btn btn-primary" (click)="openPermissionModal()">
                        <i class="fas fa-shield-alt mr-2"></i>
                        Gestionar Permisos
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Modal de Registro -->
      <div class="modal fade" [style]="showRegistrationModal ? 'display: block' : 'display: none'" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Registrar Módulo como Sistema</h5>
              <button type="button" class="close" (click)="closeRegistrationModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form [formGroup]="registrationForm">
                <div class="row">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Nombre del Módulo</label>
                      <input type="text" class="form-control" formControlName="module_name" readonly>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Nombre para Mostrar</label>
                      <input type="text" class="form-control" formControlName="display_name">
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-8">
                    <div class="form-group">
                      <label>URL Base</label>
                      <input type="text" class="form-control" formControlName="url_base">
                    </div>
                  </div>
                  <div class="col-md-4">
                    <div class="form-group">
                      <label>Color</label>
                      <input type="color" class="form-control" formControlName="color">
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-12">
                    <div class="form-group">
                      <label>Descripción</label>
                      <textarea class="form-control" formControlName="description" rows="3"></textarea>
                    </div>
                  </div>
                </div>
                <div class="row">
                  <div class="col-md-12">
                    <div class="form-group">
                      <label>Icono</label>
                      <input type="text" class="form-control" formControlName="icon" placeholder="fas fa-cube">
                    </div>
                  </div>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closeRegistrationModal()">Cancelar</button>
              <button type="button" class="btn btn-primary" (click)="registerModule()" [disabled]="registering">
                {{ registering ? 'Registrando...' : 'Registrar' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal de Permisos -->
      <div class="modal fade" [style]="showPermissionModal ? 'display: block' : 'display: none'" tabindex="-1" role="dialog">
        <div class="modal-dialog modal-xl" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Gestión de Permisos del Sistema</h5>
              <button type="button" class="close" (click)="closePermissionModal()">
                <span>&times;</span>
              </button>
            </div>
            <div class="modal-body">
              <form [formGroup]="permissionForm">
                <div class="row mb-3">
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Sistema</label>
                      <select class="form-control" formControlName="system_id" (change)="onSystemChange(+$any($event.target).value)">
                        <option value="">Seleccionar sistema</option>
                        <option *ngFor="let system of registeredSystems" [value]="system.id">
                          {{ system.nombre }}
                        </option>
                      </select>
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="form-group">
                      <label>Rol</label>
                      <select class="form-control" formControlName="role_id">
                        <option value="">Seleccionar rol</option>
                        <option *ngFor="let role of availableRoles" [value]="role.id">
                          {{ role.name }}
                        </option>
                      </select>
                    </div>
                  </div>
                </div>

                <div *ngIf="selectedSystem" class="alert alert-info">
                  <strong>Sistema:</strong> {{ selectedSystem.nombre }}<br>
                  <strong>Descripción:</strong> {{ selectedSystem.descripcion }}
                </div>

                <div *ngIf="systemMenus.length > 0">
                  <h5>Permisos por Menú</h5>
                  <div class="row">
                    <div class="col-md-6" *ngFor="let menu of systemMenus; let i = index">
                      <div class="card">
                        <div class="card-header">
                          <h6 class="card-title">
                            <i [class]="menu.icono"></i> {{ menu.nombre }}
                          </h6>
                        </div>
                        <div class="card-body">
                          <div *ngFor="let permission of availablePermissions">
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [id]="'menu_' + i + '_' + permission.name"
                                     (change)="toggleMenuPermission(i, permission.name, $event)">
                              <label class="form-check-label" [for]="'menu_' + i + '_' + permission.name">
                                {{ permission.name }}
                              </label>
                            </div>
                          </div>
                          <div class="mt-2">
                            <strong>Permisos seleccionados:</strong>
                            <div>
                              <span class="badge badge-info mr-1" 
                                    *ngFor="let permiso of getMenuPermissions(i)">
                                {{ permiso }}
                              </span>
                              <span *ngIf="getMenuPermissions(i).length === 0" class="text-muted">
                                Sin permisos
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div *ngIf="systemMenus.length === 0 && selectedSystem" class="alert alert-warning">
                  No hay menús disponibles para este sistema.
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="closePermissionModal()">Cancelar</button>
              <button type="button" class="btn btn-primary" (click)="savePermissions()">
                Guardar Permisos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .card {
      box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
    }
    .badge {
      font-size: 0.75em;
    }
    .table th {
      background-color: #f8f9fa;
    }
  `]
})
export class ModuleDiscoveryPublicComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  
  discoveredModules: ModuleInfo[] = [];
  registeredSystems: System[] = [];
  availableRoles: Role[] = [];
  availablePermissions: Permission[] = [];
  systemMenus: any[] = [];
  selectedSystem: System | null = null;
  
  discovering = false;
  loading = false;
  registering = false;
  showRegistrationModal = false;
  showPermissionModal = false;
  
  selectedModule: ModuleInfo | null = null;
  registrationForm!: FormGroup;
  permissionForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    console.log('🚀 ModuleDiscoveryPublicComponent: Componente completamente independiente iniciado');
    this.loadMockData();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Inicializar AdminLTE después de que la vista esté lista
      setTimeout(() => {
        this.initializeAdminLTE();
      }, 100);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Método para cambiar tabs sin navegación del navegador
  switchTab(tabName: string, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    
    // Remover clase active de todos los nav-links
    const allNavLinks = document.querySelectorAll('.nav-link');
    allNavLinks.forEach(link => link.classList.remove('active'));
    
    // Agregar clase active al nav-link seleccionado
    const selectedNavLink = document.getElementById(`${tabName}-tab`);
    if (selectedNavLink) {
      selectedNavLink.classList.add('active');
    }
    
    // Ocultar todos los tab-panes
    const allTabPanes = document.querySelectorAll('.tab-pane');
    allTabPanes.forEach(pane => {
      pane.classList.remove('show', 'active');
    });
    
    // Mostrar el tab-pane seleccionado
    const selectedTabPane = document.getElementById(tabName);
    if (selectedTabPane) {
      selectedTabPane.classList.add('show', 'active');
    }
    
    // Actualizar aria-selected
    allNavLinks.forEach(link => link.setAttribute('aria-selected', 'false'));
    if (selectedNavLink) {
      selectedNavLink.setAttribute('aria-selected', 'true');
    }
  }

  initializeForm(): void {
    this.registrationForm = this.fb.group({
      module_name: ['', [Validators.required]],
      display_name: ['', [Validators.required]],
      description: [''],
      url_base: ['', [Validators.required]],
      color: ['#007bff'],
      icon: ['fas fa-cube']
    });

    this.permissionForm = this.fb.group({
      system_id: ['', [Validators.required]],
      role_id: ['', [Validators.required]],
      menu_permissions: this.fb.array([])
    });
  }

  private loadMockData(): void {
    // Datos mock para demostración
    this.discoveredModules = [
      {
        name: 'planillas',
        path: '/Modules/Planillas',
        display_name: 'Sistema de Planillas',
        description: 'Módulo para gestión de planillas y nómina',
        version: '1.0.0',
        status: 'active',
        menus: [
          { name: 'Dashboard', route: '/planillas/dashboard', icon: 'fas fa-chart-pie', order: 1, active: true, permissions: ['planillas.view'] },
          { name: 'Empleados', route: '/planillas/empleados', icon: 'fas fa-users', order: 2, active: true, permissions: ['planillas.employees'] }
        ],
        has_menu_config: true
      }
    ];

    this.registeredSystems = [
      {
        id: 1,
        nombre: 'Sistema de Planillas',
        codigo: 'PLANILLAS',
        descripcion: 'Sistema integrado para gestión de planillas',
        url_base: '/planillas',
        activo: true,
        sso_habilitado: false,
        sso_force: false,
        menus_count: 5,
        active_menus_count: 5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    this.availableRoles = [
      {
        id: 1,
        name: 'Super Admin',
        guard_name: 'web',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Admin',
        guard_name: 'web',
        created_at: new Date().toISOString()
      }
    ];

    this.availablePermissions = [
      {
        id: 1,
        name: 'admin.menus',
        guard_name: 'web',
        created_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'admin.roles',
        guard_name: 'web',
        created_at: new Date().toISOString()
      }
    ];
  }

  discoverModules(): void {
    this.discovering = true;
    console.log('🔍 Descubriendo módulos...');
    
    // Simular descubrimiento
    setTimeout(() => {
      this.discovering = false;
      console.log('✅ Descubrimiento completado');
    }, 2000);
  }

  viewModuleDetails(module: ModuleInfo): void {
    console.log('Ver detalles del módulo:', module);
    alert(`Módulo: ${module.display_name}\nDescripción: ${module.description}`);
  }

  openRegistrationModal(module: ModuleInfo): void {
    this.selectedModule = module;
    
    this.registrationForm.patchValue({
      module_name: module.name,
      display_name: module.display_name,
      description: module.description,
      url_base: `/${module.name}`
    });
    
    this.showRegistrationModal = true;
  }

  closeRegistrationModal(): void {
    this.showRegistrationModal = false;
    this.selectedModule = null;
    this.registrationForm.reset();
  }

  registerModule(): void {
    if (this.registrationForm.valid) {
      this.registering = true;
      const formData = this.registrationForm.value;
      
      console.log('Registrando módulo:', formData);
      
      // Simular registro
      setTimeout(() => {
        this.registering = false;
        this.closeRegistrationModal();
        this.loadMockData(); // Recargar datos
        alert('Módulo registrado exitosamente');
      }, 2000);
    }
  }

  openPermissionModal(system?: any): void {
    this.showPermissionModal = true;
    
    if (system) {
      this.permissionForm.patchValue({
        system_id: system.id
      });
      this.onSystemChange(system.id);
    }
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.selectedSystem = null;
    this.systemMenus = [];
    this.permissionForm.reset();
  }

  onSystemChange(systemId: number): void {
    this.selectedSystem = this.getSystemById(systemId);
    if (this.selectedSystem) {
      this.loadSystemMenus(systemId);
    }
  }

  loadSystemMenus(systemId: number): void {
    console.log('🔍 Cargando menús del sistema:', systemId);
    
    // Simular carga de menús
    this.systemMenus = [
      {
        id: 1,
        nombre: 'Dashboard',
        ruta: '/planillas/dashboard',
        icono: 'fas fa-chart-pie',
        orden: 1,
        activo: true,
        permisos_requeridos: ['dashboard.ver'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        nombre: 'Empleados',
        ruta: '/planillas/empleados',
        icono: 'fas fa-users',
        orden: 2,
        activo: true,
        permisos_requeridos: ['empleados.ver', 'empleados.crear'],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
    
    this.initializeMenuPermissions();
  }

  initializeMenuPermissions(): void {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as FormArray;
    menuPermissionsArray.clear();
    
    this.systemMenus.forEach((menu, index) => {
      const menuPermissionGroup = this.fb.group({
        menu_id: [menu.id],
        permissions: this.fb.group({})
      });
      
      // Inicializar permisos para cada menú
      this.availablePermissions.forEach(permission => {
        (menuPermissionGroup.get('permissions') as FormGroup).addControl(
          permission.name,
          this.fb.control(false)
        );
      });
      
      menuPermissionsArray.push(menuPermissionGroup);
    });
  }

  toggleMenuPermission(menuIndex: number, permission: string, event: any): void {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as FormArray;
    const menuPermissionGroup = menuPermissionsArray.at(menuIndex);
    const permissionsGroup = menuPermissionGroup.get('permissions') as FormGroup;
    
    permissionsGroup.get(permission)?.setValue(event.target.checked);
  }

  getMenuPermissions(menuIndex: number): string[] {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as FormArray;
    const menuPermissionGroup = menuPermissionsArray.at(menuIndex);
    const permissionsGroup = menuPermissionGroup.get('permissions') as FormGroup;
    
    return Object.keys(permissionsGroup.controls).filter(key => 
      permissionsGroup.get(key)?.value === true
    );
  }

  savePermissions(): void {
    if (this.permissionForm.valid) {
      const formData = this.permissionForm.value;
      console.log('Guardando permisos:', formData);
      
      // Simular guardado
      setTimeout(() => {
        this.closePermissionModal();
        alert('Permisos guardados exitosamente');
      }, 1000);
    }
  }

  getSystemById(systemId: number): System | null {
    return this.registeredSystems.find(system => system.id === systemId) || null;
  }

  isModuleRegistered(moduleName: string): boolean {
    return this.registeredSystems.some(system => 
      system.codigo.toLowerCase() === moduleName.toLowerCase()
    );
  }

  getRegisteredModulesCount(): number {
    return this.discoveredModules.filter(m => this.isModuleRegistered(m.name)).length;
  }

  getModulesWithMenuConfigCount(): number {
    return this.discoveredModules.filter(m => m.has_menu_config).length;
  }

  getModulesWithApiRoutesCount(): number {
    // Los módulos descubiertos no tienen rutas API específicas, todos tienen menús
    return this.discoveredModules.filter(m => m.has_menu_config).length;
  }

  isLastSystem(index: number): boolean {
    return index === this.registeredSystems.length - 1;
  }

  isLastRole(index: number): boolean {
    return index === this.availableRoles.length - 1;
  }

  /**
   * Inicializa AdminLTE específicamente para este componente
   */
  private initializeAdminLTE(): void {
    if (isPlatformBrowser(this.platformId) && typeof window !== 'undefined' && (window as any).$) {
      const $ = (window as any).$;
      
      try {
        console.log('🔧 ModuleDiscoveryPublic: Inicializando AdminLTE widgets...');
        
        // Initialize PushMenu (sidebar toggle)
        if ($.fn.PushMenu) {
          $('[data-widget="pushmenu"]').PushMenu();
          console.log('✅ ModuleDiscoveryPublic: PushMenu inicializado');
        }

        // Initialize TreeView (collapsible menu)
        if ($.fn.Treeview) {
          $('[data-widget="treeview"]').Treeview();
          console.log('✅ ModuleDiscoveryPublic: Treeview inicializado');
        }

        // Initialize CardWidget (collapsible cards)
        if ($.fn.CardWidget) {
          $('[data-card-widget]').CardWidget();
          console.log('✅ ModuleDiscoveryPublic: CardWidget inicializado');
        }

        // Initialize Dropdown
        if ($.fn.Dropdown) {
          $('.dropdown-toggle').Dropdown();
          console.log('✅ ModuleDiscoveryPublic: Dropdown inicializado');
        }

        // Initialize Nav Tabs
        if ($.fn.Tab) {
          $('.nav-tabs a').Tab();
          console.log('✅ ModuleDiscoveryPublic: Nav Tabs inicializado');
        }

        // Initialize Modal
        if ($.fn.Modal) {
          $('.modal').Modal();
          console.log('✅ ModuleDiscoveryPublic: Modal inicializado');
        }

        // Initialize Tooltip
        if ($.fn.Tooltip) {
          $('[data-toggle="tooltip"]').Tooltip();
          console.log('✅ ModuleDiscoveryPublic: Tooltip inicializado');
        }

        // Initialize Popover
        if ($.fn.Popover) {
          $('[data-toggle="popover"]').Popover();
          console.log('✅ ModuleDiscoveryPublic: Popover inicializado');
        }

        console.log('🎉 ModuleDiscoveryPublic: AdminLTE inicializado completamente');
        
      } catch (error) {
        console.error('❌ ModuleDiscoveryPublic: Error inicializando AdminLTE:', error);
      }
    } else {
      console.warn('⚠️ ModuleDiscoveryPublic: jQuery o AdminLTE no están disponibles');
    }
  }
}
