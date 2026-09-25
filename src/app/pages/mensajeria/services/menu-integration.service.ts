import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MessageService } from './message.service';
import { FolderService } from './folder.service';
import { NotificationService } from './notification.service';

export interface MenuNotification {
  id: string;
  type: 'message' | 'conversation' | 'system';
  title: string;
  message: string;
  icon: string;
  color: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  data?: any;
}

export interface MenuStats {
  unreadMessages: number;
  totalMessages: number;
  unreadConversations: number;
  totalConversations: number;
  importantMessages: number;
  draftMessages: number;
}

@Injectable({
  providedIn: 'root'
})
export class MenuIntegrationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private menuNotificationsSubject = new BehaviorSubject<MenuNotification[]>([]);
  private menuStatsSubject = new BehaviorSubject<MenuStats>({
    unreadMessages: 0,
    totalMessages: 0,
    unreadConversations: 0,
    totalConversations: 0,
    importantMessages: 0,
    draftMessages: 0
  });

  public unreadCount$ = this.unreadCountSubject.asObservable();
  public menuNotifications$ = this.menuNotificationsSubject.asObservable();
  public menuStats$ = this.menuStatsSubject.asObservable();

  constructor(
    private messageService: MessageService,
    private folderService: FolderService,
    private notificationService: NotificationService
  ) {
    this.initializeMenuIntegration();
  }

  private initializeMenuIntegration(): void {
    // Subscribe to folder changes to update unread count
    this.folderService.folders$.subscribe(folders => {
      const totalUnread = folders.reduce((total, folder) => {
        return total + (folder.unread_count || 0);
      }, 0);
      this.unreadCountSubject.next(totalUnread);
      this.updateMenuStats();
    });

    // Subscribe to notifications
    this.notificationService.notifications$.subscribe(notifications => {
      const menuNotifications = notifications.map(notification => 
        this.convertToMenuNotification(notification)
      );
      this.menuNotificationsSubject.next(menuNotifications);
    });

    // Initial load
    this.loadInitialStats();
  }

  private loadInitialStats(): void {
    // Load message statistics
    this.messageService.getStatistics().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.updateMenuStats(response.data);
        }
      },
      error: (error: any) => {
        console.error('Error loading message stats:', error);
      }
    });
  }

  private updateMenuStats(stats?: any): void {
    const currentStats = this.menuStatsSubject.value;
    const folders = this.folderService.getCurrentFolders();
    
    const newStats: MenuStats = {
      unreadMessages: folders.reduce((total, folder) => total + (folder.unread_count || 0), 0),
      totalMessages: folders.reduce((total, folder) => total + (folder.message_count || 0), 0),
      unreadConversations: stats?.unread_conversations || currentStats.unreadConversations,
      totalConversations: stats?.total_conversations || currentStats.totalConversations,
      importantMessages: stats?.important_messages || currentStats.importantMessages,
      draftMessages: stats?.draft_messages || currentStats.draftMessages
    };

    this.menuStatsSubject.next(newStats);
  }

  private convertToMenuNotification(notification: any): MenuNotification {
    return {
      id: notification.id.toString(),
      type: notification.type || 'message',
      title: notification.title || 'Nuevo mensaje',
      message: notification.message || notification.content,
      icon: this.getNotificationIcon(notification.type),
      color: this.getNotificationColor(notification.type),
      timestamp: new Date(notification.created_at),
      read: notification.read_at !== null,
      actionUrl: this.getNotificationActionUrl(notification),
      data: notification.data
    };
  }

  private getNotificationIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'message': 'fas fa-envelope',
      'conversation': 'fas fa-comments',
      'system': 'fas fa-cog',
      'important': 'fas fa-star',
      'mention': 'fas fa-at'
    };
    return iconMap[type] || 'fas fa-bell';
  }

  private getNotificationColor(type: string): string {
    const colorMap: { [key: string]: string } = {
      'message': 'primary',
      'conversation': 'info',
      'system': 'secondary',
      'important': 'warning',
      'mention': 'success'
    };
    return colorMap[type] || 'primary';
  }

  private getNotificationActionUrl(notification: any): string {
    const baseUrl = '/mensajeria';
    
    switch (notification.type) {
      case 'message':
        return `${baseUrl}/inbox?message=${notification.data?.message_id}`;
      case 'conversation':
        return `${baseUrl}/conversations?conversation=${notification.data?.conversation_id}`;
      default:
        return baseUrl;
    }
  }

  // Public methods for menu integration
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  getMenuStats(): MenuStats {
    return this.menuStatsSubject.value;
  }

  getMenuStats$(): Observable<MenuStats> {
    return this.menuStatsSubject.asObservable();
  }

  getRecentNotifications(limit: number = 5): MenuNotification[] {
    return this.menuNotificationsSubject.value
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  markNotificationAsRead(notificationId: string): void {
    const notifications = this.menuNotificationsSubject.value;
    const updatedNotifications = notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true }
        : notification
    );
    this.menuNotificationsSubject.next(updatedNotifications);

    // Update on server
    this.notificationService.markAsRead(parseInt(notificationId)).subscribe();
  }

  markAllNotificationsAsRead(): void {
    const notifications = this.menuNotificationsSubject.value;
    const updatedNotifications = notifications.map(notification => 
      ({ ...notification, read: true })
    );
    this.menuNotificationsSubject.next(updatedNotifications);

    // Update on server
    this.notificationService.markAllAsRead().subscribe();
  }

  clearNotification(notificationId: string): void {
    const notifications = this.menuNotificationsSubject.value;
    const updatedNotifications = notifications.filter(
      notification => notification.id !== notificationId
    );
    this.menuNotificationsSubject.next(updatedNotifications);
  }

  // Menu item configuration
  getMenuItems(): any[] {
    const stats = this.getMenuStats();
    
    return [
      {
        id: 'mensajeria',
        title: 'Mensajería',
        icon: 'fas fa-envelope',
        url: '/mensajeria',
        badge: stats.unreadMessages > 0 ? stats.unreadMessages.toString() : null,
        badgeClass: 'badge-primary',
        children: [
          {
            id: 'inbox',
            title: 'Bandeja de entrada',
            icon: 'fas fa-inbox',
            url: '/mensajeria/inbox',
            badge: stats.unreadMessages > 0 ? stats.unreadMessages.toString() : null,
            badgeClass: 'badge-primary'
          },
          {
            id: 'compose',
            title: 'Redactar',
            icon: 'fas fa-edit',
            url: '/mensajeria/compose'
          },
          {
            id: 'conversations',
            title: 'Conversaciones',
            icon: 'fas fa-comments',
            url: '/mensajeria/conversations',
            badge: stats.unreadConversations > 0 ? stats.unreadConversations.toString() : null,
            badgeClass: 'badge-info'
          },
          {
            id: 'sent',
            title: 'Enviados',
            icon: 'fas fa-paper-plane',
            url: '/mensajeria/sent'
          },
          {
            id: 'drafts',
            title: 'Borradores',
            icon: 'fas fa-file-alt',
            url: '/mensajeria/drafts',
            badge: stats.draftMessages > 0 ? stats.draftMessages.toString() : null,
            badgeClass: 'badge-secondary'
          },
          {
            id: 'important',
            title: 'Importantes',
            icon: 'fas fa-star',
            url: '/mensajeria/important',
            badge: stats.importantMessages > 0 ? stats.importantMessages.toString() : null,
            badgeClass: 'badge-warning'
          },
          {
            id: 'trash',
            title: 'Papelera',
            icon: 'fas fa-trash',
            url: '/mensajeria/trash'
          }
        ]
      }
    ];
  }

  // Breadcrumb generation
  generateBreadcrumbs(currentRoute: string): any[] {
    const breadcrumbs = [
      { label: 'Inicio', url: '/' },
      { label: 'Mensajería', url: '/mensajeria' }
    ];

    const routeMap: { [key: string]: string } = {
      '/mensajeria/inbox': 'Bandeja de entrada',
      '/mensajeria/compose': 'Redactar mensaje',
      '/mensajeria/conversations': 'Conversaciones',
      '/mensajeria/sent': 'Mensajes enviados',
      '/mensajeria/drafts': 'Borradores',
      '/mensajeria/important': 'Mensajes importantes',
      '/mensajeria/trash': 'Papelera',
      '/mensajeria/search': 'Búsqueda'
    };

    if (routeMap[currentRoute]) {
      breadcrumbs.push({ label: routeMap[currentRoute], url: currentRoute });
    }

    return breadcrumbs;
  }

  // Quick actions for menu
  getQuickActions(): any[] {
    return [
      {
        id: 'compose',
        title: 'Nuevo mensaje',
        icon: 'fas fa-plus',
        action: 'compose',
        class: 'btn-primary'
      },
      {
        id: 'search',
        title: 'Buscar',
        icon: 'fas fa-search',
        action: 'search',
        class: 'btn-outline-secondary'
      }
    ];
  }

  // Refresh data
  refreshMenuData(): void {
    this.folderService.refreshFolders();
    this.loadInitialStats();
  }

  // Event handlers for menu actions
  handleQuickAction(action: string): void {
    switch (action) {
      case 'compose':
        // Navigate to compose
        window.location.href = '/mensajeria/compose';
        break;
      case 'search':
        // Navigate to search
        window.location.href = '/mensajeria/search';
        break;
    }
  }
}