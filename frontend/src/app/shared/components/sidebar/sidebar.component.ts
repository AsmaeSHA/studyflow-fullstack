import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

type NavKey = 'dashboard' | 'analytics' | 'sessions' | 'groups' | 'calendar' | 'notifications' | 'admin' | 'planning' | 'profile';

interface NavItem {
  label: string;
  route: string;
  key: NavKey;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, CommonModule],
  template: `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="brand-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4L36 13V27L20 36L4 27V13L20 4Z" stroke="url(#sg)" stroke-width="2" fill="none"/>
            <path d="M20 10L30 16V24L20 30L10 24V16L20 10Z" fill="url(#sg)" opacity="0.35"/>
            <circle cx="20" cy="20" r="4" fill="url(#sg)"/>
            <defs>
              <linearGradient id="sg" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#1f2327"/><stop offset="1" stop-color="#5c6469"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-name">StudyFlow</span>
      </div>

      <nav class="sidebar__nav">
        <a
          *ngFor="let item of navItems"
          [routerLink]="item.route"
          routerLinkActive="active"
          [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
          class="nav-item"
          [title]="item.label"
        >
          <span class="nav-icon" [ngSwitch]="item.key">
            <span *ngSwitchCase="'dashboard'" class="bullet"></span>
            <svg *ngSwitchCase="'analytics'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
            <svg *ngSwitchCase="'sessions'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>
            </svg>
            <svg *ngSwitchCase="'planning'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="m12 2 2.39 7.36H22l-6.18 4.51L18.21 22 12 17.27 5.79 22l2.39-8.13L2 9.36h7.61z"/>
            </svg>
            <svg *ngSwitchCase="'profile'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
            </svg>
            <svg *ngSwitchCase="'groups'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
            <svg *ngSwitchCase="'calendar'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M3 11h18"/>
            </svg>
            <svg *ngSwitchCase="'notifications'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <svg *ngSwitchCase="'admin'" viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82"/><path d="M4.6 9a1.65 1.65 0 0 0-.33-1.82"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="M20 12h2"/><path d="M2 12h2"/>
            </svg>
          </span>
        </a>
      </nav>

      <div class="sidebar__footer">
        <button class="nav-item nav-item--ghost" (click)="logout()" title="Logout">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;600;700&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');

    :host {
      --line: #e8dfd5;
      --text: #2b2a28;
      --muted: #888078;
      --dark: #232629;
      --yellow: #ffd95d;
      --display: 'Outfit', sans-serif;
      --body: 'Plus Jakarta Sans', sans-serif;
      display: block;
      width: 120px;
      flex-shrink: 0;
    }

    .sidebar {
      position: fixed;
      left: 26px;
      top: 30px;
      bottom: 30px;
      width: 78px;
      padding: 18px 0;
      border-radius: 30px;
      background: rgba(255,255,255,.92);
      border: 1px solid rgba(0,0,0,.04);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 14px 30px rgba(126, 106, 88, 0.08);
      font-family: var(--body);
      z-index: 30;
    }

    .sidebar__brand,
    .sidebar__nav,
    .sidebar__footer {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
    }

    .sidebar__brand {
      gap: 8px;
    }

    .brand-logo {
      width: 36px;
      height: 36px;
    }

    .brand-logo svg {
      width: 100%;
      height: 100%;
    }

    .brand-name {
      font-family: var(--display);
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text);
    }

    .nav-item {
      width: 42px;
      height: 42px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      color: var(--muted);
      text-decoration: none;
      background: transparent;
      border: 0;
      cursor: pointer;
      transition: transform 180ms ease, background 180ms ease, color 180ms ease, box-shadow 180ms ease;
    }

    .nav-item:hover {
      transform: translateY(-1px);
      background: #f5f1ea;
      color: var(--text);
    }

    .nav-item.active {
      background: var(--dark);
      color: var(--yellow);
      box-shadow: 0 8px 20px rgba(35, 38, 41, 0.18);
    }

    .nav-item--ghost {
      background: #fff;
      border: 1px solid var(--line);
      color: var(--muted);
    }

    .nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      color: currentColor;
      line-height: 1;
    }

    .nav-icon svg {
      width: 18px;
      height: 18px;
      display: block;
      stroke: currentColor;
    }

    .bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      display: block;
    }

  `]
})
export class SidebarComponent {
  private auth = inject(AuthService);

  navItems: NavItem[] = [
    { label: 'Dashboard', route: '/dashboard', key: 'dashboard' },
    { label: 'Planning',  route: '/planning',  key: 'planning' },
    { label: 'Sessions', route: '/sessions', key: 'sessions' },
    { label: 'Calendar', route: '/calendar', key: 'calendar' },
    { label: 'Groups', route: '/groups', key: 'groups' },
    { label: 'Notifications', route: '/notifications', key: 'notifications' },
    { label: 'Profile', route: '/profile', key: 'profile' },
    ...(this.auth.isAdmin ? [{ label: 'Admin', route: '/admin/stats', key: 'admin' as NavKey }] : []),
  ];

  logout() {
    this.auth.logout();
  }
}
