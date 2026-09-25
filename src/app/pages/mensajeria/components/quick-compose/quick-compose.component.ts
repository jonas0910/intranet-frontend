import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { MessageService } from '../../services/message.service';
import { UserService } from '../../services/user.service';

export interface QuickComposeData {
  recipients: string[];
  subject: string;
  content: string;
  priority: string;
}

@Component({
  selector: 'app-quick-compose',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="quick-compose" [class.expanded]="isExpanded">
      <!-- Header -->
      <div class="compose-header">
        <div class="d-flex justify-content-between align-items-center">
          <h6 class="mb-0">
            <i class="fas fa-edit mr-2"></i>
            Redactar Mensaje
          </h6>
          <div class="compose-actions">
            <button 
              type="button"
              class="btn btn-sm btn-outline-secondary mr-1"
              (click)="toggleExpanded()"
              [title]="isExpanded ? 'Minimizar' : 'Expandir'">
              <i class="fas" [class.fa-compress]="isExpanded" [class.fa-expand]="!isExpanded"></i>
            </button>
            <button 
              type="button"
              class="btn btn-sm btn-outline-secondary"
              (click)="close()"
              title="Cerrar">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <!-- Form -->
      <form [formGroup]="composeForm" (ngSubmit)="onSubmit()" class="compose-form">
        <!-- Recipients -->
        <div class="form-group">
          <label for="recipients">Para:</label>
          <div class="recipients-container">
            <div class="recipient-tags" *ngIf="selectedRecipients.length > 0">
              <span 
                class="recipient-tag"
                *ngFor="let recipient of selectedRecipients; let i = index">
                {{ recipient.name }}
                <button 
                  type="button"
                  class="btn-remove"
                  (click)="removeRecipient(i)">
                  <i class="fas fa-times"></i>
                </button>
              </span>
            </div>
            <input 
              type="text"
              id="recipients"
              formControlName="recipientsInput"
              class="form-control"
              placeholder="Escribir nombre o email..."
              (keydown)="onRecipientsKeydown($event)"
              autocomplete="off">
          </div>
          
          <!-- Recipients suggestions -->
          <div class="suggestions" *ngIf="showSuggestions && filteredUsers.length > 0">
            <div 
              class="suggestion-item"
              *ngFor="let user of filteredUsers"
              (click)="selectUser(user)">
              <div class="user-avatar">
                <i class="fas fa-user"></i>
              </div>
              <div class="user-info">
                <div class="user-name">{{ user.name }}</div>
                <div class="user-email">{{ user.email }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Subject -->
        <div class="form-group" *ngIf="isExpanded">
          <label for="subject">Asunto:</label>
          <input 
            type="text"
            id="subject"
            formControlName="subject"
            class="form-control"
            placeholder="Asunto del mensaje...">
        </div>

        <!-- Priority -->
        <div class="form-group" *ngIf="isExpanded">
          <label for="priority">Prioridad:</label>
          <select id="priority" formControlName="priority" class="form-control">
            <option value="normal">Normal</option>
            <option value="high">Alta</option>
            <option value="urgent">Urgente</option>
          </select>
        </div>

        <!-- Content -->
        <div class="form-group">
          <label for="content">Mensaje:</label>
          <textarea 
            id="content"
            formControlName="content"
            class="form-control"
            rows="3"
            placeholder="Escribir mensaje..."
            [rows]="isExpanded ? 6 : 3"></textarea>
        </div>

        <!-- Actions -->
        <div class="form-actions">
          <button 
            type="button"
            class="btn btn-secondary mr-2"
            (click)="saveDraft()"
            [disabled]="loading">
            <i class="fas fa-save mr-1"></i>
            Guardar Borrador
          </button>
          <button 
            type="submit"
            class="btn btn-primary"
            [disabled]="!composeForm.valid || loading">
            <i class="fas fa-paper-plane mr-1" *ngIf="!loading"></i>
            <i class="fas fa-spinner fa-spin mr-1" *ngIf="loading"></i>
            Enviar
          </button>
        </div>
      </form>
    </div>
  `,
  styleUrls: ['./quick-compose.component.scss']
})
export class QuickComposeComponent implements OnInit, OnDestroy {
  @Output() messageSent = new EventEmitter<QuickComposeData>();
  @Output() closeEvent = new EventEmitter<void>();

  private destroy$ = new Subject<void>();
  
  composeForm: FormGroup;
  isExpanded = false;
  loading = false;
  selectedRecipients: any[] = [];
  filteredUsers: any[] = [];
  showSuggestions = false;
  allUsers: any[] = [];

  constructor(
    private fb: FormBuilder,
    private messageService: MessageService,
    private userService: UserService
  ) {
    this.composeForm = this.fb.group({
      recipientsInput: [''],
      subject: [''],
      content: ['', Validators.required],
      priority: ['normal']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.setupFormSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFormSubscriptions(): void {
    // Watch recipients input for autocomplete
    this.composeForm.get('recipientsInput')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        if (value && value.length > 0) {
          this.filterUsers(value);
          this.showSuggestions = true;
        } else {
          this.showSuggestions = false;
          this.filteredUsers = [];
        }
      });
  }

  private loadUsers(): void {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users) => {
          this.allUsers = users;
        },
        error: (error) => {
          console.error('Error loading users:', error);
          this.allUsers = [];
        }
      });
  }

  private filterUsers(query: string): void {
    const lowerQuery = query.toLowerCase();
    this.filteredUsers = this.allUsers.filter(user => 
      !this.selectedRecipients.some(selected => selected.id === user.id) &&
      (user.name.toLowerCase().includes(lowerQuery) || 
       user.email.toLowerCase().includes(lowerQuery))
    ).slice(0, 5); // Limit to 5 suggestions
  }

  selectUser(user: any): void {
    this.selectedRecipients.push(user);
    this.composeForm.get('recipientsInput')?.setValue('');
    this.showSuggestions = false;
    this.filteredUsers = [];
  }

  removeRecipient(index: number): void {
    this.selectedRecipients.splice(index, 1);
  }

  onRecipientsKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (this.filteredUsers.length > 0) {
        this.selectUser(this.filteredUsers[0]);
      }
    } else if (event.key === 'Escape') {
      this.showSuggestions = false;
    }
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
  }

  close(): void {
    this.closeEvent.emit();
  }

  saveDraft(): void {
    if (this.composeForm.get('content')?.value) {
      this.loading = true;
      
      // TODO: Implement draft saving
      setTimeout(() => {
        this.loading = false;
        // Show success message
      }, 1000);
    }
  }

  onSubmit(): void {
    if (this.composeForm.valid && this.selectedRecipients.length > 0) {
      this.loading = true;
      
      const formData: QuickComposeData = {
        recipients: this.selectedRecipients.map(r => r.email),
        subject: this.composeForm.get('subject')?.value || '',
        content: this.composeForm.get('content')?.value,
        priority: this.composeForm.get('priority')?.value
      };

      this.messageService.sendMessage(formData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            this.loading = false;
            this.messageSent.emit(formData);
            this.resetForm();
            // Show success message
          },
          error: (error) => {
            this.loading = false;
            console.error('Error sending message:', error);
            // Show error message
          }
        });
    }
  }

  private resetForm(): void {
    this.composeForm.reset({
      recipientsInput: '',
      subject: '',
      content: '',
      priority: 'normal'
    });
    this.selectedRecipients = [];
    this.showSuggestions = false;
    this.filteredUsers = [];
  }
}



