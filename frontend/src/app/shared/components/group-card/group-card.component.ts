import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudyGroup } from '../../../core/models/models';

/**
 * Petite carte de groupe réutilisable. Émet (open) au clic.
 */
@Component({
  selector: 'app-group-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="gc"
             [style.--c]="group.color || '#F5C518'"
             [class.is-active]="group.isActive">
      <div class="gc-cover" [style.background]="(group.color || '#F5C518') + '22'">
        <img class="gc-img"
             [src]="group.imageUrl || defaultCoverUrl"
             [alt]="group.name" />
        <div class="gc-init" [style.background]="group.color || '#F5C518'">
          {{ initials }}
        </div>
        <span class="gc-priv" *ngIf="group.isPrivate" title="Privé">🔒</span>
        <span class="gc-live" *ngIf="group.isActive">
          <span class="gc-dot"></span> live
        </span>
      </div>
      <div class="gc-body">
        <h4>{{ group.name }}</h4>
        <p class="gc-desc">{{ group.description || '—' }}</p>
        <div class="gc-meta">
          <span>👥 {{ group.memberCount || 0 }} / {{ group.maxMembers }}</span>
          <span class="gc-vis">{{ group.isPrivate ? 'Privé' : 'Public' }}</span>
        </div>
      </div>
      <div class="gc-actions">
        <button class="gc-open" (click)="open.emit(group)">Ouvrir</button>
        <button class="gc-chat" (click)="chat.emit(group)" title="Chat">💬</button>
      </div>
    </article>
  `,
  styles: [`
    :host { display:block; }
    .gc {
      background:#fff;
      border-radius:18px;
      border:1px solid rgba(0,0,0,.05);
      overflow:hidden;
      transition:transform 220ms cubic-bezier(.34,1.56,.64,1), box-shadow 220ms;
      display:flex; flex-direction:column;
    }
    .gc:hover { transform:translateY(-3px); box-shadow:0 14px 32px rgba(0,0,0,.08); }
    .gc.is-active { box-shadow:0 0 0 2px var(--c); }

    .gc-cover {
      position:relative; height:90px;
      display:flex; align-items:center; justify-content:center;
      overflow:hidden;
    }
    .gc-img { width:100%; height:100%; object-fit:cover; display:block; }
    .gc-init {
      position:absolute;
      width:54px; height:54px; border-radius:16px;
      display:grid; place-items:center;
      color:#fff; font-weight:900; font-size:1.1rem; letter-spacing:-.02em;
      box-shadow:0 6px 16px rgba(0,0,0,.18);
    }
    .gc-priv { position:absolute; top:10px; right:10px; font-size:14px; }
    .gc-live {
      position:absolute; top:10px; left:10px;
      display:inline-flex; align-items:center; gap:5px;
      padding:3px 10px; border-radius:999px;
      background:rgba(91,212,154,.18); color:#1a7a4a;
      font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase;
    }
    .gc-dot { width:6px; height:6px; border-radius:50%; background:#5BD49A; animation:pl 1.5s infinite; }
    @keyframes pl { 0%,100%{opacity:1} 50%{opacity:.4} }

    .gc-body { padding:14px 16px 8px; flex:1; }
    .gc-body h4 { font-size:15px; font-weight:800; margin:0 0 4px; color:#1A1A1A; }
    .gc-desc { font-size:12px; color:#7A7A7A; line-height:1.4; min-height:34px; margin:0; }
    .gc-meta { display:flex; justify-content:space-between; font-size:11.5px; color:#999; margin-top:8px; }
    .gc-vis { padding:2px 8px; border-radius:999px; background:#f5f1ea; font-weight:700; }

    .gc-actions { display:flex; gap:8px; padding:10px 14px 14px; }
    .gc-open {
      flex:1; padding:8px 14px; border-radius:999px;
      background:#1A1A1A; color:#F5C518; border:none;
      font-weight:700; font-size:12.5px; cursor:pointer;
      transition:transform 160ms;
    }
    .gc-open:hover { transform:translateY(-1px); }
    .gc-chat {
      width:36px; padding:0; border-radius:50%;
      background:#f5f1ea; border:none; cursor:pointer; font-size:14px;
    }
    .gc-chat:hover { background:#e8dfd5; }
  `]
})
export class GroupCardComponent {
  @Input() group!: StudyGroup;
  @Output() open = new EventEmitter<StudyGroup>();
  @Output() chat = new EventEmitter<StudyGroup>();
  readonly defaultCoverUrl = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80';

  get initials(): string {
    return (this.group?.name || '?')
      .split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }
}
