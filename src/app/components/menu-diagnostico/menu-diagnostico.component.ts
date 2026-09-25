import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { MenuService } from '../../services/menu.service';
import { AuthService } from '../../services/auth.service';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-menu-diagnostico',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="container-fluid mt-4">
      <div class="row">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h3 class="card-title">🔧 Diagnóstico del Menú de Planillas</h3>
            </div>
            <div class="card-body">
              
              <!-- Botones de acción -->
              <div class="mb-4">
                <button class="btn btn-primary me-2" (click)="diagnosticarCompleto()">
                  🔍 Diagnóstico Completo
                </button>
                <button class="btn btn-warning me-2" (click)="limpiarCacheYRecargar()">
                  🗑️ Limpiar Cache y Recargar
                </button>
                <button class="btn btn-success me-2" (click)="forzarRecargaMenu()">
                  🔄 Forzar Recarga del Menú
                </button>
                <button class="btn btn-info" (click)="verificarAPI()">
                  🌐 Verificar API
                </button>
              </div>

              <!-- Resultados del diagnóstico -->
              <div class="row">
                
                <!-- Estado del Usuario -->
                <div class="col-md-6">
                  <div class="card bg-light">
                    <div class="card-header">
                      <h5>👤 Estado del Usuario</h5>
                    </div>
                    <div class="card-body">
                      <div *ngIf="estadoUsuario">
                        <p><strong>Logueado:</strong> 
                          <span [class]="estadoUsuario.isLoggedIn ? 'text-success' : 'text-danger'">
                            {{ estadoUsuario.isLoggedIn ? 'Sí' : 'No' }}
                          </span>
                        </p>
                        <p><strong>Usuario:</strong> {{ estadoUsuario.user?.name || 'No encontrado' }}</p>
                        <p><strong>Token:</strong> 
                          <span [class]="estadoUsuario.hasToken ? 'text-success' : 'text-danger'">
                            {{ estadoUsuario.hasToken ? 'Presente' : 'Ausente' }}
                          </span>
                        </p>
                        <p><strong>Permisos:</strong> {{ estadoUsuario.permissions?.length || 0 }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Estado del Menú -->
                <div class="col-md-6">
                  <div class="card bg-light">
                    <div class="card-header">
                      <h5>📋 Estado del Menú</h5>
                    </div>
                    <div class="card-body">
                      <div *ngIf="estadoMenu">
                        <p><strong>Total de menús:</strong> {{ estadoMenu.totalMenus }}</p>
                        <p><strong>Menú Planillas:</strong> 
                          <span [class]="estadoMenu.planillasEncontrado ? 'text-success' : 'text-danger'">
                            {{ estadoMenu.planillasEncontrado ? 'Encontrado' : 'No encontrado' }}
                          </span>
                        </p>
                        <p><strong>Submenús Planillas:</strong> {{ estadoMenu.submenusPlanillas }}</p>
                        <p><strong>Última actualización:</strong> {{ estadoMenu.ultimaActualizacion | date:'medium' }}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Respuesta del API -->
                <div class="col-12 mt-3">
                  <div class="card bg-light">
                    <div class="card-header">
                      <h5>🌐 Respuesta del API</h5>
                    </div>
                    <div class="card-body">
                      <div *ngIf="respuestaAPI">
                        <p><strong>Estado:</strong> 
                          <span [class]="respuestaAPI.success ? 'text-success' : 'text-danger'">
                            {{ respuestaAPI.success ? 'Exitoso' : 'Error' }}
                          </span>
                        </p>
                        <div *ngIf="respuestaAPI.planillasData">
                          <h6>Datos de Planillas del API:</h6>
                          <pre class="bg-dark text-light p-2 rounded">{{ respuestaAPI.planillasData | json }}</pre>
                        </div>
                        <div *ngIf="respuestaAPI.error">
                          <p class="text-danger"><strong>Error:</strong> {{ respuestaAPI.error }}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Log de diagnóstico -->
                <div class="col-12 mt-3">
                  <div class="card bg-light">
                    <div class="card-header">
                      <h5>📝 Log de Diagnóstico</h5>
                      <button class="btn btn-sm btn-secondary float-end" (click)="limpiarLog()">
                        Limpiar Log
                      </button>
                    </div>
                    <div class="card-body">
                      <div class="log-container" style="max-height: 300px; overflow-y: auto;">
                        <div *ngFor="let entrada of logDiagnostico" 
                             [class]="'log-entry ' + entrada.tipo"
                             style="margin-bottom: 5px; padding: 5px; border-radius: 3px;"
                             [ngClass]="{
                               'bg-success text-white': entrada.tipo === 'success',
                               'bg-danger text-white': entrada.tipo === 'error',
                               'bg-warning text-dark': entrada.tipo === 'warning',
                               'bg-info text-white': entrada.tipo === 'info'
                             }">
                          <small>{{ entrada.timestamp | date:'HH:mm:ss' }}</small> - {{ entrada.mensaje }}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MenuDiagnosticoComponent implements OnInit {
  
  estadoUsuario: any = null;
  estadoMenu: any = null;
  respuestaAPI: any = null;
  logDiagnostico: Array<{timestamp: Date, mensaje: string, tipo: string}> = [];

  constructor(
    private menuService: MenuService,
    private authService: AuthService,
    private http: HttpClient,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.agregarLog('Componente de diagnóstico inicializado', 'info');
  }

  private agregarLog(mensaje: string, tipo: 'success' | 'error' | 'warning' | 'info' = 'info') {
    this.logDiagnostico.unshift({
      timestamp: new Date(),
      mensaje,
      tipo
    });
    
    // Mantener solo los últimos 50 logs
    if (this.logDiagnostico.length > 50) {
      this.logDiagnostico = this.logDiagnostico.slice(0, 50);
    }
    
    console.log(`[${tipo.toUpperCase()}] ${mensaje}`);
    this.cdr.detectChanges();
  }

  limpiarLog() {
    this.logDiagnostico = [];
    this.agregarLog('Log limpiado', 'info');
  }

  async diagnosticarCompleto() {
    this.agregarLog('🔍 Iniciando diagnóstico completo...', 'info');
    
    try {
      // 1. Verificar estado del usuario
      await this.verificarEstadoUsuario();
      
      // 2. Verificar API
      await this.verificarAPI();
      
      // 3. Verificar estado del menú
      await this.verificarEstadoMenu();
      
      this.agregarLog('✅ Diagnóstico completo finalizado', 'success');
      
    } catch (error) {
      this.agregarLog(`❌ Error en diagnóstico: ${error}`, 'error');
    }
  }

  async verificarEstadoUsuario() {
    this.agregarLog('👤 Verificando estado del usuario...', 'info');
    
    try {
      const isLoggedIn = this.authService.isLoggedIn();
      const user = this.authService.getCurrentUser();
      const token = this.authService.getToken();
      
      this.estadoUsuario = {
        isLoggedIn,
        user,
        hasToken: !!token,
        permissions: user?.permissions || []
      };
      
      if (isLoggedIn && user) {
        this.agregarLog(`✅ Usuario logueado: ${user.name}`, 'success');
      } else {
        this.agregarLog('⚠️ Usuario no logueado o datos incompletos', 'warning');
      }
      
      if (token) {
        this.agregarLog('✅ Token de autenticación presente', 'success');
      } else {
        this.agregarLog('❌ Token de autenticación ausente', 'error');
      }
      
    } catch (error) {
      this.agregarLog(`❌ Error verificando usuario: ${error}`, 'error');
    }
  }

  async verificarAPI() {
    this.agregarLog('🌐 Verificando respuesta del API...', 'info');
    
    try {
      const token = this.authService.getToken();
      
      if (!token) {
        this.agregarLog('❌ No hay token para hacer la petición', 'error');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      const response = await this.http.get<any>('http://localhost:8000/api/usuarios/menu', { headers }).toPromise();
      
      if (response?.success && response?.data?.menu) {
        const planillasMenu = response.data.menu.find((item: any) => 
          item.titulo?.toLowerCase().includes('planillas') ||
          item.nombre?.toLowerCase().includes('planillas')
        );
        
        this.respuestaAPI = {
          success: true,
          planillasData: planillasMenu,
          totalMenus: response.data.menu.length
        };
        
        if (planillasMenu) {
          this.agregarLog(`✅ Menú de Planillas encontrado en API con ${planillasMenu.submenu?.length || 0} submenús`, 'success');
        } else {
          this.agregarLog('⚠️ Menú de Planillas NO encontrado en respuesta del API', 'warning');
        }
        
      } else {
        this.respuestaAPI = {
          success: false,
          error: 'Respuesta inválida del API'
        };
        this.agregarLog('❌ Respuesta inválida del API', 'error');
      }
      
    } catch (error: any) {
      this.respuestaAPI = {
        success: false,
        error: error.message || error
      };
      this.agregarLog(`❌ Error en petición API: ${error.message || error}`, 'error');
    }
  }

  async verificarEstadoMenu() {
    this.agregarLog('📋 Verificando estado del menú en el servicio...', 'info');
    
    try {
      // Suscribirse al observable del menú
      this.menuService.obtenerMenuUsuario().subscribe({
        next: (menuItems) => {
          const planillasMenu = menuItems.find(item => 
            item.nombre?.toLowerCase().includes('planillas')
          );
          
          this.estadoMenu = {
            totalMenus: menuItems.length,
            planillasEncontrado: !!planillasMenu,
            submenusPlanillas: planillasMenu?.submenus?.length || 0,
            ultimaActualizacion: new Date()
          };
          
          if (planillasMenu) {
            this.agregarLog(`✅ Menú de Planillas cargado en servicio con ${planillasMenu.submenus?.length || 0} submenús`, 'success');
            
            if (planillasMenu.submenus && planillasMenu.submenus.length > 0) {
              planillasMenu.submenus.forEach((submenu: any, index: number) => {
                this.agregarLog(`  ${index + 1}. ${submenu.titulo || submenu.nombre} - ${submenu.ruta}`, 'info');
              });
            }
          } else {
            this.agregarLog('⚠️ Menú de Planillas NO encontrado en el servicio', 'warning');
          }
          
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.agregarLog(`❌ Error cargando menú del servicio: ${error}`, 'error');
        }
      });
      
    } catch (error) {
      this.agregarLog(`❌ Error verificando menú: ${error}`, 'error');
    }
  }

  async limpiarCacheYRecargar() {
    this.agregarLog('🗑️ Limpiando cache y recargando...', 'warning');
    
    try {
      // Limpiar localStorage (excepto datos esenciales)
      const user = localStorage.getItem('user');
      const token = localStorage.getItem('token');
      const isLoggedIn = localStorage.getItem('isLoggedIn');
      
      localStorage.clear();
      
      // Restaurar datos esenciales
      if (user) localStorage.setItem('user', user);
      if (token) localStorage.setItem('token', token);
      if (isLoggedIn) localStorage.setItem('isLoggedIn', isLoggedIn);
      
      this.agregarLog('✅ Cache limpiado, recargando página...', 'success');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      this.agregarLog(`❌ Error limpiando cache: ${error}`, 'error');
    }
  }

  async forzarRecargaMenu() {
    this.agregarLog('🔄 Forzando recarga del menú...', 'info');
    
    try {
      // Forzar nueva suscripción al menú
      this.menuService.obtenerMenuUsuario().subscribe({
        next: (menuItems) => {
          this.agregarLog(`✅ Menú recargado con ${menuItems.length} elementos`, 'success');
          this.verificarEstadoMenu();
        },
        error: (error) => {
          this.agregarLog(`❌ Error recargando menú: ${error}`, 'error');
        }
      });
      
    } catch (error) {
      this.agregarLog(`❌ Error en recarga forzada: ${error}`, 'error');
    }
  }
}