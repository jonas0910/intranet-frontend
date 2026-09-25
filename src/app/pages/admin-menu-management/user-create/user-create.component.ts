import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">👤 Crear Usuario</h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a href="#">Inicio</a></li>
                <li class="breadcrumb-item"><a href="#">Administración</a></li>
                <li class="breadcrumb-item"><a [routerLink]="['/admin-menu-management/users']">Gestor de Usuarios</a></li>
                <li class="breadcrumb-item active">Crear Usuario</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-md-8">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-user-plus mr-2"></i>
                    Formulario de Creación de Usuario
                  </h3>
                </div>
                <div class="card-body">
                  <form>
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="nombre">Nombre Completo *</label>
                          <input type="text" class="form-control" id="nombre" placeholder="Ingrese el nombre completo">
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="email">Correo Electrónico *</label>
                          <input type="email" class="form-control" id="email" placeholder="usuario@Notaria.com">
                        </div>
                      </div>
                    </div>
                    
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="usuario">Nombre de Usuario *</label>
                          <input type="text" class="form-control" id="usuario" placeholder="usuario123">
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="password">Contraseña *</label>
                          <input type="password" class="form-control" id="password" placeholder="Mínimo 8 caracteres">
                        </div>
                      </div>
                    </div>
                    
                    <div class="row">
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="rol">Rol *</label>
                          <select class="form-control" id="rol">
                            <option value="">Seleccione un rol</option>
                            <option value="admin">Administrador</option>
                            <option value="manager">Manager</option>
                            <option value="empleado">Empleado</option>
                            <option value="supervisor">Supervisor</option>
                          </select>
                        </div>
                      </div>
                      <div class="col-md-6">
                        <div class="form-group">
                          <label for="departamento">Departamento</label>
                          <select class="form-control" id="departamento">
                            <option value="">Seleccione un departamento</option>
                            <option value="rrhh">Recursos Humanos</option>
                            <option value="contabilidad">Contabilidad</option>
                            <option value="administracion">Administración</option>
                            <option value="tecnologia">Tecnología</option>
                          </select>
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-group">
                      <label for="telefono">Teléfono</label>
                      <input type="tel" class="form-control" id="telefono" placeholder="+1 234 567 8900">
                    </div>
                    
                    <div class="form-group">
                      <label for="observaciones">Observaciones</label>
                      <textarea class="form-control" id="observaciones" rows="3" placeholder="Información adicional sobre el usuario"></textarea>
                    </div>
                    
                    <div class="form-group">
                      <div class="form-check">
                        <input type="checkbox" class="form-check-input" id="activo" checked>
                        <label class="form-check-label" for="activo">
                          Usuario activo
                        </label>
                      </div>
                    </div>
                  </form>
                </div>
                <div class="card-footer">
                  <button type="button" class="btn btn-primary">
                    <i class="fas fa-save mr-2"></i>
                    Crear Usuario
                  </button>
                  <a [routerLink]="['/admin-menu-management/users']" class="btn btn-secondary ml-2">
                    <i class="fas fa-arrow-left mr-2"></i>
                    Cancelar
                  </a>
                </div>
              </div>
            </div>
            
            <div class="col-md-4">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-info-circle mr-2"></i>
                    Información
                  </h3>
                </div>
                <div class="card-body">
                  <div class="alert alert-info">
                    <h5><i class="icon fas fa-info"></i> Campos Requeridos</h5>
                    <ul class="mb-0">
                      <li>Nombre Completo</li>
                      <li>Correo Electrónico</li>
                      <li>Nombre de Usuario</li>
                      <li>Contraseña</li>
                      <li>Rol</li>
                    </ul>
                  </div>
                  
                  <div class="alert alert-warning">
                    <h5><i class="icon fas fa-exclamation-triangle"></i> Consideraciones</h5>
                    <ul class="mb-0">
                      <li>La contraseña debe tener mínimo 8 caracteres</li>
                      <li>El correo debe ser único en el sistema</li>
                      <li>El nombre de usuario no puede contener espacios</li>
                      <li>Se enviará un email de bienvenida al usuario</li>
                    </ul>
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
    .alert {
      border-radius: 6px;
    }
  `]
})
export class UserCreateComponent implements OnInit {

  ngOnInit(): void {
    console.log('👤 UserCreateComponent inicializado');
    console.log('📝 Formulario de creación de usuario listo');
  }
}
