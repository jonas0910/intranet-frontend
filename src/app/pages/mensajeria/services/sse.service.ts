import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SSEMessage {
  event: string;
  data: any;
  timestamp: string;
}

export interface SSEStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: Date;
  connectionCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000; // 5 seconds
  private statusSubject = new BehaviorSubject<SSEStatus>({
    connected: false,
    reconnecting: false,
    connectionCount: 0
  });
  private messageSubject = new Subject<SSEMessage>();

  constructor() {}

  /**
   * Connect to Server-Sent Events (Native Laravel SSE)
   */
  connect(userId: number): Observable<boolean> {
    return new Observable(observer => {
      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        observer.next(true);
        observer.complete();
        return;
      }

      // Try native Laravel SSE first
      console.log('🔄 Conectando a SSE nativo de Laravel para usuario:', userId);
      const sseUrl = this.getSSEUrl(userId);
      this.eventSource = new EventSource(sseUrl);

      this.eventSource.onopen = () => {
        console.log('✅ SSE nativo conectado exitosamente');
        this.statusSubject.next({
          connected: true,
          reconnecting: false,
          lastConnected: new Date(),
          connectionCount: this.statusSubject.value.connectionCount + 1
        });
        this.reconnectAttempts = 0;
        observer.next(true);
        observer.complete();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message: SSEMessage = {
            event: 'message',
            data: data,
            timestamp: new Date().toISOString()
          };
          this.handleMessage(message);
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.addEventListener('connected', (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'connected',
          data: data,
          timestamp: new Date().toISOString()
        };
        this.handleMessage(message);
      });

      this.eventSource.addEventListener('heartbeat', (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'heartbeat',
          data: data,
          timestamp: new Date().toISOString()
        };
        this.handleMessage(message);
      });

      this.eventSource.addEventListener('message.received', (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'message.received',
          data: data,
          timestamp: new Date().toISOString()
        };
        this.handleMessage(message);
      });

      this.eventSource.addEventListener('user.typing', (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'user.typing',
          data: data,
          timestamp: new Date().toISOString()
        };
        this.handleMessage(message);
      });

      this.eventSource.addEventListener('user.status', (event) => {
        const data = JSON.parse(event.data);
        const message: SSEMessage = {
          event: 'user.status',
          data: data,
          timestamp: new Date().toISOString()
        };
        this.handleMessage(message);
      });

      this.eventSource.onerror = (error) => {
        console.error('❌ Error en SSE nativo:', error);
        this.statusSubject.next({
          connected: false,
          reconnecting: true,
          connectionCount: this.statusSubject.value.connectionCount
        });
        
        // Fallback to simulation if native SSE fails
        console.log('🔄 Fallback a simulación SSE...');
        this.eventSource?.close();
        this.eventSource = null;
        this.simulateSSEConnection(userId);
        
        this.statusSubject.next({
          connected: true,
          reconnecting: false,
          lastConnected: new Date(),
          connectionCount: this.statusSubject.value.connectionCount + 1
        });
        
        observer.next(true);
        observer.complete();
      };
    });
  }

  /**
   * Disconnect from SSE
   */
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    
    this.statusSubject.next({
      connected: false,
      reconnecting: false,
      connectionCount: this.statusSubject.value.connectionCount
    });
  }

  /**
   * Get SSE URL (Laravel Native SSE)
   */
  private getSSEUrl(userId: number): string {
    const baseUrl = environment.apiUrl.replace('/api', '');
    return `${baseUrl}/sse/connect?user_id=${userId}`;
  }

  /**
   * Handle incoming SSE messages
   */
  private handleMessage(message: SSEMessage): void {
    this.messageSubject.next(message);
  }

  /**
   * Attempt to reconnect (not used in simulation)
   */
  private attemptReconnect(userId: number): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    setTimeout(() => {
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
    }, this.reconnectInterval);
  }

  /**
   * Get connection status
   */
  getStatus(): Observable<SSEStatus> {
    return this.statusSubject.asObservable();
  }

  /**
   * Get messages
   */
  getMessages(): Observable<SSEMessage> {
    return this.messageSubject.asObservable();
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN || this.statusSubject.value.connected;
  }

  /**
   * Get connection statistics
   */
  getStats(): any {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      readyState: this.eventSource?.readyState || 'simulated',
      url: this.eventSource ? this.eventSource.url : 'simulated-sse'
    };
  }

  /**
   * Simulate SSE connection for testing
   */
  private simulateSSEConnection(userId: number): void {
    console.log('🎭 Iniciando simulación SSE para usuario:', userId);
    
    // Simulate initial connection
    setTimeout(() => {
      const connectedMessage: SSEMessage = {
        event: 'connected',
        data: {
          message: 'Conexión SSE simulada establecida',
          user_id: userId,
          timestamp: new Date().toISOString(),
          status: 'simulated'
        },
        timestamp: new Date().toISOString()
      };
      this.handleMessage(connectedMessage);
    }, 1000);

    // Simulate periodic heartbeat
    setInterval(() => {
      const heartbeatMessage: SSEMessage = {
        event: 'heartbeat',
        data: {
          message: 'Heartbeat simulado',
          count: Math.floor(Date.now() / 1000),
          timestamp: new Date().toISOString(),
          server_time: Math.floor(Date.now() / 1000),
          user_id: userId,
          server: 'simulated'
        },
        timestamp: new Date().toISOString()
      };
      this.handleMessage(heartbeatMessage);
    }, 30000); // Every 30 seconds

    // Simulate random messaging events
    setInterval(() => {
      const events = [
        {
          event: 'message.received',
          data: {
            message: 'Nuevo mensaje simulado recibido',
            message_id: Math.floor(Math.random() * 1000),
            sender_name: 'Usuario Simulado',
            conversation_id: 1,
            timestamp: new Date().toISOString()
          }
        },
        {
          event: 'user.typing',
          data: {
            user_id: 2,
            conversation_id: 1,
            is_typing: true,
            timestamp: new Date().toISOString()
          }
        },
        {
          event: 'user.status',
          data: {
            user_id: 2,
            status: 'online',
            timestamp: new Date().toISOString()
          }
        }
      ];

      const randomEvent = events[Math.floor(Math.random() * events.length)];
      const simulatedMessage: SSEMessage = {
        event: randomEvent.event,
        data: randomEvent.data,
        timestamp: new Date().toISOString()
      };
      
      this.handleMessage(simulatedMessage);
    }, 45000); // Every 45 seconds
  }
}