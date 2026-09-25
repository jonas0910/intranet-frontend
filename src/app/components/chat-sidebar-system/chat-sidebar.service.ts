import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface MiniChat {
  id: number;
  conversation: any;
  minimized: boolean;
  zIndex: number;
}

@Injectable({
  providedIn: 'root'
})
export class ChatSidebarService {
  private sidebarOpen = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpen.asObservable();

  private openChatsSubject = new BehaviorSubject<MiniChat[]>([]);
  openChats$ = this.openChatsSubject.asObservable();

  private maxChats = 3;
  private currentZIndex = 1100;

  toggleSidebar(): void {
    const nextState = !this.sidebarOpen.value;
    this.setSidebarOpen(nextState);
  }

  setSidebarOpen(open: boolean): void {
    this.sidebarOpen.next(open);
    if (open) {
      document.body.classList.add('control-sidebar-slide-open');
    } else {
      document.body.classList.remove('control-sidebar-slide-open');
    }
  }

  isSidebarOpen(): boolean {
    return this.sidebarOpen.value;
  }

  openChat(conversation: any): void {
    const currentChats = this.openChatsSubject.value;
    const existingIndex = currentChats.findIndex(c => c.id === conversation.id);

    if (existingIndex !== -1) {
      // Just make sure it's not minimized
      const chat = currentChats[existingIndex];
      chat.minimized = false;
      chat.zIndex = ++this.currentZIndex;
      this.openChatsSubject.next([...currentChats]);
      return;
    }

    // Add new chat to the END (index grows away from sidebar)
    let newChats = [...currentChats];
    if (newChats.length >= this.maxChats) {
      // Remove oldest (at index 0 - the one "next to sidebar")
      newChats.shift();
    }

    const newChat: MiniChat = {
      id: conversation.id,
      conversation: conversation,
      minimized: false,
      zIndex: ++this.currentZIndex
    };

    newChats.push(newChat);
    this.openChatsSubject.next(newChats);
  }

  closeChat(id: number): void {
    const filtered = this.openChatsSubject.value.filter(c => c.id !== id);
    this.openChatsSubject.next(filtered);
  }

  minimizeChat(id: number): void {
    const chats = this.openChatsSubject.value;
    const chat = chats.find(c => c.id === id);
    if (chat) {
      chat.minimized = !chat.minimized;
      this.openChatsSubject.next([...chats]);
    }
  }
}
