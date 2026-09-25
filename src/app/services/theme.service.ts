import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export interface ThemeSettings {
  theme_mode: 'light' | 'dark' | 'auto';
  primary_color: string;
  accent_color: string;
  font_size: 'small' | 'medium' | 'large';
  compact_mode: boolean;
  show_avatars: boolean;
  show_timestamps: boolean;
  message_preview: boolean;
  animations_enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly STORAGE_KEY = 'mensajeria_theme';
  private defaultTheme: ThemeSettings = {
    theme_mode: 'light',
    primary_color: '#007bff',
    accent_color: '#17a2b8',
    font_size: 'medium',
    compact_mode: false,
    show_avatars: true,
    show_timestamps: true,
    message_preview: true,
    animations_enabled: true
  };

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Load theme from localStorage and apply it
   */
  loadTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    try {
      const storedTheme = localStorage.getItem(this.STORAGE_KEY);
      const theme: ThemeSettings = storedTheme ? JSON.parse(storedTheme) : this.defaultTheme;
      this.applyTheme(theme);
    } catch (error) {
      console.error('Error loading theme:', error);
      this.applyTheme(this.defaultTheme);
    }
  }

  /**
   * Apply theme settings to the document
   */
  applyTheme(theme: ThemeSettings): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const body = document.body;

    // Apply theme mode
    body.classList.remove('theme-light', 'theme-dark');
    if (theme.theme_mode === 'dark') {
      body.classList.add('theme-dark');
    } else if (theme.theme_mode === 'light') {
      body.classList.add('theme-light');
    } else {
      // Auto mode - detect system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        body.classList.add('theme-dark');
      } else {
        body.classList.add('theme-light');
      }
    }

    // Apply font size
    body.classList.remove('font-small', 'font-medium', 'font-large');
    body.classList.add(`font-${theme.font_size}`);

    // Apply compact mode
    if (theme.compact_mode) {
      body.classList.add('compact-mode');
    } else {
      body.classList.remove('compact-mode');
    }

    // Apply custom colors via CSS variables
    document.documentElement.style.setProperty('--primary-color', theme.primary_color);
    document.documentElement.style.setProperty('--accent-color', theme.accent_color);

    // Apply animations
    if (!theme.animations_enabled) {
      body.classList.add('no-animations');
    } else {
      body.classList.remove('no-animations');
    }

    // Save to localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(theme));
  }

  /**
   * Get current theme settings
   */
  getCurrentTheme(): ThemeSettings {
    if (!isPlatformBrowser(this.platformId)) {
      return this.defaultTheme;
    }

    try {
      const storedTheme = localStorage.getItem(this.STORAGE_KEY);
      return storedTheme ? JSON.parse(storedTheme) : this.defaultTheme;
    } catch (error) {
      console.error('Error getting current theme:', error);
      return this.defaultTheme;
    }
  }

  /**
   * Watch for system theme changes (for auto mode)
   */
  watchSystemTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    darkModeQuery.addEventListener('change', (e) => {
      const currentTheme = this.getCurrentTheme();
      if (currentTheme.theme_mode === 'auto') {
        this.applyTheme(currentTheme);
      }
    });
  }
}









