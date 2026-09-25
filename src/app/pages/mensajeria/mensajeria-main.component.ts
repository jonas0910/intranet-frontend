import { Component, OnInit, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { MessageService } from './services/message.service';
import { MenuIntegrationService } from './services/menu-integration.service';
import { WebSocketService } from './services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { RealTimeNotificationsComponent } from './components/real-time-notifications/real-time-notifications.component';
import { StartConversationComponent } from './components/start-conversation/start-conversation.component';

@Component({
  selector: 'app-mensajeria-main',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    RealTimeNotificationsComponent,
    StartConversationComponent
  ],
  templateUrl: './mensajeria-main.component.html',
  styleUrls: ['./mensajeria-main.component.scss']
})
export class MensajeriaMainComponent implements OnInit, OnDestroy {
  @ViewChild(StartConversationComponent) startConversationComponent!: StartConversationComponent;

  private destroy$ = new Subject<void>();

  folderStats: any = {
    inbox: { total: 0, unread: 0 },
    sent: { total: 0, unread: 0 },
    drafts: { total: 0, unread: 0 },
    important: { total: 0, unread: 0 },
    conversations: { total: 0, unread: 0 },
    trash: { total: 0, unread: 0 }
  };

  showStartConversation = false;
  currentUserId: number = 1; // Will be set from auth service
  
  // Facebook-style menu sections state
  sections = {
    chat: true,
    comunicados: false,
    contacts: true,
    config: false,
    more: false
  };
  
  contactRequests = 2; // Placeholder - should come from backend
  comunicadosCount = 5; // Placeholder - should come from backend

  // Computed properties for AdminLTE template
  get totalMessagesCount(): number {
    return Object.values(this.folderStats).reduce((total: number, folder: any) => total + (folder.total || 0), 0);
  }

  get totalUnreadCount(): number {
    return Object.values(this.folderStats).reduce((total: number, folder: any) => total + (folder.unread || 0), 0);
  }

  loading = false;

  constructor(
    private messageService: MessageService,
    private menuIntegrationService: MenuIntegrationService,
    private webSocketService: WebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('Mensajería Main Component initialized');

    // Get current user ID from auth service
    const currentUser = this.authService.getCurrentUser();
    if (currentUser && currentUser.id) {
      this.currentUserId = currentUser.id;
      console.log('👤 Usuario actual en mensajería:', this.currentUserId);
    }

    this.loadFolderStats();

    // Note: WebSocket connection is now managed by AppLayoutComponent
    // This component will reuse the existing connection
    console.log('🔌 WebSocket ya debe estar conectado desde el layout principal');
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFolderStats(): void {
    this.loading = true;

    // Get folder statistics from menu integration service
    this.menuIntegrationService.getMenuStats$()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (menuStats) => {
          this.folderStats = {
            inbox: { total: menuStats.totalMessages || 0, unread: menuStats.unreadMessages || 0 },
            sent: { total: 0, unread: 0 },
            drafts: { total: menuStats.draftMessages || 0, unread: 0 },
            important: { total: menuStats.importantMessages || 0, unread: 0 },
            conversations: { total: menuStats.totalConversations || 0, unread: menuStats.unreadConversations || 0 },
            trash: { total: 0, unread: 0 }
          };
          this.loading = false;
        },
        error: (err) => {
          console.error('Error loading folder stats:', err);
          this.loading = false;
        }
      });
  }

  openStartConversation(): void {
    console.log('📝 Abriendo diálogo de iniciar conversación');
    this.showStartConversation = true;

    // Usar setTimeout para asegurar que el componente se ha renderizado
    setTimeout(() => {
      if (this.startConversationComponent) {
        this.startConversationComponent.open();
      }
    }, 100);
  }

  onConversationStarted(data: { users: any[]; canalId: number }): void {
    console.log('💬 Conversation started with:', data);

    if (data.users.length === 0) {
      console.warn('No users selected for conversation');
      return;
    }

    // Crear conversación a través del servicio
    const recipientIds = data.users.map(u => u.id);

    this.messageService.createConversation({
      title: data.users.length === 1
        ? `Conversación con ${data.users[0].name}`
        : `Grupo con ${data.users.map(u => u.name).join(', ')}`,
      type: data.users.length === 1 ? 'individual' : 'group',
      participant_ids: recipientIds
    }).subscribe({
      next: (response) => {
        console.log('✅ Conversación creada:', response);

        // Navegar a la conversación
        if (response.data && response.data.id) {
          this.router.navigate(['/mensajeria/conversations', response.data.id]);
        }

        this.showStartConversation = false;
      },
      error: (error) => {
        console.error('❌ Error creando conversación:', error);
        alert('Error al crear la conversación. Por favor intenta de nuevo.');
      }
    });
  }
  
  /**
   * Toggle menu section collapse/expand
   */
  toggleSection(section: keyof typeof this.sections): void {
    this.sections[section] = !this.sections[section];
    console.log(`📂 Section ${section} ${this.sections[section] ? 'expanded' : 'collapsed'}`);
  }
}