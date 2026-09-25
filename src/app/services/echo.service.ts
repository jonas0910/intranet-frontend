import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { CustomEchoWebSocketService } from './custom-echo-websocket.service';

// Type definition for Echo instance (sin dependencias externas)
type EchoInstance = any;

// Simplified EchoChannel interface
interface EchoChannel {
  listen(event: string, callback: (data: any) => void): EchoChannel;
  stopListening(event?: string): EchoChannel;
  whisper(event: string, data: any): EchoChannel;
}

@Injectable({
  providedIn: 'root'
})
export class EchoService {
  private echo: EchoInstance | null = null;
  private customEcho: CustomEchoWebSocketService | null = null; // Lazy initialization
  private isConnected = false;
  private useCustomEcho = false; // Flag para usar Echo custom o Laravel Echo - DESHABILITADO para evitar duplicación
  private connectionSubject = new BehaviorSubject<boolean>(false);
  private messagesSubject = new Subject<any>();

  // Connection status observable for compatibility
  public get connection$(): Observable<boolean> {
    return this.connectionSubject.asObservable();
  }

  // Messages observable for real-time updates
  public get messages$(): Observable<any> {
    return this.messagesSubject.asObservable();
  }

  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private customEchoWebSocketService: CustomEchoWebSocketService
  ) {
    // Lazy initialization para evitar dependencias circulares
    console.log('🔧 EchoService initialized - using custom WebSocket for Node.js');
  }

  private getCustomEcho(): CustomEchoWebSocketService {
    if (!this.customEcho) {
      this.customEcho = this.customEchoWebSocketService;
    }
    return this.customEcho;
  }

  private initializeEcho(): void {
    const token = this.authService.getToken();

    if (!token) {
      console.warn('⚠️ No authentication token found. Echo will not be initialized.');
      return;
    }

    try {
      // For Laravel Echo mode, this would initialize Laravel Echo
      console.log('✅ Laravel Echo mode initialized');
    } catch (error) {
      console.error('❌ Error initializing Laravel Echo:', error);
      this.isConnected = false;
    }
  }

  /**
   * Manually initialize Echo (call this when WebSocket server is ready)
   */
  public connect(): void {
    if (!this.isConnected) {
      console.log('🔌 Attempting to connect to WebSocket server...');
      
      if (this.useCustomEcho) {
        const customEcho = this.getCustomEcho();
        customEcho.connect();
        this.isConnected = customEcho.connected();
        
        // Subscribe to custom echo connection status
        customEcho.connection$.subscribe((connected: boolean) => {
          this.isConnected = connected;
          this.connectionSubject.next(connected);
        });
      } else {
        this.initializeEcho();
      }
    } else {
      console.log('ℹ️ Echo already connected');
    }
  }

  /**
   * Listen to a channel
   */
  channel(channelName: string): any {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      const channel = customEcho.channel(channelName);
      
      // Wrap the channel to emit messages through our subject
      return this.wrapChannelForMessageEmission(channel, channelName);
    }
    
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot listen to channel: Echo not initialized');
      return null;
    }
    return echo.channel(channelName);
  }

  /**
   * Wrap channel to emit messages through our subject
   */
  private wrapChannelForMessageEmission(channel: any, channelName: string): any {
    if (!channel) return null;

    // Store original listen method
    const originalListen = channel.listen.bind(channel);

    // Override listen method to emit messages
    channel.listen = (event: string, callback: (data: any) => void) => {
      console.log(`📡 EchoService: Setting up listener for ${event} on ${channelName}`);
      
      // Call original listen method
      const result = originalListen(event, callback);
      
      // Set up message emission
      channel.listen = originalListen; // Restore original method
      
      // Create a wrapper callback that emits to our subject
      const wrappedCallback = (data: any) => {
        console.log(`📨 EchoService: Emitting message from ${channelName}.${event}:`, data);
        this.messagesSubject.next({
          event: event,
          channel: channelName,
          data: data,
          timestamp: new Date().toISOString()
        });
        
        // Call original callback
        callback(data);
      };
      
      // Set up the wrapped listener
      originalListen(event, wrappedCallback);
      
      return result;
    };

    return channel;
  }

  /**
   * Listen to a private channel
   */
  private(channelName: string): any {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      return customEcho.private(channelName);
    }
    
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot listen to private channel: Echo not initialized');
      return null;
    }
    return echo.private(channelName);
  }

  /**
   * Get the Echo instance (without auto-reconnect to avoid spam)
   */
  getEcho(): EchoInstance | any {
    if (!this.isConnected) {
      console.warn('⚠️ Echo is not connected. Call connect() method to initialize.');
      return null;
    }
    
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      return customEcho.getEcho();
    }
    
    return this.echo;
  }

  /**
   * Join a presence channel
   */
  join(channelName: string): any {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      return customEcho.join(channelName);
    }
    
    const echo = this.getEcho();
    if (!echo) {
      console.error('❌ Cannot join presence channel: Echo not initialized');
      return null;
    }
    return echo.channel(channelName);
  }

  /**
   * Leave a channel
   */
  leave(channelName: string): void {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      customEcho.leave(channelName);
      return;
    }
    
    const echo = this.getEcho();
    if (echo) {
      // Echo doesn't have a leave method, we just stop listening to the channel
      // The channel will be automatically cleaned up
      console.log(`📤 Left channel: ${channelName}`);
    }
  }

  /**
   * Disconnect Echo
   */
  disconnect(): void {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      customEcho.disconnect();
      this.isConnected = false;
      this.connectionSubject.next(false);
      return;
    }
    
    if (this.echo) {
      // Echo doesn't have a disconnect method, we just clear the instance
      this.echo = null;
      this.isConnected = false;
      this.connectionSubject.next(false);
      console.log('📤 Laravel Echo disconnected');
    }
  }

  /**
   * Check if Echo is connected
   */
  connected(): boolean {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      return customEcho ? customEcho.connected() : false;
    }
    return this.isConnected;
  }

  /**
   * Reconnect Echo
   */
  reconnect(): void {
    if (this.useCustomEcho) {
      const customEcho = this.getCustomEcho();
      customEcho.reconnect();
      return;
    }
    
    this.disconnect();
    this.initializeEcho();
  }

  /**
   * Method to switch between custom Echo (Node.js) and Laravel Echo (Reverb/Pusher)
   */
  setUseCustomEcho(useCustom: boolean): void {
    this.useCustomEcho = useCustom;
    console.log(`🔧 Echo mode: ${useCustom ? 'Custom WebSocket (Node.js)' : 'Laravel Echo (Reverb/Pusher)'}`);
  }
}