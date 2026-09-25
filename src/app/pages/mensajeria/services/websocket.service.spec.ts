import { TestBed } from '@angular/core/testing';
import { WebSocketService, WebSocketMessage, MessageReceivedEvent } from './websocket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;
  let mockWebSocket: jasmine.SpyObj<WebSocket>;

  beforeEach(() => {
    // Create a mock WebSocket
    mockWebSocket = jasmine.createSpyObj('WebSocket', ['send', 'close']);
    mockWebSocket.readyState = WebSocket.OPEN;

    TestBed.configureTestingModule({
      providers: [WebSocketService]
    });
    service = TestBed.inject(WebSocketService);

    // Spy on WebSocket constructor
    spyOn(window, 'WebSocket').and.returnValue(mockWebSocket);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('connect', () => {
    it('should connect to WebSocket server', (done) => {
      const userId = 123;
      
      service.connect(userId).subscribe({
        next: (connected) => {
          expect(connected).toBe(true);
          done();
        },
        error: (error) => {
          fail('Connection should succeed');
        }
      });

      // Simulate WebSocket open event
      mockWebSocket.onopen?.(new Event('open'));
    });

    it('should handle connection errors', (done) => {
      const userId = 123;
      
      service.connect(userId).subscribe({
        next: () => {
          fail('Connection should fail');
        },
        error: (error) => {
          expect(error).toBeDefined();
          done();
        }
      });

      // Simulate WebSocket error event
      mockWebSocket.onerror?.(new Event('error'));
    });

    it('should send subscribe message on successful connection', (done) => {
      const userId = 123;
      
      service.connect(userId).subscribe({
        next: (connected) => {
          expect(mockWebSocket.send).toHaveBeenCalledWith(
            JSON.stringify({
              event: 'subscribe',
              data: { user_id: userId }
            })
          );
          done();
        }
      });

      mockWebSocket.onopen?.(new Event('open'));
    });
  });

  describe('disconnect', () => {
    it('should disconnect from WebSocket server', () => {
      service.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });

  describe('send', () => {
    it('should send data through WebSocket when connected', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      const data = { event: 'test', data: { message: 'hello' } };

      const result = service.send(data);

      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('should return false when WebSocket is not connected', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      const data = { event: 'test', data: { message: 'hello' } };

      const result = service.send(data);

      expect(result).toBe(false);
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('sendTyping', () => {
    it('should send typing indicator', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      const conversationId = 456;
      const isTyping = true;

      const result = service.sendTyping(conversationId, isTyping);

      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'typing',
          data: {
            conversation_id: conversationId,
            is_typing: isTyping
          }
        })
      );
    });
  });

  describe('sendHeartbeat', () => {
    it('should send heartbeat message', () => {
      mockWebSocket.readyState = WebSocket.OPEN;

      const result = service.sendHeartbeat();

      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        jasmine.stringMatching(/heartbeat/)
      );
    });
  });

  describe('markMessageAsRead', () => {
    it('should send message read event', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      const messageId = 789;
      const conversationId = 456;

      const result = service.markMessageAsRead(messageId, conversationId);

      expect(result).toBe(true);
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          event: 'message.read',
          data: {
            message_id: messageId,
            conversation_id: conversationId
          }
        })
      );
    });
  });

  describe('message handling', () => {
    it('should handle message.received events', () => {
      let receivedMessage: MessageReceivedEvent | undefined;
      
      service.getMessageReceived().subscribe(message => {
        receivedMessage = message;
      });

      const wsMessage: WebSocketMessage = {
        event: 'message.received',
        data: {
          message: { id: 1, content: 'Hello' },
          conversation: { id: 456 },
          timestamp: '2023-01-01T00:00:00Z',
          type: 'new_message'
        },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id'
      };

      // Simulate WebSocket message event
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(wsMessage)
      });
      mockWebSocket.onmessage?.(messageEvent);

      expect(receivedMessage).toBeDefined();
      expect(receivedMessage?.message.id).toBe(1);
      expect(receivedMessage?.conversation.id).toBe(456);
    });

    it('should handle message.read events', () => {
      let readMessage: any;
      
      service.getMessageRead().subscribe(message => {
        readMessage = message;
      });

      const wsMessage: WebSocketMessage = {
        event: 'message.read',
        data: {
          message_id: 1,
          user_id: 123,
          conversation_id: 456,
          read_at: '2023-01-01T00:00:00Z',
          timestamp: '2023-01-01T00:00:00Z',
          type: 'message_read'
        },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id'
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(wsMessage)
      });
      mockWebSocket.onmessage?.(messageEvent);

      expect(readMessage).toBeDefined();
      expect(readMessage.message_id).toBe(1);
      expect(readMessage.user_id).toBe(123);
    });

    it('should handle typing events', () => {
      let typingEvent: any;
      
      service.getTyping().subscribe(event => {
        typingEvent = event;
      });

      const wsMessage: WebSocketMessage = {
        event: 'user.typing',
        data: {
          user_id: 123,
          conversation_id: 456,
          is_typing: true,
          timestamp: '2023-01-01T00:00:00Z',
          type: 'typing'
        },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id'
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(wsMessage)
      });
      mockWebSocket.onmessage?.(messageEvent);

      expect(typingEvent).toBeDefined();
      expect(typingEvent.user_id).toBe(123);
      expect(typingEvent.is_typing).toBe(true);
    });

    it('should handle user status events', () => {
      let statusEvent: any;
      
      service.getUserStatus().subscribe(event => {
        statusEvent = event;
      });

      const wsMessage: WebSocketMessage = {
        event: 'user.status',
        data: {
          user_id: 123,
          status: 'online',
          timestamp: '2023-01-01T00:00:00Z',
          type: 'user_status'
        },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id'
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(wsMessage)
      });
      mockWebSocket.onmessage?.(messageEvent);

      expect(statusEvent).toBeDefined();
      expect(statusEvent.user_id).toBe(123);
      expect(statusEvent.status).toBe('online');
    });

    it('should handle system notifications', () => {
      let notification: any;
      
      service.getSystemNotifications().subscribe(notif => {
        notification = notif;
      });

      const wsMessage: WebSocketMessage = {
        event: 'notification.system',
        data: {
          notification: {
            id: 1,
            title: 'System Alert',
            message: 'System maintenance scheduled'
          },
          timestamp: '2023-01-01T00:00:00Z',
          type: 'system_notification'
        },
        timestamp: '2023-01-01T00:00:00Z',
        id: 'test-id'
      };

      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(wsMessage)
      });
      mockWebSocket.onmessage?.(messageEvent);

      expect(notification).toBeDefined();
      expect(notification.notification.title).toBe('System Alert');
    });
  });

  describe('connection state', () => {
    it('should track connection state changes', (done) => {
      const states: string[] = [];
      
      service.getConnectionState().subscribe(state => {
        states.push(state);
        if (states.length === 2) {
          expect(states).toEqual(['disconnected', 'connected']);
          done();
        }
      });

      // Simulate connection
      mockWebSocket.onopen?.(new Event('open'));
    });

    it('should handle connection close', (done) => {
      const states: string[] = [];
      
      service.getConnectionState().subscribe(state => {
        states.push(state);
        if (states.length === 2) {
          expect(states[1]).toBe('disconnected');
          done();
        }
      });

      // Simulate connection close
      mockWebSocket.onclose?.(new CloseEvent('close'));
    });
  });

  describe('isConnected', () => {
    it('should return true when WebSocket is open', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      expect(service.isConnected()).toBe(true);
    });

    it('should return false when WebSocket is closed', () => {
      mockWebSocket.readyState = WebSocket.CLOSED;
      expect(service.isConnected()).toBe(false);
    });

    it('should return false when WebSocket is connecting', () => {
      mockWebSocket.readyState = WebSocket.CONNECTING;
      expect(service.isConnected()).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return connection statistics', () => {
      mockWebSocket.readyState = WebSocket.OPEN;
      
      const stats = service.getStats();
      
      expect(stats.connected).toBe(true);
      expect(stats.readyState).toBe(WebSocket.OPEN);
      expect(stats.reconnectAttempts).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle malformed JSON messages gracefully', () => {
      spyOn(console, 'error');
      
      const messageEvent = new MessageEvent('message', {
        data: 'invalid json'
      });
      mockWebSocket.onmessage?.(messageEvent);
      
      expect(console.error).toHaveBeenCalled();
    });
  });
});



