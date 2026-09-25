import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { ChatSidebarService, MiniChat } from './chat-sidebar.service';
import { ControlSidebarComponent } from './control-sidebar/control-sidebar.component';
import { MiniChatBoxComponent } from './mini-chat-box/mini-chat-box.component';
import { ChatTriggerComponent } from './chat-trigger/chat-trigger.component';
//import { NewChatModalComponent } from './new-chat-modal/new-chat-modal.component';

@Component({
  selector: 'app-chat-sidebar-system',
  standalone: true,
  imports: [CommonModule, ControlSidebarComponent, MiniChatBoxComponent, ChatTriggerComponent],
  template: `
    <!-- Control Sidebar (Right Sidebar) -->
    <app-control-sidebar></app-control-sidebar>

    <!-- Mini Chat Boxes Container -->
    <div class="mini-chats-container">
      <!-- Right-most spacer that adjusts when sidebar is open -->
      <div class="sidebar-spacer" 
           [style.width.px]="isSidebarOpen ? 320 : 0"
           [style.transition]="'width 0.35s ease-in-out'">
      </div>

      <!-- Floating Trigger Button -->
      <div class="trigger-wrapper">
        <app-chat-trigger></app-chat-trigger>
      </div>

      <!-- Chat boxes flow from right to left starting after the spacer -->
      <app-mini-chat-box 
        *ngFor="let chat of openMiniChats"
        [conversation]="chat.conversation"
        [minimized]="chat.minimized"
        [style.z-index]="chat.zIndex"
        (onClose)="closeMiniChat($event)"
        (onMinimize)="minimizeMiniChat($event)">
      </app-mini-chat-box>
    </div>
  `,
  styles: [`
    .mini-chats-container {
      position: fixed;
      bottom: 0;
      right: 0;
      display: flex;
      flex-direction: row-reverse;
      align-items: flex-end;
      pointer-events: none;
      z-index: 1035;
      padding-right: 20px; /* Small safety gap from screen edge or sidebar */
      gap: 20px;
    }

    .mini-chats-container > * {
      pointer-events: auto;
    }

    .sidebar-spacer {
       flex-shrink: 0;
       height: 1px;
       pointer-events: none;
    }

    .trigger-wrapper {
      margin-bottom: 20px;
    }
  `]
})
export class ChatSidebarSystemComponent implements OnInit, OnDestroy {
  private chatSidebarService = inject(ChatSidebarService);
  private cdr = inject(ChangeDetectorRef);
  private destroy$ = new Subject<void>();

  openMiniChats: MiniChat[] = [];

  ngOnInit(): void {
    this.chatSidebarService.openChats$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(chats => {
      this.openMiniChats = chats;
      this.cdr.detectChanges();
    });

    this.chatSidebarService.sidebarOpen$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(open => {
      this.isSidebarOpen = open;
      this.cdr.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  closeMiniChat(id: number): void {
    this.chatSidebarService.closeChat(id);
  }

  minimizeMiniChat(id: number): void {
    this.chatSidebarService.minimizeChat(id);
  }

  isSidebarOpen = false;
}
