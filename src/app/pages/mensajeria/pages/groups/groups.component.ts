import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../../../services/auth.service';

export interface Group {
  id: number;
  title: string;
  description?: string;
  type: 'group' | 'department' | 'public';
  avatar?: string;
  participant_count: number;
  message_count: number;
  unread_count: number;
  is_active: boolean;
  is_member: boolean;
  is_admin: boolean;
  latest_message?: {
    content: string;
    sender_name: string;
    created_at: string;
  };
  created_at: string;
  updated_at: string;
}

export interface GroupMember {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  is_online: boolean;
}

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './groups.component.html',
  styleUrls: ['./groups.component.scss']
})
export class GroupsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  groups: Group[] = [];
  filteredGroups: Group[] = [];
  selectedGroup: Group | null = null;
  groupMembers: GroupMember[] = [];

  // UI State
  loading = false;
  loadingMembers = false;
  showCreateModal = false;
  showEditModal = false;
  showMembersModal = false;
  showAddMembersModal = false;

  // Forms
  createGroupForm!: FormGroup;
  editGroupForm!: FormGroup;

  // Filters
  searchQuery = '';
  filterType: 'all' | 'group' | 'department' | 'public' = 'all';
  filterStatus: 'all' | 'member' | 'not_member' = 'all';

  // Available users for adding to group
  availableUsers: any[] = [];
  selectedUsers: Set<number> = new Set();

  // Stats
  stats = {
    total: 0,
    member: 0,
    admin: 0,
    public: 0
  };

  constructor(
    private messageService: MessageService,
    private authService: AuthService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.initializeForms();
  }

  ngOnInit(): void {
    console.log('🏢 GroupsComponent: Inicializando...');
    this.loadGroups();
    this.loadAvailableUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForms(): void {
    this.createGroupForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      type: ['group', Validators.required],
      is_public: [false]
    });

    this.editGroupForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      description: ['', [Validators.maxLength(500)]],
      is_active: [true]
    });
  }

  loadGroups(): void {
    this.loading = true;
    this.messageService.getConversations({ type: 'group,department' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📋 Grupos cargados:', response);
          this.groups = response.data || [];
          this.updateStats();
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando grupos:', error);
          this.loading = false;
        }
      });
  }

  loadGroupMembers(groupId: number): void {
    this.loadingMembers = true;
    this.messageService.getConversationParticipants(groupId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (members: any) => {
          console.log('👥 Miembros del grupo:', members);
          this.groupMembers = members;
          this.loadingMembers = false;
        },
        error: (error) => {
          console.error('❌ Error cargando miembros:', error);
          this.loadingMembers = false;
        }
      });
  }

  loadAvailableUsers(): void {
    this.messageService.getContacts()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: any) => {
          this.availableUsers = users || [];
        },
        error: (error) => {
          console.error('❌ Error cargando usuarios:', error);
        }
      });
  }

  private updateStats(): void {
    this.stats.total = this.groups.length;
    this.stats.member = this.groups.filter(g => g.is_member).length;
    this.stats.admin = this.groups.filter(g => g.is_admin).length;
    this.stats.public = this.groups.filter(g => g.type === 'public').length;
  }

  applyFilters(): void {
    let filtered = [...this.groups];

    // Filter by search
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.description?.toLowerCase().includes(query)
      );
    }

    // Filter by type
    if (this.filterType !== 'all') {
      filtered = filtered.filter(g => g.type === this.filterType);
    }

    // Filter by membership status
    if (this.filterStatus === 'member') {
      filtered = filtered.filter(g => g.is_member);
    } else if (this.filterStatus === 'not_member') {
      filtered = filtered.filter(g => !g.is_member);
    }

    this.filteredGroups = filtered;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // Modal Actions
  openCreateModal(): void {
    this.createGroupForm.reset({ type: 'group', is_public: false });
    this.selectedUsers.clear();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createGroupForm.reset();
    this.selectedUsers.clear();
  }

  openEditModal(group: Group): void {
    this.selectedGroup = group;
    this.editGroupForm.patchValue({
      title: group.title,
      description: group.description,
      is_active: group.is_active
    });
    this.showEditModal = true;
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedGroup = null;
    this.editGroupForm.reset();
  }

  openMembersModal(group: Group): void {
    this.selectedGroup = group;
    this.loadGroupMembers(group.id);
    this.showMembersModal = true;
  }

  closeMembersModal(): void {
    this.showMembersModal = false;
    this.selectedGroup = null;
    this.groupMembers = [];
  }

  openAddMembersModal(group: Group): void {
    this.selectedGroup = group;
    this.selectedUsers.clear();
    this.showAddMembersModal = true;
  }

  closeAddMembersModal(): void {
    this.showAddMembersModal = false;
    this.selectedGroup = null;
    this.selectedUsers.clear();
  }

  // Group Actions
  createGroup(): void {
    if (this.createGroupForm.valid) {
      const formData = this.createGroupForm.value;
      const participantIds = Array.from(this.selectedUsers);

      const groupData = {
        title: formData.title,
        description: formData.description,
        type: formData.type,
        participant_ids: participantIds
      };

      this.messageService.createConversation(groupData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('✅ Grupo creado:', response);
            alert('Grupo creado exitosamente');
            this.closeCreateModal();
            this.loadGroups();
            
            // Navigate to the new group
            if (response.data && response.data.id) {
              this.openGroup(response.data.id);
            }
          },
          error: (error) => {
            console.error('❌ Error creando grupo:', error);
            alert('Error al crear el grupo. Por favor intenta de nuevo.');
          }
        });
    }
  }

  updateGroup(): void {
    if (this.editGroupForm.valid && this.selectedGroup) {
      const formData = this.editGroupForm.value;
      
      // TODO: Implement update conversation endpoint
      console.log('💾 Actualizando grupo:', this.selectedGroup.id, formData);
      alert('Funcionalidad de actualización en desarrollo');
      this.closeEditModal();
    }
  }

  deleteGroup(group: Group): void {
    if (confirm(`¿Estás seguro de eliminar el grupo "${group.title}"?`)) {
      // TODO: Implement delete conversation endpoint
      console.log('🗑️ Eliminando grupo:', group.id);
      alert('Funcionalidad de eliminación en desarrollo');
    }
  }

  joinGroup(group: Group): void {
    // TODO: Implement join group endpoint
    console.log('➕ Unirse al grupo:', group.id);
    
    this.messageService.joinConversation(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Unido al grupo');
          alert('Te has unido al grupo exitosamente');
          this.loadGroups();
        },
        error: (error) => {
          console.error('❌ Error uniéndose al grupo:', error);
          alert('Error al unirse al grupo');
        }
      });
  }

  leaveGroup(group: Group): void {
    if (confirm(`¿Estás seguro de salir del grupo "${group.title}"?`)) {
      this.messageService.leaveConversation(group.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Saliste del grupo');
            alert('Has salido del grupo');
            this.loadGroups();
          },
          error: (error) => {
            console.error('❌ Error saliendo del grupo:', error);
            alert('Error al salir del grupo');
          }
        });
    }
  }

  openGroup(groupId: number): void {
    this.router.navigate(['/mensajeria/chat'], {
      queryParams: {
        conversationId: groupId
      }
    });
  }

  // Member Management
  toggleUserSelection(userId: number): void {
    if (this.selectedUsers.has(userId)) {
      this.selectedUsers.delete(userId);
    } else {
      this.selectedUsers.add(userId);
    }
  }

  isUserSelected(userId: number): boolean {
    return this.selectedUsers.has(userId);
  }

  addMembersToGroup(): void {
    if (this.selectedUsers.size === 0 || !this.selectedGroup) {
      alert('Por favor selecciona al menos un usuario');
      return;
    }

    const userIds = Array.from(this.selectedUsers);
    
    this.messageService.addParticipantsToConversation(this.selectedGroup.id, userIds)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Miembros agregados');
          alert('Miembros agregados exitosamente');
          this.closeAddMembersModal();
          this.loadGroups();
          if (this.selectedGroup) {
            this.loadGroupMembers(this.selectedGroup.id);
          }
        },
        error: (error) => {
          console.error('❌ Error agregando miembros:', error);
          alert('Error al agregar miembros');
        }
      });
  }

  removeMember(member: GroupMember): void {
    if (!this.selectedGroup) return;

    if (confirm(`¿Eliminar a ${member.name} del grupo?`)) {
      this.messageService.removeParticipantFromConversation(this.selectedGroup.id, member.user_id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Miembro eliminado');
            alert('Miembro eliminado del grupo');
            this.loadGroupMembers(this.selectedGroup!.id);
          },
          error: (error) => {
            console.error('❌ Error eliminando miembro:', error);
            alert('Error al eliminar miembro');
          }
        });
    }
  }

  changeMemberRole(member: GroupMember, newRole: 'admin' | 'moderator' | 'member'): void {
    if (!this.selectedGroup) return;

    // TODO: Implement change member role endpoint
    console.log('👤 Cambiar rol de miembro:', member.user_id, 'a', newRole);
    alert('Funcionalidad de cambio de rol en desarrollo');
  }

  // Helper Methods
  getGroupIcon(group: Group): string {
    switch (group.type) {
      case 'group':
        return 'fas fa-users';
      case 'department':
        return 'fas fa-building';
      case 'public':
        return 'fas fa-globe';
      default:
        return 'fas fa-users';
    }
  }

  getGroupBadgeClass(group: Group): string {
    switch (group.type) {
      case 'group':
        return 'badge-primary';
      case 'department':
        return 'badge-info';
      case 'public':
        return 'badge-success';
      default:
        return 'badge-secondary';
    }
  }

  getGroupTypeLabel(type: string): string {
    switch (type) {
      case 'group':
        return 'Grupo';
      case 'department':
        return 'Departamento';
      case 'public':
        return 'Público';
      default:
        return type;
    }
  }

  getRoleBadgeClass(role: string): string {
    switch (role) {
      case 'admin':
        return 'badge-danger';
      case 'moderator':
        return 'badge-warning';
      case 'member':
        return 'badge-info';
      default:
        return 'badge-secondary';
    }
  }

  getRoleLabel(role: string): string {
    switch (role) {
      case 'admin':
        return 'Administrador';
      case 'moderator':
        return 'Moderador';
      case 'member':
        return 'Miembro';
      default:
        return role;
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
}









