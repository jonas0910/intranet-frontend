import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MensajeriaService } from '../../../pages/mensajeria/services/mensajeria.service';
import { ChatSidebarService } from '../chat-sidebar.service';
import { AuthService } from '../../../services/auth.service';
import { NewChatModalComponent } from '../new-chat-modal/new-chat-modal.component';

@Component({
  selector: 'app-control-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, NewChatModalComponent],
  templateUrl: './control-sidebar.component.html',
  styleUrl: './control-sidebar.component.scss'
})
export class ControlSidebarComponent implements OnInit, OnDestroy {
  private mensajeriaService = inject(MensajeriaService);
  private chatSidebarService = inject(ChatSidebarService);
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  conversaciones: any[] = [];
  cargando = false;
  usuarioActual: any = null;
  isOpen = false;
  busquedaConv = '';
  onlineUsers = new Set<number>();
  isOnlineHidden = false;
  mostrarModalNueva = false;


  get convsFiltradas(): any[] {
    if (!this.busquedaConv.trim()) return this.conversaciones;
    const q = this.busquedaConv.toLowerCase();
    return this.conversaciones.filter(c =>
      this.getDisplayName(c).toLowerCase().includes(q)
    );
  }

  ngOnInit(): void {
    this.usuarioActual = this.authService.getCurrentUser();
    
    this.chatSidebarService.sidebarOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        this.isOpen = open;
        if (open && this.conversaciones.length === 0) {
          this.cargarConversaciones();
        }
        this.cdr.detectChanges();
      });

    // Suscribirse a actualizaciones de mensajes vía WS
    this.mensajeriaService.wsMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(msg => {
        if (msg.event === 'message.received') {
          this.actualizarConversacionLocal(msg.data);
        }
      });

    this.mensajeriaService.onlineUsers
      .pipe(takeUntil(this.destroy$))
      .subscribe(users => {
        this.onlineUsers = users;
        this.cdr.detectChanges();
      });

    this.mensajeriaService.isOnlineHidden
      .pipe(takeUntil(this.destroy$))
      .subscribe(hidden => {
        this.isOnlineHidden = hidden;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  cargarConversaciones(): void {
    this.cargando = true;
    this.mensajeriaService.getConversaciones()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.conversaciones = res.data?.data ?? res.data ?? [];
          this.cargando = false;
          this.notificarContadorUnread();
          this.actualizarPresenceInicial();
          this.cdr.detectChanges();
        },
        error: () => {
          this.cargando = false;
          this.cdr.detectChanges();
        }
      });
  }

  openChat(conv: any): void {
    conv.unread_count = 0; // Desaparece el número rojo inmediatamente
    this.chatSidebarService.openChat(conv);
    
    // Marcar como leída en el backend también
    this.mensajeriaService.marcarConversacionLeida(conv.id).subscribe();

    if (window.innerWidth < 768) {
      this.chatSidebarService.setSidebarOpen(false);
    }
    this.cdr.detectChanges();
  }

  actualizarConversacionLocal(data: any): void {
    if (!data) return;
    const msg = data.message ?? data;
    const convId = msg.conversation_id || data.conversation?.id;
    if (!convId) return;

    const index = this.conversaciones.findIndex(c => c.id === convId);
    if (index !== -1) {
      const conv = this.conversaciones[index];
      conv.last_message = msg;
      conv.updated_at = msg.created_at;

      // Incrementar contador si el mensaje es de otro
      if (+msg.sender_id !== +this.usuarioActual?.id) {
        // Solo incrementamos si no es la conversación que estamos visualizando actualmente
        // O simplemente incrementamos y que el componente MiniChatBox al abrirse lo limpie.
        // Pero para la lista lateral, si llega un mensaje, aumentamos el badge.
        conv.unread_count = (conv.unread_count || 0) + 1;
      }

      // Mover al principio de la lista
      this.conversaciones.splice(index, 1);
      this.conversaciones.unshift(conv);
    } else {
      // Si es una conversación nueva que no está en la lista, recargamos
      this.cargarConversaciones();
    }
    this.notificarContadorUnread();
    this.cdr.detectChanges();
  }

  notificarContadorUnread(): void {
    const totalUnreadConvs = this.conversaciones.filter(c => (c.unread_count || 0) > 0).length;
    this.mensajeriaService.unreadCount$.next(totalUnreadConvs);
  }

  getDisplayName(conv: any): string {
    if (conv.display_title) return conv.display_title;
    if (conv.conversation_type === 'individual') {
      const otro = (conv.active_participants || conv.participants)
        ?.find((p: any) => (p.id ?? p.user_id) !== this.usuarioActual?.id);
      return otro?.name || conv.title || 'Conversación';
    }
    return conv.title || 'Grupo';
  }

  private actualizarPresenceInicial(): void {
    const online = this.mensajeriaService.onlineUsers.value;
    this.conversaciones.forEach(c => {
      const participants = c.active_participants || c.participants || [];
      participants.forEach((p: any) => {
        if (p.is_online) online.add(+p.id);
      });
    });
    this.mensajeriaService.onlineUsers.next(new Set(online));
  }

  getAvatar(conv: any): string {
    return (this.getDisplayName(conv).charAt(0) || '?').toUpperCase();
  }

  formatFecha(fecha: string): string {
    if (!fecha) return '';
    const d = new Date(fecha);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' });
    }
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
  }

  getOtroUserId(conv: any): number {
    if (conv.conversation_type !== 'individual') return -1;
    const otro = (conv.active_participants || conv.participants)
      ?.find((p: any) => (p.id ?? p.user_id) !== this.usuarioActual?.id);
    return (otro?.id ?? otro?.user_id) || -1;
  }

  isOnline(userId: number): boolean {
    return this.onlineUsers.has(userId);
  }

  togglePrivacyMode(): void {
    const newValue = !this.isOnlineHidden;
    this.mensajeriaService.updateMessagingPreferences(newValue).subscribe();
  }

  closeSidebar(): void {
    this.chatSidebarService.setSidebarOpen(false);
  }

  onChatCreated(conv: any): void {
    const existe = this.conversaciones.find(c => c.id === conv.id);
    if (!existe) {
      this.conversaciones.unshift(conv);
    }
    this.openChat(conv);
    this.cdr.detectChanges();
  }
}
