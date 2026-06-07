import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { NotificationService } from '../../../core/services/notification.service';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="topbar">
      <div class="greeting">
        <h1>Hi, {{ firstName }}!</h1>
        <p>Let's take a look at your study activity today.</p>
      </div>
      <div class="notif-counter" *ngIf="notifSvc.unreadCount() > 0">
        {{ notifSvc.unreadCount() }}
      </div>

    </header>
  `,
  styles: [`
    :host { display: block; }
    .topbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; padding: 24px 32px 16px;
      background: transparent;
    }
    .greeting h1 {
      font-size: clamp(26px, 3vw, 34px);
      font-weight: 800;
      letter-spacing: -0.02em;
      margin: 0;
      color: #1A1A1A;
    }
    .greeting p {
      color: #7A7A7A;
      font-size: 14px;
      margin-top: 4px;
    }
    .notif-counter {
      min-width: 30px; height: 30px; padding: 0 10px;
      border-radius: 999px; display: grid; place-items: center;
      background: #1A1A1A; color: #F5C518;
      font-size: 13px; font-weight: 900;
    }
    @media (max-width: 768px) {
      .topbar { flex-wrap: wrap; padding: 16px; }
      .greeting { flex-basis: 100%; }
    }
  `]
})
export class TopbarComponent {
  private auth = inject(AuthService);
  notifSvc = inject(NotificationService);

  constructor() {
    this.notifSvc.startUnreadSync();
  }
  get firstName(): string {
    const n = this.auth.currentUser?.name || 'Student';
    return n.split(' ')[0];
  }
}
