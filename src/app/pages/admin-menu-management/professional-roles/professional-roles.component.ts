import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { RolePermissionManagementService, Role, Permission, User } from '../../../services/role-permission-management.service';
import { NotificationService } from '../../../services/notification.service';

// Declarar jQuery y DataTables para TypeScript
declare var $: any;
declare var DataTable: any;

@Component({
  selector: 'app-professional-roles',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DataTablesModule],
  templateUrl: './professional-roles.component.html',
  styleUrls: ['./professional-roles.component.scss']
})
export class ProfessionalRolesComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('roleModal') roleModal!: TemplateRef<any>;
  @ViewChild('permissionModal') permissionModal!: TemplateRef<any>;
  @ViewChild('userModal') userModal!: TemplateRef<any>;

  private destroy$ = new Subject<void>();

  // Datos
  roles: Role[] = [];
  permissions: Permission[] = [];
  users: User[] = [];
  filteredRoles: Role[] = [];
  filteredPermissions: Permission[] = [];
  filteredUsers: User[] = [];

  // Estados
  loading = false;
  saving = false;
  selectedRole: Role | null = null;
  selectedPermission: Permission | null = null;
  selectedUser: User | null = null;

  // Formularios
  roleForm!: FormGroup;
  permissionForm!: FormGroup;
  userRoleForm!: FormGroup;

  // Modales
  showRoleModal = false;
  showPermissionModal = false;
  showUserModal = false;
  showDeleteModal = false;
  showBulkModal = false;

  // Filtros y búsqueda
  searchQuery = '';
  statusFilter = 'all';
  moduleFilter = 'all';
  categoryFilter = 'all';

  // DataTable
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Selección múltiple
  selectedRoles: number[] = [];
  selectAll = false;

  constructor(
    private rolePermissionService: RolePermissionManagementService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    this.initializeDataTable();
    this.loadData();
    this.subscribeToServices();
  }

  // Getters para estadísticas
  get activeRolesCount(): number {
    return this.roles.filter(r => r.is_active).length;
  }

  get inactiveRolesCount(): number {
    return this.roles.filter(r => !r.is_active).length;
  }

  get totalPermissionsCount(): number {
    return this.permissions.length;
  }

  // Método para activar el input de archivo
  triggerImportFile(): void {
    const fileInput = document.getElementById('importFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  ngAfterViewInit(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.next(null);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.roleForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      display_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      color: ['#007bff', Validators.required],
      icon: ['fas fa-user-tag', Validators.required],
      is_active: [true],
      is_system: [false]
    });

    this.permissionForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      display_name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      description: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
      module: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      category: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      is_active: [true],
      is_system: [false]
    });

    this.userRoleForm = this.fb.group({
      user_id: ['', Validators.required],
      role_id: ['', Validators.required],
      expires_at: ['']
    });
  }

  private initializeDataTable(): void {
    this.dtOptions = {
      // Configuración básica
      paging: true,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50, 100, -1], [5, 10, 25, 50, 100, 'Todos']],
      searching: true,
      ordering: true,
      info: true,
      responsive: true,
      processing: true,
      serverSide: false,

      // Idioma español
      language: {
        "sProcessing": "Procesando...",
        "sLengthMenu": "Mostrar _MENU_ registros",
        "sZeroRecords": "No se encontraron resultados",
        "sEmptyTable": "Ningún dato disponible en esta tabla",
        "sInfo": "Mostrando registros del _START_ al _END_ de un total de _TOTAL_ registros",
        "sInfoEmpty": "Mostrando registros del 0 al 0 de un total de 0 registros",
        "sInfoFiltered": "(filtrado de un total de _MAX_ registros)",
        "sInfoPostFix": "",
        "sSearch": "Buscar:",
        "sUrl": "",
        "sInfoThousands": ",",
        "sLoadingRecords": "Cargando...",
        "oPaginate": {
          "sFirst": "Primero",
          "sLast": "Último",
          "sNext": "Siguiente",
          "sPrevious": "Anterior"
        },
        "oAria": {
          "sSortAscending": ": Activar para ordenar la columna de manera ascendente",
          "sSortDescending": ": Activar para ordenar la columna de manera descendente"
        }
      },

      // Botones de exportación
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"B>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>',

      buttons: [
        {
          extend: 'excel',
          text: '<i class="fas fa-file-excel"></i> Excel',
          className: 'btn btn-success btn-sm',
          title: 'Gestión de Roles',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6] // Excluir checkbox y acciones
          }
        },
        {
          extend: 'pdf',
          text: '<i class="fas fa-file-pdf"></i> PDF',
          className: 'btn btn-danger btn-sm',
          title: 'Gestión de Roles',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6]
          }
        },
        {
          extend: 'csv',
          text: '<i class="fas fa-file-csv"></i> CSV',
          className: 'btn btn-info btn-sm',
          title: 'Gestión de Roles',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6]
          }
        },
        {
          extend: 'print',
          text: '<i class="fas fa-print"></i> Imprimir',
          className: 'btn btn-secondary btn-sm',
          title: 'Gestión de Roles',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6]
          }
        },
        {
          extend: 'copy',
          text: '<i class="fas fa-copy"></i> Copiar',
          className: 'btn btn-warning btn-sm'
        }
      ],

      // Configuración de columnas
      columns: [
        {
          data: null,
          title: '<input type="checkbox" id="selectAll">',
          orderable: false,
          searchable: false,
          className: 'text-center',
          render: function(data: any, type: any, row: any) {
            return `<input type="checkbox" class="role-checkbox" value="${row.id}">`;
          }
        },
        {
          data: 'display_name',
          title: 'Rol',
          render: function(data: string, type: any, row: any) {
            return `
              <div class="d-flex align-items-center">
                <span class="badge me-2" style="background-color: ${row.color}; color: white;">
                  <i class="${row.icon}"></i>
                </span>
                <div>
                  <strong>${data}</strong>
                  <br>
                  <small class="text-muted">${row.name}</small>
                </div>
              </div>
            `;
          }
        },
        {
          data: 'description',
          title: 'Descripción',
          render: function(data: string, type: any, row: any) {
            return data.length > 50 ? data.substring(0, 50) + '...' : data;
          }
        },
        {
          data: 'permissions_count',
          title: 'Permisos',
          className: 'text-center',
          render: function(data: number, type: any, row: any) {
            return `<span class="badge bg-info">${data}</span>`;
          }
        },
        {
          data: 'users_count',
          title: 'Usuarios',
          className: 'text-center',
          render: function(data: number, type: any, row: any) {
            return `<span class="badge bg-success">${data}</span>`;
          }
        },
        {
          data: 'is_active',
          title: 'Estado',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'danger';
            const statusText = data ? 'Activo' : 'Inactivo';
            return `<span class="badge bg-${statusClass}">${statusText}</span>`;
          }
        },
        {
          data: 'created_at',
          title: 'Creado',
          render: function(data: string, type: any, row: any) {
            const date = new Date(data);
            return `<small>${date.toLocaleDateString()}<br>${date.toLocaleTimeString()}</small>`;
          }
        },
        {
          data: null,
          title: 'Acciones',
          orderable: false,
          searchable: false,
          className: 'text-center',
          render: function(data: any, type: any, row: any) {
            return `
              <div class="btn-group" role="group">
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.editRole(${row.id})" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-info" onclick="window.managePermissions(${row.id})" title="Permisos">
                  <i class="fas fa-key"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-warning" onclick="window.manageUsers(${row.id})" title="Usuarios">
                  <i class="fas fa-users"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.deleteRole(${row.id})" title="Eliminar">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `;
          }
        }
      ],

      // Ordenamiento inicial
      order: [[1, 'asc']],

      // Callback de inicialización
      initComplete: () => {
        console.log('✅ DataTable de roles inicializado correctamente');
        
        // Configurar funciones globales para los botones
        (window as any).editRole = (id: number) => this.editRole(id);
        (window as any).managePermissions = (id: number) => this.managePermissions(id);
        (window as any).manageUsers = (id: number) => this.manageUsers(id);
        (window as any).deleteRole = (id: number) => this.deleteRole(id);
        
        // Configurar checkbox de selección múltiple
        this.setupSelectAll();
      }
    };
  }

  private setupSelectAll(): void {
    setTimeout(() => {
      const selectAllCheckbox = document.getElementById('selectAll') as HTMLInputElement;
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const checkboxes = document.querySelectorAll('.role-checkbox') as NodeListOf<HTMLInputElement>;
          
          checkboxes.forEach(checkbox => {
            checkbox.checked = target.checked;
          });
          
          this.selectAll = target.checked;
          this.updateSelectedRoles();
        });
      }
    }, 100);
  }

  private updateSelectedRoles(): void {
    const checkboxes = document.querySelectorAll('.role-checkbox:checked') as NodeListOf<HTMLInputElement>;
    this.selectedRoles = Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  private subscribeToServices(): void {
    this.rolePermissionService.roles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.roles = roles;
        this.applyFilters();
        this.totalItems = this.filteredRoles.length;
      });

    this.rolePermissionService.permissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.permissions = permissions;
      });

    this.rolePermissionService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users = users;
      });
  }

  private loadData(): void {
    this.loading = true;
    
    Promise.all([
      this.rolePermissionService.loadRoles().toPromise(),
      this.rolePermissionService.loadPermissions().toPromise(),
      this.rolePermissionService.loadUsers().toPromise()
    ]).finally(() => {
      this.loading = false;
    });
  }

  // Métodos para gestión de roles
  openRoleModal(role?: Role): void {
    this.selectedRole = role || null;
    
    if (role) {
      this.roleForm.patchValue({
        name: role.name,
        display_name: role.display_name,
        description: role.description,
        color: role.color,
        icon: role.icon,
        is_active: role.is_active,
        is_system: role.is_system
      });
    } else {
      this.roleForm.reset({
        color: '#007bff',
        icon: 'fas fa-user-tag',
        is_active: true,
        is_system: false
      });
    }
    
    this.showRoleModal = true;
  }

  closeRoleModal(): void {
    this.showRoleModal = false;
    this.selectedRole = null;
    this.roleForm.reset();
  }

  saveRole(): void {
    if (this.roleForm.valid) {
      this.saving = true;
      const roleData = this.roleForm.value;
      
      const errors = this.rolePermissionService.validateRoleData(roleData);
      if (errors.length > 0) {
        this.notificationService.error(errors.join('<br>'));
        this.saving = false;
        return;
      }

      const operation = this.selectedRole 
        ? this.rolePermissionService.updateRole(this.selectedRole.id, roleData)
        : this.rolePermissionService.createRole(roleData);

      operation
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.saving = false;
          this.closeRoleModal();
          this.refreshDataTable();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  editRole(id: number): void {
    const role = this.rolePermissionService.getRoleById(id);
    if (role) {
      this.openRoleModal(role);
    }
  }

  deleteRole(id: number): void {
    const role = this.rolePermissionService.getRoleById(id);
    if (role) {
      this.selectedRole = role;
      this.showDeleteModal = true;
    }
  }

  confirmDelete(): void {
    if (this.selectedRole) {
      this.saving = true;
      
      this.rolePermissionService.deleteRole(this.selectedRole.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.saving = false;
          this.showDeleteModal = false;
          this.selectedRole = null;
          this.refreshDataTable();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  // Métodos para gestión de permisos
  managePermissions(roleId: number): void {
    const role = this.rolePermissionService.getRoleById(roleId);
    if (role) {
      this.selectedRole = role;
      this.showPermissionModal = true;
    }
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.selectedRole = null;
  }

  togglePermission(permissionId: number): void {
    if (this.selectedRole) {
      // Implementar lógica de toggle de permisos
      console.log(`Toggle permission ${permissionId} for role ${this.selectedRole.id}`);
    }
  }

  // Métodos para gestión de usuarios
  manageUsers(roleId: number): void {
    const role = this.rolePermissionService.getRoleById(roleId);
    if (role) {
      this.selectedRole = role;
      this.showUserModal = true;
    }
  }

  closeUserModal(): void {
    this.showUserModal = false;
    this.selectedRole = null;
  }

  assignUserToRole(): void {
    if (this.userRoleForm.valid) {
      const { user_id, role_id, expires_at } = this.userRoleForm.value;
      
      this.rolePermissionService.assignRoleToUser(user_id, role_id, expires_at)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.closeUserModal();
          this.userRoleForm.reset();
          this.refreshDataTable();
        }
      });
    }
  }

  // Métodos de filtrado y búsqueda
  applyFilters(): void {
    let filtered = [...this.roles];

    // Filtro de búsqueda
    if (this.searchQuery) {
      filtered = this.rolePermissionService.searchRoles(this.searchQuery);
    }

    // Filtro de estado
    if (this.statusFilter !== 'all') {
      const isActive = this.statusFilter === 'active';
      filtered = filtered.filter(role => role.is_active === isActive);
    }

    this.filteredRoles = filtered;
    this.totalItems = filtered.length;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  // Métodos de paginación
  get paginatedRoles(): Role[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.filteredRoles.slice(startIndex, endIndex);
  }

  get totalPages(): number {
    return Math.ceil(this.totalItems / this.itemsPerPage);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  // Métodos de selección múltiple
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.selectedRoles = this.selectAll ? this.filteredRoles.map(r => r.id) : [];
  }

  toggleRoleSelection(roleId: number): void {
    const index = this.selectedRoles.indexOf(roleId);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
    } else {
      this.selectedRoles.push(roleId);
    }
    
    this.selectAll = this.selectedRoles.length === this.filteredRoles.length;
  }

  // Métodos de acciones masivas
  openBulkModal(): void {
    if (this.selectedRoles.length === 0) {
      this.notificationService.warning('Selecciona al menos un rol para realizar acciones masivas');
      return;
    }
    this.showBulkModal = true;
  }

  closeBulkModal(): void {
    this.showBulkModal = false;
  }

  bulkActivate(): void {
    // Implementar activación masiva
    console.log('Bulk activate roles:', this.selectedRoles);
    this.closeBulkModal();
  }

  bulkDeactivate(): void {
    // Implementar desactivación masiva
    console.log('Bulk deactivate roles:', this.selectedRoles);
    this.closeBulkModal();
  }

  bulkDelete(): void {
    // Implementar eliminación masiva
    console.log('Bulk delete roles:', this.selectedRoles);
    this.closeBulkModal();
  }

  // Métodos de exportación/importación
  exportRoles(): void {
    this.rolePermissionService.exportRoles().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `roles_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.notificationService.error('Error al exportar los roles');
      }
    });
  }

  importRoles(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.rolePermissionService.importRoles(file)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
        next: () => {
          this.refreshDataTable();
        }
      });
    }
  }

  // Métodos de utilidad
  refreshDataTable(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) {
      this.dtTrigger.next(null);
    }
  }

  getRoleIcon(icon: string): string {
    return icon || 'fas fa-user-tag';
  }

  getRoleColor(color: string): string {
    return color || '#007bff';
  }

  getModuleClass(module: string): string {
    const moduleClasses: { [key: string]: string } = {
      'Core': 'primary',
      'Planillas': 'info',
      'Reportes': 'warning',
      'Documentos': 'success',
      'Soporte': 'danger',
      'Administración': 'secondary'
    };
    return moduleClasses[module] || 'secondary';
  }

  // Métodos de validación
  isRoleNameUnique(name: string): boolean {
    const existingRole = this.roles.find(r => 
      r.name.toLowerCase() === name.toLowerCase() && 
      (!this.selectedRole || r.id !== this.selectedRole.id)
    );
    return !existingRole;
  }

  isDisplayNameUnique(displayName: string): boolean {
    const existingRole = this.roles.find(r => 
      r.display_name.toLowerCase() === displayName.toLowerCase() && 
      (!this.selectedRole || r.id !== this.selectedRole.id)
    );
    return !existingRole;
  }
}
