import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { interval, Observable, Subscription, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { Notification } from '../models/models';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly base = environment.apiUrl + '/notifications';
  private http = inject(HttpClient);
  private ws = inject(WebSocketService);
  private auth = inject(AuthService);

  readonly notifications = signal<Notification[]>([]);
  readonly unreadCount   = signal(0);
  private unreadSync?: Subscription;
  private realtimeSync?: Subscription;

  list(page = 0, size = 20): Observable<Notification[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Notification[]>(this.base, { params })
      .pipe(tap(n => this.notifications.set(n)));
  }
  refresh(): void { this.list().subscribe(); }

  startUnreadSync(): void {
    if (this.unreadSync) return;
    this.refreshUnreadCount().subscribe();
    this.startRealtimeSync();
    this.unreadSync = interval(15000).subscribe(() => this.refreshUnreadCount().subscribe());
  }

  private startRealtimeSync(): void {
    const userId = this.auth.currentUser?.id;
    if (!userId || this.realtimeSync) return;
    this.ws.connect();
    this.realtimeSync = this.ws.subscribeNotifications(userId).subscribe(notification => {
      this.notifications.update(list =>
        list.some(item => item.id === notification.id) ? list : [notification, ...list]
      );
      if (!notification.isRead && !notification.read) {
        this.unreadCount.update(count => count + 1);
      }
    });
  }

  listUnread(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.base}/unread`)
      .pipe(tap(list => this.unreadCount.set(list.length)));
  }

  refreshUnreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.base}/unread/count`)
      .pipe(tap(r => this.unreadCount.set(r.count)));
  }

  markAsRead(id: string): Observable<Notification> {
    const wasUnread = this.notifications().find(x => x.id === id)?.isRead === false;
    return this.http.patch<Notification>(`${this.base}/${id}/read`, {})
      .pipe(tap(() => {
        if (wasUnread) this.unreadCount.update(n => Math.max(0, n - 1));
        this.notifications.update(l => l.map(x => x.id === id ? { ...x, isRead: true } : x));
      }));
  }
  markAllAsRead(): Observable<void> {
    return this.http.patch<void>(`${this.base}/read-all`, {})
      .pipe(tap(() => {
        this.unreadCount.set(0);
        this.notifications.update(l => l.map(x => ({ ...x, isRead: true })));
      }));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`)
      .pipe(tap(() => this.notifications.update(l => l.filter(x => x.id !== id))));
  }
}
