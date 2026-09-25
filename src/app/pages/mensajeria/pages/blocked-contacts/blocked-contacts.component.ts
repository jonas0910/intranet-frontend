import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService } from '../../services/message.service';

interface BlockedContact {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar?: string;
  blocked_at: string;
  reason?: string;
}

@Component({
  selector: 'app-blocked-contacts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './blocked-contacts.component.html',
  styleUrls: ['./blocked-contacts.component.scss']
})
export class BlockedContactsComponent implements OnInit {
  blockedContacts: BlockedContact[] = [];
  loading = false;
  searchQuery = '';

  constructor(private messageService: MessageService) {}

  ngOnInit(): void {
    this.loadBlockedContacts();
  }

  loadBlockedContacts(): void {
    this.loading = true;
    this.messageService.getBlockedContacts().subscribe({
      next: (response: any) => {
        if (response.success) {
          this.blockedContacts = response.data || [];
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading blocked contacts:', error);
        this.loading = false;
      }
    });
  }

  get filteredContacts(): BlockedContact[] {
    if (!this.searchQuery) {
      return this.blockedContacts;
    }
    
    const query = this.searchQuery.toLowerCase();
    return this.blockedContacts.filter(contact => 
      contact.name.toLowerCase().includes(query) ||
      contact.email.toLowerCase().includes(query)
    );
  }

  unblockContact(contact: BlockedContact): void {
    if (confirm(`¿Desbloquear a ${contact.name}?`)) {
      this.messageService.unblockContact(contact.user_id).subscribe({
        next: (response: any) => {
          if (response.success) {
            alert('Contacto desbloqueado exitosamente');
            this.loadBlockedContacts();
          }
        },
        error: (error) => {
          console.error('Error unblocking contact:', error);
          alert('Error al desbloquear contacto');
        }
      });
    }
  }

  onImageError(event: any): void {
    event.target.src = 'assets/img/user-default.png';
  }

  getTimeAgo(date: string): string {
    const now = new Date();
    const blocked = new Date(date);
    const diffMs = now.getTime() - blocked.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoy';
    if (diffDays === 1) return 'Ayer';
    if (diffDays < 7) return `Hace ${diffDays} días`;
    if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `Hace ${Math.floor(diffDays / 30)} meses`;
    return `Hace ${Math.floor(diffDays / 365)} años`;
  }
}









