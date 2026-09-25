import { Injectable, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { WebSocketMessageBridgeService } from './websocket-message-bridge.service';

// Types compatibles con Laravel Echo
type EchoInstance = {
  channel(channelName: string): EchoChannel;
  private(channelName: string): EchoChannel;
  join(channelName: string): EchoChannel;
};

type EchoChannel = {
  listen(event: string, callback: (data: any) => void): EchoChannel;
  stopListening(event?: string): EchoChannel;
  whisper(event: string, data: any): EchoChannel;
};

type EchoConnection = {
  readyState: number;
  send(data: string): void;
  close(): void;
};

@Injectable({
  providedIn: 'root'
})
export class CustomEchoWebSocketService implements OnDestroy {
  private echo: EchoInstance | null = null;
  private ws: WebSocket | null = null;
  private isConnected = false;
  private isConnecting = false; // Flag para evitar conexiones múltiples
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private channels = new Map<string, EchoChannel>();
  private channelCallbacks = new Map<string, Map<string, (data: any) => void>>();

  /** No anunciar presencia en línea (preferencia de mensajería / MensajeriaService). */
  private onlineHidden = false;

  // Connection status observable
  private connectionSubject = new BehaviorSubject<boolean>(false);
  public connection$ = this.connectionSubject.asObservable();

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private webSocketBridge: WebSocketMessageBridgeService
  ) {
    // Don't auto-initialize to avoid conflicts with WebSocketService
    // The connection will be handled by the main WebSocketService
    console.log('🔧 CustomEchoWebSocket: Service initialized (manual connection)');
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  /**
   * Sincroniza con MensajeriaService: si el usuario oculta su estado en línea,
   * no se llama al endpoint de presencia ni se envía user.connect hasta que vuelva a mostrarse.
   */
  setOnlineHidden(hidden: boolean): void {
    this.onlineHidden = hidden;
  }

  /**
   * Check WebSocket connection status and reconnect if needed
   */
  private ensureConnection(): boolean {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, attempting to reconnect...');
      this.connect();
      return false;
    }
    return true;
  }

  /**
   * Initialize Echo-like WebSocket service
   */
  initializeEcho(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('⚠️ No authentication token found. Echo WebSocket will not be initialized.');
      return;
    }

    try {
      this.connect();
      this.createFakeEcho();
      this.isConnected = true;
      console.log('✅ Custom Laravel Echo WebSocket initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing Custom Echo WebSocket:', error);
      this.isConnected = false;
    }
  }

  /**
   * Manualmente inicializar Echo (llamar cuando el servidor WebSocket esté listo)
   */
  connect(): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('ℹ️ Echo WebSocket already connected');
      return;
    }

    console.log('🔌 Attempting to connect to WebSocket server...');
    this.connectToWebSocket();
  }

  private connectToWebSocket(): void {
    const token = this.authService.getToken();
    if (!token) {
      console.warn('⚠️ No authentication token found. Creating mock connection for development.');
      this.createMockConnection();
      return;
    }

    try {
      const wsUrl = `ws://${environment.websocket.host}:${environment.websocket.port}`;
      console.log('🔌 Connecting to:', wsUrl);

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = (event) => {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.connectionSubject.next(true);
        this.reconnectAttempts = 0;

        // Send initial authentication
        const user = this.authService.getCurrentUser();
        const userId = this.getUserId();
        console.log('🔌 CustomEchoWebSocket: Sending user connect with data:', { user_id: userId, user_name: user?.name || 'Usuario' });

        if (!this.onlineHidden) {
          this.send('user.connect', {
            user_id: userId,
            user_name: user?.name || 'Usuario',
            user_email: user?.email || ''
          });
        } else {
          console.log('🔌 Online presence hidden: skipping user.connect broadcast');
        }

        // RE-SUBSCRIBE to all active channels
        this.channels.forEach((channel, channelName) => {
          console.log(`📡 Re-subscribing to channel: ${channelName}`);
          this.ws?.send(JSON.stringify({
            event: 'subscribe',
            channel: channelName,
            timestamp: new Date().toISOString()
          }));
        });

        // Notify backend that user is online
        this.notifyUserOnline();
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log('📤 WebSocket disconnected');
        this.isConnected = false;
        this.connectionSubject.next(false);
        this.ws = null;

        // Attempt to reconnect
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
          setTimeout(() => this.connectToWebSocket(), this.reconnectInterval);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnected = false;
        this.connectionSubject.next(false);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
    }
  }

  private createFakeEcho(): void {
    // Create a fake Echo instance that mimics Laravel Echo's interface
    this.echo = {
      channel: (channelName: string) => this.createChannel(channelName),
      private: (channelName: string) => this.createChannel(`private-${channelName}`),
      join: (channelName: string) => this.createChannel(`presence-${channelName}`),
      leave: (channelName: string) => this.leaveChannel(channelName)
    } as EchoInstance;
  }

  private createMockConnection(): void {
    console.log('🔧 Creating mock WebSocket connection for development without authentication');

    // Create fake echo without requiring token
    this.createFakeEcho();

    // Simulate successful connection
    this.isConnected = true;
    this.connectionSubject.next(true);

    // Notify backend that user is online (even in mock mode)
    this.notifyUserOnline();

    console.log('✅ Mock Echo WebSocket connection established');
  }

  private createChannel(channelName: string): EchoChannel {
    console.log(`📺 Creating Echo-compatible channel: ${channelName}`);

    if (!this.channels.has(channelName)) {
      const channel = new EchoChannelImpl(channelName, this);
      this.channels.set(channelName, channel);

      // Send subscribe message to WebSocket server
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          event: 'subscribe',
          channel: channelName,
          timestamp: new Date().toISOString()
        }));
        console.log(`📡 Sent subscription request for channel: ${channelName}`);
      }
    }

    return this.channels.get(channelName)!;
  }

  /**
   * Obtener la instancia Echo (sin auto-reconectar para evitar spam)
   */
  getEcho(): EchoInstance | null {
    if (!this.isConnected || !this.echo) {
      console.warn('⚠️ Echo WebSocket is not connected. Attempting to connect automatically...');

      // Try to connect automatically
      this.connect();

      // After attempt, check again
      if (!this.isConnected || !this.echo) {
        console.error('❌ Unable to connect to Echo WebSocket');
        return null;
      }
    }
    return this.echo;
  }

  /**
   * Escuchar en un canal (compatible con Echo)
   */
  channel(channelName: string): any {
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot listen to channel: Echo WebSocket not initialized');
      console.log('🔧 Attempting to create mock channel anyway for development...');

      // For development, create a mock channel
      return this.createChannel(channelName);
    }
    return echo.channel(channelName);
  }

  /**
   * Escuchar en un canal privado (compatible con Echo)
   */
  private(channelName: string): any {
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot listen to private channel: Echo WebSocket not initialized');
      return null;
    }
    return echo.private(channelName);
  }

  /**
   * Unirse a un canal de presencia (compatible con Echo)
   */
  join(channelName: string): any {
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot join presence channel: Echo WebSocket not initialized');
      return null;
    }
    return echo.join(channelName);
  }

  /**
   * Salir de un canal
   */
  leave(channelName: string): void {
    if (this.channels.has(channelName)) {
      this.channels.delete(channelName);
      console.log(`📤 Left channel: ${channelName}`);
    }
  }

  /**
   * Desconectar Echo
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.connectionSubject.next(false);
    this.channels.clear();
    console.log('📤 Laravel Echo WebSocket disconnected');
  }

  /**
   * Verificar si Echo está conectado
   */
  connected(): boolean {
    return this.isConnected;
  }

  /**
   * Reconectar Echo
   */
  reconnect(): void {
    this.disconnect();
    this.initializeEcho();
  }

  // Métodos internos para manejo de mensajes
  send(event: string, data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message = {
        event,
        data: {
          ...data,
          timestamp: new Date().toISOString()
        }
      };
      this.ws.send(JSON.stringify(message));
      console.log('📤 Echo WebSocket message sent:', message);
    } else {
      console.warn('⚠️ Cannot send message: WebSocket not connected');
    }
  }

  private handleMessage(rawData: string): void {
    try {
      const message = JSON.parse(rawData);
      this.routeToChannel(message);
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  private routeToChannel(message: any): void {
    console.log('📨 Echo WebSocket message received:', message);

    // Forward message to WebSocket bridge for real-time inbox updates
    console.log('📨 Forwarding message to WebSocket bridge:', message);
    try {
      this.webSocketBridge.emitMessage(message);
      console.log('✅ Message forwarded to WebSocket bridge successfully');
    } catch (error) {
      console.error('❌ Error forwarding message to WebSocket bridge:', error);
    }

    // Route to channels based on event type and CHANNEL matching
    this.channels.forEach((channel: any, channelName: string) => {
      // Check if message belongs to this channel
      const isMatch = !message.channel ||
        message.channel === channelName ||
        message.channel === `private-${channelName}` ||
        message.clean_channel === channelName;

      if (isMatch && channel.handleMessage) {
        channel.handleMessage(message);
      }
    });

    // Process channel callbacks
    this.channelCallbacks.forEach((eventCallbacks, channelName) => {
      const channelMatch = !message.channel ||
        message.channel === channelName ||
        message.clean_channel === channelName ||
        message.channel === `private-${channelName}`;
      eventCallbacks.forEach((callback, eventName) => {
        if (message.event === eventName && channelMatch) {
          console.log(`📡 Calling callback for ${eventName} on ${channelName}`);
          try {
            callback(message.data);
            console.log(`📡 Callback executed successfully for ${eventName} on ${channelName}`);
          } catch (error) {
            console.error(`📡 Error executing callback for ${eventName} on ${channelName}:`, error);
          }
        }
      });
    });

    // Handle global events
    switch (message.event) {
      case 'connection.established':
        console.log('🎉 Connection established:', message.data);
        break;
      case 'heartbeat':
        console.log('💓 Server heartbeat received');
        break;
      case 'pong':
        console.log('🏓 Pong received');
        break;
    }
  }

  private getUserId(): number {
    const user = this.authService.getCurrentUser();
    console.log('🔍 CustomEchoWebSocket: Getting user ID from auth service:', user);
    return user?.id || 1;
  }

  /**
   * Notify backend that user is online
   */
  private notifyUserOnline(): void {
    if (this.onlineHidden) {
      console.log('📡 Skipping notifyUserOnline (user hid online status)');
      return;
    }

    const url = `${environment.apiUrl}/v1/mensajeria/notifications/online`;

    console.log('📡 Calling notifyUserOnline endpoint:', url);

    this.http.post(url, {}).subscribe({
      next: (response) => {
        console.log('✅ User marked as online on backend', response);
      },
      error: (error) => {
        console.error('❌ Failed to mark user as online:', error);
        console.error('Error details:', {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          url: url
        });
      }
    });
  }

  /**
   * Listen to a specific event on a channel
   */
  listenToChannel(channelName: string, eventName: string, callback: (data: any) => void): void {
    console.log(`📡 Listening to event "${eventName}" on channel "${channelName}"`);

    // Ensure the channel is created and subscribed
    this.createChannel(channelName);

    // Store the callback for this channel and event
    if (!this.channelCallbacks.has(channelName)) {
      this.channelCallbacks.set(channelName, new Map());
    }
    this.channelCallbacks.get(channelName)!.set(eventName, callback);

    console.log(`✅ Successfully subscribed to ${eventName} on ${channelName}`);
    console.log(`📡 Total channels registered:`, this.channelCallbacks.size);
    console.log(`📡 Events for channel ${channelName}:`, Array.from(this.channelCallbacks.get(channelName)!.keys()));
  }

  /**
   * Send a message through WebSocket
   */
  sendMessage(conversationId: number, content: string, messageType: string = 'text'): void {
    if (!this.ensureConnection()) {
      // Try again after a short delay
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendMessage(conversationId, content, messageType);
        } else {
          console.error('❌ WebSocket still not connected, cannot send message');
        }
      }, 1000);
      return;
    }

    const message = {
      event: 'message.send',
      data: {
        conversation_id: conversationId,
        sender_id: this.authService.getCurrentUser()?.id,
        content: content,
        message_type: messageType,
        timestamp: new Date().toISOString()
      }
    };

    console.log('📤 Sending message:', message);
    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: number, conversationId: number): void {
    // Check if WebSocket is connected, if not, try to reconnect
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, attempting to reconnect...');
      this.connect();

      // Wait a bit and try again
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.markMessageAsRead(messageId, conversationId);
        } else {
          console.error('❌ WebSocket still not connected, cannot mark message as read');
        }
      }, 1000);
      return;
    }

    const message = {
      event: 'message.read',
      data: {
        message_id: messageId,
        user_id: this.authService.getCurrentUser()?.id,
        conversation_id: conversationId,
        timestamp: new Date().toISOString()
      }
    };

    console.log('👁️ Marking message as read:', message);
    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Send typing indicator
   */
  sendTypingIndicator(conversationId: number, isTyping: boolean): void {
    if (!this.ensureConnection()) {
      // Try again after a short delay
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendTypingIndicator(conversationId, isTyping);
        } else {
          console.error('❌ WebSocket still not connected, cannot send typing indicator');
        }
      }, 1000);
      return;
    }

    const event = isTyping ? 'typing' : 'typing.stop';
    const message = {
      event: event,
      data: {
        conversation_id: conversationId,
        user_id: this.authService.getCurrentUser()?.id,
        user_name: this.authService.getCurrentUser()?.name,
        timestamp: new Date().toISOString()
      }
    };

    console.log(`⌨️ ${isTyping ? 'Starting' : 'Stopping'} typing indicator:`, message);
    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Connect user to WebSocket
   */
  connectUser(): void {
    if (this.onlineHidden) {
      console.log('👤 Skipping connectUser (online status hidden)');
      return;
    }

    // Check if WebSocket is connected, if not, try to reconnect
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('⚠️ WebSocket not connected, attempting to reconnect...');
      this.connect();

      // Wait a bit and try again
      setTimeout(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.connectUser();
        } else {
          console.error('❌ WebSocket still not connected, cannot connect user');
        }
      }, 1000);
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('❌ No current user found');
      return;
    }

    const message = {
      event: 'user.connect',
      data: {
        user_id: currentUser.id,
        user_name: currentUser.name,
        timestamp: new Date().toISOString()
      }
    };

    console.log('👤 Connecting user:', message);
    if (this.ws) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Disconnect user from WebSocket
   */
  disconnectUser(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.error('❌ WebSocket not connected, cannot disconnect user');
      return;
    }

    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) {
      console.error('❌ No current user found');
      return;
    }

    const message = {
      event: 'user.disconnect',
      data: {
        user_id: currentUser.id,
        timestamp: new Date().toISOString()
      }
    };

    console.log('👤 Disconnecting user:', message);
    this.ws.send(JSON.stringify(message));
  }

  /**
   * Leave a channel
   */
  leaveChannel(channelName: string): void {
    console.log(`👋 Leaving channel: ${channelName}`);

    if (this.channels.has(channelName)) {
      const channel = this.channels.get(channelName);
      if (channel) {
        channel.stopListening();
        this.channels.delete(channelName);
        console.log(`✅ Left channel: ${channelName}`);
      }
    } else {
      console.log(`ℹ️ Channel ${channelName} was not subscribed`);
    }
  }
}

// Implementación interna de canal para compatibilidad con Echo
class EchoChannelImpl implements EchoChannel {
  private events = new Map<string, (data: any) => void>();

  constructor(private channelName: string, private service: CustomEchoWebSocketService) { }

  listen(event: string, callback: (data: any) => void): EchoChannel {
    this.events.set(event, callback);
    console.log(`👂 Listening to ${event} on channel ${this.channelName}`);
    return this;
  }

  stopListening(event?: string): EchoChannel {
    if (event) {
      this.events.delete(event);
      console.log(`🔇 Stopped listening to ${event} on channel ${this.channelName}`);
    } else {
      this.events.clear();
      console.log(`🔇 Stopped listening to all events on channel ${this.channelName}`);
    }
    return this;
  }

  whisper(event: string, data: any): EchoChannel {
    console.log(`🗣️ Whispering ${event} on channel ${this.channelName}:`, data);
    // Implementar whisper como mensaje directo al canal
    this.service.send(`client-${event}`, {
      channel: this.channelName,
      ...data
    });
    return this;
  }

  // Método interno para manejar mensajes del canal
  handleMessage(message: any): void {
    this.events.forEach((callback, event) => {
      if (message.event === event || message.event === `${this.channelName}.${event}`) {
        console.log(`📺 Routing ${message.event} to channel ${this.channelName}`);
        callback(message.data);
      }
    });
  }
}
