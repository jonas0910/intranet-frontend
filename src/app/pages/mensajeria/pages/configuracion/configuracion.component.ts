import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ThemeService } from '../../../../services/theme.service';

interface ConfigData {
  limits: {
    max_attachments: number;
    max_file_size: number;
    max_message_length: number;
    max_recipients: number;
  };
  cleanup: {
    days_to_keep: number;
    auto_cleanup: boolean;
  };
  notifications: {
    email_enabled: boolean;
    push_enabled: boolean;
    sound_enabled: boolean;
  };
  security: {
    rate_limit: number;
    require_approval: boolean;
    scan_attachments: boolean;
  };
  features: {
    broadcast_enabled: boolean;
    templates_enabled: boolean;
    folders_enabled: boolean;
    search_enabled: boolean;
  };
  cache: {
    ttl: number;
    prefix: string;
  };
}

interface Statistics {
  messages: {
    total: number;
    today: number;
    unread: number;
    this_week: number;
    this_month: number;
  };
  conversations: {
    total: number;
    active: number;
    individual: number;
    group: number;
  };
  users: {
    total: number;
    active: number;
    with_messages: number;
  };
  storage: {
    attachments_size: number;
    attachments_count: number;
    avg_file_size: number;
  };
  performance: {
    cache_hit_rate: number;
    avg_response_time: number;
    queue_size: number;
  };
  system: {
    last_cleanup: string | null;
    database_size: number;
    cache_entries: number;
  };
}

interface TestResult {
  passed: boolean;
  message: string;
}

interface TestResults {
  database: TestResult;
  cache: TestResult;
  storage: TestResult;
  permissions: TestResult;
  websocket: TestResult;
  queue: TestResult;
}

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './configuracion.component.html',
  styleUrls: ['./configuracion.component.css']
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  configForm: FormGroup;
  userPreferencesForm: FormGroup;
  themeForm: FormGroup;
  privacyForm: FormGroup;
  storageForm: FormGroup;
  
  configData: ConfigData | null = null;
  statistics: Statistics | null = null;
  testResults: TestResults | null = null;
  userPreferences: any = null;
  storageInfo: any = null;
  
  loading = false;
  saving = false;
  testing = false;
  resetting = false;
  cleaningStorage = false;
  
  activeTab = 'general';
  
  private apiUrl = `${environment.apiUrl}/v1/mensajeria/config`;
  private userPrefsUrl = `${environment.apiUrl}/v1/mensajeria/user-preferences`;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private themeService: ThemeService,
    private route: ActivatedRoute
  ) {
    // System configuration form
    this.configForm = this.fb.group({
      limits: this.fb.group({
        max_attachments: [5, [Validators.min(1), Validators.max(10)]],
        max_file_size: [10240, [Validators.min(1024), Validators.max(51200)]],
        max_message_length: [10000, [Validators.min(1000), Validators.max(50000)]],
        max_recipients: [100, [Validators.min(10), Validators.max(1000)]]
      }),
      cleanup: this.fb.group({
        days_to_keep: [90, [Validators.min(30), Validators.max(365)]],
        auto_cleanup: [true]
      }),
      notifications: this.fb.group({
        email_enabled: [true],
        push_enabled: [true],
        sound_enabled: [true]
      }),
      security: this.fb.group({
        rate_limit: [60, [Validators.min(10), Validators.max(300)]],
        require_approval: [false],
        scan_attachments: [true]
      }),
      features: this.fb.group({
        broadcast_enabled: [true],
        templates_enabled: [true],
        folders_enabled: [true],
        search_enabled: [true]
      }),
      cache: this.fb.group({
        ttl: [300, [Validators.min(60), Validators.max(3600)]],
        prefix: ['mensajeria:']
      })
    });

    // User preferences form (notifications)
    this.userPreferencesForm = this.fb.group({
      email_notifications: [true],
      push_notifications: [true],
      sound_notifications: [true],
      desktop_notifications: [true],
      notify_on_message: [true],
      notify_on_mention: [true],
      notify_on_reply: [true],
      notify_on_group_message: [false],
      quiet_hours_enabled: [false],
      quiet_hours_start: ['22:00'],
      quiet_hours_end: ['08:00'],
      notification_sound: ['default']
    });

    // Theme form
    this.themeForm = this.fb.group({
      theme_mode: ['light'], // light, dark, auto
      primary_color: ['#007bff'],
      accent_color: ['#17a2b8'],
      font_size: ['medium'], // small, medium, large
      compact_mode: [false],
      show_avatars: [true],
      show_timestamps: [true],
      message_preview: [true],
      animations_enabled: [true]
    });

    // Privacy form
    this.privacyForm = this.fb.group({
      show_online_status: [true],
      show_last_seen: [true],
      show_typing_indicator: [true],
      show_read_receipts: [true],
      allow_group_invites: [true],
      allow_channel_invites: [true],
      who_can_message: ['everyone'], // everyone, contacts, nobody
      who_can_add_to_groups: ['everyone'], // everyone, contacts, admins
      block_unknown_senders: [false],
      auto_archive_read: [false],
      data_retention_days: [365, [Validators.min(30), Validators.max(730)]]
    });

    // Storage form
    this.storageForm = this.fb.group({
      auto_download_images: [true],
      auto_download_files: [false],
      auto_download_max_size: [5120, [Validators.min(1024), Validators.max(10240)]],
      cache_media: [true],
      compress_images: [false],
      delete_old_media_days: [90, [Validators.min(30), Validators.max(365)]]
    });
  }

  ngOnInit(): void {
    this.loadConfiguration();
    this.loadStatistics();
    this.loadUserPreferences();
    this.loadStorageInfo();
    
    // Listen to URL fragment changes to activate the correct tab
    this.route.fragment.pipe(takeUntil(this.destroy$)).subscribe(fragment => {
      if (fragment && ['general', 'estadisticas', 'pruebas', 'notificaciones', 'tema', 'privacidad', 'storage'].includes(fragment)) {
        this.activeTab = fragment;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadConfiguration(): void {
    this.loading = true;
    this.http.get<{success: boolean, data: ConfigData}>(this.apiUrl).subscribe({
      next: (response) => {
        if (response.success) {
          this.configData = response.data;
          this.configForm.patchValue(response.data);
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading configuration:', error);
        this.loading = false;
      }
    });
  }

  loadStatistics(): void {
    this.http.get<{success: boolean, data: Statistics}>(`${this.apiUrl}/statistics`).subscribe({
      next: (response) => {
        if (response.success) {
          this.statistics = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading statistics:', error);
      }
    });
  }

  saveConfiguration(): void {
    if (this.configForm.valid) {
      this.saving = true;
      const configData = this.configForm.value;
      
      this.http.put<{success: boolean, message: string}>(this.apiUrl, configData).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Configuración guardada exitosamente');
            this.loadConfiguration();
          } else {
            alert('Error al guardar configuración: ' + response.message);
          }
          this.saving = false;
        },
        error: (error) => {
          console.error('Error saving configuration:', error);
          alert('Error al guardar configuración');
          this.saving = false;
        }
      });
    } else {
      alert('Por favor, corrija los errores en el formulario');
    }
  }

  testConfiguration(): void {
    this.testing = true;
    this.http.post<{success: boolean, tests: TestResults, message: string}>(`${this.apiUrl}/test`, {}).subscribe({
      next: (response) => {
        this.testResults = response.tests;
        if (response.success) {
          alert('Todas las pruebas pasaron exitosamente');
        } else {
          alert('Algunas pruebas fallaron. Revisa los resultados.');
        }
        this.testing = false;
      },
      error: (error) => {
        console.error('Error testing configuration:', error);
        alert('Error al ejecutar las pruebas');
        this.testing = false;
      }
    });
  }

  resetConfiguration(): void {
    if (confirm('¿Estás seguro de que quieres restablecer la configuración a los valores por defecto?')) {
      this.resetting = true;
      this.http.post<{success: boolean, message: string, data: ConfigData}>(`${this.apiUrl}/reset`, {}).subscribe({
        next: (response) => {
          if (response.success) {
            alert('Configuración restablecida exitosamente');
            this.configData = response.data;
            this.configForm.patchValue(response.data);
          } else {
            alert('Error al restablecer configuración: ' + response.message);
          }
          this.resetting = false;
        },
        error: (error) => {
          console.error('Error resetting configuration:', error);
          alert('Error al restablecer configuración');
          this.resetting = false;
        }
      });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  getPercentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  getTestIcon(test: TestResult): string {
    return test.passed ? 'check-circle' : 'times-circle';
  }

  getTestClass(test: TestResult): string {
    return test.passed ? 'text-success' : 'text-danger';
  }

  // User Preferences Methods
  loadUserPreferences(): void {
    this.http.get<{success: boolean, data: any}>(this.userPrefsUrl).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.userPreferences = response.data;
          this.userPreferencesForm.patchValue(response.data);
          this.themeForm.patchValue(response.data.theme || {});
          this.privacyForm.patchValue(response.data.privacy || {});
          this.storageForm.patchValue(response.data.storage || {});
        }
      },
      error: (error) => {
        console.error('Error loading user preferences:', error);
      }
    });
  }

  saveUserPreferences(): void {
    this.saving = true;
    const prefs = {
      notifications: this.userPreferencesForm.value,
      theme: this.themeForm.value,
      privacy: this.privacyForm.value,
      storage: this.storageForm.value
    };

    this.http.put<{success: boolean, message: string}>(this.userPrefsUrl, prefs).subscribe({
      next: (response) => {
        alert('Preferencias guardadas exitosamente');
        this.applyTheme();
        this.saving = false;
      },
      error: (error) => {
        console.error('Error saving preferences:', error);
        alert('Error al guardar preferencias');
        this.saving = false;
      }
    });
  }

  applyTheme(): void {
    const theme = this.themeForm.value;
    this.themeService.applyTheme(theme);
  }

  loadStorageInfo(): void {
    this.http.get<{success: boolean, data: any}>(`${this.apiUrl}/storage`).subscribe({
      next: (response) => {
        if (response.success) {
          this.storageInfo = response.data;
        }
      },
      error: (error) => {
        console.error('Error loading storage info:', error);
        // Load mock data
        this.storageInfo = {
          total_size: 256000000,
          used_size: 89500000,
          attachments_count: 342,
          cached_items: 156,
          largest_files: [
            { name: 'presentation.pdf', size: 5242880, date: '2025-10-01' },
            { name: 'video.mp4', size: 15728640, date: '2025-10-05' }
          ]
        };
      }
    });
  }

  clearCache(): void {
    if (confirm('¿Limpiar toda la caché de mensajería? Esto mejorará el rendimiento.')) {
      this.cleaningStorage = true;
      this.http.post<{success: boolean, message: string}>(`${this.apiUrl}/clear-cache`, {}).subscribe({
        next: (response) => {
          alert('Caché limpiada exitosamente');
          this.loadStorageInfo();
          this.cleaningStorage = false;
        },
        error: (error) => {
          console.error('Error clearing cache:', error);
          alert('Error al limpiar la caché');
          this.cleaningStorage = false;
        }
      });
    }
  }

  clearOldAttachments(): void {
    const days = this.storageForm.get('delete_old_media_days')?.value || 90;
    
    if (confirm(`¿Eliminar archivos adjuntos de más de ${days} días? Esta acción no se puede deshacer.`)) {
      this.cleaningStorage = true;
      this.http.post<{success: boolean, message: string, deleted_count: number}>(
        `${this.apiUrl}/clean-attachments`, 
        { days }
      ).subscribe({
        next: (response) => {
          alert(`${response.deleted_count || 0} archivo(s) eliminado(s)`);
          this.loadStorageInfo();
          this.cleaningStorage = false;
        },
        error: (error) => {
          console.error('Error cleaning attachments:', error);
          alert('Error al limpiar archivos');
          this.cleaningStorage = false;
        }
      });
    }
  }

  testNotificationSound(): void {
    const sound = this.userPreferencesForm.get('notification_sound')?.value || 'default';
    console.log('🔊 Testing notification sound:', sound);
    
    // Play test sound
    try {
      const audio = new Audio(`assets/sounds/${sound}.mp3`);
      audio.play().catch(() => {
        // Fallback to Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
      });
    } catch (error) {
      console.error('Error playing sound:', error);
    }
  }

  requestNotificationPermission(): void {
    if ('Notification' in window) {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          alert('Permisos de notificación concedidos');
          new Notification('Mensajería', {
            body: 'Las notificaciones están habilitadas',
            icon: 'assets/img/icons/notification.png'
          });
        } else {
          alert('Permisos de notificación denegados');
        }
      });
    } else {
      alert('Este navegador no soporta notificaciones');
    }
  }

  getStoragePercentage(): number {
    if (!this.storageInfo) return 0;
    return Math.round((this.storageInfo.used_size / this.storageInfo.total_size) * 100);
  }

  getStorageBarColor(): string {
    const percentage = this.getStoragePercentage();
    if (percentage > 80) return 'danger';
    if (percentage > 60) return 'warning';
    return 'info';
  }
}
