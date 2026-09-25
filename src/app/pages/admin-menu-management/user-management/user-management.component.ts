import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UserManagementService, User, UserStats, UserReferenceData, UserUpdateData, System, Menu, UserMenuPermissions } from '../../../services/user-management.service';
import { DataTablesService, DataTableColumn } from '../../../services/datatables.service';
// Sistema de mensajes simple sin PrimeNG

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  template: `
    <!-- Header compacto -->
    <div class="content-header py-2">
      <div class="container-fluid">
        <div class="d-flex justify-content-between align-items-center">
          <h1 class="m-0" style="font-size:1.1rem">
            <i class="fas fa-users mr-2 text-primary"></i>Gestión de Usuarios
          </h1>
          <ol class="breadcrumb m-0 small">
            <li class="breadcrumb-item"><a routerLink="/dashboard"><i class="fas fa-home"></i></a></li>
            <li class="breadcrumb-item active">Usuarios</li>
          </ol>
        </div>
      </div>
    </div>

    <section class="content pt-0">
      <div class="container-fluid">

        <!-- Loading -->
        <div *ngIf="loading" class="text-center py-3">
          <div class="spinner-border spinner-border-sm text-primary"></div>
          <span class="text-muted ml-2 small">Cargando usuarios...</span>
        </div>

        <!-- Error -->
        <div *ngIf="error && !loading" class="alert alert-danger alert-sm py-2">
          <i class="fas fa-exclamation-triangle mr-1"></i>{{ error }}
          <button class="btn btn-sm btn-outline-danger ml-2" (click)="loadData()">
            <i class="fas fa-redo"></i> Reintentar
          </button>
        </div>

        <!-- Tabla principal -->
        <div *ngIf="!loading && !error">
          <div class="d-flex justify-content-between align-items-center mb-2">
            <span class="text-muted small">
              <i class="fas fa-info-circle mr-1"></i>Lista de usuarios del sistema
            </span>
            <div class="btn-group">
              <button class="btn btn-sm btn-outline-secondary" (click)="loadData()" title="Recargar">
                <i class="fas fa-sync-alt"></i>
              </button>
              <button class="btn btn-sm btn-primary" (click)="openCreateModal()" title="Crear nuevo usuario">
                <i class="fas fa-plus mr-1"></i>Nuevo
              </button>
            </div>
          </div>

          <div class="table-responsive">
            <table id="usersTable" class="table table-hover table-sm table-striped mb-0" style="width:100%">
              <thead class="thead-light">
                <tr>
                  <th style="width:50px">ID</th>
                  <th>Usuario</th>
                  <th>Email</th>
                  <th style="width:120px">Roles</th>
                  <th style="width:80px" class="text-center">Estado</th>
                  <th style="width:130px">Actualizado</th>
                  <th style="width:100px" class="text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                <!-- Los datos se cargarán dinámicamente por DataTables -->
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>

    <!-- Create/Edit User Modal -->
    <div class="modal fade" id="userModal" tabindex="-1" role="dialog" aria-labelledby="userModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userModalLabel">
              {{ editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}
            </h5>
            <button type="button" class="close" (click)="hideModal('userModal')" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <form [formGroup]="userForm" (ngSubmit)="saveUser()">
            <div class="modal-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="name">Nombre Completo *</label>
                    <input type="text" class="form-control" id="name" formControlName="name" 
                           [class.is-invalid]="userForm.get('name')?.invalid && userForm.get('name')?.touched">
                    <div class="invalid-feedback" *ngIf="userForm.get('name')?.invalid && userForm.get('name')?.touched">
                      El nombre es requerido
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="email">Email *</label>
                    <input type="email" class="form-control" id="email" formControlName="email"
                           [class.is-invalid]="userForm.get('email')?.invalid && userForm.get('email')?.touched">
                    <div class="invalid-feedback" *ngIf="userForm.get('email')?.invalid && userForm.get('email')?.touched">
                      Email inválido
                    </div>
                  </div>
                </div>
              </div>
                  <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="password">Contraseña {{ editingUser ? '(dejar vacío para mantener actual)' : '*' }}</label>
                    <input type="password" class="form-control" id="password" formControlName="password"
                           [class.is-invalid]="userForm.get('password')?.invalid && userForm.get('password')?.touched">
                    <div class="invalid-feedback" *ngIf="userForm.get('password')?.invalid && userForm.get('password')?.touched">
                      La contraseña debe tener al menos 8 caracteres
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="phone">Teléfono</label>
                    <input type="text" class="form-control" id="phone" formControlName="phone">
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="position">Cargo</label>
                    <input type="text" class="form-control" id="position" formControlName="position">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <label for="employee_id_select">Empleado (Planillas)</label>
                    <select class="form-control" id="employee_id_select" formControlName="employee_id">
                      <option value="">Sin empleado asociado</option>
                    </select>
                    <small class="form-text text-muted">Busque y seleccione el empleado; el departamento se toma del registro del empleado.</small>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group">
                    <label>Roles</label>
                    <div class="form-check" *ngFor="let role of referenceData?.roles">
                      <input class="form-check-input" type="checkbox" 
                             [value]="role.id" 
                             [checked]="isRoleSelected(role.id)"
                             (change)="toggleRole(role.id)">
                      <label class="form-check-label">
                        {{ role.name }}
                      </label>
                    </div>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="is_admin" formControlName="is_admin">
                      <label class="form-check-label" for="is_admin">
                        Administrador del Sistema
                      </label>
                    </div>
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="activo" formControlName="activo">
                      <label class="form-check-label" for="activo">
                        Usuario Activo
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="hideModal('userModal')">Cancelar</button>
              <button type="submit" class="btn btn-primary" [disabled]="userForm.invalid || saving">
                <span *ngIf="saving" class="spinner-border spinner-border-sm mr-2"></span>
                {{ saving ? 'Guardando...' : (editingUser ? 'Actualizar' : 'Crear') }}
              </button>
            </div>
          </form>
        </div>
              </div>
            </div>
            
    <!-- View User Modal -->
    <div class="modal fade" id="viewUserModal" tabindex="-1" role="dialog" aria-labelledby="viewUserModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg" role="document">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="viewUserModalLabel">Detalles del Usuario</h5>
            <button type="button" class="close" (click)="hideModal('viewUserModal')" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
                </div>
          <div class="modal-body" *ngIf="viewingUser">
          <div class="row">
              <div class="col-md-4 text-center">
                <i class="fas fa-user-circle fa-5x text-muted mb-3"></i>
                <h4>{{ viewingUser.name }}</h4>
                <span [class]="viewingUser.activo ? 'badge badge-success' : 'badge badge-danger'">
                  {{ viewingUser.activo ? 'Activo' : 'Inactivo' }}
                </span>
                </div>
              <div class="col-md-8">
                <table class="table table-borderless">
                  <tr>
                    <td><strong>Email:</strong></td>
                    <td>{{ viewingUser.email }}</td>
                  </tr>
                  <tr>
                    <td><strong>Teléfono:</strong></td>
                    <td>{{ viewingUser.phone || 'No especificado' }}</td>
                  </tr>
                  <tr>
                    <td><strong>Cargo:</strong></td>
                    <td>{{ viewingUser.position || 'No especificado' }}</td>
                        </tr>
                  <tr>
                    <td><strong>Empleado (Planillas):</strong></td>
                    <td>{{ viewingUser.employee?.full_name || 'No asignado' }}</td>
                        </tr>
                  <tr>
                    <td><strong>Departamento:</strong></td>
                    <td>{{ viewingUser.department?.nombre || 'No asignado' }}</td>
                        </tr>
                        <tr>
                    <td><strong>Roles:</strong></td>
                    <td>
                      <span *ngFor="let role of viewingUser.roles" class="badge badge-primary mr-1">
                        {{ role.name }}
                      </span>
                      <span *ngIf="viewingUser.is_admin" class="badge badge-danger">Admin</span>
                          </td>
                        </tr>
                        <tr>
                    <td><strong>Fecha de Creación:</strong></td>
                    <td>{{ formatDate(viewingUser.created_at) }}</td>
                  </tr>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" (click)="hideModal('viewUserModal')">Cerrar</button>
            <button type="button" class="btn btn-warning" (click)="editUser(viewingUser!)" *ngIf="viewingUser">
              <i class="fas fa-edit"></i> Editar
            </button>
          </div>
              </div>
            </div>
          </div>

    <!-- Access Management Modal -->
    <div class="modal fade" id="accessModal" tabindex="-1" role="dialog" aria-labelledby="accessModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-xl" role="document">
        <div class="modal-content professional-modal">
          <div class="modal-header">
            <h5 class="modal-title" id="accessModalLabel">
              <i class="fas fa-user-shield mr-2"></i>
              Gestión de Acceso a Menús - {{ managingAccessUser?.name }}
            </h5>
            <button type="button" class="close" (click)="hideModal('accessModal')" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div class="modal-body">
            <!-- Indicador de carga -->
            <div *ngIf="(loadingSystems || loadingMenus) && !systemsError && !menusError" class="text-center py-4">
              <div class="spinner-border text-primary" role="status">
                <span class="sr-only">Cargando...</span>
              </div>
              <p class="mt-2">Cargando sistemas y menús...</p>
            </div>

            <!-- Indicador de error -->
            <div *ngIf="systemsError || menusError" class="alert alert-danger">
              <h6><i class="fas fa-exclamation-triangle mr-2"></i>Error al cargar datos</h6>
              <p class="mb-0">No se pudieron cargar los sistemas integrados o menús de sistema. Verifique la conexión al servidor.</p>
              <button class="btn btn-sm btn-outline-danger mt-2" (click)="loadAccessData(managingAccessUser!.id)">
                <i class="fas fa-redo mr-1"></i> Reintentar
              </button>
            </div>

            <!-- Contenido principal -->
            <div *ngIf="!loadingSystems && !loadingMenus && !systemsError && !menusError">
              
              <!-- User Info Compact -->
              <div class="user-info-compact" *ngIf="managingAccessUser">
                <div class="d-flex align-items-center">
                  <div class="user-avatar">
                    <i class="fas fa-user"></i>
                  </div>
                  <div class="user-details">
                    <h6 class="mb-0">{{ managingAccessUser.name }}</h6>
                    <small class="text-muted">{{ managingAccessUser.email }}</small>
                  </div>
                </div>
              </div>

              <!-- System Selection -->
              <div class="systems-selection mb-4">
                <h6 class="mb-3">
                  <i class="fas fa-server mr-2"></i>Sistemas Disponibles
                </h6>
                <div class="row">
                  <div class="col-md-4" *ngFor="let system of availableSystems">
                    <div class="system-card" 
                         [class.selected]="isSystemSelected(system.id)"
                         (click)="toggleSystem(system.id)">
                      <div class="system-header">
                        <i [class]="system.icono || 'fas fa-server'" class="system-icon"></i>
                        <h6 class="system-name">{{ system.nombre }}</h6>
                      </div>
                      <p class="system-description">{{ system.descripcion || 'Sin descripción' }}</p>
                      <div class="system-footer">
                        <span class="menu-count">{{ getMenuCountBySystem(system.id) }} menús</span>
                        <div class="selection-check" *ngIf="isSystemSelected(system.id)">
                          <i class="fas fa-check"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Menu Table -->
              <div class="menus-table" *ngIf="selectedSystems.length > 0">
                <h6 class="mb-3">
                  <i class="fas fa-list mr-2"></i>Menús de Sistemas Seleccionados
                </h6>
                
                <div class="table-responsive">
                  <table class="table table-hover table-striped">
                    <thead class="thead-light">
                      <tr>
                        <th width="5%">
                          <input type="checkbox" 
                                 [checked]="isAllMenusSelected()" 
                                 (change)="toggleAllMenus($event)"
                                 class="form-check-input">
                        </th>
                        <th width="5%">Icono</th>
                        <th width="25%">Nombre</th>
                        <th width="15%">Ruta</th>
                        <th width="8%">Submenús</th>
                        <th width="8%">Estado</th>
                        <th width="8%">Ver</th>
                        <th width="8%">Crear</th>
                        <th width="8%">Editar</th>
                        <th width="8%">Eliminar</th>
                        <th width="7%">Exportar</th>
                        <th width="3%"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <ng-container *ngFor="let menu of getAllMenusFromSelectedSystems(); trackBy: trackByMenuId">
                        <!-- Solo menús principales - sin submenús -->
                        <tr [class.table-primary]="isMenuSelected(menu.id)">
                          <td>
                            <input type="checkbox" 
                                   [checked]="isMenuSelected(menu.id)" 
                                   (change)="toggleMenu(menu.id)"
                                   class="form-check-input">
                          </td>
                          <td>
                            <i [class]="menu.icono || 'fas fa-circle'" class="text-primary"></i>
                          </td>
                          <td>
                            <div class="d-flex align-items-center">
                              <!-- Chevron para expandir/contraer submenús -->
                              <button class="btn btn-sm btn-outline-secondary mr-2" 
                                      *ngIf="hasSubmenus(menu.id)"
                                      (click)="toggleMenuExpanded(menu.id)" 
                                      [title]="menu.expanded ? 'Contraer submenús' : 'Expandir submenús'">
                                <i class="fas" [class.fa-chevron-down]="!menu.expanded" [class.fa-chevron-up]="menu.expanded"></i>
                              </button>
                              <div>
                                <strong class="small">{{ menu.nombre }}</strong>
                                <small class="text-muted d-block" style="font-size: 0.7rem;">ID: {{ menu.id }}</small>
                              </div>
                            </div>
                          </td>
                          <td>
                            <code class="small" style="font-size: 0.7rem;">{{ menu.route }}</code>
                          </td>
                          <td class="text-center">
                            <span class="badge badge-primary badge-sm" *ngIf="hasSubmenus(menu.id)" style="font-size: 0.7rem;">
                              {{ getSubmenus(menu.id).length }}
                            </span>
                            <span class="text-muted" *ngIf="!hasSubmenus(menu.id)" style="font-size: 0.7rem;">
                              -
                            </span>
                          </td>
                          <td>
                            <span class="badge badge-sm" 
                                  [class.badge-success]="menu.activo" 
                                  [class.badge-secondary]="!menu.activo"
                                  style="font-size: 0.7rem;">
                              {{ menu.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(menu.id, 'ver')"
                                     (change)="toggleMenuPermission(menu.id, 'ver', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(menu.id, 'crear')"
                                     (change)="toggleMenuPermission(menu.id, 'crear', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(menu.id, 'editar')"
                                     (change)="toggleMenuPermission(menu.id, 'editar', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(menu.id, 'eliminar')"
                                     (change)="toggleMenuPermission(menu.id, 'eliminar', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(menu.id, 'exportar')"
                                     (change)="toggleMenuPermission(menu.id, 'exportar', $event)">
                            </div>
                          </td>
                          <td>
                            <!-- Espacio vacío para acciones -->
                          </td>
                        </tr>
                        
                        <!-- Submenús expandidos -->
                        <tr *ngFor="let submenu of getSubmenus(menu.id)" 
                            [class.table-secondary]="isMenuSelected(submenu.id)"
                            [style.display]="menu.expanded ? 'table-row' : 'none'"
                            [attr.data-menu-id]="menu.id"
                            [attr.data-submenu-id]="submenu.id"
                            [attr.data-expanded]="menu.expanded">
                          <td>
                            <input type="checkbox" 
                                   [checked]="isMenuSelected(submenu.id)" 
                                   (change)="toggleMenu(submenu.id)"
                                   class="form-check-input">
                          </td>
                          <td>
                            <i [class]="submenu.icono || 'fas fa-circle'" class="text-secondary ml-3"></i>
                          </td>
                          <td>
                            <div class="ml-3">
                              <strong class="small">{{ submenu.nombre }}</strong>
                              <small class="text-muted d-block" style="font-size: 0.65rem;">ID: {{ submenu.id }}</small>
                            </div>
                          </td>
                          <td>
                            <code class="small" style="font-size: 0.65rem;">{{ submenu.route }}</code>
                          </td>
                          <td class="text-center">
                            <span class="text-muted" style="font-size: 0.65rem;">
                              -
                            </span>
                          </td>
                          <td>
                            <span class="badge badge-sm" 
                                  [class.badge-success]="submenu.activo" 
                                  [class.badge-secondary]="!submenu.activo"
                                  style="font-size: 0.65rem;">
                              {{ submenu.activo ? 'Activo' : 'Inactivo' }}
                            </span>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(submenu.id, 'ver')"
                                     (change)="toggleMenuPermission(submenu.id, 'ver', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(submenu.id, 'crear')"
                                     (change)="toggleMenuPermission(submenu.id, 'crear', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(submenu.id, 'editar')"
                                     (change)="toggleMenuPermission(submenu.id, 'editar', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(submenu.id, 'eliminar')"
                                     (change)="toggleMenuPermission(submenu.id, 'eliminar', $event)">
                            </div>
                          </td>
                          <td>
                            <div class="form-check">
                              <input type="checkbox" 
                                     class="form-check-input" 
                                     [checked]="getMenuPermission(submenu.id, 'exportar')"
                                     (change)="toggleMenuPermission(submenu.id, 'exportar', $event)">
                            </div>
                          </td>
                          <td>
                            <!-- Espacio vacío -->
                          </td>
                        </tr>
                      </ng-container>
                    </tbody>
                  </table>
                </div>
                
                <!-- Empty State -->
                <div class="text-center py-4" *ngIf="getAllMenusFromSelectedSystems().length === 0">
                  <i class="fas fa-list fa-3x text-muted mb-3"></i>
                  <h6 class="text-muted">No hay menús disponibles</h6>
                  <p class="text-muted">Selecciona sistemas para ver sus menús</p>
                </div>
              </div>

              <!-- Empty State for Systems -->
              <div class="text-center py-5" *ngIf="selectedSystems.length === 0">
                <i class="fas fa-mouse-pointer fa-3x text-muted mb-3"></i>
                <h6 class="text-muted">Selecciona sistemas</h6>
                <p class="text-muted">Elige los sistemas para gestionar accesos a menús</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-outline-secondary" (click)="hideModal('accessModal')">
              <i class="fas fa-times mr-1"></i>Cancelar
            </button>
            
            <button type="button" class="btn btn-primary" 
                    (click)="saveAccess()" 
                    [disabled]="saving || selectedSystems.length === 0">
              <span *ngIf="saving" class="spinner-border spinner-border-sm mr-2"></span>
              <i class="fas fa-save mr-1"></i>
              {{ saving ? 'Guardando...' : 'Guardar Acceso' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Professional Modal Styles */
    .professional-modal {
      .modal-dialog {
        max-width: 1200px;
      }
      
      .modal-content {
        border: none;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        overflow: hidden;
      }
      
      .modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        border: none;
        padding: 1rem 1.5rem;
        
        .modal-title {
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        .close {
          color: white;
          opacity: 0.8;
          font-size: 1.5rem;
          
          &:hover {
            opacity: 1;
          }
        }
      }
      
      .modal-body {
        padding: 1.5rem;
        background-color: #f8f9fa;
      }
      
      .modal-footer {
        background-color: white;
        border-top: 1px solid #e9ecef;
        padding: 1rem 1.5rem;
      }
    }

    /* User Info Compact */
    .user-info-compact {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      
      .user-avatar {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        margin-right: 1rem;
      }
      
      .user-details {
        h6 {
          color: #2c3e50;
          font-weight: 600;
        }
        
        small {
          color: #6c757d;
        }
      }
    }

    /* Systems Selection */
    .systems-selection {
      .system-card {
        background: white;
        border: 1px solid #e9ecef;
        border-radius: 8px;
        padding: 1rem;
        cursor: pointer;
        transition: all 0.2s ease;
        height: 100%;
        
        &:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
        
        &.selected {
          border-color: #667eea;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          
          .system-description {
            color: rgba(255,255,255,0.8);
          }
          
          .menu-count {
            background: rgba(255,255,255,0.2);
            color: white;
          }
        }
        
        .system-header {
          display: flex;
          align-items: center;
          margin-bottom: 0.5rem;
          
          .system-icon {
            font-size: 1.5rem;
            margin-right: 0.75rem;
            color: #667eea;
          }
          
          .system-name {
            margin: 0;
            font-size: 1rem;
            font-weight: 600;
          }
        }
        
        .system-description {
          font-size: 0.85rem;
          color: #6c757d;
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }
        
        .system-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          
          .menu-count {
            font-size: 0.8rem;
            padding: 0.25rem 0.5rem;
            background: #e9ecef;
            border-radius: 12px;
            font-weight: 500;
          }
          
          .selection-check {
            width: 24px;
            height: 24px;
            background: rgba(255,255,255,0.2);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 0.8rem;
          }
        }
      }
    }

    /* Menu Table */
    .menus-table {
      .table {
        background: white;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        
        thead th {
          background-color: #f8f9fa;
          border: none;
          font-weight: 600;
          color: #495057;
          padding: 0.5rem 0.5rem;
          vertical-align: middle;
          font-size: 0.8rem;
          line-height: 1.2;
        }
        
        tbody td {
          padding: 0.4rem 0.5rem;
          vertical-align: middle;
          border-color: #e9ecef;
          font-size: 0.8rem;
          line-height: 1.2;
        }
        
        tbody tr {
          height: 35px;
        }
        
        tbody tr.table-secondary {
          height: 30px;
        }
        
        tbody tr.table-secondary td {
          padding: 0.3rem 0.5rem;
          font-size: 0.75rem;
        }
        
        .table-primary {
          background-color: rgba(102, 126, 234, 0.1);
        }
        
        .table-info {
          background-color: rgba(23, 162, 184, 0.1);
        }
        
        .submenu-row {
          td:first-child {
            padding-left: 2rem;
          }
          
          td:nth-child(2) {
            padding-left: 2rem;
          }
        }
        
        .form-check-input {
          margin: 0;
        }
        
        code {
          background: #f8f9fa;
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          font-size: 0.8rem;
        }
        
        .badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
        }
        
        .btn-sm {
          padding: 0.25rem 0.5rem;
          font-size: 0.8rem;
          border-radius: 4px;
        }
        
        .btn-outline-secondary {
          border-color: #6c757d;
          color: #6c757d;
          
          &:hover {
            background-color: #6c757d;
            border-color: #6c757d;
            color: white;
          }
        }
      }
    }

    /* Estilos para mejorar contraste de DataTable */
    #menusPermissionsTable thead th {
      background-color: #f8f9fa !important;
      color: #212529 !important;
      font-weight: 600 !important;
      border-color: #dee2e6 !important;
    }
    
    #menusPermissionsTable thead th:hover {
      background-color: #e9ecef !important;
    }
    
    /* Estilos para el DataTable cuando se inicializa */
    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_filter,
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_processing,
    .dataTables_wrapper .dataTables_paginate {
      color: #212529 !important;
    }
    
    .dataTables_wrapper .dataTables_paginate .paginate_button {
      color: #212529 !important;
    }
    
    .dataTables_wrapper .dataTables_paginate .paginate_button:hover {
      background-color: #e9ecef !important;
      color: #212529 !important;
    }
    
    .dataTables_wrapper .dataTables_paginate .paginate_button.current {
      background-color: #007bff !important;
      color: white !important;
    }
    
    /* Estilos para la tabla de usuarios */
    #usersTable {
      font-size: 0.9rem;
    }
    
    #usersTable thead th {
      background-color: #f8f9fa !important;
      color: #495057 !important;
      font-weight: 600 !important;
      border-color: #dee2e6 !important;
      padding: 12px 8px !important;
      vertical-align: middle !important;
    }
    
    #usersTable tbody td {
      padding: 10px 8px !important;
      vertical-align: middle !important;
      border-color: #dee2e6 !important;
    }
    
    #usersTable tbody tr:hover {
      background-color: #f8f9fa !important;
    }
    
    /* Mejorar el contenedor del DataTable */
    .dataTables_wrapper {
      padding: 0 !important;
    }
    
    .dataTables_wrapper .dataTables_length,
    .dataTables_wrapper .dataTables_filter {
      padding: 15px 20px !important;
      background-color: #f8f9fa !important;
      border-bottom: 1px solid #dee2e6 !important;
    }
    
    .dataTables_wrapper .dataTables_info,
    .dataTables_wrapper .dataTables_paginate {
      padding: 15px 20px !important;
      background-color: #f8f9fa !important;
      border-top: 1px solid #dee2e6 !important;
    }
    
    /* Estilos para botones de acción */
    .btn-group .btn {
      margin-left: 2px;
    }
    
    .btn-group .btn:first-child {
      margin-left: 0;
    }
    .small-box {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    
    .badge-outline-secondary {
      background-color: transparent;
      border: 1px solid #6c757d;
      color: #6c757d;
    }
    
    .card.border-primary {
      border-width: 2px !important;
    }
    
    .card.bg-light {
      background-color: #f8f9fa !important;
    }
    .card {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .btn {
      border-radius: 6px;
    }
    .table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .info-box {
      display: block;
      min-height: 90px;
      background: #fff;
      width: 100%;
      box-shadow: 0 1px 1px rgba(0,0,0,0.1);
      border-radius: 4px;
      margin-bottom: 15px;
    }
    .info-box-icon {
      border-top-left-radius: 4px;
      border-top-right-radius: 0;
      border-bottom-right-radius: 0;
      border-bottom-left-radius: 4px;
      display: block;
      float: left;
      height: 90px;
      width: 90px;
      text-align: center;
      font-size: 45px;
      line-height: 90px;
      background: rgba(0,0,0,0.2);
    }
    .info-box-icon > i {
      color: #fff;
    }
    .info-box-content {
      padding: 5px 10px;
      margin-left: 90px;
    }
    .info-box-text {
      text-transform: uppercase;
      font-weight: bold;
      font-size: 14px;
    }
    .info-box-number {
      display: block;
      font-weight: bold;
      font-size: 18px;
    }
    .bg-info {
      background-color: #17a2b8 !important;
    }
    .bg-success {
      background-color: #28a745 !important;
    }
    .bg-warning {
      background-color: #ffc107 !important;
    }
    .bg-danger {
      background-color: #dc3545 !important;
    }

    /* Responsive adjustments */
    @media (max-width: 768px) {
      .permissions-stats {
        grid-template-columns: 1fr;
      }
      
      .menu-main-compact, .submenu-compact-item {
        padding: 0.75rem !important;
      }
      
      .menu-actions {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
  `]
})
export class UserManagementComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Data properties
  users: User[] = [];
  filteredUsers: User[] = [];
  paginatedUsers: User[] = [];
  userStats: UserStats | null = null;
  referenceData: UserReferenceData | null = null;
  
  // State properties
  loading = false;
  error: string | null = null;
  saving = false;
  
  // Search and filter properties
  searchTerm = '';
  
  // Modal properties
  editingUser: User | null = null;
  viewingUser: User | null = null;
  userForm: FormGroup;
  selectedRoles: number[] = [];
  
  // Access management properties
  managingAccessUser: User | null = null;
  availableSystems: System[] = [];
  availableMenus: Menu[] = [];
  userSystems: System[] = [];
  userMenus: Menu[] = [];
  selectedSystems: number[] = [];
  selectedMenus: number[] = [];
  loadingSystems = false;
  loadingMenus = false;
  loadingAccess = false;
  systemsError = false;
  menusError = false;
  accessError = false;
  accessStep = 1; // 1: Seleccionar sistemas, 2: Seleccionar menús
  
  // Permisos de menús por usuario
  menuPermissions: { [menuId: number]: UserMenuPermissions } = {};
  
  // DataTable properties
  dataTableInstance: any = null;
  tableColumns: DataTableColumn[] = [];
  
  // Utility properties
  Math = Math;

  constructor(
    private userService: UserManagementService,
    private fb: FormBuilder,
    private dataTablesService: DataTablesService,
    private cdr: ChangeDetectorRef
  ) {
    this.userForm = this.createUserForm();
    this.tableColumns = this.dataTablesService.createUserColumns();
  }

  ngOnInit(): void {
    console.log('👥 UserManagementComponent inicializado');
    this.setupSubscriptions();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.destroyEmployeeSelect2();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createUserForm(): FormGroup {
    return this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.minLength(8)]],
      phone: [''],
      position: [''],
      employee_id: [''],
      is_admin: [false],
      activo: [true]
    });
  }

  private setupSubscriptions(): void {
    // Subscribe to users data
    this.userService.users$
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.users = users;
        this.applyFilters();
      });

    // Subscribe to stats
    this.userService.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.userStats = stats;
      });

    // Subscribe to reference data
    this.userService.referenceData$
      .pipe(takeUntil(this.destroy$))
      .subscribe(data => {
        this.referenceData = data;
        this.cdr.markForCheck();
      });
  }

  loadData(): void {
    console.log('🔄 UserManagementComponent: Iniciando carga de datos...');
    this.loading = true;
    this.error = null;

    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.loading = false;
          console.log('✅ UserManagementComponent: Usuarios cargados correctamente:', users.length, 'usuarios');
          // Inicializar DataTable después de cargar los datos
          setTimeout(() => {
            this.initializeDataTable();
          }, 200);
        },
        error: (error) => {
          this.loading = false;
          this.error = error.message || 'Error al cargar usuarios';
          console.error('❌ UserManagementComponent: Error al cargar usuarios:', error);
          console.error('❌ Detalles del error:', {
            message: error.message,
            status: error.status,
            statusText: error.statusText,
            url: error.url
          });
        }
      });

    this.userService.getReferenceData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('✅ UserManagementComponent: Datos de referencia cargados:', data);
          this.cdr.markForCheck();
        },
        error: (error) => {
          console.error('❌ UserManagementComponent: Error al cargar datos de referencia:', error);
          this.cdr.markForCheck();
        }
      });
  }

  /** Asegura roles y datos de referencia antes de abrir el modal (evita combos vacíos si falló la carga inicial). */
  private ensureReferenceDataForModal(): void {
    const hasRoles = (this.referenceData?.roles?.length ?? 0) > 0;
    const hasEmployees = this.referenceData?.employees !== undefined;
    if (hasRoles && hasEmployees) {
      return;
    }
    this.userService.getReferenceData()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.cdr.markForCheck(),
        error: () => this.cdr.markForCheck()
      });
  }

  refreshData(): void {
    this.loadData();
  }

  // Search and filter methods
  onSearchChange(event: any): void {
    this.searchTerm = event.target.value;
    this.applyFilters();
  }

  applyFilters(): void {
    let filtered = [...this.users];

    // Apply search term filter
    if (this.searchTerm) {
      const searchTerm = this.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchTerm) ||
        user.email.toLowerCase().includes(searchTerm) ||
        (user.position && user.position.toLowerCase().includes(searchTerm))
      );
    }

    this.filteredUsers = filtered;
    this.updateDataTable();
  }


  // User management methods
  openCreateModal(): void {
    this.ensureReferenceDataForModal();
    this.editingUser = null;
    this.selectedRoles = [];
    this.userForm.reset();
    this.userForm.patchValue({ activo: true, employee_id: '' });
    this.showModal('userModal');
  }

  editUser(user: User): void {
    this.ensureReferenceDataForModal();
    this.userService.getUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (full) => {
        this.editingUser = full;
        this.selectedRoles = full.roles?.map(role => role.id) || [];
        const empId =
          full.employee_id != null && full.employee_id !== ''
            ? String(full.employee_id)
            : '';
        this.userForm.patchValue({
          name: full.name,
          email: full.email,
          phone: full.phone || '',
          position: full.position || '',
          employee_id: empId,
          is_admin: full.is_admin,
          activo: full.activo
        });
        this.showModal('userModal');
      },
      error: (err) => {
        this.showErrorMessage(err.message || 'Error al cargar el usuario');
      }
    });
  }

  viewUser(user: User): void {
    this.userService.getUser(user.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: (full) => {
        this.viewingUser = full;
        this.showModal('viewUserModal');
      },
      error: () => {
        this.viewingUser = user;
        this.showModal('viewUserModal');
      }
    });
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.userForm.value;
    const employee_id =
      raw.employee_id === '' || raw.employee_id === null || raw.employee_id === undefined
        ? undefined
        : String(raw.employee_id);

    const formData: UserUpdateData = {
      name: raw.name,
      email: raw.email,
      phone: raw.phone,
      position: raw.position,
      activo: raw.activo,
      is_admin: raw.is_admin,
      employee_id,
      role_ids: this.selectedRoles
    };
    if (this.editingUser) {
      if (raw.password && String(raw.password).length > 0) {
        formData.password = raw.password;
      }
    } else {
      formData.password = raw.password;
    }

    const operation = this.editingUser 
      ? this.userService.updateUser(this.editingUser.id, formData)
      : this.userService.createUser(formData);

    operation.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.saving = false;
        this.hideModal('userModal');
        this.showSuccessMessage(
          this.editingUser ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente'
        );
      },
      error: (error) => {
        this.saving = false;
        this.showErrorMessage(error.message || 'Error al guardar usuario');
      }
    });
  }

  deleteUser(user: User): void {
    if (confirm(`¿Está seguro de que desea eliminar al usuario "${user.name}"?`)) {
      this.userService.deleteUser(user.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccessMessage('Usuario eliminado correctamente');
          },
          error: (error) => {
            this.showErrorMessage(error.message || 'Error al eliminar usuario');
          }
        });
    }
  }

  // Role management methods
  isRoleSelected(roleId: number): boolean {
    return this.selectedRoles.includes(roleId);
  }

  toggleRole(roleId: number): void {
    const index = this.selectedRoles.indexOf(roleId);
    if (index > -1) {
      this.selectedRoles.splice(index, 1);
    } else {
      this.selectedRoles.push(roleId);
    }
  }


  // Utility methods
  exportUsers(): void {
    const csvContent = this.generateCSV();
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private generateCSV(): string {
    const headers = ['ID', 'Nombre', 'Email', 'Teléfono', 'Cargo', 'Empleado', 'Roles', 'Estado', 'Fecha Creación'];
    const rows = this.filteredUsers.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone || '',
      user.position || '',
      user.employee?.full_name || '',
      user.roles?.map(role => role.name).join(', ') || '',
      user.activo ? 'Activo' : 'Inactivo',
      this.formatDate(user.created_at)
    ]);
    
    return [headers, ...rows].map(row => 
      row.map(field => `"${field}"`).join(',')
    ).join('\n');
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('es-ES');
  }

  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  isLastAdmin(user: User): boolean {
    if (!user.is_admin) return false;
    return this.users.filter(u => u.is_admin).length <= 1;
  }

  private destroyEmployeeSelect2(): void {
    const $ = (window as any).$;
    if (!$ || !$.fn?.select2) {
      return;
    }
    const $el = $('#employee_id_select');
    if ($el.length && $el.hasClass('select2-hidden-accessible')) {
      $el.off('change.select2Emp');
      $el.select2('destroy');
    }
  }

  private initEmployeeSelect2(): void {
    this.destroyEmployeeSelect2();
    const $ = (window as any).$;
    if (!$ || !$.fn?.select2) {
      return;
    }
    const $el = $('#employee_id_select');
    if (!$el.length) {
      return;
    }
    const employees = this.referenceData?.employees ?? [];
    $el.empty();
    $el.append('<option value="">Sin empleado asociado</option>');
    employees.forEach((e) => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.text;
      $el.append(opt);
    });
    const current = this.userForm.get('employee_id')?.value;
    if (current !== '' && current != null) {
      $el.val(String(current));
    }
    const $modal = $('#userModal');
    $el.select2({
      theme: 'bootstrap4',
      width: '100%',
      placeholder: 'Buscar empleado...',
      allowClear: true,
      dropdownParent: $modal.length ? $modal : undefined,
      language: { noResults: () => 'Sin resultados' }
    });
    $el.off('change.select2Emp').on('change.select2Emp', () => {
      const v = $el.val();
      this.userForm.patchValue({
        employee_id: v === null || v === '' || v === undefined ? '' : String(v)
      });
      this.cdr.markForCheck();
    });
  }

  // Modal methods
  private showModal(modalId: string): void {
    console.log('🔍 showModal llamado para:', modalId);
    const modal = document.getElementById(modalId);
    if (modal) {
      console.log('🔍 Modal encontrado, abriendo...');
      // Usar Bootstrap modal nativo si jQuery no está disponible
      const jq = (window as any).$;
      if (jq && jq.fn.modal) {
        if (modalId === 'userModal') {
          jq(`#${modalId}`).off('shown.bs.modal.empSel').one('shown.bs.modal.empSel', () => {
            setTimeout(() => this.initEmployeeSelect2(), 50);
          });
        }
        jq(`#${modalId}`).modal('show');
        console.log('🔍 Modal abierto con jQuery');
      } else {
        // Fallback a Bootstrap nativo
        modal.classList.add('show');
        modal.style.display = 'block';
        modal.setAttribute('aria-modal', 'true');
        console.log('🔍 Modal abierto con Bootstrap nativo');
        modal.setAttribute('role', 'dialog');
        
        // Agregar backdrop
        const backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        backdrop.id = 'modal-backdrop';
        backdrop.addEventListener('click', () => this.hideModal(modalId));
        document.body.appendChild(backdrop);
        
        // Agregar listener para escape
        this.addEscapeListener(modalId);
        if (modalId === 'userModal') {
          setTimeout(() => this.initEmployeeSelect2(), 100);
        }
      }
    }
  }

  hideModal(modalId: string): void {
    if (modalId === 'userModal') {
      this.destroyEmployeeSelect2();
    }
    const modal = document.getElementById(modalId);
    if (modal) {
      // Usar Bootstrap modal nativo si jQuery no está disponible
      if ((window as any).$ && (window as any).$.fn.modal) {
        (window as any).$(`#${modalId}`).modal('hide');
      } else {
        // Fallback a Bootstrap nativo
        modal.classList.remove('show');
        modal.style.display = 'none';
        modal.removeAttribute('aria-modal');
        modal.removeAttribute('role');
        
        // Remover backdrop
        const backdrop = document.getElementById('modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
        
        // Remover listener de escape
        this.removeEscapeListener(modalId);
      }
    }
  }

  private addEscapeListener(modalId: string): void {
    const escapeHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.hideModal(modalId);
      }
    };
    
    document.addEventListener('keydown', escapeHandler);
    // Guardar referencia para poder removerlo después
    (window as any)[`escapeHandler_${modalId}`] = escapeHandler;
  }

  private removeEscapeListener(modalId: string): void {
    const escapeHandler = (window as any)[`escapeHandler_${modalId}`];
    if (escapeHandler) {
      document.removeEventListener('keydown', escapeHandler);
      delete (window as any)[`escapeHandler_${modalId}`];
    }
  }

  // Message methods - Sistema simple sin PrimeNG
  private showSuccessMessage(message: string): void {
    console.log('✅ ÉXITO:', message);
    // Mostrar alerta para mensajes importantes
    if (message.includes('Permisos cargados correctamente')) {
      alert(`✅ ${message}`);
    }
  }

  private showErrorMessage(message: string): void {
    console.error('❌ ERROR:', message);
    // Mostrar alerta para errores importantes
    alert(`❌ ${message}`);
  }

  private showWarningMessage(message: string): void {
    console.warn('⚠️ ADVERTENCIA:', message);
    // Mostrar alerta para advertencias importantes
    if (message.includes('No se encontraron permisos')) {
      alert(`⚠️ ${message}`);
    }
  }

  private showInfoMessage(message: string): void {
    console.log('ℹ️ INFORMACIÓN:', message);
    // Solo mostrar en consola para mensajes informativos
  }

  // Access management methods
  manageAccess(user: User): void {
    console.log('🔧 Iniciando gestión de acceso para usuario:', user);
    console.log('🔍 Usuario seleccionado:', user.name, 'ID:', user.id);
    
    // Limpiar permisos solo si es un usuario diferente
    if (!this.managingAccessUser || this.managingAccessUser.id !== user.id) {
      console.log('🔧 Limpiando permisos para nuevo usuario');
      this.menuPermissions = {};
    }
    
    this.managingAccessUser = user;
    this.accessStep = 1; // Resetear al paso 1
    this.loadAccessData(user.id);
    this.showModal('accessModal');
    
    console.log('🔍 Modal de gestión de acceso abierto para usuario:', user.name);
    
    console.log('🔧 Estado inicial del modal:', {
      accessStep: this.accessStep,
      selectedSystems: this.selectedSystems,
      selectedSystemsLength: this.selectedSystems.length,
      canContinue: this.canContinueToMenus(),
      menuPermissions: this.menuPermissions
    });
    
    // Forzar detección de cambios para asegurar que el modal se muestre
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  goToStep(step: number): void {
    console.log('🔄 Cambiando al paso:', step, 'Sistemas seleccionados:', this.selectedSystems.length);
    this.accessStep = step;
    
    // Si vamos al paso 2, verificar que los menús estén disponibles antes de cargar permisos
    if (step === 2 && this.managingAccessUser) {
      console.log('🔄 Verificando disponibilidad de menús para cargar permisos...');
      console.log('📊 AvailableMenus disponibles:', this.availableMenus.length);
      
      if (this.availableMenus && this.availableMenus.length > 0) {
        console.log('✅ Menús disponibles, cargando permisos...');
        this.loadExistingPermissions(this.managingAccessUser.id);
      } else {
        console.log('⚠️ Menús no disponibles aún, se cargarán automáticamente cuando estén listos');
      }
    }
    
    // Forzar detección de cambios para actualizar la vista
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  loadAccessData(userId: number): void {
    console.log('🔄 Iniciando carga de datos de acceso para usuario:', userId);
    
    // Limpiar datos anteriores y resetear estados
    this.availableSystems = [];
    this.availableMenus = [];
    this.selectedSystems = [];
    this.selectedMenus = [];
    // NO limpiar menuPermissions aquí para preservar los cambios del usuario
    this.loadingSystems = true;
    this.loadingMenus = true;
    this.loadingAccess = true;
    this.systemsError = false;
    this.menusError = false;
    this.accessError = false;
    
    // Asegurar que todos los menús inicien colapsados
    this.ensureMenusStartCollapsed();
    
    console.log('🔄 Estados iniciales:', {
      loadingSystems: this.loadingSystems,
      loadingMenus: this.loadingMenus,
      systemsError: this.systemsError,
      menusError: this.menusError
    });

    // Cargar sistemas integrados disponibles
    console.log('🔄 Cargando sistemas integrados disponibles...');
    this.userService.getAvailableSystems()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (systems) => {
          this.availableSystems = systems;
          this.loadingSystems = false;
          this.systemsError = false;
          console.log('✅ Sistemas integrados cargados:', systems.length, systems);
          console.log('🔄 Estados después de cargar sistemas:', {
            loadingSystems: this.loadingSystems,
            loadingMenus: this.loadingMenus,
            systemsError: this.systemsError,
            menusError: this.menusError
          });
          // Forzar detección de cambios con timeout para asegurar que se ejecute
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => {
          console.error('❌ Error al cargar sistemas integrados:', error);
          this.availableSystems = [];
          this.loadingSystems = false;
          this.systemsError = true;
          console.log('🔄 Estados después de error en sistemas:', {
            loadingSystems: this.loadingSystems,
            loadingMenus: this.loadingMenus,
            systemsError: this.systemsError,
            menusError: this.menusError
          });
          // Forzar detección de cambios con timeout para asegurar que se ejecute
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        }
      });

    // Cargar menús de sistema disponibles
    console.log('🔄 Cargando menús de sistema disponibles...');
    this.userService.getAvailableMenus()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (menus) => {
          this.availableMenus = menus;
          this.loadingMenus = false;
          this.menusError = false;
          console.log('✅ Menús de sistema cargados:', menus.length, menus);
          
          // DIAGNÓSTICO: Analizar estructura de menús
          console.log('🔍 DIAGNÓSTICO DE MENÚS:');
          console.log('- Total menús cargados:', menus.length);
          
          // Analizar por sistema
          const menusPorSistema = menus.reduce((acc: any, menu: any) => {
            const sistemaId = menu.sistema_id;
            if (!acc[sistemaId]) acc[sistemaId] = [];
            acc[sistemaId].push(menu);
            return acc;
          }, {} as any);
          
          console.log('- Menús por sistema:', Object.keys(menusPorSistema).map(sistemaId => ({
            sistemaId: parseInt(sistemaId),
            cantidad: menusPorSistema[sistemaId].length,
            menus: menusPorSistema[sistemaId].map((m: any) => ({
              id: m.id,
              nombre: m.nombre,
              nivel: m.nivel,
              parent_id: m.parent_id,
              sistema_id: m.sistema_id
            }))
          })));
          
          // Analizar niveles
          const menusNivel1 = menus.filter((menu: any) => menu.nivel === 1);
          const menusNivel2 = menus.filter((menu: any) => menu.nivel === 2);
          const menusSinNivel = menus.filter((menu: any) => !menu.nivel);
          
          console.log('- Menús nivel 1:', menusNivel1.length, menusNivel1.map((m: any) => ({id: m.id, nombre: m.nombre, nivel: m.nivel, parent_id: m.parent_id})));
          console.log('- Menús nivel 2:', menusNivel2.length, menusNivel2.map((m: any) => ({id: m.id, nombre: m.nombre, nivel: m.nivel, parent_id: m.parent_id})));
          console.log('- Menús sin nivel:', menusSinNivel.length, menusSinNivel.map((m: any) => ({id: m.id, nombre: m.nombre, nivel: m.nivel, parent_id: m.parent_id})));
          
          // Asegurar que todos los menús inicien colapsados
          this.ensureMenusStartCollapsed();
          
          console.log('🔄 Estados después de cargar menú:', {
            loadingSystems: this.loadingSystems,
            loadingMenus: this.loadingMenus,
            systemsError: this.systemsError,
            menusError: this.menusError
          });
          
          // Cargar permisos existentes después de que los menús estén disponibles
          if (this.managingAccessUser) {
            console.log('🔄 Cargando permisos existentes después de cargar menús...');
            this.loadExistingPermissions(this.managingAccessUser.id);
          }
          
          // Forzar detección de cambios con timeout para asegurar que se ejecute
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        },
        error: (error) => {
          console.error('❌ Error al cargar menús de sistema:', error);
          this.availableMenus = [];
          this.loadingMenus = false;
          this.menusError = true;
          console.log('🔄 Estados después de error en menús:', {
            loadingSystems: this.loadingSystems,
            loadingMenus: this.loadingMenus,
            systemsError: this.systemsError,
            menusError: this.menusError
          });
          // Forzar detección de cambios con timeout para asegurar que se ejecute
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        }
      });

    // Cargar acceso actual del usuario
    console.log('🔄 Cargando acceso actual del usuario...');
    this.userService.getUserAccess(userId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (access) => {
          this.selectedSystems = access.systems;
          this.selectedMenus = access.menus;
          this.loadingAccess = false;
          this.accessError = false;
          console.log('✅ Acceso del usuario cargado:', access);
        },
        error: (error) => {
          console.error('❌ Error al cargar acceso del usuario:', error);
          this.selectedSystems = [];
          this.selectedMenus = [];
          this.loadingAccess = false;
          this.accessError = true;
        }
      });
  }

  toggleSystem(systemId: number): void {
    console.log('🔍 toggleSystem llamado con systemId:', systemId);
    console.log('🔍 selectedSystems antes:', this.selectedSystems);
    console.log('🔍 availableMenus:', this.availableMenus.length);
    console.log('🔍 availableSystems:', this.availableSystems.length);
    
    const index = this.selectedSystems.indexOf(systemId);
    if (index > -1) {
      this.selectedSystems.splice(index, 1);
      console.log('🔴 Sistema deseleccionado:', systemId, 'Sistemas seleccionados:', this.selectedSystems);
    } else {
      this.selectedSystems.push(systemId);
      console.log('🟢 Sistema seleccionado:', systemId, 'Sistemas seleccionados:', this.selectedSystems);
      
      // Asegurar que los menús del sistema seleccionado inicien colapsados
      this.ensureMenusStartCollapsed();
    }
    
    // Probar getAllMenusFromSelectedSystems inmediatamente
    const menus = this.getAllMenusFromSelectedSystems();
    console.log('🔍 Menús encontrados después del toggle:', menus.length, menus);
    
    // Forzar detección de cambios
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  toggleMenu(menuId: number): void {
    const index = this.selectedMenus.indexOf(menuId);
    
    // Obtener submenús del menú actual
    const submenus = this.getSubmenus(menuId);
    
    if (index > -1) {
      // Desmarcar menú
      this.selectedMenus.splice(index, 1);
      
      // Desmarcar todos los permisos de acceso del menú principal
      if (this.menuPermissions[menuId]) {
        this.menuPermissions[menuId].ver = false;
        this.menuPermissions[menuId].crear = false;
        this.menuPermissions[menuId].editar = false;
        this.menuPermissions[menuId].eliminar = false;
        this.menuPermissions[menuId].exportar = false;
      }
      
      console.log(`❌ Menú ${menuId} desmarcado - Todos los permisos desmarcados`);
      
      // Desmarcar todos los submenús y sus permisos
      submenus.forEach(submenu => {
        const submenuIndex = this.selectedMenus.indexOf(submenu.id);
        if (submenuIndex > -1) {
          this.selectedMenus.splice(submenuIndex, 1);
        }
        
        if (this.menuPermissions[submenu.id]) {
          this.menuPermissions[submenu.id].ver = false;
          this.menuPermissions[submenu.id].crear = false;
          this.menuPermissions[submenu.id].editar = false;
          this.menuPermissions[submenu.id].eliminar = false;
          this.menuPermissions[submenu.id].exportar = false;
        }
        
        console.log(`  ❌ Submenú ${submenu.id} (${submenu.nombre}) desmarcado`);
      });
    } else {
      // Marcar menú
      this.selectedMenus.push(menuId);
      
      // Marcar todos los permisos de acceso del menú principal
      if (!this.menuPermissions[menuId]) {
        this.menuPermissions[menuId] = {};
      }
      
      this.menuPermissions[menuId].ver = true;
      this.menuPermissions[menuId].crear = true;
      this.menuPermissions[menuId].editar = true;
      this.menuPermissions[menuId].eliminar = true;
      this.menuPermissions[menuId].exportar = true;
      
      console.log(`✅ Menú ${menuId} marcado - Todos los permisos marcados`);
      
      // Marcar todos los submenús y sus permisos
      submenus.forEach(submenu => {
        if (!this.selectedMenus.includes(submenu.id)) {
          this.selectedMenus.push(submenu.id);
        }
        
        if (!this.menuPermissions[submenu.id]) {
          this.menuPermissions[submenu.id] = {};
        }
        
        this.menuPermissions[submenu.id].ver = true;
        this.menuPermissions[submenu.id].crear = true;
        this.menuPermissions[submenu.id].editar = true;
        this.menuPermissions[submenu.id].eliminar = true;
        this.menuPermissions[submenu.id].exportar = true;
        
        console.log(`  ✅ Submenú ${submenu.id} (${submenu.nombre}) marcado`);
      });
    }
    
    console.log(`🔄 toggleMenu(${menuId}):`, {
      seleccionado: this.selectedMenus.includes(menuId),
      permisos: this.menuPermissions[menuId],
      submenusAfectados: submenus.length
    });
    
    // Forzar detección de cambios para actualizar los checkboxes en la vista
    this.cdr.detectChanges();
  }

  isSystemSelected(systemId: number): boolean {
    return this.selectedSystems.includes(systemId);
  }

  isMenuSelected(menuId: number): boolean {
    return this.selectedMenus.includes(menuId);
  }

  saveAccess(): void {
    if (!this.managingAccessUser) return;

    // CORRECCIÓN: Sincronizar menuPermissions con availableMenus antes de guardar
    const allMenusFromSelectedSystems = this.getAllMenusFromSelectedSystems();
    const availableMenuIds = allMenusFromSelectedSystems.map(m => m.id);
    
    console.log('🔧 DIAGNÓSTICO - saveAccess():');
    console.log('- selectedMenus (lo que el usuario seleccionó):', this.selectedMenus);
    console.log('- availableMenuIds (todos los menús de sistemas seleccionados):', availableMenuIds);
    console.log('- allMenusFromSelectedSystems:', allMenusFromSelectedSystems.map(m => ({id: m.id, nombre: m.nombre, sistema_id: m.sistema_id})));
    
    // CORRECCIÓN: Preservar TODOS los permisos existentes, no solo los de sistemas seleccionados
    // El problema era que se eliminaban permisos de otros sistemas
    const cleanedMenuPermissions: { [menuId: number]: UserMenuPermissions } = { ...this.menuPermissions };
    
    console.log('- menuPermissions originales (TODOS preservados):', Object.keys(this.menuPermissions).map(id => parseInt(id)));
    console.log('- menuPermissions preservados:', Object.keys(cleanedMenuPermissions).map(id => parseInt(id)));
    
    // CORRECCIÓN: Solo usar los menús que el usuario realmente seleccionó
    // NO combinar con menusWithPermissions para evitar duplicación
    // El problema era que se combinaban selectedMenus + menusWithPermissions,
    // causando que se crearan accesos para menús que el usuario no seleccionó
    const menusToSave = [...this.selectedMenus];
    console.log('- menusToSave (solo seleccionados por el usuario):', menusToSave);
    
    // Filtrar solo los menús que pertenecen a los sistemas seleccionados
    const validMenusToSave = menusToSave.filter(menuId => 
      allMenusFromSelectedSystems.some(menu => menu.id === menuId)
    );
    console.log('- validMenusToSave (filtrados):', validMenusToSave);

    // VALIDACIÓN: Verificar si hay menús válidos para guardar
    if (validMenusToSave.length === 0) {
      this.showErrorMessage('No se pueden guardar permisos: No hay menús válidos seleccionados. Verifique que los menús pertenezcan a los sistemas seleccionados.');
      return;
    }

    this.saving = true;
    this.userService.updateUserAccessWithPermissions(
      this.managingAccessUser.id,
      this.selectedSystems,
      validMenusToSave,
      cleanedMenuPermissions, // Usar permisos limpiados
      this.availableMenus
    ).pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.saving = false;
        this.hideModal('accessModal');
        
        // Verificar si hay advertencia sobre menús no válidos
        if (result && result.warning) {
          this.showErrorMessage('No se pudieron guardar los permisos: Los menús seleccionados no existen en el sistema');
        } else {
          this.showSuccessMessage('Acceso y permisos actualizados correctamente');
        }
        
        this.loadData(); // Recargar datos para reflejar cambios
      },
      error: (error) => {
        this.saving = false;
        this.showErrorMessage(error.message || 'Error al actualizar acceso del usuario');
      }
    });
  }

  // DataTable methods
  initializeDataTable(): void {
    if (this.dataTableInstance) {
      this.dataTableInstance.destroy();
    }

    setTimeout(() => {
      this.dataTableInstance = this.dataTablesService.initializeDataTable('usersTable', {
        columns: this.tableColumns,
        data: this.filteredUsers,
        pageLength: 10,
        responsive: true,
        select: {
          style: 'multi',
          selector: 'td:first-child'
        }
      });

      // Configurar eventos globales para los botones
      this.setupGlobalEventHandlers();
    }, 100);
  }

  setupGlobalEventHandlers(): void {
    // Hacer las funciones globales disponibles
    (window as any).viewUser = (userId: number) => {
      const user = this.users.find(u => u.id === userId);
      if (user) this.viewUser(user);
    };

    (window as any).editUser = (userId: number) => {
      const user = this.users.find(u => u.id === userId);
      if (user) this.editUser(user);
    };

    (window as any).manageAccess = (userId: number) => {
      const user = this.users.find(u => u.id === userId);
      if (user) this.manageAccess(user);
    };
  }

  updateDataTable(): void {
    if (this.dataTableInstance) {
      this.dataTablesService.updateDataTable('usersTable', this.filteredUsers);
    }
  }

  // Helper methods for access management
  getSystemName(systemId: number): string {
    if (!systemId || systemId === 0) return 'Sin sistema';
    const system = this.availableSystems.find(s => s.id === systemId);
    return system ? system.nombre : `Sistema ${systemId}`;
  }

  getSystemIcon(systemId: number): string {
    const system = this.availableSystems.find(s => s.id === systemId);
    return system?.icono || 'fas fa-server';
  }

  getMenuName(menuId: number): string {
    const menu = this.availableMenus.find(m => m.id === menuId);
    return menu ? menu.nombre : `Menú ${menuId}`;
  }

  // Método para alternar la expansión de un menú
  toggleMenuExpanded(menuId: number): void {
    const menu = this.availableMenus.find(m => m.id === menuId);
    if (menu) {
      menu.expanded = !menu.expanded;
      this.cdr.detectChanges();
    }
  }

  // Método para obtener los submenús de un menú
  getSubmenus(menuId: number): Menu[] {
    return this.availableMenus.filter(menu =>
      (menu as any).parent_id === menuId
    );
  }

  // Método para verificar si un menú tiene submenús
  hasSubmenus(menuId: number): boolean {
    return this.availableMenus.some(
      menu => (menu as any).parent_id === menuId
    );
  }


  getMenusBySystem(systemId: number): Menu[] {
    const todosLosMenusDelSistema = this.availableMenus.filter(menu => menu.sistema_id === systemId);

    // FILTRAR SOLO MENÚS DE NIVEL 1 (nivel = 1 y parent_id = null)
    // También incluir menús sin nivel definido pero sin parent_id (posibles menús principales)
    const menusFromAvailable = this.availableMenus.filter(menu =>
      menu.sistema_id === systemId &&
      (
        // Menús con nivel 1 explícito
        ((menu as any).nivel === 1 && ((menu as any).parent_id === null || (menu as any).parent_id === undefined)) ||
        // Menús sin nivel definido pero sin parent_id (posibles menús principales)
        ((menu as any).nivel === null || (menu as any).nivel === undefined) &&
        ((menu as any).parent_id === null || (menu as any).parent_id === undefined || (menu as any).parent_id === '')
      )
    );

    if (menusFromAvailable.length === 0) {
      return todosLosMenusDelSistema;
    }

    return menusFromAvailable;
  }

  getMenuCountBySystem(systemId: number): number {
    // Contar solo menús de nivel 1
    return this.getMenusBySystem(systemId).length;
  }

  getSystemDescription(systemId: number): string {
    const system = this.availableSystems.find(s => s.id === systemId);
    return system ? (system.descripcion || 'Sin descripción') : 'Sistema no encontrado';
  }

  getSelectedMenusBySystem(systemId: number): Menu[] {
    return this.getMenusBySystem(systemId).filter(menu => this.isMenuSelected(menu.id));
  }

  // Método de debug para mostrar información en el template
  debugMenuInfo(): string {
    const menus = this.getAllMenusFromSelectedSystems();
    return `Sistemas: ${this.selectedSystems.length}, Menús: ${menus.length}`;
  }

  // Métodos para gestión de permisos de menús - SOLO NIVEL 1
  getAllMenusFromSelectedSystems(): Menu[] {
    const allMenus: Menu[] = [];

    this.selectedSystems.forEach(systemId => {
      const systemMenus = this.getMenusBySystem(systemId);
      allMenus.push(...systemMenus);
    });

    return allMenus;
  }

  trackByMenuId(index: number, menu: Menu): number {
    return menu.id;
  }

  isAllMenusSelected(): boolean {
    const allMenus = this.getAllMenusFromSelectedSystems();
    return allMenus.length > 0 && allMenus.every(menu => this.isMenuSelected(menu.id));
  }

  toggleAllMenus(event: any): void {
    const isChecked = event.target.checked;
    const allMenus = this.getAllMenusFromSelectedSystems();
    
    if (isChecked) {
      allMenus.forEach(menu => {
        if (!this.isMenuSelected(menu.id)) {
          this.selectedMenus.push(menu.id);
        }
      });
    } else {
      allMenus.forEach(menu => {
        const index = this.selectedMenus.indexOf(menu.id);
        if (index > -1) {
          this.selectedMenus.splice(index, 1);
        }
      });
    }
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  getMenuPermission(menuId: number, permission: keyof UserMenuPermissions): boolean {
    const permissions = this.menuPermissions[menuId];
    if (!permissions) {
      return false;
    }
    
    const result = permissions[permission] || false;
    
    return result;
  }

  toggleMenuPermission(menuId: number, permission: keyof UserMenuPermissions, event: any): void {
    const isChecked = event.target.checked;
    
    if (!this.menuPermissions[menuId]) {
      this.menuPermissions[menuId] = {
        lectura: false,
        escritura: false,
        eliminacion: false,
        configuracion: false,
        exportacion: false,
        auditoria: false
      };
    }
    
    // Aplicar el permiso al menú principal
    this.menuPermissions[menuId][permission] = isChecked;
    
    console.log(`🔄 toggleMenuPermission(${menuId}, ${permission}): ${isChecked}`);
    
    // Obtener submenús del menú actual
    const submenus = this.getSubmenus(menuId);
    
    // Si hay submenús, aplicar el mismo permiso a todos ellos
    if (submenus.length > 0) {
      console.log(`  📋 Aplicando permiso "${permission}" a ${submenus.length} submenús`);
      
      submenus.forEach(submenu => {
        if (!this.menuPermissions[submenu.id]) {
          this.menuPermissions[submenu.id] = {};
        }
        
        this.menuPermissions[submenu.id][permission] = isChecked;
        
        console.log(`    ${isChecked ? '✅' : '❌'} Submenú ${submenu.id} (${submenu.nombre}) - ${permission}: ${isChecked}`);
      });
    }
    
    setTimeout(() => {
      this.cdr.detectChanges();
    }, 0);
  }

  /**
   * Aplica la jerarquía automática de permisos
   * lectura < escritura < eliminacion < configuracion < auditoria
   */
  private applyPermissionHierarchy(menuId: number, permission: keyof UserMenuPermissions, isChecked: boolean): void {
    const permissions = this.menuPermissions[menuId];
    
    if (isChecked) {
      // Si se activa un permiso, activar automáticamente los permisos inferiores
      switch (permission) {
        case 'escritura':
          permissions.lectura = true;
          break;
        case 'eliminacion':
          permissions.lectura = true;
          permissions.escritura = true;
          break;
        case 'configuracion':
          permissions.lectura = true;
          permissions.escritura = true;
          permissions.eliminacion = true;
          break;
        case 'auditoria':
          permissions.lectura = true;
          permissions.escritura = true;
          permissions.eliminacion = true;
          permissions.configuracion = true;
          break;
      }
    } else {
      // Si se desactiva un permiso, desactivar automáticamente los permisos superiores
      switch (permission) {
        case 'lectura':
          permissions.escritura = false;
          permissions.eliminacion = false;
          permissions.configuracion = false;
          permissions.auditoria = false;
          break;
        case 'escritura':
          permissions.eliminacion = false;
          permissions.configuracion = false;
          permissions.auditoria = false;
          break;
        case 'eliminacion':
          permissions.configuracion = false;
          permissions.auditoria = false;
          break;
        case 'configuracion':
          permissions.auditoria = false;
          break;
      }
    }
    
    permissions[permission] = isChecked;
  }

  getMenusWithPermission(permission: keyof UserMenuPermissions): Menu[] {
    return this.getAllMenusFromSelectedSystems().filter(menu => 
      this.getMenuPermission(menu.id, permission)
    );
  }

  configureMenuPermissions(menu: Menu): void {
    // TODO: Implementar modal de configuración avanzada de permisos
    console.log('Configurar permisos avanzados para:', menu);
  }

  viewMenuDetails(menu: Menu): void {
    // TODO: Implementar modal de detalles del menú
    console.log('Ver detalles del menú:', menu);
  }

  // Método para cargar permisos existentes del usuario
  loadExistingPermissions(userId: number): void {
    // Verificar que los menús estén disponibles antes de procesar permisos
    if (!this.availableMenus || this.availableMenus.length === 0) {
      this.showWarningMessage('⚠️ Cargando menús disponibles, por favor espere...');
      return;
    }
    
    this.userService.getUserDetailedAccess(userId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (accessData) => {
        // Procesar los accesos existentes y convertirlos a menuPermissions
        if (accessData && Array.isArray(accessData) && accessData.length > 0) {
          let permisosProcesados = 0;
          let permisosConErrores = 0;
          
          accessData.forEach((acceso: any) => {
            if (acceso.menu_id && acceso.menu_id !== 'all') {
              const menuId = parseInt(acceso.menu_id);
              
              // CORRECCIÓN: Verificar que el menú existe en availableMenus
              const menuExiste = this.availableMenus.some(menu => menu.id === menuId);
              
              console.log(`🔍 Verificando menú ID ${menuId}:`, {
                existe: menuExiste,
                total_available_menus: this.availableMenus.length,
                available_menu_ids: this.availableMenus.map(m => m.id),
                acceso_menu_id: acceso.menu_id,
                acceso_tipo: typeof acceso.menu_id
              });
              
              if (!menuExiste) {
                console.warn(`⚠️ Menú ID ${menuId} no encontrado en availableMenus - Saltando permiso`);
                console.log(`🔍 AvailableMenus disponibles:`, this.availableMenus.map(m => ({id: m.id, nombre: m.nombre})));
                console.log(`🔍 Este menú puede ser de otro sistema o estar inactivo`);
                permisosConErrores++;
                return; // Saltar este permiso sin error
              }
              
              if (!isNaN(menuId)) {
                if (!this.menuPermissions[menuId]) {
                  this.menuPermissions[menuId] = {};
                }
                
                // Convertir array de permisos a objeto booleano
                if (acceso.permisos && Array.isArray(acceso.permisos)) {
                  this.menuPermissions[menuId].lectura = acceso.permisos.includes('lectura');
                  this.menuPermissions[menuId].escritura = acceso.permisos.includes('escritura');
                  this.menuPermissions[menuId].eliminacion = acceso.permisos.includes('eliminacion');
                  this.menuPermissions[menuId].configuracion = acceso.permisos.includes('configuracion');
                  this.menuPermissions[menuId].exportacion = acceso.permisos.includes('exportacion');
                  this.menuPermissions[menuId].auditoria = acceso.permisos.includes('auditoria');
                  
                  permisosProcesados++;
                } else {
                  // Si no hay permisos específicos, inicializar con valores por defecto
                  this.menuPermissions[menuId].lectura = false;
                  this.menuPermissions[menuId].escritura = false;
                  this.menuPermissions[menuId].eliminacion = false;
                  this.menuPermissions[menuId].configuracion = false;
                  this.menuPermissions[menuId].exportacion = false;
                  this.menuPermissions[menuId].auditoria = false;
                  
                  permisosConErrores++;
                }
              } else {
                permisosConErrores++;
              }
            }
          });
          
          // Mostrar mensaje de éxito con detalles
          if (permisosProcesados > 0) {
            this.showSuccessMessage(`✅ Permisos cargados correctamente: ${permisosProcesados} menús con permisos válidos`);
          } else {
            this.showWarningMessage('⚠️ No se encontraron permisos válidos para este usuario');
          }
          
          if (permisosConErrores > 0) {
            console.log(`ℹ️ Se encontraron ${permisosConErrores} permisos de menús que no están disponibles actualmente (pueden ser de otros sistemas o estar inactivos)`);
          }
          
          // CORRECCIÓN: Asegurar que los menús seleccionados se actualicen correctamente
          this.updateSelectedMenusFromPermissions();
          
          // Forzar detección de cambios
          setTimeout(() => {
            this.cdr.detectChanges();
          }, 0);
        } else {
          // Mostrar mensaje de advertencia
          this.showWarningMessage('⚠️ No se encontraron permisos existentes para este usuario en la base de datos');
        }
      },
      error: (error) => {
        console.error('❌ Error al cargar permisos existentes:', error);
        this.showErrorMessage('❌ Error al cargar permisos desde la base de datos');
      }
    });
  }

  // Método para actualizar selectedMenus basado en menuPermissions
  updateSelectedMenusFromPermissions(): void {
    const menusConPermisos = Object.keys(this.menuPermissions).map(id => parseInt(id));
    
    // FILTRAR: Solo incluir menús que existen en availableMenus
    const menusValidos = menusConPermisos.filter(menuId => 
      this.availableMenus.some(menu => menu.id === menuId)
    );
    
    // Actualizar selectedMenus para incluir solo los IDs de menús válidos
    this.selectedMenus = menusValidos;
    
    console.log('🔧 Actualizando selectedMenus (solo menús válidos):', {
      menusConPermisos: menusConPermisos,
      menusValidos: menusValidos,
      selectedMenus: this.selectedMenus,
      menusDetails: this.availableMenus.filter(menu => 
        menusValidos.includes(menu.id)
      ).map(m => ({ id: m.id, nombre: m.nombre }))
    });
  }

  // Método para verificar el estado del botón continuar
  canContinueToMenus(): boolean {
    const canContinue = this.selectedSystems.length > 0;
    console.log('🔍 Verificando si puede continuar:', {
      selectedSystems: this.selectedSystems,
      length: this.selectedSystems.length,
      canContinue: canContinue
    });
    return canContinue;
  }

  // Método para verificar el estado de los permisos
  checkPermissionsStatus(): void {
    // Sin logs de debug para producción
  }




  // Método para asegurar que todos los menús visibles tengan permisos definidos
  ensureAllMenusHavePermissions(): void {
    const menusFromSelectedSystems = this.getAllMenusFromSelectedSystems();
    let menusFixed = 0;
    
    menusFromSelectedSystems.forEach(menu => {
      if (!this.menuPermissions[menu.id]) {
        // Solo aplicar permisos por defecto (todos false)
        this.menuPermissions[menu.id] = {
          lectura: false,
          escritura: false,
          eliminacion: false,
          configuracion: false,
          exportacion: false,
          auditoria: false
        };
        
        menusFixed++;
      }
    });
    
    if (menusFixed > 0) {
      this.showSuccessMessage(`Permisos por defecto aplicados a ${menusFixed} menús`);
    }
  }

  // Método para asegurar que todos los menús inicien colapsados (simplificado - solo menús principales)
  ensureMenusStartCollapsed(): void {
    // Aplicar solo a menús principales - sin submenús
    this.availableMenus.forEach(menu => {
      if (menu.expanded === undefined || menu.expanded === true) {
        menu.expanded = false; // Forzar que inicien colapsados
      }
    });
    
    console.log('✅ Menús principales configurados para iniciar colapsados');
  }

  // Método para expandir todos los menús (útil para debug)
  expandAllMenus(): void {
    this.availableMenus.forEach(menu => {
      if (this.hasSubmenus(menu.id)) {
        menu.expanded = true;
      }
    });
    console.log('✅ Todos los menús expandidos');
  }

  // Método para colapsar todos los menús
  collapseAllMenus(): void {
    this.availableMenus.forEach(menu => {
      menu.expanded = false;
    });
    console.log('✅ Todos los menús colapsados');
  }



  // Time and date methods
  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Métodos simplificados - sin expansión de submenús
  // (Métodos de expansión removidos ya que solo mostramos menús principales)

  manageMenuPermissions(menu: any): void {
    // Abrir modal de gestión de permisos para el menú específico
    console.log('Gestionando permisos para menú:', menu);
    // TODO: Implementar modal de gestión de permisos específicos
    this.showSuccessMessage(`Gestionando permisos para: ${menu.nombre}`);
  }

}