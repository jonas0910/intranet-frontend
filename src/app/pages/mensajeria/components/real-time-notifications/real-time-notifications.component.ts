import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';

import { WebSocketService, WebSocketMessage } from '../../services/websocket.service';
import { MessageService } from '../../services/message.service';
import { NotificationService } from '../../services/notification.service';
import { CustomEchoWebSocketService } from '../../../../services/custom-echo-websocket.service';

@Component({
  selector: 'app-real-time-notifications',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="real-time-notifications" *ngIf="showStats">
      <div class="row">
        <!-- Connection Status -->
        <div class="col-md-3">
          <div class="info-box" [class]="isConnected ? 'bg-success' : 'bg-danger'">
            <span class="info-box-icon">
              <i class="fas" [class.fa-wifi]="isConnected" [class.fa-wifi-slash]="!isConnected"></i>
            </span>
            <div class="info-box-content">
              <span class="info-box-text">Conexión</span>
              <span class="info-box-number">{{ connectionStatus }}</span>
              <div class="progress">
                <div class="progress-bar" [class.bg-success]="isConnected" [class.bg-danger]="!isConnected" 
                     [style.width.%]="isConnected ? 100 : 0"></div>
              </div>
              <span class="progress-description">
                {{ isConnected ? 'Conectado' : 'Desconectado' }}
              </span>
            </div>
          </div>
        </div>

        <!-- Messages Count -->
        <div class="col-md-3">
          <div class="info-box bg-info">
            <span class="info-box-icon">
              <i class="fas fa-envelope"></i>
            </span>
            <div class="info-box-content">
              <span class="info-box-text">Mensajes</span>
              <span class="info-box-number">{{ messageCount }}</span>
              <div class="progress">
                <div class="progress-bar bg-info" [style.width.%]="Math.min(messageCount * 10, 100)"></div>
              </div>
              <span class="progress-description">
                Recibidos en tiempo real
              </span>
            </div>
          </div>
        </div>

        <!-- Online Users -->
        <div class="col-md-3">
          <div class="info-box bg-warning">
            <span class="info-box-icon">
              <i class="fas fa-users"></i>
            </span>
            <div class="info-box-content">
              <span class="info-box-text">Usuarios</span>
              <span class="info-box-number">{{ onlineUsers.length }}</span>
              <div class="progress">
                <div class="progress-bar bg-warning" [style.width.%]="Math.min(onlineUsers.length * 20, 100)"></div>
              </div>
              <span class="progress-description">
                En línea
              </span>
            </div>
          </div>
        </div>

        <!-- Heartbeat -->
        <div class="col-md-3">
          <div class="info-box bg-primary">
            <span class="info-box-icon">
              <i class="fas fa-heartbeat"></i>
            </span>
            <div class="info-box-content">
              <span class="info-box-text">Heartbeat</span>
              <span class="info-box-number">{{ heartbeatCount }}</span>
              <div class="progress">
                <div class="progress-bar bg-primary" [style.width.%]="100"></div>
              </div>
              <span class="progress-description">
                Último: {{ lastHeartbeat | date:'HH:mm:ss' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Connection Stats -->
      <div class="card" *ngIf="connectionStats">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fas fa-chart-line mr-2"></i>
            Estadísticas de Conexión
          </h3>
        </div>
        <div class="card-body">
          <div class="row">
            <div class="col-md-6">
              <strong>Estado:</strong> {{ connectionStats.connected ? 'Conectado' : 'Desconectado' }}<br>
              <strong>Reconexiones:</strong> {{ connectionStats.reconnectAttempts || 0 }}<br>
              <strong>Estado Ready:</strong> {{ connectionStats.readyState || 'N/A' }}
            </div>
            <div class="col-md-6">
              <strong>URL:</strong> <small>{{ connectionStats.url || 'N/A' }}</small><br>
              <strong>Última conexión:</strong> {{ lastConnection | date:'HH:mm:ss' }}
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Messages -->
      <div class="card card-outline" *ngIf="recentMessages.length > 0" [class.collapsed-card]="isTimelineCollapsed">
        <div class="card-header">
          <h3 class="card-title">
            <i class="fas fa-clock mr-2"></i>
            Mensajes Recientes ({{ recentMessages.length }})
          </h3>
          <div class="card-tools">
            <button type="button" class="btn btn-tool" (click)="toggleTimeline()">
              <i class="fas" [class.fa-plus]="isTimelineCollapsed" [class.fa-minus]="!isTimelineCollapsed"></i>
            </button>
          </div>
        </div>
        <div class="card-body" *ngIf="!isTimelineCollapsed">
          <div class="timeline timeline-compact">
            <div class="timeline-item" *ngFor="let message of recentMessages.slice(0, 5)">
              <i class="fas fa-envelope bg-blue"></i>
              <div class="timeline-item-content">
                <span class="time">
                  <i class="fas fa-clock"></i>
                  {{ parseTimestamp(message.timestamp) | date:'HH:mm:ss' }}
                </span>
                <h6 class="timeline-header">
                  {{ message.event }}
                </h6>
                <div class="timeline-body">
                  {{ message.data.message || 'Evento recibido' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Simple Connection Indicator (when showStats is false) -->
    <div class="connection-indicator" *ngIf="!showStats">
      <span class="badge" [class.badge-success]="isConnected" [class.badge-danger]="!isConnected">
        <i class="fas" [class.fa-wifi]="isConnected" [class.fa-wifi-slash]="!isConnected"></i>
        {{ isConnected ? 'Conectado' : 'Desconectado' }}
      </span>
    </div>
  `,
  styles: [`
    .real-time-notifications {
      margin-bottom: 20px;
    }

    .connection-indicator {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 1050;
    }

    .connection-indicator .badge {
      font-size: 12px;
      padding: 5px 10px;
    }

    .info-box {
      border-radius: 8px;
      margin-bottom: 15px;
    }

    .timeline {
      position: relative;
      padding-left: 30px;
    }

    .timeline-compact {
      padding-left: 25px;
    }

    .timeline-item {
      position: relative;
      padding-bottom: 12px;
      margin-bottom: 8px;
    }

    .timeline-item i {
      position: absolute;
      left: -30px;
      top: 0;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      padding: 8px;
    }

    .timeline-item-content {
      background: #f8f9fa;
      padding: 8px 12px;
      border-radius: 4px;
      border-left: 2px solid #007bff;
    }

    .timeline-item-content .time {
      font-size: 11px;
      color: #6c757d;
      margin-bottom: 4px;
      display: block;
    }

    .timeline-item-content .time i {
      position: static;
      width: auto;
      height: auto;
      font-size: 10px;
      margin-right: 3px;
    }

    .timeline-header {
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 4px;
      color: #495057;
    }

    .timeline-body {
      font-size: 12px;
      color: #6c757d;
      line-height: 1.4;
    }

    .card-outline {
      border-top: 3px solid #007bff;
    }
  `]
})
export class RealTimeNotificationsComponent implements OnInit, OnDestroy {
  @Input() userId: number | null = null;
  @Input() showStats: boolean = true;

  private destroy$ = new Subject<void>();

  // Connection status
  isConnected = false;
  connectionStatus = 'Desconectado';
  connectionStats: any = {};

  // Statistics
  messageCount = 0;
  heartbeatCount = 0;
  lastHeartbeat: Date | null = null;
  lastConnection: Date | null = null;

  // Real-time data
  recentMessages: WebSocketMessage[] = [];
  onlineUsers: any[] = [];
  typingUsersList: any[] = [];

  // UI state
  isTimelineCollapsed = true; // Collapsed by default

  constructor(
    private webSocketService: WebSocketService,
    private messageService: MessageService,
    private notificationService: NotificationService,
    private echoService: CustomEchoWebSocketService
  ) {}

  ngOnInit(): void {
    console.log('🔧 RealTimeNotificationsComponent ngOnInit - userId:', this.userId);
    console.log('🔧 RealTimeNotificationsComponent ngOnInit - showStats:', this.showStats);
    
    if (this.userId) {
      console.log('✅ UserId provided, initializing WebSocket...');
      this.initializeWebSocket();
      this.subscribeToEvents();
      
      // Initialize with some mock online users for testing
      this.onlineUsers = [
        { user_id: 1, name: 'Usuario 1', status: 'online' },
        { user_id: 2, name: 'Usuario 2', status: 'online' }
      ];
      console.log('🔧 Initialized with mock online users:', this.onlineUsers);
    } else {
      console.warn('⚠️ No userId provided to RealTimeNotificationsComponent');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // NO desconectar WebSocket aquí, está compartido entre componentes
    // La conexión se maneja desde AppLayoutComponent
    console.log('🔌 Componente de notificaciones destruido, manteniendo conexión WebSocket');
  }

  private initializeWebSocket(): void {
    console.log('🔌 Inicializando WebSocket para notificaciones en tiempo real...');

    // Check if WebSocket is already connected (from AppLayoutComponent)
    if (this.webSocketService.isConnected()) {
      console.log('✅ WebSocket ya está conectado, reutilizando conexión existente');
      this.isConnected = true;
      this.connectionStatus = 'Conectado';
      this.lastConnection = new Date();
      this.connectionStats = this.webSocketService.getStats();
    } else {
      console.log('🔌 Conectando a WebSocket...');
      
      // Validate userId before connecting
      if (!this.userId) {
        console.warn('⚠️ No userId provided for WebSocket connection');
        return;
      }
      
      // Connect to WebSocket if not already connected
      this.webSocketService.connect(this.userId).subscribe({
        next: (connected) => {
          this.isConnected = connected;
          if (connected) {
            console.log('✅ WebSocket conectado para notificaciones en tiempo real');
            this.lastConnection = new Date();
            this.connectionStatus = 'Conectado';
          }
        },
        error: (error) => {
          console.error('❌ Error de conexión WebSocket:', error);
          this.isConnected = false;
          this.connectionStatus = 'Error de conexión';
        }
      });
    }

    // Monitor connection state
    this.webSocketService.getConnectionState().pipe(
      takeUntil(this.destroy$)
    ).subscribe(state => {
      this.isConnected = state === 'connected';
      this.connectionStatus = state === 'connected' ? 'Conectado' :
                              state === 'connecting' ? 'Conectando...' : 'Desconectado';
      this.connectionStats = this.webSocketService.getStats();
    });
  }

  private subscribeToEvents(): void {
    console.log('🔌 Subscribing to events for user:', this.userId);
    
    // Subscribe to all WebSocket messages
    this.webSocketService.getMessages().pipe(
      takeUntil(this.destroy$)
    ).subscribe(message => {
      this.handleMessage(message);
    });

    // Subscribe to specific events
    this.webSocketService.getMessageReceived().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      console.log('📨 Mensaje recibido en tiempo real:', event);
      this.messageCount++;
    });

    this.webSocketService.getMessageRead().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      console.log('✅ Mensaje leído:', event);
    });

    this.webSocketService.getTyping().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.handleTypingEvent(event);
    });

    this.webSocketService.getUserStatus().pipe(
      takeUntil(this.destroy$)
    ).subscribe(event => {
      this.handleUserStatusEvent(event);
    });

    // Subscribe to user channel for message.received events
    if (this.userId) {
      this.subscribeToUserChannel();
    }
  }

  private subscribeToUserChannel(): void {
    const userChannel = `user.${this.userId}`;
    console.log(`📡 RealTimeNotificationsComponent subscribing to user channel: ${userChannel}`);
    console.log(`🔧 Echo service connected: ${this.echoService.connected()}`);
    
    // Initialize Echo if not connected
    if (!this.echoService.connected()) {
      console.log('🔌 Initializing Echo service for RealTimeNotificationsComponent...');
      this.echoService.connect();
    }

    console.log(`🔧 Creating private channel for: ${userChannel}`);
    const channel = this.echoService.private(userChannel);
    console.log(`🔧 Channel created:`, channel);

    if (channel) {
      console.log(`🔌 Channel object created for ${userChannel}:`, channel);
      
      // Listen for new messages
      channel.listen('.message.received', (data: any) => {
        console.log('📨 RealTimeNotificationsComponent received message.received:', data);
        this.messageCount++;
        console.log('📊 Message count updated to:', this.messageCount);
        
        // Add to recent messages
        const message: WebSocketMessage = {
          event: 'message.received',
          data: data,
          timestamp: new Date().toISOString(),
          id: 'echo-' + Date.now()
        };
        this.handleMessage(message);
      });

      // Also listen for any message events
      channel.listen('.message', (data: any) => {
        console.log('📨 RealTimeNotificationsComponent received .message event:', data);
      });

      // Listen for subscription success
      channel.subscribed(() => {
        console.log(`✅ RealTimeNotificationsComponent successfully subscribed to ${userChannel}`);
      });

      // Listen for subscription errors
      channel.error((error: any) => {
        console.error(`❌ RealTimeNotificationsComponent subscription error for ${userChannel}:`, error);
      });

      console.log(`✅ RealTimeNotificationsComponent subscribed to ${userChannel}`);
    } else {
      console.error(`❌ Failed to subscribe to user channel: ${userChannel}`);
    }
  }

  private handleMessage(message: WebSocketMessage): void {
          console.log('📨 WebSocket message received:', message);
          console.log('📨 Message event type:', message?.event);
          console.log('📨 Message data:', message?.data);
          console.log('📊 Current message count before processing:', this.messageCount);

    // Add to recent messages (keep only last 10)
    this.recentMessages.unshift(message);
    if (this.recentMessages.length > 10) {
      this.recentMessages = this.recentMessages.slice(0, 10);
    }

    // Handle specific event types
    switch (message.event) {
      case 'heartbeat':
        this.heartbeatCount++;
        this.lastHeartbeat = this.parseTimestamp(message.timestamp);
        console.log('💓 Heartbeat received, count:', this.heartbeatCount);
        break;

      case 'pong':
        console.log('🏓 Pong received from server');
        break;

      case 'message.received':
      case 'message.sent':
        this.messageCount++;
        console.log('📨 Message event received, new count:', this.messageCount);
        this.showNotification('Nuevo mensaje recibido', message.data);
        break;

      case 'message.read':
        console.log('✅ Message read event received');
        this.showNotification('Mensaje leído', message.data);
        break;

      case 'user.typing':
        console.log('⌨️ User typing event received');
        // Handled by subscription
        break;

      case 'user.status':
      case 'user.status.changed':
        console.log('👤 User status event received');
        // Handled by subscription
        break;

      default:
        console.log('❓ Unhandled WebSocket event:', message.event);
    }
    
    console.log('📊 Final message count after processing:', this.messageCount);
  }

  private handleTypingEvent(data: any): void {
    // Update typing users list
    const existingIndex = this.typingUsersList.findIndex(u => u.user_id === data.user_id);

    if (data.is_typing) {
      if (existingIndex === -1) {
        this.typingUsersList.push(data);
      }
    } else {
      if (existingIndex !== -1) {
        this.typingUsersList.splice(existingIndex, 1);
      }
    }
  }

  private handleUserStatusEvent(data: any): void {
    console.log('👤 Handling user status event:', data);
    
    // Update online users list
    const existingIndex = this.onlineUsers.findIndex(u => u.user_id === data.user_id);
    console.log('👤 Existing user index:', existingIndex);

    if (data.status === 'online') {
      if (existingIndex === -1) {
        this.onlineUsers.push(data);
        console.log('✅ Added user to online list:', data.user_id);
      } else {
        console.log('ℹ️ User already in online list:', data.user_id);
      }
    } else {
      if (existingIndex !== -1) {
        this.onlineUsers.splice(existingIndex, 1);
        console.log('❌ Removed user from online list:', data.user_id);
      } else {
        console.log('ℹ️ User not in online list to remove:', data.user_id);
      }
    }
    
    console.log('👥 Current online users count:', this.onlineUsers.length);
    console.log('👥 Current online users:', this.onlineUsers);
  }

  /**
   * Parse timestamp safely
   */
  public parseTimestamp(timestamp: any): Date | null {
    if (!timestamp) {
      return new Date(); // Return current date if no timestamp
    }
    
    try {
      const date = new Date(timestamp);
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return new Date(); // Return current date if invalid
      }
      return date;
    } catch (error) {
      console.warn('Error parsing timestamp:', timestamp, error);
      return new Date(); // Return current date if error
    }
  }

  private showNotification(title: string, data: any): void {
    // Show browser notification if supported
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: data.message || 'Nueva notificación',
        icon: '/assets/img/notification-icon.png'
      });
    }

    // Show toast notification
    this.notificationService.showSuccess(title);
  }

  // Public methods for external components
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  getMessageCount(): number {
    return this.messageCount;
  }

  getOnlineUsersCount(): number {
    return this.onlineUsers.length;
  }

  getHeartbeatCount(): number {
    return this.heartbeatCount;
  }

  // Helper properties for template
  get typingUsers(): any[] {
    return this.typingUsersList;
  }

  get Math(): any {
    return Math;
  }

  // UI methods
  toggleTimeline(): void {
    this.isTimelineCollapsed = !this.isTimelineCollapsed;
  }

  // Test method to simulate message received
  testMessageReceived(): void {
    console.log('🧪 Testing message received event...');
    this.messageCount++;
    console.log('🧪 Message count after test:', this.messageCount);
    
    // Simulate a WebSocket message
    const testMessage: WebSocketMessage = {
      event: 'message.received',
      data: { 
        message: 'Test message', 
        sender: 'Test User',
        id: 999,
        conversation_id: null,
        message_type: 'individual'
      },
      timestamp: new Date().toISOString(),
      id: 'test-' + Date.now()
    };
    
    this.handleMessage(testMessage);
    
    // Also simulate the Echo channel event
    console.log('🧪 Simulating Echo channel message.received event...');
    this.messageCount++;
    console.log('📊 Message count after Echo simulation:', this.messageCount);
  }
}