import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">
                <i class="fas fa-sitemap"></i> Administrador de Menús Dinámicos
              </h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a href="#">Inicio</a></li>
                <li class="breadcrumb-item active">Administrador de Menús</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div class="content">
        <div class="container-fluid">
          <!-- Estadísticas del Sistema -->
          <div class="row">
            <div class="col-lg-3 col-6">
              <div class="small-box bg-info">
                <div class="inner">
                  <h3>18</h3>
                  <p>Total de Menús</p>
                </div>
                <div class="icon">
                  <i class="fas fa-bars"></i>
                </div>
                <a href="http://localhost:8000/admin/menus" target="_blank" class="small-box-footer">
                  Ver detalles <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>

            <div class="col-lg-3 col-6">
              <div class="small-box bg-success">
                <div class="inner">
                  <h3>18</h3>
                  <p>Menús Activos</p>
                </div>
                <div class="icon">
                  <i class="fas fa-eye"></i>
                </div>
                <a href="http://localhost:8000/admin/menus" target="_blank" class="small-box-footer">
                  Ver detalles <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>

            <div class="col-lg-3 col-6">
              <div class="small-box bg-warning">
                <div class="inner">
                  <h3>4</h3>
                  <p>Roles del Sistema</p>
                </div>
                <div class="icon">
                  <i class="fas fa-users"></i>
                </div>
                <a href="http://localhost:8000/admin/role-menus" target="_blank" class="small-box-footer">
                  Ver detalles <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>

            <div class="col-lg-3 col-6">
              <div class="small-box bg-danger">
                <div class="inner">
                  <h3>3</h3>
                  <p>Módulos con Menús</p>
                </div>
                <div class="icon">
                  <i class="fas fa-cubes"></i>
                </div>
                <a href="http://localhost:8000/admin/menu-management/system-menus" target="_blank" class="small-box-footer">
                  Ver detalles <i class="fas fa-arrow-circle-right"></i>
                </a>
              </div>
            </div>
          </div>

          <!-- Acciones Rápidas -->
          <div class="row">
            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-bolt"></i> Acciones Rápidas
                  </h3>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <a href="http://localhost:8000/admin/menus/create" target="_blank" class="btn btn-success btn-block mb-2">
                        <i class="fas fa-plus"></i> Crear Menú
                      </a>
                      <a href="http://localhost:8000/admin/menus/hierarchy" target="_blank" class="btn btn-primary btn-block mb-2">
                        <i class="fas fa-sitemap"></i> Ver Jerarquía
                      </a>
                      <a href="http://localhost:8000/admin/role-menus" target="_blank" class="btn btn-warning btn-block mb-2">
                        <i class="fas fa-shield-alt"></i> Gestionar Permisos
                      </a>
                    </div>
                    <div class="col-md-6">
                      <a href="http://localhost:8000/admin/menu-system-tools" target="_blank" class="btn btn-info btn-block mb-2">
                        <i class="fas fa-tools"></i> Herramientas
                      </a>
                      <a href="http://localhost:8000/admin/menu-management" target="_blank" class="btn btn-secondary btn-block mb-2">
                        <i class="fas fa-cogs"></i> Panel Avanzado
                      </a>
                      <a href="http://localhost:8000/test-menu" target="_blank" class="btn btn-dark btn-block mb-2">
                        <i class="fas fa-bug"></i> Debug Info
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="col-md-6">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-info-circle"></i> Información del Sistema
                  </h3>
                </div>
                <div class="card-body">
                  <h5>Estado del Sistema:</h5>
                  <ul>
                    <li>✅ Backend Laravel funcionando</li>
                    <li>✅ Frontend Angular funcionando</li>
                    <li>✅ Base de datos configurada</li>
                    <li>✅ Menús dinámicos activos</li>
                    <li>✅ Permisos configurados</li>
                  </ul>
                  
                  <h5 class="mt-3">URLs del Backend:</h5>
                  <ul>
                    <li><a href="http://localhost:8000/admin/menus" target="_blank">Gestión de Menús</a></li>
                    <li><a href="http://localhost:8000/admin/role-menus" target="_blank">Permisos por Rol</a></li>
                    <li><a href="http://localhost:8000/admin/menu-system-tools" target="_blank">Herramientas del Sistema</a></li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Instrucciones -->
          <div class="row">
            <div class="col-12">
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <i class="fas fa-book"></i> Instrucciones de Uso
                  </h3>
                </div>
                <div class="card-body">
                  <div class="row">
                    <div class="col-md-6">
                      <h5>🎯 Cómo usar el Administrador:</h5>
                      <ol>
                        <li>Haz clic en cualquier botón de arriba</li>
                        <li>Se abrirá el backend en nueva pestaña</li>
                        <li>Inicia sesión con los usuarios de prueba</li>
                        <li>Gestiona menús y permisos</li>
                      </ol>
                    </div>
                    <div class="col-md-6">
                      <h5>👥 Usuarios de Prueba:</h5>
                      <ul>
                        <li><strong>Admin:</strong> admin@municipio.gob.pe / admin123</li>
                        <li><strong>Test:</strong> test@admin.com / password123</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class AdminDashboardComponent {
  constructor() {
    console.log('AdminDashboardComponent inicializado');
  }
}
