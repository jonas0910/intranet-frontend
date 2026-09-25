import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, Subject, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { Message, MessageResponse, SendMessageRequest } from '../models/message.model';
import { Conversation } from '../models/conversation.model';
import { Attachment } from '../models/attachment.model';
import { EchoService } from '../../../services/echo.service';
import { WebSocketMessageBridgeService } from '../../../services/websocket-message-bridge.service';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private baseUrl = `${environment.apiUrl}/v1/mensajeria`;
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  // Real-time message subject
  private newMessageSubject = new Subject<any>();
  public newMessage$ = this.newMessageSubject.asObservable();

  // User typing subject
  private userTypingSubject = new Subject<{ userId: number; userName: string; canalId: number; isTyping: boolean }>();
  public userTyping$ = this.userTypingSubject.asObservable();

  // WebSocket messages subject for real-time updates
  private webSocketMessagesSubject = new Subject<any>();
  public webSocketMessages$ = this.webSocketMessagesSubject.asObservable();

  private subscribedChannels: Set<number> = new Set();
  private typingTimeout: any;

  constructor(
    private http: HttpClient,
    private echoService: EchoService,
    private webSocketBridge: WebSocketMessageBridgeService
  ) {
    this.loadUnreadCount();
    // Subscribe to WebSocket bridge for real-time updates
    this.subscribeToWebSocketBridge();
  }

  /**
   * Subscribe to WebSocket bridge for real-time updates
   */
  private subscribeToWebSocketBridge(): void {
    console.log('🌉 MessageService: Subscribing to WebSocket bridge');
    this.webSocketBridge.onMessage().subscribe({
      next: (message) => {
        console.log('🌉 MessageService: Received message from bridge:', message);
        this.handleWebSocketMessage(message);
      },
      error: (error) => {
        console.error('🌉 MessageService: Error receiving message from bridge:', error);
      }
    });
  }

  /**
   * Get messages with pagination and filters
   */
  getMessages(params: any = {}): Observable<MessageResponse> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    console.log('📤 MessageService: Getting messages with params:', params);
    console.log('📤 MessageService: HTTP params:', httpParams.toString());
    console.log('📤 MessageService: Full URL:', `${this.baseUrl}/messages`);

    return this.http.get<MessageResponse>(`${this.baseUrl}/messages`, { params: httpParams })
      .pipe(
        tap((response) => {
          console.log('📥 MessageService: Raw response received:', response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get a specific message by ID
   */
  getMessage(id: number): Observable<Message> {
    return this.http.get<Message>(`${this.baseUrl}/messages/${id}`)
      .pipe(
        tap(() => this.loadUnreadCount()), // Refresh unread count after viewing
        catchError(this.handleError)
      );
  }

  /**
   * Send a new message
   */
  sendMessage(messageData: SendMessageRequest): Observable<Message> {
    console.log('📤 MessageService - Sending message with data:', JSON.stringify(messageData, null, 2));
    console.log('📤 MessageService - Recipients type check:', typeof messageData.recipients[0]);
    
    // Check if message has attachments
    if (messageData.attachments && messageData.attachments.length > 0) {
      // Use FormData for file uploads
      const formData = new FormData();

      // Add text fields - asegurar que content tenga un valor
      const content = messageData.content && messageData.content.trim() !== ''
        ? messageData.content.trim()
        : 'Archivo adjunto';

      // Only append conversation_id if it has a valid value
      if (messageData.conversation_id && messageData.conversation_id > 0) {
        formData.append('conversation_id', messageData.conversation_id.toString());
      }
      formData.append('content', content);
      formData.append('priority', messageData.priority || 'normal');
      formData.append('message_type', messageData.message_type || 'individual');

      // Add recipients if any
      if (messageData.recipients && messageData.recipients.length > 0) {
        messageData.recipients.forEach((recipient, index) => {
          formData.append(`recipients[${index}]`, recipient.id.toString());
        });
      }

      // Add attachments - usar attachments[] en lugar de attachments[0], attachments[1]
      // Laravel detecta mejor los archivos con este formato
      messageData.attachments.forEach((file) => {
        formData.append('attachments[]', file);
      });

      console.log('📤 Enviando FormData con archivos adjuntos:');
      console.log('  - Content:', content);
      console.log('  - Attachments:', messageData.attachments.length);
      console.log('  - Conversation ID:', messageData.conversation_id);

      // Log detallado del FormData
      console.log('📋 Contenido completo del FormData:');
      (formData as any).forEach((value: any, key: string) => {
        if (value instanceof File) {
          console.log(`  ${key}:`, `[File: ${value.name}, Size: ${value.size}, Type: ${value.type}]`);
        } else {
          console.log(`  ${key}:`, value);
        }
      });

      return this.http.post<any>(`${this.baseUrl}/messages`, formData)
        .pipe(
          map((response: any) => response.data || response),
          tap((message) => {
            console.log('✅ Mensaje con archivos enviado:', message);
            this.loadUnreadCount();
          }),
          catchError(this.handleError)
        );
    } else {
      // Use regular JSON for text-only messages
      console.log('📤 Enviando JSON sin archivos adjuntos:');
      console.log('  - Content:', messageData.content);
      console.log('  - Recipients:', messageData.recipients);
      console.log('  - Conversation ID:', messageData.conversation_id);
      
      return this.http.post<any>(`${this.baseUrl}/messages`, messageData)
        .pipe(
          map((response: any) => response.data || response),
          tap((message) => {
            console.log('✅ Mensaje enviado:', message);
            this.loadUnreadCount();
          }),
          catchError(this.handleError)
        );
    }
  }

  /**
   * Reply to a message
   */
  replyToMessage(messageId: number, replyData: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/messages/${messageId}/reply`, replyData)
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Forward a message
   */
  forwardMessage(messageId: number, forwardData: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/messages/${messageId}/forward`, forwardData)
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Mark message as read
   */
  markAsRead(messageId: number | number[]): Observable<any> {
    // If array, use batch endpoint
    if (Array.isArray(messageId)) {
      return this.http.post(`${this.baseUrl}/messages/mark-multiple-read`, { message_ids: messageId })
        .pipe(
          tap(() => this.loadUnreadCount()),
          catchError(this.handleError)
        );
    }

    // Single message
    return this.http.post(`${this.baseUrl}/messages/${messageId}/read`, {})
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Mark message as unread
   */
  markAsUnread(messageId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages/${messageId}/unread`, {})
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Mark message as important
   */
  markAsImportant(messageId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/mensajes/${messageId}/important`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Unmark message as important
   */
  unmarkAsImportant(messageId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/mensajes/${messageId}/important`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete a message
   */
  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/mensajes/${messageId}`)
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Delete multiple messages
   */
  deleteMessages(messageIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/mensajes/batch/delete`, { message_ids: messageIds })
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Move messages to a folder
   */
  moveToFolder(messageIds: number[], folder: string): Observable<any> {
    return this.http.post(`${this.baseUrl}/mensajes/batch/move`, {
      message_ids: messageIds,
      folder: folder
    })
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Bulk operations on messages
   */
  bulkOperation(operation: string, messageIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/messages/bulk`, {
      operation,
      message_ids: messageIds
    }).pipe(
      tap(() => this.loadUnreadCount()),
      catchError(this.handleError)
    );
  }

  /**
   * Get draft messages
   */
  getDrafts(): Observable<MessageResponse> {
    return this.http.get<MessageResponse>(`${this.baseUrl}/drafts`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Save message as draft
   */
  saveDraft(draftData: SendMessageRequest): Observable<Message> {
    return this.http.post<Message>(`${this.baseUrl}/drafts`, draftData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Update draft
   */
  updateDraft(draftId: number, draftData: SendMessageRequest): Observable<Message> {
    return this.http.put<Message>(`${this.baseUrl}/drafts/${draftId}`, draftData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete draft
   */
  deleteDraft(draftId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/drafts/${draftId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get sent messages
   */
  getSentMessages(params: any = {}): Observable<MessageResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<MessageResponse>(`${this.baseUrl}/sent`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get important messages
   */
  getImportantMessages(params: any = {}): Observable<MessageResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<MessageResponse>(`${this.baseUrl}/important`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get archived messages
   */
  getArchivedMessages(params: any = {}): Observable<MessageResponse> {
    let httpParams = new HttpParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<MessageResponse>(`${this.baseUrl}/archived`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Archive messages
   */
  archiveMessages(messageIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/archive`, { message_ids: messageIds })
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Unarchive messages
   */
  unarchiveMessages(messageIds: number[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/unarchive`, { message_ids: messageIds })
      .pipe(
        tap(() => this.loadUnreadCount()),
        catchError(this.handleError)
      );
  }

  /**
   * Search messages
   */
  searchMessages(query: string, filters: any = {}): Observable<MessageResponse> {
    let params = new HttpParams().set('q', query);
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<MessageResponse>(`${this.baseUrl}/search`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get message statistics
   */
  getStatistics(filters: any = {}): Observable<any> {
    let params = new HttpParams();
    
    Object.keys(filters).forEach(key => {
      if (filters[key] !== null && filters[key] !== undefined && filters[key] !== '') {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<any>(`${this.baseUrl}/statistics`, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Load unread count
   */
  private loadUnreadCount(): void {
    this.http.get<{ success: boolean; count: number }>(`${this.baseUrl}/unread-count`)
      .pipe(
        catchError(() => throwError(() => 'Failed to load unread count'))
      )
      .subscribe({
        next: (response) => this.unreadCountSubject.next(response.count),
        error: (error) => console.error('Error loading unread count:', error)
      });
  }

  /**
   * Load unread count and return observable
   */
  private loadUnreadCountObservable(): Observable<number> {
    return this.http.get<{ success: boolean; count: number }>(`${this.baseUrl}/unread-count`)
      .pipe(
        map(response => response.count),
        tap(count => this.unreadCountSubject.next(count)),
        catchError(() => throwError(() => 'Failed to load unread count'))
      );
  }

  /**
   * Get current unread count
   */
  getUnreadCount(): number {
    return this.unreadCountSubject.value;
  }

  /**
   * Get recent messages (for notification center)
   */
  getRecentMessages(limit: number = 10): Observable<any> {
    return this.http.get(`${this.baseUrl}/messages`, {
      params: { limit: limit.toString(), folder: 'inbox', sort: 'created_at', order: 'desc' }
    }).pipe(
      catchError(error => {
        console.error('Error loading recent messages:', error);
        return of({ data: [] });
      })
    );
  }

  /**
   * Get conversations
   */
  getConversations(params: any = {}): Observable<any> {
    let httpParams = new HttpParams();

    Object.keys(params).forEach(key => {
      if (params[key] !== null && params[key] !== undefined && params[key] !== '') {
        httpParams = httpParams.set(key, params[key].toString());
      }
    });

    return this.http.get<any>(`${this.baseUrl}/conversations`, { params: httpParams })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mark conversation as read
   */
  markConversationAsRead(conversationId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/conversations/${conversationId}/read`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Mark conversation as important
   */
  markImportantConversation(conversationId: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/conversations/${conversationId}/important`, {})
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Unmark conversation as important
   */
  unmarkImportantConversation(conversationId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/conversations/${conversationId}/important`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete conversation
   */
  deleteConversation(conversationId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/conversations/${conversationId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Advanced search
   */
  advancedSearch(params: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/advanced-search`, params)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Get saved searches
   */
  getSavedSearches(): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/saved-searches`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Save search
   */
  saveSearch(searchData: any): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/saved-searches`, searchData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Delete saved search
   */
  deleteSavedSearch(searchId: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/saved-searches/${searchId}`)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Subscribe to user's private channel for messages
   */
  subscribeToUserChannel(userChannel: string): void {
    console.log(`📡 Subscribing to user channel: ${userChannel}`);
    
    // Initialize Echo if not connected
    if (!this.echoService.connected()) {
      console.log('🔌 Initializing Echo service...');
      this.echoService.connect();
    }

    const channel = this.echoService.private(userChannel);

    if (channel) {
      // Listen for new messages
      channel.listen('.message.received', (data: any) => {
        console.log('📨 New message received via user channel:', data);
        this.newMessageSubject.next(data);
        this.loadUnreadCount(); // Update unread count
      });

      console.log(`✅ Subscribed to user channel: ${userChannel}`);
    } else {
      console.error(`❌ Failed to subscribe to user channel: ${userChannel}`);
    }
  }

  /**
   * Subscribe to a chat channel for real-time messages
   */
  subscribeToChannel(canalId: number): void {
    if (this.subscribedChannels.has(canalId)) {
      console.log(`✅ Already subscribed to channel ${canalId}`);
      return;
    }

    const channelName = `chat.${canalId}`;
    console.log(`📡 Subscribing to channel: ${channelName}`);

    // Initialize Echo if not connected
    if (!this.echoService.connected()) {
      console.log('🔌 Initializing Echo service...');
      this.echoService.connect();

      // Subscribe to Echo connection status
      this.echoService.connection$.subscribe((connected: boolean) => {
        if (connected) {
          console.log('✅ Echo connected successfully');
        } else {
          console.log('❌ Echo disconnected');
        }
      });
    }

    const channel = this.echoService.channel(channelName);

    if (channel) {
      // Listen for new messages
      channel.listen('.message.sent', (data: any) => {
        console.log('📨 New message received via WebSocket:', data);
        this.newMessageSubject.next(data);
        this.loadUnreadCount(); // Update unread count
      });

      // Listen for user typing
      channel.listen('.user.typing', (data: any) => {
        console.log('⌨️ User typing event:', data);
        this.userTypingSubject.next({
          userId: data.user_id,
          userName: data.user_name,
          canalId: data.canal_id,
          isTyping: data.is_typing
        });
      });

      this.subscribedChannels.add(canalId);
      console.log(`✅ Subscribed to channel: ${channelName}`);
    } else {
      console.error(`❌ Failed to subscribe to channel: ${channelName}`);
    }
  }

  /**
   * Unsubscribe from a chat channel
   */
  unsubscribeFromChannel(canalId: number): void {
    const channelName = `chat.${canalId}`;

    this.echoService.leave(channelName);
    this.subscribedChannels.delete(canalId);

    console.log(`📤 Unsubscribed from channel: ${channelName}`);
  }

  /**
   * Unsubscribe from all channels
   */
  unsubscribeFromAllChannels(): void {
    this.subscribedChannels.forEach(canalId => {
      this.unsubscribeFromChannel(canalId);
    });
    console.log('📤 Unsubscribed from all channels');
  }

  /**
   * Get subscribed channels
   */
  getSubscribedChannels(): number[] {
    return Array.from(this.subscribedChannels);
  }

  /**
   * Emit typing indicator
   */
  emitTyping(canalId: number, isTyping: boolean): void {
    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Send typing event to backend
    this.http.post(`${this.baseUrl}/typing`, {
      canal_id: canalId,
      is_typing: isTyping
    }).subscribe({
      next: () => console.log(`⌨️ Typing event sent: ${isTyping}`),
      error: (error) => console.error('❌ Error sending typing event:', error)
    });

    // Auto-stop typing after 3 seconds
    if (isTyping) {
      this.typingTimeout = setTimeout(() => {
        this.emitTyping(canalId, false);
      }, 3000);
    }
  }

  /**
   * Get messages for a specific conversation
   */
  getMessagesForConversation(conversationId: number): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/conversations/${conversationId}/messages`)
      .pipe(
        map((response) => {
          console.log('✅ Messages for conversation loaded:', response);
          // Extract messages from response structure
          return response.data || [];
        }),
        tap((messages) => {
          console.log('📨 Messages extracted:', messages);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get conversation participants
   */
  getConversationParticipants(conversationId: number): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/conversations/${conversationId}/participants`)
      .pipe(
        map((response) => {
          console.log('✅ Conversation participants loaded:', response);
          // Extract participants from response structure
          return response.data || [];
        }),
        tap((participants) => {
          console.log('👥 Participants extracted:', participants);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Get user contacts for chat
   */
  getContacts(): Observable<any[]> {
    return this.http.get<any>(`${this.baseUrl}/contacts`)
      .pipe(
        map((response) => {
          console.log('✅ Contacts loaded:', response);
          // Extract contacts from response structure
          return response.data || [];
        }),
        tap((contacts) => {
          console.log('👤 Contacts extracted:', contacts);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create a new conversation
   */
  createConversation(data: { title: string; type: string; participant_ids: number[] }): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/conversations`, data)
      .pipe(
        tap((response) => {
          console.log('✅ Conversación creada exitosamente:', response);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Create or get individual conversation with a user
   */
  createIndividualConversation(userId: number): Observable<any> {
    const payload = { user_id: userId };
    console.log('📤 Creando conversación individual con payload:', payload);
    console.log('📍 URL:', `${this.baseUrl}/conversations/individual`);

    return this.http.post<any>(`${this.baseUrl}/conversations/individual`, payload)
      .pipe(
        tap((response: any) => {
          console.log('📥 Respuesta del servidor:', response);
        }),
        map((response: any) => response.data || response),
        tap((conversation) => {
          console.log('✅ Conversación individual creada/recuperada:', conversation);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    console.error('MessageService error:', error);
    console.error('Error details:', {
      status: error.status,
      statusText: error.statusText,
      message: error.error?.message,
      errors: error.error?.errors
    });

    let errorMessage = 'Ha ocurrido un error inesperado';

    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    }

    // Log validation errors if present
    if (error.error?.errors) {
      console.error('Validation errors:', error.error.errors);
    }

    return throwError(() => errorMessage);
  }

  /**
   * Get WebSocket messages observable for real-time updates
   */
  getWebSocketMessages$(): Observable<any> {
    return this.webSocketMessages$;
  }

  /**
   * Handle WebSocket message from main WebSocketService
   */
  handleWebSocketMessage(message: any): void {
    console.log('📨 MessageService: Processing WebSocket message:', message);
    console.log('📨 MessageService: Message event:', message.event);
    console.log('📨 MessageService: Message data:', message.data);
    
    // Update unread count when a new message is received
    if (message.event === 'message.received') {
      console.log('📨 MessageService: New message received, refreshing unread count');
      this.loadUnreadCount();
    }
    
    this.webSocketMessagesSubject.next(message);
    console.log('📨 MessageService: Message forwarded to webSocketMessagesSubject');
  }

  /**
   * Get unread count observable
   */
  getUnreadCount$(): Observable<number> {
    return this.unreadCount$;
  }

  /**
   * Refresh unread count
   */
  refreshUnreadCount(): Observable<number> {
    return this.loadUnreadCountObservable();
  }

  /**
   * Join a conversation/group/channel
   */
  joinConversation(conversationId: number): Observable<any> {
    console.log('➕ MessageService: Unirse a conversación:', conversationId);
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/join`, {}).pipe(
      catchError(error => {
        console.error('Error joining conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Leave a conversation/group/channel
   */
  leaveConversation(conversationId: number): Observable<any> {
    console.log('➖ MessageService: Salir de conversación:', conversationId);
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/leave`, {}).pipe(
      catchError(error => {
        console.error('Error leaving conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Add participants to a conversation
   */
  addParticipantsToConversation(conversationId: number, userIds: number[]): Observable<any> {
    console.log('👥 MessageService: Agregar participantes:', conversationId, userIds);
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/participants`, {
      user_ids: userIds
    }).pipe(
      catchError(error => {
        console.error('Error adding participants:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Remove a participant from a conversation
   */
  removeParticipantFromConversation(conversationId: number, userId: number): Observable<any> {
    console.log('👤 MessageService: Eliminar participante:', conversationId, userId);
    return this.http.delete(`${this.baseUrl}/conversations/${conversationId}/participants/${userId}`).pipe(
      catchError(error => {
        console.error('Error removing participant:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Move message to folder (including archive)
   */
  moveMessageToFolder(messageId: number, folder: string): Observable<any> {
    console.log('📁 MessageService: Mover mensaje a carpeta:', messageId, folder);
    return this.http.post(`${this.baseUrl}/messages/${messageId}/move`, { folder }).pipe(
      catchError(error => {
        console.error('Error moving message:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Archive conversation
   */
  archiveConversation(conversationId: number): Observable<any> {
    console.log('📦 MessageService: Archivar conversación:', conversationId);
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/archive`, {}).pipe(
      catchError(error => {
        console.error('Error archiving conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Unarchive conversation
   */
  unarchiveConversation(conversationId: number): Observable<any> {
    console.log('📤 MessageService: Desarchivar conversación:', conversationId);
    return this.http.post(`${this.baseUrl}/conversations/${conversationId}/unarchive`, {}).pipe(
      catchError(error => {
        console.error('Error unarchiving conversation:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get contact requests (sent or received)
   */
  getContactRequests(type: 'sent' | 'received'): Observable<any> {
    console.log('👋 MessageService: Obtener solicitudes de contacto:', type);
    return this.http.get(`${this.baseUrl}/contact-requests`, {
      params: { type }
    }).pipe(
      catchError(error => {
        console.error('Error getting contact requests:', error);
        return of({ data: [] });
      })
    );
  }

  /**
   * Send contact request
   */
  sendContactRequest(userId: number, message?: string): Observable<any> {
    console.log('➕ MessageService: Enviar solicitud de contacto a:', userId);
    return this.http.post(`${this.baseUrl}/contact-requests`, {
      receiver_id: userId,
      message: message
    }).pipe(
      catchError(error => {
        console.error('Error sending contact request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Accept contact request
   */
  acceptContactRequest(requestId: number): Observable<any> {
    console.log('✅ MessageService: Aceptar solicitud:', requestId);
    return this.http.post(`${this.baseUrl}/contact-requests/${requestId}/accept`, {}).pipe(
      catchError(error => {
        console.error('Error accepting contact request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Reject contact request
   */
  rejectContactRequest(requestId: number): Observable<any> {
    console.log('❌ MessageService: Rechazar solicitud:', requestId);
    return this.http.post(`${this.baseUrl}/contact-requests/${requestId}/reject`, {}).pipe(
      catchError(error => {
        console.error('Error rejecting contact request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Cancel contact request
   */
  cancelContactRequest(requestId: number): Observable<any> {
    console.log('🚫 MessageService: Cancelar solicitud:', requestId);
    return this.http.delete(`${this.baseUrl}/contact-requests/${requestId}`).pipe(
      catchError(error => {
        console.error('Error cancelling contact request:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Block contact
   */
  blockContact(userId: number): Observable<any> {
    console.log('🚫 MessageService: Bloquear contacto:', userId);
    return this.http.post(`${this.baseUrl}/contacts/${userId}/block`, {}).pipe(
      catchError(error => {
        console.error('Error blocking contact:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Unblock contact
   */
  unblockContact(userId: number): Observable<any> {
    console.log('✅ MessageService: Desbloquear contacto:', userId);
    return this.http.delete(`${this.baseUrl}/contacts/${userId}/block`).pipe(
      catchError(error => {
        console.error('Error unblocking contact:', error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Get blocked contacts
   */
  getBlockedContacts(): Observable<any> {
    console.log('🚫 MessageService: Obtener contactos bloqueados');
    return this.http.get(`${this.baseUrl}/contacts/blocked`).pipe(
      catchError(error => {
        console.error('Error getting blocked contacts:', error);
        return of({ data: [] });
      })
    );
  }
}