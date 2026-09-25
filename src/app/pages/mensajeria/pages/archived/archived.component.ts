import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MessageService } from '../../services/message.service';

export interface ArchivedItem {
  id: number;
  type: 'message' | 'conversation';
  title: string;
  content?: string;
  sender_name?: string;
  participant_count?: number;
  message_count?: number;
  archived_at: string;
  original_date: string;
  folder?: string;
  priority?: string;
  has_attachments?: boolean;
  attachment_count?: number;
}

@Component({
  selector: 'app-archived',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './archived.component.html',
  styleUrls: ['./archived.component.scss']
})
export class ArchivedComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Data
  archivedItems: ArchivedItem[] = [];
  filteredItems: ArchivedItem[] = [];
  selectedItems: Set<number> = new Set();

  // UI State
  loading = false;
  viewMode: 'list' | 'grid' = 'list';

  // Filters
  searchQuery = '';
  filterType: 'all' | 'message' | 'conversation' = 'all';
  filterDate: 'all' | 'week' | 'month' | 'year' = 'all';
  sortBy: 'date' | 'title' | 'sender' = 'date';
  sortOrder: 'asc' | 'desc' = 'desc';

  // Stats
  stats = {
    total: 0,
    messages: 0,
    conversations: 0,
    thisWeek: 0
  };

  constructor(
    private messageService: MessageService,
    private router: Router
  ) {}

  ngOnInit(): void {
    console.log('📦 ArchivedComponent: Inicializando...');
    this.loadArchivedItems();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadArchivedItems(): void {
    this.loading = true;

    // Load archived messages
    this.messageService.getMessages({ folder: 'archive' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          console.log('📦 Items archivados cargados:', response);
          
          const messages = response.data?.data || response.data || [];
          this.archivedItems = messages.map((msg: any) => this.transformToArchivedItem(msg));
          
          this.updateStats();
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('❌ Error cargando archivados:', error);
          this.loadMockData();
          this.loading = false;
        }
      });
  }

  private transformToArchivedItem(item: any): ArchivedItem {
    return {
      id: item.id,
      type: item.conversation_id ? 'conversation' : 'message',
      title: item.subject || item.title || 'Sin asunto',
      content: item.content,
      sender_name: item.sender?.name || item.sender_name,
      participant_count: item.participant_count,
      message_count: item.message_count,
      archived_at: item.archived_at || item.updated_at,
      original_date: item.created_at,
      folder: item.folder || 'archive',
      priority: item.priority,
      has_attachments: item.has_attachments || false,
      attachment_count: item.attachment_count || 0
    };
  }

  private loadMockData(): void {
    this.archivedItems = [
      {
        id: 1,
        type: 'message',
        title: 'Informe Trimestral Q2',
        content: 'Adjunto el informe financiero del segundo trimestre...',
        sender_name: 'María González',
        archived_at: new Date(Date.now() - 86400000 * 7).toISOString(),
        original_date: new Date(Date.now() - 86400000 * 90).toISOString(),
        priority: 'high',
        has_attachments: true,
        attachment_count: 2
      },
      {
        id: 2,
        type: 'conversation',
        title: 'Proyecto Web 2023',
        participant_count: 8,
        message_count: 145,
        archived_at: new Date(Date.now() - 86400000 * 14).toISOString(),
        original_date: new Date(Date.now() - 86400000 * 180).toISOString()
      }
    ];
    this.updateStats();
    this.applyFilters();
  }

  private updateStats(): void {
    this.stats.total = this.archivedItems.length;
    this.stats.messages = this.archivedItems.filter(i => i.type === 'message').length;
    this.stats.conversations = this.archivedItems.filter(i => i.type === 'conversation').length;
    
    const weekAgo = new Date(Date.now() - 86400000 * 7);
    this.stats.thisWeek = this.archivedItems.filter(i => 
      new Date(i.archived_at) > weekAgo
    ).length;
  }

  applyFilters(): void {
    let filtered = [...this.archivedItems];

    // Search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(query) ||
        item.content?.toLowerCase().includes(query) ||
        item.sender_name?.toLowerCase().includes(query)
      );
    }

    // Type filter
    if (this.filterType !== 'all') {
      filtered = filtered.filter(item => item.type === this.filterType);
    }

    // Date filter
    const now = Date.now();
    if (this.filterDate === 'week') {
      const weekAgo = now - (86400000 * 7);
      filtered = filtered.filter(item => new Date(item.archived_at).getTime() > weekAgo);
    } else if (this.filterDate === 'month') {
      const monthAgo = now - (86400000 * 30);
      filtered = filtered.filter(item => new Date(item.archived_at).getTime() > monthAgo);
    } else if (this.filterDate === 'year') {
      const yearAgo = now - (86400000 * 365);
      filtered = filtered.filter(item => new Date(item.archived_at).getTime() > yearAgo);
    }

    // Sort
    this.sortItems(filtered);

    this.filteredItems = filtered;
  }

  private sortItems(items: ArchivedItem[]): void {
    items.sort((a, b) => {
      let valueA: any, valueB: any;

      switch (this.sortBy) {
        case 'date':
          valueA = new Date(a.archived_at).getTime();
          valueB = new Date(b.archived_at).getTime();
          break;
        case 'title':
          valueA = a.title.toLowerCase();
          valueB = b.title.toLowerCase();
          break;
        case 'sender':
          valueA = (a.sender_name || '').toLowerCase();
          valueB = (b.sender_name || '').toLowerCase();
          break;
        default:
          valueA = new Date(a.archived_at).getTime();
          valueB = new Date(b.archived_at).getTime();
      }

      if (this.sortOrder === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
  }

  // Actions
  unarchiveItem(item: ArchivedItem, event?: Event): void {
    if (event) event.stopPropagation();

    if (confirm(`¿Desarchivar "${item.title}"?`)) {
      const folder = item.type === 'message' ? 'inbox' : 'conversations';
      
      this.messageService.moveMessageToFolder(item.id, folder)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Item desarchivado');
            alert('Item desarchivado exitosamente');
            this.loadArchivedItems();
          },
          error: (error) => {
            console.error('❌ Error desarchivando:', error);
            alert('Error al desarchivar el item');
          }
        });
    }
  }

  deleteItem(item: ArchivedItem, event?: Event): void {
    if (event) event.stopPropagation();

    if (confirm(`¿Eliminar permanentemente "${item.title}"? Esta acción no se puede deshacer.`)) {
      this.messageService.deleteMessage(item.id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Item eliminado');
            alert('Item eliminado permanentemente');
            this.loadArchivedItems();
          },
          error: (error) => {
            console.error('❌ Error eliminando:', error);
            alert('Error al eliminar el item');
          }
        });
    }
  }

  openItem(item: ArchivedItem): void {
    if (item.type === 'message') {
      this.router.navigate(['/mensajeria/messages', item.id]);
    } else {
      this.router.navigate(['/mensajeria/conversation', item.id]);
    }
  }

  toggleSelection(itemId: number): void {
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
    } else {
      this.selectedItems.add(itemId);
    }
  }

  selectAll(): void {
    if (this.selectedItems.size === this.filteredItems.length) {
      this.selectedItems.clear();
    } else {
      this.filteredItems.forEach(item => this.selectedItems.add(item.id));
    }
  }

  clearSelection(): void {
    this.selectedItems.clear();
  }

  unarchiveSelected(): void {
    if (this.selectedItems.size === 0) {
      alert('Selecciona al menos un item');
      return;
    }

    if (confirm(`¿Desarchivar ${this.selectedItems.size} item(s) seleccionado(s)?`)) {
      const ids = Array.from(this.selectedItems);
      
      // TODO: Implement bulk unarchive
      console.log('📤 Desarchivando items:', ids);
      alert('Funcionalidad de desarchivado masivo en desarrollo');
    }
  }

  deleteSelected(): void {
    if (this.selectedItems.size === 0) {
      alert('Selecciona al menos un item');
      return;
    }

    if (confirm(`¿Eliminar permanentemente ${this.selectedItems.size} item(s)? No se puede deshacer.`)) {
      const ids = Array.from(this.selectedItems);
      
      // TODO: Implement bulk delete
      console.log('🗑️ Eliminando items:', ids);
      alert('Funcionalidad de eliminación masiva en desarrollo');
    }
  }

  // Helper Methods
  getItemIcon(item: ArchivedItem): string {
    if (item.type === 'message') {
      return item.has_attachments ? 'fas fa-paperclip' : 'fas fa-envelope';
    } else {
      return 'fas fa-comments';
    }
  }

  getItemIconColor(item: ArchivedItem): string {
    if (item.type === 'message') {
      switch (item.priority) {
        case 'urgent': return '#dc3545';
        case 'high': return '#ffc107';
        default: return '#007bff';
      }
    } else {
      return '#17a2b8';
    }
  }

  formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  formatRelativeDate(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays < 1) return 'Hoy';
    if (diffDays < 2) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} años`;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  onSortChange(): void {
    this.applyFilters();
  }

  toggleSortOrder(): void {
    this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc';
    this.applyFilters();
  }

  setViewMode(mode: 'list' | 'grid'): void {
    this.viewMode = mode;
  }

  isSelected(itemId: number): boolean {
    return this.selectedItems.has(itemId);
  }
}









