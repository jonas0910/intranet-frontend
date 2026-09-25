import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatSidebarService } from '../chat-sidebar.service';
import { BadgeService } from '../../../services/badge.service';

@Component({
  selector: 'app-chat-trigger',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chat-floating-trigger" 
         (click)="toggle($event)" 
         [title]="'Mensajería'" 
         [class.has-unread]="unreadCount > 0"
         *ngIf="!isSidebarOpen"
         id="chat-sidebar-trigger">
      
      <div class="bubble-icon">
        <i class="fas fa-comments"></i>
      </div>

      <div class="unread-badge" *ngIf="unreadCount > 0">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </div>

      <div class="pulse-ring" *ngIf="unreadCount > 0"></div>
    </div>
  `,
  styles: [`
    .chat-floating-trigger {
      position: relative;
      width: 55px;
      height: 55px;
      background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
      border-radius: 50%;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      z-index: 1040;
      color: white;
      border: 2px solid rgba(255, 255, 255, 0.1);
    }

    .chat-floating-trigger:hover {
      transform: scale(1.1) translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg, #0088ff 0%, #0066cc 100%);
    }

    .bubble-icon {
      font-size: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.3s ease;
    }

    .bubble-icon i {
      margin: 0;
      padding: 0;
    }

    .chat-floating-trigger:hover .bubble-icon {
      transform: rotate(-10deg);
    }

    .unread-badge {
      position: absolute;
      top: -5px;
      right: -5px;
      background-color: #ff3b30;
      color: white;
      border-radius: 12px;
      padding: 0 8px;
      font-size: 11px;
      font-weight: bold;
      min-width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      z-index: 1;
    }

    .pulse-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: rgba(0, 123, 255, 0.4);
      animation: pulse 2s infinite;
      z-index: -1;
    }

    @keyframes pulse {
      0% {
        transform: scale(1);
        opacity: 1;
      }
      100% {
        transform: scale(1.5);
        opacity: 0;
      }
    }
  `]
})
export class ChatTriggerComponent implements OnInit, OnDestroy {
  private chatSidebarService = inject(ChatSidebarService);
  private badgeService = inject(BadgeService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  unreadCount = 0;
  isSidebarOpen = false;

  ngOnInit(): void {
    this.badgeService.unreadMessages$
      .pipe(takeUntil(this.destroy$))
      .subscribe(count => {
        this.unreadCount = count;
        this.cdr.detectChanges();
      });

    this.chatSidebarService.sidebarOpen$
      .pipe(takeUntil(this.destroy$))
      .subscribe(open => {
        this.isSidebarOpen = open;
        this.cdr.detectChanges();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  toggle(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.chatSidebarService.toggleSidebar();
  }
}
