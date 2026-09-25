import { Component, OnInit, OnDestroy, Output, EventEmitter, Input } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CdkDragDrop, moveItemInArray, transferArrayItem } from '@angular/cdk/drag-drop';
import { FolderService, Folder, CreateFolderRequest } from '../../services/folder.service';

@Component({
  selector: 'app-folder-list',
  templateUrl: './folder-list.component.html',
  styleUrls: ['./folder-list.component.scss']
})
export class FolderListComponent implements OnInit, OnDestroy {
  @Input() allowDragDrop = true;
  @Input() showCreateButton = true;
  @Input() collapsible = true;
  @Output() folderSelected = new EventEmitter<Folder>();
  @Output() folderCreated = new EventEmitter<Folder>();
  @Output() folderUpdated = new EventEmitter<Folder>();
  @Output() folderDeleted = new EventEmitter<number>();

  private destroy$ = new Subject<void>();
  
  folders: Folder[] = [];
  systemFolders: Folder[] = [];
  customFolders: Folder[] = [];
  selectedFolder?: Folder;
  
  // UI State
  loading = false;
  expandedFolders = new Set<number>();
  editingFolder?: Folder;
  creatingFolder = false;
  
  // New folder form
  newFolderName = '';
  newFolderParent?: Folder;
  newFolderIcon = 'fas fa-folder';
  newFolderColor = '#17a2b8';

  constructor(private folderService: FolderService) {}

  ngOnInit(): void {
    this.loadFolders();
    this.subscribeToFolderChanges();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadFolders(): void {
    this.loading = true;
    this.folderService.getFolders()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.loading = false;
          if (response.success) {
            this.folders = response.data;
            this.organizeFolders();
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Error loading folders:', error);
        }
      });
  }

  private subscribeToFolderChanges(): void {
    this.folderService.folders$
      .pipe(takeUntil(this.destroy$))
      .subscribe(folders => {
        this.folders = folders;
        this.organizeFolders();
      });

    this.folderService.currentFolder$
      .pipe(takeUntil(this.destroy$))
      .subscribe(folder => {
        this.selectedFolder = folder || undefined;
      });
  }

  private organizeFolders(): void {
    this.systemFolders = this.folders.filter(f => f.type === 'system');
    this.customFolders = this.folderService.buildFolderTree(
      this.folders.filter(f => f.type === 'custom')
    );
  }

  onFolderClick(folder: Folder): void {
    this.selectedFolder = folder;
    this.folderService.setCurrentFolder(folder);
    this.folderSelected.emit(folder);
  }

  onToggleExpand(folder: Folder, event: Event): void {
    event.stopPropagation();
    
    if (this.expandedFolders.has(folder.id)) {
      this.expandedFolders.delete(folder.id);
    } else {
      this.expandedFolders.add(folder.id);
    }
  }

  onCreateFolder(): void {
    this.creatingFolder = true;
    this.newFolderName = '';
    this.newFolderParent = undefined;
    this.newFolderIcon = 'fas fa-folder';
    this.newFolderColor = '#17a2b8';
  }

  onSaveNewFolder(): void {
    if (!this.newFolderName.trim()) {
      return;
    }

    if (!this.folderService.validateFolderName(this.newFolderName)) {
      alert('Nombre de carpeta inválido o ya existe');
      return;
    }

    const folderData: CreateFolderRequest = {
      name: this.newFolderName.trim(),
      parent_id: this.newFolderParent?.id,
      icon: this.newFolderIcon,
      color: this.newFolderColor
    };

    this.folderService.createFolder(folderData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.creatingFolder = false;
            this.folderCreated.emit(response.data);
            this.folderService.refreshFolders();
          }
        },
        error: (error) => {
          console.error('Error creating folder:', error);
          alert('Error al crear la carpeta');
        }
      });
  }

  onCancelNewFolder(): void {
    this.creatingFolder = false;
    this.newFolderName = '';
    this.newFolderParent = undefined;
  }

  onEditFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    
    if (!this.folderService.canRenameFolder(folder)) {
      return;
    }

    this.editingFolder = folder;
  }

  onSaveEditFolder(folder: Folder, newName: string): void {
    if (!newName.trim()) {
      this.editingFolder = undefined;
      return;
    }

    if (!this.folderService.validateFolderName(newName, folder.id)) {
      alert('Nombre de carpeta inválido o ya existe');
      return;
    }

    this.folderService.updateFolder(folder.id, { name: newName.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.editingFolder = undefined;
            this.folderUpdated.emit(response.data);
            this.folderService.refreshFolders();
          }
        },
        error: (error) => {
          console.error('Error updating folder:', error);
          alert('Error al actualizar la carpeta');
        }
      });
  }

  onCancelEditFolder(): void {
    this.editingFolder = undefined;
  }

  onDeleteFolder(folder: Folder, event: Event): void {
    event.stopPropagation();
    
    if (!this.folderService.canDeleteFolder(folder)) {
      alert('No se puede eliminar esta carpeta');
      return;
    }

    if (!confirm(`¿Está seguro de que desea eliminar la carpeta "${folder.name}"?`)) {
      return;
    }

    this.folderService.deleteFolder(folder.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response.success) {
            this.folderDeleted.emit(folder.id);
            this.folderService.refreshFolders();
            
            // Clear selection if deleted folder was selected
            if (this.selectedFolder?.id === folder.id) {
              this.selectedFolder = undefined;
              this.folderService.setCurrentFolder(null);
            }
          }
        },
        error: (error) => {
          console.error('Error deleting folder:', error);
          alert('Error al eliminar la carpeta');
        }
      });
  }

  // Drag and Drop
  onFolderDrop(event: CdkDragDrop<Folder[]>): void {
    if (!this.allowDragDrop) {
      return;
    }

    if (event.previousContainer === event.container) {
      moveItemInArray(event.container.data, event.previousIndex, event.currentIndex);
    } else {
      transferArrayItem(
        event.previousContainer.data,
        event.container.data,
        event.previousIndex,
        event.currentIndex
      );
    }

    // Update folder positions on server
    this.updateFolderPositions();
  }

  private updateFolderPositions(): void {
    // Implementation for updating folder positions
    // This would send the new order to the server
    console.log('Update folder positions');
  }

  // Helper methods
  isFolderExpanded(folder: Folder): boolean {
    return this.expandedFolders.has(folder.id);
  }

  isFolderSelected(folder: Folder): boolean {
    return this.selectedFolder?.id === folder.id;
  }

  isFolderEditing(folder: Folder): boolean {
    return this.editingFolder?.id === folder.id;
  }

  hasChildren(folder: Folder): boolean {
    return folder.children && folder.children.length > 0;
  }

  canEditFolder(folder: Folder): boolean {
    return this.folderService.canRenameFolder(folder);
  }

  canDeleteFolder(folder: Folder): boolean {
    return this.folderService.canDeleteFolder(folder);
  }

  canMoveFolder(folder: Folder): boolean {
    return this.folderService.canMoveFolder(folder);
  }

  getFolderIcon(folder: Folder): string {
    return folder.icon || this.folderService.getDefaultFolderIcon(folder.name);
  }

  getFolderColor(folder: Folder): string {
    return folder.color || this.folderService.getDefaultFolderColor(folder.name);
  }

  getUnreadBadgeClass(folder: Folder): string {
    const count = folder.unread_count || 0;
    if (count === 0) return '';
    if (count < 10) return 'badge-primary';
    if (count < 100) return 'badge-warning';
    return 'badge-danger';
  }

  formatUnreadCount(count: number): string {
    if (count === 0) return '';
    if (count < 100) return count.toString();
    return '99+';
  }

  // Icon and color options for new folders
  getIconOptions(): string[] {
    return [
      'fas fa-folder',
      'fas fa-folder-open',
      'fas fa-archive',
      'fas fa-bookmark',
      'fas fa-tag',
      'fas fa-star',
      'fas fa-heart',
      'fas fa-flag',
      'fas fa-bell',
      'fas fa-calendar',
      'fas fa-clock',
      'fas fa-file',
      'fas fa-briefcase',
      'fas fa-home'
    ];
  }

  getColorOptions(): string[] {
    return [
      '#007bff', // Blue
      '#28a745', // Green
      '#dc3545', // Red
      '#ffc107', // Yellow
      '#fd7e14', // Orange
      '#6f42c1', // Purple
      '#e83e8c', // Pink
      '#17a2b8', // Cyan
      '#6c757d', // Gray
      '#343a40'  // Dark
    ];
  }

  onRefresh(): void {
    this.folderService.refreshFolders();
  }

  // Getters for template
  get totalUnreadCount(): number {
    return this.folderService.getTotalUnreadCount();
  }

  get hasSystemFolders(): boolean {
    return this.systemFolders.length > 0;
  }

  get hasCustomFolders(): boolean {
    return this.customFolders.length > 0;
  }
}