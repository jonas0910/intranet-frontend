import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MenuIntegrationService, MenuNotification, MenuStats } from '../../services/menu-integration.service';
import { BadgeService } from '../../../../services/badge.service';
import { MessageComposeComponent } from '../message-compose/message-compose.component';

@Component({
  selector: 'app-mensajeria-navbar',
  standalone: true,
  imports: [CommonModule, MessageComposeComponent],
  templateUrl: './navbar-integration.component.html',
  styleUrls: ['./navbar-integration.component.scss']
})
export class NavbarIntegrationComponent implements OnInit, OnDestroy {
  @Input() showQuickCompose = true;
  @Input() showNotificationDropdown = true;
  @Input() maxNotifications = 5;

  private destroy$ = new Subject<void>();
  
  unreadCount = 0;
  notifications: MenuNotification[] = [];
  stats: MenuStats = {
    unreadMessages: 0,
    totalMessages: 0,
    unreadConversations: 0,
    totalConversations: 0,
    importantMessages: 0,
    draftMessages: 0
  };
  
  // UI State
  showNotifications = false;
  showQuickComposeModal = false;

  constructor(
    private menuIntegrationService: MenuIntegrationService,
    private badgeService: BadgeService
  ) {}

  ngOnInit(): void {
    this.subscribeToMenuData();
    this.subscribeToBadgeService();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private subscribeToMenuData(): void {
    // Subscribe to unread count
    this.menuIntegrationService.unreadCount$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
      });

    // Subscribe to notifications
    this.menuIntegrationService.menuNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        this.notifications = notifications
          .filter(n => !n.read)
          .slice(0, this.maxNotifications);
      });

    // Subscribe to stats
    this.menuIntegrationService.menuStats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        this.stats = stats;
      });
  }

  private subscribeToBadgeService(): void {
    console.log('🎖️ NavbarIntegration: Suscribiendo a BadgeService...');

    // Suscribirse al contador de mensajes no leídos desde BadgeService
    this.badgeService.unreadMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('📬 NavbarIntegration: Mensajes no leídos desde BadgeService:', count);
        this.unreadCount = count;
        this.stats.unreadMessages = count;
      });

    // Suscribirse a conversaciones no leídas
    this.badgeService.unreadConversations$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('💬 NavbarIntegration: Conversaciones no leídas:', count);
        this.stats.unreadConversations = count;
      });

    // Suscribirse a mensajes importantes
    this.badgeService.importantMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('⭐ NavbarIntegration: Mensajes importantes:', count);
        this.stats.importantMessages = count;
      });

    // Suscribirse a borradores
    this.badgeService.draftMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('📝 NavbarIntegration: Borradores:', count);
        this.stats.draftMessages = count;
      });

    console.log('✅ NavbarIntegration: Suscripciones a BadgeService completadas');
  }

  onToggleNotifications(): void {
    this.showNotifications = !this.showNotifications;
  }

  onNotificationClick(notification: MenuNotification): void {
    // Mark as read
    this.menuIntegrationService.markNotificationAsRead(notification.id);
    
    // Navigate to action URL if available
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    
    this.showNotifications = false;
  }

  onMarkAllAsRead(): void {
    this.menuIntegrationService.markAllNotificationsAsRead();
  }

  onClearNotification(notification: MenuNotification, event: Event): void {
    event.stopPropagation();
    this.menuIntegrationService.clearNotification(notification.id);
  }

  onQuickCompose(): void {
    this.showQuickComposeModal = true;
  }

  onCloseQuickCompose(): void {
    this.showQuickComposeModal = false;
  }

  onQuickComposeSuccess(): void {
    this.showQuickComposeModal = false;
    // Show success message or notification
  }

  // Helper methods
  formatNotificationTime(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) {
      return 'Ahora';
    } else if (diffMins < 60) {
      return `${diffMins}m`;
    } else if (diffHours < 24) {
      return `${diffHours}h`;
    } else if (diffDays < 7) {
      return `${diffDays}d`;
    } else {
      return timestamp.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  getNotificationIcon(notification: MenuNotification): string {
    return notification.icon || 'fas fa-bell';
  }

  getNotificationColorClass(notification: MenuNotification): string {
    return `text-${notification.color}` || 'text-primary';
  }

  formatUnreadCount(count: number): string {
    if (count === 0) return '';
    if (count < 100) return count.toString();
    return '99+';
  }

  // Getters for template
  get hasUnreadMessages(): boolean {
    return this.unreadCount > 0;
  }

  get hasNotifications(): boolean {
    return this.notifications.length > 0;
  }

  get unreadNotificationCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }
}