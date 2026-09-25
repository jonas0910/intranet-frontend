import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface UserConfig {
  currentUserId: number | null;
  defaultRecipientId: number | null;
  systemUserId: number | null;
}

@Injectable({
  providedIn: 'root'
})
export class AppConfigService {
  private userConfigSubject = new BehaviorSubject<UserConfig>({
    currentUserId: null,
    defaultRecipientId: null,
    systemUserId: null
  });

  public userConfig$ = this.userConfigSubject.asObservable();

  constructor() {
    this.loadUserConfig();
  }

  /**
   * Load user configuration from localStorage or API
   */
  private loadUserConfig(): void {
    // Try to get from localStorage first
    const savedConfig = localStorage.getItem('userConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.userConfigSubject.next(config);
        return;
      } catch (error) {
        console.warn('Failed to parse saved user config:', error);
      }
    }

    // If no saved config, initialize with null values
    // These will be set dynamically when user logs in
    this.userConfigSubject.next({
      currentUserId: null,
      defaultRecipientId: null,
      systemUserId: null
    });
  }

  /**
   * Set current user ID
   */
  setCurrentUserId(userId: number): void {
    const currentConfig = this.userConfigSubject.value;
    const newConfig = { ...currentConfig, currentUserId: userId };
    this.userConfigSubject.next(newConfig);
    this.saveUserConfig(newConfig);
  }

  /**
   * Set default recipient ID
   */
  setDefaultRecipientId(recipientId: number): void {
    const currentConfig = this.userConfigSubject.value;
    const newConfig = { ...currentConfig, defaultRecipientId: recipientId };
    this.userConfigSubject.next(newConfig);
    this.saveUserConfig(newConfig);
  }

  /**
   * Set system user ID
   */
  setSystemUserId(systemUserId: number): void {
    const currentConfig = this.userConfigSubject.value;
    const newConfig = { ...currentConfig, systemUserId: systemUserId };
    this.userConfigSubject.next(newConfig);
    this.saveUserConfig(newConfig);
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): number | null {
    return this.userConfigSubject.value.currentUserId;
  }

  /**
   * Get default recipient ID
   */
  getDefaultRecipientId(): number | null {
    return this.userConfigSubject.value.defaultRecipientId;
  }

  /**
   * Get system user ID
   */
  getSystemUserId(): number | null {
    return this.userConfigSubject.value.systemUserId;
  }

  /**
   * Get current user ID as Observable
   */
  getCurrentUserId$(): Observable<number | null> {
    return this.userConfigSubject.pipe(
      map(config => config.currentUserId)
    );
  }

  /**
   * Get default recipient ID as Observable
   */
  getDefaultRecipientId$(): Observable<number | null> {
    return this.userConfigSubject.pipe(
      map(config => config.defaultRecipientId)
    );
  }

  /**
   * Check if user config is complete
   */
  isUserConfigComplete(): boolean {
    const config = this.userConfigSubject.value;
    return config.currentUserId !== null && 
           config.defaultRecipientId !== null && 
           config.systemUserId !== null;
  }

  /**
   * Save user config to localStorage
   */
  private saveUserConfig(config: UserConfig): void {
    try {
      localStorage.setItem('userConfig', JSON.stringify(config));
    } catch (error) {
      console.warn('Failed to save user config:', error);
    }
  }

  /**
   * Clear user config
   */
  clearUserConfig(): void {
    localStorage.removeItem('userConfig');
    this.userConfigSubject.next({
      currentUserId: null,
      defaultRecipientId: null,
      systemUserId: null
    });
  }
}

// Import map operator
import { map } from 'rxjs/operators';












