import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { AttachmentService } from '../../services/attachment.service';
import { Message } from '../../models/message.model';
import { Attachment } from '../../models/attachment.model';
import { Recipient } from '../../models/recipient.model';

@Component({
  selector: 'app-message-detail',
  templateUrl: './message-detail.component.html',
  styleUrls: ['./message-detail.component.scss']
})
export class MessageDetailComponent implements OnInit, OnDestroy {
  @Input() messageId?: number;
  @Input() message?: Message;
  @Input() showNavigation = true;
  @Input() showActions = true;
  @Output() reply = new EventEmitter<Message>();
  @Output() forward = new EventEmitter<Message>();
  @Output() delete = new EventEmitter<Message>();
  @Output() close = new EventEmitter<void>();
  @Output() navigate = new EventEmitter<'prev' | 'next'>();

  private destroy$ = new Subject<void>();
  
  currentMessage?: Message;
  loading = false;
  markingAsRead = false;
  downloadingAttachment = false;
  
  // Navigation
  hasPrevious = false;
  hasNext = false;
  
  // UI State
  showFullHeaders = false;
  expandedAttachments: Set<number> = new Set();

  constructor(
    private messageService: MessageService,
    private attachmentService: AttachmentService
  ) {}

  ngOnInit(): void {
    if (this.message) {
      this.currentMessage = this.message;
      this.markAsReadIfNeeded();
    } else if (this.messageId) {
      this.loadMessage();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadMessage(): void {
    if (!this.messageId) return;
    
    this.loading = true;
    this.messageService.getMessage(this.messageId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.currentMessage = response.data;
            this.markAsReadIfNeeded();
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading message:', error);
        }
      });
  }

  private markAsReadIfNeeded(): void {
    if (!this.currentMessage || this.currentMessage.is_read) {
      return;
    }

    this.markingAsRead = true;
    this.messageService.markAsRead(this.currentMessage.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.markingAsRead = false;
          if (response.success && this.currentMessage) {
            this.currentMessage.is_read = true;
            this.currentMessage.read_at = new Date().toISOString();
          }
        },
        error: (error) => {
          this.markingAsRead = false;
          console.error('Error marking message as read:', error);
        }
      });
  }

  onReply(): void {
    if (this.currentMessage) {
      this.reply.emit(this.currentMessage);
    }
  }

  onReplyAll(): void {
    if (this.currentMessage) {
      // Create a copy with all recipients
      const messageWithAllRecipients = {
        ...this.currentMessage,
        reply_all: true
      };
      this.reply.emit(messageWithAllRecipients);
    }
  }

  onForward(): void {
    if (this.currentMessage) {
      this.forward.emit(this.currentMessage);
    }
  }

  onDelete(): void {
    if (this.currentMessage) {
      this.delete.emit(this.currentMessage);
    }
  }

  onMarkAsUnread(): void {
    if (!this.currentMessage) return;

    this.messageService.markAsUnread(this.currentMessage.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && this.currentMessage) {
            this.currentMessage.is_read = false;
            this.currentMessage.read_at = null;
          }
        },
        error: (error) => {
          console.error('Error marking message as unread:', error);
        }
      });
  }

  onToggleImportant(): void {
    if (!this.currentMessage) return;

    const action = this.currentMessage.is_important ? 'unmarkImportant' : 'markImportant';
    this.messageService[action](this.currentMessage.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success && this.currentMessage) {
            this.currentMessage.is_important = !this.currentMessage.is_important;
          }
        },
        error: (error) => {
          console.error('Error toggling important status:', error);
        }
      });
  }

  onDownloadAttachment(attachment: Attachment): void {
    this.downloadingAttachment = true;
    
    this.attachmentService.downloadAttachment(attachment.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          this.downloadingAttachment = false;
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = attachment.original_name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
        },
        error: (error) => {
          this.downloadingAttachment = false;
          console.error('Error downloading attachment:', error);
        }
      });
  }

  onPreviewAttachment(attachment: Attachment): void {
    if (this.isPreviewable(attachment)) {
      this.attachmentService.getAttachmentUrl(attachment.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            if (response.success) {
              window.open(response.data.url, '_blank');
            }
          },
          error: (error) => {
            console.error('Error getting attachment preview:', error);
          }
        });
    }
  }

  onToggleAttachmentExpansion(attachmentId: number): void {
    if (this.expandedAttachments.has(attachmentId)) {
      this.expandedAttachments.delete(attachmentId);
    } else {
      this.expandedAttachments.add(attachmentId);
    }
  }

  onNavigate(direction: 'prev' | 'next'): void {
    this.navigate.emit(direction);
  }

  onClose(): void {
    this.close.emit();
  }

  toggleFullHeaders(): void {
    this.showFullHeaders = !this.showFullHeaders;
  }

  // Helper methods
  isPreviewable(attachment: Attachment): boolean {
    const previewableTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'text/plain', 'text/html'
    ];
    return previewableTypes.includes(attachment.mime_type);
  }

  isImage(attachment: Attachment): boolean {
    return attachment.mime_type.startsWith('image/');
  }

  isPdf(attachment: Attachment): boolean {
    return attachment.mime_type === 'application/pdf';
  }

  isDocument(attachment: Attachment): boolean {
    const documentTypes = [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ];
    return documentTypes.includes(attachment.mime_type);
  }

  getAttachmentIcon(attachment: Attachment): string {
    if (this.isImage(attachment)) {
      return 'fas fa-image';
    } else if (this.isPdf(attachment)) {
      return 'fas fa-file-pdf';
    } else if (this.isDocument(attachment)) {
      return 'fas fa-file-word';
    } else if (attachment.mime_type.startsWith('text/')) {
      return 'fas fa-file-alt';
    } else {
      return 'fas fa-file';
    }
  }

  getAttachmentColor(attachment: Attachment): string {
    if (this.isImage(attachment)) {
      return 'text-success';
    } else if (this.isPdf(attachment)) {
      return 'text-danger';
    } else if (this.isDocument(attachment)) {
      return 'text-primary';
    } else {
      return 'text-muted';
    }
  }

  getPriorityIcon(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'fas fa-exclamation-triangle text-danger';
      case 'high':
        return 'fas fa-exclamation text-warning';
      default:
        return '';
    }
  }

  getPriorityLabel(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'normal':
        return 'Normal';
      default:
        return 'Normal';
    }
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Hoy ' + date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays === 2) {
      return 'Ayer ' + date.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays <= 7) {
      return date.toLocaleDateString('es-ES', { 
        weekday: 'long',
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  getRecipientsList(recipients: Recipient[]): string {
    if (!recipients || recipients.length === 0) {
      return '';
    }
    
    if (recipients.length <= 3) {
      return recipients.map(r => r.name).join(', ');
    } else {
      const first = recipients.slice(0, 2).map(r => r.name).join(', ');
      return `${first} y ${recipients.length - 2} más`;
    }
  }

  isAttachmentExpanded(attachmentId: number): boolean {
    return this.expandedAttachments.has(attachmentId);
  }

  // Getters for template
  get hasAttachments(): boolean {
    return this.currentMessage?.attachments && this.currentMessage.attachments.length > 0;
  }

  get canReply(): boolean {
    return this.showActions && !!this.currentMessage;
  }

  get canForward(): boolean {
    return this.showActions && !!this.currentMessage;
  }

  get canDelete(): boolean {
    return this.showActions && !!this.currentMessage;
  }

  get isUnread(): boolean {
    return this.currentMessage ? !this.currentMessage.is_read : false;
  }

  get isImportant(): boolean {
    return this.currentMessage ? this.currentMessage.is_important : false;
  }
}