import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

interface Message {
  id: number;
  sender: string;
  subject: string;
  preview: string;
  date: Date;
  isRead: boolean;
  isImportant: boolean;
  hasAttachments: boolean;
}

@Component({
  selector: 'app-inbox',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="content-wrapper">
      <div class="content-header">
        <div class="container-fluid">
          <div class="row mb-2">
            <div class="col-sm-6">
              <h1 class="m-0">
                <i class="fas fa-inbox mr-2"></i>
                Bandeja de Entrada
              </h1>
            </div>
            <div class="col-sm-6">
              <ol class="breadcrumb float-sm-right">
                <li class="breadcrumb-item"><a routerLink="/dashboard">Inicio</a></li>
                <li class="breadcrumb-item"><a routerLink="/mensajeria">Mensajería</a></li>
                <li class="breadcrumb-item active">Bandeja de Entrada</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      <section class="content">
        <div class="container-fluid">
          <div class="row">
            <div class="col-12">
              <!-- Toolbar -->
              <div class="card">
                <div class="card-header">
                  <div class="row">
                    <div class="col-md-6">
                      <div class="btn-group">
                        <button class="btn btn-primary btn-sm" (click)="refreshMessages()">
                          <i class="fas fa-sync-alt mr-1"></i> Actualizar
                        </button>
                        <button class="btn btn-outline-secondary btn-sm" (click)="markAllAsRead()" [disabled]="selectedMessages.length === 0">
                          <i class="fas fa-envelope-open mr-1"></i> Marcar como leído
                        </button>
                        <button class="btn btn-outline-danger btn-sm" (click)="deleteSelected()" [disabled]="selectedMessages.length === 0">
                          <i class="fas fa-trash mr-1"></i> Eliminar
                        </button>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="input-group input-group-sm">
                        <input type="text" class="form-control" placeholder="Buscar mensajes..." 
                               [(ngModel)]="searchTerm" (input)="filterMessages()">
                        <div class="input-group-append">
                          <button class="btn btn-outline-secondary" type="button">
                            <i class="fas fa-search"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Messages List -->
              <div class="card">
                <div class="card-header">
                  <h3 class="card-title">
                    <input type="checkbox" (change)="toggleSelectAll($event)" class="mr-2">
                    Mensajes ({{ filteredMessages.length }})
                  </h3>
                  <div class="card-tools">
                    <span class="badge badge-primary">{{ unreadCount }} sin leer</span>
                  </div>
                </div>
                <div class="card-body p-0">
                  <div *ngIf="loading" class="text-center p-4">
                    <i class="fas fa-spinner fa-spin fa-2x"></i>
                    <p class="mt-2">Cargando mensajes...</p>
                  </div>

                  <div *ngIf="!loading && filteredMessages.length === 0" class="text-center p-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">No hay mensajes en tu bandeja de entrada</p>
                  </div>

                  <div *ngIf="!loading && filteredMessages.length > 0" class="table-responsive">
                    <table class="table table-hover">
                      <tbody>
                        <tr *ngFor="let message of filteredMessages" 
                            [class.table-active]="selectedMessages.includes(message.id)"
                            [class.font-weight-bold]="!message.isRead"
                            (click)="selectMessage(message)">
                          <td style="width: 40px;">
                            <input type="checkbox" 
                                   [checked]="selectedMessages.includes(message.id)"
                                   (change)="toggleMessageSelection(message.id, $event)"
                                   (click)="$event.stopPropagation()">
                          </td>
                          <td style="width: 40px;">
                            <i *ngIf="message.isImportant" class="fas fa-star text-warning"></i>
                            <i *ngIf="!message.isImportant" class="far fa-star text-muted" 
                               (click)="toggleImportant(message.id); $event.stopPropagation()"></i>
                          </td>
                          <td style="width: 40px;">
                            <i *ngIf="message.hasAttachments" class="fas fa-paperclip text-muted"></i>
                          </td>
                          <td style="width: 200px;" class="text-truncate">
                            <strong>{{ message.sender }}</strong>
                          </td>
                          <td class="text-truncate">
                            <span [class.font-weight-bold]="!message.isRead">{{ message.subject }}</span>
                            <span class="text-muted ml-2">- {{ message.preview }}</span>
                          </td>
                          <td style="width: 120px;" class="text-right text-muted">
                            {{ formatDate(message.date) }}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .content-wrapper {
      .table tbody tr {
        cursor: pointer;
        
        &:hover {
          background-color: #f8f9fa;
        }
        
        &.table-active {
          background-color: #e3f2fd;
        }
      }
      
      .text-truncate {
        max-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      
      .fa-star {
        cursor: pointer;
        
        &:hover {
          color: #ffc107 !important;
        }
      }
    }
  `]
})
export class InboxComponent implements OnInit {
  messages: Message[] = [];
  filteredMessages: Message[] = [];
  selectedMessages: number[] = [];
  searchTerm: string = '';
  loading: boolean = false;
  unreadCount: number = 0;

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    this.loading = true;
    
    // Simular carga de mensajes
    setTimeout(() => {
      this.messages = [
        {
          id: 1,
          sender: 'María García',
          subject: 'Reunión de equipo - Viernes 10:00 AM',
          preview: 'Hola, quería confirmar la reunión de equipo programada para este viernes...',
          date: new Date(2024, 11, 15, 9, 30),
          isRead: false,
          isImportant: true,
          hasAttachments: false
        },
        {
          id: 2,
          sender: 'Carlos López',
          subject: 'Informe mensual completado',
          preview: 'Te envío el informe mensual que solicitaste. Por favor revísalo y...',
          date: new Date(2024, 11, 14, 16, 45),
          isRead: true,
          isImportant: false,
          hasAttachments: true
        },
        {
          id: 3,
          sender: 'Ana Martínez',
          subject: 'Actualización del sistema',
          preview: 'El sistema será actualizado el próximo martes. Durante la actualización...',
          date: new Date(2024, 11, 13, 11, 20),
          isRead: false,
          isImportant: false,
          hasAttachments: false
        },
        {
          id: 4,
          sender: 'Roberto Silva',
          subject: 'Documentos pendientes',
          preview: 'Tienes algunos documentos pendientes de revisión en tu bandeja...',
          date: new Date(2024, 11, 12, 14, 15),
          isRead: true,
          isImportant: false,
          hasAttachments: true
        }
      ];
      
      this.filteredMessages = [...this.messages];
      this.updateUnreadCount();
      this.loading = false;
    }, 1000);
  }

  refreshMessages(): void {
    this.loadMessages();
  }

  filterMessages(): void {
    if (!this.searchTerm.trim()) {
      this.filteredMessages = [...this.messages];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredMessages = this.messages.filter(message =>
        message.sender.toLowerCase().includes(term) ||
        message.subject.toLowerCase().includes(term) ||
        message.preview.toLowerCase().includes(term)
      );
    }
  }

  selectMessage(message: Message): void {
    console.log('Abrir mensaje:', message);
    // Aquí se abriría el detalle del mensaje
    if (!message.isRead) {
      message.isRead = true;
      this.updateUnreadCount();
    }
  }

  toggleMessageSelection(messageId: number, event: any): void {
    if (event.target.checked) {
      this.selectedMessages.push(messageId);
    } else {
      this.selectedMessages = this.selectedMessages.filter(id => id !== messageId);
    }
  }

  toggleSelectAll(event: any): void {
    if (event.target.checked) {
      this.selectedMessages = this.filteredMessages.map(m => m.id);
    } else {
      this.selectedMessages = [];
    }
  }

  toggleImportant(messageId: number): void {
    const message = this.messages.find(m => m.id === messageId);
    if (message) {
      message.isImportant = !message.isImportant;
    }
  }

  markAllAsRead(): void {
    this.selectedMessages.forEach(id => {
      const message = this.messages.find(m => m.id === id);
      if (message) {
        message.isRead = true;
      }
    });
    this.updateUnreadCount();
    this.selectedMessages = [];
  }

  deleteSelected(): void {
    if (confirm(`¿Estás seguro de que quieres eliminar ${this.selectedMessages.length} mensaje(s)?`)) {
      this.messages = this.messages.filter(m => !this.selectedMessages.includes(m.id));
      this.filterMessages();
      this.updateUnreadCount();
      this.selectedMessages = [];
    }
  }

  formatDate(date: Date): string {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return 'Hoy';
    } else if (diffDays === 2) {
      return 'Ayer';
    } else if (diffDays <= 7) {
      return `${diffDays - 1} días`;
    } else {
      return date.toLocaleDateString('es-ES', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  }

  private updateUnreadCount(): void {
    this.unreadCount = this.messages.filter(m => !m.isRead).length;
  }
}