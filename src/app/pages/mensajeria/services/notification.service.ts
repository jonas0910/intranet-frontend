import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

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

export interface NotificationResponse {
  success: boolean;
  data: Notification[];
  unread_count: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = `${environment.apiUrl}/mensajeria/notifications`;
  private messagesUrl = `${environment.apiUrl}/v1/mensajeria`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  private notificationsSubject = new BehaviorSubject<Notification[]>([]);
  public unreadCount$ = this.unreadCountSubject.asObservable();
  public notifications$ = this.notificationsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadUnreadCount();
  }

  /**
   * Get user notifications
   */
  getUserNotifications(limit: number = 20): Observable<Notification[]> {
    const params = new HttpParams().set('limit', limit.toString());

    return this.http.get<NotificationResponse>(this.baseUrl, { params })
      .pipe(
        map(response => {
          if (response.success) {
            this.unreadCountSubject.next(response.unread_count);
            this.notificationsSubject.next(response.data);
            return response.data;
          }
          throw new Error('Failed to load notifications');
        }),
        catchError(error => {
          console.error('Error loading notifications:', error);
          return [];
        })
      );
  }

  /**
   * Mark notification as read
   */
  markAsRead(notificationId: number): Observable<boolean> {
    return this.http.post<{success: boolean}>(`${this.baseUrl}/${notificationId}/read`, {})
      .pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            // Update unread count
            this.loadUnreadCount();
          }
        }),
        catchError(error => {
          console.error('Error marking notification as read:', error);
          return [false];
        })
      );
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead(): Observable<number> {
    return this.http.post<{success: boolean, count: number}>(`${this.baseUrl}/mark-all-read`, {})
      .pipe(
        map(response => response.count),
        tap(count => {
          this.unreadCountSubject.next(0);
        }),
        catchError(error => {
          console.error('Error marking all notifications as read:', error);
          return [0];
        })
      );
  }

  /**
   * Get unread messages count (not notifications, actual messages)
   */
  getUnreadCount(): Observable<number> {
    // Call the messages unread-count endpoint instead of notifications
    return this.http.get<{success: boolean, count: number}>(`${this.messagesUrl}/unread-count`)
      .pipe(
        map(response => {
          console.log('📬 Contador de mensajes no leídos:', response.count);
          return response.count;
        }),
        tap(count => {
          console.log('📊 Actualizando BehaviorSubject con:', count);
          this.unreadCountSubject.next(count);
        }),
        catchError(error => {
          console.error('❌ Error loading unread messages count:', error);
          return [0];
        })
      );
  }

  /**
   * Update unread count in real-time (called by WebSocket events)
   */
  updateUnreadCount(count: number): void {
    console.log('📊 NotificationService: Updating unread count to:', count);
    this.unreadCountSubject.next(count);
  }

  /**
   * Increment unread count (when new message arrives)
   */
  incrementUnreadCount(): void {
    const currentCount = this.unreadCountSubject.value;
    const newCount = currentCount + 1;
    console.log('📊 NotificationService: Incrementing unread count from', currentCount, 'to', newCount);
    this.unreadCountSubject.next(newCount);
  }

  /**
   * Decrement unread count (when message is read)
   */
  decrementUnreadCount(): void {
    const currentCount = this.unreadCountSubject.value;
    const newCount = Math.max(0, currentCount - 1);
    console.log('📊 NotificationService: Decrementing unread count from', currentCount, 'to', newCount);
    this.unreadCountSubject.next(newCount);
  }

  /**
   * Get recent unread notifications/messages
   */
  getRecentNotifications(limit: number = 10): Observable<any> {
    return this.http.get<any>(`${this.messagesUrl}/recent-notifications?limit=${limit}`)
      .pipe(
        tap(response => {
          console.log('📬 Notificaciones recientes obtenidas:', response);
        }),
        catchError(error => {
          console.error('❌ Error loading recent notifications:', error);
          throw error;
        })
      );
  }

  /**
   * Load unread count and update subject
   */
  private loadUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }


  /**
   * Clear all notifications (for testing)
   */
  clearAllNotifications(): Observable<boolean> {
    return this.http.delete<{success: boolean}>(this.baseUrl)
      .pipe(
        map(response => response.success),
        tap(success => {
          if (success) {
            this.unreadCountSubject.next(0);
          }
        }),
        catchError(error => {
          console.error('Error clearing notifications:', error);
          return [false];
        })
      );
  }

  /**
   * Get notification preferences
   */
  getPreferences(): Observable<any> {
    return this.http.get<{success: boolean, data: any}>(`${this.baseUrl}/preferences`)
      .pipe(
        map(response => response.data),
        catchError(error => {
          console.error('Error loading notification preferences:', error);
          return [{}];
        })
      );
  }

  /**
   * Update notification preferences
   */
  updatePreferences(preferences: any): Observable<boolean> {
    return this.http.put<{success: boolean}>(`${this.baseUrl}/preferences`, preferences)
      .pipe(
        map(response => response.success),
        catchError(error => {
          console.error('Error updating notification preferences:', error);
          return [false];
        })
      );
  }

  /**
   * Show success notification (for UI feedback)
   */
  showSuccess(message: string): void {
    console.log('✅ Success:', message);
    // You can integrate with a toast notification library here
    this.showBrowserNotification('Éxito', message, 'success');
  }

  /**
   * Show error notification (for UI feedback)
   */
  showError(message: string): void {
    console.error('❌ Error:', message);
    this.showBrowserNotification('Error', message, 'error');
  }

  /**
   * Show info notification (for UI feedback)
   */
  showInfo(message: string): void {
    console.log('ℹ️ Info:', message);
    this.showBrowserNotification('Información', message, 'info');
  }

  /**
   * Show warning notification (for UI feedback)
   */
  showWarning(message: string): void {
    console.warn('⚠️ Warning:', message);
    this.showBrowserNotification('Advertencia', message, 'warning');
  }

  /**
   * Show browser notification
   */
  private showBrowserNotification(title: string, body: string, type: string = 'info'): void {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: this.getNotificationIcon(type),
          tag: 'mensajeria-notification'
        });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, {
              body: body,
              icon: this.getNotificationIcon(type),
              tag: 'mensajeria-notification'
            });
          }
        });
      }
    }
  }

  /**
   * Get notification icon based on type
   */
  private getNotificationIcon(type: string): string {
    const icons = {
      success: '/assets/img/icons/success.png',
      error: '/assets/img/icons/error.png',
      warning: '/assets/img/icons/warning.png',
      info: '/assets/img/icons/info.png'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }
}