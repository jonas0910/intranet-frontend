import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserSystemAccessService } from '../../../services/user-system-access.service';

@Component({
  selector: 'app-user-roles',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">🛡️ Asignar Roles</h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a href="#">Inicio</a></li>
                <li class="breadcrumb-item"><a href="#">Administración</a></li>
                <li class="breadcrumb-item"><a [routerLink]="['/admin-menu-management/users']">Gestor de Usuarios</a></li>
                <li class="breadcrumb-item active">Asignar Roles</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-users mr-2"></i>
                    Seleccionar Usuario
                  </h3>
                </div>
                <div class="card-body">
                  <div class="form-group">
                    <label for="usuario">Buscar Usuario</label>
                    <input type="text" class="form-control" id="usuario" placeholder="Escriba el nombre o email del usuario">
                  </div>
                  
                  <div class="table-responsive">
                    <table class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>Seleccionar</th>
                          <th>Nombre</th>
                          <th>Email</th>
                          <th>Rol Actual</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>
                            <input type="radio" name="usuarioSeleccionado" value="1">
                          </td>
                          <td>Juan Pérez</td>
                          <td>juan.perez&#64;Notaria.com</td>
                          <td><span class="badge badge-primary">Admin</span></td>
                        </tr>
                        <tr>
                          <td>
                            <input type="radio" name="usuarioSeleccionado" value="2">
                          </td>
                          <td>María García</td>
                          <td>maria.garcia&#64;Notaria.com</td>
                          <td><span class="badge badge-success">Empleado</span></td>
                        </tr>
                        <tr>
                          <td>
                            <input type="radio" name="usuarioSeleccionado" value="3">
                          </td>
                          <td>Carlos López</td>
                          <td>carlos.lopez&#64;Notaria.com</td>
                          <td><span class="badge badge-warning">Manager</span></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-shield-alt mr-2"></i>
                    Asignar Roles
                  </h3>
                </div>
                <div class="card-body">
                  <div class="alert alert-info">
                    <h5><i class="icon fas fa-info"></i> Usuario Seleccionado</h5>
                    <p class="mb-0">Seleccione un usuario de la lista para asignar roles</p>
                  </div>
                  
                  <div class="form-group">
                    <label>Roles Disponibles</label>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="rol_admin">
                      <label class="form-check-label" for="rol_admin">
                        <span class="badge badge-primary mr-2">Super Admin</span>
                        Acceso completo al sistema
                      </label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="rol_manager">
                      <label class="form-check-label" for="rol_manager">
                        <span class="badge badge-warning mr-2">Manager</span>
                        Gestión de equipos y proyectos
                      </label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="rol_empleado">
                      <label class="form-check-label" for="rol_empleado">
                        <span class="badge badge-success mr-2">Empleado</span>
                        Acceso básico al sistema
                      </label>
                    </div>
                    <div class="form-check">
                      <input type="checkbox" class="form-check-input" id="rol_supervisor">
                      <label class="form-check-label" for="rol_supervisor">
                        <span class="badge badge-info mr-2">Supervisor</span>
                        Supervisión de procesos
                      </label>
                    </div>
                  </div>
                  
                  <div class="form-group">
                    <label for="fechaInicio">Fecha de Inicio</label>
                    <input type="date" class="form-control" id="fechaInicio">
                  </div>
                  
                  <div class="form-group">
                    <label for="fechaFin">Fecha de Fin (Opcional)</label>
                    <input type="date" class="form-control" id="fechaFin">
                  </div>
                  
                  <div class="form-group">
                    <label for="observaciones">Observaciones</label>
                    <textarea class="form-control" id="observaciones" rows="3" placeholder="Motivo de la asignación de roles"></textarea>
                  </div>
                </div>
                <div class="card-footer">
                  <button type="button" class="btn btn-success" (click)="saveRoles()">
                    <i class="fas fa-save mr-2"></i>
                    Asignar Roles
                  </button>
                  <button type="button" class="btn btn-warning ml-2">
                    <i class="fas fa-undo mr-2"></i>
                    Limpiar Selección
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Historial de Roles -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-history mr-2"></i>
                    Historial de Asignaciones de Roles
                  </h3>
                </div>
                <div class="card-body">
                  <div class="table-responsive">
                    <table class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>Usuario</th>
                          <th>Rol Asignado</th>
                          <th>Asignado Por</th>
                          <th>Fecha de Asignación</th>
                          <th>Fecha de Fin</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Juan Pérez</td>
                          <td><span class="badge badge-primary">Super Admin</span></td>
                          <td>Sistema</td>
                          <td>2024-01-15</td>
                          <td>-</td>
                          <td><span class="badge badge-success">Activo</span></td>
                          <td>
                            <button class="btn btn-sm btn-warning">
                              <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger">
                              <i class="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>María García</td>
                          <td><span class="badge badge-success">Empleado</span></td>
                          <td>Juan Pérez</td>
                          <td>2024-01-20</td>
                          <td>-</td>
                          <td><span class="badge badge-success">Activo</span></td>
                          <td>
                            <button class="btn btn-sm btn-warning">
                              <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger">
                              <i class="fas fa-times"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>Carlos López</td>
                          <td><span class="badge badge-warning">Manager</span></td>
                          <td>Juan Pérez</td>
                          <td>2024-01-18</td>
                          <td>2024-02-18</td>
                          <td><span class="badge badge-danger">Expirado</span></td>
                          <td>
                            <button class="btn btn-sm btn-info">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .card {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-control {
      border-radius: 6px;
    }
    .btn {
      border-radius: 6px;
    }
    .table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .form-check-label {
      margin-left: 5px;
    }
  `]
})
export class UserRolesComponent implements OnInit {
  selectedUserId: number = 1;

  constructor(private userSystemAccessService: UserSystemAccessService) { }

  ngOnInit(): void {
    console.log('🛡️ UserRolesComponent inicializado');
    console.log('🔐 Gestión de roles funcionando correctamente');
  }

  saveRoles() {
    console.log('Guardando roles y sincronizando accesos...');
    // Real-world scenario: form bindings would define the selected user and roles.
    // Using mock values for demonstration.
    const selectedRoles = [1, 2];
    this.userSystemAccessService.syncAccessWithRoles(this.selectedUserId, selectedRoles)
      .subscribe({
        next: (response) => {
          console.log('Sincronización exitosa', response);
          alert('Roles asignados y accesos de sistema sincronizados correctamente.');
        },
        error: (error) => {
          console.error('Error durante la sincronización', error);
          alert('Ocurrió un error al sincronizar accesos.');
        }
      });
  }
}
