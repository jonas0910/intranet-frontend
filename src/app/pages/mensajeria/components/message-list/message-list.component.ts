import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { DataTableDirective } from 'angular-datatables';

@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  styleUrls: ['./message-list.component.scss']
})
export class MessageListComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild(DataTableDirective, { static: false })
  dtElement!: DataTableDirective;

  @Input() folder: string = 'inbox';
  @Input() messages: any[] = [];
  @Input() loading: boolean = false;
  
  @Output() messageSelect = new EventEmitter<any>();
  @Output() messageAction = new EventEmitter<{action: string, messages: any[]}>();
  @Output() refresh = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  dtOptions: DataTables.Settings = {};
  dtTrigger: Subject<any> = new Subject<any>();
  
  selectedMessages: any[] = [];
  selectAll: boolean = false;

  constructor() {}

  ngOnInit(): void {
    this.initializeDataTable();
  }

  ngAfterViewInit(): void {
    this.safeDtTriggerNext();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private safeDtTriggerNext(): void {
    if (this.dtTrigger && !this.dtTrigger.closed) this.dtTrigger.next(null);
  }

  private initializeDataTable(): void {
    this.dtOptions = {
      pagingType: 'full_numbers',
      pageLength: 25,
      processing: true,
      searching: true,
      ordering: true,
      order: [[3, 'desc']], // Order by date descending
      columnDefs: [
        { 
          targets: [0], // Checkbox column
          orderable: false,
          searchable: false,
          width: '30px'
        },
        { 
          targets: [1], // Priority column
          orderable: true,
          searchable: false,
          width: '40px'
        },
        { 
          targets: [2], // Sender column
          orderable: true,
          searchable: true,
          width: '200px'
        },
        { 
          targets: [3], // Subject column
          orderable: true,
          searchable: true
        },
        { 
          targets: [4], // Date column
          orderable: true,
          searchable: false,
          width: '150px'
        },
        { 
          targets: [5], // Actions column
          orderable: false,
          searchable: false,
          width: '100px'
        }
      ],
      language: {
        url: '//cdn.datatables.net/plug-ins/1.13.4/i18n/es-ES.json'
      },
      responsive: true,
      dom: '<"row"<"col-sm-12 col-md-6"l><"col-sm-12 col-md-6"f>>' +
           '<"row"<"col-sm-12"tr>>' +
           '<"row"<"col-sm-12 col-md-5"i><"col-sm-12 col-md-7"p>>'
    };
  }

  onSelectAll(): void {
    this.selectAll = !this.selectAll;
    
    if (this.selectAll) {
      this.selectedMessages = [...this.messages];
    } else {
      this.selectedMessages = [];
    }
  }

  onSelectMessage(message: any): void {
    const index = this.selectedMessages.findIndex(m => m.id === message.id);
    
    if (index > -1) {
      this.selectedMessages.splice(index, 1);
    } else {
      this.selectedMessages.push(message);
    }
    
    this.selectAll = this.selectedMessages.length === this.messages.length;
  }

  isSelected(message: any): boolean {
    return this.selectedMessages.some(m => m.id === message.id);
  }

  onMessageClick(message: any): void {
    this.messageSelect.emit(message);
  }

  onMarkAsRead(): void {
    if (this.selectedMessages.length > 0) {
      this.messageAction.emit({
        action: 'mark_read',
        messages: this.selectedMessages
      });
    }
  }

  onMarkAsUnread(): void {
    if (this.selectedMessages.length > 0) {
      this.messageAction.emit({
        action: 'mark_unread',
        messages: this.selectedMessages
      });
    }
  }

  onMoveToFolder(folder: string): void {
    if (this.selectedMessages.length > 0) {
      this.messageAction.emit({
        action: 'move_to_folder',
        messages: this.selectedMessages,
        folder: folder
      });
    }
  }

  onDeleteMessages(): void {
    if (this.selectedMessages.length > 0) {
      this.messageAction.emit({
        action: 'delete',
        messages: this.selectedMessages
      });
    }
  }

  onRefresh(): void {
    this.refresh.emit();
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

  getPriorityTitle(priority: string): string {
    switch (priority) {
      case 'urgent':
        return 'Urgente';
      case 'high':
        return 'Alta';
      case 'normal':
        return 'Normal';
      default:
        return '';
    }
  }

  getMessageTypeIcon(messageType: string): string {
    switch (messageType) {
      case 'broadcast':
        return 'fas fa-bullhorn text-info';
      case 'system':
        return 'fas fa-cog text-secondary';
      default:
        return 'fas fa-envelope';
    }
  }

  formatDate(date: string): string {
    const messageDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - messageDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return messageDate.toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffDays <= 7) {
      return messageDate.toLocaleDateString('es-ES', { 
        weekday: 'short' 
      });
    } else {
      return messageDate.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  }

  rerender(): void {
    this.dtElement.dtInstance.then((dtInstance: DataTables.Api) => {
      dtInstance.destroy();
      this.safeDtTriggerNext();
    });
  }
}