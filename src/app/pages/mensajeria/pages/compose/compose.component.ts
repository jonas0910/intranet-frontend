import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, FormControl, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { UserService } from '../../services/user.service';
import { MessageRecipientService, MessageRecipient } from '../../../../services/message-recipient.service';
import { AuthService } from '../../../../services/auth.service';
import { InboxContextService } from '../../../../services/inbox-context.service';
import { SendMessageRequest } from '../../models/message.model';

interface SelectedRecipient {
  id: number;
  name: string;
  email: string;
  type: 'user' | 'department';
}

@Component({
  selector: 'app-compose',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, ReactiveFormsModule],
  templateUrl: './compose.component.html',
  styleUrls: ['./compose.component.scss']
})
export class ComposeComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  sending = false;
  composeForm: FormGroup;
  conversationRecipientsControl = new FormControl(''); // FormControl for conversation recipients display
  conversationId?: string;
  conversationTitle?: string;
  isConversationMode = false;
  
  // Dynamic recipient selection
  selectedRecipients: SelectedRecipient[] = [];
  availableRecipients: MessageRecipient[] = [];
  filteredRecipients: MessageRecipient[] = [];
  showUserSuggestions = false;
  recipientSearchTerm = '';
  
  constructor(
    private messageService: MessageService,
    private userService: UserService,
    private messageRecipientService: MessageRecipientService,
    private authService: AuthService,
    private inboxContextService: InboxContextService,
    private router: Router,
    private route: ActivatedRoute,
    private fb: FormBuilder
  ) {
    this.composeForm = this.fb.group({
      recipientSearch: [''],
      subject: [''],
      content: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    // Check if we're in conversation mode
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['conversationId']) {
        this.conversationId = params['conversationId'];
        this.conversationTitle = params['conversationTitle'] || 'Conversación';
        this.isConversationMode = true;
        
        // Update form title and create disabled recipients control for conversation mode
        this.composeForm.patchValue({
          subject: `Re: ${this.conversationTitle}`
        });
        
        // Create disabled FormControl for conversation recipients display
        this.conversationRecipientsControl.setValue(this.conversationTitle || 'Conversación');
        this.conversationRecipientsControl.disable();
      }
    });

    // Load available users for recipient selection
    this.loadAvailableUsers();
    
    // Setup recipient search
    this.setupRecipientSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onSubmit(): void {
    if (this.composeForm.valid && !this.sending) {
      this.sending = true;
      
      // Create message data according to SendMessageRequest interface
      const messageData = {
        // Only send conversation_id if we're explicitly in conversation mode
        conversation_id: this.isConversationMode && this.conversationId ? parseInt(this.conversationId) : undefined,
        subject: this.composeForm.get('subject')?.value || '',
        content: this.composeForm.get('content')?.value,
        priority: 'normal' as const,
        message_type: 'individual' as const,
        recipients: this.getSelectedRecipients(),
        attachments: []
      };
      
      this.messageService.sendMessage(messageData).subscribe({
        next: (response) => {
          console.log('Message sent successfully:', response);
          this.sending = false;
          
          // Navigate based on mode
          if (this.isConversationMode) {
            this.router.navigate(['/mensajeria/conversations']);
          } else {
            this.router.navigate(['/mensajeria/sent']);
          }
        },
        error: (error) => {
          console.error('Error sending message:', error);
          this.sending = false;
          alert('Error al enviar el mensaje. Por favor, intente nuevamente.');
        }
      });
    }
  }

  onMessageSent(message: any): void {
    console.log('Message sent:', message);
    // Navigate back to inbox
    this.router.navigate(['/mensajeria/inbox']);
  }

  onCancel(): void {
    // Navigate back based on mode
    if (this.isConversationMode) {
      this.router.navigate(['/mensajeria/conversations']);
    } else {
      this.router.navigate(['/mensajeria/inbox']);
    }
  }

  /**
   * Load available recipients for recipient selection
   */
  private loadAvailableUsers(): void {
    this.messageRecipientService.getAvailableRecipients()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (recipients: MessageRecipient[]) => {
          this.availableRecipients = recipients || [];
          console.log('📋 Available recipients loaded:', this.availableRecipients.length);
        },
        error: (error: any) => {
          console.error('❌ Error loading recipients:', error);
          this.availableRecipients = [];
        }
      });
  }

  /**
   * Setup recipient search functionality
   */
  private setupRecipientSearch(): void {
    this.composeForm.get('recipientSearch')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(searchTerm => {
        this.recipientSearchTerm = searchTerm || '';
        this.filterRecipients();
        this.showUserSuggestions = searchTerm && searchTerm.length > 0;
      });
  }

  /**
   * Filter recipients based on search term
   */
  private filterRecipients(): void {
    if (!this.recipientSearchTerm) {
      this.filteredRecipients = [];
      return;
    }

    const searchTerm = this.recipientSearchTerm.toLowerCase();
    this.filteredRecipients = this.availableRecipients.filter(recipient => 
      recipient.name.toLowerCase().includes(searchTerm) ||
      (recipient.email && recipient.email.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Add recipient to selected list
   */
  addRecipient(recipient: MessageRecipient): void {
    // Check if recipient is already selected
    const alreadySelected = this.selectedRecipients.some(r => r.id === recipient.id);
    if (alreadySelected) {
      return;
    }

    const selectedRecipient: SelectedRecipient = {
      id: recipient.id,
      name: recipient.name,
      email: recipient.email || '',
      type: recipient.type
    };

    this.selectedRecipients.push(selectedRecipient);
    this.composeForm.get('recipientSearch')?.setValue('');
    this.showUserSuggestions = false;
    
    console.log('✅ Recipient added:', selectedRecipient);
  }

  /**
   * Remove recipient from selected list
   */
  removeRecipient(index: number): void {
    this.selectedRecipients.splice(index, 1);
    console.log('❌ Recipient removed at index:', index);
  }

  /**
   * Get selected recipients in the format expected by the backend
   */
  private getSelectedRecipients(): { id: number; type: 'user' | 'department' }[] {
    // In conversation mode, return empty array (recipients are handled by conversation)
    if (this.isConversationMode) {
      return [];
    }

    // Validate that at least one recipient is selected
    if (this.selectedRecipients.length === 0) {
      console.warn('⚠️ No recipients selected, using default recipient');
      const defaultRecipient = this.messageRecipientService.getDefaultRecipientSync();
      if (defaultRecipient) {
        return [{ id: defaultRecipient.id, type: defaultRecipient.type }];
      }
      console.error('❌ No default recipient available');
      return [];
    }

    return this.selectedRecipients.map(recipient => ({
      id: recipient.id,
      type: recipient.type
    }));
  }

  /**
   * Check if form is valid for submission
   */
  isFormValid(): boolean {
    if (this.isConversationMode) {
      return Boolean(this.composeForm.get('content')?.valid);
    }
    
    // Check if content is valid and we have recipients (either selected or default)
    const contentValid = Boolean(this.composeForm.get('content')?.valid);
    const hasRecipients = this.selectedRecipients.length > 0 || 
                         this.messageRecipientService.getDefaultRecipientSync() !== null;
    
    return contentValid && hasRecipients;
  }
}