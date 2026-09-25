import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { MessageListItem } from '../../models/message.model';
import { NotificationSoundService } from '../../../../services/notification-sound.service';
import { MessageRecipientService } from '../../../../services/message-recipient.service';
import { AuthService } from '../../../../services/auth.service';
import { InboxContextService } from '../../../../services/inbox-context.service';
import { NotificationService } from '../../services/notification.service';
import { ToastService } from '../../../../services/toast.service';
import { InboxUserSelectorComponent } from '../../../../components/inbox-user-selector/inbox-user-selector.component';

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, InboxUserSelectorComponent],
  templateUrl: './inbox.component.html',
  styleUrls: ['./inbox.component.scss']
})
export class InboxComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  messages: MessageListItem[] = [];
  loading = false;
  currentFolder = 'inbox';

  // Reply functionality
  selectedMessage: MessageListItem | null = null;
  showReplyForm = false;
  replyContent = '';
  replyLoading = false;

  // Message details modal
  showMessageDetailsModal = false;
  messageDetails: MessageListItem | null = null;

  // Typing indicator
  usersTyping: Map<number, { userName: string; canalId: number }> = new Map();

  // Selection functionality
  selectedMessageIds: Set<number> = new Set();
  selectAll = false;

  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private notificationSound: NotificationSoundService,
    private messageRecipientService: MessageRecipientService,
    private authService: AuthService,
    private inboxContextService: InboxContextService,
    private notificationService: NotificationService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    // Initialize audio context on user interaction
    this.notificationSound.initializeOnUserInteraction();

    // Get folder from route data
    this.route.data.pipe(takeUntil(this.destroy$)).subscribe(data => {
      this.currentFolder = data['folder'] || 'inbox';
      this.loadMessages();
    });

    // Subscribe to real-time messages
    this.subscribeToRealTimeMessages();
    
    // Initialize real-time inbox updates
    this.initializeRealTimeInbox();
  }

  ngOnDestroy(): void {
    // Unsubscribe from all channels
    this.messageService.unsubscribeFromAllChannels();

    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Navigate to compose new message
   */
  composeNewMessage(): void {
    this.router.navigate(['/mensajeria/compose']);
  }

  /**
   * Subscribe to real-time message updates
   */
  private subscribeToRealTimeMessages(): void {
    // Subscribe to inbox context changes
    this.inboxContextService.getCurrentInboxUserId$()
      .pipe(takeUntil(this.destroy$))
      .subscribe(inboxUserId => {
        if (inboxUserId) {
          this.subscribeToUserChannel(inboxUserId);
        }
      });
  }

  /**
   * Subscribe to a specific user's channel
   */
  private subscribeToUserChannel(userId: number): void {
    const userChannel = `user.${userId}`;
    
    console.log('📡 Inbox: Subscribing to messaging system channel:', userChannel);
    console.log('📡 Inbox: User ID:', userId);
    
    // Unsubscribe from previous channel if any
    this.messageService.unsubscribeFromAllChannels();
    
    // Subscribe to user channel for messaging system messages
    this.messageService.subscribeToUserChannel(userChannel);
    
    // Listen for new messages from the messaging system
    this.messageService.newMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newMessage) => {
          console.log('📨 Real-time MESSAGING message received in Inbox:', newMessage);

          // Only process messages from the messaging system, not conversations
          // Messaging system messages have conversation_id = null
          if (!newMessage.conversation_id) {
            console.log('📨 Processing messaging system message (no conversation_id):', newMessage);

            // Play notification sound for incoming messages
            this.notificationSound.playNotification();

            // Add the new message to the messages array
            const messageItem: MessageListItem = {
              id: newMessage.id,
              subject: newMessage.subject || 'Nuevo mensaje',
              content: newMessage.content,
              sender: {
                id: newMessage.sender_id,
                name: newMessage.sender?.name || 'Usuario',
                email: newMessage.sender?.email || ''
              },
              created_at: newMessage.created_at,
              read_at: null,
              is_read: false,
              is_urgent: false,
              is_broadcast: false,
              priority: newMessage.priority || 'normal',
              message_type: newMessage.message_type || 'individual',
              has_attachments: newMessage.has_attachments || false,
              attachments_count: newMessage.attachment_count || 0,
              replies_count: 0,
              folder: 'inbox',
              conversation_id: newMessage.conversation_id
            };

            // Add to beginning of messages array
            this.messages.unshift(messageItem);

            console.log('✅ Messaging message added to inbox. Total messages:', this.messages.length);
          } else {
            console.log('📨 Ignoring conversation message (has conversation_id) in inbox:', newMessage);
          }
        },
        error: (error) => {
          console.error('❌ Error receiving real-time message:', error);
        }
      });

    // Listen for typing indicators
    this.messageService.userTyping$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (typingData) => {
          console.log('⌨️ Typing indicator received:', typingData);

          if (typingData.isTyping) {
            this.usersTyping.set(typingData.userId, {
              userName: typingData.userName,
              canalId: typingData.canalId
            });
          } else {
            this.usersTyping.delete(typingData.userId);
          }
        },
        error: (error) => {
          console.error('❌ Error receiving typing indicator:', error);
        }
      });
  }

  /**
   * Get typing users display text
   */
  getTypingUsersText(): string {
    if (this.usersTyping.size === 0) return '';

    const names = Array.from(this.usersTyping.values()).map(u => u.userName);

    if (names.length === 1) {
      return `${names[0]} está escribiendo...`;
    } else if (names.length === 2) {
      return `${names[0]} y ${names[1]} están escribiendo...`;
    } else {
      return `${names[0]} y ${names.length - 1} más están escribiendo...`;
    }
  }

  private loadMessages(): void {
    this.loading = true;
    
    // Load messages based on folder
    const params = { folder: this.currentFolder };
    
    console.log('🔄 Inbox: Loading messages with params:', params);
    console.log('🔄 Inbox: Current folder:', this.currentFolder);
    
    this.messageService.getMessages(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📨 Inbox: Response received:', response);
          console.log('📨 Inbox: Response structure:', {
            success: response.success,
            hasData: !!response.data,
            hasDataData: !!(response.data && response.data.data),
            dataLength: response.data.data.length || 0
          });
          
          // Fix: Access the correct nested data structure
          this.messages = response.data.data || [];
          this.loading = false;
          
          console.log('📨 Inbox: Messages loaded:', this.messages.length);
          
          // Trigger notification count update after loading messages
          this.updateNotificationCounts();
        },
        error: (error) => {
          console.error('❌ Error loading messages:', error);
          this.loading = false;
        }
      });
  }

  /**
   * Initialize real-time inbox updates
   */
  private initializeRealTimeInbox(): void {
    console.log('🔄 Inbox: Initializing real-time inbox updates');
    console.log('🔄 Inbox: MessageService available:', !!this.messageService);
    console.log('🔄 Inbox: WebSocket messages observable available:', !!this.messageService.getWebSocketMessages$());
    
    // Subscribe to WebSocket events for inbox updates
    this.messageService.getWebSocketMessages$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          console.log('📨 Inbox: WebSocket message received:', message);
          console.log('📨 Inbox: Message event type:', message?.event);
          console.log('📨 Inbox: Processing message in handleWebSocketMessage...');
          this.handleWebSocketMessage(message);
        },
        error: (error) => {
          console.error('❌ Inbox: Error receiving WebSocket message:', error);
        }
      });

    console.log('✅ Inbox: WebSocket subscription established');

    // Subscribe to notification count changes
    this.messageService.getUnreadCount$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          console.log('📊 Inbox: Unread count updated:', count);
          this.updateUnreadCount(count);
        }
      });

    console.log('✅ Inbox: Unread count subscription established');
  }

  /**
   * Handle WebSocket messages for real-time updates
   */
  private handleWebSocketMessage(message: any): void {
    console.log('🔍 Inbox: handleWebSocketMessage called with:', message);
    console.log('🔍 Inbox: Message event:', message?.event);
    
    if (!message || !message.event) {
      console.log('❌ Inbox: Invalid message format:', message);
      return;
    }
    
    switch (message.event) {
      case 'message.received':
        console.log('📨 Inbox: New message received in real-time:', message.data);
        // Extract message from data.message (backend sends it wrapped)
        const messageData = message.data?.message || message.data;
        console.log('📨 Inbox: Extracted message data:', messageData);
        this.addNewMessage(messageData);
        this.notificationSound.playNotification();
        break;
        
      case 'message.read':
        console.log('👁️ Inbox: Message read status updated:', message.data);
        this.updateMessageReadStatus(message.data);
        break;
        
      case 'message.sent':
        console.log('📤 Inbox: Message sent confirmation:', message.data);
        this.addSentMessage(message.data);
        break;
        
      case 'user.status':
        console.log('👤 Inbox: User status updated:', message.data);
        // Could update user online status indicators
        break;
        
      case 'connection.established':
        console.log('🎉 Inbox: WebSocket connection established');
        break;
        
      case 'heartbeat':
        console.log('💓 Inbox: Heartbeat received');
        break;
        
      case 'pong':
        console.log('🏓 Inbox: Pong received');
        break;
        
      default:
        console.log('📨 Inbox: Unknown WebSocket event:', message.event);
        console.log('📨 Inbox: Full message:', JSON.stringify(message, null, 2));
    }
  }

  /**
   * Add new message to inbox in real-time
   */
  private addNewMessage(messageData: any): void {
    const newMessage: MessageListItem = {
      id: messageData.id,
      subject: messageData.subject || 'Nuevo mensaje',
      content: messageData.content,
      sender: {
        id: messageData.sender_id,
        name: messageData.sender?.name || 'Usuario',
        email: messageData.sender?.email || ''
      },
      created_at: messageData.created_at,
      read_at: null,
      is_read: false,
      is_urgent: messageData.priority === 'urgent',
      is_broadcast: messageData.message_type === 'broadcast',
      priority: messageData.priority || 'normal',
      message_type: messageData.message_type || 'individual',
      has_attachments: messageData.has_attachments || false,
      attachments_count: messageData.attachment_count || 0,
      replies_count: 0,
      folder: 'inbox',
      conversation_id: messageData.conversation_id
    };

    // Add to beginning of messages array (most recent first)
    this.messages.unshift(newMessage);
    
    // Update notification count in real-time
    this.notificationService.incrementUnreadCount();
    
    console.log('✅ Inbox: New message added to inbox. Total messages:', this.messages.length);
  }

  /**
   * Update message read status in real-time
   */
  private updateMessageReadStatus(messageData: any): void {
    const messageIndex = this.messages.findIndex(msg => msg.id === messageData.message_id);
    if (messageIndex !== -1) {
      // Only decrement count if message was previously unread
      if (!this.messages[messageIndex].is_read) {
        this.notificationService.decrementUnreadCount();
      }
      
      this.messages[messageIndex].is_read = true;
      this.messages[messageIndex].read_at = new Date().toISOString();
      console.log('✅ Inbox: Message read status updated:', messageData.message_id);
    }
  }

  /**
   * Refresh inbox after sending a message
   */
  private refreshInboxAfterSend(): void {
    console.log('🔄 Inbox: Refreshing after message sent');
    // Only reload if we're in the sent folder
    if (this.currentFolder === 'sent') {
      this.loadMessages();
    }
  }

  /**
   * Add sent message to inbox without full reload
   */
  private addSentMessage(messageData: any): void {
    const sentMessage: MessageListItem = {
      id: messageData.id,
      subject: messageData.subject || 'Mensaje enviado',
      content: messageData.content,
      sender: {
        id: this.authService.getCurrentUser()?.id || 0,
        name: this.authService.getCurrentUser()?.name || 'Yo',
        email: this.authService.getCurrentUser()?.email || ''
      },
      created_at: messageData.created_at,
      read_at: new Date().toISOString(),
      is_read: true,
      is_urgent: messageData.priority === 'urgent',
      is_broadcast: messageData.message_type === 'broadcast',
      priority: messageData.priority || 'normal',
      message_type: messageData.message_type || 'individual',
      has_attachments: messageData.has_attachments || false,
      attachments_count: messageData.attachment_count || 0,
      replies_count: 0,
      folder: 'sent',
      conversation_id: messageData.conversation_id
    };

    // Add to beginning of messages array (most recent first)
    this.messages.unshift(sentMessage);
    
    console.log('✅ Inbox: Sent message added to inbox. Total messages:', this.messages.length);
  }

  /**
   * Update notification counts
   */
  private updateNotificationCounts(): void {
    // Trigger notification service to refresh counts
    this.messageService.refreshUnreadCount().subscribe();
  }

  /**
   * Update unread count in real-time
   */
  private updateUnreadCount(count: number): void {
    // This will be handled by the notification service
    // The inbox component will automatically reflect the changes
    console.log('📊 Inbox: Unread count updated to:', count);
  }

  onMessageSelect(message: MessageListItem): void {
    this.selectedMessage = message;
    this.showReplyForm = false;
    this.replyContent = '';
    console.log('Message selected:', message);
  }

  onReply(message: MessageListItem): void {
    this.selectedMessage = message;
    this.showReplyForm = true;
    this.replyContent = '';
  }

  onCancelReply(): void {
    this.showReplyForm = false;
    this.selectedMessage = null;
    this.replyContent = '';
  }

  showMessageDetails(message: MessageListItem): void {
    this.messageDetails = message;
    this.showMessageDetailsModal = true;
    console.log('Showing message details:', message);
  }

  closeMessageDetails(): void {
    this.showMessageDetailsModal = false;
    this.messageDetails = null;
    console.log('Closing message details modal');
  }

  onSendReply(): void {
    if (!this.selectedMessage || !this.replyContent.trim()) {
      return;
    }

    this.replyLoading = true;

    // Test with minimal hardcoded payload
    const replyData = {
      content: this.replyContent.trim(),
      subject: `Re: ${this.selectedMessage.subject || 'Mensaje sin asunto'}`,
      priority: 'normal' as const,
      message_type: 'individual' as const,
      parent_message_id: parseInt(this.selectedMessage.id.toString()),
      // NO enviar conversation_id para mensajes del sistema de mensajería (buzón de entrada)
      // conversation_id: this.selectedMessage.conversation_id ? parseInt(this.selectedMessage.conversation_id.toString()) : undefined,
      recipients: this.getReplyRecipients()
    };

    console.log('🔍 Debug - Reply data being sent:', JSON.stringify(replyData, null, 2));
    console.log('🔍 Debug - Recipients type:', typeof replyData.recipients[0]);
    console.log('🔍 Debug - Recipients value:', replyData.recipients[0]);
    console.log('🔍 Debug - Parent message ID type:', typeof replyData.parent_message_id);
    console.log('🔍 Debug - Parent message ID value:', replyData.parent_message_id);
    console.log('🔍 Debug - Conversation ID: Not included (messaging system)');
    console.log('🔍 Debug - Selected message:', this.selectedMessage);

    this.messageService.sendMessage(replyData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Reply sent successfully:', response);

          // Play sent sound
          this.notificationSound.playMessageSent();

          // Close all modals and forms
          this.replyLoading = false;
          this.showReplyForm = false;
          this.showMessageDetailsModal = false;
          this.selectedMessage = null;
          this.replyContent = '';

          // Show success toast notification (non-blocking, auto-close)
          this.toastService.success('Tu respuesta ha sido enviada exitosamente', '✅ Mensaje Enviado', 3000);

          // Reload messages to show the reply (the new message will appear in real-time via WebSocket)
          // No need to reload, real-time will handle it
          // this.loadMessages();
        },
        error: (error) => {
          console.error('❌ Error sending reply:', error);
          this.replyLoading = false;
          
          // Show error toast notification (non-blocking, auto-close)
          const errorMessage = error.error?.message || error.message || 'Error desconocido';
          this.toastService.error(errorMessage, '❌ Error al Enviar', 5000);
        }
      });
  }

  onRefresh(): void {
    this.loadMessages();
  }

  getFolderTitle(): string {
    const titles: { [key: string]: string } = {
      'inbox': 'Bandeja de Entrada',
      'sent': 'Enviados',
      'drafts': 'Borradores',
      'trash': 'Papelera',
      'archive': 'Archivo'
    };
    return titles[this.currentFolder] || 'Mensajes';
  }

  /**
   * Toggle message selection
   */
  toggleMessageSelection(messageId: number, event: Event): void {
    event.stopPropagation();
    if (this.selectedMessageIds.has(messageId)) {
      this.selectedMessageIds.delete(messageId);
    } else {
      this.selectedMessageIds.add(messageId);
    }
    this.updateSelectAllState();
  }

  /**
   * Toggle select all messages
   */
  toggleSelectAll(): void {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.messages.forEach(msg => this.selectedMessageIds.add(msg.id));
    } else {
      this.selectedMessageIds.clear();
    }
  }

  /**
   * Update select all checkbox state
   */
  private updateSelectAllState(): void {
    this.selectAll = this.messages.length > 0 &&
                     this.selectedMessageIds.size === this.messages.length;
  }

  /**
   * Check if message is selected
   */
  isMessageSelected(messageId: number): boolean {
    return this.selectedMessageIds.has(messageId);
  }

  /**
   * Mark selected messages as read
   */
  markSelectedAsRead(): void {
    if (this.selectedMessageIds.size === 0) {
      alert('Por favor, selecciona al menos un mensaje');
      return;
    }

    const messageIds = Array.from(this.selectedMessageIds);

    this.messageService.markAsRead(messageIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Messages marked as read');
          // Update local state
          this.messages.forEach(msg => {
            if (this.selectedMessageIds.has(msg.id)) {
              msg.is_read = true;
              msg.read_at = new Date().toISOString();
            }
          });
          this.selectedMessageIds.clear();
          this.selectAll = false;
          alert('Mensajes marcados como leídos');
        },
        error: (error) => {
          console.error('❌ Error marking messages as read:', error);
          alert('Error al marcar mensajes como leídos');
        }
      });
  }

  /**
   * Archive selected messages
   */
  archiveSelected(): void {
    if (this.selectedMessageIds.size === 0) {
      alert('Por favor, selecciona al menos un mensaje');
      return;
    }

    if (!confirm(`¿Estás seguro de archivar ${this.selectedMessageIds.size} mensaje(s)?`)) {
      return;
    }

    const messageIds = Array.from(this.selectedMessageIds);

    this.messageService.moveToFolder(messageIds, 'archive')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Messages archived');
          // Remove from current view
          this.messages = this.messages.filter(msg => !this.selectedMessageIds.has(msg.id));
          this.selectedMessageIds.clear();
          this.selectAll = false;
          alert('Mensajes archivados exitosamente');
        },
        error: (error) => {
          console.error('❌ Error archiving messages:', error);
          alert('Error al archivar mensajes');
        }
      });
  }

  /**
   * Delete selected messages
   */
  deleteSelected(): void {
    if (this.selectedMessageIds.size === 0) {
      alert('Por favor, selecciona al menos un mensaje');
      return;
    }

    if (!confirm(`¿Estás seguro de eliminar ${this.selectedMessageIds.size} mensaje(s)?`)) {
      return;
    }

    const messageIds = Array.from(this.selectedMessageIds);

    this.messageService.deleteMessages(messageIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Messages deleted');
          // Remove from current view
          this.messages = this.messages.filter(msg => !this.selectedMessageIds.has(msg.id));
          this.selectedMessageIds.clear();
          this.selectAll = false;
          alert('Mensajes eliminados exitosamente');
        },
        error: (error) => {
          console.error('❌ Error deleting messages:', error);
          alert('Error al eliminar mensajes');
        }
      });
  }

  /**
   * Get recipients for reply messages
   */
  private getReplyRecipients(): { id: number; type: 'user' | 'department' }[] {
    if (!this.selectedMessage) {
      console.error('❌ No selected message for reply');
      return [];
    }

    // For replies, we typically reply to the sender of the original message
    const senderId = this.selectedMessage.sender?.id;
    if (senderId) {
      return [{ id: senderId, type: 'user' as const }];
    }

    // Fallback: use default recipient if sender ID is not available
    const defaultRecipient = this.messageRecipientService.getDefaultRecipientSync();
    if (defaultRecipient) {
      console.warn('⚠️ Using default recipient for reply');
      return [{ id: defaultRecipient.id, type: defaultRecipient.type }];
    }

    console.error('❌ No recipient available for reply');
    return [];
  }

  /**
   * Switch inbox to a different user
   */
  switchToUser(userId: number, userName: string): void {
    console.log(`📧 Switching inbox to user: ${userName} (ID: ${userId})`);
    this.inboxContextService.switchToUser(userId, userName);
    this.loadMessages(); // Reload messages for the new user
  }

  /**
   * Reset inbox to current authenticated user
   */
  resetToCurrentUser(): void {
    console.log('📧 Resetting inbox to current user');
    this.inboxContextService.resetToCurrentUser();
    this.loadMessages(); // Reload messages for current user
  }

  /**
   * Get current inbox context
   */
  getCurrentInboxContext() {
    return this.inboxContextService.getCurrentContext();
  }
}