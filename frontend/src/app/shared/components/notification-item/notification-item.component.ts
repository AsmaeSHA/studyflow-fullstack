import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Notification, NotificationType } from '../../../core/models/models';

interface TypeMeta { icon: string; label: string; accent: string; }
const TYPE_META: Record<NotificationType, TypeMeta> = {
  SESSION_REMINDER: { icon:'⏰', label:'Rappel session',    accent:'#F5C518' },
  GROUP_INVITATION: { icon:'✉',  label:'Invitation groupe', accent:'#7EB8F7' },
  GOAL_ACHIEVED:    { icon:'🏆', label:'Objectif atteint',  accent:'#5BD49A' },
  NEW_MESSAGE:      { icon:'💬', label:'Nouveau message',   accent:'#C084FC' },
  SESSION_SHARED:   { icon:'📤', label:'Session partagée',  accent:'#FF8E7E' },
  GROUP_JOINED:      { icon:'+', label:'Nouveau membre', accent:'#5BD49A' },
};

/**
 * Ligne réutilisable de notification.
 */
@Component({
  selector: 'app-notification-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ni"
         [class.unread]="!notif.isRead"
         [style.--ac]="meta.accent"
         (click)="open.emit(notif)">
      <div class="ni-bar"></div>
      <div class="ni-icon">
        <span>{{ meta.icon }}</span>
        <span class="ni-dot" *ngIf="!notif.isRead"></span>
      </div>
      <div class="ni-body">
        <div class="ni-head">
          <span class="ni-type">{{ meta.label }}</span>
          <span class="ni-time">{{ relativeTime() }}</span>
        </div>
        <p class="ni-msg">{{ notif.message }}</p>
        <div class="ni-meta" *ngIf="metaLine">
          <small>{{ metaLine }}</small>
        </div>
      </div>
      <div class="ni-actions">
        <button class="act"
                *ngIf="!notif.isRead"
                (click)="$event.stopPropagation(); markRead.emit(notif)"
                title="Marquer comme lu">✓</button>
        <button class="act act-del"
                (click)="$event.stopPropagation(); remove.emit(notif)"
                title="Supprimer">🗑</button>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .ni {
      position:relative;
      display:grid; grid-template-columns:4px 44px 1fr auto;
      align-items:center; gap:14px;
      padding:14px 16px; padding-left:0;
      border:1px solid rgba(0,0,0,.05); border-radius:14px;
      background:#fff;
      cursor:pointer;
      transition:transform 200ms,box-shadow 200ms,background 200ms;
      overflow:hidden;
    }
    .ni:hover { transform:translateX(3px); box-shadow:0 8px 22px rgba(0,0,0,.06); }
    .ni.unread { background:#fffbe9; }
    .ni-bar { width:4px; align-self:stretch; background:var(--ac); }
    .ni-icon {
      width:44px; height:44px; border-radius:14px;
      background:color-mix(in srgb, var(--ac) 18%, #fff);
      display:grid; place-items:center;
      font-size:18px; position:relative;
    }
    .ni-dot { position:absolute; top:6px; right:6px; width:8px; height:8px; border-radius:50%; background:var(--ac); }
    .ni-head { display:flex; gap:10px; align-items:baseline; }
    .ni-type { font-size:10.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; color:var(--ac); }
    .ni-time { font-size:11.5px; color:#999; }
    .ni-msg { margin:3px 0 0; font-size:13.5px; color:#1A1A1A; line-height:1.4; }
    .ni-meta small { color:#999; font-size:11px; }
    .ni-actions { display:flex; gap:6px; }
    .act {
      width:30px; height:30px; border-radius:8px;
      border:none; background:#f5f1ea;
      cursor:pointer; transition:background 160ms; font-size:13px;
    }
    .act:hover { background:#e8dfd5; }
    .act-del:hover { background:#ffe2dd; color:#c04a3a; }
  `]
})
export class NotificationItemComponent {
  @Input() notif!: Notification;
  @Output() open = new EventEmitter<Notification>();
  @Output() markRead = new EventEmitter<Notification>();
  @Output() remove = new EventEmitter<Notification>();

  get meta(): TypeMeta {
    return TYPE_META[this.notif?.type] || { icon:'🔔', label:'Notification', accent:'#999' };
  }

  get metaLine(): string {
    const m = this.notif?.metadata as any;
    if (!m) return '';
    if (m.groupName) return `Groupe : ${m.groupName}`;
    if (m.sessionTitle) return `Session : ${m.sessionTitle}`;
    return '';
  }

  relativeTime(): string {
    const sent = new Date(this.notif.createdAt).getTime();
    const diff = Date.now() - sent;
    const min = Math.floor(diff / 60000);
    if (min < 1) return 'à l\'instant';
    if (min < 60) return `il y a ${min} min`;
    const h = Math.floor(min / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `il y a ${d}j`;
    return new Date(this.notif.createdAt).toLocaleDateString('fr');
  }
}
