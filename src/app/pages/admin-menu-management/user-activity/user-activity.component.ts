import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-user-activity',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">📊 Actividad de Usuarios</h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a href="#">Inicio</a></li>
                <li class="breadcrumb-item"><a href="#">Administración</a></li>
                <li class="breadcrumb-item"><a [routerLink]="['/admin-menu-management/users']">Gestor de Usuarios</a></li>
                <li class="breadcrumb-item active">Actividad de Usuarios</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <!-- Filtros -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-filter mr-2"></i>
                    Filtros de Búsqueda
                  </h3>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-3">
                      <div class="form-group">
                        <label for="usuario">Usuario</label>
                        <select class="form-control" id="usuario">
                          <option value="">Todos los usuarios</option>
                          <option value="1">Juan Pérez</option>
                          <option value="2">María García</option>
                          <option value="3">Carlos López</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group">
                        <label for="accion">Tipo de Acción</label>
                        <select class="form-control" id="accion">
                          <option value="">Todas las acciones</option>
                          <option value="login">Inicio de Sesión</option>
                          <option value="logout">Cierre de Sesión</option>
                          <option value="create">Creación</option>
                          <option value="update">Actualización</option>
                          <option value="delete">Eliminación</option>
                        </select>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group">
                        <label for="fechaInicio">Fecha Inicio</label>
                        <input type="date" class="form-control" id="fechaInicio">
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="form-group">
                        <label for="fechaFin">Fecha Fin</label>
                        <input type="date" class="form-control" id="fechaFin">
                      </div>
                    </div>
                  </div>
                  <div class="row">
                    <div class="col-12">
                      <button type="button" class="btn btn-primary">
                        <i class="fas fa-search mr-2"></i>
                        Buscar
                      </button>
                      <button type="button" class="btn btn-secondary ml-2">
                        <i class="fas fa-download mr-2"></i>
                        Exportar
                      </button>
                      <button type="button" class="btn btn-warning ml-2">
                        <i class="fas fa-refresh mr-2"></i>
                        Actualizar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Estadísticas -->
          <div class="row">
            <div class="col-lg-3 col-6">
              <div class="small-box bg-info">
                <div class="inner">
                  <h3>1,245</h3>
                  <p>Acciones Hoy</p>
                </div>
                <div class="icon">
                  <i class="fas fa-chart-line"></i>
                </div>
                <a href="#" class="small-box-footer">
                  Más información <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            
            <div class="col-lg-3 col-6">
              <div class="small-box bg-success">
                <div class="inner">
                  <h3>89</h3>
                  <p>Usuarios Activos</p>
                </div>
                <div class="icon">
                  <i class="fas fa-users"></i>
                </div>
                <a href="#" class="small-box-footer">
                  Más información <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            
            <div class="col-lg-3 col-6">
              <div class="small-box bg-warning">
                <div class="inner">
                  <h3>12</h3>
                  <p>Acciones Fallidas</p>
                </div>
                <div class="icon">
                  <i class="fas fa-exclamation-triangle"></i>
                </div>
                <a href="#" class="small-box-footer">
                  Más información <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
            
            <div class="col-lg-3 col-6">
              <div class="small-box bg-danger">
                <div class="inner">
                  <h3>3</h3>
                  <p>Alertas de Seguridad</p>
                </div>
                <div class="icon">
                  <i class="fas fa-shield-alt"></i>
                </div>
                <a href="#" class="small-box-footer">
                  Más información <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <!-- Tabla de Actividad -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-list mr-2"></i>
                    Registro de Actividad
                  </h3>
                </div>
                <div class="card-body">
                  <div class="table-responsive">
                    <table class="table table-bordered table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Usuario</th>
                          <th>Acción</th>
                          <th>Módulo</th>
                          <th>IP</th>
                          <th>Fecha/Hora</th>
                          <th>Estado</th>
                          <th>Detalles</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>1001</td>
                          <td>Juan Pérez</td>
                          <td><span class="badge badge-success">Login</span></td>
                          <td>Autenticación</td>
                          <td>192.168.1.100</td>
                          <td>2024-01-20 14:30:25</td>
                          <td><span class="badge badge-success">Exitoso</span></td>
                          <td>
                            <button class="btn btn-sm btn-info" data-toggle="modal" data-target="#modalDetalles">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>1002</td>
                          <td>María García</td>
                          <td><span class="badge badge-primary">Crear</span></td>
                          <td>Documentos</td>
                          <td>192.168.1.101</td>
                          <td>2024-01-20 14:25:10</td>
                          <td><span class="badge badge-success">Exitoso</span></td>
                          <td>
                            <button class="btn btn-sm btn-info" data-toggle="modal" data-target="#modalDetalles">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>1003</td>
                          <td>Carlos López</td>
                          <td><span class="badge badge-warning">Actualizar</span></td>
                          <td>Usuarios</td>
                          <td>192.168.1.102</td>
                          <td>2024-01-20 14:20:45</td>
                          <td><span class="badge badge-success">Exitoso</span></td>
                          <td>
                            <button class="btn btn-sm btn-info" data-toggle="modal" data-target="#modalDetalles">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>1004</td>
                          <td>Usuario Desconocido</td>
                          <td><span class="badge badge-danger">Login</span></td>
                          <td>Autenticación</td>
                          <td>192.168.1.200</td>
                          <td>2024-01-20 14:15:30</td>
                          <td><span class="badge badge-danger">Fallido</span></td>
                          <td>
                            <button class="btn btn-sm btn-info" data-toggle="modal" data-target="#modalDetalles">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                        <tr>
                          <td>1005</td>
                          <td>Ana Martínez</td>
                          <td><span class="badge badge-info">Eliminar</span></td>
                          <td>Tickets</td>
                          <td>192.168.1.103</td>
                          <td>2024-01-20 14:10:15</td>
                          <td><span class="badge badge-success">Exitoso</span></td>
                          <td>
                            <button class="btn btn-sm btn-info" data-toggle="modal" data-target="#modalDetalles">
                              <i class="fas fa-eye"></i>
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                <div class="card-footer">
                  <nav aria-label="Navegación de páginas">
                    <ul class="pagination justify-content-center">
                      <li class="page-item disabled">
                        <a class="page-link" href="#" tabindex="-1">Anterior</a>
                      </li>
                      <li class="page-item active"><a class="page-link" href="#">1</a></li>
                      <li class="page-item"><a class="page-link" href="#">2</a></li>
                      <li class="page-item"><a class="page-link" href="#">3</a></li>
                      <li class="page-item">
                        <a class="page-link" href="#">Siguiente</a>
                      </li>
                    </ul>
                  </nav>
                </div>
              </div>
            </div>
          </div>

          <!-- Alertas de Seguridad -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Alertas de Seguridad
                  </h3>
                </div>
                <div class="card-body">
                  <div class="alert alert-danger">
                    <h5><i class="icon fas fa-ban"></i> Intento de Acceso No Autorizado</h5>
                    <strong>IP:</strong> 192.168.1.200<br>
                    <strong>Usuario:</strong> usuario_desconocido<br>
                    <strong>Fecha:</strong> 2024-01-20 14:15:30<br>
                    <strong>Acción:</strong> Múltiples intentos de login fallidos
                  </div>
                  
                  <div class="alert alert-warning">
                    <h5><i class="icon fas fa-exclamation-triangle"></i> Acceso desde IP Externa</h5>
                    <strong>IP:</strong> 203.0.113.45<br>
                    <strong>Usuario:</strong> Juan Pérez<br>
                    <strong>Fecha:</strong> 2024-01-20 13:45:20<br>
                    <strong>Acción:</strong> Login desde ubicación no habitual
                  </div>
                  
                  <div class="alert alert-info">
                    <h5><i class="icon fas fa-info"></i> Actividad Inusual</h5>
                    <strong>Usuario:</strong> María García<br>
                    <strong>Fecha:</strong> 2024-01-20 12:30:15<br>
                    <strong>Acción:</strong> Acceso a múltiples módulos en corto tiempo
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
    .small-box {
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .table th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    .alert {
      border-radius: 6px;
    }
    .pagination {
      border-radius: 6px;
    }
  `]
})
export class UserActivityComponent implements OnInit {

  ngOnInit(): void {
    console.log('📊 UserActivityComponent inicializado');
    console.log('📈 Monitoreo de actividad funcionando correctamente');
  }
}
