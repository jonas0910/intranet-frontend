import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, interval } from 'rxjs';
import { takeUntil, switchMap, startWith } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';

export interface Notification {
  id: number;
  type: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  data: any;
  message?: {
    id: number;
    subject?: string;
    sender_name: string;
  };
}

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="notification-center" [class.expanded]="isExpanded">
      <!-- Header -->
      <div class="notification-header">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="fas fa-bell mr-2"></i>
            Notificaciones
            <span class="badge badge-primary ml-2" *ngIf="unreadCount > 0">
              {{ unreadCount }}
            </span>
          </h6>
          <div class="notification-actions">
            <button 
              class="btn btn-sm btn-outline-secondary mr-1"
              (click)="markAllAsRead()"
              [disabled]="unreadCount === 0"
              title="Marcar todas como leídas">
              <i class="fas fa-check-double"></i>
            </button>
            <button 
              class="btn btn-sm btn-outline-secondary"
              (click)="refreshNotifications()"
              title="Actualizar">
              <i class="fas fa-sync-alt" [class.fa-spin]="loading"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div class="text-center p-3" *ngIf="loading && notifications.length === 0">
        <div class="spinner-border spinner-border-sm text-primary" role="status">
          <span class="sr-only">Cargando...</span>
        </div>
        <p class="text-muted mt-2 mb-0">Cargando notificaciones...</p>
      </div>

      <!-- Empty State -->
      <div class="text-center p-4" *ngIf="!loading && notifications.length === 0">
        <i class="fas fa-bell-slash text-muted fa-2x mb-3"></i>
        <p class="text-muted mb-0">No hay notificaciones</p>
      </div>

      <!-- Notifications List -->
      <div class="notification-list" *ngIf="notifications.length > 0">
        <div 
          class="notification-item"
          [class.unread]="!notification.is_read"
          [class.urgent]="notification.type === 'urgent_message'"
          *ngFor="let notification of notifications"
          (click)="handleNotificationClick(notification)">
          
          <!-- Notification Icon -->
          <div class="notification-icon">
            <i [class]="getNotificationIcon(notification.type)"></i>
          </div>

          <!-- Notification Content -->
          <div class="notification-content">
            <div class="notification-title">
              {{ notification.title }}
              <span class="unread-indicator" *ngIf="!notification.is_read"></span>
            </div>
            <div class="notification-body">
              {{ notification.body }}
            </div>
            <div class="notification-meta">
              <small class="text-muted">
                {{ formatTime(notification.created_at) }}
              </small>
            </div>
          </div>

          <!-- Notification Actions -->
          <div class="notification-actions-item">
            <button 
              class="btn btn-sm btn-outline-secondary"
              (click)="markAsRead(notification.id, $event)"
              *ngIf="!notification.is_read"
              title="Marcar como leída">
              <i class="fas fa-check"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="notification-footer" *ngIf="notifications.length > 0">
        <a 
          routerLink="/mensajeria/notifications" 
          class="btn btn-sm btn-outline-primary btn-block">
          Ver todas las notificaciones
        </a>
      </div>
    </div>
  `,
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  @Input() isExpanded = false;
  @Output() notificationClick = new EventEmitter<Notification>();
  @Output() unreadCountChange = new EventEmitter<number>();

  private destroy$ = new Subject<void>();
  
  notifications: Notification[] = [];
  unreadCount = 0;
  loading = false;

  constructor(
    private messageService: MessageService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    this.loadNotifications();
    
    // Auto-refresh every 30 seconds
    interval(30000)
      .pipe(
        startWith(0),
        takeUntil(this.destroy$),
        switchMap(() => this.loadNotifications())
      )
      .subscribe();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadNotifications(): void {
    this.loading = true;
    
    this.notificationService.getUserNotifications(20)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (notifications) => {
          this.notifications = notifications;
          this.unreadCount = notifications.filter(n => !n.is_read).length;
          this.unreadCountChange.emit(this.unreadCount);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading notifications:', error);
          this.loading = false;
        }
      });
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  markAsRead(notificationId: number, event: Event): void {
    event.stopPropagation();
    
    this.notificationService.markAsRead(notificationId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (success) => {
          if (success) {
            const notification = this.notifications.find(n => n.id === notificationId);
            if (notification) {
              notification.is_read = true;
              this.unreadCount = Math.max(0, this.unreadCount - 1);
              this.unreadCountChange.emit(this.unreadCount);
            }
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
  }

  markAllAsRead(): void {
    this.notificationService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.notifications.forEach(notification => {
            notification.is_read = true;
          });
          this.unreadCount = 0;
          this.unreadCountChange.emit(this.unreadCount);
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
  }

  handleNotificationClick(notification: Notification): void {
    // Mark as read if unread
    if (!notification.is_read) {
      this.markAsRead(notification.id, new Event('click'));
    }

    // Emit click event
    this.notificationClick.emit(notification);

    // Navigate to message if available
    if (notification.message) {
      // This would be handled by the parent component
      // or we could inject Router and navigate directly
    }
  }

  getNotificationIcon(type: string): string {
    const icons = {
      'new_message': 'fas fa-envelope text-primary',
      'urgent_message': 'fas fa-exclamation-triangle text-danger',
      'reply_received': 'fas fa-reply text-info',
      'message_read': 'fas fa-eye text-success',
      'system_alert': 'fas fa-bullhorn text-warning'
    };
    
    return icons[type] || 'fas fa-bell text-secondary';
  }

  formatTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) {
      return 'Ahora';
    } else if (diffMins < 60) {
      return `Hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `Hace ${diffHours} h`;
    } else if (diffDays < 7) {
      return `Hace ${diffDays} d`;
    } else {
      return date.toLocaleDateString();
    }
  }
}


