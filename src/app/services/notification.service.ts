import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Notification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  title?: string;
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notificationSubject = new Subject<Notification>();
  public notifications$ = this.notificationSubject.asObservable();

  constructor() {}

  /**
   * Mostrar notificación de éxito
   */
  success(message: string, title?: string, duration: number = 5000): void {
    this.showNotification({
      type: 'success',
      message,
      title,
      duration
    });
  }

  /**
   * Mostrar notificación de error
   */
  error(message: string, title?: string, duration: number = 8000): void {
    this.showNotification({
      type: 'error',
      message,
      title,
      duration
    });
  }

  /**
   * Mostrar notificación de advertencia
   */
  warning(message: string, title?: string, duration: number = 6000): void {
    this.showNotification({
      type: 'warning',
      message,
      title,
      duration
    });
  }

  /**
   * Mostrar notificación informativa
   */
  info(message: string, title?: string, duration: number = 5000): void {
    this.showNotification({
      type: 'info',
      message,
      title,
      duration
    });
  }

  /**
   * Mostrar notificación personalizada
   */
  private showNotification(notification: Notification): void {
    this.notificationSubject.next(notification);
  }

  /**
   * Limpiar todas las notificaciones
   */
  clear(): void {
    this.notificationSubject.next({
      type: 'info',
      message: '',
      duration: 0
    });
  }
}
