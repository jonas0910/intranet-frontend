import { Component, OnInit, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';
import { WebSocketService } from '../../services/websocket.service';

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string;
  isOnline?: boolean;
  lastSeen?: string;
}

@Component({
  selector: 'app-start-conversation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './start-conversation.component.html',
  styleUrls: ['./start-conversation.component.scss']
})
export class StartConversationComponent implements OnInit, OnDestroy {
  @Output() conversationStarted = new EventEmitter<{ users: User[]; canalId: number }>();
  @Output() closed = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  users: User[] = [];
  selectedUsers: Set<number> = new Set();
  searchQuery = '';
  loading = false;
  showModal = false;
  activeTab: 'online' | 'offline' | 'all' = 'all';

  constructor(
    private http: HttpClient,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    this.subscribeToUserStatus();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadUsers(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/users`)
      .subscribe({
        next: (response) => {
          console.log('📥 Respuesta de usuarios:', response);

          // Manejar diferentes estructuras de respuesta
          let usersArray: User[] = [];

          if (Array.isArray(response)) {
            // Respuesta directa es un array
            usersArray = response;
          } else if (response.success && response.data) {
            // Laravel response con success flag
            if (Array.isArray(response.data)) {
              // { success: true, data: [...] }
              usersArray = response.data;
            } else if (response.data.data && Array.isArray(response.data.data)) {
              // Laravel pagination: { success: true, data: { data: [...], current_page: 1, ... } }
              console.log('📄 Respuesta paginada detectada');
              usersArray = response.data.data;
            } else {
              console.error('❌ response.data no es un array:', response.data);
              this.loading = false;
              return;
            }
          } else if (response.data && Array.isArray(response.data)) {
            // Respuesta con { data: [...] }
            usersArray = response.data;
          } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
            // Laravel pagination sin success flag: { data: { data: [...], current_page: 1, ... } }
            console.log('📄 Respuesta paginada Laravel detectada');
            usersArray = response.data.data;
          } else if (response.users && Array.isArray(response.users)) {
            // Respuesta con { users: [...] }
            usersArray = response.users;
          } else {
            console.error('❌ Formato de respuesta no reconocido:', response);
            this.loading = false;
            return;
          }

          // Mapear y agregar propiedades de estado
          this.users = usersArray.map((user: any) => ({
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: user.avatar || user.profile_photo_url || null,
            isOnline: false, // Will be updated by WebSocket
            lastSeen: user.last_seen || null
          }));

          console.log('✅ Usuarios cargados:', this.users.length);

          // Si no hay usuarios, mostrar mensaje
          if (this.users.length === 0) {
            console.warn('⚠️ No se encontraron usuarios disponibles');
          }

          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error loading users:', error);
          console.error('Detalles del error:', error.error);

          // Mostrar mensaje al usuario
          alert('Error al cargar usuarios. Por favor intenta de nuevo.');

          this.loading = false;
        }
      });
  }

  private subscribeToUserStatus(): void {
    // Subscribe to user status updates from WebSocket
    this.webSocketService.getUserStatus().pipe(
      takeUntil(this.destroy$)
    ).subscribe(statusEvent => {
      const user = this.users.find(u => u.id === statusEvent.user_id);
      if (user) {
        user.isOnline = statusEvent.status === 'online';
        user.lastSeen = statusEvent.timestamp;
      }
    });
  }

  get filteredUsers(): User[] {
    let filtered = this.users;

    // Filter by search query
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query)
      );
    }

    // Filter by online status based on active tab
    if (this.activeTab === 'online') {
      filtered = filtered.filter(user => user.isOnline);
    } else if (this.activeTab === 'offline') {
      filtered = filtered.filter(user => !user.isOnline);
    }

    return filtered;
  }

  get onlineUsers(): User[] {
    return this.users.filter(user => user.isOnline);
  }

  get offlineUsers(): User[] {
    return this.users.filter(user => !user.isOnline);
  }

  get onlineCount(): number {
    return this.onlineUsers.length;
  }

  get offlineCount(): number {
    return this.offlineUsers.length;
  }

  toggleUserSelection(userId: number): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  isSelected(userId: number): boolean {
    return this.selectedUsers.has(userId);
  }

  startConversation(): void {
    if (this.selectedUsers.size === 0) {
      alert('Por favor selecciona al menos un usuario');
      return;
    }

    const selectedUserList = this.users.filter(u => this.selectedUsers.has(u.id));

    // For now, emit with a default channel (General = 1)
    // In a real implementation, you might create a new channel
    this.conversationStarted.emit({
      users: selectedUserList,
      canalId: 1 // Default to General channel
    });

    this.close();
  }

  setActiveTab(tab: 'online' | 'offline' | 'all'): void {
    this.activeTab = tab;
  }

  open(): void {
    this.showModal = true;
    this.selectedUsers.clear();
    this.searchQuery = '';
    this.activeTab = 'all';
  }

  close(): void {
    this.showModal = false;
    this.selectedUsers.clear();
    this.searchQuery = '';
    this.activeTab = 'all';
    this.closed.emit();
  }

  getSelectedUsersText(): string {
    if (this.selectedUsers.size === 0) return 'Ningún usuario seleccionado';

    const names = Array.from(this.selectedUsers)
      .map(id => this.users.find(u => u.id === id)?.name)
      .filter(name => name);

    if (names.length === 1) return names[0]!;
    if (names.length === 2) return `${names[0]} y ${names[1]}`;
    return `${names[0]} y ${names.length - 1} más`;
  }
}
