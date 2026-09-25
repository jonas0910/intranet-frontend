import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService, User } from './auth.service';

export interface InboxContext {
  userId: number | null;
  userName: string | null;
  isCurrentUser: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InboxContextService {
  private inboxContextSubject = new BehaviorSubject<InboxContext>({
    userId: null,
    userName: null,
    isCurrentUser: true
  });

  public inboxContext$ = this.inboxContextSubject.asObservable();

  constructor(private authService: AuthService) {
    this.initializeContext();
  }

  /**
   * Initialize inbox context with current authenticated user
   */
  private initializeContext(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.setInboxUser(currentUser.id, currentUser.name, true);
    }
  }

  /**
   * Set the inbox user context
   */
  setInboxUser(userId: number, userName: string, isCurrentUser: boolean = false): void {
    const context: InboxContext = {
      userId,
      userName,
      isCurrentUser
    };
    
    this.inboxContextSubject.next(context);
    console.log('📧 Inbox context updated:', context);
  }

  /**
   * Get current inbox context
   */
  getCurrentContext(): InboxContext {
    return this.inboxContextSubject.value;
  }

  /**
   * Get current inbox context as Observable
   */
  getCurrentContext$(): Observable<InboxContext> {
    return this.inboxContextSubject.asObservable();
  }

  /**
   * Get current inbox user ID
   */
  getCurrentInboxUserId(): number | null {
    return this.inboxContextSubject.value.userId;
  }

  /**
   * Get current inbox user ID as Observable
   */
  getCurrentInboxUserId$(): Observable<number | null> {
    return this.inboxContextSubject.pipe(
      map((context: InboxContext) => context.userId)
    );
  }

  /**
   * Check if viewing current user's inbox
   */
  isViewingCurrentUserInbox(): boolean {
    return this.inboxContextSubject.value.isCurrentUser;
  }

  /**
   * Reset to current authenticated user's inbox
   */
  resetToCurrentUser(): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.setInboxUser(currentUser.id, currentUser.name, true);
    }
  }

  /**
   * Switch to a different user's inbox
   */
  switchToUser(userId: number, userName: string): void {
    this.setInboxUser(userId, userName, false);
  }
}

// Import map operator
import { map } from 'rxjs/operators';
