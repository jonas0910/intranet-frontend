import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../../../services/auth.service';

export interface Channel {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  type: 'announcement' | 'discussion' | 'department' | 'project';
  is_public: boolean;
  subscriber_count: number;
  post_count: number;
  unread_count: number;
  is_subscribed: boolean;
  is_owner: boolean;
  can_post: boolean;
  latest_post?: {
    content: string;
    author_name: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface ChannelPost {
  id: number;
  content: string;
  author_id: number;
  author_name: string;
  author_avatar?: string;
  created_at: string;
  is_pinned: boolean;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
}

@Component({
  selector: 'app-channels',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './channels.component.html',
  styleUrls: ['./channels.component.scss']
})
export class ChannelsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  channels: Channel[] = [];
  filteredChannels: Channel[] = [];
  selectedChannel: Channel | null = null;
  channelPosts: ChannelPost[] = [];

  // UI State
  loading = false;
  loadingPosts = false;
  showCreateModal = false;
  showPostsModal = false;

  // Forms
  createChannelForm!: FormGroup;
  postForm!: FormGroup;

  // Filters
  searchQuery = '';
  filterType: 'all' | 'announcement' | 'discussion' | 'department' | 'project' = 'all';
  filterSubscription: 'all' | 'subscribed' | 'not_subscribed' = 'all';

  // Stats
  stats = {
    total: 0,
    subscribed: 0,
    owned: 0,
    public: 0
  };

  // Channel types
  channelTypes = [
    { value: 'announcement', label: 'Anuncios', icon: 'fas fa-bullhorn', color: '#ffc107' },
    { value: 'discussion', label: 'Discusión', icon: 'fas fa-comments', color: '#17a2b8' },
    { value: 'department', label: 'Departamento', icon: 'fas fa-building', color: '#6c757d' },
    { value: 'project', label: 'Proyecto', icon: 'fas fa-project-diagram', color: '#28a745' }
  ];

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    console.log('📣 ChannelsComponent: Inicializando...');
    this.loadChannels();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.createChannelForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['announcement', Validators.required],
      is_public: [true],
      icon: ['fas fa-bullhorn'],
      color: ['#007bff']
    });

    this.postForm = this.fb.group({
      content: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(5000)]]
    });
  }

  loadChannels(): void {
    this.loading = true;
    
    // Load channels from conversations with type 'channel'
    this.messageService.getConversations({ type: 'channel' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📣 Canales cargados:', response);
          this.channels = this.transformToChannels(response.data || []);
          this.updateStats();
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando canales:', error);
          // Load mock data for development
          this.loadMockChannels();
          this.loading = false;
        }
      });
  }

  private transformToChannels(conversations: any[]): Channel[] {
    return conversations.map(conv => ({
      id: conv.id,
      name: conv.title || 'Canal sin nombre',
      description: conv.description,
      icon: conv.icon || 'fas fa-bullhorn',
      color: conv.color || '#007bff',
      type: conv.channel_type || 'announcement',
      is_public: conv.is_public || false,
      subscriber_count: conv.participant_count || 0,
      post_count: conv.message_count || 0,
      unread_count: conv.unread_count || 0,
      is_subscribed: conv.is_member || false,
      is_owner: conv.is_admin || false,
      can_post: conv.can_post || false,
      latest_post: conv.latest_message ? {
        content: conv.latest_message.content,
        author_name: conv.latest_message.sender?.name || 'Usuario',
        created_at: conv.latest_message.created_at
      } : undefined,
      created_at: conv.created_at,
      updated_at: conv.updated_at
    }));
  }

  private loadMockChannels(): void {
    this.channels = [
      {
        id: 1,
        name: 'Anuncios Generales',
        description: 'Anuncios importantes de la organización',
        icon: 'fas fa-bullhorn',
        color: '#ffc107',
        type: 'announcement',
        is_public: true,
        subscriber_count: 156,
        post_count: 45,
        unread_count: 3,
        is_subscribed: true,
        is_owner: false,
        can_post: false,
        latest_post: {
          content: 'Recordatorio: Reunión general este viernes',
          author_name: 'Admin',
          created_at: new Date(Date.now() - 3600000).toISOString()
        },
        created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString()
      },
      {
        id: 2,
        name: 'IT - Soporte Técnico',
        description: 'Canal para solicitudes y discusiones de soporte IT',
        icon: 'fas fa-laptop-code',
        color: '#007bff',
        type: 'department',
        is_public: false,
        subscriber_count: 24,
        post_count: 128,
        unread_count: 5,
        is_subscribed: true,
        is_owner: false,
        can_post: true,
        latest_post: {
          content: 'Sistema de email restaurado',
          author_name: 'Carlos Tech',
          created_at: new Date(Date.now() - 1800000).toISOString()
        },
        created_at: new Date(Date.now() - 86400000 * 60).toISOString(),
        updated_at: new Date(Date.now() - 1800000).toISOString()
      }
    ];
    this.updateStats();
    this.applyFilters();
  }

  loadChannelPosts(channelId: number): void {
    this.loadingPosts = true;
    
    this.messageService.getMessagesForConversation(channelId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (posts: any) => {
          console.log('📄 Posts del canal:', posts);
          this.channelPosts = posts || [];
          this.loadingPosts = false;
        },
        error: (error) => {
          console.error('❌ Error cargando posts:', error);
          this.loadingPosts = false;
        }
      });
  }

  private updateStats(): void {
    this.stats.total = this.channels.length;
    this.stats.subscribed = this.channels.filter(c => c.is_subscribed).length;
    this.stats.owned = this.channels.filter(c => c.is_owner).length;
    this.stats.public = this.channels.filter(c => c.is_public).length;
  }

  applyFilters(): void {
    let filtered = [...this.channels];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter(c => c.type === this.filterType);
    }

    // Subscription filter
    if (this.filterSubscription === 'subscribed') {
      filtered = filtered.filter(c => c.is_subscribed);
    } else if (this.filterSubscription === 'not_subscribed') {
      filtered = filtered.filter(c => !c.is_subscribed);
    }

    this.filteredChannels = filtered;
  }

  // Channel Actions
  openCreateModal(): void {
    this.createChannelForm.reset({ type: 'announcement', is_public: true, icon: 'fas fa-bullhorn', color: '#007bff' });
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createChannelForm.reset();
  }

  createChannel(): void {
    if (this.createChannelForm.valid) {
      const formData = this.createChannelForm.value;

      const channelData = {
        title: formData.name,
        description: formData.description,
        type: 'channel',
        channel_type: formData.type,
        is_public: formData.is_public,
        icon: formData.icon,
        color: formData.color,
        participant_ids: [] // Will be added later
      };

      this.messageService.createConversation(channelData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Canal creado:', response);
            alert('Canal creado exitosamente');
            this.closeCreateModal();
            this.loadChannels();
          },
          error: (error) => {
            console.error('❌ Error creando canal:', error);
            alert('Error al crear el canal');
          }
        });
    }
  }

  subscribeToChannel(channel: Channel): void {
    console.log('➕ Suscribirse al canal:', channel.id);
    
    this.messageService.joinConversation(channel.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Suscrito al canal');
          alert(`Te has suscrito a ${channel.name}`);
          this.loadChannels();
        },
        error: (error) => {
          console.error('❌ Error suscribiéndose:', error);
          alert('Error al suscribirse al canal');
        }
      });
  }

  unsubscribeFromChannel(channel: Channel): void {
    if (confirm(`¿Deseas cancelar tu suscripción a "${channel.name}"?`)) {
      this.messageService.leaveConversation(channel.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Desuscrito del canal');
            alert('Te has desuscrito del canal');
            this.loadChannels();
          },
          error: (error) => {
            console.error('❌ Error desuscribiéndose:', error);
            alert('Error al desuscribirse');
          }
        });
    }
  }

  openChannel(channel: Channel): void {
    this.selectedChannel = channel;
    this.loadChannelPosts(channel.id);
    this.showPostsModal = true;
  }

  closePostsModal(): void {
    this.showPostsModal = false;
    this.selectedChannel = null;
    this.channelPosts = [];
    this.postForm.reset();
  }

  postToChannel(): void {
    if (this.postForm.valid && this.selectedChannel) {
      const content = this.postForm.get('content')?.value;

      const messageData = {
        conversation_id: this.selectedChannel.id,
        content: content,
        priority: 'normal' as const,
        message_type: 'individual' as const,
        recipients: []
      };

      this.messageService.sendMessage(messageData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Publicado en el canal');
            this.postForm.reset();
            this.loadChannelPosts(this.selectedChannel!.id);
          },
          error: (error) => {
            console.error('❌ Error publicando:', error);
            alert('Error al publicar en el canal');
          }
        });
    }
  }

  deleteChannel(channel: Channel): void {
    if (confirm(`¿Estás seguro de eliminar el canal "${channel.name}"?`)) {
      // TODO: Implement delete channel endpoint
      console.log('🗑️ Eliminando canal:', channel.id);
      alert('Funcionalidad de eliminación en desarrollo');
    }
  }

  // Helper Methods
  getChannelIcon(channel: Channel): string {
    const typeConfig = this.channelTypes.find(t => t.value === channel.type);
    return channel.icon || typeConfig?.icon || 'fas fa-bullhorn';
  }

  getChannelColor(channel: Channel): string {
    const typeConfig = this.channelTypes.find(t => t.value === channel.type);
    return channel.color || typeConfig?.color || '#007bff';
  }

  getChannelTypeLabel(type: string): string {
    const typeConfig = this.channelTypes.find(t => t.value === type);
    return typeConfig?.label || type;
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

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }
}

