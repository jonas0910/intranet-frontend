import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, Renderer2, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser, DOCUMENT } from '@angular/common';
import { RouterOutlet, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { AuthService, User } from '../services/auth.service';
import { MenuService, MenuItem } from '../services/menu.service';
import { NotificationService } from '../pages/mensajeria/services/notification.service';
import { WebSocketService } from '../pages/mensajeria/services/websocket.service';
import { MessageService } from '../pages/mensajeria/services/message.service';
import { BadgeService } from '../services/badge.service';
import { MenuFavoritesService, FavoriteMenu } from '../services/menu-favorites.service';
import { ToastContainerComponent } from '../components/toast-container/toast-container.component';

declare var $: any;

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, FormsModule, ToastContainerComponent],
  templateUrl: './app-layout.component.html',
  styleUrl: './app-layout.component.scss'
})
export class AppLayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  currentUser: User | null = null;
  currentYear = new Date().getFullYear();
  isLoading = false;
  menuItems: MenuItem[] = [];
  unreadMessagesCount = 0;
  recentNotifications: any[] = [];
  private subscription: Subscription = new Subscription();
  
  // Control de estado para accordion de menús
  openMenuId: number | null = null; // ID del menú actualmente abierto
  
  // NUEVAS PROPIEDADES PARA MEJORAS
  searchQuery: string = '';
  filteredMenuItems: MenuItem[] = [];
  favoriteMenus: FavoriteMenu[] = [];
  showOnlyFavorites: boolean = false;
  menuCategories: Map<string, MenuItem[]> = new Map();
  sidebarScrollTop: number = 0;

  /** Control del menú de usuario (dropdown) desde Angular para que siempre sea visible al hacer clic */
  userMenuOpen = false;

  constructor(
    private authService: AuthService,
    private menuService: MenuService,
    private notificationService: NotificationService,
    private webSocketService: WebSocketService,
    private messageService: MessageService,
    private badgeService: BadgeService,
    private menuFavoritesService: MenuFavoritesService,
    private renderer: Renderer2,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.applyAdminLTEClasses();
    
    // Suscribirse a los cambios del usuario para mantener la UI actualizada
    this.subscription.add(
      this.authService.currentUser$.subscribe(user => {
        // Solo actualizar si el usuario cambió
        if (JSON.stringify(this.currentUser) !== JSON.stringify(user)) {
          this.currentUser = user;
        }
      })
    );
    
    // Si no hay usuario en el subject, intentar obtenerlo del storage
    if (!this.currentUser) {
      this.currentUser = this.authService.getCurrentUser();
    }
    
    this.loadMenus();
    this.initializeMessagingNotifications();
    this.loadFavorites();
    this.restoreMenuState();

    // Suscribirse a eventos de refresco de menú (p.ej. al eliminar/agregar sistemas)
    this.subscription.add(
      this.menuService.menuRefresh$.subscribe(() => {
        this.loadMenus();
      })
    );
  }

  private loadMenus(): void {
    this.subscription.add(
      this.menuService.obtenerMenuIntegrado().subscribe({
        next: (menus) => {
          this.menuItems = menus;
          this.filteredMenuItems = menus;
          this.organizeMenusByCategory();

          if (this.menuItems.length > 15) {
            this.document.body.classList.add('sidebar-collapse');
          }

          // Reinicializar AdminLTE después de cargar los menús dinámicos
          setTimeout(() => {
            this.initializeAdminLTE();
          }, 100);

          // Configurar dropdowns después de un delay adicional
          setTimeout(() => {
            this.setupDropdownHandlers();
            if (typeof (window as any).initSidebarTreeview === 'function') {
              (window as any).initSidebarTreeview();
            }
          }, 1000);
        },
        error: () => {
          this.loadFallbackMenu();
        }
      })
    );
  }

  private loadFallbackMenu(): void {
    this.subscription.add(
      this.menuService.obtenerMenuUsuario().subscribe({
        next: (menus) => {
          this.menuItems = menus;
          this.filteredMenuItems = menus;

          setTimeout(() => {
            this.reinitializeAfterMenusLoaded();
            if (typeof (window as any).initSidebarTreeview === 'function') {
              (window as any).initSidebarTreeview();
            }
          }, 100);
        },
        error: () => {
          this.createTestMenu();
        }
      })
    );
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      // NO inicializar AdminLTE aquí - se maneja centralmente en app.component.ts
      // Los menús ahora se controlan con Angular nativo (no jQuery)
      setTimeout(() => {
        this.reinitializeAfterMenusLoaded();
        // Forzar recálculo del layout para evitar distorsión de section.content tras logout/login
        const contentWrapper = this.document.querySelector('.content-wrapper');
        if (contentWrapper) {
          (contentWrapper as HTMLElement).offsetHeight;
        }
      }, 500);
      
      console.log('✅ ngAfterViewInit: Menús controlados por Angular con accordion nativo');
    }
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  /** Abre o cierra el menú de usuario al hacer clic en el botón */
  toggleUserMenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.userMenuOpen = !this.userMenuOpen;
  }

  /** Cierra el menú de usuario (al elegir una opción o al hacer clic fuera) */
  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (this.userMenuOpen && target && !target.closest('.user-menu-dropdown')) {
      this.closeUserMenu();
    }
  }

  logout(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation(); // Asegurar que no se propague
    }
    
    console.log('🚪 AppLayout: Iniciando cierre de sesión...');
    
    // Cierra el menú visualmente
    this.closeUserMenu();
    
    // Ejecuta el logout del servicio
    this.authService.logout();
  }

  /**
   * Indica si el usuario actual tiene rol de administrador (para mostrar badge Admin)
   */
  isAdminUser(): boolean {
    if (!this.currentUser?.roles?.length) return false;
    const adminRoles = ['admin', 'administrador', 'superadmin', 'Administrador Sistema'];
    return this.currentUser.roles.some(r =>
      adminRoles.some(ar => String(r).toLowerCase().includes(ar.toLowerCase()))
    );
  }

  /**
   * Hora actual en formato HH:mm para mostrar "En línea"
   */
  getCurrentTime(): string {
    const now = new Date();
    return now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
  }

  /**
   * Toggle del menú con comportamiento accordion (Angular nativo)
   * @param menuId ID del menú a abrir/cerrar
   */
  toggleMenu(menuId: number): void {
    console.log('🖱️ ANGULAR ACCORDION: Click en menú INDEX', menuId);
    
    // Si el menú clickeado ya está abierto, cerrarlo
    if (this.openMenuId === menuId) {
      this.openMenuId = null;
    } else {
      // ACCORDION: Cerrar el menú anterior y abrir el nuevo
      this.openMenuId = menuId;
    }
    
    // Guardar estado
    this.saveMenuState();
  }

  /**
   * Verifica si un menú está abierto
   * @param menuId ID del menú
   * @returns true si el menú está abierto
   */
  isMenuOpen(menuId: number): boolean {
    return this.openMenuId === menuId;
  }

  private applyAdminLTEClasses(): void {
    if (isPlatformBrowser(this.platformId)) {
      const body = this.document.body;
      
      // Limpiar todas las clases para evitar estado residual (p. ej. tras logout)
      body.className = '';
      
      // Aplicar solo clases base de AdminLTE 3.2.0 (sin sidebar-collapse; se añade después si aplica)
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
      
      // Asegurar que no quede sidebar-collapse de una sesión anterior
      body.classList.remove('sidebar-collapse');
    }
  }

  /**
   * Reinicializa solo widgets específicos después de cargar menús dinámicos
   */
  private reinitializeAfterMenusLoaded(): void {
    if (isPlatformBrowser(this.platformId) && typeof $ !== 'undefined') {
      const $ = (window as any).$;
      
      try {
        // NO usar Treeview de AdminLTE - usar control Angular nativo
        // Limpiar cualquier inicialización previa de Treeview
        if ($.fn.Treeview) {
          $('[data-widget="treeview"]').off('.lte.treeview');
        }
        console.log('✅ AdminLTE Treeview desactivado - menús controlados por Angular');
      } catch (error) {
        console.warn('Error reinicializando widgets después de cargar menús:', error);
      }
    }
  }

  private initializeAdminLTE(): void {
    if (isPlatformBrowser(this.platformId) && typeof $ !== 'undefined') {
      try {
        console.log('🔧 AppLayout: Inicializando AdminLTE widgets...');

        // Initialize PushMenu (sidebar toggle)
        if ($.fn.PushMenu) {
          $('[data-widget="pushmenu"]').PushMenu();
          console.log('✅ PushMenu inicializado');
        }

        // NO inicializar TreeView de AdminLTE - Usar control Angular nativo
        console.log('⚠️ Treeview de AdminLTE desactivado - usando control Angular nativo');

        // Initialize Sidebar Search
        if ($.fn.SidebarSearch) {
          $('[data-widget="sidebar-search"]').SidebarSearch();
        }

        // Initialize Navbar Search
        if ($.fn.NavbarSearch) {
          $('[data-widget="navbar-search"]').NavbarSearch();
        }

        // Initialize Fullscreen
        if ($.fn.Fullscreen) {
          $('[data-widget="fullscreen"]').Fullscreen();
        }

        // Initialize Control Sidebar
        if ($.fn.ControlSidebar) {
          $('[data-widget="control-sidebar"]').ControlSidebar();
        }

        // Initialize Bootstrap dropdowns - navbar dropdowns
        if ($.fn.dropdown) {
          // Inicializar dropdowns del navbar
          $('.navbar-nav .dropdown-toggle').dropdown();
          // Inicializar dropdowns que usan data-toggle="dropdown"
          $('[data-toggle="dropdown"]').dropdown();
          console.log('✅ Bootstrap dropdowns inicializados');
        }

        // Fallback: Inicializar dropdowns manualmente si Bootstrap no funciona
        this.initializeDropdownFallback();

        // Initialize tooltips
        if ($.fn.tooltip) {
          $('[data-toggle="tooltip"]').tooltip();
        }

        // Initialize popovers
        if ($.fn.popover) {
          $('[data-toggle="popover"]').popover();
        }

        console.log('✅ AdminLTE 3.2.0 inicializado exitosamente');
      } catch (error) {
        console.error('❌ Error inicializando AdminLTE:', error);
      }
    }
  }

  /**
   * Inicializa los dropdowns manualmente si Bootstrap no funciona
   */
  private initializeDropdownFallback(): void {
    if (typeof $ === 'undefined') return;

    const $ = (window as any).$;
    
    // Esperar un poco para que el DOM esté completamente listo
    setTimeout(() => {
      // Buscar todos los dropdowns del navbar (tanto data-toggle como dropdown-toggle)
      const dropdownToggles = $('.navbar-nav [data-toggle="dropdown"], .navbar-nav .dropdown-toggle');
      
      dropdownToggles.each(function(this: HTMLElement) {
        const $toggle = $(this);
        const $parent = $toggle.parent();
        const $menu = $parent.find('> .dropdown-menu');
        
        if ($menu.length > 0) {
          // Limpiar handlers previos
          $toggle.off('click.dropdown-fallback');
          
          // Configurar handler personalizado en el enlace principal
          $toggle.on('click.dropdown-fallback', function(e: any) {
            e.preventDefault();
            e.stopPropagation();
            
            const isOpen = $parent.hasClass('show');
            
            // Cerrar otros dropdowns abiertos
            $('.navbar-nav .nav-item.dropdown').removeClass('show');
            $('.navbar-nav .dropdown-menu').removeClass('show');
            
            // Toggle del dropdown actual
            if (!isOpen) {
              $parent.addClass('show');
              $menu.addClass('show');
            }
          });
          
          // También configurar handlers en elementos hijos (badges, iconos, etc.)
          $toggle.find('*').on('click.dropdown-fallback', function(e: any) {
            e.preventDefault();
            e.stopPropagation();
            
            // Disparar el click en el enlace padre
            $toggle.trigger('click');
          });
        }
      });
      
      // Cerrar dropdowns al hacer click fuera
      $(document).off('click.dropdown-fallback').on('click.dropdown-fallback', function(e: any) {
        if (!$(e.target).closest('.navbar-nav .dropdown').length) {
          $('.navbar-nav .nav-item.dropdown').removeClass('show');
          $('.navbar-nav .dropdown-menu').removeClass('show');
        }
      });
    }, 100);
  }

  /**
   * [OBSOLETO - YA NO SE USA]
   * Los menús ahora se controlan con Angular nativo (toggleMenu/isMenuOpen)
   * Esta función se mantiene solo por compatibilidad temporal
   */
  private setupDropdownHandlers(): void {
    console.log('🔧 AppLayout: Iniciando configuración de dropdown handlers con ACCORDION...');
    
    if (typeof $ === 'undefined') {
      console.warn('⚠️ jQuery no está disponible para configurar dropdowns');
      return;
    }

    const $ = (window as any).$;
    
    // Esperar un poco para que el DOM esté completamente renderizado
    setTimeout(() => {
      console.log('🔍 AppLayout: Buscando elementos del DOM...');
      
      // DESACTIVAR completamente cualquier handler de AdminLTE Treeview
      $('[data-widget="treeview"]').off('.lte.treeview');
      $('.sidebar .nav-item.has-treeview > .nav-link').off('.lte.treeview');
      
      // Buscar todos los menús con submenús
      const treeviewItems = $('.sidebar .nav-item.has-treeview');
      console.log('🔧 AppLayout: Encontrados', treeviewItems.length, 'menús con clase has-treeview');
      
      // También buscar por selector más específico
      const allNavItems = $('.sidebar .nav-item');
      console.log('🔧 AppLayout: Total elementos .nav-item:', allNavItems.length);
      
      if (treeviewItems.length === 0) {
        console.warn('⚠️ AppLayout: No se encontraron menús con submenús para configurar');
        console.log('🔍 AppLayout: Verificando estructura del DOM...');
        
        // Debug del DOM
        const sidebar = $('.sidebar');
        console.log('🔍 AppLayout: Sidebar encontrado:', sidebar.length > 0);
        
        const nav = $('.sidebar nav');
        console.log('🔍 AppLayout: Nav encontrado:', nav.length > 0);
        
        const ul = $('.sidebar nav ul');
        console.log('🔍 AppLayout: UL encontrado:', ul.length > 0);
        
        const liItems = $('.sidebar nav ul li');
        console.log('🔍 AppLayout: LI items encontrados:', liItems.length);
        
        liItems.each(function(index: number) {
          const $li = $(this);
          const hasTreeview = $li.hasClass('has-treeview');
          const menuText = $li.find('p').first().text().trim();
          console.log(`🔍 AppLayout: LI ${index}: "${menuText}" - has-treeview: ${hasTreeview}`);
        });
        
        // Aún así intentar configurar handlers después de otro delay
        setTimeout(() => {
          console.log('🔄 AppLayout: Reintentando configurar handlers...');
          this.forceSetupHandlers();
        }, 2000);
        
        return;
      }
      
      // Configurar handlers para cada menú
      treeviewItems.each(function(this: HTMLElement) {
        const $item = $(this);
        const $link = $item.find('> .nav-link');
        const $submenu = $item.find('> .nav-treeview');
        const menuName = $link.find('p').first().text().trim();
        
        console.log(`🔍 AppLayout: Procesando menú: "${menuName}" - Submenús encontrados: ${$submenu.length}`);
        
        if ($submenu.length === 0) {
          console.warn(`⚠️ AppLayout: Menú "${menuName}" no tiene elemento .nav-treeview`);
          return;
        }
        
        // Limpiar TODOS los handlers previos (AdminLTE y personalizados)
        $link.off('click');
        $link.off('click.treeview-dropdown');
        $link.off('.lte.treeview');
        
        // Asegurar que el submenú esté oculto inicialmente
        if (!$item.hasClass('menu-open')) {
          $submenu.hide();
        }
        
        // Configurar handler personalizado para dropdown con ACCORDION
        $link.on('click.accordion', function(e: any) {
          e.preventDefault();
          e.stopPropagation();
          
          const isOpen = $item.hasClass('menu-open');
          console.log(`🖱️ AppLayout: Click en menú "${menuName}" - Estado actual: ${isOpen ? 'Abierto' : 'Cerrado'}`);
          
          if (isOpen) {
            // Cerrar menú actual
            $item.removeClass('menu-open');
            $submenu.slideUp(300, function() {
              console.log(`🔽 AppLayout: Menú cerrado: ${menuName}`);
            });
          } else {
            // ACCORDION: Cerrar TODOS los otros menús abiertos primero (SIN CONDICIÓN)
            console.log('🔄 AppLayout: Aplicando ACCORDION - Cerrando todos los demás menús...');
            
            $('.sidebar .nav-item.has-treeview').each(function() {
              const $otherItem = $(this);
              if ($otherItem[0] !== $item[0] && $otherItem.hasClass('menu-open')) {
                const $otherSubmenu = $otherItem.find('> .nav-treeview');
                $otherItem.removeClass('menu-open');
                $otherSubmenu.stop(true, false).slideUp(300);
                const otherMenuName = $otherItem.find('> .nav-link p').first().text().trim();
                console.log(`🔽 AppLayout: Cerrando automáticamente: "${otherMenuName}"`);
              }
            });
            
            // Pequeño delay antes de abrir el menú actual
            setTimeout(() => {
              // Abrir menú actual
              $item.addClass('menu-open');
              $submenu.stop(true, false).slideDown(300, function() {
                console.log(`🔼 AppLayout: Menú abierto: ${menuName}`);
              });
            }, 50);
          }
          
          return false;
        });
        
        console.log(`✅ AppLayout: Handler configurado para: ${menuName}`);
      });
      
      console.log('✅ AppLayout: Todos los handlers de dropdown configurados exitosamente');
    }, 1500);
  }

  /**
   * [OBSOLETO - YA NO SE USA]
   * Los menús ahora se controlan con Angular nativo
   */
  private forceSetupHandlers(): void {
    if (typeof $ === 'undefined') return;
    
    const $ = (window as any).$;
    
    const allItems = $('.sidebar .nav-item');
    console.log('🔧 AppLayout: Forzando configuración. Items encontrados:', allItems.length);
    
    allItems.each(function(this: HTMLElement) {
      const $item = $(this);
      const $link = $item.find('> .nav-link');
      const $submenu = $item.find('> ul.nav-treeview');
      
      // Si tiene submenú, agregar la clase has-treeview si no la tiene
      if ($submenu.length > 0 && !$item.hasClass('has-treeview')) {
        console.log('🔧 AppLayout: Agregando clase has-treeview a:', $link.find('p').first().text().trim());
        $item.addClass('has-treeview');
      }
    });
    
    // Llamar nuevamente a setupDropdownHandlers
    this.setupDropdownHandlers();
  }

  /* Funciones de estilo de colores removidas - se usa el estilo tradicional de AdminLTE */

  /**
   * Initialize messaging notifications system
   */
  private initializeMessagingNotifications(): void {
    console.log('💬 AppLayout: Inicializando sistema de notificaciones de mensajería con BadgeService');

    // Inicializar el servicio de badges
    if (this.currentUser && this.currentUser.id) {
      this.badgeService.initialize();

      // Suscribirse a actualizaciones de badges en tiempo real
      this.subscription.add(
        this.badgeService.unreadMessages$.subscribe(count => {
          console.log('📬 AppLayout: Contador de mensajes no leídos actualizado:', count);
          this.unreadMessagesCount = count;
        })
      );

      this.subscription.add(
        this.badgeService.totalNotifications$.subscribe(count => {
          console.log('🔔 AppLayout: Contador total de notificaciones actualizado:', count);
          // Puedes actualizar el contador total aquí si lo necesitas
        })
      );
    }

    // Subscribe to unread count updates from MessageService (fallback)
    this.subscription.add(
      this.messageService.getUnreadCount$().subscribe(count => {
        console.log('📬 AppLayout: Contador desde MessageService:', count);
        this.unreadMessagesCount = count;
      })
    );

    // Load initial unread count
    this.messageService.refreshUnreadCount().subscribe();

    // Load recent notifications
    this.loadRecentNotifications();

    // Connect to WebSocket if user is authenticated
    if (this.currentUser && this.currentUser.id) {
      console.log('🔌 AppLayout: Conectando a WebSocket para usuario:', this.currentUser.id);

      this.webSocketService.connect(this.currentUser.id).subscribe({
        next: (connected) => {
          if (connected) {
            console.log('✅ AppLayout: WebSocket conectado exitosamente');
            this.subscribeToWebSocketEvents();
          }
        },
        error: (error) => {
          console.error('❌ AppLayout: Error conectando a WebSocket:', error);
        }
      });
    }
  }

  /**
   * Load recent unread notifications
   */
  private loadRecentNotifications(): void {
    console.log('📬 AppLayout: Cargando notificaciones recientes');
    this.notificationService.getRecentNotifications(10).subscribe({
      next: (response) => {
        console.log('✅ AppLayout: Notificaciones recientes cargadas:', response);
        this.recentNotifications = response.data || [];
        console.log('📋 AppLayout: Total de notificaciones:', this.recentNotifications.length);
      },
      error: (error) => {
        console.error('❌ AppLayout: Error cargando notificaciones recientes:', error);
      }
    });
  }

  /**
   * Subscribe to WebSocket events for real-time updates
   */
  private subscribeToWebSocketEvents(): void {
    console.log('📡 AppLayout: Suscribiendo a eventos de WebSocket');

    // Listen for new messages
    this.subscription.add(
      this.webSocketService.getMessageReceived().subscribe(event => {
        console.log('📨 AppLayout: Nuevo mensaje recibido:', event);

        // Forward message to MessageService
        this.messageService.handleWebSocketMessage({
          event: 'message.received',
          data: event
        });

        // Refresh unread count and notifications from server
        this.messageService.refreshUnreadCount().subscribe();
        this.loadRecentNotifications();

        // Show browser notification
        this.showBrowserNotification(event);
      })
    );

    // Listen for message read events
    this.subscription.add(
      this.webSocketService.getMessageRead().subscribe(event => {
        console.log('✅ AppLayout: Mensaje marcado como leído:', event);

        // Forward message to MessageService
        this.messageService.handleWebSocketMessage({
          event: 'message.read',
          data: event
        });

        // Refresh unread count and notifications from server
        this.messageService.refreshUnreadCount().subscribe();
        this.loadRecentNotifications();
      })
    );

    // Listen for general WebSocket messages
    this.subscription.add(
      this.webSocketService.generalMessages$.subscribe(message => {
        console.log('📨 AppLayout: Mensaje general de WebSocket:', message);
        console.log('📨 AppLayout: MessageService available:', !!this.messageService);
        
        // Forward all messages to MessageService
        this.messageService.handleWebSocketMessage(message);
        console.log('📨 AppLayout: Message forwarded to MessageService');
      })
    );
  }

  /**
   * Show browser notification for new message
   */
  private showBrowserNotification(event: any): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('Nuevo mensaje', {
        body: event.message?.subject || 'Tienes un nuevo mensaje',
        icon: '/assets/img/icons/message.png',
        badge: '/assets/img/icons/message-badge.png',
        tag: 'mensajeria-notification',
        requireInteraction: false
      });

      notification.onclick = () => {
        window.focus();
        // Navigate to message if possible
        notification.close();
      };
    }
  }

  /**
   * Format unread count for display
   */
  formatUnreadCount(): string {
    if (this.unreadMessagesCount === 0) return '';
    if (this.unreadMessagesCount > 99) return '99+';
    return this.unreadMessagesCount.toString();
  }

  /**
   * Navigate to messages page
   */
  navigateToMessages(): void {
    window.location.href = '/mensajeria';
  }

  /**
   * Get time ago from timestamp
   */
  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins} min`;
    if (diffHours < 24) return `${diffHours} h`;
    if (diffDays < 7) return `${diffDays} d`;
    return date.toLocaleDateString();
  }

  // ==================== NUEVAS FUNCIONES PARA MEJORAS ====================

  /**
   * Organizar menús por categorías
   */
  private organizeMenusByCategory(): void {
    this.menuCategories.clear();
    
    this.menuItems.forEach(menu => {
      const category = (menu as any).category || 'general';
      if (!this.menuCategories.has(category)) {
        this.menuCategories.set(category, []);
      }
      this.menuCategories.get(category)!.push(menu);
    });
    
    console.log('📂 Menús organizados por categoría:', this.menuCategories);
  }

  /**
   * Cargar favoritos
   */
  private loadFavorites(): void {
    this.subscription.add(
      this.menuFavoritesService.favorites$.subscribe(favorites => {
        this.favoriteMenus = favorites;
        console.log('⭐ Favoritos cargados:', favorites);
      })
    );
  }

  /**
   * Alternar favorito
   */
  toggleFavorite(menu: MenuItem, event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const favorite: FavoriteMenu = {
      route: menu.route || menu.url || '/',
      nombre: menu.nombre || menu.titulo || 'Sin nombre',
      icon: menu.icono || 'fas fa-circle',
      moduleId: menu.id
    };
    
    this.menuFavoritesService.toggleFavorite(favorite);
  }

  /**
   * Verificar si es favorito
   */
  isFavorite(route: string): boolean {
    return this.menuFavoritesService.isFavorite(route);
  }

  /**
   * Buscar en menús
   */
  onSearchMenu(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchQuery = input.value.toLowerCase().trim();
    
    if (!this.searchQuery) {
      this.filteredMenuItems = this.menuItems;
      return;
    }

    this.filteredMenuItems = this.menuItems.map(menu => {
      // Buscar en submenús
      const matchingSubmenus = menu.submenus?.filter(sub => 
        (sub.nombre || sub.titulo || '').toLowerCase().includes(this.searchQuery)
      ) || [];

      // Si el menú principal coincide, mostrar todos sus submenús
      if ((menu.nombre || menu.titulo || '').toLowerCase().includes(this.searchQuery)) {
        // Abrir automáticamente el menú si coincide
        const menuIndex = this.menuItems.findIndex(m => m.id === menu.id);
        if (menuIndex !== -1) {
          this.openMenuId = menuIndex;
        }
        return { ...menu };
      }

      // Si tiene submenús que coinciden, mostrar solo esos y abrir el menú
      if (matchingSubmenus.length > 0) {
        const menuIndex = this.menuItems.findIndex(m => m.id === menu.id);
        if (menuIndex !== -1) {
          this.openMenuId = menuIndex;
        }
        return { ...menu, submenus: matchingSubmenus };
      }

      return null;
    }).filter(m => m !== null) as MenuItem[];

    console.log('🔍 Búsqueda:', this.searchQuery, '- Resultados:', this.filteredMenuItems.length);
  }

  /**
   * Limpiar búsqueda
   */
  clearSearch(): void {
    this.searchQuery = '';
    this.filteredMenuItems = this.menuItems;
  }

  /**
   * Guardar estado del sidebar
   */
  private saveMenuState(): void {
    const state = {
      openMenuId: this.openMenuId,
      scrollPosition: this.sidebarScrollTop
    };
    localStorage.setItem('sidebar_state', JSON.stringify(state));
  }

  /**
   * Restaurar estado del sidebar
   */
  private restoreMenuState(): void {
    const savedState = localStorage.getItem('sidebar_state');
    if (savedState) {
      try {
        const state = JSON.parse(savedState);
        this.openMenuId = state.openMenuId;
        setTimeout(() => {
          const sidebar = this.document.querySelector('.sidebar');
          if (sidebar) {
            sidebar.scrollTop = state.scrollPosition || 0;
          }
        }, 500);
      } catch (error) {
        console.error('Error restaurando estado del sidebar:', error);
      }
    }
  }

  /**
   * Guardar posición del scroll
   */
  onSidebarScroll(event: Event): void {
    const element = event.target as HTMLElement;
    this.sidebarScrollTop = element.scrollTop;
  }

  /**
   * TrackBy para mejor performance
   */
  trackByMenuItem(index: number, item: MenuItem): any {
    return item.id || index;
  }

  /**
   * TrackBy para submenús
   */
  trackBySubmenu(index: number, item: any): any {
    return item.id || index;
  }

  /**
   * Obtener categorías ordenadas
   */
  getCategoriesArray(): Array<{ key: string, menus: MenuItem[], order: number, label: string, icon: string }> {
    const categories: Array<any> = [];
    
    this.menuCategories.forEach((menus, key) => {
      const firstMenu = menus[0] as any;
      categories.push({
        key: key,
        menus: menus,
        order: firstMenu?.category_order || 999,
        label: firstMenu?.category_label || key.toUpperCase(),
        icon: firstMenu?.category_icon || 'fas fa-folder'
      });
    });
    
    return categories.sort((a, b) => a.order - b.order);
  }

}
