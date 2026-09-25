import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Renderer2, AfterViewInit } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';

declare var $: any;

@Component({
  selector: 'app-working-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule],
  template: `
    <!-- AdminLTE 3.2.0 Layout Structure -->
    <div class="wrapper">
      <!-- Navbar -->
      <nav class="main-header navbar navbar-expand navbar-white navbar-light">
        <ul class="navbar-nav">
          <li class="nav-item">
            <a class="nav-link" data-widget="pushmenu" href="#" role="button">
              <i class="fas fa-bars"></i>
            </a>
          </li>
          <li class="nav-item d-none d-sm-inline-block">
            <a [routerLink]="['/dashboard']" class="nav-link" routerLinkActive="active">Inicio</a>
          </li>
        </ul>
        <ul class="navbar-nav ml-auto">
          <li class="nav-item dropdown">
            <a class="nav-link" data-toggle="dropdown" href="#">
              <img src="assets/img/user1-128x128.jpg" alt="User Avatar" class="img-size-32 img-circle mr-2">
              <span class="d-none d-md-inline">Usuario Administrador</span>
            </a>
          </li>
        </ul>
      </nav>

      <!-- Main Sidebar Container -->
      <aside class="main-sidebar sidebar-dark-primary elevation-4">
        <!-- Brand Logo -->
        <a [routerLink]="['/dashboard']" class="brand-link">
          <img src="assets/img/municipio-logo.png" alt="Municipio Logo" class="brand-image img-circle elevation-3" style="opacity: .8">
          <span class="brand-text font-weight-light"><b>Intranet</b> Notaria</span>
        </a>

        <!-- Sidebar -->
        <div class="sidebar">
          <!-- Sidebar user panel -->
          <div class="user-panel mt-3 pb-3 mb-3 d-flex">
            <div class="image">
              <img src="assets/img/user1-128x128.jpg" class="img-circle elevation-2" alt="User Image">
            </div>
            <div class="info">
              <a href="#" class="d-block">Usuario Administrador</a>
              <small class="text-muted">Administrador del Sistema</small>
            </div>
          </div>

          <!-- Sidebar Menu -->
          <nav class="mt-2">
            <ul class="nav nav-pills nav-sidebar flex-column" data-widget="treeview" role="menu" data-accordion="false">
              
              <!-- Dashboard -->
              <li class="nav-item">
                <a [routerLink]="['/dashboard']" class="nav-link" routerLinkActive="active">
                  <i class="nav-icon fas fa-tachometer-alt"></i>
                  <p>Dashboard</p>
                </a>
              </li>

              <!-- Separador -->
              <li class="nav-header">ADMINISTRACIÓN</li>

              <!-- Administrador de Menús Dinámicos -->
              <li class="nav-item has-treeview menu-open">
                <a href="#" class="nav-link active">
                  <i class="nav-icon fas fa-sitemap"></i>
                  <p>
                    Administrador de Menús
                    <i class="fas fa-angle-left right"></i>
                  </p>
                </a>
                <ul class="nav nav-treeview" style="display: block;">
                  <!-- Gestión de Menús -->
                  <li class="nav-item has-treeview">
                    <a href="#" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>
                        Gestión de Menús
                        <i class="fas fa-angle-left right"></i>
                      </p>
                    </a>
                    <ul class="nav nav-treeview">
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menus" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Lista de Menús</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menus/create" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Crear Menú</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menus/hierarchy" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Jerarquía</p>
                        </a>
                      </li>
                    </ul>
                  </li>

                  <!-- Gestión de Permisos -->
                  <li class="nav-item has-treeview">
                    <a href="#" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>
                        Permisos y Roles
                        <i class="fas fa-angle-left right"></i>
                      </p>
                    </a>
                    <ul class="nav nav-treeview">
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/role-menus" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Permisos por Rol</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/role-menus/permissions/1" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Configurar Permisos</p>
                        </a>
                      </li>
                    </ul>
                  </li>

                  <!-- Gestión Avanzada -->
                  <li class="nav-item has-treeview">
                    <a href="#" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>
                        Gestión Avanzada
                        <i class="fas fa-angle-left right"></i>
                      </p>
                    </a>
                    <ul class="nav nav-treeview">
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-management" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Panel Principal</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-management/role-accesses" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Accesos por Rol</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-management/system-menus" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Menús del Sistema</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-management/external-systems" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Sistemas Externos</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-management/statistics" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Estadísticas</p>
                        </a>
                      </li>
                    </ul>
                  </li>

                  <!-- Herramientas de Sistema -->
                  <li class="nav-item has-treeview">
                    <a href="#" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>
                        Herramientas
                        <i class="fas fa-angle-left right"></i>
                      </p>
                    </a>
                    <ul class="nav nav-treeview">
                      <li class="nav-item">
                        <a href="http://localhost:8000/admin/menu-system-tools" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Panel de Herramientas</p>
                        </a>
                      </li>
                      <li class="nav-item">
                        <a href="http://localhost:8000/test-menu" target="_blank" class="nav-link">
                          <i class="far fa-dot-circle nav-icon"></i>
                          <p>Información Debug</p>
                        </a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </li>

              <!-- Separador -->
              <li class="nav-header">SISTEMA</li>

              <!-- Scripts de Inicio Rápido -->
              <li class="nav-item has-treeview">
                <a href="#" class="nav-link">
                  <i class="nav-icon fas fa-rocket"></i>
                  <p>
                    Inicio Rápido
                    <i class="fas fa-angle-left right"></i>
                  </p>
                </a>
                <ul class="nav nav-treeview">
                  <li class="nav-item">
                    <a href="http://localhost:8000/download/start-project.bat" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>Descargar .bat</p>
                    </a>
                  </li>
                  <li class="nav-item">
                    <a href="http://localhost:8000/download/start-project.ps1" class="nav-link">
                      <i class="far fa-circle nav-icon"></i>
                      <p>Descargar .ps1</p>
                    </a>
                  </li>
                </ul>
              </li>

              <!-- Estado del Sistema -->
              <li class="nav-item">
                <a href="#" class="nav-link">
                  <i class="nav-icon fas fa-info-circle"></i>
                  <p>Estado: ✅ Funcionando</p>
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </aside>

      <!-- Content Wrapper -->
      <div class="content-wrapper">
        <router-outlet></router-outlet>
      </div>

      <!-- Main Footer -->
      <footer class="main-footer">
        <strong>Copyright &copy; {{ currentYear }} <a href="#">Notaria</a>.</strong>
        Todos los derechos reservados.
        <div class="float-right d-none d-sm-inline-block">
          <b>Versión</b> 1.0.0
        </div>
      </footer>
    </div>
  `,
  styleUrl: './working-layout.component.scss'
})
export class WorkingLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  currentYear = new Date().getFullYear();

  constructor(
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.applyAdminLTEClasses();
    console.log('WorkingLayoutComponent inicializado');
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      setTimeout(() => {
        this.initializeAdminLTE();
      }, 500);
    }
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private applyAdminLTEClasses(): void {
    if (isPlatformBrowser(this.platformId)) {
      const body = this.document.body;
      body.className = '';
      
      const classes = [
        'hold-transition',
        'sidebar-mini',
        'layout-fixed',
        'layout-navbar-fixed',
        'layout-footer-fixed'
      ];
      
      classes.forEach(className => {
        this.renderer.addClass(body, className);
      });
    }
  }

  private initializeAdminLTE(): void {
    if (isPlatformBrowser(this.platformId) && typeof $ !== 'undefined') {
      try {
        if ($.fn.PushMenu) {
          $('[data-widget="pushmenu"]').PushMenu();
        }
        if ($.fn.Treeview) {
          $('[data-widget="treeview"]').Treeview();
        }
        console.log('AdminLTE inicializado correctamente en WorkingLayout');
      } catch (error) {
        console.error('Error initializing AdminLTE:', error);
      }
    }
  }
}
