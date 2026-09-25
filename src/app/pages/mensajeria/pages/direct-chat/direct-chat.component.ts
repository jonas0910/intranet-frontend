import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { CustomEchoWebSocketService } from '../../../../services/custom-echo-websocket.service';
import { AuthService } from '../../../../services/auth.service';
import { Conversation } from '../../models/conversation.model';

console.log('📄 DirectChatComponent file loaded');

interface FileAttachment {
  id?: number;
  original_name?: string;
  name?: string;
  file_size?: number;
  size?: number;
  mime_type?: string;
  type?: string;
  is_image?: boolean;
  is_document?: boolean;
  can_preview?: boolean;
  is_safe?: boolean;
  icon_class?: string;
  download_url?: string;
  url?: string;
  thumbnail?: string;
}

interface ChatMessage {
  id: number;
  content: string;
  sender_id: number;
  sender_name: string;
  sender_avatar?: string;
  sent_at: string;
  is_read: boolean;
  type: 'sent' | 'received';
  message_type?: 'text' | 'file' | 'image' | 'emoticon';
  attachments?: FileAttachment[];
  has_attachments?: boolean;
  attachment_count?: number;
  emoticon?: string;
}

interface Contact {
  id: number;
  name: string;
  avatar?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count: number;
  is_online: boolean;
}

@Component({
  selector: 'app-direct-chat',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './direct-chat.component.html',
  styleUrls: ['./direct-chat.component.scss', './attachments-emoticons.styles.scss']
})
export class DirectChatComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  // Discussion Data
  conversationId: string | undefined;
  conversationTitle: string | undefined;
  conversation: Conversation | undefined;
  
  // Chat Messages
  messages: ChatMessage[] = [];
  chatForm!: FormGroup; // Use definite assignment assertion
  
  // Contacts Panel
  contacts: Contact[] = [];
  showContactsPanel = false;
  selectedContactId: number | undefined;
  
  // UI State
  loading = false;
  sending = false;
  typing = false;
  
  // Real-time Statistics
  showRealTimeStats = true;
  currentUserId: number | null = null;
  
  // Real-time features
  typingUsers = new Map<number, any>();
  typingText = '';
  isTyping = false;
  typingTimeout: any;
  participants: any[] = [];
  pollingInterval: any;
  
  // File attachments and emoticons
  selectedFiles: File[] = [];
  showEmoticonPicker = false;
  showFilePicker = false;
  
  // Search in conversation
  conversationSearchQuery: string = '';
  searchResults: ChatMessage[] = [];
  showSearch = false;
  
  // Message actions
  selectedMessage: ChatMessage | null = null;
  showMessageActions = false;
  
  // Voice recording
  isRecording = false;
  recordingTime = 0;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];
  
  emoticons = [
    '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣',
    '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰',
    '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜',
    '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏',
    '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣',
    '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠',
    '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨',
    '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥',
    '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧',
    '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐',
    '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑',
    '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻',
    '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸',
    '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
  ];
  
  // Search and filter
  searchQuery = '';
  filteredContacts: Contact[] = [];
  
  constructor(
    private messageService: MessageService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder,
    private echoService: CustomEchoWebSocketService,
    private cdr: ChangeDetectorRef,
    private authService: AuthService
  ) {
    console.log('🏗️ DirectChatComponent constructor called');
    this.chatForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(1)]]
    });
    console.log('🏗️ DirectChatComponent constructor completed');
  }

  ngOnInit(): void {
    console.log('🚀 DirectChatComponent ngOnInit started');
    console.log('🚀 Current URL:', window.location.href);
    console.log('🚀 Route snapshot params:', this.route.snapshot.queryParams);
    
    // Initialize current user ID
    this.currentUserId = this.authService.getCurrentUser()?.id || null;
    console.log('👤 Current user ID:', this.currentUserId);
    console.log('🔧 RealTimeNotificationsComponent will receive userId:', this.currentUserId);
    
    // Get conversation parameters from route
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      console.log('📋 Route params received:', params);
      if (params['conversationId']) {
        this.conversationId = params['conversationId'];
        this.conversationTitle = params['conversationTitle'] || 'Chat Directo';
        console.log('📋 Conversation ID set:', this.conversationId);
        console.log('📋 Conversation title set:', this.conversationTitle);
        this.loadConversation();
      } else {
        console.log('❌ No conversationId in route params');
        // Try to get from snapshot as fallback
        const snapshotParams = this.route.snapshot.queryParams;
        if (snapshotParams['conversationId']) {
          console.log('📋 Using snapshot params as fallback:', snapshotParams);
          this.conversationId = snapshotParams['conversationId'];
          this.conversationTitle = snapshotParams['conversationTitle'] || 'Chat Directo';
          this.loadConversation();
        }
      }
    });
    
    // Load contacts
    this.loadContacts();
    console.log('🚀 DirectChatComponent ngOnInit completed');
  }

  ngOnDestroy(): void {
    // Stop polling
    this.stopPolling();

    // Unsubscribe from conversation channel
    if (this.conversationId) {
      this.echoService.leaveChannel(`conversation.${this.conversationId}`);
    }

    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConversation(): void {
    if (!this.conversationId) {
      console.log('❌ No conversation ID in loadConversation');
      return;
    }

    console.log('📋 Loading conversation:', this.conversationId);
    this.loading = true;
    // Load conversation details and messages
    this.loadMessages();
    this.loadConversationParticipants();

    // Subscribe to real-time messages
    console.log('📋 About to subscribe to conversation WebSocket');
    this.subscribeToConversation();

    // Start polling for new messages every 3 seconds
    this.startPolling();
  }

  /**
   * Subscribe to conversation channel for real-time messages
   */
  subscribeToConversation(): void {
    if (!this.conversationId) {
      console.log('❌ No conversation ID - cannot subscribe to WebSocket');
      return;
    }

    console.log('📡 Subscribing to real-time conversation events');
    console.log('📡 Conversation ID:', this.conversationId);

    // Connect user to WebSocket
    this.echoService.connectUser();
    console.log('📡 WebSocket connection initiated');

    const channelName = `conversation.${this.conversationId}`;
    console.log('📡 Subscribing to conversation channel:', channelName);

    // Listen for new messages with enhanced error handling
    console.log('📡 Setting up listener for message.received event');
    try {
      this.echoService.listenToChannel(
        channelName,
        'message.received',
        (data: any) => {
          console.log('📨 WebSocket callback triggered for message.received');
          console.log('📨 New message received:', data);
          console.log('📨 Message data structure:', JSON.stringify(data, null, 2));
          console.log('📨 Current user ID:', this.getCurrentUserId());
          
          // Extract message data from the nested structure
          const messageData = data.message || data;
          console.log('📨 Extracted message data:', messageData);
          console.log('📨 Message sender ID:', messageData.sender_id);
          console.log('📨 Has attachments:', messageData.has_attachments);
          console.log('📨 Attachments:', messageData.attachments);
          console.log('📨 Attachment count:', messageData.attachment_count);
          
          // Check if message is from another user OR if it's from current user with attachments
          const isFromOtherUser = messageData && messageData.sender_id !== this.getCurrentUserId();
          const isFromCurrentUserWithAttachments = messageData && messageData.sender_id === this.getCurrentUserId() && messageData.has_attachments;
          
          console.log('📨 isFromOtherUser:', isFromOtherUser);
          console.log('📨 isFromCurrentUserWithAttachments:', isFromCurrentUserWithAttachments);
          console.log('📨 Should process message:', isFromOtherUser || isFromCurrentUserWithAttachments);
          
          if (isFromOtherUser || isFromCurrentUserWithAttachments) {
            console.log('📨 Processing message:', isFromOtherUser ? 'from another user' : 'from current user with attachments');
            
            const newMessage: ChatMessage = {
              id: messageData.id,
              content: messageData.content,
              sender_id: messageData.sender_id,
              sender_name: messageData.sender?.name || (isFromOtherUser ? 'Usuario' : 'Yo'),
              sender_avatar: 'assets/img/user-default.png',
              sent_at: messageData.created_at,
              is_read: false,
              type: isFromOtherUser ? 'received' : 'sent',
              attachments: messageData.attachments || [],
              has_attachments: messageData.has_attachments || false,
              attachment_count: messageData.attachment_count || 0
            };

            console.log('📨 Adding message to list:', newMessage);
            console.log('📨 Current messages count:', this.messages.length);

            // Check if message already exists (to avoid duplicates)
            const existingMessageIndex = this.messages.findIndex(msg => msg.id === newMessage.id);
            
            if (existingMessageIndex !== -1) {
              // Update existing message with attachment data
              console.log('📨 Updating existing message with attachment data');
              this.messages[existingMessageIndex] = newMessage;
            } else {
              // Add new message to the list
              this.messages.push(newMessage);
            }

            console.log('📨 Messages count after adding/updating:', this.messages.length);

            // Force change detection
            this.cdr.detectChanges();

            // Scroll to bottom
            setTimeout(() => this.scrollToBottom(), 100);

            // Play notification sound or show toast (optional)
            console.log('✅ Message added to chat:', newMessage);
          } else {
            console.log('📨 Message ignored - from current user or invalid data');
          }
        }
      );
      console.log('✅ WebSocket listener set up successfully');
    } catch (error) {
      console.error('❌ Error setting up WebSocket listener:', error);
    }

    // Listen for typing indicators
    this.echoService.listenToChannel(
      channelName,
      'user.typing',
      (data: any) => {
        console.log('⌨️ Typing indicator received:', data);
        
        if (data.user_id !== this.getCurrentUserId()) {
          this.typingUsers.set(data.user_id, {
            user_id: data.user_id,
            user_name: data.user_name,
            is_typing: data.is_typing,
            timestamp: data.timestamp
          });
          
          // Update typing indicator display
          this.updateTypingIndicator();
        }
      }
    );

    // Listen for message read receipts
    this.echoService.listenToChannel(
      channelName,
      'message.read',
      (data: any) => {
        console.log('👁️ Message read receipt received:', data);
        
        // Update message status to read
        this.messages.forEach(message => {
          if (message.id === data.message_id && message.sender_id !== data.user_id) {
            message.is_read = true;
          }
        });
      }
    );

    // Listen for user status changes
    this.echoService.listenToChannel(
      channelName,
      'user.status.changed',
      (data: any) => {
        console.log('👤 User status changed:', data);
        
        // Update participant online status
        this.participants.forEach(participant => {
          if (participant.id === data.user_id) {
            participant.is_online = data.status === 'online';
            participant.last_seen = data.timestamp;
          }
        });
      }
    );
  }

  /**
   * Get current user ID
   */
  private getCurrentUserId(): number {
    // Get from auth service or localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.id;
    }
    return 0;
  }

  loadMessages(): void {
    if (!this.conversationId) return;
    
    this.messageService.getMessagesForConversation(parseInt(this.conversationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          this.messages = this.transformMessages(messages);
          this.loading = false;
          // Scroll to bottom after loading
          setTimeout(() => this.scrollToBottom(), 100);
        },
        error: (error) => {
          console.error('Error loading messages:', error);
          this.loading = false;
        }
      });
  }

  loadConversationParticipants(): void {
    if (!this.conversationId) return;
    
    this.messageService.getConversationParticipants(parseInt(this.conversationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (participants) => {
          this.contacts = this.transformParticipants(participants);
        },
        error: (error) => {
          console.error('Error loading participants:', error);
        }
      });
  }

  loadContacts(): void {
    this.messageService.getContacts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          this.contacts = contacts;
          this.filteredContacts = contacts;
        },
        error: (error) => {
          console.error('Error loading contacts:', error);
          // Load mock contacts if service fails
          this.loadMockContacts();
        }
      });
  }
  
  loadMockContacts(): void {
    // Mock contacts for development
    this.contacts = [
      {
        id: 2,
        name: 'María García',
        avatar: 'assets/img/user2-160x160.jpg',
        last_message: 'Hola! ¿Cómo estás?',
        last_message_time: new Date().toISOString(),
        unread_count: 2,
        is_online: true
      },
      {
        id: 3,
        name: 'Juan Pérez',
        avatar: 'assets/img/user3-128x128.jpg',
        last_message: 'Nos vemos mañana',
        last_message_time: new Date(Date.now() - 3600000).toISOString(),
        unread_count: 0,
        is_online: false
      },
      {
        id: 4,
        name: 'Ana López',
        avatar: 'assets/img/user4-128x128.jpg',
        last_message: 'Perfecto, gracias!',
        last_message_time: new Date(Date.now() - 86400000).toISOString(),
        unread_count: 1,
        is_online: true
      }
    ];
    this.filteredContacts = this.contacts;
  }

  transformMessages(messages: any[]): ChatMessage[] {
    // Ensure messages is an array
    if (!Array.isArray(messages)) {
      console.warn('⚠️ Messages is not an array:', messages);
      return [];
    }

    return messages.map(msg => {
      // Transform attachments if they exist
      const attachments = msg.attachments && Array.isArray(msg.attachments) 
        ? msg.attachments.map((att: any) => ({
            id: att.id,
            original_name: att.original_name,
            name: att.original_name,
            file_size: att.file_size,
            size: att.file_size,
            mime_type: att.mime_type,
            type: att.mime_type,
            is_image: att.is_image,
            is_document: att.is_document,
            can_preview: att.can_preview,
            is_safe: att.is_safe,
            icon_class: att.icon_class,
            download_url: att.download_url,
            url: att.download_url
          }))
        : [];

      return {
        id: msg.id,
        content: msg.content,
        sender_id: msg.sender_id,
        sender_name: msg.sender?.name || 'Usuario',
        sender_avatar: 'assets/img/user-default.png', // Default avatar
        sent_at: msg.created_at,
        is_read: msg.is_read || false,
        type: msg.is_sent_by_me ? 'sent' : 'received',
        message_type: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments,
        has_attachments: attachments.length > 0,
        attachment_count: attachments.length
      };
    });
  }

  transformParticipants(participants: any[]): Contact[] {
    // Ensure participants is an array
    if (!Array.isArray(participants)) {
      console.warn('⚠️ Participants is not an array:', participants);
      return [];
    }

    return participants.map(p => ({
      id: p.user_id,
      name: p.user?.name || 'Usuario',
      avatar: 'assets/img/user-default.png', // Default avatar
      last_message: undefined, // Instead of null
      last_message_time: p.joined_at,
      unread_count: 0,
      is_online: Math.random() > 0.5 // Placeholder - should come from real presence data
    }));
  }

  sendMessage(): void {
    if (this.chatForm.valid && !this.sending) {
      const messageText = this.chatForm.get('message')?.value;
      if (!messageText || !this.conversationId) return;

      this.sending = true;
      // Disable the form while sending
      this.chatForm.get('message')?.disable();
      
      const messageData = {
        conversation_id: parseInt(this.conversationId),
        content: messageText.trim(),
        priority: 'normal' as const,
        message_type: 'individual' as const,
        recipients: [], // Participants are handled by conversation
        attachments: []
      };
      
      // Send message via WebSocket for real-time delivery
      this.echoService.sendMessage(
        parseInt(this.conversationId),
        messageText.trim(),
        'text'
      );

      // Also send via HTTP API for persistence
      this.messageService.sendMessage(messageData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            // Add message to local array immediately for better UX
            const newMessage: ChatMessage = {
              id: response.id,
              content: response.content,
              sender_id: response.sender?.id || 0,
              sender_name: response.sender?.name || 'Yo',
              sender_avatar: 'assets/img/user-default.png',
              sent_at: response.created_at,
              is_read: false,
              type: 'sent'
            };

            this.messages.push(newMessage);
            
            // Clear form and re-enable
            this.chatForm.get('message')?.setValue('');
            this.chatForm.get('message')?.enable();
            this.sending = false;
            
            // Scroll to bottom
            setTimeout(() => this.scrollToBottom(), 100);
            
            console.log('✅ Message sent successfully:', newMessage);
          },
          error: (error) => {
            console.error('❌ Error sending message:', error);
            this.sending = false;
            this.chatForm.get('message')?.enable();
            
            // Show error message to user
            alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
          }
        });
    }
  }

  // File attachment methods
  onFileSelected(event: any): void {
    const files = event.target.files;
    if (files && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (this.validateFile(file)) {
          this.selectedFiles.push(file);
        }
      }
      this.showFilePicker = false;
    }
  }

  validateFile(file: File): boolean {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'application/zip', 'application/x-rar-compressed'
    ];

    if (file.size > maxSize) {
      alert(`El archivo ${file.name} es demasiado grande. Máximo 10MB.`);
      return false;
    }

    if (!allowedTypes.includes(file.type)) {
      alert(`El tipo de archivo ${file.type} no está permitido.`);
      return false;
    }

    return true;
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) {
      return 'fas fa-image';
    } else if (file.type.includes('pdf')) {
      return 'fas fa-file-pdf';
    } else if (file.type.includes('word')) {
      return 'fas fa-file-word';
    } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
      return 'fas fa-file-excel';
    } else if (file.type.includes('zip') || file.type.includes('rar')) {
      return 'fas fa-file-archive';
    } else {
      return 'fas fa-file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getAttachmentIcon(attachment: FileAttachment | File): string {
    // Handle both File objects and FileAttachment objects
    const mimeType = attachment instanceof File ? attachment.type : (attachment.mime_type || attachment.type || '');
    
    if (mimeType.startsWith('image/')) {
      return 'fas fa-image text-primary';
    } else if (mimeType.includes('pdf')) {
      return 'fas fa-file-pdf text-danger';
    } else if (mimeType.includes('word')) {
      return 'fas fa-file-word text-primary';
    } else if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'fas fa-file-excel text-success';
    } else if (mimeType.includes('zip') || mimeType.includes('rar')) {
      return 'fas fa-file-archive text-warning';
    } else {
      return 'fas fa-file text-secondary';
    }
  }

  downloadAttachment(attachment: FileAttachment): void {
    const downloadUrl = attachment.url || attachment.download_url;
    if (downloadUrl) {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = attachment.original_name || attachment.name || 'archivo';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      console.warn('No URL available for attachment:', attachment);
      alert('No se puede descargar el archivo. URL no disponible.');
    }
  }

  // Emoticon methods
  toggleEmoticonPicker(): void {
    this.showEmoticonPicker = !this.showEmoticonPicker;
  }

  insertEmoticon(emoticon: string): void {
    const currentMessage = this.chatForm.get('message')?.value || '';
    this.chatForm.get('message')?.setValue(currentMessage + emoticon);
    this.showEmoticonPicker = false;
    
    // Focus back on input
    setTimeout(() => {
      const messageInput = document.querySelector('.message-input') as HTMLInputElement;
      if (messageInput) {
        messageInput.focus();
      }
    }, 100);
  }
  
  selectEmoticon(emoticon: string): void {
    // Alias for backwards compatibility
    this.insertEmoticon(emoticon);
  }
  
  // File selection methods
  selectFiles(): void {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  // Send message with attachments
  sendMessageWithAttachments(): void {
    console.log('📤 DirectChatComponent sendMessageWithAttachments called');
    console.log('📤 Current conversation ID:', this.conversationId);
    
    if (!this.conversationId) {
      console.log('❌ No conversation ID - cannot send message');
      return;
    }

    const messageText = this.chatForm.get('message')?.value || '';
    const hasAttachments = this.selectedFiles.length > 0;
    const hasText = messageText.trim().length > 0;

    if (!hasText && !hasAttachments) {
      alert('Por favor, escribe un mensaje o adjunta un archivo.');
      return;
    }

    this.sending = true;
    this.chatForm.get('message')?.disable();

    const messageData = {
      conversation_id: parseInt(this.conversationId),
      content: messageText.trim() || (hasAttachments ? 'Archivo adjunto' : ''),
      priority: 'normal' as const,
      message_type: 'individual' as const,
      recipients: [],
      attachments: hasAttachments ? this.selectedFiles : undefined
    };

    // Send via HTTP API for persistence
    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Only add message locally if it doesn't have attachments
          // Messages with attachments will be handled by WebSocket
          if (!hasAttachments) {
            const newMessage: ChatMessage = {
              id: response.id,
              content: response.content,
              sender_id: response.sender?.id || 0,
              sender_name: response.sender?.name || 'Yo',
              sender_avatar: 'assets/img/user-default.png',
              sent_at: response.created_at,
              is_read: false,
              type: 'sent',
              message_type: 'text',
              attachments: undefined
            };

            this.messages.push(newMessage);
          } else {
            console.log('📎 Message with attachments sent - adding to local list');
            
            // Add message with attachments to local list immediately
            const newMessage: ChatMessage = {
              id: response.id,
              content: response.content,
              sender_id: response.sender?.id || 0,
              sender_name: response.sender?.name || 'Yo',
              sender_avatar: 'assets/img/user-default.png',
              sent_at: response.created_at,
              is_read: false,
              type: 'sent',
              message_type: 'file',
              attachments: this.selectedFiles.map(file => ({
                id: undefined,
                original_name: file.name,
                name: file.name,
                file_size: file.size,
                size: file.size,
                mime_type: file.type,
                type: file.type,
                is_image: file.type.startsWith('image/'),
                is_document: !file.type.startsWith('image/'),
                can_preview: file.type.startsWith('image/') || file.type === 'application/pdf',
                is_safe: true,
                icon_class: this.getAttachmentIcon(file),
                download_url: undefined
              })),
              has_attachments: true,
              attachment_count: this.selectedFiles.length
            };

            this.messages.push(newMessage);
            console.log('📎 Message with attachments added to local list:', newMessage);
          }

          // Clear form and files
          this.chatForm.get('message')?.setValue('');
          this.selectedFiles = [];
          this.chatForm.get('message')?.enable();
          this.sending = false;

          // Scroll to bottom
          setTimeout(() => this.scrollToBottom(), 100);

          console.log('✅ Message with attachments sent successfully:', response);
        },
        error: (error) => {
          console.error('❌ Error sending message with attachments:', error);
          this.sending = false;
          this.chatForm.get('message')?.enable();
          alert('Error al enviar el mensaje. Por favor, inténtalo de nuevo.');
        }
      });
  }

  selectContact(contact: Contact): void {
    console.log('👤 Selecting contact:', contact);
    this.selectedContactId = contact.id;
    this.conversationTitle = contact.name;
    
    // Try to load or create conversation with this contact
    this.findOrCreateConversationWithContact(contact.id);
  }
  
  findOrCreateConversationWithContact(contactId: number): void {
    // Try to find existing conversation with this contact
    this.messageService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversations: any) => {
          // Find conversation with this contact
          const existingConv = conversations.data?.find((conv: any) => {
            return conv.type === 'individual' && conv.participants?.some((p: any) => p.user_id === contactId);
          });
          
          if (existingConv) {
            console.log('💬 Found existing conversation:', existingConv.id);
            this.conversationId = existingConv.id.toString();
            this.loadConversation();
          } else {
            console.log('✨ Creating new conversation with contact');
            // Create new conversation
            this.messageService.createConversation({
              title: this.conversationTitle || 'Chat Directo',
              type: 'individual',
              participant_ids: [contactId]
            }).subscribe({
              next: (response) => {
                console.log('✅ Conversation created:', response);
                if (response.data && response.data.id) {
                  this.conversationId = response.data.id.toString();
                  this.loadConversation();
                }
              },
              error: (error) => {
                console.error('❌ Error creating conversation:', error);
                // Load empty conversation UI
                this.conversationId = 'new_' + contactId;
                this.messages = [];
                this.loading = false;
              }
            });
          }
        },
        error: (error) => {
          console.error('❌ Error finding conversations:', error);
          // Load empty conversation UI
          this.conversationId = 'new_' + contactId;
          this.messages = [];
          this.loading = false;
        }
      });
  }
  
  getSelectedContact(): Contact | undefined {
    return this.contacts.find(c => c.id === this.selectedContactId);
  }
  
  filterContacts(): void {
    const query = this.searchQuery.toLowerCase().trim();
    if (!query) {
      this.filteredContacts = this.contacts;
    } else {
      this.filteredContacts = this.contacts.filter(contact =>
        contact.name.toLowerCase().includes(query)
      );
    }
  }
  
  openStartConversation(): void {
    // Navigate to conversations page to start a new one
    this.router.navigate(['/mensajeria/conversations']);
  }

  toggleContactsPanel(): void {
    this.showContactsPanel = !this.showContactsPanel;
  }

  goBack(): void {
    this.router.navigate(['/mensajeria/conversations']);
  }

  scrollToBottom(): void {
    const chatMessages = document.querySelector('.chat-messages');
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }
  
  

  /**
   * Handle typing indicator
   */
  onTyping(): void {
    if (!this.conversationId) return;
    
    if (!this.isTyping) {
      this.isTyping = true;
      this.echoService.sendTypingIndicator(parseInt(this.conversationId), true);
    }
    
    // Stop typing indicator after 3 seconds of inactivity
    clearTimeout(this.typingTimeout);
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      if (this.conversationId) {
        this.echoService.sendTypingIndicator(parseInt(this.conversationId), false);
      }
    }, 3000);
  }
  
  onMessageInput(event: any): void {
    this.onTyping();
  }

  /**
   * Update typing indicator display
   */
  updateTypingIndicator(): void {
    const typingUsersArray = Array.from(this.typingUsers.values()).filter(user => user.is_typing);
    this.typingText = typingUsersArray.length > 0 
      ? `${typingUsersArray.map(u => u.user_name).join(', ')} ${typingUsersArray.length === 1 ? 'está escribiendo...' : 'están escribiendo...'}`
      : '';
  }

  /**
   * Play notification sound
   */
  playNotificationSound(): void {
    // Simple notification sound using Web Audio API
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.log('Could not play notification sound:', error);
    }
  }

  onImageError(event: any): void {
    event.target.src = 'assets/img/user-default.png';
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  formatMessageDate(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }
  
  formatMessageTime(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  }
  
  formatDateDivider(dateStr: string): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (messageDate.getTime() === today.getTime()) {
      return 'Hoy';
    } else if (messageDate.getTime() === yesterday.getTime()) {
      return 'Ayer';
    } else {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long',
        day: 'numeric', 
        month: 'long',
        year: 'numeric'
      });
    }
  }
  
  showDateDivider(index: number): boolean {
    if (index === 0) return true;
    
    const currentMsg = this.messages[index];
    const previousMsg = this.messages[index - 1];
    
    const currentDate = new Date(currentMsg.sent_at).toDateString();
    const previousDate = new Date(previousMsg.sent_at).toDateString();
    
    return currentDate !== previousDate;
  }
  

  getOnlineContactsCount(): number {
    return this.contacts.filter(c => c.is_online).length;
  }

  /**
   * Start polling for new messages every 3 seconds
   */
  startPolling(): void {
    // Clear any existing interval
    this.stopPolling();

    console.log('📊 Starting message polling (every 3 seconds)');

    // Poll every 3 seconds
    this.pollingInterval = setInterval(() => {
      this.refreshMessages();
    }, 3000);
  }

  /**
   * Stop polling for messages
   */
  stopPolling(): void {
    if (this.pollingInterval) {
      console.log('📊 Stopping message polling');
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * Refresh messages without showing loading indicator
   */
  refreshMessages(): void {
    if (!this.conversationId) return;

    this.messageService.getMessagesForConversation(parseInt(this.conversationId))
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (messages) => {
          const previousCount = this.messages.length;
          const newMessages = this.transformMessages(messages);

          // Only update if there are new messages
          if (newMessages.length > previousCount) {
            console.log(`📬 Received ${newMessages.length - previousCount} new message(s)`);
            this.messages = newMessages;

            // Scroll to bottom only if there are new messages
            setTimeout(() => this.scrollToBottom(), 100);

            // Play notification sound for new messages
            this.playNotificationSound();
          }
        },
        error: (error) => {
          console.error('Error refreshing messages:', error);
        }
      });
  }

  /**
   * Search messages in conversation
   */
  searchMessages(): void {
    if (!this.conversationSearchQuery || this.conversationSearchQuery.trim() === '') {
      this.searchResults = [];
      return;
    }

    const query = this.conversationSearchQuery.toLowerCase();
    this.searchResults = this.messages.filter(msg => 
      msg.content.toLowerCase().includes(query) ||
      msg.sender_name.toLowerCase().includes(query)
    );

    console.log('🔍 Resultados de búsqueda:', this.searchResults.length);
  }

  /**
   * Toggle search panel
   */
  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    if (!this.showSearch) {
      this.conversationSearchQuery = '';
      this.searchResults = [];
    }
  }

  /**
   * Clear search
   */
  clearSearch(): void {
    this.conversationSearchQuery = '';
    this.searchResults = [];
  }

  /**
   * Show message actions
   */
  showActionsForMessage(message: ChatMessage, event: Event): void {
    event.stopPropagation();
    this.selectedMessage = message;
    this.showMessageActions = true;
  }

  /**
   * Delete message
   */
  deleteMessage(message: ChatMessage): void {
    if (confirm('¿Estás seguro de eliminar este mensaje?')) {
      // TODO: Implement message deletion via API
      this.messages = this.messages.filter(m => m.id !== message.id);
      this.showMessageActions = false;
      console.log('🗑️ Mensaje eliminado:', message.id);
    }
  }

  /**
   * Copy message text
   */
  copyMessage(message: ChatMessage): void {
    navigator.clipboard.writeText(message.content).then(() => {
      console.log('📋 Mensaje copiado al portapapeles');
      alert('Mensaje copiado al portapapeles');
    });
    this.showMessageActions = false;
  }

  /**
   * Forward message
   */
  forwardMessage(message: ChatMessage): void {
    // TODO: Implement forward functionality
    console.log('➡️ Reenviar mensaje:', message.id);
    this.showMessageActions = false;
  }

  /**
   * Start voice recording
   */
  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];

      this.mediaRecorder.addEventListener('dataavailable', (event) => {
        this.audioChunks.push(event.data);
      });

      this.mediaRecorder.addEventListener('stop', () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.sendVoiceMessage(audioBlob);
      });

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingTime = 0;

      // Start timer
      const timer = setInterval(() => {
        if (this.isRecording) {
          this.recordingTime++;
        } else {
          clearInterval(timer);
        }
      }, 1000);

      console.log('🎤 Grabación iniciada');
    } catch (error) {
      console.error('❌ Error al iniciar grabación:', error);
      alert('No se pudo acceder al micrófono. Por favor, verifica los permisos.');
    }
  }

  /**
   * Stop voice recording
   */
  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.recordingTime = 0;

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      console.log('🎤 Grabación detenida');
    }
  }

  /**
   * Cancel voice recording
   */
  cancelRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      this.recordingTime = 0;
      this.audioChunks = [];

      // Stop all tracks
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
      
      console.log('🎤 Grabación cancelada');
    }
  }

  /**
   * Send voice message
   */
  sendVoiceMessage(audioBlob: Blob): void {
    // TODO: Implement voice message sending
    console.log('🎤 Enviando mensaje de voz:', audioBlob.size, 'bytes');
    
    // Create a File object from the blob
    const file = new File([audioBlob], `voice-${Date.now()}.webm`, { type: 'audio/webm' });
    this.selectedFiles = [file];
    
    // Send as attachment
    this.sendMessageWithAttachments();
  }

  /**
   * Format recording time
   */
  getRecordingTime(): string {
    const minutes = Math.floor(this.recordingTime / 60);
    const seconds = this.recordingTime % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
