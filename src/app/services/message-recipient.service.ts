import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map, switchMap, tap } from 'rxjs/operators';
import { AuthService, User } from './auth.service';
import { AppConfigService } from './app-config.service';
import { UserService } from '../pages/mensajeria/services/user.service';

export interface MessageRecipient {
  id: number;
  type: 'user' | 'department';
  name: string;
  email?: string;
  avatar?: string;
  department?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessageRecipientService {
  private availableRecipientsSubject = new BehaviorSubject<MessageRecipient[]>([]);
  public availableRecipients$ = this.availableRecipientsSubject.asObservable();

  constructor(
    private authService: AuthService,
    private appConfigService: AppConfigService,
    private userService: UserService
  ) {
    this.initializeRecipients();
  }

  /**
   * Initialize recipients from available users
   */
  private initializeRecipients(): void {
    this.userService.getUsers().subscribe({
      next: (users) => {
        // Ensure users is an array
        if (!Array.isArray(users)) {
          console.error('❌ Users response is not an array:', users);
          this.availableRecipientsSubject.next([]);
          return;
        }
        
        const recipients: MessageRecipient[] = users.map(user => ({
          id: user.id,
          type: 'user' as const,
          name: user.name,
          email: user.email,
          avatar: user.avatar || 'assets/img/user-default.png'
        }));
        
        this.availableRecipientsSubject.next(recipients);
        console.log('📋 MessageRecipientService: Recipients loaded from database:', recipients.length);
      },
      error: (error) => {
        console.error('❌ Error loading recipients from database:', error);
        this.availableRecipientsSubject.next([]);
      }
    });
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): Observable<number | null> {
    return this.authService.currentUser$.pipe(
      map(user => user?.id || null)
    );
  }

  /**
   * Get current user ID synchronously
   */
  getCurrentUserIdSync(): number | null {
    const user = this.authService.getCurrentUser();
    return user?.id || null;
  }

  /**
   * Get available recipients (excluding current user)
   */
  getAvailableRecipients(): Observable<MessageRecipient[]> {
    return combineLatest([
      this.availableRecipients$,
      this.getCurrentUserId()
    ]).pipe(
      map(([recipients, currentUserId]) => {
        if (!currentUserId) return recipients;
        return recipients.filter(recipient => recipient.id !== currentUserId);
      })
    );
  }

  /**
   * Get recipient by ID
   */
  getRecipientById(id: number): Observable<MessageRecipient | null> {
    return this.availableRecipients$.pipe(
      map(recipients => recipients.find(r => r.id === id) || null)
    );
  }

  /**
   * Get recipient by ID synchronously
   */
  getRecipientByIdSync(id: number): MessageRecipient | null {
    const recipients = this.availableRecipientsSubject.value;
    return recipients.find(r => r.id === id) || null;
  }

  /**
   * Search recipients by name
   */
  searchRecipients(searchTerm: string): Observable<MessageRecipient[]> {
    if (!searchTerm.trim()) {
      return this.getAvailableRecipients();
    }

    return this.getAvailableRecipients().pipe(
      map(recipients => 
        recipients.filter(recipient => 
          recipient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          recipient.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
    );
  }

  /**
   * Get default recipient for testing (first available user)
   */
  getDefaultRecipient(): Observable<MessageRecipient | null> {
    return this.getAvailableRecipients().pipe(
      map(recipients => recipients.length > 0 ? recipients[0] : null)
    );
  }

  /**
   * Get default recipient synchronously
   */
  getDefaultRecipientSync(): MessageRecipient | null {
    const recipients = this.availableRecipientsSubject.value;
    const currentUserId = this.getCurrentUserIdSync();
    
    if (!currentUserId) return recipients[0] || null;
    
    const availableRecipients = recipients.filter(r => r.id !== currentUserId);
    return availableRecipients[0] || null;
  }

  /**
   * Validate recipient exists
   */
  validateRecipient(recipientId: number): Observable<boolean> {
    return this.getRecipientById(recipientId).pipe(
      map(recipient => recipient !== null)
    );
  }

  /**
   * Validate recipient exists synchronously
   */
  validateRecipientSync(recipientId: number): boolean {
    return this.getRecipientByIdSync(recipientId) !== null;
  }

  /**
   * Get system user (for system messages)
   */
  getSystemUser(): Observable<MessageRecipient | null> {
    return this.availableRecipients$.pipe(
      map(recipients => 
        recipients.find(r => r.name.toLowerCase().includes('sistema') || 
                            r.name.toLowerCase().includes('admin')) || null
      )
    );
  }

  /**
   * Refresh recipients list
   */
  refreshRecipients(): void {
    this.initializeRecipients();
  }

  /**
   * Get recipient display name
   */
  getRecipientDisplayName(recipient: MessageRecipient): string {
    return recipient.name || `Usuario ${recipient.id}`;
  }

  /**
   * Get recipient avatar
   */
  getRecipientAvatar(recipient: MessageRecipient): string {
    return recipient.avatar || 'assets/img/user-default.png';
  }
}
