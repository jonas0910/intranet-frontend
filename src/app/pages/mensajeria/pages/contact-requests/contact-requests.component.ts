import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { CustomEchoWebSocketService } from '../../../../services/custom-echo-websocket.service';
import { AuthService } from '../../../../services/auth.service';

export interface ContactRequest {
  id: number;
  sender_id: number;
  receiver_id: number;
  sender: {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    department?: string;
    position?: string;
  };
  receiver?: {
    id: number;
    name: string;
    email: string;
  };
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  message?: string;
  created_at: string;
  updated_at: string;
  responded_at?: string;
}

@Component({
  selector: 'app-contact-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contact-requests.component.html',
  styleUrls: ['./contact-requests.component.scss']
})
export class ContactRequestsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Tabs
  activeTab: 'received' | 'sent' = 'received';

  // Data
  receivedRequests: ContactRequest[] = [];
  sentRequests: ContactRequest[] = [];

  // UI State
  loading = false;
  processing = false;

  // Stats
  stats = {
    received: {
      pending: 0,
      total: 0
    },
    sent: {
      pending: 0,
      total: 0
    }
  };

  constructor(
    private messageService: MessageService,
    private echoService: CustomEchoWebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('👋 ContactRequestsComponent: Inicializando...');
    this.loadRequests();
    this.subscribeToWebSocket();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadRequests(): void {
    this.loading = true;
    this.loadReceivedRequests();
    this.loadSentRequests();
  }

  loadReceivedRequests(): void {
    this.messageService.getContactRequests('received')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📥 Solicitudes recibidas:', response);
          this.receivedRequests = response.data || this.getMockReceivedRequests();
          this.updateStats();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando solicitudes recibidas:', error);
          this.receivedRequests = this.getMockReceivedRequests();
          this.updateStats();
          this.loading = false;
        }
      });
  }

  loadSentRequests(): void {
    this.messageService.getContactRequests('sent')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📤 Solicitudes enviadas:', response);
          this.sentRequests = response.data || this.getMockSentRequests();
          this.updateStats();
        },
        error: (error) => {
          console.error('❌ Error cargando solicitudes enviadas:', error);
          this.sentRequests = this.getMockSentRequests();
          this.updateStats();
        }
      });
  }

  private getMockReceivedRequests(): ContactRequest[] {
    const now = Date.now();
    return [
      {
        id: 1,
        sender_id: 2,
        receiver_id: 1,
        sender: {
          id: 2,
          name: 'María García',
          email: 'maria@example.com',
          avatar: 'assets/img/user2-160x160.jpg',
          department: 'Recursos Humanos',
          position: 'Gerente de RRHH'
        },
        status: 'pending',
        message: 'Hola! Me gustaría agregarte para coordinar el proyecto de evaluación de desempeño.',
        created_at: new Date(now - 3600000).toISOString(),
        updated_at: new Date(now - 3600000).toISOString()
      },
      {
        id: 2,
        sender_id: 3,
        receiver_id: 1,
        sender: {
          id: 3,
          name: 'Carlos Rodríguez',
          email: 'carlos@example.com',
          avatar: 'assets/img/user3-128x128.jpg',
          department: 'IT',
          position: 'Desarrollador Senior'
        },
        status: 'pending',
        message: 'Hola! Trabajamos en proyectos similares, me gustaría conectar.',
        created_at: new Date(now - 7200000).toISOString(),
        updated_at: new Date(now - 7200000).toISOString()
      }
    ];
  }

  private getMockSentRequests(): ContactRequest[] {
    const now = Date.now();
    return [
      {
        id: 3,
        sender_id: 1,
        receiver_id: 4,
        sender: {
          id: 1,
          name: 'Yo',
          email: 'yo@example.com'
        },
        receiver: {
          id: 4,
          name: 'Ana López',
          email: 'ana@example.com'
        },
        status: 'pending',
        message: 'Hola Ana! Me gustaría agregarte como contacto.',
        created_at: new Date(now - 86400000).toISOString(),
        updated_at: new Date(now - 86400000).toISOString()
      }
    ];
  }

  private updateStats(): void {
    this.stats.received.total = this.receivedRequests.length;
    this.stats.received.pending = this.receivedRequests.filter(r => r.status === 'pending').length;
    this.stats.sent.total = this.sentRequests.length;
    this.stats.sent.pending = this.sentRequests.filter(r => r.status === 'pending').length;
  }

  private subscribeToWebSocket(): void {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) return;

    const userChannel = `user.${currentUser.id}`;

    // Listen for new contact requests
    this.echoService.listenToChannel(
      userChannel,
      'contact.request.received',
      (data: any) => {
        console.log('👋 Nueva solicitud de contacto recibida:', data);
        this.loadReceivedRequests();
      }
    );

    // Listen for request accepted
    this.echoService.listenToChannel(
      userChannel,
      'contact.request.accepted',
      (data: any) => {
        console.log('✅ Solicitud de contacto aceptada:', data);
        this.loadSentRequests();
      }
    );

    // Listen for request rejected
    this.echoService.listenToChannel(
      userChannel,
      'contact.request.rejected',
      (data: any) => {
        console.log('❌ Solicitud de contacto rechazada:', data);
        this.loadSentRequests();
      }
    );
  }

  // Actions
  acceptRequest(request: ContactRequest): void {
    if (this.processing) return;

    this.processing = true;
    this.messageService.acceptContactRequest(request.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Solicitud aceptada');
          alert(`¡Ahora eres contacto de ${request.sender.name}!`);
          this.loadReceivedRequests();
          this.processing = false;
        },
        error: (error) => {
          console.error('❌ Error aceptando solicitud:', error);
          alert('Error al aceptar la solicitud');
          this.processing = false;
        }
      });
  }

  rejectRequest(request: ContactRequest): void {
    if (this.processing) return;

    if (confirm(`¿Rechazar solicitud de ${request.sender.name}?`)) {
      this.processing = true;
      this.messageService.rejectContactRequest(request.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('❌ Solicitud rechazada');
            this.loadReceivedRequests();
            this.processing = false;
          },
          error: (error) => {
            console.error('❌ Error rechazando solicitud:', error);
            alert('Error al rechazar la solicitud');
            this.processing = false;
          }
        });
    }
  }

  cancelRequest(request: ContactRequest): void {
    if (this.processing) return;

    if (confirm(`¿Cancelar solicitud a ${request.receiver?.name}?`)) {
      this.processing = true;
      this.messageService.cancelContactRequest(request.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('🚫 Solicitud cancelada');
            this.loadSentRequests();
            this.processing = false;
          },
          error: (error) => {
            console.error('❌ Error cancelando solicitud:', error);
            alert('Error al cancelar la solicitud');
            this.processing = false;
          }
        });
    }
  }

  viewProfile(user: any): void {
    console.log('👤 Ver perfil de:', user.name);
    // TODO: Navigate to user profile
    alert('Funcionalidad de perfil en desarrollo');
  }

  startChat(request: ContactRequest): void {
    // Start chat with the sender
    this.messageService.createIndividualConversation(request.sender.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (conversation) => {
          this.router.navigate(['/mensajeria/chat'], {
            queryParams: {
              conversationId: conversation.id,
              contactId: request.sender.id
            }
          });
        },
        error: (error) => {
          console.error('❌ Error creando conversación:', error);
          alert('Error al iniciar chat');
        }
      });
  }

  setActiveTab(tab: 'received' | 'sent'): void {
    this.activeTab = tab;
  }

  getRequestBadgeClass(status: string): string {
    switch (status) {
      case 'pending': return 'badge-warning';
      case 'accepted': return 'badge-success';
      case 'rejected': return 'badge-danger';
      case 'cancelled': return 'badge-secondary';
      default: return 'badge-info';
    }
  }

  getRequestStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'accepted': return 'Aceptada';
      case 'rejected': return 'Rechazada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  }

  onImageError(event: any): void {
    event.target.src = 'assets/img/user-default.png';
  }
}









