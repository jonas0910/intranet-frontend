import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { ModuleDiscoveryService, ModuleInfo, ModuleRegistration } from '../../../services/module-discovery.service';
import { SystemManagementService } from '../../../services/system-management.service';
import { NotificationService } from '../../../services/notification.service';
import { SistemaIntegradoMenusService } from '../../../services/sistema-integrado-menus.service';

@Component({
  selector: 'app-module-discovery',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  templateUrl: './module-discovery.component.html',
  styleUrls: ['./module-discovery.component.scss']
})
export class ModuleDiscoveryComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();

  // Estados
  loading = false;
  discovering = false;
  registering = false;
  
  // Datos
  discoveredModules: ModuleInfo[] = [];
  registeredSystems: any[] = [];
  selectedModule: ModuleInfo | null = null;
  selectedSystem: any = null;
  systemMenus: any[] = [];
  availableRoles: any[] = [];
  availablePermissions: any[] = [];

  // Formularios
  registrationForm!: FormGroup;
  permissionForm!: FormGroup;

  // Estados de modales
  showRegistrationModal = false;
  showPermissionModal = false;

  constructor(
    private moduleDiscoveryService: ModuleDiscoveryService,
    private systemManagementService: SystemManagementService,
    private notificationService: NotificationService,
    private sistemaIntegradoMenusService: SistemaIntegradoMenusService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadRegisteredSystems();
    this.loadRolesAndPermissions();
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

  private initializeForm(): void {
    this.registrationForm = this.fb.group({
      module_name: ['', [Validators.required]],
      display_name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.maxLength(500)]],
      url_base: ['', [Validators.maxLength(255)]],
      icon: ['fas fa-server', [Validators.maxLength(100)]],
      color: ['#007bff', [Validators.maxLength(20)]]
    });

    this.permissionForm = this.fb.group({
      system_id: ['', [Validators.required]],
      role_id: ['', [Validators.required]],
      menu_permissions: this.fb.array([])
    });
  }

  loadRegisteredSystems(): void {
    this.loading = true;
    console.log('🔍 Cargando sistemas registrados desde API real');
    
    this.systemManagementService.getSystems().subscribe({
      next: (response) => {
        this.registeredSystems = response.data || [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando sistemas:', error);
        this.loading = false;
        this.notificationService.error('Error al cargar sistemas registrados');
      }
    });
  }

  loadRolesAndPermissions(): void {
    console.log('🔍 Cargando roles y permisos desde API real');
    
    this.systemManagementService.getRolesAndPermissions().subscribe({
      next: (response) => {
        this.availableRoles = response.data?.roles || [];
        this.availablePermissions = response.data?.permissions || [];
      },
      error: (error) => {
        console.error('Error cargando roles y permisos:', error);
        this.notificationService.error('Error al cargar roles y permisos');
      }
    });
  }

  loadSystemMenus(systemId: number): void {
    console.log('🔍 Cargando menús del sistema desde API real');
    
    this.systemManagementService.getSystemMenus(systemId).subscribe({
      next: (response) => {
        this.systemMenus = response.data || [];
        this.initializeMenuPermissions();
      },
      error: (error) => {
        console.error('Error cargando menús del sistema:', error);
        this.notificationService.error('Error al cargar menús del sistema');
      }
    });
  }

  discoverModules(): void {
    this.discovering = true;
    console.log('🔍 Descubriendo módulos desde API real');
    
    this.moduleDiscoveryService.discoverModules().subscribe({
      next: (response) => {
        this.discoveredModules = response.data || [];
        this.discovering = false;
        this.notificationService.success(`Se descubrieron ${this.discoveredModules.length} módulos`);
      },
      error: (error) => {
        console.error('Error descubriendo módulos:', error);
        this.discovering = false;
        this.notificationService.error('Error al descubrir módulos');
      }
    });
  }

  openRegistrationModal(module: ModuleInfo): void {
    this.selectedModule = module;
    
    this.registrationForm.patchValue({
      module_name: module.name,
      display_name: module.display_name,
      description: module.description || `Módulo ${module.name}`,
      url_base: `/modules/${module.name.toLowerCase()}`,
      icon: 'fas fa-server',
      color: '#007bff'
    });
    
    this.showRegistrationModal = true;
  }

  closeRegistrationModal(): void {
    this.showRegistrationModal = false;
    this.selectedModule = null;
    this.registrationForm.reset();
  }

  registerModule(): void {
    if (this.registrationForm.valid && this.selectedModule) {
      this.registering = true;
      
      // ✅ CORRECCIÓN: Usar directamente el endpoint que funciona con servicio unificado
      const moduleData = {
        module_name: this.registrationForm.value.module_name,
        display_name: this.registrationForm.value.display_name,
        description: this.registrationForm.value.description,
        url_base: this.registrationForm.value.url_base,
        icon: this.registrationForm.value.icon,
        color: this.registrationForm.value.color
      };
      
      console.log('📤 Enviando datos de registro al servicio unificado:', {
        moduleData,
        selectedModule: this.selectedModule
      });
      
      // ✅ CORRECCIÓN: Usar directamente el endpoint que ya funciona
      this.moduleDiscoveryService.registerModuleDirect(moduleData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              this.notificationService.success('Módulo registrado exitosamente como sistema');
              console.log('✅ Módulo registrado exitosamente:', response.data);
              
              this.closeRegistrationModal();
              this.loadRegisteredSystems();
            } else {
              this.notificationService.error('Error: ' + response.message);
            }
            this.registering = false;
          },
          error: (error) => {
            console.error('Error registrando módulo:', error);
            this.notificationService.error('Error al registrar módulo');
            this.registering = false;
          }
        });
    } else {
      this.notificationService.error('Por favor, complete todos los campos requeridos');
    }
  }

  /**
   * ✅ NUEVO: Guardar menús con jerarquía usando el nuevo servicio
   */
  private saveMenusWithHierarchy(sistemaId: number, patronData: any): void {
    console.log('🔄 Guardando menús con jerarquía', {
      sistema_id: sistemaId,
      patron_data: patronData
    });

    // Procesar patron_data para el backend
    const processedPatronData = this.sistemaIntegradoMenusService.processPatronDataForBackend(patronData);

    this.sistemaIntegradoMenusService.saveMenusFromPatronData(sistemaId, processedPatronData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            console.log('✅ Menús guardados con jerarquía exitosamente', {
              sistema_id: sistemaId,
              menus_guardados: response.data.menus_guardados
            });
            this.notificationService.success(`Menús guardados: ${response.data.menus_guardados} elementos con jerarquía`);
          } else {
            console.error('❌ Error guardando menús:', response.message);
            this.notificationService.error('Error guardando menús: ' + response.message);
          }
        },
        error: (error) => {
          console.error('❌ Error guardando menús con jerarquía:', error);
          this.notificationService.error('Error guardando menús con jerarquía');
        }
      });
  }

  /**
   * Convertir menús planos a estructura jerárquica
   */
  private convertToHierarchicalMenus(menus: any[]): any[] {
    const hierarchicalMenus: any[] = [];
    
    // Agrupar menús por categoría principal
    const menuGroups = this.groupMenusByCategory(menus);
    
    let order = 1;
    
    // Crear menús principales (nivel 1)
    for (const [category, categoryMenus] of Object.entries(menuGroups)) {
      const mainMenu = {
        name: category,
        route: '#', // Menú principal sin ruta específica
        icon: this.getCategoryIcon(category),
        order: order++,
        active: true,
        permissions: [],
        level: 1,
        description: `Categoría ${category}`,
        badge: null,
        parent_name: null
      };
      
      hierarchicalMenus.push(mainMenu);
      
      // Crear submenús (nivel 2)
      for (const menu of categoryMenus as any[]) {
        const subMenu = {
          name: menu.name,
          route: menu.route || '/',
          icon: menu.icon || 'fas fa-circle',
          order: menu.order || 1,
          active: menu.active !== false,
          permissions: menu.permissions || [],
          level: 2,
          description: menu.description || null,
          badge: menu.badge || null,
          parent_name: category // Referencia al menú principal
        };
        
        hierarchicalMenus.push(subMenu);
      }
    }
    
    return hierarchicalMenus;
  }

  /**
   * Agrupar menús por categoría
   */
  private groupMenusByCategory(menus: any[]): { [key: string]: any[] } {
    const groups: { [key: string]: any[] } = {};
    
    for (const menu of menus) {
      const category = this.getMenuCategory(menu.name);
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(menu);
    }
    
    return groups;
  }

  /**
   * Determinar la categoría de un menú basado en su nombre
   */
  private getMenuCategory(menuName: string): string {
    const name = menuName.toLowerCase();
    
    if (name.includes('empleado') || name.includes('personal') || name.includes('contrato') || name.includes('departamento')) {
      return 'Gestión de Personal';
    }
    if (name.includes('planilla') || name.includes('procesar') || name.includes('generar') || name.includes('historial')) {
      return 'Procesamiento de Planillas';
    }
    if (name.includes('concepto') || name.includes('variable') || name.includes('plantilla') || name.includes('parametro')) {
      return 'Conceptos y Fórmulas';
    }
    if (name.includes('reporte') || name.includes('dashboard') || name.includes('sunat')) {
      return 'Reportes y Análisis';
    }
    if (name.includes('configuracion') || name.includes('afp') || name.includes('auditoria')) {
      return 'Configuración';
    }
    if (name.includes('importar') || name.includes('exportar')) {
      return 'Herramientas';
    }
    if (name.includes('capacitacion') || name.includes('evaluacion') || name.includes('horario') || name.includes('vacacion')) {
      return 'Módulos Futuros';
    }
    
    return 'Panel Principal';
  }

  /**
   * Obtener icono para una categoría
   */
  private getCategoryIcon(category: string): string {
    const icons: { [key: string]: string } = {
      'Gestión de Personal': 'fas fa-users',
      'Procesamiento de Planillas': 'fas fa-calculator',
      'Conceptos y Fórmulas': 'fas fa-cogs',
      'Reportes y Análisis': 'fas fa-chart-bar',
      'Configuración': 'fas fa-tools',
      'Herramientas': 'fas fa-wrench',
      'Módulos Futuros': 'fas fa-rocket',
      'Panel Principal': 'fas fa-tachometer-alt'
    };
    
    return icons[category] || 'fas fa-circle';
  }

  isModuleRegistered(moduleName: string): boolean {
    return this.registeredSystems.some(system => 
      system.codigo === moduleName.toUpperCase() || 
      system.nombre.toLowerCase().includes(moduleName.toLowerCase())
    );
  }

  getModuleStatusClass(module: ModuleInfo): string {
    if (this.isModuleRegistered(module.name)) {
      return 'badge-success';
    }
    return 'badge-secondary';
  }

  getModuleStatusText(module: ModuleInfo): string {
    if (this.isModuleRegistered(module.name)) {
      return 'Registrado';
    }
    return 'Disponible';
  }

  getModuleIcon(module: ModuleInfo): string {
    if (module.has_menu_config) {
      return 'fas fa-server'; // Icono para módulos con menús
    }
    return 'fas fa-folder'; // Icono por defecto
  }

  getModuleColor(module: ModuleInfo): string {
    if (module.has_menu_config) {
      return '#28a745'; // Verde si tiene menús
    }
    return '#6c757d'; // Gris por defecto
  }

  getRoutesCount(module: ModuleInfo): number {
    // Los módulos descubiertos no tienen rutas específicas, solo menús
    return 0;
  }

  getMenusCount(module: ModuleInfo): number {
    return module.menus?.length || 0;
  }

  getControllersCount(module: ModuleInfo): number {
    // Los módulos descubiertos no tienen información de controladores
    return 0;
  }

  getModelsCount(module: ModuleInfo): number {
    // Los módulos descubiertos no tienen información de modelos
    return 0;
  }

  getMigrationsCount(module: ModuleInfo): number {
    // Los módulos descubiertos no tienen información de migraciones
    return 0;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Métodos para estadísticas
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

  // Métodos para gestión de permisos
  openPermissionModal(system?: any): void {
    this.selectedSystem = system || null;
    
    if (system) {
      this.permissionForm.patchValue({
        system_id: system.id
      });
      this.loadSystemMenus(system.id);
    }
    
    this.showPermissionModal = true;
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.selectedSystem = null;
    this.systemMenus = [];
    this.permissionForm.reset();
  }

  onSystemChange(systemId: number): void {
    this.selectedSystem = this.registeredSystems.find(s => s.id === systemId);
    if (systemId) {
      this.loadSystemMenus(systemId);
    } else {
      this.systemMenus = [];
    }
  }

  initializeMenuPermissions(): void {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as any;
    menuPermissionsArray.clear();
    
    this.systemMenus.forEach(menu => {
      menuPermissionsArray.push(this.fb.group({
        menu_id: [menu.id],
        menu_name: [menu.nombre],
        permissions: [[]]
      }));
    });
  }

  toggleMenuPermission(menuIndex: number, permission: string, event: any): void {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as any;
    const menuGroup = menuPermissionsArray.at(menuIndex);
    const currentPermissions = menuGroup.get('permissions').value || [];
    
    if (event.target.checked) {
      if (!currentPermissions.includes(permission)) {
        currentPermissions.push(permission);
      }
    } else {
      const index = currentPermissions.indexOf(permission);
      if (index > -1) {
        currentPermissions.splice(index, 1);
      }
    }
    
    menuGroup.patchValue({
      permissions: currentPermissions
    });
  }

  savePermissions(): void {
    if (this.permissionForm.valid) {
      const formData = this.permissionForm.value;
      const roleId = formData.role_id;
      
      // Procesar cada menú con sus permisos
      formData.menu_permissions.forEach((menuPermission: any) => {
        if (menuPermission.permissions.length > 0) {
          const assignmentData = {
            role_id: roleId,
            menu_id: menuPermission.menu_id,
            permissions: menuPermission.permissions
          };
          
          this.systemManagementService.assignMenuPermissions(assignmentData)
            .pipe(takeUntil(this.destroy$))
            .subscribe({
              next: (response) => {
                if (response.success) {
                  this.notificationService.success(`Permisos asignados para ${menuPermission.menu_name}`);
                } else {
                  this.notificationService.error('Error: ' + response.message);
                }
              },
              error: (error) => {
                console.error('Error asignando permisos:', error);
                this.notificationService.error('Error al asignar permisos');
              }
            });
        }
      });
      
      this.closePermissionModal();
    } else {
      this.notificationService.error('Por favor, complete todos los campos requeridos');
    }
  }

  getSystemById(systemId: number): any {
    return this.registeredSystems.find(s => s.id === systemId);
  }

  getMenuPermissions(menuIndex: number): string[] {
    const menuPermissionsArray = this.permissionForm.get('menu_permissions') as any;
    if (menuPermissionsArray && menuPermissionsArray.at(menuIndex)) {
      return menuPermissionsArray.at(menuIndex).get('permissions').value || [];
    }
    return [];
  }

  viewSystemDetails(system: any): void {
    // Por ahora solo mostramos una notificación
    // En el futuro se puede implementar un modal de detalles
    this.notificationService.info(`Sistema: ${system.nombre} (${system.codigo})`);
  }

  viewModuleDetails(module: ModuleInfo): void {
    // Por ahora solo mostramos una notificación
    // En el futuro se puede implementar un modal de detalles
    this.notificationService.info(`Módulo: ${module.name} - ${module.description || 'Sin descripción'}`);
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
        console.log('🔧 ModuleDiscovery: Inicializando AdminLTE widgets...');
        
        // Initialize PushMenu (sidebar toggle)
        if ($.fn.PushMenu) {
          $('[data-widget="pushmenu"]').PushMenu();
          console.log('✅ ModuleDiscovery: PushMenu inicializado');
        }

        // Initialize TreeView (collapsible menu)
        if ($.fn.Treeview) {
          $('[data-widget="treeview"]').Treeview();
          console.log('✅ ModuleDiscovery: Treeview inicializado');
        }

        // Initialize CardWidget (collapsible cards)
        if ($.fn.CardWidget) {
          $('[data-card-widget]').CardWidget();
          console.log('✅ ModuleDiscovery: CardWidget inicializado');
        }

        // Initialize Dropdown
        if ($.fn.Dropdown) {
          $('.dropdown-toggle').Dropdown();
          console.log('✅ ModuleDiscovery: Dropdown inicializado');
        }

        // Initialize Nav Tabs
        if ($.fn.Tab) {
          $('.nav-tabs a').Tab();
          console.log('✅ ModuleDiscovery: Nav Tabs inicializado');
        }

        // Initialize Modal
        if ($.fn.Modal) {
          $('.modal').Modal();
          console.log('✅ ModuleDiscovery: Modal inicializado');
        }

        // Initialize Tooltip
        if ($.fn.Tooltip) {
          $('[data-toggle="tooltip"]').Tooltip();
          console.log('✅ ModuleDiscovery: Tooltip inicializado');
        }

        // Initialize Popover
        if ($.fn.Popover) {
          $('[data-toggle="popover"]').Popover();
          console.log('✅ ModuleDiscovery: Popover inicializado');
        }

        console.log('🎉 ModuleDiscovery: AdminLTE inicializado completamente');
        
      } catch (error) {
        console.error('❌ ModuleDiscovery: Error inicializando AdminLTE:', error);
      }
    } else {
      console.warn('⚠️ ModuleDiscovery: jQuery o AdminLTE no están disponibles');
    }
  }
}
