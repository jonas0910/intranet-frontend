import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { ApiResponse } from '../../../core/models/api-response.model';
import { CacheService } from './cache.service';

export interface Folder {
  id: number;
  name: string;
  type: 'system' | 'custom';
  icon: string;
  color: string;
  message_count: number;
  unread_count: number;
  parent_id?: number;
  children?: Folder[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_id?: number;
  icon?: string;
  color?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  icon?: string;
  color?: string;
}

export interface MoveFolderRequest {
  parent_id?: number;
  position?: number;
}

export interface MoveMessagesRequest {
  message_ids: number[];
  folder_id: number;
}

export const DEFAULT_FOLDERS = {
  INBOX: 'inbox',
  SENT: 'sent',
  DRAFTS: 'drafts',
  TRASH: 'trash',
  IMPORTANT: 'important',
  ARCHIVE: 'archive'
} as const;

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private readonly apiUrl = `${environment.apiUrl}/mensajeria`;
  private foldersSubject = new BehaviorSubject<Folder[]>([]);
  private currentFolderSubject = new BehaviorSubject<Folder | null>(null);

  public folders$ = this.foldersSubject.asObservable();
  public currentFolder$ = this.currentFolderSubject.asObservable();

  constructor(
    private http: HttpClient,
    private cacheService: CacheService
  ) {
    this.loadFolders();
  }

  // Folder CRUD operations
  getFolders(): Observable<ApiResponse<Folder[]>> {
    // Retornar folders predefinidos del sistema (el backend no tiene endpoint /folders)
    const systemFolders: Folder[] = [
      { id: 1, name: 'Bandeja de entrada', type: 'system', icon: 'inbox', color: 'primary', message_count: 0, unread_count: 0, is_default: true, created_at: '', updated_at: '' },
      { id: 2, name: 'Enviados', type: 'system', icon: 'send', color: 'success', message_count: 0, unread_count: 0, is_default: true, created_at: '', updated_at: '' },
      { id: 3, name: 'Borradores', type: 'system', icon: 'drafts', color: 'warning', message_count: 0, unread_count: 0, is_default: true, created_at: '', updated_at: '' },
      { id: 4, name: 'Papelera', type: 'system', icon: 'delete', color: 'danger', message_count: 0, unread_count: 0, is_default: true, created_at: '', updated_at: '' },
      { id: 5, name: 'Archivo', type: 'system', icon: 'archive', color: 'secondary', message_count: 0, unread_count: 0, is_default: true, created_at: '', updated_at: '' },
    ];

    return new Observable(observer => {
      observer.next({ success: true, data: systemFolders });
      observer.complete();
    });
  }

  getFolder(id: number): Observable<ApiResponse<Folder>> {
    return this.http.get<ApiResponse<Folder>>(`${this.apiUrl}/folders/${id}`);
  }

  createFolder(folderData: CreateFolderRequest): Observable<ApiResponse<Folder>> {
    return this.http.post<ApiResponse<Folder>>(`${this.apiUrl}/folders`, folderData).pipe(
      tap(() => this.cacheService.invalidateFolders())
    );
  }

  updateFolder(id: number, folderData: UpdateFolderRequest): Observable<ApiResponse<Folder>> {
    return this.http.put<ApiResponse<Folder>>(`${this.apiUrl}/folders/${id}`, folderData).pipe(
      tap(() => this.cacheService.invalidateFolders())
    );
  }

  deleteFolder(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.apiUrl}/folders/${id}`).pipe(
      tap(() => this.cacheService.invalidateFolders())
    );
  }

  moveFolder(id: number, moveData: MoveFolderRequest): Observable<ApiResponse<Folder>> {
    return this.http.put<ApiResponse<Folder>>(`${this.apiUrl}/folders/${id}/move`, moveData);
  }

  // Message operations
  moveMessages(moveData: MoveMessagesRequest): Observable<ApiResponse<void>> {
    return this.http.post<ApiResponse<void>>(`${this.apiUrl}/folders/move-messages`, moveData);
  }

  getFolderMessages(folderId: number, params?: any): Observable<ApiResponse<any>> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== null && params[key] !== undefined) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/folders/${folderId}/messages`, { params: httpParams });
  }

  // Folder management
  private loadFolders(): void {
    this.getFolders().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.foldersSubject.next(response.data);
        }
      },
      error: (error) => {
        console.error('Error loading folders:', error);
      }
    });
  }

  refreshFolders(): void {
    this.loadFolders();
  }

  setCurrentFolder(folder: Folder | null): void {
    this.currentFolderSubject.next(folder);
  }

  getCurrentFolder(): Folder | null {
    return this.currentFolderSubject.value;
  }

  // Helper methods
  getSystemFolders(): Folder[] {
    return this.foldersSubject.value.filter(folder => folder.type === 'system');
  }

  getCustomFolders(): Folder[] {
    return this.foldersSubject.value.filter(folder => folder.type === 'custom');
  }

  getFolderById(id: number): Folder | undefined {
    return this.findFolderInTree(this.foldersSubject.value, id);
  }

  getFolderByType(type: string): Folder | undefined {
    return this.foldersSubject.value.find(folder => 
      folder.type === 'system' && folder.name.toLowerCase() === type.toLowerCase()
    );
  }

  private findFolderInTree(folders: Folder[], id: number): Folder | undefined {
    for (const folder of folders) {
      if (folder.id === id) {
        return folder;
      }
      if (folder.children) {
        const found = this.findFolderInTree(folder.children, id);
        if (found) {
          return found;
        }
      }
    }
    return undefined;
  }

  buildFolderTree(folders: Folder[]): Folder[] {
    const folderMap = new Map<number, Folder>();
    const rootFolders: Folder[] = [];

    // Create a map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Build the tree structure
    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      
      if (folder.parent_id) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(folderNode);
        } else {
          rootFolders.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  }

  getFolderPath(folderId: number): string[] {
    const path: string[] = [];
    let currentFolder = this.getFolderById(folderId);
    
    while (currentFolder) {
      path.unshift(currentFolder.name);
      currentFolder = currentFolder.parent_id ? 
        this.getFolderById(currentFolder.parent_id) : undefined;
    }
    
    return path;
  }

  getTotalUnreadCount(): number {
    return this.foldersSubject.value.reduce((total, folder) => {
      return total + (folder.unread_count || 0);
    }, 0);
  }

  getDefaultFolderIcon(folderName: string): string {
    const iconMap: { [key: string]: string } = {
      'inbox': 'fas fa-inbox',
      'sent': 'fas fa-paper-plane',
      'drafts': 'fas fa-edit',
      'trash': 'fas fa-trash',
      'important': 'fas fa-star',
      'archive': 'fas fa-archive',
      'spam': 'fas fa-ban',
      'custom': 'fas fa-folder'
    };

    const key = folderName.toLowerCase();
    return iconMap[key] || iconMap['custom'];
  }

  getDefaultFolderColor(folderName: string): string {
    const colorMap: { [key: string]: string } = {
      'inbox': '#007bff',
      'sent': '#28a745',
      'drafts': '#ffc107',
      'trash': '#dc3545',
      'important': '#fd7e14',
      'archive': '#6c757d',
      'spam': '#e83e8c',
      'custom': '#17a2b8'
    };

    const key = folderName.toLowerCase();
    return colorMap[key] || colorMap['custom'];
  }

  // Validation methods
  canDeleteFolder(folder: Folder): boolean {
    return folder.type === 'custom' && !folder.is_default;
  }

  canMoveFolder(folder: Folder): boolean {
    return folder.type === 'custom';
  }

  canRenameFolder(folder: Folder): boolean {
    return folder.type === 'custom' || !folder.is_default;
  }

  validateFolderName(name: string, excludeId?: number): boolean {
    const trimmedName = name.trim();
    
    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 50) {
      return false;
    }

    // Check for duplicate names
    const existingFolder = this.foldersSubject.value.find(folder => 
      folder.name.toLowerCase() === trimmedName.toLowerCase() && 
      folder.id !== excludeId
    );

    return !existingFolder;
  }

  // Drag and drop support
  canDropMessages(targetFolder: Folder, messageIds: number[]): boolean {
    // Can't drop into trash if already in trash
    if (targetFolder.name.toLowerCase() === 'trash') {
      return true;
    }

    // Add more business rules as needed
    return true;
  }

  // Search within folders
  searchInFolder(folderId: number, query: string, filters?: any): Observable<ApiResponse<any>> {
    let params = new HttpParams()
      .set('search', query);

    if (filters) {
      Object.keys(filters).forEach(key => {
        if (filters[key] !== null && filters[key] !== undefined) {
          params = params.set(key, filters[key].toString());
        }
      });
    }

    return this.http.get<ApiResponse<any>>(`${this.apiUrl}/folders/${folderId}/search`, { params });
  }

  getCurrentFolders(): Folder[] {
    return this.foldersSubject.value;
  }
}