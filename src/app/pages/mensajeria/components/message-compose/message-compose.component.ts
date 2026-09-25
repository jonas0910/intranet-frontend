import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, Observable, of } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { SendMessageRequest } from '../../models/message.model';
import { Recipient, RecipientSearchResult } from '../../models/recipient.model';
import { AttachmentUpload, validateFiles, createAttachmentUpload } from '../../models/attachment.model';

@Component({
  selector: 'app-message-compose',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './message-compose.component.html',
  styleUrls: ['./message-compose.component.scss']
})
export class MessageComposeComponent implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('recipientInput') recipientInput!: ElementRef<HTMLInputElement>;

  @Input() replyToMessage?: any;
  @Input() forwardMessage?: any;
  @Input() conversationId?: number;
  @Input() initialRecipients: Recipient[] = [];
  @Input() mode: 'compose' | 'reply' | 'forward' = 'compose';

  @Output() messageSent = new EventEmitter<any>();
  @Output() cancel = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  composeForm: FormGroup;
  recipients: Recipient[] = [];
  recipientSuggestions: Recipient[] = [];
  attachments: AttachmentUpload[] = [];
  
  loading = false;
  sending = false;
  showRecipientSuggestions = false;
  recipientSearchTerm = '';

  // Form validation
  maxContentLength = 10000;
  maxAttachments = 5;
  maxFileSize = 10 * 1024 * 1024; // 10MB

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService
  ) {
    this.composeForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeForm();
    this.setupRecipientSearch();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      recipients: ['', Validators.required],
      subject: [''],
      content: ['', [Validators.required, Validators.maxLength(this.maxContentLength)]],
      priority: ['normal'],
      recipientSearch: ['']
    });
  }

  private initializeForm(): void {
    // Set initial recipients
    if (this.initialRecipients.length > 0) {
      this.recipients = [...this.initialRecipients];
      this.updateRecipientsFormControl();
    }

    // Handle reply mode
    if (this.mode === 'reply' && this.replyToMessage) {
      this.composeForm.patchValue({
        subject: this.replyToMessage.subject?.startsWith('Re: ') 
          ? this.replyToMessage.subject 
          : `Re: ${this.replyToMessage.subject || 'Mensaje'}`,
        content: `\n\n--- Mensaje original ---\nDe: ${this.replyToMessage.sender.name}\nFecha: ${new Date(this.replyToMessage.created_at).toLocaleString()}\n\n${this.replyToMessage.content}`
      });

      // Add original sender as recipient if not already present
      const originalSender: Recipient = {
        id: this.replyToMessage.sender.id,
        type: 'user',
        name: this.replyToMessage.sender.name,
        email: this.replyToMessage.sender.email
      };

      if (!this.recipients.find(r => r.id === originalSender.id && r.type === originalSender.type)) {
        this.recipients.push(originalSender);
        this.updateRecipientsFormControl();
      }
    }

    // Handle forward mode
    if (this.mode === 'forward' && this.forwardMessage) {
      this.composeForm.patchValue({
        subject: this.forwardMessage.subject?.startsWith('Fwd: ') 
          ? this.forwardMessage.subject 
          : `Fwd: ${this.forwardMessage.subject || 'Mensaje'}`,
        content: `--- Mensaje reenviado ---\nDe: ${this.forwardMessage.sender.name}\nFecha: ${new Date(this.forwardMessage.created_at).toLocaleString()}\nAsunto: ${this.forwardMessage.subject || '(Sin asunto)'}\n\n${this.forwardMessage.content}`
      });
    }
  }

  private setupRecipientSearch(): void {
    this.composeForm.get('recipientSearch')?.valueChanges
      .pipe(
        takeUntil(this.destroy$),
        debounceTime(300),
        distinctUntilChanged(),
        switchMap(term => this.searchRecipients(term))
      )
      .subscribe(suggestions => {
        this.recipientSuggestions = suggestions;
        this.showRecipientSuggestions = suggestions.length > 0 && this.recipientSearchTerm.length > 1;
      });
  }

  private loadInitialData(): void {
    // Load available recipients if needed
    // This could be implemented to load frequently contacted users
  }

  private searchRecipients(term: string): Observable<Recipient[]> {
    this.recipientSearchTerm = term;
    
    if (!term || term.length < 2) {
      return of([]);
    }

    // This would call your recipient search API
    // For now, returning empty array
    return of([]);
  }

  onRecipientSearchFocus(): void {
    if (this.recipientSearchTerm.length > 1) {
      this.showRecipientSuggestions = true;
    }
  }

  onRecipientSearchBlur(): void {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      this.showRecipientSuggestions = false;
    }, 200);
  }

  addRecipient(recipient: Recipient): void {
    // Check if recipient already exists
    const exists = this.recipients.find(r => 
      r.id === recipient.id && r.type === recipient.type
    );

    if (!exists) {
      this.recipients.push(recipient);
      this.updateRecipientsFormControl();
    }

    // Clear search
    this.composeForm.get('recipientSearch')?.setValue('');
    this.showRecipientSuggestions = false;
  }

  removeRecipient(index: number): void {
    this.recipients.splice(index, 1);
    this.updateRecipientsFormControl();
  }

  private updateRecipientsFormControl(): void {
    this.composeForm.get('recipients')?.setValue(
      this.recipients.length > 0 ? 'valid' : ''
    );
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.addFiles(Array.from(input.files));
      input.value = ''; // Reset input
    }
  }

  onFileDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  private addFiles(files: File[]): void {
    // Validate files
    const validation = validateFiles(files);
    if (!validation.valid) {
      // Show error messages
      validation.errors.forEach(error => {
        console.error(error); // In real app, show toast notification
      });
      return;
    }

    // Check total attachment limit
    if (this.attachments.length + files.length > this.maxAttachments) {
      console.error(`Máximo ${this.maxAttachments} archivos por mensaje`);
      return;
    }

    // Add files to attachments
    files.forEach(file => {
      const upload = createAttachmentUpload(file);
      this.attachments.push(upload);
    });
  }

  removeAttachment(index: number): void {
    this.attachments.splice(index, 1);
  }

  getAttachmentIcon(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'fas fa-image text-info';
    }
    if (mimeType === 'application/pdf') {
      return 'fas fa-file-pdf text-danger';
    }
    if (mimeType.includes('word')) {
      return 'fas fa-file-word text-primary';
    }
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) {
      return 'fas fa-file-excel text-success';
    }
    return 'fas fa-file text-muted';
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onSubmit(): void {
    if (this.composeForm.invalid || this.recipients.length === 0) {
      this.markFormGroupTouched();
      return;
    }

    this.sendMessage();
  }

  private sendMessage(): void {
    this.sending = true;

    const formValue = this.composeForm.value;
    const messageData: SendMessageRequest = {
      conversation_id: this.conversationId,
      subject: formValue.subject || undefined,
      content: formValue.content,
      priority: formValue.priority,
      recipients: this.recipients.map(r => ({ id: r.id, type: r.type })),
      attachments: this.attachments.map(a => a.file)
    };

    // Add parent message ID for replies
    if (this.mode === 'reply' && this.replyToMessage) {
      messageData.parent_message_id = this.replyToMessage.id;
    }

    this.messageService.sendMessage(messageData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (message) => {
          this.messageSent.emit(message);
          this.resetForm();
          // Show success message
          console.log('Mensaje enviado exitosamente');
          this.sending = false;
        },
        error: (error) => {
          console.error('Error al enviar mensaje:', error);
          this.sending = false;
        }
      });
  }

  onCancel(): void {
    this.cancel.emit();
    this.resetForm();
  }

  onSaveDraft(): void {
    // Implement save draft functionality
    console.log('Guardar borrador');
  }

  private resetForm(): void {
    this.composeForm.reset({
      priority: 'normal'
    });
    this.recipients = [];
    this.attachments = [];
    this.recipientSuggestions = [];
    this.showRecipientSuggestions = false;
  }

  private markFormGroupTouched(): void {
    Object.keys(this.composeForm.controls).forEach(key => {
      const control = this.composeForm.get(key);
      control?.markAsTouched();
    });
  }

  // Getters for template
  get contentLength(): number {
    return this.composeForm.get('content')?.value?.length || 0;
  }

  get isContentTooLong(): boolean {
    return this.contentLength > this.maxContentLength;
  }

  get canSend(): boolean {
    return this.composeForm.valid && 
           this.recipients.length > 0 && 
           !this.sending && 
           !this.isContentTooLong;
  }

  get recipientCount(): number {
    return this.recipients.reduce((total, recipient) => {
      return total + (recipient.type === 'department' ? (recipient.user_count || 1) : 1);
    }, 0);
  }

  getRecipientDisplayName(recipient: Recipient): string {
    if (recipient.type === 'department') {
      return `${recipient.name} (${recipient.user_count || 0} usuarios)`;
    }
    return recipient.name;
  }

  getRecipientIcon(recipient: Recipient): string {
    return recipient.type === 'user' ? 'fas fa-user' : 'fas fa-building';
  }
}