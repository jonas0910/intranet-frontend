import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  private audioContext: AudioContext | null = null;
  private enabled = true;
  private isInitialized = false;
  private userInteracted = false;

  constructor() {
    // Set up listener for first user interaction
    if (typeof window !== 'undefined') {
      this.setupUserInteractionListener();
      // Load saved preference
      const stored = localStorage.getItem('notification_sound_enabled');
      this.enabled = stored !== null ? stored === 'true' : true;
    }
  }

  private setupUserInteractionListener(): void {
    const initOnInteraction = () => {
      this.userInteracted = true;
      this.ensureAudioContext();
      // Remove listeners after first interaction
      document.removeEventListener('click', initOnInteraction);
      document.removeEventListener('keydown', initOnInteraction);
      document.removeEventListener('touchstart', initOnInteraction);
    };

    document.addEventListener('click', initOnInteraction, { once: true });
    document.addEventListener('keydown', initOnInteraction, { once: true });
    document.addEventListener('touchstart', initOnInteraction, { once: true });
  }

  private ensureAudioContext(): void {
    if (this.isInitialized || !this.userInteracted) {
      return;
    }

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.isInitialized = true;

      // Resume if suspended
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume().catch(err => {
          console.warn('Failed to resume AudioContext:', err);
        });
      }
    } catch (error) {
      console.warn('Web Audio API not supported:', error);
    }
  }

  /**
   * Play notification sound using Web Audio API
   */
  playNotification(): void {
    if (!this.enabled) {
      return;
    }

    // Ensure AudioContext is ready
    this.ensureAudioContext();

    if (!this.audioContext || this.audioContext.state !== 'running') {
      console.warn('AudioContext not ready. User interaction may be required.');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Configure pleasant notification sound
      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(
        600,
        this.audioContext.currentTime + 0.1
      );

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.3
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.error('Error playing notification sound:', error);
    }
  }

  /**
   * Play message sent sound (different tone)
   */
  playMessageSent(): void {
    if (!this.enabled) {
      return;
    }

    // Ensure AudioContext is ready
    this.ensureAudioContext();

    if (!this.audioContext || this.audioContext.state !== 'running') {
      console.warn('AudioContext not ready. User interaction may be required.');
      return;
    }

    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Lower pitch for sent messages
      oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
      gainNode.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.15
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.15);
    } catch (error) {
      console.error('Error playing sent sound:', error);
    }
  }

  /**
   * Enable/disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    localStorage.setItem('notification_sound_enabled', enabled.toString());
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Initialize on user interaction (required by browsers)
   * This is now handled automatically by event listeners
   */
  initializeOnUserInteraction(): void {
    this.userInteracted = true;
    this.ensureAudioContext();

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().catch(err => {
        console.warn('Failed to resume AudioContext:', err);
      });
    }
  }
}
