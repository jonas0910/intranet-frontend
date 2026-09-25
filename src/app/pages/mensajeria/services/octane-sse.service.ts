import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, Subject, timer } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface SSEStatus {
  connected: boolean;
  connectionId?: string;
  userId?: number;
  lastHeartbeat?: string;
  error?: string;
}

export interface SSEMessage {
  type: string;
  data: any;
  timestamp: string;
}

@Injectable({
  providedIn: 'root'
})
export class OctaneSSEService {
  private eventSource: EventSource | null = null;
  private statusSubject = new BehaviorSubject<SSEStatus>({ connected: false });
  private messageSubject = new Subject<SSEMessage>();
  private heartbeatTimer: any;
  private reconnectTimer: any;
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;
  private baseUrl = environment.apiUrl || 'http://127.0.0.1:8000';

  public status$ = this.statusSubject.asObservable();
  public messages$ = this.messageSubject.asObservable();

  constructor() {
    console.log('🚀 OctaneSSEService inicializado');
  }

  /**
   * Conectar a SSE con Octane/Swoole
   */
  connect(userId: number): Observable<boolean> {
    return new Observable(observer => {
      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        console.log('✅ Ya conectado a SSE Octane');
        observer.next(true);
        observer.complete();
        return;
      }

      this.disconnect(); // Limpiar conexión anterior

      console.log('🔄 Conectando a SSE Octane para usuario:', userId);
      const sseUrl = `${this.baseUrl}/api/octane/sse/connect?user_id=${userId}`;
      
      try {
        this.eventSource = new EventSource(sseUrl);

        this.eventSource.onopen = () => {
          console.log('✅ Conexión SSE Octane establecida');
          this.statusSubject.next({
            connected: true,
            userId: userId,
            lastHeartbeat: new Date().toISOString()
          });
          this.reconnectAttempts = 0;
          this.startHeartbeatTimer();
          observer.next(true);
          observer.complete();
        };

        this.eventSource.onmessage = (event) => {
          this.handleMessage(event);
        };

        // Eventos específicos de Octane
        this.eventSource.addEventListener('connected', (event) => {
          const data = JSON.parse(event.data);
          console.log('🔗 SSE Octane conectado:', data);
          this.statusSubject.next({
            connected: true,
            connectionId: data.connection_id,
            userId: data.user_id,
            lastHeartbeat: data.timestamp
          });
        });

        this.eventSource.addEventListener('heartbeat', (event) => {
          const data = JSON.parse(event.data);
          console.log('💓 Heartbeat SSE Octane:', data);
          this.statusSubject.next({
            connected: true,
            lastHeartbeat: data.timestamp
          });
        });

        this.eventSource.addEventListener('new_message', (event) => {
          const data = JSON.parse(event.data);
          console.log('📨 Nuevo mensaje SSE Octane:', data);
          this.messageSubject.next({
            type: 'new_message',
            data: data,
            timestamp: data.timestamp
          });
        });

        this.eventSource.addEventListener('notification', (event) => {
          const data = JSON.parse(event.data);
          console.log('🔔 Notificación SSE Octane:', data);
          this.messageSubject.next({
            type: 'notification',
            data: data,
            timestamp: data.timestamp
          });
        });

        this.eventSource.addEventListener('user_online', (event) => {
          const data = JSON.parse(event.data);
          console.log('👤 Usuario online SSE Octane:', data);
          this.messageSubject.next({
            type: 'user_online',
            data: data,
            timestamp: data.timestamp
          });
        });

        this.eventSource.addEventListener('user_offline', (event) => {
          const data = JSON.parse(event.data);
          console.log('👤 Usuario offline SSE Octane:', data);
          this.messageSubject.next({
            type: 'user_offline',
            data: data,
            timestamp: data.timestamp
          });
        });

        this.eventSource.addEventListener('typing', (event) => {
          const data = JSON.parse(event.data);
          console.log('⌨️ Usuario escribiendo SSE Octane:', data);
          this.messageSubject.next({
            type: 'typing',
            data: data,
            timestamp: data.timestamp
          });
        });

        this.eventSource.onerror = (error) => {
          console.error('❌ Error en SSE Octane:', error);
          this.handleConnectionError(observer);
        };

      } catch (error) {
        console.error('❌ Error creando EventSource:', error);
        this.handleConnectionError(observer);
      }
    });
  }

  /**
   * Manejar mensajes SSE
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      console.log('📩 Mensaje SSE Octane:', data);
      
      this.messageSubject.next({
        type: 'message',
        data: data,
        timestamp: data.timestamp || new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Error procesando mensaje SSE:', error);
    }
  }

  /**
   * Manejar errores de conexión
   */
  private handleConnectionError(observer?: any): void {
    this.statusSubject.next({
      connected: false,
      error: 'Error de conexión SSE Octane'
    });

    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      
      console.log(`🔄 Reintentando conexión SSE Octane en ${delay}ms (intento ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      this.reconnectTimer = setTimeout(() => {
        // Intentar reconectar automáticamente
        const userId = this.statusSubject.value.userId;
        if (userId) {
          this.connect(userId).subscribe();
        }
      }, delay);
    } else {
      console.error('❌ Máximo número de intentos de reconexión alcanzado');
      this.statusSubject.next({
        connected: false,
        error: 'No se pudo establecer conexión después de múltiples intentos'
      });
    }

    if (observer) {
      observer.error('Error de conexión SSE Octane');
    }
  }

  /**
   * Iniciar timer de heartbeat
   */
  private startHeartbeatTimer(): void {
    this.stopHeartbeatTimer();
    
    this.heartbeatTimer = timer(30000, 30000).subscribe(() => {
      if (this.eventSource && this.eventSource.readyState === EventSource.OPEN) {
        console.log('💓 Enviando heartbeat SSE Octane');
        // El servidor enviará heartbeat automáticamente
      } else {
        console.warn('⚠️ EventSource no está abierto, intentando reconectar...');
        const userId = this.statusSubject.value.userId;
        if (userId) {
          this.connect(userId).subscribe();
        }
      }
    });
  }

  /**
   * Detener timer de heartbeat
   */
  private stopHeartbeatTimer(): void {
    if (this.heartbeatTimer) {
      this.heartbeatTimer.unsubscribe();
      this.heartbeatTimer = null;
    }
  }

  /**
   * Desconectar SSE
   */
  disconnect(): void {
    console.log('🔌 Desconectando SSE Octane');
    
    this.stopHeartbeatTimer();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.statusSubject.next({ connected: false });
    this.reconnectAttempts = 0;
  }

  /**
   * Verificar si está conectado
   */
  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN;
  }

  /**
   * Obtener estado actual
   */
  getCurrentStatus(): SSEStatus {
    return this.statusSubject.value;
  }

  /**
   * Enviar mensaje al servidor (si está soportado)
   */
  sendMessage(message: any): void {
    if (!this.isConnected()) {
      console.warn('⚠️ No hay conexión SSE activa');
      return;
    }

    // En SSE estándar no se pueden enviar mensajes al servidor
    // Esto requeriría WebSockets o polling
    console.log('📤 Mensaje para enviar:', message);
  }

  /**
   * Obtener estadísticas del servidor Octane
   */
  getServerStats(): Observable<any> {
    return new Observable(observer => {
      fetch(`${this.baseUrl}/api/octane/health`)
        .then(response => response.json())
        .then(data => {
          observer.next(data);
          observer.complete();
        })
        .catch(error => {
          observer.error(error);
        });
    });
  }

  /**
   * Verificar estado del servidor
   */
  checkServerHealth(): Observable<any> {
    return new Observable(observer => {
      fetch(`${this.baseUrl}/api/octane/health`)
        .then(response => response.json())
        .then(data => {
          observer.next({
            healthy: data.status === 'healthy',
            data: data
          });
          observer.complete();
        })
        .catch(error => {
          observer.next({
            healthy: false,
            error: error.message
          });
          observer.complete();
        });
    });
  }
}


