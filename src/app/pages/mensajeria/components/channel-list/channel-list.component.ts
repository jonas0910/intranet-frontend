import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../environments/environment';

export interface Channel {
  id: number;
  nombre: string;
  descripcion: string;
  tipo: 'publico' | 'privado' | 'grupo';
  icono?: string;
  color?: string;
  unread_count?: number;
  activo: number;
}

@Component({
  selector: 'app-channel-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './channel-list.component.html',
  styleUrls: ['./channel-list.component.scss']
})
export class ChannelListComponent implements OnInit {
  @Output() channelSelected = new EventEmitter<Channel>();

  channels: Channel[] = [];
  selectedChannelId: number | null = null;
  loading = false;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadChannels();
  }

  private loadChannels(): void {
    this.loading = true;
    this.http.get<{ success: boolean; data: Channel[] }>(`${environment.apiUrl}/chat/canales`)
      .subscribe({
        next: (response) => {
          this.channels = response.data;
          this.loading = false;

          // Auto-select first channel
          if (this.channels.length > 0 && !this.selectedChannelId) {
            this.selectChannel(this.channels[0]);
          }
        },
        error: (error) => {
          console.error('Error loading channels:', error);
          this.loading = false;
        }
      });
  }

  selectChannel(channel: Channel): void {
    this.selectedChannelId = channel.id;
    this.channelSelected.emit(channel);
  }

  isSelected(channelId: number): boolean {
    return this.selectedChannelId === channelId;
  }

  getChannelIcon(channel: Channel): string {
    if (channel.icono) return channel.icono;

    switch (channel.tipo) {
      case 'publico': return 'fas fa-hashtag';
      case 'privado': return 'fas fa-lock';
      case 'grupo': return 'fas fa-users';
      default: return 'fas fa-comments';
    }
  }

  getChannelColor(channel: Channel): string {
    if (channel.color) return channel.color;

    switch (channel.tipo) {
      case 'publico': return 'primary';
      case 'privado': return 'warning';
      case 'grupo': return 'success';
      default: return 'secondary';
    }
  }

  refreshChannels(): void {
    this.loadChannels();
  }
}
