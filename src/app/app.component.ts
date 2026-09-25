import { Component, OnInit, Inject, PLATFORM_ID, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterOutlet, RouterModule, Router, NavigationEnd } from '@angular/router';
import { AuthService, User } from './services/auth.service';
import { Subject, takeUntil, filter } from 'rxjs';
import { NotificationComponent } from './components/notification/notification.component';
import { StableLoadingComponent } from './components/stable-loading/stable-loading.component';
import { AdminLTEStabilizerService } from './services/adminlte-stabilizer.service';
import { AdminLTEInitService } from './services/adminlte-init.service';
import { NgbDropdownModule, NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { NavbarIntegrationComponent } from './pages/mensajeria/components/navbar-integration/navbar-integration.component';
import { NotificationCenterComponent } from './components/notification-center/notification-center.component';
import { BadgeService } from './services/badge.service';
import { ThemeService } from './services/theme.service';
import { DesignSystemService } from './services/design-system.service';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { ModalMensajeComunicadosContainerComponent } from './components/modal-mensaje-comunicados/modal-mensaje-comunicados-container.component';
import { ComunicadosModalService } from './services/comunicados-modal.service';
import { ChatSidebarSystemComponent } from './components/chat-sidebar-system/chat-sidebar-system.component';
import { TranslateService, TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterModule, NotificationComponent, StableLoadingComponent, NgbDropdownModule, NgbModalModule, FormsModule, NavbarIntegrationComponent, NotificationCenterComponent, SidebarComponent, ToastContainerComponent, ModalMensajeComunicadosContainerComponent, ChatSidebarSystemComponent, TranslateModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'Intranet Notaria - AdminLTE 3.2.0';
  currentUser: User | null = null;
  isLoggedIn = false;
  currentYear = new Date().getFullYear();

  // Subscription management
  private destroy$ = new Subject<void>();

  // Counters
  notificationCount = 5;
  messageCount = 3;
  private unreadMessageCount = 5;
  private unreadConversationCount = 2;
  private draftCount = 3;
  private importantCount = 1;

  constructor(
    private authService: AuthService,
    private router: Router,
    private adminLTEStabilizer: AdminLTEStabilizerService,
    private adminLTEInit: AdminLTEInitService,
    private badgeService: BadgeService,
    private themeService: ThemeService,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID) private platformId: Object,
    private designSystemService: DesignSystemService,
    private comunicadosModalService: ComunicadosModalService,
    private translate: TranslateService
  ) { 
    // This language will be used as a fallback when a translation isn't found in the current language
    this.translate.setDefaultLang('es');
    // The lang to use, if the lang isn't available, it will use the current loader to get them
    this.translate.use('es');
  }

  // ===== LIFECYCLE =====

  ngOnInit(): void {
    this.themeService.loadTheme();
    this.themeService.watchSystemTheme();
    this.designSystemService.applyCrudViewCssVariables();

    this.isLoggedIn = this.authService.isLoggedIn();
    this.currentUser = this.authService.getCurrentUser();

    this.subscribeToUserChanges();
    this.subscribeToRouteChanges();
    this.initializeMessagingIntegration();
    this.showComunicadosIfNeeded();
    this.initializeAdminLTEIfReady();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.adminLTEStabilizer.cleanup();
  }

  // ===== AUTH SUBSCRIPTIONS =====

  private subscribeToUserChanges(): void {
    this.authService.currentUser$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(user => {
      this.currentUser = user;
      const wasLoggedIn = this.isLoggedIn;
      this.isLoggedIn = !!user;

      // Al iniciar sesión, mostrar comunicados
      if (!wasLoggedIn && this.isLoggedIn && isPlatformBrowser(this.platformId)) {
        setTimeout(() => this.comunicadosModalService.checkAndShowModales(), 2000);
      }

      // Al cerrar sesión
      if (wasLoggedIn && !this.isLoggedIn) {
        this.adminLTEStabilizer.cleanup();
        this.adminLTEInit.applyLoginClasses();

        const currentUrl = this.router.url;
        if (currentUrl !== '/login' && currentUrl !== '/') {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  private subscribeToRouteChanges(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((event: NavigationEnd) => {
      const isLoginRoute = event.url === '/login' || event.url === '/';

      // Apply Design System CSS variables for the current route
      if (this.isLoggedIn && !isLoginRoute) {
        const subsystemId = this.designSystemService.getSubsystemIdFromUrl(event.url);
        this.designSystemService.applyCrudViewCssVariables(subsystemId || undefined);
      }

      // Initialize AdminLTE once if needed
      if (this.isLoggedIn && !isLoginRoute && isPlatformBrowser(this.platformId) && !this.adminLTEStabilizer.isStable()) {
        this.adminLTEInit.applyNavigationClasses();
        this.adminLTEStabilizer.initializeStable().catch(error => {
          console.error('❌ Error inicializando AdminLTE:', error);
        });
      }
    });
  }

  private showComunicadosIfNeeded(): void {
    if (this.isLoggedIn && isPlatformBrowser(this.platformId) && this.router.url !== '/login' && this.router.url !== '/') {
      setTimeout(() => this.comunicadosModalService.checkAndShowModales(), 2500);
    }
  }

  private initializeAdminLTEIfReady(): void {
    if (this.isLoggedIn && isPlatformBrowser(this.platformId) && !this.adminLTEStabilizer.isStable()) {
      const currentUrl = this.router.url;
      if (currentUrl !== '/login' && currentUrl !== '/') {
        this.adminLTEStabilizer.initializeStable().catch(error => {
          console.error('❌ Error inicializando AdminLTE:', error);
        });
      }
    }
  }

  // ===== NAVBAR / USER ACTIONS =====

  toggleSidebar(event?: Event): void {
    if (event) event.preventDefault();
    this.adminLTEInit.toggleSidebar();
  }

  logout(): void {
    try {
      this.isLoggedIn = false;
      this.currentUser = null;
      this.adminLTEStabilizer.cleanup();
      this.adminLTEInit.applyLoginClasses();
      this.authService.logout();
    } catch (error) {
      console.error('❌ Error durante el logout:', error);
      this.router.navigate(['/login']);
    }
  }

  showUserProfile(): void {
    this.adminLTEInit.closeUserMenu();
    if (this.currentUser) this.router.navigate(['/perfil']);
  }

  openConfiguration(): void {
    this.adminLTEInit.closeUserMenu();
    this.router.navigate(['/configuracion']);
  }

  openMessages(): void {
    this.adminLTEInit.closeUserMenu();
    console.log('📧 Abriendo mensajes...');
  }

  openNotifications(): void {
    this.adminLTEInit.closeUserMenu();
    this.router.navigate(['/notificaciones']);
  }

  markAllNotificationsAsRead(): void {
    this.notificationCount = 0;
  }

  viewAllMessages(): void {
    console.log('📧 Ver todos los mensajes...');
  }

  // ===== USER INFO =====

  getUserDisplayName(): string {
    if (this.currentUser?.empleado?.nombres && this.currentUser?.empleado?.apellidos) {
      return `${this.currentUser.empleado.nombres} ${this.currentUser.empleado.apellidos}`;
    }
    return this.currentUser?.name || 'Usuario';
  }

  getUserRole(): string {
    if (this.currentUser?.roles?.length) return this.currentUser.roles[0];
    return 'Empleado Notaria';
  }

  /** Puesto visible: Planillas `position` o legado `empleado.cargo`. */
  getUserCargoLabel(): string {
    const u = this.currentUser as any;
    if (!u) return 'Empleado Notaria';
    const pos = u.employee?.position?.name;
    if (pos && String(pos).trim()) return String(pos).trim();
    if (u.empleado?.cargo && String(u.empleado.cargo).trim()) return String(u.empleado.cargo).trim();
    return 'Empleado Notaria';
  }

  /**
   * Departamento del usuario al iniciar sesión (misma prioridad que /perfil):
   * `user.department` → `employee.department` → `empleado.departamento`.
   */
  getUserDepartmentLabel(): string {
    const u = this.currentUser as any;
    if (!u) return '';
    const ud = u.department;
    if (ud && (ud.nombre || ud.name)) {
      return String(ud.nombre ?? ud.name ?? '').trim();
    }
    if (u.employee?.department?.name) {
      return String(u.employee.department.name).trim();
    }
    if (u.empleado?.departamento?.nombre) {
      return String(u.empleado.departamento.nombre).trim();
    }
    return '';
  }

  isAdminUser(): boolean {
    if (!this.currentUser?.roles?.length) return false;
    const adminRoles = ['admin', 'administrador', 'superadmin', 'Administrador Sistema'];
    return this.currentUser.roles.some((r: string) =>
      adminRoles.some(ar => String(r).toLowerCase().includes(ar.toLowerCase()))
    );
  }

  // ===== MESSAGING COUNTERS =====

  getUnreadMessageCount(): number { return this.unreadMessageCount; }
  getUnreadConversationCount(): number { return this.unreadConversationCount; }
  getDraftCount(): number { return this.draftCount; }
  getImportantCount(): number { return this.importantCount; }

  getCurrentTime(): string {
    return new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }

  // ===== DEBUG =====

  onImageError(event: any): void { console.error('Error cargando imagen:', event.target.src); }
  onImageLoad(_event: any): void { /* noop */ }

  // ===== ROUTE DETECTION =====

  isLoginRoute(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    try {
      const currentUrl = window.location.pathname;
      return currentUrl === '/login' || currentUrl === '/';
    } catch { return false; }
  }

  shouldShowMainLayout(): boolean {
    return this.isLoggedIn && !this.isLoginRoute();
  }

  // ===== MESSAGING INTEGRATION =====

  private initializeMessagingIntegration(): void {
    if (!this.isLoggedIn) return;

    this.badgeService.initialize();

    this.badgeService.unreadMessages$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.unreadMessageCount = count;
      this.messageCount = count;
      this.cdr.detectChanges();
    });

    this.badgeService.unreadConversations$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.unreadConversationCount = count;
      this.cdr.detectChanges();
    });

    this.badgeService.draftMessages$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.draftCount = count;
      this.cdr.detectChanges();
    });

    this.badgeService.importantMessages$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.importantCount = count;
      this.cdr.detectChanges();
    });

    this.badgeService.totalNotifications$.pipe(takeUntil(this.destroy$)).subscribe(count => {
      this.notificationCount = count;
      this.cdr.detectChanges();
    });
  }
}