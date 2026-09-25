import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

/**
 * Bridge service to handle WebSocket messages without circular dependencies
 * This service acts as a message bus between CustomEchoWebSocketService and MessageService
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketMessageBridgeService {
  private messageSubject = new Subject<any>();
  public messages$ = this.messageSubject.asObservable();

  constructor() {
    console.log('🌉 WebSocketMessageBridgeService initialized');
  }

  /**
   * Emit a WebSocket message to all subscribers
   */
  emitMessage(message: any): void {
    console.log('🌉 Bridge: Emitting WebSocket message:', message);
    this.messageSubject.next(message);
  }

  /**
   * Subscribe to WebSocket messages
   */
  onMessage(): Observable<any> {
    return this.messages$;
  }
}












