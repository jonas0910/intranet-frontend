import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-permissions',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">🔑 Gestionar Permisos</h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a href="#">Inicio</a></li>
                <li class="breadcrumb-item"><a href="#">Administración</a></li>
                <li class="breadcrumb-item"><a [routerLink]="['/admin-menu-management/users']">Gestor de Usuarios</a></li>
                <li class="breadcrumb-item active">Gestionar Permisos</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-md-4">
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
                    <input type="text" class="form-control" id="usuario" placeholder="Escriba el nombre del usuario">
                  </div>
                  
                  <div class="list-group">
                    <a href="#" class="list-group-item list-group-item-action">
                      <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">Juan Pérez</h5>
                        <small>Admin</small>
                      </div>
                      <p class="mb-1">juan.perez&#64;Notaria.com</p>
                      <small>Último acceso: Hace 2 horas</small>
                    </a>
                    <a href="#" class="list-group-item list-group-item-action">
                      <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">María García</h5>
                        <small>Empleado</small>
                      </div>
                      <p class="mb-1">maria.garcia&#64;Notaria.com</p>
                      <small>Último acceso: Hace 1 hora</small>
                    </a>
                    <a href="#" class="list-group-item list-group-item-action">
                      <div class="d-flex w-100 justify-content-between">
                        <h5 class="mb-1">Carlos López</h5>
                        <small>Manager</small>
                      </div>
                      <p class="mb-1">carlos.lopez&#64;Notaria.com</p>
                      <small>Último acceso: Hace 1 día</small>
                    </a>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="col-md-8">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-key mr-2"></i>
                    Permisos del Usuario: Juan Pérez
                  </h3>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <h5><i class="fas fa-cogs mr-2"></i> Administración</h5>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="admin_usuarios" checked>
                        <label class="form-check-label" for="admin_usuarios">
                          Gestión de Usuarios
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="admin_roles" checked>
                        <label class="form-check-label" for="admin_roles">
                          Gestión de Roles
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="admin_permisos" checked>
                        <label class="form-check-label" for="admin_permisos">
                          Gestión de Permisos
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="admin_sistemas">
                        <label class="form-check-label" for="admin_sistemas">
                          Gestión de Sistemas
                        </label>
                      </div>
                      
                      <h5 class="mt-4"><i class="fas fa-file-alt mr-2"></i> Documentos</h5>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="docs_ver" checked>
                        <label class="form-check-label" for="docs_ver">
                          Ver Documentos
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="docs_crear" checked>
                        <label class="form-check-label" for="docs_crear">
                          Crear Documentos
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="docs_editar" checked>
                        <label class="form-check-label" for="docs_editar">
                          Editar Documentos
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="docs_eliminar">
                        <label class="form-check-label" for="docs_eliminar">
                          Eliminar Documentos
                        </label>
                      </div>
                    </div>
                    
                    <div class="col-md-6">
                      <h5><i class="fas fa-ticket-alt mr-2"></i> Tickets</h5>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="tickets_ver" checked>
                        <label class="form-check-label" for="tickets_ver">
                          Ver Tickets
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="tickets_crear" checked>
                        <label class="form-check-label" for="tickets_crear">
                          Crear Tickets
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="tickets_asignar">
                        <label class="form-check-label" for="tickets_asignar">
                          Asignar Tickets
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="tickets_cerrar">
                        <label class="form-check-label" for="tickets_cerrar">
                          Cerrar Tickets
                        </label>
                      </div>
                      
                      <h5 class="mt-4"><i class="fas fa-chart-bar mr-2"></i> Reportes</h5>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="reportes_ver" checked>
                        <label class="form-check-label" for="reportes_ver">
                          Ver Reportes
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="reportes_exportar">
                        <label class="form-check-label" for="reportes_exportar">
                          Exportar Reportes
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="reportes_crear">
                        <label class="form-check-label" for="reportes_crear">
                          Crear Reportes
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div class="row mt-4">
                    <div class="col-12">
                      <h5><i class="fas fa-shield-alt mr-2"></i> Permisos Especiales</h5>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="permiso_especial_1">
                        <label class="form-check-label" for="permiso_especial_1">
                          Acceso a Datos Sensibles
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="permiso_especial_2">
                        <label class="form-check-label" for="permiso_especial_2">
                          Modificar Configuración del Sistema
                        </label>
                      </div>
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="permiso_especial_3">
                        <label class="form-check-label" for="permiso_especial_3">
                          Acceso a Logs del Sistema
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div class="card-footer">
                  <button type="button" class="btn btn-success">
                    <i class="fas fa-save mr-2"></i>
                    Guardar Permisos
                  </button>
                  <button type="button" class="btn btn-warning ml-2">
                    <i class="fas fa-undo mr-2"></i>
                    Restaurar Valores
                  </button>
                  <button type="button" class="btn btn-info ml-2">
                    <i class="fas fa-copy mr-2"></i>
                    Copiar de Otro Usuario
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Resumen de Permisos -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-list-check mr-2"></i>
                    Resumen de Permisos
                  </h3>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-success"><i class="fas fa-check"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Permisos Activos</span>
                          <span class="info-box-number">12</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-warning"><i class="fas fa-times"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Permisos Inactivos</span>
                          <span class="info-box-number">8</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-info"><i class="fas fa-shield-alt"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Permisos Especiales</span>
                          <span class="info-box-number">3</span>
                        </div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="info-box">
                        <span class="info-box-icon bg-primary"><i class="fas fa-clock"></i></span>
                        <div class="info-box-content">
                          <span class="info-box-text">Última Modificación</span>
                          <span class="info-box-number">Hoy</span>
                        </div>
                      </div>
                    </div>
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
    .list-group-item {
      border-radius: 6px;
      margin-bottom: 5px;
    }
    .info-box {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .form-check-label {
      margin-left: 5px;
    }
  `]
})
export class UserPermissionsComponent implements OnInit {

  ngOnInit(): void {
    console.log('🔑 UserPermissionsComponent inicializado');
    console.log('🔐 Gestión de permisos funcionando correctamente');
  }
}
