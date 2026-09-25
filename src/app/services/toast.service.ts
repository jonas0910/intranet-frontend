import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration: number;
  autoClose: boolean;
  /** 'broadcast' = centrado, más ancho, mayor duración y texto con desplazamiento horizontal */
  variant?: 'default' | 'broadcast';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toastSubject = new Subject<Toast>();
  public toasts$ = this.toastSubject.asObservable();
  
  private toastCounter = 0;

  /**
   * Show a success toast notification
   */
  success(message: string, title: string = 'Éxito', duration: number = 3000): void {
    this.show({
      id: this.generateId(),
      type: 'success',
      title,
      message,
      duration,
      autoClose: true
    });
  }

  /**
   * Show an error toast notification
   */
  error(message: string, title: string = 'Error', duration: number = 5000): void {
    this.show({
      id: this.generateId(),
      type: 'error',
      title,
      message,
      duration,
      autoClose: true
    });
  }

  /**
   * Show a warning toast notification
   */
  warning(message: string, title: string = 'Advertencia', duration: number = 4000): void {
    this.show({
      id: this.generateId(),
      type: 'warning',
      title,
      message,
      duration,
      autoClose: true
    });
  }

  /**
   * Show an info toast notification
   */
  info(message: string, title: string = 'Información', duration: number = 3000): void {
    this.show({
      id: this.generateId(),
      type: 'info',
      title,
      message,
      duration,
      autoClose: true
    });
  }

  /**
   * Toast de comunicado en pantalla: centrado, más ancho, mayor duración y texto con desplazamiento horizontal.
   * Usado para "Mostrar en línea" desde admin comunicados.
   */
  broadcast(title: string, message: string, type: 'info' | 'warning' = 'info', duration: number = 20000): void {
    this.show({
      id: this.generateId(),
      type,
      title,
      message,
      duration,
      autoClose: true,
      variant: 'broadcast'
    });
  }

  /**
   * Show a custom toast notification
   */
  private show(toast: Toast): void {
    this.toastSubject.next(toast);
  }

  /**
   * Generate unique ID for toast
   */
  private generateId(): string {
    return `toast-${Date.now()}-${this.toastCounter++}`;
  }
}












