import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChatService } from './chat.service';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';
import { ChatMessage } from '../models/models';

/**
 * Composant haut niveau pour le chat d'une room :
 *   - charge l'historique via REST
 *   - branche le WebSocket pour les nouveaux messages
 *   - expose une signature simple via signals
 *
 * Usage :
 *   const chat = inject(RealtimeChatService);
 *   chat.openRoom('room-id');
 *   ...template : @for (msg of chat.messages(); ...)
 *   chat.send('Hello !');
 *   chat.closeRoom();
 */
@Injectable({ providedIn: 'root' })
export class RealtimeChatService {

  private rest = inject(ChatService);
  private ws   = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly roomId = signal<string | null>(null);
  readonly messages = signal<ChatMessage[]>([]);
  readonly typingUserIds = signal<Set<string>>(new Set());
  readonly loaded = signal(false);

  readonly currentUserId = computed(() => this.auth.user()?.id);

  constructor() {
    // Auto-connexion WS quand on ouvre une room
    effect(() => {
      const room = this.roomId();
      if (room) this.ws.connect();
    });
  }

  async openRoom(roomId: string) {
    this.closeRoom();
    this.roomId.set(roomId);
    this.loaded.set(false);

    // 1) Historique via REST (les plus recents en premier cote backend, on reorder asc)
    try {
      const history = await firstValueFrom(this.rest.history(roomId, 0, 50));
      this.messages.set(
        [...history]
          .sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime())
          .map(m => ({ ...m, isMe: m.authorId === this.currentUserId() }))
      );
    } finally {
      this.loaded.set(true);
    }

    // 2) Push WS
    this.ws.subscribeRoom(roomId).subscribe(msg => {
      this.messages.update(list => {
        // Eviter les doublons si le sender recoit son propre echo
        if (list.some(m => m.id === msg.id)) return list;
        return [...list, { ...msg, isMe: msg.authorId === this.currentUserId() }];
      });
    });

    // 3) Typing indicator
    this.ws.subscribeTyping(roomId).subscribe(userId => {
      if (userId === this.currentUserId()) return;
      this.typingUserIds.update(s => new Set(s).add(userId));
      // Nettoyer apres 3s
      setTimeout(() => {
        this.typingUserIds.update(s => {
          const next = new Set(s);
          next.delete(userId);
          return next;
        });
      }, 3000);
    });
  }

  /** Envoie un message : WebSocket si connecte, fallback REST sinon. */
  async send(content: string): Promise<void> {
    const room = this.roomId();
    if (!room || !content.trim()) return;

    if (this.ws.connected()) {
      this.ws.sendMessage(room, content.trim());
      return;
    }
    // Fallback REST (sans temps reel)
    const saved = await firstValueFrom(this.rest.send(room, content.trim()));
    this.messages.update(l => [...l, { ...saved, isMe: true }]);
  }

  notifyTyping() {
    const room = this.roomId();
    if (room) this.ws.sendTyping(room);
  }

  closeRoom() {
    const room = this.roomId();
    if (room) this.ws.unsubscribeRoom(room);
    this.roomId.set(null);
    this.messages.set([]);
    this.typingUserIds.set(new Set());
    this.loaded.set(false);
  }
}
