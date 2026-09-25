import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject, combineLatest } from 'rxjs';
import { takeUntil, map } from 'rxjs/operators';
import { BadgeService } from './badge.service';
import { MessageService } from '../pages/mensajeria/services/message.service';
import { CustomEchoWebSocketService } from './custom-echo-websocket.service';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { environment } from '../../environments/environment';

export enum NotificationType {
  MESSAGE = 'message',
  CONVERSATION = 'conversation',
  REPORT = 'report',
  ANNOUNCEMENT = 'announcement',
  ALERT = 'alert',
  TASK = 'task',
  DOCUMENT = 'document',
  APPROVAL = 'approval',
  SYSTEM = 'system',
  MAINTENANCE = 'maintenance'
}

export interface UnifiedNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  icon: string;
  iconColor: string;
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: { [key in NotificationType]?: number };
}

/**
 * Servicio centralizado para gestionar TODAS las notificaciones del sistema
 * Unifica mensajes, conversaciones, informes, avisos, alertas, etc.
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationCenterService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // Almacenamiento de notificaciones
  private notificationsSubject = new BehaviorSubject<UnifiedNotification[]>([]);
  public notifications$: Observable<UnifiedNotification[]> = this.notificationsSubject.asObservable();

  // Estadísticas
  private statsSubject = new BehaviorSubject<NotificationStats>({
    total: 0,
    unread: 0,
    byType: {}
  });
  public stats$: Observable<NotificationStats> = this.statsSubject.asObservable();

  // Filtro activo
  private filterSubject = new BehaviorSubject<NotificationType | 'all'>('all');
  public filter$: Observable<NotificationType | 'all'> = this.filterSubject.asObservable();

  // Notificaciones filtradas
  public filteredNotifications$: Observable<UnifiedNotification[]>;

  // Estado de inicialización
  private initialized = false;

  constructor(
    private badgeService: BadgeService,
    private messageService: MessageService,
    private echoService: CustomEchoWebSocketService,
    private authService: AuthService,
    private toast: ToastService
  ) {
    console.log('🔔 NotificationCenterService: Servicio iniciado');

    // Configurar notificaciones filtradas
    this.filteredNotifications$ = combineLatest([
      this.notifications$,
      this.filter$
    ]).pipe(
      map(([notifications, filter]) => {
        if (filter === 'all') {
          return notifications;
        }
        return notifications.filter(n => n.type === filter);
      })
    );
  }

  /**
   * Inicializa el servicio y carga notificaciones
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('🔔 NotificationCenterService: Ya está inicializado');
      return;
    }

    console.log('🔔 NotificationCenterService: Inicializando...');
    this.initialized = true;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      console.warn('⚠️ NotificationCenterService: No hay usuario autenticado');
      return;
    }

    // Conectar WebSocket primero para que las suscripciones se envíen al abrir la conexión
    this.echoService.connect();

    // Cargar notificaciones iniciales
    this.loadInitialNotifications();

    // Suscribirse a WebSocket
    this.subscribeToWebSocket(currentUser.id);

    // Suscribirse a cambios en badges para actualizar contadores
    this.subscribeToBadgeService();

    console.log('✅ NotificationCenterService: Inicialización completada');
  }

  /**
   * Carga las notificaciones iniciales desde el servidor
   */
  private loadInitialNotifications(): void {
    console.log('📥 NotificationCenterService: Cargando notificaciones iniciales...');

    // Cargar mensajes no leídos
    this.loadMessageNotifications();

    // Cargar otras notificaciones (informes, avisos, etc.)
    this.loadSystemNotifications();

    console.log('✅ NotificationCenterService: Notificaciones iniciales cargadas');
  }

  /**
   * Carga notificaciones de mensajes
   */
  private loadMessageNotifications(): void {
    this.messageService.getRecentMessages(10).subscribe({
      next: (response: any) => {
        const messages = Array.isArray(response.data?.data)
          ? response.data.data
          : (Array.isArray(response.data) ? response.data : []);

        const messageNotifications: UnifiedNotification[] = messages
          .filter((msg: any) => msg.is_read === false || msg.is_read === 0 || msg.leido === false)
          .map((msg: any) => this.messageToNotification(msg));

        this.addNotifications(messageNotifications);
      },
      error: (error) => {
        console.error('❌ NotificationCenterService: Error cargando mensajes:', error);
      }
    });
  }

  /**
   * Carga notificaciones del sistema (avisos, informes, etc.)
   */
  private loadSystemNotifications(): void {
    // Solo cargar ejemplos en modo desarrollo
    if (!environment.production) {
      console.log('🔔 Notificaciones de ejemplo solo en modo desarrollo');
    }
  }

  /**
   * Convierte un mensaje en una notificación unificada
   */
  private messageToNotification(message: any): UnifiedNotification {
    const senderName = message.sender?.name || 'Usuario';
    const conversationId = message.conversation_id || message.canal_id;

    return {
      id: `msg-${message.id}`,
      type: NotificationType.CONVERSATION,
      title: `Mensaje de ${senderName}`,
      message: this.truncateText(message.content, 60),
      icon: 'fas fa-comments',
      iconColor: '#17a2b8',
      timestamp: new Date(message.created_at || message.sent_at),
      read: message.is_read || false,
      actionUrl: conversationId ? `/mensajeria/chat?conversationId=${conversationId}` : '/mensajeria/chat',
      actionLabel: 'Responder',
      priority: 'normal',
      metadata: {
        messageId: message.id,
        conversationId: conversationId,
        senderId: message.sender_id
      }
    };
  }

  /**
   * Suscribe a eventos WebSocket
   */
  private subscribeToWebSocket(userId: number): void {
    console.log('🔌 NotificationCenterService: Suscribiendo a WebSocket...');

    const userChannel = `user.${userId}`;

    // Escuchar nuevos mensajes
    this.echoService.listenToChannel(
      userChannel,
      'message.received',
      (data: any) => {
        console.log('📨 NotificationCenterService: Nuevo mensaje recibido:', data);
        const messageData = data.message || data;
        const notification = this.messageToNotification(messageData);
        this.addNotification(notification);
        this.showBrowserNotification(notification);
      }
    );

    // Escuchar mensajes leídos
    this.echoService.listenToChannel(
      userChannel,
      'message.read',
      (data: any) => {
        console.log('✅ NotificationCenterService: Mensajes leídos en conversación:', data);
        if (data.conversation_id) {
          this.removeNotificationsByConversation(data.conversation_id);
        } else if (data.message_id) {
          this.markNotificationAsRead(`msg-${data.message_id}`);
        }
      }
    );

    // Escuchar notificaciones del sistema
    this.echoService.listenToChannel(
      userChannel,
      'notification.sent',
      (data: any) => {
        console.log('🔔 NotificationCenterService: Nueva notificación del sistema:', data);
        this.addNotification(data.notification);
        this.showBrowserNotification(data.notification);
      }
    );

    // Comunicado enviado en línea a todos los terminales (toast)
    this.echoService.listenToChannel(
      'intranet.comunicados',
      'ComunicadoToast',
      (data: any) => {
        const titulo = data.titulo || 'Comunicado';
        const mensaje = data.contenido || '';
        const tipo = (data.tipo || 'noticia') as string;
        if (tipo === 'alerta' || tipo === 'urgente' || data.prioridad === 'urgente') {
          this.toast.broadcast(titulo, mensaje, 'warning');
        } else {
          this.toast.broadcast(titulo, mensaje, 'info');
        }
      }
    );

    // Escuchar alertas de Seguridad Ciudadana (Global)
    this.echoService.listenToChannel(
      'seguridad-ciudadana.alertas',
      'AlertaRecibida',
      (data: any) => {
        console.log('🚨 NotificationCenterService: Alerta de Seguridad recibida:', data);

        const notification: UnifiedNotification = {
          id: `alert-${data.id}`,
          type: NotificationType.ALERT,
          title: `🚨 ALERTA: ${data.tipo_nombre || 'Emergencia'}`,
          message: `${data.personal_nombres} ${data.personal_apellidos}: ${data.mensaje || 'Reportó una emergencia en tiempo real'}`,
          icon: 'fas fa-exclamation-triangle',
          iconColor: data.tipo_color_hex || '#dc3545',
          timestamp: new Date(data.created_at || new Date()),
          read: false,
          actionUrl: '/seguridad-ciudadana/mapa-personal',
          actionLabel: 'Ver en mapa',
          priority: 'urgent',
          metadata: {
            alertaId: data.id,
            personalId: data.id_personal,
            latitud: data.latitud,
            longitud: data.longitud
          }
        };

        this.addNotification(notification);
        this.showBrowserNotification(notification);
      }
    );

    console.log('✅ NotificationCenterService: Suscripciones WebSocket configuradas');
  }

  /**
   * Suscribe a cambios en el BadgeService
   */
  private subscribeToBadgeService(): void {
    // Actualizar estadísticas cuando cambien los badges
    combineLatest([
      this.badgeService.unreadMessages$,
      this.badgeService.unreadConversations$,
      this.badgeService.importantMessages$
    ]).pipe(
      takeUntil(this.destroy$)
    ).subscribe(([messages, conversations, important]) => {
      this.updateStats();
    });
  }

  /**
   * Agrega una notificación
   */
  public addNotification(notification: UnifiedNotification): void {
    const notifications = this.notificationsSubject.value;

    // Evitar duplicados
    const exists = notifications.some(n => n.id === notification.id);
    if (exists) {
      console.log('⚠️ NotificationCenterService: Notificación duplicada ignorada:', notification.id);
      return;
    }

    // Agregar al inicio de la lista
    const updated = [notification, ...notifications];

    // Limitar a 50 notificaciones más recientes
    if (updated.length > 50) {
      updated.splice(50);
    }

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Notificación agregada:', notification.id);
  }

  /**
   * Agrega múltiples notificaciones
   */
  public addNotifications(notifications: UnifiedNotification[]): void {
    const current = this.notificationsSubject.value;

    // Filtrar duplicados
    const newNotifications = notifications.filter(
      n => !current.some(c => c.id === n.id)
    );

    if (newNotifications.length === 0) {
      return;
    }

    // Agregar al inicio y limitar a 50
    const updated = [...newNotifications, ...current].slice(0, 50);

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Notificaciones agregadas:', newNotifications.length);
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updated = notifications.map(n =>
      n.id === notificationId ? { ...n, read: true } : n
    );

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Notificación marcada como leída:', notificationId);
  }

  /**
   * Marca una notificación como leída (alias)
   */
  public markNotificationAsRead(notificationId: string): void {
    this.markAsRead(notificationId);
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): void {
    const notifications = this.notificationsSubject.value;
    const updated = notifications.map(n => ({ ...n, read: true }));

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Todas las notificaciones marcadas como leídas');
  }

  /**
   * Elimina una notificación
   */
  public removeNotification(notificationId: string): void {
    const notifications = this.notificationsSubject.value;
    const updated = notifications.filter(n => n.id !== notificationId);

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Notificación eliminada:', notificationId);
  }

  /**
   * Limpia todas las notificaciones leídas
   */
  public clearReadNotifications(): void {
    const notifications = this.notificationsSubject.value;
    const updated = notifications.filter(n => !n.read);

    this.notificationsSubject.next(updated);
    this.updateStats();

    console.log('✅ NotificationCenterService: Notificaciones leídas eliminadas');
  }

  /**
   * Elimina todas las notificaciones de una conversación
   */
  public removeNotificationsByConversation(conversationId: number): void {
    const notifications = this.notificationsSubject.value;
    const updated = notifications.filter(n =>
      !(n.type === NotificationType.CONVERSATION && n.metadata?.conversationId == conversationId)
    );

    if (updated.length !== notifications.length) {
      this.notificationsSubject.next(updated);
      this.updateStats();
      console.log(`✅ NotificationCenterService: Notificaciones de conversación ${conversationId} eliminadas`);
    }
  }

  /**
   * Establece el filtro activo
   */
  public setFilter(filter: NotificationType | 'all'): void {
    this.filterSubject.next(filter);
    console.log('🔍 NotificationCenterService: Filtro establecido:', filter);
  }

  /**
   * Actualiza las estadísticas
   */
  private updateStats(): void {
    const notifications = this.notificationsSubject.value;

    const stats: NotificationStats = {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: {}
    };

    // Contar por tipo
    Object.values(NotificationType).forEach(type => {
      const count = notifications.filter(n => n.type === type && !n.read).length;
      if (count > 0) {
        stats.byType[type] = count;
      }
    });

    this.statsSubject.next(stats);
  }

  /**
   * Muestra notificación del navegador
   */
  private showBrowserNotification(notification: UnifiedNotification): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      const browserNotification = new Notification(notification.title, {
        body: notification.message,
        icon: '/assets/img/icons/notification.png',
        badge: '/assets/img/icons/badge.png',
        tag: notification.id,
        requireInteraction: notification.priority === 'urgent'
      });

      browserNotification.onclick = () => {
        window.focus();
        if (notification.actionUrl) {
          window.location.href = notification.actionUrl;
        }
        browserNotification.close();
      };
    }
  }

  /**
   * Solicita permisos para notificaciones del navegador
   */
  public requestNotificationPermission(): Promise<NotificationPermission> {
    if ('Notification' in window) {
      return Notification.requestPermission();
    }
    return Promise.resolve('denied');
  }

  /**
   * Obtiene el total de notificaciones no leídas
   */
  public getUnreadCount(): number {
    return this.statsSubject.value.unread;
  }

  /**
   * Trunca texto
   */
  private truncateText(text: string, maxLength: number): string {
    if (!text || text.length <= maxLength) {
      return text;
    }
    return text.substring(0, maxLength) + '...';
  }

  ngOnDestroy(): void {
    console.log('🔔 NotificationCenterService: Limpiando servicio...');
    this.destroy$.next();
    this.destroy$.complete();
    this.initialized = false;
  }
}



