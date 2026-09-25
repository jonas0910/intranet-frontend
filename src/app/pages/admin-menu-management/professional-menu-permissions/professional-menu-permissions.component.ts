import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DataTablesModule } from '../../../lib/angular-datatables/angular-datatables.module';
import { RolePermissionManagementService, MenuItem, MenuPermission, Role, User } from '../../../services/role-permission-management.service';
import { NotificationService } from '../../../services/notification.service';

// Declarar jQuery y DataTables para TypeScript
declare var $: any;
declare var DataTable: any;

@Component({
  selector: 'app-professional-menu-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule, DataTablesModule],
  templateUrl: './professional-menu-permissions.component.html',
  styleUrls: ['./professional-menu-permissions.component.scss']
})
export class ProfessionalMenuPermissionsComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('permissionModal') permissionModal!: TemplateRef<any>;
  @ViewChild('bulkModal') bulkModal!: TemplateRef<any>;

  private destroy$ = new Subject<void>();

  // Datos
  menus: MenuItem[] = [];
  roles: Role[] = [];
  users: User[] = [];
  menuPermissions: MenuPermission[] = [];
  filteredMenus: MenuItem[] = [];
  filteredPermissions: MenuPermission[] = [];

  // Estados
  loading = false;
  saving = false;
  selectedMenu: MenuItem | null = null;
  selectedPermission: MenuPermission | null = null;
  selectedRole: Role | null = null;
  selectedUser: User | null = null;

  // Formularios
  permissionForm!: FormGroup;
  bulkPermissionForm!: FormGroup;

  // Modales
  showPermissionModal = false;
  showBulkModal = false;
  showDeleteModal = false;

  // Filtros y búsqueda
  searchQuery = '';
  menuFilter = 'all';
  roleFilter = 'all';
  userFilter = 'all';
  permissionTypeFilter = 'all';
  statusFilter = 'all';

  // DataTable
  dtOptions: any = {};
  dtTrigger: Subject<any> = new Subject<any>();

  // Paginación
  currentPage = 1;
  itemsPerPage = 10;
  totalItems = 0;

  // Selección múltiple
  selectedPermissions: number[] = [];
  selectAll = false;

  // Vista actual
  currentView: 'matrix' | 'list' | 'hierarchy' = 'matrix';

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
  get activeMenuPermissionsCount(): number {
    return this.menuPermissions.filter(p => p.is_active).length;
  }

  get inactiveMenuPermissionsCount(): number {
    return this.menuPermissions.filter(p => !p.is_active).length;
  }

  get totalMenusCount(): number {
    return this.menus.length;
  }

  // Método para verificar si un rol tiene un permiso específico en un menú
  hasPermission(menuId: number, roleId: number, permissionType: string): boolean {
    const permission = this.menuPermissions.find(p => 
      p.menu_id === menuId && p.role_id === roleId && p.is_active
    );
    return permission ? (permission as any)[permissionType] : false;
  }

  // Método para obtener el número de permisos de un menú
  getMenuPermissionsCount(menuId: number): number {
    return this.menuPermissions.filter(p => p.menu_id === menuId && p.is_active).length;
  }

  // Método para obtener los permisos de un menú específico
  getMenuPermissions(menuId: number): MenuPermission[] {
    return this.menuPermissions.filter(p => p.menu_id === menuId);
  }

  ngAfterViewInit(): void {
    this.dtTrigger.next(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.permissionForm = this.fb.group({
      menu_id: ['', Validators.required],
      permission_type: ['role', Validators.required],
      role_id: [''],
      user_id: [''],
      can_view: [false],
      can_create: [false],
      can_edit: [false],
      can_delete: [false],
      can_manage: [false],
      can_export: [false],
      can_import: [false],
      is_active: [true]
    });

    this.bulkPermissionForm = this.fb.group({
      permission_type: ['role', Validators.required],
      role_id: [''],
      user_id: [''],
      can_view: [false],
      can_create: [false],
      can_edit: [false],
      can_delete: [false],
      can_manage: [false],
      can_export: [false],
      can_import: [false],
      is_active: [true]
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
          title: 'Permisos de Menús',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6, 7, 8, 9] // Excluir checkbox
          }
        },
        {
          extend: 'pdf',
          text: '<i class="fas fa-file-pdf"></i> PDF',
          className: 'btn btn-danger btn-sm',
          title: 'Permisos de Menús',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
          }
        },
        {
          extend: 'csv',
          text: '<i class="fas fa-file-csv"></i> CSV',
          className: 'btn btn-info btn-sm',
          title: 'Permisos de Menús',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
          }
        },
        {
          extend: 'print',
          text: '<i class="fas fa-print"></i> Imprimir',
          className: 'btn btn-secondary btn-sm',
          title: 'Permisos de Menús',
          exportOptions: {
            columns: [1, 2, 3, 4, 5, 6, 7, 8, 9]
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
          title: '<input type="checkbox" id="selectAllPermissions">',
          orderable: false,
          searchable: false,
          className: 'text-center',
          render: function(data: any, type: any, row: any) {
            return `<input type="checkbox" class="permission-checkbox" value="${row.id}">`;
          }
        },
        {
          data: 'menu_id',
          title: 'Menú',
          render: function(data: number, type: any, row: any) {
            return `
              <div class="d-flex align-items-center">
                <i class="fas fa-bars me-2 text-primary"></i>
                <div>
                  <strong>${row.menu_name || 'Menú'}</strong>
                  <br>
                  <small class="text-muted">${row.menu_url || ''}</small>
                </div>
              </div>
            `;
          }
        },
        {
          data: 'permission_type',
          title: 'Tipo',
          className: 'text-center',
          render: function(data: string, type: any, row: any) {
            const typeClass = data === 'role' ? 'info' : 'warning';
            const typeText = data === 'role' ? 'Rol' : 'Usuario';
            return `<span class="badge bg-${typeClass}">${typeText}</span>`;
          }
        },
        {
          data: 'role_id',
          title: 'Rol/Usuario',
          render: function(data: number, type: any, row: any) {
            if (row.permission_type === 'role') {
              return `<span class="badge bg-primary">${row.role_name || 'Rol'}</span>`;
            } else {
              return `<span class="badge bg-warning">${row.user_name || 'Usuario'}</span>`;
            }
          }
        },
        {
          data: 'can_view',
          title: 'Ver',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'secondary';
            const statusIcon = data ? 'check' : 'times';
            return `<i class="fas fa-${statusIcon} text-${statusClass}"></i>`;
          }
        },
        {
          data: 'can_create',
          title: 'Crear',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'secondary';
            const statusIcon = data ? 'check' : 'times';
            return `<i class="fas fa-${statusIcon} text-${statusClass}"></i>`;
          }
        },
        {
          data: 'can_edit',
          title: 'Editar',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'secondary';
            const statusIcon = data ? 'check' : 'times';
            return `<i class="fas fa-${statusIcon} text-${statusClass}"></i>`;
          }
        },
        {
          data: 'can_delete',
          title: 'Eliminar',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'secondary';
            const statusIcon = data ? 'check' : 'times';
            return `<i class="fas fa-${statusIcon} text-${statusClass}"></i>`;
          }
        },
        {
          data: 'can_manage',
          title: 'Gestionar',
          className: 'text-center',
          render: function(data: boolean, type: any, row: any) {
            const statusClass = data ? 'success' : 'secondary';
            const statusIcon = data ? 'check' : 'times';
            return `<i class="fas fa-${statusIcon} text-${statusClass}"></i>`;
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
                <button type="button" class="btn btn-sm btn-outline-primary" onclick="window.editPermission(${row.id})" title="Editar">
                  <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn btn-sm btn-outline-danger" onclick="window.deletePermission(${row.id})" title="Eliminar">
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
        console.log('✅ DataTable de permisos de menús inicializado correctamente');
        
        // Configurar funciones globales para los botones
        (window as any).editPermission = (id: number) => this.editPermission(id);
        (window as any).deletePermission = (id: number) => this.deletePermission(id);
        
        // Configurar checkbox de selección múltiple
        this.setupSelectAll();
      }
    };
  }

  private setupSelectAll(): void {
    setTimeout(() => {
      const selectAllCheckbox = document.getElementById('selectAllPermissions') as HTMLInputElement;
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const checkboxes = document.querySelectorAll('.permission-checkbox') as NodeListOf<HTMLInputElement>;
          
          checkboxes.forEach(checkbox => {
            checkbox.checked = target.checked;
          });
          
          this.selectAll = target.checked;
          this.updateSelectedPermissions();
        });
      }
    }, 100);
  }

  private updateSelectedPermissions(): void {
    const checkboxes = document.querySelectorAll('.permission-checkbox:checked') as NodeListOf<HTMLInputElement>;
    this.selectedPermissions = Array.from(checkboxes).map(cb => parseInt(cb.value));
  }

  private subscribeToServices(): void {
    this.rolePermissionService.menus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(menus => {
        this.menus = menus;
        this.applyFilters();
      });

    this.rolePermissionService.roles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(roles => {
        this.roles = roles;
      });

    this.rolePermissionService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users = users;
      });

    this.rolePermissionService.menuPermissions$
      .pipe(takeUntil(this.destroy$))
      .subscribe(permissions => {
        this.menuPermissions = permissions;
        this.applyFilters();
        this.totalItems = this.filteredPermissions.length;
      });
  }

  private loadData(): void {
    this.loading = true;
    
    Promise.all([
      this.rolePermissionService.loadMenus().toPromise(),
      this.rolePermissionService.loadRoles().toPromise(),
      this.rolePermissionService.loadUsers().toPromise(),
      this.rolePermissionService.loadMenuPermissions().toPromise()
    ]).finally(() => {
      this.loading = false;
    });
  }

  // Métodos para gestión de permisos
  openPermissionModal(permission?: MenuPermission): void {
    this.selectedPermission = permission || null;
    
    if (permission) {
      this.permissionForm.patchValue({
        menu_id: permission.menu_id,
        permission_type: permission.permission_type,
        role_id: permission.role_id,
        user_id: permission.user_id,
        can_view: permission.can_view,
        can_create: permission.can_create,
        can_edit: permission.can_edit,
        can_delete: permission.can_delete,
        can_manage: permission.can_manage,
        can_export: permission.can_export,
        can_import: permission.can_import,
        is_active: permission.is_active
      });
    } else {
      this.permissionForm.reset({
        permission_type: 'role',
        can_view: false,
        can_create: false,
        can_edit: false,
        can_delete: false,
        can_manage: false,
        can_export: false,
        can_import: false,
        is_active: true
      });
    }
    
    this.showPermissionModal = true;
  }

  closePermissionModal(): void {
    this.showPermissionModal = false;
    this.selectedPermission = null;
    this.permissionForm.reset();
  }

  savePermission(): void {
    if (this.permissionForm.valid) {
      this.saving = true;
      const permissionData = this.permissionForm.value;
      
      const operation = this.selectedPermission 
        ? this.rolePermissionService.updateMenuPermission(this.selectedPermission.id, permissionData)
        : this.rolePermissionService.createMenuPermission(permissionData);

      operation.subscribe({
        next: () => {
          this.saving = false;
          this.closePermissionModal();
          this.refreshDataTable();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  editPermission(id: number): void {
    const permission = this.menuPermissions.find(p => p.id === id);
    if (permission) {
      this.openPermissionModal(permission);
    }
  }

  deletePermission(id: number): void {
    const permission = this.menuPermissions.find(p => p.id === id);
    if (permission) {
      this.selectedPermission = permission;
      this.showDeleteModal = true;
    }
  }

  confirmDelete(): void {
    if (this.selectedPermission) {
      this.saving = true;
      
      this.rolePermissionService.deleteMenuPermission(this.selectedPermission.id).subscribe({
        next: () => {
          this.saving = false;
          this.showDeleteModal = false;
          this.selectedPermission = null;
          this.refreshDataTable();
        },
        error: () => {
          this.saving = false;
        }
      });
    }
  }

  // Métodos de filtrado y búsqueda
  applyFilters(): void {
    let filtered = [...this.menuPermissions];

    // Filtro de búsqueda
    if (this.searchQuery) {
      filtered = filtered.filter(permission => {
        const menu = this.menus.find(m => m.id === permission.menu_id);
        const role = this.roles.find(r => r.id === permission.role_id);
        const user = this.users.find(u => u.id === permission.user_id);
        
        return (
          menu?.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          menu?.display_name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          role?.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          role?.display_name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          user?.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
          user?.email.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
      });
    }

    // Filtro de menú
    if (this.menuFilter !== 'all') {
      filtered = filtered.filter(permission => permission.menu_id === parseInt(this.menuFilter));
    }

    // Filtro de rol
    if (this.roleFilter !== 'all') {
      filtered = filtered.filter(permission => 
        permission.permission_type === 'role' && permission.role_id === parseInt(this.roleFilter)
      );
    }

    // Filtro de usuario
    if (this.userFilter !== 'all') {
      filtered = filtered.filter(permission => 
        permission.permission_type === 'user' && permission.user_id === parseInt(this.userFilter)
      );
    }

    // Filtro de tipo de permiso
    if (this.permissionTypeFilter !== 'all') {
      filtered = filtered.filter(permission => permission.permission_type === this.permissionTypeFilter);
    }

    // Filtro de estado
    if (this.statusFilter !== 'all') {
      const isActive = this.statusFilter === 'active';
      filtered = filtered.filter(permission => permission.is_active === isActive);
    }

    this.filteredPermissions = filtered;
    this.totalItems = filtered.length;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Métodos de vista
  setView(view: 'matrix' | 'list' | 'hierarchy'): void {
    this.currentView = view;
  }

  // Métodos de acciones masivas
  openBulkModal(): void {
    if (this.selectedPermissions.length === 0) {
      this.notificationService.warning('Selecciona al menos un permiso para realizar acciones masivas');
      return;
    }
    this.showBulkModal = true;
  }

  closeBulkModal(): void {
    this.showBulkModal = false;
  }

  bulkUpdatePermissions(): void {
    if (this.bulkPermissionForm.valid) {
      const bulkData = this.bulkPermissionForm.value;
      
      // Implementar actualización masiva
      console.log('Bulk update permissions:', this.selectedPermissions, bulkData);
      this.closeBulkModal();
    }
  }

  // Métodos de selección múltiple
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    this.selectedPermissions = this.selectAll ? this.filteredPermissions.map(p => p.id) : [];
  }

  togglePermissionSelection(permissionId: number): void {
    const index = this.selectedPermissions.indexOf(permissionId);
    if (index > -1) {
      this.selectedPermissions.splice(index, 1);
    } else {
      this.selectedPermissions.push(permissionId);
    }
    
    this.selectAll = this.selectedPermissions.length === this.filteredPermissions.length;
  }

  // Métodos de utilidad
  refreshDataTable(): void {
    this.dtTrigger.next(null);
  }

  getMenuName(menuId: number): string {
    const menu = this.menus.find(m => m.id === menuId);
    return menu?.display_name || menu?.name || 'Menú desconocido';
  }

  getRoleName(roleId: number): string {
    const role = this.roles.find(r => r.id === roleId);
    return role?.display_name || role?.name || 'Rol desconocido';
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user?.name || 'Usuario desconocido';
  }

  getPermissionIcon(permission: string): string {
    const icons: { [key: string]: string } = {
      'can_view': 'fas fa-eye',
      'can_create': 'fas fa-plus',
      'can_edit': 'fas fa-edit',
      'can_delete': 'fas fa-trash',
      'can_manage': 'fas fa-cogs',
      'can_export': 'fas fa-download',
      'can_import': 'fas fa-upload'
    };
    return icons[permission] || 'fas fa-question';
  }

  getPermissionColor(permission: string): string {
    const colors: { [key: string]: string } = {
      'can_view': 'info',
      'can_create': 'success',
      'can_edit': 'warning',
      'can_delete': 'danger',
      'can_manage': 'primary',
      'can_export': 'secondary',
      'can_import': 'dark'
    };
    return colors[permission] || 'secondary';
  }

  // Métodos de validación
  onPermissionTypeChange(): void {
    const permissionType = this.permissionForm.get('permission_type')?.value;
    
    if (permissionType === 'role') {
      this.permissionForm.get('user_id')?.setValue('');
      this.permissionForm.get('role_id')?.setValidators([Validators.required]);
      this.permissionForm.get('user_id')?.clearValidators();
    } else {
      this.permissionForm.get('role_id')?.setValue('');
      this.permissionForm.get('user_id')?.setValidators([Validators.required]);
      this.permissionForm.get('role_id')?.clearValidators();
    }
    
    this.permissionForm.get('role_id')?.updateValueAndValidity();
    this.permissionForm.get('user_id')?.updateValueAndValidity();
  }

  // Métodos de exportación/importación
  exportPermissions(): void {
    this.rolePermissionService.exportMenuPermissions().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `menu_permissions_${new Date().toISOString().split('T')[0]}.xlsx`;
        link.click();
        window.URL.revokeObjectURL(url);
      },
      error: () => {
        this.notificationService.error('Error al exportar los permisos de menús');
      }
    });
  }
}
