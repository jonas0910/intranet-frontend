import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject, timer } from 'rxjs';
import { map, filter, takeUntil, catchError, retry, delay } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface WebSocketMessage {
  event: string;
  data: any;
  timestamp: string;
  id: string;
}

export interface MessageReceivedEvent {
  message: any;
  conversation: any;
  timestamp: string;
  type: string;
}

export interface MessageReadEvent {
  message_id: number;
  user_id: number;
  conversation_id: number;
  read_at: string;
  timestamp: string;
  type: string;
}

export interface TypingEvent {
  user_id: number;
  conversation_id: number;
  is_typing: boolean;
  timestamp: string;
  type: string;
}

export interface UserStatusEvent {
  user_id: number;
  status: string;
  timestamp: string;
  type: string;
}

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private heartbeatInterval = 30000; // 30 seconds
  private destroy$ = new Subject<void>();
  
  private connectionState$ = new BehaviorSubject<'disconnected' | 'connecting' | 'connected'>('disconnected');
  private messages$ = new Subject<WebSocketMessage>();
  private messageReceived$ = new Subject<MessageReceivedEvent>();
  private messageRead$ = new Subject<MessageReadEvent>();
  private typing$ = new Subject<TypingEvent>();
  private userStatus$ = new Subject<UserStatusEvent>();
  private systemNotifications$ = new Subject<any>();
  
  // Observable para mensajes generales (compatible con EchoService)
  public get generalMessages$(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  constructor() {
    this.initializeHeartbeat();
  }

  /**
   * Connect to WebSocket server
   */
  connect(userId: number): Observable<boolean> {
    return new Observable(observer => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        observer.next(true);
        observer.complete();
        return;
      }

      this.connectionState$.next('connecting');
      
      const wsUrl = this.getWebSocketUrl();
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('WebSocket connected');
        this.connectionState$.next('connected');
        this.reconnectAttempts = 0;
        
        // Send user identification message
        this.send({
          event: 'user.connect',
          data: {
            user_id: userId,
            user_name: 'Usuario WebSocket',
            timestamp: new Date().toISOString()
          }
        });
        
        observer.next(true);
        observer.complete();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        this.connectionState$.next('disconnected');
        this.attemptReconnect(userId);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.connectionState$.next('disconnected');
        observer.error(error);
      };
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.destroy$.next();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.connectionState$.next('disconnected');
  }

  /**
   * Send message through WebSocket
   */
  send(data: any): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Send typing indicator
   */
  sendTyping(conversationId: number, isTyping: boolean): boolean {
    return this.send({
      event: 'typing',
      data: {
        conversation_id: conversationId,
        is_typing: isTyping
      }
    });
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat(): boolean {
    return this.send({
      event: 'ping',
      data: {
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Mark message as read
   */
  markMessageAsRead(messageId: number, conversationId: number): boolean {
    return this.send({
      event: 'message.read',
      data: {
        message_id: messageId,
        conversation_id: conversationId
      }
    });
  }

  /**
   * Get connection state observable
   */
  getConnectionState(): Observable<'disconnected' | 'connecting' | 'connected'> {
    return this.connectionState$.asObservable();
  }

  /**
   * Get all messages observable
   */
  getMessages(): Observable<WebSocketMessage> {
    return this.messages$.asObservable();
  }

  /**
   * Get message received events
   */
  getMessageReceived(): Observable<MessageReceivedEvent> {
    return this.messageReceived$.asObservable();
  }

  /**
   * Get message read events
   */
  getMessageRead(): Observable<MessageReadEvent> {
    return this.messageRead$.asObservable();
  }

  /**
   * Get typing events
   */
  getTyping(): Observable<TypingEvent> {
    return this.typing$.asObservable();
  }

  /**
   * Get user status events
   */
  getUserStatus(): Observable<UserStatusEvent> {
    return this.userStatus$.asObservable();
  }

  /**
   * Get system notifications
   */
  getSystemNotifications(): Observable<any> {
    return this.systemNotifications$.asObservable();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

    /**
     * Get WebSocket URL
     */
    private getWebSocketUrl(): string {
        // Simple WebSocket configuration (not Pusher)
        const config = environment.websocket;
        const protocol = config.forceTLS || config.encrypted ? 'wss:' : 'ws:';
        
        // Simple WebSocket URL without Pusher protocol
        return `${protocol}//${config.host}:${config.port}`;
    }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    this.messages$.next(message);

    switch (message.event) {
      case 'message.received':
        this.messageReceived$.next(message.data);
        break;
      
      case 'message.read':
        this.messageRead$.next(message.data);
        break;
      
      case 'user.typing':
        this.typing$.next(message.data);
        break;
      
      case 'user.status':
      case 'user.status.changed':
        this.userStatus$.next(message.data);
        break;
      
      case 'notification.system':
        this.systemNotifications$.next(message.data);
        break;
      
      case 'heartbeat':
        console.log('Server heartbeat received');
        break;
      
      case 'pong':
        console.log('Server pong received');
        break;
      
      case 'user.connected':
        console.log('User connection confirmed:', message.data);
        break;
      
      case 'error':
        console.error('WebSocket error:', message.data);
        break;
      
      default:
        console.log('Unhandled WebSocket event:', message.event);
    }
  }

  /**
   * Handle Pusher WebSocket errors
   */
  private handlePusherError(errorData: any): void {
    console.error('Pusher error details:', errorData);
    
    // Handle specific error types
    if (errorData.code) {
      switch (errorData.code) {
        case 4001:
          console.error('Application does not exist');
          break;
        case 4002:
          console.error('Application is over connection quota');
          break;
        case 4003:
          console.error('Path not found');
          break;
        case 4004:
          console.error('Invalid version string format');
          break;
        case 4005:
          console.error('Unsupported protocol version');
          break;
        case 4006:
          console.error('No protocol version supplied');
          break;
        case 4007:
          console.error('Connection is unauthorized');
          break;
        case 4008:
          console.error('Connection is forbidden');
          break;
        case 4009:
          console.error('Connection is over rate limit');
          break;
        case 4100:
          console.error('Generic application error');
          break;
        case 4200:
          console.error('Generic server error');
          break;
        default:
          console.error('Unknown Pusher error code:', errorData.code);
      }
    }
    
    // Attempt to reconnect on certain errors
    if (errorData.code && [4007, 4008, 4200].includes(errorData.code)) {
      console.log('Attempting to reconnect due to Pusher error...');
      // Note: userId would need to be passed or stored to reconnect
      // this.attemptReconnect(userId);
    }
  }

  /**
   * Attempt to reconnect to WebSocket
   */
  private attemptReconnect(userId: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    timer(this.reconnectInterval).pipe(
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.connect(userId).subscribe({
        next: (connected) => {
          if (connected) {
            console.log('Reconnected successfully');
          }
        },
        error: (error) => {
          console.error('Reconnection failed:', error);
        }
      });
    });
  }

  /**
   * Initialize heartbeat to keep connection alive
   */
  private initializeHeartbeat(): void {
    timer(0, this.heartbeatInterval).pipe(
      takeUntil(this.destroy$),
      filter(() => this.isConnected())
    ).subscribe(() => {
      this.sendHeartbeat();
    });
  }

  /**
   * Get connection statistics
   */
  getStats(): any {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.ws?.readyState,
      url: this.ws ? this.getWebSocketUrl() : null
    };
  }
}