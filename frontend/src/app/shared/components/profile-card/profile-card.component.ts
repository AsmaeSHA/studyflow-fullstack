import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { User } from '../../../core/models/models';

/**
 * Carte d'identité utilisateur — utilisée dans la page Profil
 * mais aussi reutilisable dans les groupes / vues partagées.
 */
@Component({
  selector: 'app-profile-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="pc">
      <div class="pc-top"
           [style.background]="bg"></div>
      <div class="pc-avatar"
           *ngIf="!user?.avatarUrl"
           [style.background]="initialsBg">
        {{ initials }}
      </div>
      <img *ngIf="user?.avatarUrl"
           class="pc-avatar pc-avatar--img"
           [src]="user!.avatarUrl"
           [alt]="user?.firstName || user?.name"/>

      <div class="pc-body">
        <h3>{{ displayName }}</h3>
        <p class="pc-email">{{ user?.email }}</p>
        <div class="pc-pills">
          <span class="pill" [class.admin]="user?.role === 'ADMIN'">{{ user?.role || 'USER' }}</span>
          <span class="pill" *ngIf="user?.status">{{ user?.status }}</span>
        </div>
        <div class="pc-since" *ngIf="user?.createdAt">
          Membre depuis {{ user!.createdAt | date:'MMMM yyyy':'':'fr' }}
        </div>

        <div class="pc-stats" *ngIf="showStats">
          <div class="stat">
            <strong>{{ user?.streak ?? 0 }}</strong>
            <span>Streak</span>
          </div>
          <div class="stat">
            <strong>{{ user?.sessionsCount ?? 0 }}</strong>
            <span>Sessions</span>
          </div>
          <div class="stat">
            <strong>{{ user?.level || '—' }}</strong>
            <span>Niveau</span>
          </div>
        </div>
      </div>
    </article>
  `,
  styles: [`
    :host { display:block; }
    .pc {
      position:relative;
      background:#fff;
      border-radius:24px;
      border:1px solid rgba(0,0,0,.05);
      box-shadow:0 6px 24px rgba(0,0,0,.05);
      overflow:hidden;
      padding-bottom:22px;
    }
    .pc-top {
      height:90px;
      background:linear-gradient(135deg,#F5C518 0%,#FF8E7E 100%);
    }
    .pc-avatar {
      position:absolute; top:46px; left:50%;
      transform:translateX(-50%);
      width:90px; height:90px; border-radius:50%;
      display:grid; place-items:center;
      color:#fff; font-weight:900; font-size:30px;
      border:5px solid #fff;
      box-shadow:0 6px 16px rgba(0,0,0,.12);
      object-fit:cover;
    }
    .pc-avatar--img { background:#eee; }
    .pc-body { padding:48px 24px 0; text-align:center; }
    .pc-body h3 { font-size:18px; font-weight:800; margin:0 0 4px; letter-spacing:-.02em; color:#1A1A1A; }
    .pc-email { font-size:13px; color:#7A7A7A; margin:0 0 10px; }
    .pc-pills { display:flex; gap:6px; justify-content:center; flex-wrap:wrap; }
    .pill {
      padding:4px 12px; border-radius:999px;
      background:#f5f1ea; color:#7A7A7A;
      font-size:11px; font-weight:800; letter-spacing:.04em;
    }
    .pill.admin { background:#fff3d9; color:#8B6E00; }
    .pc-since { color:#999; font-size:11.5px; margin-top:10px; }

    .pc-stats {
      display:grid; grid-template-columns:repeat(3,1fr);
      gap:10px; margin-top:18px; padding-top:16px;
      border-top:1px solid rgba(0,0,0,.06);
    }
    .stat strong { display:block; font-size:18px; font-weight:900; color:#1A1A1A; }
    .stat span { font-size:11px; color:#7A7A7A; font-weight:600; }
  `]
})
export class ProfileCardComponent {
  @Input() user: Partial<User> & { name?: string } = {};
  @Input() showStats = true;
  @Input() bg = 'linear-gradient(135deg,#F5C518 0%,#FF8E7E 100%)';

  get displayName(): string {
    if (this.user?.firstName || this.user?.lastName) {
      return `${this.user?.firstName || ''} ${this.user?.lastName || ''}`.trim();
    }
    return this.user?.name || 'Utilisateur';
  }

  get initials(): string {
    const n = this.displayName;
    return n.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U';
  }

  get initialsBg(): string {
    return 'linear-gradient(135deg,#6C8EEF 0%,#9B72EF 100%)';
  }
}
