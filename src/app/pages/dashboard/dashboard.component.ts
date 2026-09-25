import { Component, OnInit, AfterViewInit, Inject, PLATFORM_ID, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { ComunicadosService } from '../comunicados/comunicados.service';
import { ComunicadosInstitucionalService } from '../../services/comunicados-institucional.service';
import { Subject, takeUntil } from 'rxjs';

declare var $: any;
declare var Chart: any;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: User | null = null;
  dashboardData: any = {};
  private destroy$ = new Subject<void>();

  // Datos para los nuevos widgets
  proximosEventos = [
    {
      titulo: 'Reunión de Departamento',
      descripcion: 'Revisión mensual de objetivos',
      fecha: '25 Ene 2024',
      tipo: 'Reunión'
    },
    {
      titulo: 'Capacitación IT',
      descripcion: 'Nuevas herramientas de trabajo',
      fecha: '28 Ene 2024',
      tipo: 'Capacitación'
    },
    {
      titulo: 'Auditoría Interna',
      descripcion: 'Revisión de procesos',
      fecha: '30 Ene 2024',
      tipo: 'Auditoría'
    }
  ];

  // Sistemas externos disponibles
  sistemasExternos: any[] = [];

  // Comunicados vigentes (visibles para todos en la intranet)
  comunicadosVigentes: any[] = [];
  loadingComunicados = false;

  // Documentos institucionales (RIT, Directivas - para dashboard)
  documentosRecientes: any[] = [];
  loadingDocumentos = false;

  actividadReciente = [
    {
      titulo: 'Documento subido',
      descripcion: 'Informe mensual de RRHH',
      tiempo: 'Hace 2 horas',
      icono: 'fas fa-file-alt text-info'
    },
    {
      titulo: 'Ticket resuelto',
      descripcion: 'Problema de acceso al sistema',
      tiempo: 'Hace 4 horas',
      icono: 'fas fa-check-circle text-success'
    },
    {
      titulo: 'Nuevo usuario',
      descripcion: 'Empleado registrado en el sistema',
      tiempo: 'Hace 6 horas',
      icono: 'fas fa-user-plus text-primary'
    },
    {
      titulo: 'Comunicado publicado',
      descripcion: 'Actualización de políticas',
      tiempo: 'Hace 1 día',
      icono: 'fas fa-bullhorn text-warning'
    }
  ];

  notificacionesImportantes = [
    {
      titulo: 'Mantenimiento Programado',
      descripcion: 'El sistema estará en mantenimiento mañana de 2:00 a 4:00 AM',
      tiempo: 'Hace 1 hora',
      icono: 'fas fa-tools'
    },
    {
      titulo: 'Nueva Actualización',
      descripcion: 'Se ha actualizado el módulo de reportes',
      tiempo: 'Hace 3 horas',
      icono: 'fas fa-download'
    },
    {
      titulo: 'Recordatorio',
      descripcion: 'No olvides completar tu evaluación de desempeño',
      tiempo: 'Hace 5 horas',
      icono: 'fas fa-bell'
    }
  ];

  constructor(
    private authService: AuthService,
    private apiService: ApiService,
    private comunicadosService: ComunicadosService,
    private comunicadosInstitucionalService: ComunicadosInstitucionalService,
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    // Obtener usuario actual
    this.currentUser = this.authService.getCurrentUser();
    
    // Suscribirse a cambios del usuario
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
    });
    
    this.loadDashboardData();
    this.loadComunicadosVigentes();
    this.loadDocumentosRecientes();
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Initialize AdminLTE 3.2.0 widgets and charts
      setTimeout(() => {
        try {
          this.initializeAdminLTEWidgets();
          this.initializeCharts();
        } catch (error) {
          console.warn('Error during dashboard initialization:', error);
        }
      }, 1000);
    }
  }

  private loadDashboardData(): void {
    // Cargar datos reales del backend
    this.apiService.getDashboardStats().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.dashboardData = response.data;
        }
      },
      error: (error: any) => {
        console.error('Error loading dashboard data:', error);
        // Usar datos mock en caso de error
        this.loadMockData();
      }
    });

    // Cargar sistemas externos
    this.loadSistemasExternos();
  }

  private loadSistemasExternos(): void {
    this.apiService.get('sistemas-integrados').subscribe({
      next: (response: any) => {
        if (response.success) {
          this.sistemasExternos = response.data.data || response.data || [];
        }
      },
      error: (error: any) => {
        console.error('Error loading sistemas integrados:', error);
        this.loadMockSistemasExternos();
      }
    });
  }

  private loadMockSistemasExternos(): void {
    this.sistemasExternos = [
      {
        id: 1,
        nombre: 'Sistema de Cobranzas',
        descripcion: 'Gestión de impuestos y cobranzas Notariaes',
        icono: 'fas fa-money-bill-wave',
        activo: true,
        url_base: 'http://localhost:4201'
      },
      {
        id: 2,
        nombre: 'Sistema de Nómina',
        descripcion: 'Sistema para gestión de planillas y pagos',
        icono: 'fas fa-money-bill-wave',
        activo: true,
        url_base: 'https://nomina.municipio.gob.pe'
      },
      {
        id: 3,
        nombre: 'Sistema de Inventario',
        descripcion: 'Control de bienes y suministros',
        icono: 'fas fa-boxes',
        activo: true,
        url_base: 'https://inventario.municipio.gob.pe'
      },
      {
        id: 4,
        nombre: 'Sistema de Reportes',
        descripcion: 'Generación de reportes estadísticos',
        icono: 'fas fa-chart-bar',
        activo: true,
        url_base: 'https://reportes.municipio.gob.pe'
      }
    ];
  }

  private loadComunicadosVigentes(): void {
    this.loadingComunicados = true;
    this.comunicadosService.getComunicadosVigentes(true)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const list = response.data || [];
          this.comunicadosVigentes = Array.isArray(list) ? list.slice(0, 5) : [];
          this.loadingComunicados = false;
        },
        error: () => {
          this.comunicadosVigentes = [];
          this.loadingComunicados = false;
        }
      });
  }

  private loadDocumentosRecientes(): void {
    this.loadingDocumentos = true;
    this.comunicadosInstitucionalService.getDocumentos({ solo_activos: true })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const list = response.data || [];
          this.documentosRecientes = Array.isArray(list) ? list.slice(0, 6) : [];
          this.loadingDocumentos = false;
        },
        error: () => {
          this.documentosRecientes = [];
          this.loadingDocumentos = false;
        }
      });
  }

  private loadMockData(): void {
    this.dashboardData = {
      totalUsuarios: 150,
      usuariosActivos: 120,
      empleadosActivos: 44,
      documentosSubidos: 65,
      ticketsPendientes: 12,
      tasaActividad: 53,
      visitantes: {
        total: 1250,
        online: 89,
        ventas: 320
      },
      estadisticas: {
        mensual: [10, 20, 15, 25, 20, 30, 25, 40, 35, 50, 45, 60],
        categorias: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dec']
      }
    };
  }

  private initializeAdminLTEWidgets(): void {
    if (typeof $ !== 'undefined') {
      try {
        // Initialize card widgets
        if ($.fn.CardWidget) {
          try {
            const cardElements = $('[data-card-widget]');
            if (cardElements.length > 0) {
              cardElements.CardWidget();
            }
          } catch (cardWidgetError) {
            console.warn('CardWidget not available or error:', cardWidgetError);
          }
        }

        // Initialize direct chat - Skip for now due to compatibility issues
        // if ($.fn.DirectChat) {
        //   try {
        //     const chatElements = $('[data-widget="chat-pane-toggle"]');
        //     if (chatElements.length > 0) {
        //       chatElements.DirectChat();
        //     }
        //   } catch (directChatError) {
        //     console.warn('DirectChat widget not available or error:', directChatError);
        //   }
        // }

        // Initialize tabs
        if ($.fn.tab) {
          try {
            const tabElements = $('[data-toggle="tab"]');
            if (tabElements.length > 0) {
              tabElements.tab();
            }
          } catch (tabError) {
            console.warn('Tab widget not available or error:', tabError);
          }
        }

        // Initialize dropdowns
        if ($.fn.dropdown) {
          try {
            const dropdownElements = $('.dropdown-toggle');
            if (dropdownElements.length > 0) {
              dropdownElements.dropdown();
            }
          } catch (dropdownError) {
            console.warn('Dropdown widget not available or error:', dropdownError);
          }
        }

        // Initialize tooltips
        if ($.fn.tooltip) {
          try {
            const tooltipElements = $('[data-toggle="tooltip"]');
            if (tooltipElements.length > 0) {
              tooltipElements.tooltip();
            }
          } catch (tooltipError) {
            console.warn('Tooltip widget not available or error:', tooltipError);
          }
        }

        // Initialize sparklines
        if ($.fn.sparkline) {
          try {
            const sparklineElements = $('.sparkline');
            if (sparklineElements.length > 0) {
              sparklineElements.sparkline('html', {
                type: 'line',
                width: '100%',
                height: '50px',
                lineColor: '#fff',
                fillColor: 'rgba(255,255,255,0.3)',
                spotColor: '#fff',
                minSpotColor: '#fff',
                maxSpotColor: '#fff'
              });
            }
          } catch (sparklineError) {
            console.warn('Sparkline widget not available or error:', sparklineError);
          }
        }

        // Dashboard AdminLTE 3.2.0 widgets initialized successfully
      } catch (error) {
        console.error('Error initializing dashboard widgets:', error);
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeCharts(): void {
    if (isPlatformBrowser(this.platformId)) {
      // Esperar a que Chart.js esté disponible
      const checkChart = () => {
        if (typeof Chart !== 'undefined') {
          try {
            this.initializeAreaChart();
            this.initializeDonutChart();
            this.initializeLineChart();
            console.log('Charts initialized successfully');
          } catch (error) {
            console.warn('Error initializing charts:', error);
          }
        } else {
          // Reintentar después de 100ms
          setTimeout(checkChart, 100);
        }
      };
      
      // Iniciar verificación
      checkChart();
    } else {
      console.warn('Not in browser environment');
    }
  }

  private initializeAreaChart(): void {
    const areaChartCanvas = document.getElementById('revenue-chart-canvas') as HTMLCanvasElement;
    if (areaChartCanvas) {
      const areaChart = new Chart(areaChartCanvas, {
        type: 'line',
        data: {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
          datasets: [
            {
              label: 'Actividad Digital',
              backgroundColor: 'rgba(60,141,188,0.9)',
              borderColor: 'rgba(60,141,188,0.8)',
              pointRadius: false,
              pointColor: '#3b8bba',
              pointStrokeColor: 'rgba(60,141,188,1)',
              pointHighlightFill: '#fff',
              pointHighlightStroke: 'rgba(60,141,188,1)',
              data: [28, 48, 40, 19, 86, 27, 90]
            },
            {
              label: 'Actividad Presencial',
              backgroundColor: 'rgba(210, 214, 222, 1)',
              borderColor: 'rgba(210, 214, 222, 1)',
              pointRadius: false,
              pointColor: 'rgba(210, 214, 222, 1)',
              pointStrokeColor: '#c1c7d1',
              pointHighlightFill: '#fff',
              pointHighlightStroke: 'rgba(220,220,220,1)',
              data: [65, 59, 80, 81, 56, 55, 40]
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              grid: {
                display: false
              }
            },
            y: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  }

  private initializeDonutChart(): void {
    const donutChartCanvas = document.getElementById('sales-chart-canvas') as HTMLCanvasElement;
    if (donutChartCanvas) {
      const donutChart = new Chart(donutChartCanvas, {
        type: 'doughnut',
        data: {
          labels: [
            'Usuarios Activos',
            'Usuarios Inactivos',
            'Nuevos Usuarios'
          ],
          datasets: [
            {
              data: [700, 500, 200],
              backgroundColor: ['#f56954', '#00a65a', '#f39c12']
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true
        }
      });
    }
  }

  private initializeLineChart(): void {
    const lineChartCanvas = document.getElementById('line-chart') as HTMLCanvasElement;
    if (lineChartCanvas) {
      const lineChart = new Chart(lineChartCanvas, {
        type: 'line',
        data: {
          labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'],
          datasets: [
            {
              label: 'Ventas',
              fill: false,
              borderWidth: 2,
              lineTension: 0,
              spanGaps: true,
              borderColor: '#efefef',
              pointRadius: 3,
              pointHoverRadius: 7,
              pointColor: '#efefef',
              pointBackgroundColor: '#efefef',
              data: [28, 48, 40, 19, 86, 27, 90]
            }
          ]
        },
        options: {
          maintainAspectRatio: false,
          responsive: true,
          plugins: {
            legend: {
              display: false
            }
          },
          scales: {
            y: {
              display: false,
              grid: {
                display: false,
                drawBorder: false
              }
            },
            x: {
              display: false,
              grid: {
                display: false,
                drawBorder: false
              }
            }
          }
        }
      });
    }
  }

  // Métodos de utilidad
  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  logout(): void {
    this.authService.logout();
  }

  // Métodos para las nuevas funcionalidades
  showUserProfile(): void {
    this.router.navigate(['/perfil']);
  }

  openConfiguration(): void {
    this.router.navigate(['/configuracion']);
  }

  openMessages(): void {
    this.router.navigate(['/mensajes']);
  }

  openNotifications(): void {
    this.router.navigate(['/notificaciones']);
  }

  // Getter para roles seguros
  get userRoles(): string[] {
    return this.currentUser?.roles || [];
  }

  // Métodos para manejo de eventos
  onImageError(event: any): void {
    event.target.src = 'assets/img/user1-128x128.jpg';
  }

  onImageLoad(event: any): void {
    // Imagen cargada exitosamente
  }

  getMessageReadPercentage(): number {
    if (!this.dashboardData?.mensajes || this.dashboardData?.mensajes === 0) {
      return 0;
    }
    const unread = this.dashboardData?.mensajes_no_leidos || 0;
    const total = this.dashboardData?.mensajes || 0;
    return Math.round(((total - unread) / total) * 100);
  }

  // Métodos para abrir sistemas externos
  formatDateComunicado(dateString: string): string {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getTipoBadgeComunicado(tipo: string): string {
    const m: Record<string, string> = {
      noticia: 'badge-primary',
      evento: 'badge-success',
      alerta: 'badge-warning',
      anuncio: 'badge-info'
    };
    return m[tipo] || 'badge-secondary';
  }

  getTipoLabelDocumento(tipo: string): string {
    const m: Record<string, string> = { rit: 'RIT', directiva: 'Directiva', manual: 'Manual', general: 'Documento' };
    return m[tipo || ''] || tipo || 'Documento';
  }

  abrirSistema(sistema: any): void {
    if (!sistema.activo) {
      return;
    }

    if (sistema.modo_ejecucion === 'iframe') {
      // Abrir en modal o nueva ventana
      window.open(sistema.url_base, '_blank');
    } else {
      // Abrir directamente en nueva ventana
      window.open(sistema.url_base, '_blank');
    }
  }
}
