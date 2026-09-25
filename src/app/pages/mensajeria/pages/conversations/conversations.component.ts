import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { Conversation } from '../../models/conversation.model';

@Component({
  selector: 'app-conversations',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './conversations.component.html',
  styleUrls: ['./conversations.component.scss']
})
export class ConversationsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  conversations: any[] = [];
  selectedConversation: any = null;
  loading = false;
  
  constructor(
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadConversations();
    
    // Check if we have a specific conversation ID
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.loadConversation(params['id']);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadConversations(): void {
    this.loading = true;
    
    this.messageService.getConversations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('📨 Conversations: Response received:', response);
          console.log('📨 Conversations: Response structure:', {
            success: response.success,
            hasData: !!response.data,
            hasDataData: !!(response.data && response.data.data),
            dataLength: response.data.data.length || 0
          });
          
          // Fix: Access the correct nested data structure
          this.conversations = response.data.data || [];
          this.loading = false;
          
          console.log('📨 Conversations: Conversations loaded:', this.conversations.length);
        },
        error: (error) => {
          console.error('Error loading conversations:', error);
          this.loading = false;
        }
      });
  }

  private loadConversation(id: string): void {
    // Load specific conversation
    console.log('Loading conversation:', id);
  }

  onConversationSelect(conversation: Conversation): void {
    this.selectedConversation = conversation;
    // Navigate to direct chat with conversation context
    this.router.navigate(['/mensajeria/chat'], {
      queryParams: {
        conversationId: conversation.id,
        conversationTitle: conversation.title || 'Chat Directo'
      }
    });
  }

  onRefresh(): void {
    this.loadConversations();
  }

  onNewConversation(): void {
    // Navigate to direct chat for new conversation
    this.router.navigate(['/mensajeria/chat']);
  }

  // Helper functions for template
  getSenderName(conversation: any): string {
    return conversation.last_message?.sender_name || conversation.sender?.name || '';
  }

  getLastMessage(conversation: any): string {
    return conversation.last_message?.content || conversation.latest_message?.content || '';
  }

  getLastMessageAt(conversation: any): string {
    return conversation.last_message?.created_at || conversation.latest_message?.created_at || conversation.updated_at || '';
  }

  getChannelName(conversation: any): string {
    return conversation.channel_name || '';
  }

  isOnline(conversation: any): boolean {
    return conversation.is_online || false;
  }
}