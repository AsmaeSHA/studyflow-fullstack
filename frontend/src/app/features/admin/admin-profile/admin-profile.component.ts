import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { UserService } from '../../../core/services/user.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <!-- ═══════════════════ HERO ═══════════════════ -->
    <div class="profile-root">

      <div class="hero-section hero-section--no-avatar">
        <!-- Orbiting decoration rings -->
        <div class="orbit-ring orbit-ring--1"></div>
        <div class="orbit-ring orbit-ring--2"></div>

        <div class="hero-info">
          <div class="role-badge">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319
              2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001
              A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1
              1 0 102 0V7z" clip-rule="evenodd"/>
            </svg>
            ADMINISTRATEUR
          </div>
          <h1 class="hero-name">{{ user?.name || 'Admin' }}</h1>
          <p class="hero-email">{{ user?.email }}</p>
        </div>
      </div>

      <!-- ═══════════════════ BODY GRID ═══════════════════ -->
      <div class="body-grid">

        <!-- LEFT: Edit form -->
        <div class="panel panel--form">
          <div class="panel-head">
            <div class="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h2 class="panel-title">Informations</h2>
          </div>

          <form class="edit-form" (submit)="$event.preventDefault(); onSave()">
            <div class="field">
              <label>Prenom</label>
              <input [(ngModel)]="form.firstName" name="firstName" placeholder="Votre prenom"/>
            </div>
            <div class="field">
              <label>Nom</label>
              <input [(ngModel)]="form.lastName" name="lastName" placeholder="Votre nom"/>
            </div>
            <div class="field">
              <label>Email</label>
              <input [(ngModel)]="form.email" name="email" type="email" placeholder="email@domain.com"/>
            </div>

            <p class="password-msg password-msg--error" *ngIf="identityError()">{{ identityError() }}</p>

            <div class="form-actions">
              <button type="submit" class="btn-save" [class.btn-saved]="saved()" [disabled]="saving()">
                <svg *ngIf="!saved()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <svg *ngIf="saved()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ saving() ? 'En cours...' : (saved() ? 'Sauvegardé !' : 'Sauvegarder') }}
              </button>
            </div>
          </form>
        </div>

        <!-- RIGHT col -->
        <div class="right-col">

          <!-- Security panel -->
          <div class="panel panel--security">
            <div class="panel-head">
              <div class="panel-icon panel-icon--dark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 class="panel-title">Sécurité</h2>
            </div>

            <div class="security-list">
              <div class="security-row">
                <div class="sec-left">
                  <span class="sec-label">Mot de passe</span>
                  <span class="sec-hint">Dernière modification il y a 30 jours</span>
                </div>
                <button type="button" class="btn-sec" (click)="togglePasswordForm()">
                  {{ passwordOpen() ? 'Fermer' : 'Modifier' }}
                </button>
              </div>
              <form class="password-form" *ngIf="passwordOpen()" (submit)="$event.preventDefault(); changePassword()">
                <label class="password-field">
                  <span>Mot de passe actuel</span>
                  <input type="password" [(ngModel)]="pwd.current" name="currentPassword" autocomplete="current-password"/>
                </label>
                <label class="password-field">
                  <span>Nouveau mot de passe</span>
                  <input type="password" [(ngModel)]="pwd.next" name="newPassword" autocomplete="new-password"/>
                </label>
                <label class="password-field">
                  <span>Confirmation</span>
                  <input type="password" [(ngModel)]="pwd.confirm" name="confirmPassword" autocomplete="new-password"/>
                </label>

                <div class="pwd-strength" *ngIf="pwd.next">
                  <div class="bar">
                    <div class="fill" [style.width.%]="pwdStrengthPct()" [class]="'lvl-' + pwdStrengthLvl()"></div>
                  </div>
                  <span>{{ pwdStrengthLabel() }}</span>
                </div>

                <p class="password-msg password-msg--error" *ngIf="passwordError()">{{ passwordError() }}</p>
                <p class="password-msg password-msg--success" *ngIf="passwordSuccess()">{{ passwordSuccess() }}</p>

                <div class="password-actions">
                  <button type="button" class="btn-sec" (click)="cancelPasswordChange()">Annuler</button>
                  <button type="submit" class="btn-sec btn-sec--primary" [disabled]="!canChangePwd || passwordSaving()">
                    {{ passwordSaving() ? 'En cours...' : 'Mettre a jour' }}
                  </button>
                </div>
              </form>
            </div>
          </div>

        </div><!-- /right-col -->
      </div><!-- /body-grid -->
    </div><!-- /profile-root -->
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral:  #ff8e7e;
      --dark:   #1a1a1a;
      --cream:  #ede8df;
      --white:  #fff;
      --border: rgba(0,0,0,.07);
      --radius: 24px;
      --shadow: 0 8px 32px rgba(0,0,0,.06);
      display: block;
      padding: 0 0 48px;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* ── HERO ───────────────────────────────── */
    .hero-section {
      position: relative;
      display: flex;
      align-items: center;
      gap: 32px;
      padding: 40px 40px 44px;
      background: var(--dark);
      border-radius: var(--radius);
      margin-bottom: 24px;
      overflow: hidden;
      animation: hero-in 600ms cubic-bezier(.22,1,.36,1) both;
    }

    @keyframes hero-in {
      from { opacity:0; transform: translateY(-12px); }
      to   { opacity:1; transform: translateY(0); }
    }

    /* Orbiting rings */
    .orbit-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(245,197,24,.12);
      pointer-events: none;
      animation: orbit-spin linear infinite;
    }
    .orbit-ring--1 {
      width: 320px; height: 320px;
      top: -100px; right: -60px;
      animation-duration: 28s;
    }
    .orbit-ring--2 {
      width: 200px; height: 200px;
      top: -40px; right: 20px;
      border-color: rgba(255,142,126,.15);
      animation-duration: 18s;
      animation-direction: reverse;
    }
    @keyframes orbit-spin {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }

    /* Hex frame avatar */
    .hex-frame {
      position: relative;
      flex-shrink: 0;
      width: 120px;
      height: 120px;
      z-index: 2;
    }
    .hex-glow {
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      background: conic-gradient(from 0deg, var(--yellow), var(--coral), var(--yellow));
      animation: spin-glow 4s linear infinite;
      z-index: 0;
    }
    @keyframes spin-glow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .hero-avatar {
      position: relative;
      z-index: 1;
      width: 112px;
      height: 112px;
      border-radius: 50%;
      object-fit: cover;
      margin: 4px;
      display: block;
      border: 3px solid var(--dark);
    }
    .online-badge {
      position: absolute;
      bottom: 4px; right: 4px;
      width: 22px; height: 22px;
      background: var(--dark);
      border-radius: 50%;
      display: grid; place-items: center;
      z-index: 2;
    }
    .online-dot {
      width: 12px; height: 12px;
      background: #5bd49a;
      border-radius: 50%;
      display: block;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%,100% { box-shadow: 0 0 0 0 rgba(91,212,154,.5); }
      50%      { box-shadow: 0 0 0 6px rgba(91,212,154,0); }
    }

    .hero-info { z-index: 2; }
    .role-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px 4px 8px;
      border-radius: 999px;
      background: rgba(245,197,24,.15);
      border: 1px solid rgba(245,197,24,.3);
      color: var(--yellow);
      font-size: .72rem;
      font-weight: 800;
      letter-spacing: .1em;
      margin-bottom: 10px;
    }
    .role-badge svg { width:14px; height:14px; fill: var(--yellow); }
    .hero-name {
      margin: 0 0 4px;
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -.03em;
    }
    .hero-email { margin: 0 0 6px; color: rgba(255,255,255,.55); font-size: .9rem; }
    .hero-meta  { margin: 0; color: rgba(255,255,255,.35); font-size: .82rem; }

    /* ── BODY GRID ──────────────────────────── */
    .body-grid {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 20px;
      align-items: start;
    }
    @media(max-width:900px){ .body-grid { grid-template-columns: 1fr; } }

    .right-col { display: flex; flex-direction: column; gap: 20px; }

    /* ── PANELS ─────────────────────────────── */
    .panel {
      background: var(--white);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      overflow: hidden;
      transition: box-shadow 250ms ease;
    }
    .panel:hover { box-shadow: 0 16px 48px rgba(0,0,0,.09); }

    .panel-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }
    .panel-icon {
      width: 36px; height: 36px;
      border-radius: 12px;
      display: grid; place-items: center;
      background: rgba(245,197,24,.1);
      color: #c9a200;
      flex-shrink: 0;
    }
    .panel-icon svg { width:16px; height:16px; }
    .panel-icon--dark   { background: var(--dark); color: var(--yellow); }
    .panel-icon--yellow { background: rgba(245,197,24,.12); color: #c9a200; }

    .panel-title { margin: 0; font-size: 1rem; font-weight: 700; color: var(--dark); }

    /* ── EDIT FORM ──────────────────────────── */
    .panel--form { animation: slide-left 550ms cubic-bezier(.22,1,.36,1) 200ms both; }
    @keyframes slide-left {
      from { opacity:0; transform: translateX(-20px); }
      to   { opacity:1; transform: translateX(0); }
    }

    .edit-form { padding: 20px 24px 24px; display: flex; flex-direction: column; gap: 16px; }

    .field { display: flex; flex-direction: column; gap: 6px; }
    .field label {
      font-size: .78rem;
      font-weight: 700;
      color: #777;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .field input {
      padding: 12px 16px;
      border-radius: 14px;
      border: 1.5px solid #e8dfd5;
      background: #faf8f5;
      font-size: .93rem;
      color: var(--dark);
      transition: border 200ms ease, box-shadow 200ms ease;
      outline: none;
    }
    .field input:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 0 4px rgba(245,197,24,.12);
      background: #fff;
    }

    .form-actions { padding-top: 4px; }
    .btn-save {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 13px 28px;
      border-radius: 999px;
      background: var(--dark);
      color: #fff;
      font-weight: 700;
      font-size: .9rem;
      cursor: pointer;
      border: none;
      transition: transform 180ms ease, box-shadow 180ms ease, background 250ms ease;
    }
    .btn-save svg { width:16px; height:16px; }
    .btn-save:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(26,26,26,.22); }
    .btn-save.btn-saved { background: #2da96a; }

    /* ── SECURITY ───────────────────────────── */
    .panel--security { animation: slide-right 550ms cubic-bezier(.22,1,.36,1) 300ms both; }
    @keyframes slide-right {
      from { opacity:0; transform: translateX(20px); }
      to   { opacity:1; transform: translateX(0); }
    }

    .security-list { padding: 8px 24px 16px; display: flex; flex-direction: column; }
    .security-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid #f5f0e8;
    }
    .security-row:last-child { border-bottom: none; }
    .sec-left { display: flex; flex-direction: column; gap: 2px; }
    .sec-label { font-size: .88rem; font-weight: 600; color: var(--dark); }
    .sec-hint  { font-size: .76rem; color: #999; }

    .password-form {
      padding: 8px 0 4px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: form-drop 220ms ease both;
    }
    @keyframes form-drop {
      from { opacity: 0; transform: translateY(-6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .password-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .password-field span {
      font-size: .76rem;
      font-weight: 700;
      color: #777;
    }
    .password-field input {
      padding: 11px 14px;
      border-radius: 14px;
      border: 1.5px solid #e8dfd5;
      background: #faf8f5;
      color: var(--dark);
      outline: none;
      transition: border 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }
    .password-field input:focus {
      border-color: var(--yellow);
      background: #fff;
      box-shadow: 0 0 0 4px rgba(245,197,24,.12);
    }
    .pwd-strength {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #8a8175;
      font-size: .76rem;
      font-weight: 700;
    }
    .pwd-strength .bar {
      flex: 1;
      height: 5px;
      background: #f0ece4;
      border-radius: 999px;
      overflow: hidden;
    }
    .pwd-strength .fill {
      height: 100%;
      border-radius: inherit;
      transition: width 220ms ease;
    }
    .pwd-strength .fill.lvl-1 { background: #e05a47; }
    .pwd-strength .fill.lvl-2 { background: #f0a030; }
    .pwd-strength .fill.lvl-3 { background: #f5c518; }
    .pwd-strength .fill.lvl-4 { background: #2da96a; }
    .password-msg {
      margin: 0;
      font-size: .78rem;
      font-weight: 700;
    }
    .password-msg--error { color: #e05a47; }
    .password-msg--success { color: #2da96a; }
    .password-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding-top: 2px;
    }

    .btn-sec {
      padding: 7px 16px;
      border-radius: 999px;
      border: 1.5px solid #e8dfd5;
      background: transparent;
      color: var(--dark);
      font-size: .8rem;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 180ms ease;
    }
    .btn-sec:hover { border-color: var(--dark); background: var(--dark); color: #fff; }
    .btn-sec:disabled { opacity: .45; cursor: not-allowed; pointer-events: none; }
    .btn-sec--primary { border-color: #2da96a; color: #2da96a; }
    .btn-sec--primary:hover { background: #2da96a; color: #fff; border-color: #2da96a; }
    .btn-sec--danger { border-color: #e05a47; color: #e05a47; }
    .btn-sec--danger:hover { background: #e05a47; color: #fff; }

  `]
})
export class AdminProfileComponent {
  private auth = inject(AuthService);
  private users = inject(UserService);

  user  = this.auth.currentUser;
  saved = signal(false);
  saving = signal(false);
  identityError = signal('');
  passwordOpen = signal(false);
  passwordSaving = signal(false);
  passwordError = signal('');
  passwordSuccess = signal('');
  pwd = { current: '', next: '', confirm: '' };

  form = {
    firstName: this.deriveFirstName(),
    lastName:  this.deriveLastName(),
    email:     this.user?.email || '',
  };

  async onSave(): Promise<void> {
    this.identityError.set('');
    this.saving.set(true);
    try {
      const updated: any = await firstValueFrom(
        this.users.update(
          this.form.firstName.trim(),
          this.form.lastName.trim(),
          this.form.email.trim(),
        )
      );

      // Synchronise l'utilisateur global (signal + observable + localStorage)
      this.auth.setUser({
        firstName: updated.firstName ?? this.form.firstName,
        lastName:  updated.lastName  ?? this.form.lastName,
        email:     updated.email     ?? this.form.email.trim().toLowerCase(),
        name: `${this.form.firstName} ${this.form.lastName}`.trim(),
      } as any);

      this.user = this.auth.currentUser;
      this.saved.set(true);
      setTimeout(() => this.saved.set(false), 2200);
    } catch (e: any) {
      const raw = e?.error?.message || e?.error;
      if (e?.status === 409 || (typeof raw === 'string' && raw.toLowerCase().includes('email'))) {
        this.identityError.set('Cet email est deja utilise.');
      } else if (typeof raw === 'string' && raw.length < 200) {
        this.identityError.set(raw);
      } else {
        this.identityError.set('Impossible de sauvegarder les informations.');
      }
    } finally {
      this.saving.set(false);
    }
  }

  private deriveFirstName(): string {
    const u: any = this.user;
    if (u?.firstName) return u.firstName;
    return (u?.name || '').split(' ').slice(0, -1).join(' ') || (u?.name || '').split(' ')[0] || '';
  }

  private deriveLastName(): string {
    const u: any = this.user;
    if (u?.lastName) return u.lastName;
    const parts = (u?.name || '').split(' ');
    return parts.length > 1 ? parts.slice(-1)[0] : '';
  }

  togglePasswordForm(): void {
    this.passwordOpen.update(open => !open);
    this.passwordError.set('');
    this.passwordSuccess.set('');
  }

  cancelPasswordChange(): void {
    this.passwordOpen.set(false);
    this.resetPasswordForm();
  }

  get canChangePwd(): boolean {
    return !!this.pwd.current && !!this.pwd.next && this.pwd.next === this.pwd.confirm && this.pwd.next.length >= 8;
  }

  async changePassword(): Promise<void> {
    this.passwordError.set('');
    this.passwordSuccess.set('');
    if (!this.pwd.current) {
      this.passwordError.set('Mot de passe actuel requis.');
      return;
    }
    if (this.pwd.next.length < 8) {
      this.passwordError.set('Minimum 8 caracteres.');
      return;
    }
    if (this.pwd.next !== this.pwd.confirm) {
      this.passwordError.set('La confirmation ne correspond pas.');
      return;
    }

    this.passwordSaving.set(true);
    try {
      await firstValueFrom(this.users.changePassword(this.pwd.current, this.pwd.next));
      this.passwordSuccess.set('Mot de passe mis a jour.');
      this.resetPasswordForm(false);
      setTimeout(() => {
        this.passwordOpen.set(false);
        this.passwordSuccess.set('');
      }, 1400);
    } catch (error: any) {
      const status = error?.status;
      const raw = error?.error?.message || error?.error;
      if (status === 401 || status === 403) {
        this.passwordError.set('Mot de passe actuel incorrect.');
      } else if (typeof raw === 'string' && raw.length < 200) {
        this.passwordError.set(raw);
      } else {
        this.passwordError.set('Impossible de modifier le mot de passe.');
      }
    } finally {
      this.passwordSaving.set(false);
    }
  }

  pwdStrengthPct(): number {
    return [25, 50, 75, 100][this.pwdStrengthLvl() - 1] || 0;
  }

  pwdStrengthLvl(): 1 | 2 | 3 | 4 {
    const p = this.pwd.next;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return Math.max(1, score) as 1 | 2 | 3 | 4;
  }

  pwdStrengthLabel(): string {
    return ['faible', 'moyenne', 'bonne', 'excellente'][this.pwdStrengthLvl() - 1];
  }

  private resetPasswordForm(clearMessages = true): void {
    this.pwd = { current: '', next: '', confirm: '' };
    if (clearMessages) {
      this.passwordError.set('');
      this.passwordSuccess.set('');
    }
  }
}
