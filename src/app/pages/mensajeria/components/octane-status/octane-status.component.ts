import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { OctaneSSEService } from '../../services/octane-sse.service';

@Component({
  selector: 'app-octane-status',
  template: `
    <div class="octane-status" [class]="statusClass">
      <div class="status-indicator">
        <i [class]="statusIcon"></i>
        <span class="status-text">{{ statusText }}</span>
      </div>
      
      <div class="status-details" *ngIf="showDetails">
        <div class="detail-item">
          <strong>Servidor:</strong> {{ serverInfo?.octane?.server || 'N/A' }}
        </div>
        <div class="detail-item">
          <strong>Workers:</strong> {{ serverInfo?.octane?.workers || 'N/A' }}
        </div>
        <div class="detail-item">
          <strong>Puerto:</strong> {{ serverInfo?.octane?.port || 'N/A' }}
        </div>
        <div class="detail-item">
          <strong>Swoole:</strong> {{ serverInfo?.swoole?.version || 'N/A' }}
        </div>
        <div class="detail-item">
          <strong>Conexiones:</strong> {{ serverInfo?.connections?.total_connections || 0 }}
        </div>
        <div class="detail-item">
          <strong>Memoria:</strong> {{ formatBytes(serverInfo?.system?.memory_usage || 0) }}
        </div>
      </div>
      
      <button class="toggle-details" (click)="toggleDetails()">
        {{ showDetails ? 'Ocultar' : 'Ver' }} detalles
      </button>
    </div>
  `,
  styles: [`
    .octane-status {
      background: #f8f9fa;
      border: 1px solid #dee2e6;
      border-radius: 8px;
      padding: 12px;
      margin: 10px 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }

    .octane-status.connected {
      background: #d4edda;
      border-color: #c3e6cb;
      color: #155724;
    }

    .octane-status.disconnected {
      background: #f8d7da;
      border-color: #f5c6cb;
      color: #721c24;
    }

    .octane-status.connecting {
      background: #fff3cd;
      border-color: #ffeaa7;
      color: #856404;
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .status-icon {
      font-size: 16px;
    }

    .status-text {
      font-weight: 600;
      font-size: 14px;
    }

    .status-details {
      background: rgba(255, 255, 255, 0.7);
      border-radius: 4px;
      padding: 8px;
      margin: 8px 0;
      font-size: 12px;
    }

    .detail-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }

    .detail-item:last-child {
      margin-bottom: 0;
    }

    .toggle-details {
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 12px;
      cursor: pointer;
      transition: background-color 0.2s;
    }

    .toggle-details:hover {
      background: #0056b3;
    }

    .connected .status-icon::before {
      content: '✅';
    }

    .disconnected .status-icon::before {
      content: '❌';
    }

    .connecting .status-icon::before {
      content: '🔄';
    }
  `]
})
export class OctaneStatusComponent implements OnInit, OnDestroy {
  showDetails = false;
  serverInfo: any = null;
  private subscriptions: Subscription[] = [];

  constructor(private octaneSSEService: OctaneSSEService) {}

  ngOnInit(): void {
    // Suscribirse al estado de SSE
    this.subscriptions.push(
      this.octaneSSEService.status$.subscribe(status => {
        this.updateStatus(status);
      })
    );

    // Obtener información del servidor
    this.loadServerInfo();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private updateStatus(status: any): void {
    // El estado se actualiza automáticamente a través del binding
  }

  private loadServerInfo(): void {
    this.subscriptions.push(
      this.octaneSSEService.getServerStats().subscribe({
        next: (info) => {
          this.serverInfo = info;
        },
        error: (error) => {
          console.error('Error cargando información del servidor:', error);
          this.serverInfo = null;
        }
      })
    );
  }

  toggleDetails(): void {
    this.showDetails = !this.showDetails;
    if (this.showDetails && !this.serverInfo) {
      this.loadServerInfo();
    }
  }

  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get statusClass(): string {
    const status = this.octaneSSEService.getCurrentStatus();
    if (status.connected) return 'connected';
    if (status.error) return 'disconnected';
    return 'connecting';
  }

  get statusIcon(): string {
    const status = this.octaneSSEService.getCurrentStatus();
    if (status.connected) return 'status-icon connected';
    if (status.error) return 'status-icon disconnected';
    return 'status-icon connecting';
  }

  get statusText(): string {
    const status = this.octaneSSEService.getCurrentStatus();
    if (status.connected) return 'Octane SSE Conectado';
    if (status.error) return `Octane SSE Desconectado: ${status.error}`;
    return 'Conectando a Octane SSE...';
  }
}


