import { CommonModule, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminUserService } from '../../../core/services/admin-user.service';
import { User } from '../../../core/models/models';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <section class="users-page">

      <!-- En-tete -->
      <div class="intro-card">
        <div class="intro-text">
          <p class="eyebrow">
            <span class="console-cursor"></span>
            Gestion des utilisateurs
          </p>
          <h2>Comptes de la plateforme</h2>
          <p class="lead">
            Recherche, filtrage par role / statut, changement de role USER/ADMIN,
            desactivation / reactivation et suppression des comptes.
          </p>
        </div>
        <div class="summary-badges">
          <div class="badge-item badge-animate" style="--d:0s">
            <strong>{{ users().length }}</strong>
            <span>comptes</span>
          </div>
          <div class="badge-item badge-green badge-animate" style="--d:.08s">
            <span class="live-ring"></span>
            <strong>{{ activeCount() }}</strong>
            <span>actifs</span>
          </div>
          <div class="badge-item badge-red badge-animate" style="--d:.16s">
            <strong>{{ disabledCount() }}</strong>
            <span>desactives</span>
          </div>
          <div class="badge-item badge-yellow badge-animate" style="--d:.24s">
            <strong>{{ adminCount() }}</strong>
            <span>admins</span>
          </div>
        </div>
      </div>

      <!-- Toolbar -->
      <section class="toolbar">
        <label class="field field--search">
          <span>Recherche</span>
          <div class="search-wrap">
            <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input type="search"
              class="search-input"
              [ngModel]="search()"
              (ngModelChange)="search.set($event); resetPage()"
              placeholder="Nom ou e-mail..."/>
            <span class="search-underline"></span>
          </div>
        </label>
        <label class="field">
          <span>Role</span>
          <div class="select-wrap">
            <select [ngModel]="roleFilter()" (ngModelChange)="roleFilter.set($event); resetPage()">
              <option value="">Tous les roles</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
            <svg class="select-chevron" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>
        </label>
      </section>

      <!-- Table -->
      <section class="table-shell">
        <div class="table-meta">
          <div>
            <p class="eyebrow">Liste filtree</p>
            <h3>{{ filteredUsers().length }} resultat(s)</h3>
          </div>
          <span class="page-chip">Page {{ currentPage() }} / {{ totalPages() }}</span>
        </div>

        <div class="table-wrap">
          <div class="scanline"></div>
          <table>
            <thead>
              <tr>
                <th>Utilisateur</th>
                <th>Role</th>
                <th>Inscription</th>
                <th>Sessions</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of pagedUsers(); let i = index" class="data-row" [style.--row-i]="i">
                <td>
                  <div class="user-cell">
                    <div class="avatar-wrap">
                      <div class="avatar-ring"></div>
                      <div class="avatar">{{ initials(user.name || user.firstName + ' ' + user.lastName) }}</div>
                    </div>
                    <div>
                      <strong>{{ user.name }}</strong>
                      <small>{{ user.email }}</small>
                    </div>
                  </div>
                </td>
                <td>
                  <span class="pill" [class.pill--admin]="user.role === 'ADMIN'">
                    {{ user.role }}
                  </span>
                </td>
                <td>{{ user.createdAt | date:'dd/MM/yyyy' }}</td>
                <td>
                  <span class="sessions-count">{{ user.sessionsCount ?? 0 }}</span>
                </td>
                <td>
                  <div class="actions">
                    <button type="button" class="btn btn--toggle"
                      [class.btn--success]="user.status === 'DISABLED'"
                      (click)="toggleStatus(user)">
                      <ng-container *ngIf="user.status !== 'DISABLED'; else reactiverTpl">
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
                        </svg>
                        Désactiver
                      </ng-container>
                      <ng-template #reactiverTpl>
                        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                        Réactiver
                      </ng-template>
                    </button>
                    <button type="button" class="btn btn--role" (click)="toggleRole(user)">
                      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                      {{ user.role === 'ADMIN' ? 'USER' : 'ADMIN' }}
                    </button>
                    <button type="button" class="btn btn--delete" (click)="deleteUser(user)" title="Supprimer">
                      <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14H6L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/>
                        <path d="M9 6V4h6v2"/>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
              <tr *ngIf="pagedUsers().length === 0">
                <td colspan="6" class="empty-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" width="32" height="32">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <span>Aucun utilisateur ne correspond aux filtres.</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pagination">
          <button type="button" class="pg-btn" (click)="previousPage()" [disabled]="currentPage() === 1">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" width="14" height="14"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button type="button" class="pg-btn pg-num"
            *ngFor="let page of pages()"
            [class.active]="page === currentPage()"
            (click)="goToPage(page)">{{ page }}</button>
          <button type="button" class="pg-btn" (click)="nextPage()" [disabled]="currentPage() === totalPages()">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="2" width="14" height="14"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host { display: block; }
    .users-page { display: flex; flex-direction: column; gap: 22px; animation: page-in .4s ease both; }

    @keyframes page-in {
      from { opacity: 0; transform: translateY(10px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Cards */
    .intro-card, .toolbar, .table-shell {
      border-radius: 26px;
      border: 1px solid rgba(26,26,26,.05);
      background: #fff;
      box-shadow: 0 18px 34px rgba(26,26,26,.06);
    }

    /* Intro */
    .intro-card {
      padding: 28px;
      display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;
      background:
        radial-gradient(circle at top right, rgba(245,197,24,.2), transparent 28%),
        linear-gradient(135deg, #fff 0%, #f7f4ef 100%);
      position: relative; overflow: hidden;
    }

    .intro-card::before {
      content: '';
      position: absolute; top: -1px; left: 0; right: 0; height: 3px;
      background: linear-gradient(90deg, #f5c518, #ff8e7e, #6B8BFF, #f5c518);
      background-size: 200%;
      animation: gradient-slide 4s linear infinite;
    }

    @keyframes gradient-slide {
      0%   { background-position: 0%; }
      100% { background-position: 200%; }
    }

    /* Console cursor */
    .console-cursor {
      display: inline-block; width: 6px; height: 12px;
      background: #7a7a7a; margin-right: 8px; vertical-align: middle;
      animation: blink 1.1s step-end infinite;
    }

    @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0; } }

    .eyebrow { margin: 0 0 10px; font-size: .74rem; text-transform: uppercase; letter-spacing: .16em; color: #7a7a7a; display: flex; align-items: center; }
    h2, h3 { margin: 0; letter-spacing: -.03em; color: #1a1a1a; }
    h2 { font-size: clamp(1.6rem,3vw,2.2rem); max-width: 16ch; }
    h3 { font-size: 1.35rem; }
    .lead { margin-top: 10px; max-width: 54ch; color: #6d6d6d; line-height: 1.6; }

    /* Summary badges */
    .summary-badges { display: flex; gap: 12px; flex-wrap: wrap; }

    .badge-animate {
      animation: badge-pop .5s cubic-bezier(.34,1.56,.64,1) var(--d, 0s) both;
    }

    @keyframes badge-pop {
      from { opacity: 0; transform: scale(.6); }
      to   { opacity: 1; transform: scale(1); }
    }

    .badge-item {
      display: flex; flex-direction: column; align-items: center;
      padding: 14px 20px; border-radius: 20px;
      background: #f5f1ea; border: 1px solid rgba(26,26,26,.05);
      min-width: 76px; position: relative; overflow: hidden;
      transition: transform 200ms ease, box-shadow 200ms ease;
    }

    .badge-item:hover { transform: translateY(-3px) scale(1.04); box-shadow: 0 12px 24px rgba(26,26,26,.1); }

    .badge-item strong { font-size: 1.55rem; line-height: 1; color: #1a1a1a; letter-spacing: -.03em; }
    .badge-item span.live-ring + span,
    .badge-item > span:last-child { font-size: .78rem; color: #7a7a7a; margin-top: 4px; }

    .badge-green strong { color: #2a7a3b; } .badge-green { background: #edfbf0; }
    .badge-red   strong { color: #c65340; } .badge-red   { background: #fff0ee; }
    .badge-yellow strong { color: #8a6400; } .badge-yellow { background: #fffae0; }

    /* Live ring on active badge */
    .live-ring {
      position: absolute; top: 8px; right: 8px;
      width: 8px; height: 8px; border-radius: 50%;
      background: #2a7a3b;
      box-shadow: 0 0 0 0 rgba(42,122,59,.4);
      animation: badge-live 2s ease infinite;
    }

    @keyframes badge-live {
      0%   { box-shadow: 0 0 0 0 rgba(42,122,59,.4); }
      70%  { box-shadow: 0 0 0 8px rgba(42,122,59,0); }
      100% { box-shadow: 0 0 0 0 rgba(42,122,59,0); }
    }

    /* Toolbar */
    .toolbar { padding: 20px; display: grid; grid-template-columns: minmax(0,2fr) 1fr 1fr; gap: 16px; }
    .field { display: flex; flex-direction: column; gap: 8px; font-size: .85rem; font-weight: 700; color: #4f4f4f; }

    /* Search */
    .search-wrap { position: relative; display: flex; align-items: center; }
    .search-icon { position: absolute; left: 14px; width: 16px; height: 16px; stroke: #9a9a9a; pointer-events: none; transition: stroke 200ms ease; }
    .search-wrap:focus-within .search-icon { stroke: #f5c518; }

    .search-input {
      width: 100%; border: 1px solid rgba(26,26,26,.1); border-radius: 18px;
      padding: 13px 16px 13px 40px; background: #fff; color: #1a1a1a; outline: none;
      font-size: .92rem; box-sizing: border-box;
      transition: border-color 250ms ease, box-shadow 250ms ease;
    }

    .search-input:focus {
      border-color: rgba(245,197,24,.85);
      box-shadow: 0 0 0 4px rgba(245,197,24,.14), 0 4px 16px rgba(245,197,24,.1);
    }

    /* Select */
    .select-wrap { position: relative; }
    .select-wrap select {
      width: 100%; appearance: none;
      border: 1px solid rgba(26,26,26,.1); border-radius: 18px;
      padding: 13px 38px 13px 16px; background: #fff; color: #1a1a1a; outline: none;
      font-size: .92rem; cursor: pointer;
      transition: border-color 250ms ease, box-shadow 250ms ease;
    }
    .select-wrap select:focus { border-color: rgba(245,197,24,.85); box-shadow: 0 0 0 4px rgba(245,197,24,.14); }
    .select-chevron { position: absolute; right: 12px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; stroke: #9a9a9a; pointer-events: none; }

    /* Table shell */
    .table-shell { padding: 22px; }
    .table-meta { display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 18px; }
    .page-chip { padding: 10px 18px; border-radius: 999px; background: #f5f1ea; border: 1px solid rgba(26,26,26,.05); font-weight: 700; font-size: .85rem; color: #6a6a6a; }

    .table-wrap { overflow-x: auto; border-radius: 20px; border: 1px solid rgba(26,26,26,.07); position: relative; }

    /* Scanline */
    .scanline {
      position: absolute; left: 0; right: 0; height: 60px; z-index: 2; pointer-events: none;
      background: linear-gradient(180deg, transparent, rgba(245,197,24,.06), transparent);
      animation: scanline 5s linear infinite;
    }

    @keyframes scanline {
      0%   { top: -60px; }
      100% { top: 100%; }
    }

    table { width: 100%; border-collapse: collapse; min-width: 860px; background: #fff; }

    th, td { padding: 15px 18px; text-align: left; border-bottom: 1px solid rgba(26,26,26,.06); }
    th { font-size: .75rem; text-transform: uppercase; letter-spacing: .12em; color: #7a7a7a; background: #f8f5f0; white-space: nowrap; }

    /* Row entrance */
    .data-row {
      animation: row-in .4s cubic-bezier(.34,1.2,.64,1) both;
      animation-delay: calc(var(--row-i, 0) * 55ms);
      transition: background 150ms ease;
    }

    @keyframes row-in {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    .data-row:hover td { background: rgba(245,197,24,.05); }

    tr:last-child td { border-bottom: none; }

    /* User cell */
    .user-cell { display: flex; align-items: center; gap: 12px; }

    .avatar-wrap { position: relative; flex-shrink: 0; width: 40px; height: 40px; }

    .avatar-ring {
      position: absolute; inset: -3px; border-radius: 17px;
      background: conic-gradient(from 0deg, #f5c518, #ff8e7e, #6B8BFF, #5BD49A, #f5c518);
      opacity: 0; transition: opacity 250ms ease;
      animation: spin-ring 3s linear infinite;
    }

    @keyframes spin-ring {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    .data-row:hover .avatar-ring { opacity: 1; }

    .avatar {
      position: relative; width: 40px; height: 40px; border-radius: 14px;
      display: grid; place-items: center;
      font-weight: 800; font-size: .85rem; color: #1a1a1a;
      background: #f5f1ea;
      transition: transform 250ms ease;
      z-index: 1;
    }

    .data-row:hover .avatar { transform: scale(1.05); }

    .user-cell strong { display: block; font-size: .95rem; }
    .user-cell small { display: block; margin-top: 2px; color: #7a7a7a; font-size: .82rem; }

    /* Pills */
    .pill { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 999px; font-size: .75rem; font-weight: 800; background: #f0ece4; color: #4a4a4a; }
    .pill--admin    { background: #f5c518; color: #1a1a1a; }
    .pill--disabled { background: #ffe5df; color: #c65340; }
    .pill--active   { background: #edfbf0; color: #1a5a28; }

    /* Live dot for ACTIVE */
    .live-dot {
      width: 6px; height: 6px; border-radius: 50%; background: #2a7a3b; flex-shrink: 0;
      animation: live-pulse 2s ease infinite;
    }

    @keyframes live-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(42,122,59,.55); }
      60%     { box-shadow: 0 0 0 5px rgba(42,122,59,0); }
    }

    /* Sessions count */
    .sessions-count {
      display: inline-flex; align-items: center; justify-content: center;
      min-width: 32px; height: 24px; border-radius: 8px;
      background: #f5f1ea; font-size: .85rem; font-weight: 700; color: #4a4a4a;
      padding: 0 8px;
    }

    /* Actions */
    .actions { display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; }

    .btn {
      display: inline-flex; align-items: center; gap: 6px; border: none;
      border-radius: 12px; padding: 8px 14px; font-size: .8rem; font-weight: 700;
      cursor: pointer; white-space: nowrap;
      transition: transform 160ms cubic-bezier(.34,1.56,.64,1), box-shadow 160ms ease, background 160ms ease, filter 160ms ease;
    }

    .btn svg { width: 14px; height: 14px; stroke: currentColor; flex-shrink: 0; }

    .btn:hover { filter: brightness(0.97); }

    .btn--toggle { background: #ffe5df; color: #c65340; }
    .btn--toggle.btn--success { background: #edfbf0; color: #2a7a3b; }

    .btn--toggle:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 6px 16px rgba(198,83,64,.22);
    }

    .btn--toggle.btn--success:hover {
      box-shadow: 0 6px 16px rgba(42,122,59,.22);
    }

    .btn--role { background: #fffae0; color: #8a6400; }
    .btn--role:hover {
      transform: translateY(-2px) scale(1.04);
      box-shadow: 0 6px 16px rgba(245,197,24,.3);
    }

    .btn--role svg { transition: transform 500ms cubic-bezier(.34,1.56,.64,1); }
    .btn--role:hover svg { transform: rotate(72deg); }

    .btn--delete { background: #f5f1ea; color: #7a7a7a; padding: 8px 10px; }
    .btn--delete:hover {
      background: #ffe5df; color: #c65340;
      animation: shake .4s cubic-bezier(.36,.07,.19,.97) both;
    }

    @keyframes shake {
      10%,90%  { transform: translateX(-1px); }
      20%,80%  { transform: translateX(2px); }
      30%,50%,70% { transform: translateX(-2px); }
      40%,60%  { transform: translateX(2px); }
    }

    /* Empty row */
    .empty-row {
      text-align: center; color: #9a9a9a; padding: 40px;
      display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .empty-row svg { stroke: #c0bbb4; }

    /* Pagination */
    .pagination { margin-top: 20px; display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; align-items: center; }

    .pg-btn {
      border: none; border-radius: 12px; padding: 10px 14px; font-weight: 700;
      font-size: .85rem; background: #f5f1ea; color: #1a1a1a; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      transition: transform 150ms cubic-bezier(.34,1.56,.64,1), background 150ms ease;
    }

    .pg-btn svg { stroke: currentColor; }
    .pg-btn:hover:not(:disabled) { transform: translateY(-2px) scale(1.08); background: #ece8de; }
    .pg-btn.active { background: #f5c518; color: #1a1a1a; box-shadow: 0 4px 12px rgba(245,197,24,.35); }
    .pg-btn:disabled { opacity: .38; cursor: not-allowed; }
    .pg-num { min-width: 40px; }

    /* Responsive */
    @media (max-width: 900px) {
      .intro-card { flex-direction: column; }
      .toolbar { grid-template-columns: 1fr; }
      .table-meta { flex-direction: column; align-items: flex-start; }
    }
  `],
})
export class AdminUsersComponent {
  private readonly service = inject(AdminUserService);

  readonly users        = this.service.users;

  constructor() {
    // Cache 30s : si on a deja les users (cas du prefetch au login),
    // pas de re-fetch lors d'une navigation entre /admin/users <-> /admin/stats.
    this.service.ensureLoaded();
  }

  readonly search       = signal('');
  readonly roleFilter   = signal<'USER' | 'ADMIN' | ''>('');
  readonly statusFilter = signal<'ACTIVE' | 'DISABLED' | ''>('');
  readonly currentPage  = signal(1);
  readonly pageSize     = 8;

  readonly filteredUsers = computed(() => {
    const s  = this.search().trim().toLowerCase();
    const r  = this.roleFilter();
    const st = this.statusFilter();
    return this.users().filter(u => {
      const fullName = (u.name || u.firstName + ' ' + u.lastName).toLowerCase(); const matchSearch = !s || fullName.includes(s) || u.email.toLowerCase().includes(s);
      const matchRole   = !r  || u.role   === r;
      const matchStatus = !st || u.status === st;
      return matchSearch && matchRole && matchStatus;
    });
  });

  readonly totalPages  = computed(() => Math.max(1, Math.ceil(this.filteredUsers().length / this.pageSize)));
  readonly pages       = computed(() => Array.from({ length: this.totalPages() }, (_, i) => i + 1));
  readonly pagedUsers  = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredUsers().slice(start, start + this.pageSize);
  });

  readonly activeCount   = computed(() => this.users().filter(u => u.status === 'ACTIVE').length);
  readonly disabledCount = computed(() => this.users().filter(u => u.status === 'DISABLED').length);
  readonly adminCount    = computed(() => this.users().filter(u => u.role === 'ADMIN').length);

  toggleStatus(user: User): void {
    // Si status non defini ou ACTIVE -> on desactive ; sinon on reactive.
    if (user.status === 'DISABLED') {
      this.service.enableUser(user.id).subscribe();
    } else {
      this.service.disableUser(user.id).subscribe();
    }
  }

  toggleRole(user: User): void {
    const newRole: 'USER' | 'ADMIN' = user.role === 'ADMIN' ? 'USER' : 'ADMIN';
    const action = newRole === 'ADMIN' ? 'promouvoir en ADMIN' : 'retrograder en USER';
    if (confirm('Voulez-vous ' + action + ' ' + user.name + ' ?')) {
      this.service.changeRole(user.id, newRole).subscribe();
    }
  }

  deleteUser(user: User): void {
    if (confirm('Supprimer definitvement le compte de ' + user.name + ' ?\nCette action est irreversible.')) {
      this.service.deleteUser(user.id).subscribe();
      if (this.pagedUsers().length === 1 && this.currentPage() > 1) {
        this.currentPage.update(p => p - 1);
      }
    }
  }

  previousPage(): void { this.currentPage.update(p => Math.max(1, p - 1)); }
  nextPage(): void     { this.currentPage.update(p => Math.min(this.totalPages(), p + 1)); }
  goToPage(p: number): void { this.currentPage.set(p); }
  resetPage(): void    { this.currentPage.set(1); }

  initials(name: string): string {
    return name.split(' ').map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
  }
}
