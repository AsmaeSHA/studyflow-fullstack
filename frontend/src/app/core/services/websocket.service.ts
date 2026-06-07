import { Injectable, inject, signal, OnDestroy, NgZone } from '@angular/core';
import { Client, IMessage, StompSubscription, IFrame } from '@stomp/stompjs';
import { Subject, Observable } from 'rxjs';
import { environment } from '../../../environements/environment';
import { ChatMessage, GroupPresence, GroupRealtimeEvent, Notification } from '../models/models';

export interface TypingEvent {
  roomId: string;
  userId: string;
}

/**
 * Service WebSocket (SockJS + STOMP) pour le chat temps reel.
 *
 * Cycle de vie :
 *   1) connect()                                    -> ouvre la connexion (utilise le JWT)
 *   2) subscribeRoom(roomId)                        -> abonne au topic /topic/rooms/{roomId}
 *   3) sendMessage(roomId, content)                 -> publie sur /app/chat.send/{roomId}
 *   4) unsubscribeRoom(roomId) / disconnect()
 *
 * Le service est resilient : il se reconnecte automatiquement (5s) en cas de coupure.
 */
@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private zone = inject(NgZone);
  private client: Client | null = null;
  private subscriptions = new Map<string, StompSubscription>();
  private typingSubs   = new Map<string, StompSubscription>();
  private presenceSubs = new Map<string, StompSubscription>();
  private groupEventSubs = new Map<string, StompSubscription[]>();
  private notificationSubs = new Map<string, StompSubscription>();

  /** Subjects exposes pour s'abonner aux messages entrants par room. */
  private messageSubjects = new Map<string, Subject<ChatMessage>>();
  private typingSubjects  = new Map<string, Subject<string>>();
  private presenceSubjects = new Map<string, Subject<GroupPresence>>();
  private groupEventSubjects = new Map<string, Subject<GroupRealtimeEvent>>();
  private notificationSubjects = new Map<string, Subject<Notification>>();

  /** Statut de connexion observable (vrai = connecte). */
  readonly connected = signal(false);
  readonly reconnecting = signal(false);

  // ----------------------- Connexion -----------------------

  async connect(): Promise<void> {
  if (this.client?.connected) return;

  (globalThis as any).global = globalThis;
  (window as any).global = window;

  const SockJSModule = await import('sockjs-client');
  const SockJS = SockJSModule.default || SockJSModule;

  const token = localStorage.getItem('accessToken');

  this.client = new Client({
    webSocketFactory: () => new (SockJS as any)(environment.wsUrl),
    connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
    debug: () => {},
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,

    onConnect: () => {
      this.zone.run(() => {
        this.connected.set(true);
        this.reconnecting.set(false);

        for (const roomId of this.messageSubjects.keys()) this.attachRoom(roomId);
        for (const roomId of this.typingSubjects.keys()) this.attachTyping(roomId);
        for (const groupId of this.presenceSubjects.keys()) this.attachPresence(groupId);
        for (const groupId of this.groupEventSubjects.keys()) this.attachGroupEvents(groupId);
        for (const userId of this.notificationSubjects.keys()) this.attachNotifications(userId);
      });
    },

    onStompError: (frame: IFrame) => {
      return console.error('STOMP error', frame.headers['message'], frame.body);
    },

    onWebSocketClose: () => {
      this.zone.run(() => {
        this.connected.set(false);
        this.reconnecting.set(true);
      });
    }
  });

  this.client.activate();
}

  disconnect(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions.clear();
    this.typingSubs.forEach(s => s.unsubscribe());
    this.typingSubs.clear();
    this.presenceSubs.forEach(s => s.unsubscribe());
    this.presenceSubs.clear();
    this.groupEventSubs.forEach(list => list.forEach(s => s.unsubscribe()));
    this.groupEventSubs.clear();
    this.notificationSubs.forEach(s => s.unsubscribe());
    this.notificationSubs.clear();
    this.messageSubjects.forEach(s => s.complete());
    this.messageSubjects.clear();
    this.typingSubjects.forEach(s => s.complete());
    this.typingSubjects.clear();
    this.presenceSubjects.forEach(s => s.complete());
    this.presenceSubjects.clear();
    this.groupEventSubjects.forEach(s => s.complete());
    this.groupEventSubjects.clear();
    this.notificationSubjects.forEach(s => s.complete());
    this.notificationSubjects.clear();
    this.client?.deactivate();
    this.connected.set(false);
  }

  // ----------------------- Rooms -----------------------

  /** Retourne un Observable<ChatMessage> pour les messages entrants d'une room. */
  subscribeRoom(roomId: string): Observable<ChatMessage> {
    if (!this.messageSubjects.has(roomId)) {
      this.messageSubjects.set(roomId, new Subject<ChatMessage>());
    }
    if (this.client?.connected && !this.subscriptions.has(roomId)) {
      this.attachRoom(roomId);
    }
    return this.messageSubjects.get(roomId)!.asObservable();
  }

  /** Observable des frappes (userId d'autres membres) pour afficher "X est en train d'ecrire...". */
  subscribeTyping(roomId: string): Observable<string> {
    if (!this.typingSubjects.has(roomId)) {
      this.typingSubjects.set(roomId, new Subject<string>());
    }
    if (this.client?.connected && !this.typingSubs.has(roomId)) {
      this.attachTyping(roomId);
    }
    return this.typingSubjects.get(roomId)!.asObservable();
  }

  subscribePresence(groupId: string): Observable<GroupPresence> {
    if (!this.presenceSubjects.has(groupId)) {
      this.presenceSubjects.set(groupId, new Subject<GroupPresence>());
    }
    if (this.client?.connected && !this.presenceSubs.has(groupId)) {
      this.attachPresence(groupId);
    }
    return this.presenceSubjects.get(groupId)!.asObservable();
  }

  subscribeGroupEvents(groupId: string): Observable<GroupRealtimeEvent> {
    if (!this.groupEventSubjects.has(groupId)) {
      this.groupEventSubjects.set(groupId, new Subject<GroupRealtimeEvent>());
    }
    if (this.client?.connected && !this.groupEventSubs.has(groupId)) {
      this.attachGroupEvents(groupId);
    }
    return this.groupEventSubjects.get(groupId)!.asObservable();
  }

  subscribeNotifications(userId: string): Observable<Notification> {
    if (!this.notificationSubjects.has(userId)) {
      this.notificationSubjects.set(userId, new Subject<Notification>());
    }
    if (this.client?.connected && !this.notificationSubs.has(userId)) {
      this.attachNotifications(userId);
    }
    return this.notificationSubjects.get(userId)!.asObservable();
  }

  unsubscribeRoom(roomId: string): void {
    this.subscriptions.get(roomId)?.unsubscribe();
    this.subscriptions.delete(roomId);
    this.typingSubs.get(roomId)?.unsubscribe();
    this.typingSubs.delete(roomId);
    this.messageSubjects.get(roomId)?.complete();
    this.messageSubjects.delete(roomId);
    this.typingSubjects.get(roomId)?.complete();
    this.typingSubjects.delete(roomId);
  }

  unsubscribeGroupEvents(groupId: string): void {
    this.groupEventSubs.get(groupId)?.forEach(s => s.unsubscribe());
    this.groupEventSubs.delete(groupId);
    this.groupEventSubjects.get(groupId)?.complete();
    this.groupEventSubjects.delete(groupId);
  }

  unsubscribeNotifications(userId: string): void {
    this.notificationSubs.get(userId)?.unsubscribe();
    this.notificationSubs.delete(userId);
    this.notificationSubjects.get(userId)?.complete();
    this.notificationSubjects.delete(userId);
  }

  // ----------------------- Send -----------------------

  /** Envoie un message via STOMP (broadcast a tous les abonnes /topic/rooms/{id}). */
  sendMessage(roomId: string, content: string): void {
    if (!this.client?.connected) {
      console.warn('[WS] Pas connecte, message non envoye.');
      return;
    }
    this.client.publish({
      destination: `/app/chat.send/${roomId}`,
      body: JSON.stringify({ content })
    });
  }

  /** Indique au backend que l'utilisateur est en train de taper. */
  sendTyping(roomId: string): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/chat.typing/${roomId}`, body: '' });
  }

  joinGroup(groupId: string): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/presence.join/${groupId}`, body: '' });
  }

  leaveGroup(groupId: string): void {
    if (!this.client?.connected) return;
    this.client.publish({ destination: `/app/presence.leave/${groupId}`, body: '' });
  }

  // ----------------------- Internals -----------------------

  private attachRoom(roomId: string) {
    if (!this.client?.connected) return;
    const sub = this.client.subscribe(`/topic/rooms/${roomId}`, (msg: IMessage) => {
      try {
        const payload = JSON.parse(msg.body) as ChatMessage;
        // STOMP callbacks tombent hors NgZone -> on rentre dedans pour
        // declencher la change detection sur les composants abonnes.
        this.zone.run(() => this.messageSubjects.get(roomId)?.next(payload));
      } catch (e) {
        console.warn('[WS] Payload chat illisible', e);
      }
    });
    this.subscriptions.set(roomId, sub);
  }

  private attachTyping(roomId: string) {
    if (!this.client?.connected) return;
    const sub = this.client.subscribe(`/topic/rooms/${roomId}/typing`, (msg: IMessage) => {
      this.zone.run(() => this.typingSubjects.get(roomId)?.next(msg.body));
    });
    this.typingSubs.set(roomId, sub);
  }

  private attachPresence(groupId: string) {
    if (!this.client?.connected) return;
    const sub = this.client.subscribe(`/topic/groups/${groupId}/presence`, (msg: IMessage) => {
      try {
        const payload = JSON.parse(msg.body) as GroupPresence;
        this.zone.run(() => this.presenceSubjects.get(groupId)?.next(payload));
      } catch (e) {
        console.warn('[WS] Payload presence illisible', e);
      }
    });
    this.presenceSubs.set(groupId, sub);
  }

  private attachGroupEvents(groupId: string) {
    if (!this.client?.connected) return;
    this.groupEventSubs.get(groupId)?.forEach(s => s.unsubscribe());
    const handler = (msg: IMessage) => {
      try {
        const payload = JSON.parse(msg.body) as GroupRealtimeEvent;
        this.zone.run(() => this.groupEventSubjects.get(groupId)?.next(payload));
      } catch (e) {
        console.warn('[WS] Payload evenement groupe illisible', e);
      }
    };
    const subs = [
      this.client.subscribe(`/topic/groups/${groupId}`, handler),
      this.client.subscribe(`/topic/groups/${groupId}/shared-sessions`, handler),
      this.client.subscribe(`/topic/groups/${groupId}/comments`, handler)
    ];
    this.groupEventSubs.set(groupId, subs);
  }

  private attachNotifications(userId: string) {
    if (!this.client?.connected) return;
    this.notificationSubs.get(userId)?.unsubscribe();
    const sub = this.client.subscribe(`/topic/users/${userId}/notifications`, (msg: IMessage) => {
      try {
        const payload = JSON.parse(msg.body) as Notification;
        this.zone.run(() => this.notificationSubjects.get(userId)?.next(payload));
      } catch (e) {
        console.warn('[WS] Payload notification illisible', e);
      }
    });
    this.notificationSubs.set(userId, sub);
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
