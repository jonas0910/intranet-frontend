import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MenuPermissionsService, MenuPermission } from '../../../services/menu-permissions.service';
import { SystemManagementService } from '../../../services/system-management.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-menu-permissions',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './menu-permissions.component.html',
  styleUrl: './menu-permissions.component.scss'
})
export class MenuPermissionsComponent implements OnInit {
  sistemas: any[] = [];
  permisosUsuario: any[] = [];
  permisosForm: FormGroup;
  selectedSistema: any = null;
  selectedMenu: any = null;
  loading = false;

  constructor(
    private menuPermissionsService: MenuPermissionsService,
    private systemManagementService: SystemManagementService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.permisosForm = this.fb.group({
      lectura: [false],
      escritura: [false],
      eliminacion: [false],
      configuracion: [false],
      exportacion: [false],
      auditoria: [false]
    });
  }

  ngOnInit(): void {
    this.loadSistemas();
    this.loadUserPermissions();
  }

  loadSistemas(): void {
    this.systemManagementService.getIntegratedSystems().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.sistemas = response.data;
          console.log('📊 Sistemas cargados:', this.sistemas.length);
        }
      },
      error: (error) => {
        console.error('❌ Error cargando sistemas:', error);
        this.notificationService.error('Error al cargar sistemas');
      }
    });
  }

  loadUserPermissions(): void {
    this.menuPermissionsService.getUserPermissions().subscribe({
      next: (permissions) => {
        this.permisosUsuario = permissions.permisos;
        console.log('🔐 Permisos del usuario cargados:', this.permisosUsuario);
      },
      error: (error) => {
        console.error('❌ Error cargando permisos:', error);
        this.notificationService.error('Error al cargar permisos del usuario');
      }
    });
  }

  onSistemaChange(sistemaId: number): void {
    this.selectedSistema = this.sistemas.find(s => s.id === sistemaId);
    this.selectedMenu = null;
    this.permisosForm.reset();
    
    if (this.selectedSistema) {
      console.log('🔍 Sistema seleccionado:', this.selectedSistema.nombre);
    }
  }

  onMenuChange(menuId: number): void {
    if (!this.selectedSistema) return;
    
    this.selectedMenu = this.selectedSistema.menus.find((m: any) => m.id === menuId);
    
    if (this.selectedMenu) {
      console.log('🔍 Menú seleccionado:', this.selectedMenu.nombre);
      
      // Cargar permisos actuales del menú
      this.loadMenuPermissions();
    }
  }

  loadMenuPermissions(): void {
    if (!this.selectedSistema || !this.selectedMenu) return;

    const permisosActuales = this.menuPermissionsService.getMenuPermissions(
      this.selectedSistema.id,
      this.selectedMenu.id
    );

    if (permisosActuales) {
      this.permisosForm.patchValue(permisosActuales);
      console.log('🔐 Permisos actuales cargados:', permisosActuales);
    } else {
      this.permisosForm.reset();
      console.log('🔐 No hay permisos asignados para este menú');
    }
  }

  savePermissions(): void {
    if (!this.selectedSistema || !this.selectedMenu) {
      this.notificationService.error('Seleccione un sistema y menú');
      return;
    }

    if (this.permisosForm.invalid) {
      this.notificationService.error('Formulario inválido');
      return;
    }

    this.loading = true;
    const permisos = this.permisosForm.value;

    this.menuPermissionsService.assignMenuPermissions(
      this.selectedSistema.id,
      this.selectedMenu.id,
      permisos
    ).subscribe({
      next: () => {
        this.notificationService.success('Permisos asignados correctamente');
        this.loadUserPermissions(); // Recargar permisos
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error asignando permisos:', error);
        this.notificationService.error('Error al asignar permisos');
        this.loading = false;
      }
    });
  }

  revokePermissions(): void {
    if (!this.selectedSistema || !this.selectedMenu) {
      this.notificationService.error('Seleccione un sistema y menú');
      return;
    }

    if (!confirm('¿Está seguro de que desea revocar todos los permisos de este menú?')) {
      return;
    }

    this.loading = true;

    this.menuPermissionsService.revokeMenuPermissions(
      this.selectedSistema.id,
      this.selectedMenu.id
    ).subscribe({
      next: () => {
        this.notificationService.success('Permisos revocados correctamente');
        this.loadUserPermissions(); // Recargar permisos
        this.permisosForm.reset();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Error revocando permisos:', error);
        this.notificationService.error('Error al revocar permisos');
        this.loading = false;
      }
    });
  }

  hasPermission(sistemaId: number, menuId: number, permission: string): boolean {
    return this.menuPermissionsService.hasMenuPermission(sistemaId, menuId, permission);
  }

  getPermissionBadgeClass(hasPermission: boolean): string {
    return hasPermission ? 'badge-success' : 'badge-secondary';
  }

  getPermissionText(hasPermission: boolean): string {
    return hasPermission ? 'Sí' : 'No';
  }
}