import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CustomEchoWebSocketService } from './custom-echo-websocket.service';
import { MessageService } from '../pages/mensajeria/services/message.service';
import { AuthService } from './auth.service';

export interface BadgeCounters {
  unreadMessages: number;
  unreadConversations: number;
  draftMessages: number;
  importantMessages: number;
  urgentMessages: number;
  onlineUsers: number;
  totalNotifications: number;
}

/**
 * Servicio centralizado para manejar todos los badges y contadores en tiempo real
 * Utiliza WebSocket para actualizaciones instantáneas
 */
@Injectable({
  providedIn: 'root'
})
export class BadgeService implements OnDestroy {
  private destroy$ = new Subject<void>();

  // BehaviorSubjects para cada contador
  private unreadMessagesSubject = new BehaviorSubject<number>(0);
  private unreadConversationsSubject = new BehaviorSubject<number>(0);
  private draftMessagesSubject = new BehaviorSubject<number>(0);
  private importantMessagesSubject = new BehaviorSubject<number>(0);
  private urgentMessagesSubject = new BehaviorSubject<number>(0);
  private onlineUsersSubject = new BehaviorSubject<number>(0);
  private totalNotificationsSubject = new BehaviorSubject<number>(0);

  // Observables públicos
  public unreadMessages$: Observable<number> = this.unreadMessagesSubject.asObservable();
  public unreadConversations$: Observable<number> = this.unreadConversationsSubject.asObservable();
  public draftMessages$: Observable<number> = this.draftMessagesSubject.asObservable();
  public importantMessages$: Observable<number> = this.importantMessagesSubject.asObservable();
  public urgentMessages$: Observable<number> = this.urgentMessagesSubject.asObservable();
  public onlineUsers$: Observable<number> = this.onlineUsersSubject.asObservable();
  public totalNotifications$: Observable<number> = this.totalNotificationsSubject.asObservable();

  // Estado de inicialización
  private initialized = false;

  constructor(
    private echoService: CustomEchoWebSocketService,
    private messageService: MessageService,
    private authService: AuthService
  ) {
    console.log('🎖️ BadgeService: Servicio iniciado');
  }

  /**
   * Inicializa el servicio y las suscripciones WebSocket
   */
  public initialize(): void {
    if (this.initialized) {
      console.log('🎖️ BadgeService: Ya está inicializado, omitiendo');
      return;
    }

    console.log('🎖️ BadgeService: Inicializando servicio de badges...');
    this.initialized = true;

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser || !currentUser.id) {
      console.warn('⚠️ BadgeService: No hay usuario autenticado');
      return;
    }

    console.log('🎖️ BadgeService: Usuario:', currentUser.name);

    // Cargar contadores iniciales
    this.loadInitialCounts();

    // Conectar WebSocket
    this.connectWebSocket(currentUser.id);

    // Suscribirse a actualizaciones del MessageService
    this.subscribeToMessageService();

    console.log('✅ BadgeService: Inicialización completada');
  }

  /**
   * Carga los contadores iniciales desde el servidor
   */
  private loadInitialCounts(): void {
    console.log('📊 BadgeService: Cargando contadores iniciales...');

    // Cargar contador de mensajes no leídos
    this.messageService.refreshUnreadCount().subscribe({
      next: (count) => {
        console.log('📬 BadgeService: Mensajes no leídos:', count);
        this.unreadMessagesSubject.next(count);
        this.updateTotalNotifications();
      },
      error: (error) => {
        console.error('❌ BadgeService: Error cargando mensajes no leídos:', error);
      }
    });

    // TODO: Cargar otros contadores (conversaciones, borradores, etc.)
  }

  /**
   * Conecta al WebSocket y suscribe a eventos relevantes
   */
  private connectWebSocket(userId: number): void {
    console.log('🔌 BadgeService: Conectando WebSocket para usuario:', userId);

    // Conectar usuario
    this.echoService.connectUser();

    // Suscribirse al canal de usuario para notificaciones personales
    const userChannel = `user.${userId}`;
    console.log('📡 BadgeService: Suscribiendo a canal:', userChannel);

    // Escuchar nuevos mensajes
    this.echoService.listenToChannel(
      userChannel,
      'message.received',
      (data: any) => {
        console.log('📨 BadgeService: Nuevo mensaje recibido via WebSocket:', data);
        this.handleNewMessage(data);
      }
    );

    // Escuchar mensajes leídos
    this.echoService.listenToChannel(
      userChannel,
      'message.read',
      (data: any) => {
        console.log('✅ BadgeService: Mensaje marcado como leído via WebSocket:', data);
        this.handleMessageRead(data);
      }
    );

    // Escuchar cambios en estado de usuarios (online/offline)
    this.echoService.listenToChannel(
      userChannel,
      'user.status.changed',
      (data: any) => {
        console.log('👤 BadgeService: Estado de usuario cambiado via WebSocket:', data);
        this.handleUserStatusChanged(data);
      }
    );

    // Escuchar actualizaciones de contadores
    this.echoService.listenToChannel(
      userChannel,
      'counters.updated',
      (data: any) => {
        console.log('🔢 BadgeService: Contadores actualizados via WebSocket:', data);
        this.handleCountersUpdate(data);
      }
    );

    console.log('✅ BadgeService: Suscripciones WebSocket configuradas');
  }

  /**
   * Suscribe a actualizaciones del MessageService
   */
  private subscribeToMessageService(): void {
    console.log('🔗 BadgeService: Suscribiendo a MessageService...');

    // Suscribirse al contador de mensajes no leídos
    this.messageService.getUnreadCount$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        console.log('📬 BadgeService: Actualización desde MessageService:', count);
        this.unreadMessagesSubject.next(count);
        this.updateTotalNotifications();
      });

    console.log('✅ BadgeService: Suscripción a MessageService completada');
  }

  /**
   * Maneja la recepción de un nuevo mensaje
   */
  private handleNewMessage(data: any): void {
    console.log('📨 BadgeService: Procesando nuevo mensaje...');

    // Incrementar contador de mensajes no leídos
    const current = this.unreadMessagesSubject.value;
    this.unreadMessagesSubject.next(current + 1);

    // Si es importante, incrementar contador de importantes
    if (data.message?.priority === 'high' || data.message?.priority === 'urgent') {
      const currentImportant = this.importantMessagesSubject.value;
      this.importantMessagesSubject.next(currentImportant + 1);
    }

    // Si es urgente, incrementar contador de urgentes
    if (data.message?.priority === 'urgent') {
      const currentUrgent = this.urgentMessagesSubject.value;
      this.urgentMessagesSubject.next(currentUrgent + 1);
    }

    this.updateTotalNotifications();
    console.log('✅ BadgeService: Contadores actualizados por nuevo mensaje');
  }

  /**
   * Maneja cuando un mensaje es marcado como leído
   */
  private handleMessageRead(data: any): void {
    console.log('✅ BadgeService: Procesando mensaje leído...');

    // Decrementar contador de mensajes no leídos
    const current = this.unreadMessagesSubject.value;
    if (current > 0) {
      this.unreadMessagesSubject.next(current - 1);
    }

    // Si era importante, decrementar contador de importantes
    if (data.message?.priority === 'high' || data.message?.priority === 'urgent') {
      const currentImportant = this.importantMessagesSubject.value;
      if (currentImportant > 0) {
        this.importantMessagesSubject.next(currentImportant - 1);
      }
    }

    // Si era urgente, decrementar contador de urgentes
    if (data.message?.priority === 'urgent') {
      const currentUrgent = this.urgentMessagesSubject.value;
      if (currentUrgent > 0) {
        this.urgentMessagesSubject.next(currentUrgent - 1);
      }
    }

    this.updateTotalNotifications();
    console.log('✅ BadgeService: Contadores actualizados por mensaje leído');
  }

  /**
   * Maneja cambios en el estado de usuarios (online/offline)
   */
  private handleUserStatusChanged(data: any): void {
    console.log('👤 BadgeService: Procesando cambio de estado de usuario...');

    // Actualizar contador de usuarios en línea
    if (data.status === 'online') {
      const current = this.onlineUsersSubject.value;
      this.onlineUsersSubject.next(current + 1);
    } else if (data.status === 'offline') {
      const current = this.onlineUsersSubject.value;
      if (current > 0) {
        this.onlineUsersSubject.next(current - 1);
      }
    }

    console.log('✅ BadgeService: Contador de usuarios en línea actualizado');
  }

  /**
   * Maneja actualizaciones masivas de contadores desde el backend
   */
  private handleCountersUpdate(data: any): void {
    console.log('🔢 BadgeService: Actualizando todos los contadores desde backend...');

    if (data.unreadMessages !== undefined) {
      this.unreadMessagesSubject.next(data.unreadMessages);
    }

    if (data.unreadConversations !== undefined) {
      this.unreadConversationsSubject.next(data.unreadConversations);
    }

    if (data.draftMessages !== undefined) {
      this.draftMessagesSubject.next(data.draftMessages);
    }

    if (data.importantMessages !== undefined) {
      this.importantMessagesSubject.next(data.importantMessages);
    }

    if (data.urgentMessages !== undefined) {
      this.urgentMessagesSubject.next(data.urgentMessages);
    }

    if (data.onlineUsers !== undefined) {
      this.onlineUsersSubject.next(data.onlineUsers);
    }

    this.updateTotalNotifications();
    console.log('✅ BadgeService: Todos los contadores actualizados');
  }

  /**
   * Actualiza el contador total de notificaciones
   */
  private updateTotalNotifications(): void {
    const total = 
      this.unreadMessagesSubject.value +
      this.unreadConversationsSubject.value +
      this.importantMessagesSubject.value +
      this.urgentMessagesSubject.value;

    this.totalNotificationsSubject.next(total);
  }

  /**
   * Refresca todos los contadores desde el servidor
   */
  public refreshAllCounters(): void {
    console.log('🔄 BadgeService: Refrescando todos los contadores...');
    this.loadInitialCounts();
  }

  /**
   * Obtiene todos los contadores actuales
   */
  public getCurrentCounters(): BadgeCounters {
    return {
      unreadMessages: this.unreadMessagesSubject.value,
      unreadConversations: this.unreadConversationsSubject.value,
      draftMessages: this.draftMessagesSubject.value,
      importantMessages: this.importantMessagesSubject.value,
      urgentMessages: this.urgentMessagesSubject.value,
      onlineUsers: this.onlineUsersSubject.value,
      totalNotifications: this.totalNotificationsSubject.value
    };
  }

  /**
   * Actualiza manualmente un contador específico
   */
  public updateCounter(counter: keyof BadgeCounters, value: number): void {
    console.log(`🔢 BadgeService: Actualizando contador ${counter} a ${value}`);

    switch (counter) {
      case 'unreadMessages':
        this.unreadMessagesSubject.next(value);
        break;
      case 'unreadConversations':
        this.unreadConversationsSubject.next(value);
        break;
      case 'draftMessages':
        this.draftMessagesSubject.next(value);
        break;
      case 'importantMessages':
        this.importantMessagesSubject.next(value);
        break;
      case 'urgentMessages':
        this.urgentMessagesSubject.next(value);
        break;
      case 'onlineUsers':
        this.onlineUsersSubject.next(value);
        break;
      case 'totalNotifications':
        this.totalNotificationsSubject.next(value);
        break;
    }

    this.updateTotalNotifications();
  }

  ngOnDestroy(): void {
    console.log('🎖️ BadgeService: Limpiando servicio...');
    this.destroy$.next();
    this.destroy$.complete();
    this.initialized = false;
  }
}



