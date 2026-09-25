import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { WebSocketService, UserStatusEvent } from '../../services/websocket.service';
import { AuthService } from '../../../../services/auth.service';
import { MessageService } from '../../services/message.service';

interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: string;
  isOnline: boolean;
  unreadCount?: number;
}

interface Message {
  id: string;
  senderId: string;
  sender_id: string; // Add missing property for template compatibility
  content: string;
  timestamp: Date;
  created_at: string | Date; // Add missing property
  attachments?: any[];
  emoticons?: string[];
  isOwn?: boolean;
  sender_avatar?: string; // Add missing property
  sender_name?: string; // Add missing property
}

interface ChatTab {
  id: string;
  contact: Contact;
  messages: Message[];
  isMinimized: boolean;
  isActive: boolean;
  unreadCount: number;
  isTyping: boolean;
  messageInput: string;
  newMessage: string; // Add missing property
  selectedFiles: File[];
  loading: boolean; // Add missing property
}

@Component({
  selector: 'app-facebook-chat',
  templateUrl: './facebook-chat.component.html',
  styleUrls: ['./facebook-chat.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class FacebookChatComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private destroy$ = new Subject<void>();
  private statusUpdateInterval: any;
  
  // Component properties State
  contacts: Contact[] = [];
  chatTabs: ChatTab[] = [];
  selectedContact: Contact | null = null;
  isContactsSidebarCollapsed = false;
  sidebarCollapsed = false; // Alias for template compatibility
  isEmojiPickerOpen = false;
  showEmojiPicker = false; // Add missing property
  activeEmojiChatId: string | null = null;
  searchQuery = '';
  currentUserId: string = '1'; // Mock current user ID
  emojiList: string[] = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', '🤖', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾']; // Add missing property
  
  // Mock data
  mockContacts: Contact[] = [
    {
      id: '1',
      name: 'Ana García',
      avatar: 'assets/images/avatars/ana.jpg',
      status: 'En línea',
      isOnline: true,
      unreadCount: 3
    },
    {
      id: '2',
      name: 'Carlos Rodríguez',
      avatar: 'assets/images/avatars/carlos.jpg',
      status: 'Hace 5 min',
      isOnline: false,
      unreadCount: 1
    },
    {
      id: '3',
      name: 'María López',
      avatar: 'assets/images/avatars/maria.jpg',
      status: 'En línea',
      isOnline: true
    },
    {
      id: '4',
      name: 'Juan Pérez',
      avatar: 'assets/images/avatars/juan.jpg',
      status: 'Hace 2 horas',
      isOnline: false
    },
    {
      id: '5',
      name: 'Laura Martín',
      avatar: 'assets/images/avatars/laura.jpg',
      status: 'En línea',
      isOnline: true,
      unreadCount: 7
    }
  ];

  mockEmojis = ['😀', '😂', '😍', '😢', '😡', '👍', '👎', '❤️', '🎉', '🔥', '💯', '🤔', '😎', '🙄', '😴', '🤗'];

  constructor(
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private messageService: MessageService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadContactsFromAPI();
    this.connectToWebSocket();
    this.startStatusUpdateInterval();
  }

  ngAfterViewInit(): void {
    // Initialize any view-related functionality
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.clearStatusUpdateInterval();
    this.webSocketService.disconnect();
  }

  private loadContactsFromAPI(): void {
    console.log('🔄 Loading contacts from API...');
    this.messageService.getContacts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          console.log('✅ Contacts loaded from API:', contacts);
          this.contacts = this.transformContactsFromAPI(contacts);
          console.log('📊 Transformed contacts:', this.contacts);
          console.log(`📈 Statistics - Online: ${this.onlineContactsCount}, Total: ${this.totalContactsCount}`);
          // Force change detection to update UI
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error loading contacts from API:', error);
          // Fallback to mock data if API fails
          console.log('🔄 Using fallback mock data');
          this.contacts = [...this.mockContacts];
        }
      });
  }

  private transformContactsFromAPI(apiContacts: any[]): Contact[] {
    return apiContacts.map(user => ({
      id: user.id.toString(),
      name: user.name,
      avatar: 'assets/img/user-default.png',
      status: this.getUserStatus(user.last_activity_at),
      isOnline: this.isUserOnline(user.last_activity_at),
      unreadCount: 0 // Will be updated by WebSocket events
    }));
  }

  private getUserStatus(lastActivityAt: string | null): string {
    if (!lastActivityAt) return 'Desconectado';
    
    const lastActivity = new Date(lastActivityAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
    
    if (diffMinutes < 5) return 'En línea';
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} horas`;
    return `Hace ${Math.floor(diffMinutes / 1440)} días`;
  }

  private startStatusUpdateInterval(): void {
    console.log('🔄 Starting automatic status update interval (every 30 seconds)');
    
    // Clear any existing interval
    this.clearStatusUpdateInterval();
    
    // Update contact statuses every 30 seconds
    this.statusUpdateInterval = setInterval(() => {
      this.refreshContactStatuses();
    }, 30000); // 30 seconds
  }

  private clearStatusUpdateInterval(): void {
    if (this.statusUpdateInterval) {
      console.log('🛑 Clearing status update interval');
      clearInterval(this.statusUpdateInterval);
      this.statusUpdateInterval = null;
    }
  }

  private isUserOnline(lastActivityAt: string | null): boolean {
    if (!lastActivityAt) return false;
    
    const lastActivity = new Date(lastActivityAt);
    const now = new Date();
    const diffMinutes = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60));
    
    // Consider user online if active within last 5 minutes
    return diffMinutes < 5;
  }

  private refreshContactStatuses(): void {
    console.log('🔄 Refreshing contact statuses...');
    
    // Reload contacts from API to get updated last_activity_at
    this.messageService.getContacts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (contacts) => {
          console.log('✅ Contact statuses refreshed from API');
          
          // Update existing contacts with new status information
          contacts.forEach(apiContact => {
            const existingContact = this.contacts.find(c => c.id === apiContact.id.toString());
            if (existingContact) {
              const wasOnline = existingContact.isOnline;
              existingContact.status = this.getUserStatus(apiContact.last_activity_at);
              existingContact.isOnline = this.isUserOnline(apiContact.last_activity_at);
              
              // Log status changes
              if (wasOnline !== existingContact.isOnline) {
                console.log(`👤 ${existingContact.name} status changed: ${existingContact.isOnline ? 'online' : 'offline'}`);
              }
              
              // Update chat tab if exists
              const chatTab = this.chatTabs.find(tab => tab.contact.id === existingContact.id);
              if (chatTab) {
                chatTab.contact.isOnline = existingContact.isOnline;
                chatTab.contact.status = existingContact.status;
              }
            }
          });
          
          console.log(`📈 Status refresh complete - Online: ${this.onlineContactsCount}, Total: ${this.totalContactsCount}`);
          
          // Force change detection to update UI
          this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('❌ Error refreshing contact statuses:', error);
        }
      });
  }

  // WebSocket connection and real-time updates
  private connectToWebSocket(): void {
    const userId = this.getCurrentUserId();
    if (userId) {
      this.webSocketService.connect(userId)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (connected) => {
            if (connected) {
              console.log('✅ Facebook Chat connected to WebSocket');
              // Setup all WebSocket listeners after connection
              this.setupUserStatusListener();
              this.setupMessageReceivedListener();
            }
          },
          error: (error) => {
            console.error('❌ Facebook Chat WebSocket connection error:', error);
          }
        });
    }
  }

  private setupUserStatusListener(): void {
    this.webSocketService.getUserStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe((statusEvent: UserStatusEvent) => {
        console.log('👤 User status update received:', statusEvent);
        this.updateContactStatus(statusEvent.user_id, statusEvent.status);
      });
  }

  private setupMessageReceivedListener(): void {
    this.webSocketService.getMessageReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe((messageEvent: any) => {
        console.log('📨 Nuevo mensaje recibido:', messageEvent);
        this.handleNewMessageReceived(messageEvent);
      });
  }

  private handleNewMessageReceived(messageEvent: any): void {
    const senderId = messageEvent.message?.sender_id?.toString() || messageEvent.sender_id?.toString();
    const messageContent = messageEvent.message?.content || messageEvent.content;
    const conversationId = messageEvent.conversation?.id || messageEvent.conversation_id;
    
    if (!senderId || !messageContent) {
      console.warn('⚠️ Mensaje recibido incompleto:', messageEvent);
      return;
    }

    // Find existing chat tab for this sender
    let chatTab = this.chatTabs.find(tab => tab.contact.id === senderId);
    
    if (chatTab) {
      // Add message to existing chat tab
      const newMessage: Message = {
        id: messageEvent.message?.id?.toString() || `msg-${Date.now()}`,
        senderId: senderId,
        sender_id: senderId, // Add missing property
        content: messageContent,
        timestamp: new Date(messageEvent.timestamp || new Date()),
        created_at: new Date(messageEvent.timestamp || new Date()), // Add missing property
        isOwn: false,
        sender_avatar: chatTab.contact.avatar, // Add missing property
        sender_name: chatTab.contact.name // Add missing property
      };
      
      chatTab.messages.push(newMessage);
      
      // Increment unread count only if tab is not active
      if (!chatTab.isActive) {
        chatTab.unreadCount++;
        console.log(`📬 Incrementando contador no leído para ${chatTab.contact.name}: ${chatTab.unreadCount}`);
      }
      
      // Scroll to bottom if tab is active
      if (chatTab.isActive) {
        setTimeout(() => {
          this.scrollToBottom(chatTab!.id);
        }, 100);
      }
    } else {
      // Find contact and increment their unread count
      const contact = this.contacts.find(c => c.id === senderId);
      if (contact) {
        contact.unreadCount = (contact.unreadCount || 0) + 1;
        console.log(`📬 Incrementando contador no leído para contacto ${contact.name}: ${contact.unreadCount}`);
      }
    }
  }

  private updateContactStatus(userId: number, status: string): void {
    const contact = this.contacts.find(c => c.id === userId.toString());
    if (contact) {
      const wasOnline = contact.isOnline;
      contact.isOnline = status === 'online';
      contact.status = status === 'online' ? 'En línea' : 'Desconectado';
      
      // Log status change for debugging
      console.log(`👤 Contact ${contact.name} status updated: ${status} (was ${wasOnline ? 'online' : 'offline'})`);
      console.log(`📈 Updated Statistics - Online: ${this.onlineContactsCount}, Total: ${this.totalContactsCount}`);
      
      // Update chat tab status if exists
      const chatTab = this.chatTabs.find(tab => tab.contact.id === contact.id);
      if (chatTab) {
        chatTab.contact.isOnline = contact.isOnline;
        chatTab.contact.status = contact.status;
        console.log(`💬 Chat tab for ${contact.name} status updated`);
      }
      
      // Force change detection to update statistics in UI
      this.cdr.detectChanges();
    } else {
      console.log(`⚠️ Contact with ID ${userId} not found in contacts list`);
    }
  }

  private getCurrentUserId(): number | null {
    const user = this.authService.getCurrentUser();
    return user ? user.id : null;
  }

  // Statistics getters
  get onlineContactsCount(): number {
    return this.contacts.filter(c => c.isOnline).length;
  }

  get totalContactsCount(): number {
    return this.contacts.length;
  }

  // Contact Management
  get filteredContacts(): Contact[] {
    if (!this.searchQuery.trim()) {
      return this.contacts;
    }
    return this.contacts.filter(contact =>
      contact.name.toLowerCase().includes(this.searchQuery.toLowerCase())
    );
  }

  onContactSearch(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
  }

  selectContact(contact: Contact): void {
    this.selectedContact = contact;
    this.openChatTab(contact);
  }

  toggleContactsSidebar(): void {
    this.isContactsSidebarCollapsed = !this.isContactsSidebarCollapsed;
  }

  // Chat Tab Management
  openNewChatDialog(): void {
    // For now, we'll open a chat with the first available contact
    // In a real implementation, this would open a contact selection dialog
    if (this.contacts.length > 0) {
      this.openChatTab(this.contacts[0]);
    } else {
      console.log('No contacts available to start a new chat');
    }
  }

  openChatTab(contact: Contact): void {
    // Check if chat tab already exists
    let existingTab = this.chatTabs.find(tab => tab.contact.id === contact.id);
    
    if (existingTab) {
      // Activate existing tab
      this.setActiveTab(existingTab.id);
      if (existingTab.isMinimized) {
        existingTab.isMinimized = false;
      }
    } else {
      // Create new chat tab
      const newTab: ChatTab = {
        id: `chat-${contact.id}-${Date.now()}`,
        contact: contact,
        messages: this.generateMockMessages(contact.id),
        isMinimized: false,
        isActive: true,
        unreadCount: 0,
        isTyping: false,
        messageInput: '',
        newMessage: '', // Add missing property
        selectedFiles: [],
        loading: false // Add missing property
      };
      
      // Deactivate other tabs
      this.chatTabs.forEach(tab => tab.isActive = false);
      
      // Add new tab
      this.chatTabs.push(newTab);
      
      // Limit to 5 tabs maximum
      if (this.chatTabs.length > 5) {
        this.chatTabs.shift();
      }
    }
  }

  setActiveTab(tabId: string): void {
    this.chatTabs.forEach(tab => {
      tab.isActive = tab.id === tabId;
      if (tab.isActive) {
        tab.unreadCount = 0;
      }
    });
  }

  toggleTabMinimize(tabId: string): void {
    const tab = this.chatTabs.find(t => t.id === tabId);
    if (tab) {
      tab.isMinimized = !tab.isMinimized;
    }
  }

  closeChatTab(tabId: string): void {
    const index = this.chatTabs.findIndex(tab => tab.id === tabId);
    if (index > -1) {
      this.chatTabs.splice(index, 1);
      
      // If there are remaining tabs, activate the last one
      if (this.chatTabs.length > 0) {
        this.chatTabs[this.chatTabs.length - 1].isActive = true;
      }
    }
  }

  // Message Management
  sendMessage(chat: ChatTab): void {
    if (!chat || !chat.newMessage?.trim()) {
      return;
    }

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      senderId: 'current-user',
      sender_id: this.currentUserId, // Add for template compatibility
      content: chat.newMessage.trim(),
      timestamp: new Date(),
      created_at: new Date(), // Add for template compatibility
      attachments: chat.selectedFiles.length > 0 ? [...chat.selectedFiles] : undefined,
      isOwn: true,
      sender_avatar: 'assets/img/user-default.png', // Add default avatar
      sender_name: 'Usuario Actual' // Add default name
    };

    chat.messages.push(newMessage);
    chat.newMessage = '';
    chat.selectedFiles = [];

    // Scroll to bottom
    setTimeout(() => {
      this.scrollToBottom(chat.id);
    }, 100);

    // Simulate response (optional)
    this.simulateResponse(chat);
  }

  private simulateResponse(tab: ChatTab): void {
    setTimeout(() => {
      const responses = [
        '¡Hola! ¿Cómo estás?',
        'Perfecto, gracias por el mensaje',
        'Entendido, te respondo pronto',
        'Excelente idea',
        '👍',
        'De acuerdo'
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const responseMessage: Message = {
        id: `msg-${Date.now()}`,
        senderId: tab.contact.id,
        sender_id: tab.contact.id, // Add missing property
        content: randomResponse,
        timestamp: new Date(),
        created_at: new Date(), // Add missing property
        isOwn: false,
        sender_avatar: tab.contact.avatar, // Add missing property
        sender_name: tab.contact.name // Add missing property
      };

      tab.messages.push(responseMessage);
      
      if (!tab.isActive) {
        tab.unreadCount++;
      }

      setTimeout(() => {
        this.scrollToBottom(tab.id);
      }, 100);
    }, 1000 + Math.random() * 2000);
  }

  private scrollToBottom(tabId: string): void {
    const messagesContainer = document.querySelector(`#${tabId} .messages-list`);
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  // File Management
  openFileSelector(chat: ChatTab): void {
    // Open file selector for the specific chat tab
    this.fileInput.nativeElement.click();
    this.fileInput.nativeElement.onchange = (event: any) => {
      const files = Array.from(event.target.files) as File[];
      chat.selectedFiles.push(...files);
    };
  }

  onFileSelect(tabId: string): void {
    const tab = this.chatTabs.find(t => t.id === tabId);
    if (!tab) return;

    this.fileInput.nativeElement.click();
    this.fileInput.nativeElement.onchange = (event: any) => {
      const files = Array.from(event.target.files) as File[];
      tab.selectedFiles.push(...files);
    };
  }

  onFilesSelected(event: Event): void {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const files = Array.from(target.files) as File[];
      // Find the active tab and add files to it
      const activeTab = this.chatTabs.find(tab => tab.isActive);
      if (activeTab) {
        activeTab.selectedFiles.push(...files);
      }
    }
  }

  removeFile(chat: ChatTab, file: File): void {
    const fileIndex = chat.selectedFiles.findIndex(f => f.name === file.name && f.size === file.size);
    if (fileIndex !== -1) {
      chat.selectedFiles.splice(fileIndex, 1);
    }
  }

  removeSelectedFile(tabId: string, index: number): void {
    const tab = this.chatTabs.find(t => t.id === tabId);
    if (tab) {
      tab.selectedFiles.splice(index, 1);
    }
  }

  downloadAttachment(attachment: any): void {
    // Implement file download logic
    console.log('Downloading attachment:', attachment);
  }

  // Emoji Management
  toggleEmojiPicker(chat: ChatTab): void {
    if (this.isEmojiPickerOpen && this.activeEmojiChatId === chat.id) {
      this.closeEmojiPicker();
    } else {
      this.isEmojiPickerOpen = true;
      this.showEmojiPicker = true; // Add for template compatibility
      this.activeEmojiChatId = chat.id;
    }
  }

  closeEmojiPicker(): void {
    this.isEmojiPickerOpen = false;
    this.showEmojiPicker = false; // Add for template compatibility
    this.activeEmojiChatId = null;
  }

  addEmoji(emoji: string): void {
    if (this.activeEmojiChatId) {
      const tab = this.chatTabs.find(t => t.id === this.activeEmojiChatId);
      if (tab) {
        tab.newMessage += emoji;
      }
    }
    this.closeEmojiPicker();
  }

  // Utility Methods
  private generateMockMessages(contactId: string): Message[] {
    const messages: Message[] = [
      {
        id: 'msg-1',
        senderId: contactId,
        sender_id: contactId, // Add for template compatibility
        content: '¡Hola! ¿Cómo estás?',
        timestamp: new Date(Date.now() - 3600000),
        created_at: new Date(Date.now() - 3600000), // Add for template compatibility
        isOwn: false,
        sender_avatar: 'assets/img/user-default.png', // Add default avatar
        sender_name: 'Contacto' // Add default name
      },
      {
        id: 'msg-2',
        senderId: 'current-user',
        sender_id: this.currentUserId, // Add for template compatibility
        content: '¡Hola! Todo bien, gracias. ¿Y tú?',
        timestamp: new Date(Date.now() - 3500000),
        created_at: new Date(Date.now() - 3500000), // Add for template compatibility
        isOwn: true,
        sender_avatar: 'assets/img/user-default.png', // Add default avatar
        sender_name: 'Usuario Actual' // Add default name
      },
      {
        id: 'msg-3',
        senderId: contactId,
        sender_id: contactId, // Add for template compatibility
        content: 'Muy bien también. ¿Tienes tiempo para una reunión mañana?',
        timestamp: new Date(Date.now() - 3400000),
        created_at: new Date(Date.now() - 3400000), // Add for template compatibility
        isOwn: false,
        sender_avatar: 'assets/img/user-default.png', // Add default avatar
        sender_name: 'Contacto' // Add default name
      }
    ];

    return messages;
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'fas fa-file-pdf';
      case 'doc':
      case 'docx': return 'fas fa-file-word';
      case 'xls':
      case 'xlsx': return 'fas fa-file-excel';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif': return 'fas fa-file-image';
      case 'mp4':
      case 'avi':
      case 'mov': return 'fas fa-file-video';
      case 'mp3':
      case 'wav': return 'fas fa-file-audio';
      default: return 'fas fa-file';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Keyboard Events
  onMessageKeyPress(event: KeyboardEvent, tabId: string): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      const chat = this.chatTabs.find(t => t.id === tabId);
      if (chat) {
        this.sendMessage(chat);
      }
    }
  }

  onTyping(chat: ChatTab): void {
    // Handle typing indicator logic here
    // This could send a typing event to the WebSocket service
    console.log('User is typing in chat:', chat.id);
  }

  toggleChatWindow(chat: ChatTab): void {
    // Toggle chat window visibility
    chat.isMinimized = !chat.isMinimized;
    if (!chat.isMinimized) {
      this.setActiveTab(chat.id);
    }
  }

  minimizeChat(chat: ChatTab, event: Event): void {
    event.stopPropagation();
    chat.isMinimized = true;
  }

  closeChat(chat: ChatTab, event: Event): void {
    event.stopPropagation();
    this.closeChatTab(chat.id);
  }

  getAttachmentIcon(attachment: any): string {
    // Return appropriate icon class based on attachment type
    const fileName = attachment.name || attachment.original_name || '';
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'fas fa-file-pdf text-red-500';
      case 'doc':
      case 'docx':
        return 'fas fa-file-word text-blue-500';
      case 'xls':
      case 'xlsx':
        return 'fas fa-file-excel text-green-500';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'fas fa-file-image text-purple-500';
      case 'zip':
      case 'rar':
        return 'fas fa-file-archive text-orange-500';
      default:
        return 'fas fa-file text-gray-500';
    }
  }

  formatMessageTime(timestamp: string | Date): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Less than 1 minute
    if (diff < 60000) {
      return 'Ahora';
    }
    
    // Less than 1 hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `Hace ${minutes} min`;
    }
    
    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `Hace ${hours}h`;
    }
    
    // More than 24 hours - show date
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  // Click outside to close emoji picker
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.emoji-overlay') && !target.closest('.emoji-btn')) {
      this.closeEmojiPicker();
    }
  }
}