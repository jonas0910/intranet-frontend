import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { WebSocketService } from '../../services/websocket.service';
import { Conversation } from '../../models/conversation.model';
import { Message } from '../../models/message.model';
import { Recipient } from '../../models/recipient.model';

@Component({
  selector: 'app-conversation-list',
  templateUrl: './conversation-list.component.html',
  styleUrls: ['./conversation-list.component.scss']
})
export class ConversationListComponent implements OnInit, OnDestroy {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  @Output() conversationSelected = new EventEmitter<Conversation>();
  @Output() newConversation = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  conversations: Conversation[] = [];
  filteredConversations: Conversation[] = [];
  selectedConversationId?: number;
  
  // Search and filters
  searchControl = new FormControl('');
  filterControl = new FormControl('all');
  
  // UI State
  loading = false;
  loadingMore = false;
  hasMoreConversations = true;
  
  // Pagination
  currentPage = 1;
  pageSize = 20;
  
  // Filter options
  filterOptions = [
    { value: 'all', label: 'Todas las conversaciones' },
    { value: 'unread', label: 'No leídas' },
    { value: 'important', label: 'Importantes' },
    { value: 'recent', label: 'Recientes' }
  ];

  constructor(
    private messageService: MessageService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadConversations();
    this.setupSearch();
    this.setupFilters();
    this.setupWebSocketListeners();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConversations(reset = true): void {
    if (reset) {
      this.currentPage = 1;
      this.conversations = [];
      this.hasMoreConversations = true;
    }

    if (!this.hasMoreConversations) {
      return;
    }

    this.loading = reset;
    this.loadingMore = !reset;

    const params = {
      page: this.currentPage,
      per_page: this.pageSize,
      search: this.searchControl.value || '',
      filter: this.filterControl.value || 'all'
    };

    this.messageService.getConversations(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.loadingMore = false;
          
          if (response.success) {
            if (reset) {
              this.conversations = response.data.data;
            } else {
              this.conversations = [...this.conversations, ...response.data.data];
            }
            
            this.hasMoreConversations = response.data.current_page < response.data.last_page;
            this.currentPage = response.data.current_page + 1;
            this.applyFilters();
          }
        },
        error: (error) => {
          this.loading = false;
          this.loadingMore = false;
          console.error('Error loading conversations:', error);
        }
      });
  }

  private setupSearch(): void {
    this.searchControl.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged()
      )
      .subscribe(() => {
        this.loadConversations(true);
      });
  }

  private setupFilters(): void {
    this.filterControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadConversations(true);
      });
  }

  private setupWebSocketListeners(): void {
    // Listen for new messages
    this.webSocketService.onMessageReceived()
      .pipe(takeUntil(this.destroy$))
      .subscribe((message: Message) => {
        this.updateConversationWithNewMessage(message);
      });

    // Listen for message read status changes
    this.webSocketService.onMessageRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe((data: any) => {
        this.updateConversationReadStatus(data.conversation_id, data.message_id);
      });
  }

  private updateConversationWithNewMessage(message: Message): void {
    const conversationIndex = this.conversations.findIndex(
      c => c.id === message.conversation_id
    );

    if (conversationIndex >= 0) {
      // Update existing conversation
      const conversation = this.conversations[conversationIndex];
      conversation.last_message = message;
      conversation.last_message_at = message.created_at;
      conversation.unread_count = (conversation.unread_count || 0) + 1;
      
      // Move to top
      this.conversations.splice(conversationIndex, 1);
      this.conversations.unshift(conversation);
    } else {
      // New conversation - reload list
      this.loadConversations(true);
    }
    
    this.applyFilters();
  }

  private updateConversationReadStatus(conversationId: number, messageId: number): void {
    const conversation = this.conversations.find(c => c.id === conversationId);
    if (conversation && conversation.unread_count > 0) {
      conversation.unread_count = Math.max(0, conversation.unread_count - 1);
      this.applyFilters();
    }
  }

  private applyFilters(): void {
    let filtered = [...this.conversations];

    // Apply search filter
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      filtered = filtered.filter(conversation => 
        conversation.subject?.toLowerCase().includes(searchTerm) ||
        conversation.participants.some(p => 
          p.name.toLowerCase().includes(searchTerm) ||
          p.email.toLowerCase().includes(searchTerm)
        ) ||
        conversation.last_message?.content.toLowerCase().includes(searchTerm)
      );
    }

    // Apply status filter
    const filterValue = this.filterControl.value;
    switch (filterValue) {
      case 'unread':
        filtered = filtered.filter(c => c.unread_count > 0);
        break;
      case 'important':
        filtered = filtered.filter(c => c.is_important);
        break;
      case 'recent':
        filtered = filtered.filter(c => {
          const lastMessageDate = new Date(c.last_message_at);
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return lastMessageDate > threeDaysAgo;
        });
        break;
    }

    this.filteredConversations = filtered;
  }

  onConversationClick(conversation: Conversation): void {
    this.selectedConversationId = conversation.id;
    this.conversationSelected.emit(conversation);
  }

  onNewConversation(): void {
    this.newConversation.emit();
  }

  onLoadMore(): void {
    if (!this.loadingMore && this.hasMoreConversations) {
      this.loadConversations(false);
    }
  }

  onRefresh(): void {
    this.loadConversations(true);
  }

  onMarkAsRead(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    
    if (conversation.unread_count === 0) {
      return;
    }

    this.messageService.markConversationAsRead(conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            conversation.unread_count = 0;
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Error marking conversation as read:', error);
        }
      });
  }

  onToggleImportant(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    
    const action = conversation.is_important ? 'unmarkImportant' : 'markImportant';
    this.messageService[`${action}Conversation`](conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            conversation.is_important = !conversation.is_important;
            this.applyFilters();
          }
        },
        error: (error) => {
          console.error('Error toggling conversation importance:', error);
        }
      });
  }

  onDeleteConversation(conversation: Conversation, event: Event): void {
    event.stopPropagation();
    
    if (!confirm('¿Está seguro de que desea eliminar esta conversación?')) {
      return;
    }

    this.messageService.deleteConversation(conversation.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.conversations = this.conversations.filter(c => c.id !== conversation.id);
            this.applyFilters();
            
            // If this was the selected conversation, clear selection
            if (this.selectedConversationId === conversation.id) {
              this.selectedConversationId = undefined;
            }
          }
        },
        error: (error) => {
          console.error('Error deleting conversation:', error);
        }
      });
  }

  // Helper methods
  getParticipantNames(conversation: Conversation): string {
    if (!conversation.participants || conversation.participants.length === 0) {
      return 'Sin participantes';
    }

    if (conversation.participants.length <= 2) {
      return conversation.participants.map(p => p.name).join(', ');
    } else {
      const first = conversation.participants[0].name;
      return `${first} y ${conversation.participants.length - 1} más`;
    }
  }

  getLastMessagePreview(conversation: Conversation): string {
    if (!conversation.last_message) {
      return 'Sin mensajes';
    }

    const content = conversation.last_message.content || '';
    const maxLength = 100;
    
    if (content.length <= maxLength) {
      return content;
    }
    
    return content.substring(0, maxLength) + '...';
  }

  formatLastMessageDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 2) {
      return 'Ayer';
    } else if (diffDays <= 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', {
        month: 'short',
        day: 'numeric'
      });
    }
  }

  getConversationIcon(conversation: Conversation): string {
    if (conversation.participants.length > 2) {
      return 'fas fa-users';
    } else {
      return 'fas fa-user';
    }
  }

  isConversationSelected(conversation: Conversation): boolean {
    return this.selectedConversationId === conversation.id;
  }

  hasUnreadMessages(conversation: Conversation): boolean {
    return conversation.unread_count > 0;
  }

  getUnreadCount(conversation: Conversation): number {
    return conversation.unread_count || 0;
  }

  // Getters for template
  get hasConversations(): boolean {
    return this.filteredConversations.length > 0;
  }

  get isSearching(): boolean {
    return !!this.searchControl.value;
  }

  get isFiltering(): boolean {
    return this.filterControl.value !== 'all';
  }

  get totalUnreadCount(): number {
    return this.conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
  }

  clearSearch(): void {
    this.searchControl.setValue('');
    this.searchInput.nativeElement.focus();
  }

  clearFilters(): void {
    this.filterControl.setValue('all');
    this.searchControl.setValue('');
  }

  trackByConversationId(index: number, conversation: Conversation): number {
    return conversation.id;
  }
}