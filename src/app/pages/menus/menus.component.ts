import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MenusService, SistemaExterno, SistemaMenu, RolMenu } from '../../services/menus.service';
import { RolesService, Role } from '../../services/roles.service';

@Component({
  selector: 'app-menus',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="content-header">
      <div class="container-fluid">
        <div class="row mb-2">
          <div class="col-sm-6">
            <h1 class="m-0">Gestión de Menús</h1>
          </div>
          <div class="col-sm-6">
            <ol class="breadcrumb float-sm-right">
              <li class="breadcrumb-item"><a href="#">Inicio</a></li>
              <li class="breadcrumb-item active">Gestión de Menús</li>
            </ol>
          </div>
        </div>
      </div>
    </div>

    <section class="content">
      <div class="container-fluid">
        <!-- Estadísticas -->
        <div class="row">
          <div class="col-lg-3 col-6">
            <div class="small-box bg-info">
              <div class="inner">
                <h3>{{ estadisticas.totalSistemas }}</h3>
                <p>Sistemas Externos</p>
              </div>
              <div class="icon">
                <i class="fas fa-cogs"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-success">
              <div class="inner">
                <h3>{{ estadisticas.totalMenus }}</h3>
                <p>Total de Menús</p>
              </div>
              <div class="icon">
                <i class="fas fa-list"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-warning">
              <div class="inner">
                <h3>{{ estadisticas.menusActivos }}</h3>
                <p>Menús Activos</p>
              </div>
              <div class="icon">
                <i class="fas fa-check-circle"></i>
              </div>
            </div>
          </div>
          
          <div class="col-lg-3 col-6">
            <div class="small-box bg-danger">
              <div class="inner">
                <h3>{{ estadisticas.totalAccesos }}</h3>
                <p>Accesos Configurados</p>
              </div>
              <div class="icon">
                <i class="fas fa-key"></i>
              </div>
            </div>
          </div>
        </div>

        <div class="row">
          <!-- Sistemas Externos -->
          <div class="col-md-6">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Sistemas Externos</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-primary btn-sm" (click)="openSistemaModal()">
                    <i class="fas fa-plus"></i> Nuevo Sistema
                  </button>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table m-0">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>Estado</th>
                        <th>Menús</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let sistema of sistemasExternos">
                        <td>
                          <i [class]="sistema.icono || 'fas fa-cogs'" class="mr-2"></i>
                          {{ sistema.nombre }}
                        </td>
                        <td>
                          <span class="badge" [class]="sistema.activo ? 'badge-success' : 'badge-danger'">
                            {{ sistema.activo ? 'Activo' : 'Inactivo' }}
                          </span>
                        </td>
                        <td>
                          <span class="badge badge-info">{{ sistema.menus?.length || 0 }}</span>
                        </td>
                        <td>
                          <button class="btn btn-sm btn-info mr-1" (click)="verMenus(sistema)">
                            <i class="fas fa-list"></i>
                          </button>
                          <button class="btn btn-sm btn-warning mr-1" (click)="editarSistema(sistema)">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" (click)="eliminarSistema(sistema)">
                            <i class="fas fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <!-- Menús del Sistema Seleccionado -->
          <div class="col-md-6" *ngIf="sistemaSeleccionado">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">Menús de {{ sistemaSeleccionado.nombre }}</h3>
                <div class="card-tools">
                  <button type="button" class="btn btn-success btn-sm" (click)="openMenuModal()">
                    <i class="fas fa-plus"></i> Nuevo Menú
                  </button>
                </div>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table m-0">
                    <thead>
                      <tr>
                        <th>Nombre</th>
                        <th>URL</th>
                        <th>Orden</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let menu of menusSistema">
                        <td>
                          <i [class]="menu.icono || 'fas fa-link'" class="mr-2"></i>
                          {{ menu.nombre }}
                        </td>
                        <td>{{ menu.url }}</td>
                        <td>{{ menu.orden }}</td>
                        <td>
                          <span class="badge" [class]="menu.activo ? 'badge-success' : 'badge-danger'">
                            {{ menu.activo ? 'Activo' : 'Inactivo' }}
                          </span>
                        </td>
                        <td>
                          <button class="btn btn-sm btn-info mr-1" (click)="gestionarAccesos(menu)">
                            <i class="fas fa-key"></i>
                          </button>
                          <button class="btn btn-sm btn-warning mr-1" (click)="editarMenu(menu)">
                            <i class="fas fa-edit"></i>
                          </button>
                          <button class="btn btn-sm btn-danger" (click)="eliminarMenu(menu)">
                            <i class="fas fa-trash"></i>
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
  `,
  styles: [`
    .content-header {
      padding: 15px 0.5rem;
      background: #f4f6f9;
      border-bottom: 1px solid #dee2e6;
    }
    
    .small-box {
      border-radius: 0.25rem;
      box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
      position: relative;
      display: block;
      margin-bottom: 20px;
      
      .inner {
        padding: 20px;
        
        h3 {
          font-size: 2.2rem;
          font-weight: 700;
          margin: 0 0 10px 0;
          white-space: nowrap;
          padding: 0;
          color: #fff;
        }
        
        p {
          margin-bottom: 0;
          color: #fff;
        }
      }
      
      .icon {
        color: rgba(0,0,0,.15);
        z-index: 0;
        
        i {
          font-size: 70px;
          position: absolute;
          right: 15px;
          top: 15px;
          transition: transform .3s linear;
        }
      }
      
      &:hover .icon > i {
        transform: scale(1.1);
      }
    }
    
    .bg-info { background-color: #17a2b8 !important; }
    .bg-success { background-color: #28a745 !important; }
    .bg-warning { background-color: #ffc107 !important; }
    .bg-danger { background-color: #dc3545 !important; }
    
    .card {
      box-shadow: 0 0 1px rgba(0,0,0,.125), 0 1px 3px rgba(0,0,0,.2);
      margin-bottom: 20px;
      
      .card-header {
        background-color: rgba(0,0,0,.03);
        border-bottom: 1px solid rgba(0,0,0,.125);
        padding: 0.75rem 1.25rem;
        
        .card-title {
          margin-bottom: 0;
          color: #495057;
          font-size: 1.1rem;
          font-weight: 400;
        }
        
        .card-tools {
          float: right;
        }
      }
      
      .card-body {
        padding: 1.25rem;
        
        &.p-0 {
          padding: 0;
        }
      }
    }
    
    .table {
      margin-bottom: 0;
      
      th, td {
        border-top: 1px solid #dee2e6;
        padding: 0.75rem;
        vertical-align: top;
      }
      
      thead th {
        border-bottom: 2px solid #dee2e6;
        font-weight: 600;
        color: #495057;
      }
    }
    
    .badge {
      display: inline-block;
      padding: 0.25em 0.4em;
      font-size: 75%;
      font-weight: 700;
      line-height: 1;
      text-align: center;
      white-space: nowrap;
      vertical-align: baseline;
      border-radius: 0.25rem;
      
      &.badge-success { background-color: #28a745; color: #fff; }
      &.badge-danger { background-color: #dc3545; color: #fff; }
      &.badge-info { background-color: #17a2b8; color: #fff; }
      &.badge-warning { background-color: #ffc107; color: #212529; }
    }
    
    .btn {
      display: inline-block;
      font-weight: 400;
      text-align: center;
      vertical-align: middle;
      user-select: none;
      border: 1px solid transparent;
      padding: 0.375rem 0.75rem;
      font-size: 1rem;
      line-height: 1.5;
      border-radius: 0.25rem;
      transition: color .15s ease-in-out,background-color .15s ease-in-out,border-color .15s ease-in-out,box-shadow .15s ease-in-out;
      text-decoration: none;
      
      &.btn-sm {
        padding: 0.25rem 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
        border-radius: 0.2rem;
      }
      
      &.btn-primary { background-color: #007bff; border-color: #007bff; color: #fff; }
      &.btn-success { background-color: #28a745; border-color: #28a745; color: #fff; }
      &.btn-warning { background-color: #ffc107; border-color: #ffc107; color: #212529; }
      &.btn-danger { background-color: #dc3545; border-color: #dc3545; color: #fff; }
      &.btn-info { background-color: #17a2b8; border-color: #17a2b8; color: #fff; }
    }
  `]
})
export class MenusComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos
  sistemasExternos: SistemaExterno[] = [];
  menusSistema: SistemaMenu[] = [];
  roles: Role[] = [];

  // Estados
  loading = false;
  sistemaSeleccionado: SistemaExterno | null = null;

  // Estadísticas
  estadisticas = {
    totalSistemas: 0,
    totalMenus: 0,
    menusActivos: 0,
    totalAccesos: 0
  };

  constructor(
    private menusService: MenusService,
    private rolesService: RolesService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarDatos(): void {
    this.loading = true;
    
    // Cargar sistemas externos
    this.menusService.getSistemasExternos()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.sistemasExternos = response.data;
          this.calcularEstadisticas();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error cargando sistemas externos:', error);
          this.loading = false;
        }
      });

    // Cargar roles
    this.rolesService.getRoles()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.roles = response.data;
        },
        error: (error) => {
          console.error('Error cargando roles:', error);
        }
      });
  }

  calcularEstadisticas(): void {
    this.estadisticas.totalSistemas = this.sistemasExternos.length;
    this.estadisticas.totalMenus = this.sistemasExternos.reduce((total, sistema) => 
      total + (sistema.menus?.length || 0), 0);
    this.estadisticas.menusActivos = this.sistemasExternos.reduce((total, sistema) => 
      total + (sistema.menus?.filter(m => m.activo)?.length || 0), 0);
    this.estadisticas.totalAccesos = 0;
  }

  // Métodos básicos para la funcionalidad
  openSistemaModal(): void {
    // Implementar modal para crear sistema
    console.log('Abrir modal sistema');
  }

  verMenus(sistema: SistemaExterno): void {
    this.sistemaSeleccionado = sistema;
    this.menusSistema = sistema.menus || [];
  }

  openMenuModal(): void {
    // Implementar modal para crear menú
    console.log('Abrir modal menú');
  }

  editarSistema(sistema: SistemaExterno): void {
    // Implementar edición de sistema
    console.log('Editar sistema:', sistema);
  }

  eliminarSistema(sistema: SistemaExterno): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el sistema "${sistema.nombre}"?`)) {
      this.loading = true;
      this.menusService.deleteSistemaExterno(sistema.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error eliminando sistema:', error);
            this.loading = false;
          }
        });
    }
  }

  editarMenu(menu: SistemaMenu): void {
    // Implementar edición de menú
    console.log('Editar menú:', menu);
  }

  eliminarMenu(menu: SistemaMenu): void {
    if (confirm(`¿Estás seguro de que quieres eliminar el menú "${menu.nombre}"?`)) {
      this.loading = true;
      this.menusService.deleteMenu(this.sistemaSeleccionado!.id, menu.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.verMenus(this.sistemaSeleccionado!);
            this.cargarDatos();
          },
          error: (error) => {
            console.error('Error eliminando menú:', error);
            this.loading = false;
          }
        });
    }
  }

  gestionarAccesos(menu: SistemaMenu): void {
    // Implementar gestión de accesos
    console.log('Gestionar accesos para:', menu);
  }
}
