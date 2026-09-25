import { Component, OnInit, OnDestroy, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  NotificationCenterService,
  UnifiedNotification,
  NotificationType,
  NotificationStats
} from '../../services/notification-center.service';

@Component({
  selector: 'app-notification-center',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './notification-center.component.html',
  styleUrls: ['./notification-center.component.scss']
})
export class NotificationCenterComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Datos
  notifications: UnifiedNotification[] = [];
  filteredNotifications: UnifiedNotification[] = [];
  stats: NotificationStats = { total: 0, unread: 0, byType: {} };

  // UI State
  isOpen = false;
  activeFilter: NotificationType | 'all' = 'all';
  showSettings = false;

  // Tipos de notificación para filtros
  NotificationType = NotificationType;

  filterOptions: Array<{ value: NotificationType | 'all', label: string, icon: string, color: string }> = [
    { value: 'all' as const, label: 'Todas', icon: 'fas fa-bell', color: '#6c757d' },
    { value: NotificationType.MESSAGE, label: 'Mensajes', icon: 'fas fa-envelope', color: '#007bff' },
    { value: NotificationType.CONVERSATION, label: 'Conversaciones', icon: 'fas fa-comments', color: '#17a2b8' },
    { value: NotificationType.REPORT, label: 'Informes', icon: 'fas fa-file-alt', color: '#6f42c1' },
    { value: NotificationType.ANNOUNCEMENT, label: 'Avisos', icon: 'fas fa-bullhorn', color: '#ffc107' },
    { value: NotificationType.ALERT, label: 'Alertas', icon: 'fas fa-exclamation-triangle', color: '#dc3545' },
    { value: NotificationType.MAINTENANCE, label: 'Mantenimientos', icon: 'fas fa-wrench', color: '#fd7e14' },
    { value: NotificationType.TASK, label: 'Tareas', icon: 'fas fa-tasks', color: '#28a745' },
    { value: NotificationType.DOCUMENT, label: 'Documentos', icon: 'fas fa-file', color: '#20c997' },
    { value: NotificationType.APPROVAL, label: 'Aprobaciones', icon: 'fas fa-check-circle', color: '#28a745' },
    { value: NotificationType.SYSTEM, label: 'Sistema', icon: 'fas fa-cog', color: '#6c757d' }
  ];

  constructor(
    private notificationCenter: NotificationCenterService,
    private router: Router,
    private elementRef: ElementRef
  ) {
    console.log('🔔 NotificationCenterComponent: Constructor llamado');
  }

  ngOnInit(): void {
    console.log('🔔 NotificationCenterComponent: Inicializando...');

    // Inicializar el servicio
    this.notificationCenter.initialize();

    // Suscribirse a notificaciones
    this.notificationCenter.notifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(notifications => {
        console.log('🔔 Notificaciones recibidas:', notifications.length);
        this.notifications = notifications;
      });

    // Suscribirse a notificaciones filtradas
    this.notificationCenter.filteredNotifications$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filtered => {
        console.log('🔔 Notificaciones filtradas:', filtered.length);
        this.filteredNotifications = filtered;
      });

    // Suscribirse a estadísticas
    this.notificationCenter.stats$
      .pipe(takeUntil(this.destroy$))
      .subscribe(stats => {
        console.log('🔔 Estadísticas actualizadas:', stats);
        this.stats = stats;
      });

    // Suscribirse a cambios de filtro
    this.notificationCenter.filter$
      .pipe(takeUntil(this.destroy$))
      .subscribe(filter => {
        this.activeFilter = filter;
      });

    // Solicitar permisos para notificaciones del navegador
    this.requestNotificationPermission();

    console.log('✅ NotificationCenterComponent: Inicialización completada');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle del panel de notificaciones
   */
  togglePanel(): void {
    this.isOpen = !this.isOpen;
    console.log('🔔 Panel de notificaciones:', this.isOpen ? 'abierto' : 'cerrado');
  }

  /**
   * Cierra el panel
   */
  closePanel(): void {
    this.isOpen = false;
    this.showSettings = false;
  }

  /**
   * Maneja click en una notificación
   */
  onNotificationClick(notification: UnifiedNotification, event: Event): void {
    event.stopPropagation();

    console.log('🔔 Click en notificación:', notification.id);

    // Eliminar la notificación (ya que el usuario la ha clickeado y será dirigido al chat)
    this.notificationCenter.removeNotification(notification.id);

    // Navegar si tiene URL
    if (notification.actionUrl) {
      console.log('🔔 Navegando a:', notification.actionUrl);
      this.router.navigateByUrl(notification.actionUrl);
      this.closePanel();
    }
  }

  /**
   * Marca una notificación como leída sin navegación
   */
  markAsRead(notification: UnifiedNotification, event: Event): void {
    event.stopPropagation();
    this.notificationCenter.markAsRead(notification.id);
  }

  /**
   * Elimina una notificación
   */
  removeNotification(notification: UnifiedNotification, event: Event): void {
    event.stopPropagation();
    this.notificationCenter.removeNotification(notification.id);
  }

  /**
   * Marca todas como leídas
   */
  markAllAsRead(): void {
    this.notificationCenter.markAllAsRead();
  }

  /**
   * Limpia notificaciones leídas
   */
  clearReadNotifications(): void {
    if (confirm('¿Desea eliminar todas las notificaciones leídas?')) {
      this.notificationCenter.clearReadNotifications();
    }
  }

  /**
   * Cambia el filtro activo
   */
  setFilter(filter: NotificationType | 'all'): void {
    this.activeFilter = filter;
    this.notificationCenter.setFilter(filter);
  }

  /**
   * Toggle de configuración
   */
  toggleSettings(): void {
    this.showSettings = !this.showSettings;
  }

  /**
   * Solicita permisos para notificaciones
   */
  async requestNotificationPermission(): Promise<void> {
    const permission = await this.notificationCenter.requestNotificationPermission();
    console.log('🔔 Permisos de notificación:', permission);
  }

  /**
   * Formatea la fecha relativa
   */
  getRelativeTime(timestamp: Date): string {
    const now = new Date();
    const date = new Date(timestamp);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  /**
   * Obtiene el badge formateado
   */
  getUnreadBadge(): string {
    const count = this.stats.unread;
    if (count === 0) return '';
    if (count > 99) return '99+';
    return count.toString();
  }

  /**
   * Obtiene el color del badge según prioridad
   */
  getPriorityBadgeClass(priority?: string): string {
    switch (priority) {
      case 'urgent': return 'badge-danger';
      case 'high': return 'badge-warning';
      case 'normal': return 'badge-info';
      case 'low': return 'badge-secondary';
      default: return 'badge-info';
    }
  }

  /**
   * Obtiene texto de prioridad
   */
  getPriorityText(priority?: string): string {
    switch (priority) {
      case 'urgent': return 'Urgente';
      case 'high': return 'Alta';
      case 'normal': return 'Normal';
      case 'low': return 'Baja';
      default: return '';
    }
  }

  /**
   * Cierra el panel al hacer click fuera
   */
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closePanel();
    }
  }

  /**
   * Previene el cierre al hacer click dentro
   */
  onClickInside(event: Event): void {
    event.stopPropagation();
  }

  /**
   * Verifica si hay notificaciones no leídas
   */
  get hasUnread(): boolean {
    return this.stats.unread > 0;
  }

  /**
   * Verifica si hay notificaciones
   */
  get hasNotifications(): boolean {
    return this.notifications.length > 0;
  }

  /**
   * Obtiene contador por tipo de filtro
   */
  getFilterCount(filterValue: NotificationType | 'all'): number {
    if (filterValue === 'all') {
      return this.stats.unread;
    }
    return this.stats.byType[filterValue] || 0;
  }
}

