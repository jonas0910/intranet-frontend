import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { NotificationService, Notification } from '../../services/notification.service';

@Component({
  selector: 'app-notification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="notification-container position-fixed top-0 end-0 p-3" style="z-index: 9999;">
      <div *ngFor="let notification of notifications" 
           class="toast show" 
           [ngClass]="getNotificationClass(notification.type)"
           role="alert">
        <div class="toast-header">
          <i [class]="getNotificationIcon(notification.type)" class="me-2"></i>
          <strong class="me-auto">{{notification.title || getDefaultTitle(notification.type)}}</strong>
          <button type="button" class="btn-close" (click)="removeNotification(notification)"></button>
        </div>
        <div class="toast-body">
          {{notification.message}}
        </div>
      </div>
    </div>
  `,
  styles: [`
    .notification-container {
      max-width: 400px;
    }
    
    .toast {
      margin-bottom: 0.5rem;
      border: none;
      box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    }
    
    .toast-success {
      background-color: #d1e7dd;
      color: #0f5132;
    }
    
    .toast-error {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .toast-warning {
      background-color: #fff3cd;
      color: #856404;
    }
    
    .toast-info {
      background-color: #d1ecf1;
      color: #0c5460;
    }
  `]
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  private subscription: Subscription = new Subscription();

  constructor(private notificationService: NotificationService) {}

  ngOnInit(): void {
    this.subscription = this.notificationService.notifications$.subscribe(
      (notification: Notification) => {
        if (notification.message) {
          this.addNotification(notification);
        } else {
          this.clearNotifications();
        }
      }
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private addNotification(notification: Notification): void {
    this.notifications.push(notification);
    
    // Auto-remove notification after duration
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        this.removeNotification(notification);
      }, notification.duration);
    }
  }

  removeNotification(notification: Notification): void {
    const index = this.notifications.indexOf(notification);
    if (index > -1) {
      this.notifications.splice(index, 1);
    }
  }

  private clearNotifications(): void {
    this.notifications = [];
  }

  getNotificationClass(type: string): string {
    switch (type) {
      case 'success': return 'toast-success';
      case 'error': return 'toast-error';
      case 'warning': return 'toast-warning';
      case 'info': return 'toast-info';
      default: return 'toast-info';
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'success': return 'fas fa-check-circle text-success';
      case 'error': return 'fas fa-exclamation-circle text-danger';
      case 'warning': return 'fas fa-exclamation-triangle text-warning';
      case 'info': return 'fas fa-info-circle text-info';
      default: return 'fas fa-info-circle text-info';
    }
  }

  getDefaultTitle(type: string): string {
    switch (type) {
      case 'success': return 'Éxito';
      case 'error': return 'Error';
      case 'warning': return 'Advertencia';
      case 'info': return 'Información';
      default: return 'Notificación';
    }
  }
}
