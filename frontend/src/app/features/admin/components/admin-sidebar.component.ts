import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  template: `
    <aside class="sidebar">
      <div class="sidebar__brand">
        <div class="brand-logo">
          <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 4L36 13V27L20 36L4 27V13L20 4Z" stroke="url(#sg-admin)" stroke-width="2" fill="none"/>
            <path d="M20 10L30 16V24L20 30L10 24V16L20 10Z" fill="url(#sg-admin)" opacity="0.35"/>
            <circle cx="20" cy="20" r="4" fill="url(#sg-admin)"/>
            <defs>
              <linearGradient id="sg-admin" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                <stop stop-color="#1f2327"/><stop offset="1" stop-color="#5c6469"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <span class="brand-name">Admin</span>
      </div>

      <nav class="sidebar__nav">
        <a routerLink="/admin/stats" routerLinkActive="active" class="nav-item" title="Statistiques">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>
          </span>
        </a>

        <a routerLink="/admin/users" routerLinkActive="active" class="nav-item" title="Utilisateurs">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </span>
        </a>

        <a routerLink="/admin/profile" routerLinkActive="active" class="nav-item" title="Compte">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21a8 8 0 1 0-16 0"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </span>
        </a>
      </nav>

      <div class="sidebar__footer">
        <button class="nav-item nav-item--ghost" (click)="logout()" title="Logout">
          <span class="nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
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
    }

    .nav-icon svg {
      width: 18px;
      height: 18px;
      display: block;
      stroke: currentColor;
      fill: none;
      flex-shrink: 0;
    }

  `],
})
export class AdminSidebarComponent {
  private readonly auth = inject(AuthService);

  logout(): void {
    this.auth.logout();
  }
}
