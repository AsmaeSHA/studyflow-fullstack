import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../core/services/dashboard.service';
import { UserService } from '../../core/services/user.service';
import { DashboardSummary } from '../../core/models/models';
import { ThemeService, UserTheme } from '../../core/services/theme.service';

interface ProfileForm { firstName: string; lastName: string; email: string; }
interface PasswordForm { current: string; next: string; confirm: string; }

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: {
    '[class.profile-theme-dark]': "theme() === 'dark'",
  },
  template: `
    <div class="profile-root" [class.profile-root--dark]="theme() === 'dark'">
      <section class="hero-section">
        <div class="orbit-ring orbit-ring--1"></div>
        <div class="orbit-ring orbit-ring--2"></div>

        <div class="hex-frame">
          <div class="hex-glow"></div>
          <img
            *ngIf="user?.avatarUrl; else initialsAvatar"
            [src]="user?.avatarUrl"
            [alt]="displayName()"
            class="hero-avatar"
          />
          <ng-template #initialsAvatar>
            <div class="hero-avatar hero-avatar--initials">{{ initials() }}</div>
          </ng-template>
          <div class="online-badge">
            <span class="online-dot"></span>
          </div>
        </div>

        <div class="hero-info">
          <div class="role-badge">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 0 1 2.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0 1 10 1.944ZM11 14a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0-7a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0V7Z" clip-rule="evenodd"/>
            </svg>
            UTILISATEUR
          </div>
          <h1 class="hero-name">{{ displayName() || 'Utilisateur' }}</h1>
          <p class="hero-email">{{ form.email || user?.email }}</p>
          <p class="hero-meta">{{ user?.university || 'StudyFlow' }} &nbsp;-&nbsp; {{ user?.level || 'Espace personnel' }}</p>
        </div>

        <span class="saved-toast" *ngIf="savedToast()">Modifications enregistrees</span>
      </section>

      <div class="body-grid">
        <section class="panel panel--form">
          <div class="panel-head">
            <div class="panel-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
            <h2 class="panel-title">Informations</h2>
          </div>

          <form class="edit-form" (submit)="$event.preventDefault(); saveIdentity()">
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
            <div class="field">
              <label>Role</label>
              <input [value]="user?.role || 'USER'" readonly/>
            </div>
            <div class="field">
              <label>Membre depuis</label>
              <input [value]="(user?.createdAt | date:'d MMM yyyy') || 'Nouveau membre'" readonly/>
            </div>

            <p class="password-msg password-msg--error" *ngIf="identityError()">{{ identityError() }}</p>

            <div class="form-actions">
              <button type="submit" class="btn-save" [class.btn-saved]="savedToast()">
                <svg *ngIf="!savedToast()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <svg *ngIf="savedToast()" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
                {{ savedToast() ? 'Sauvegarde !' : 'Sauvegarder' }}
              </button>
            </div>
          </form>
        </section>

        <div class="right-col">
         

          <section class="panel panel--security">
            <div class="panel-head">
              <div class="panel-icon panel-icon--dark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2 class="panel-title">Securite</h2>
            </div>

            <form class="security-form" (submit)="$event.preventDefault(); changePassword()">
              <div class="security-list">
                <label class="security-row security-row--stack">
                  <span class="sec-left">
                    <span class="sec-label">Mot de passe actuel</span>
                    <span class="sec-hint">Necessaire pour valider le changement</span>
                  </span>
                  <input type="password" [(ngModel)]="pwd.current" name="current" placeholder="Mot de passe actuel"/>
                </label>

                <label class="security-row security-row--stack">
                  <span class="sec-left">
                    <span class="sec-label">Nouveau mot de passe</span>
                    <span class="sec-hint">Minimum 8 caracteres</span>
                  </span>
                  <input type="password" [(ngModel)]="pwd.next" name="next" placeholder="Nouveau mot de passe"/>
                </label>

                <label class="security-row security-row--stack">
                  <span class="sec-left">
                    <span class="sec-label">Confirmation</span>
                    <span class="sec-hint" [class.sec-hint--off]="passwordError">{{ passwordError || pwdStrengthLabel() }}</span>
                  </span>
                  <input type="password" [(ngModel)]="pwd.confirm" name="confirm" placeholder="Confirmer"/>
                </label>
              </div>

              <div class="pwd-strength" *ngIf="pwd.next">
                <div class="bar">
                  <div class="fill" [style.width.%]="pwdStrengthPct()" [class]="'lvl-' + pwdStrengthLvl()"></div>
                </div>
              </div>

              <p class="password-msg password-msg--error" *ngIf="passwordError">{{ passwordError }}</p>
              <p class="password-msg password-msg--success" *ngIf="passwordSuccess()">{{ passwordSuccess() }}</p>

              <div class="panel-actions">
                <button type="submit" class="btn-sec btn-sec--enable" [disabled]="!canChangePwd || passwordSaving()">
                  {{ passwordSaving() ? 'En cours...' : 'Mettre a jour' }}
                </button>
              </div>
            </form>
          </section>

          <section class="panel panel--prefs">
            <div class="panel-head">
              <div class="panel-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 3.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H2a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 3.6 8a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 8 3.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V2a2 2 0 1 1 4 0v.09A1.7 1.7 0 0 0 15 3.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 20.4 8c.1.38.32.72.6 1 .29.28.62.5 1 .6H22a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z"/>
                </svg>
              </div>
              <h2 class="panel-title">Preferences</h2>
            </div>

            <div class="security-list">
              <div class="security-row">
                <div class="sec-left">
                  <span class="sec-label">Theme</span>
                  <span class="sec-hint">Apparence visuelle</span>
                </div>
                <div class="theme-toggle">
                  <button *ngFor="let t of themes" type="button" class="t-btn" [class.on]="theme() === t.v" (click)="setTheme(t.v)">
                    {{ t.l }}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral: #ff8e7e;
      --dark: #1a1a1a;
      --white: #fff;
      --border: rgba(0,0,0,.07);
      --radius: 24px;
      --shadow: 0 8px 32px rgba(0,0,0,.06);
      display: block;
      padding: 0 0 48px;
      color: var(--dark);
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    :host(.profile-theme-dark) {
      background: #11100f;
    }

    .profile-root {
      animation: page-in 520ms cubic-bezier(.22,1,.36,1) both;
      min-height: calc(100vh - 48px);
      border-radius: var(--radius);
      transition: background 220ms ease, color 220ms ease;
    }
    .profile-root--dark {
      background: #11100f;
      color: #f7f0e8;
    }
    .profile-root--dark .panel {
      background: #1b1a18;
      border-color: rgba(255,255,255,.1);
      box-shadow: 0 16px 48px rgba(0,0,0,.28);
    }
    .profile-root--dark .panel:hover {
      box-shadow: 0 18px 56px rgba(0,0,0,.34);
    }
    .profile-root--dark .panel-head,
    .profile-root--dark .security-row {
      border-color: rgba(255,255,255,.1);
    }
    .profile-root--dark .panel-title,
    .profile-root--dark .sec-label,
    .profile-root--dark .hero-name {
      color: #f7f0e8;
    }
    .profile-root--dark .sec-hint,
    .profile-root--dark .field label {
      color: rgba(247,240,232,.62);
    }
    .profile-root--dark .field input,
    .profile-root--dark .security-row input {
      background: #24221f;
      border-color: rgba(255,255,255,.12);
      color: #f7f0e8;
    }
    .profile-root--dark .field input:focus,
    .profile-root--dark .security-row input:focus {
      background: #2b2925;
    }
    .profile-root--dark .field input[readonly] {
      color: rgba(247,240,232,.58);
    }
    .profile-root--dark .theme-toggle {
      background: #2a2824;
    }
    .profile-root--dark .t-btn {
      color: rgba(247,240,232,.62);
    }
    .profile-root--dark .t-btn.on {
      background: var(--yellow);
      color: #161412;
    }
    @keyframes page-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

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
    }

    .orbit-ring {
      position: absolute;
      border-radius: 50%;
      border: 1px solid rgba(245,197,24,.12);
      pointer-events: none;
      animation: orbit-spin linear infinite;
    }
    .orbit-ring--1 {
      width: 320px;
      height: 320px;
      top: -100px;
      right: -60px;
      animation-duration: 28s;
    }
    .orbit-ring--2 {
      width: 200px;
      height: 200px;
      top: -40px;
      right: 20px;
      border-color: rgba(255,142,126,.15);
      animation-duration: 18s;
      animation-direction: reverse;
    }
    @keyframes orbit-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

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
      to { transform: rotate(360deg); }
    }
    .hero-avatar {
      position: relative;
      z-index: 1;
      width: 112px;
      height: 112px;
      border-radius: 50%;
      object-fit: cover;
      margin: 4px;
      display: grid;
      place-items: center;
      border: 3px solid var(--dark);
      background: #2b2b2b;
      color: var(--yellow);
      font-size: 34px;
      font-weight: 900;
      letter-spacing: -.04em;
    }
    .online-badge {
      position: absolute;
      bottom: 4px;
      right: 4px;
      width: 22px;
      height: 22px;
      background: var(--dark);
      border-radius: 50%;
      display: grid;
      place-items: center;
      z-index: 2;
    }
    .online-dot {
      width: 12px;
      height: 12px;
      background: #5bd49a;
      border-radius: 50%;
      display: block;
      animation: pulse-dot 2s ease-in-out infinite;
    }
    @keyframes pulse-dot {
      0%, 100% { box-shadow: 0 0 0 0 rgba(91,212,154,.5); }
      50% { box-shadow: 0 0 0 6px rgba(91,212,154,0); }
    }

    .hero-info {
      z-index: 2;
      min-width: 0;
    }
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
    .role-badge svg {
      width: 14px;
      height: 14px;
      fill: var(--yellow);
    }
    .hero-name {
      margin: 0 0 4px;
      font-size: 2rem;
      font-weight: 800;
      color: #fff;
      letter-spacing: -.03em;
    }
    .hero-email {
      margin: 0 0 6px;
      color: rgba(255,255,255,.55);
      font-size: .9rem;
    }
    .hero-meta {
      margin: 0;
      color: rgba(255,255,255,.35);
      font-size: .82rem;
    }
    .saved-toast {
      position: absolute;
      top: 24px;
      right: 24px;
      z-index: 3;
      padding: 8px 14px;
      border-radius: 999px;
      background: rgba(91,212,154,.16);
      border: 1px solid rgba(91,212,154,.28);
      color: #9ff0c5;
      font-size: 12px;
      font-weight: 800;
    }

    .body-grid {
      display: grid;
      grid-template-columns: 1fr 1.1fr;
      gap: 20px;
      align-items: start;
    }
    .right-col {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .panel {
      background: var(--white);
      border-radius: var(--radius);
      border: 1px solid var(--border);
      box-shadow: var(--shadow);
      overflow: hidden;
      transition: box-shadow 250ms ease;
    }
    .panel:hover {
      box-shadow: 0 16px 48px rgba(0,0,0,.09);
    }
    .panel-head {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 20px 24px 16px;
      border-bottom: 1px solid var(--border);
    }
    .panel-icon {
      width: 36px;
      height: 36px;
      border-radius: 12px;
      display: grid;
      place-items: center;
      background: rgba(245,197,24,.1);
      color: #c9a200;
      flex-shrink: 0;
    }
    .panel-icon svg {
      width: 16px;
      height: 16px;
    }
    .panel-icon--dark {
      background: var(--dark);
      color: var(--yellow);
    }
    .panel-icon--yellow {
      background: rgba(245,197,24,.12);
      color: #c9a200;
    }
    .panel-title {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: var(--dark);
    }
    .panel--form {
      animation: slide-left 550ms cubic-bezier(.22,1,.36,1) 120ms both;
    }
    .panel--stats,
    .panel--security,
    .panel--prefs {
      animation: slide-right 550ms cubic-bezier(.22,1,.36,1) 180ms both;
    }
    @keyframes slide-left {
      from { opacity: 0; transform: translateX(-20px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-right {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .edit-form,
    .security-form {
      padding: 20px 24px 24px;
    }
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .field label {
      font-size: .78rem;
      font-weight: 700;
      color: #777;
      text-transform: uppercase;
      letter-spacing: .06em;
    }
    .field input,
    .security-row input {
      padding: 12px 16px;
      border-radius: 14px;
      border: 1.5px solid #e8dfd5;
      background: #faf8f5;
      font-size: .93rem;
      color: var(--dark);
      transition: border 200ms ease, box-shadow 200ms ease;
      outline: none;
    }
    .field input:focus,
    .security-row input:focus {
      border-color: var(--yellow);
      box-shadow: 0 0 0 4px rgba(245,197,24,.12);
      background: #fff;
    }
    .field input[readonly] {
      color: #777;
    }
    .form-actions {
      padding-top: 4px;
    }
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
    .btn-save svg {
      width: 16px;
      height: 16px;
    }
    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(26,26,26,.22);
    }
    .btn-save.btn-saved {
      background: #2da96a;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
      padding: 20px 24px 24px;
    }
    .stat-tile {
      min-height: 88px;
      padding: 16px;
      border-radius: 18px;
      background: #faf8f5;
      border: 1px solid #f0e7dd;
    }
    .stat-tile strong {
      display: block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 1.35rem;
      font-weight: 900;
      letter-spacing: -.04em;
      color: var(--dark);
    }
    .stat-tile span {
      display: block;
      margin-top: 6px;
      color: #999;
      font-size: .76rem;
      font-weight: 700;
    }

    .security-list {
      padding: 8px 24px 16px;
      display: flex;
      flex-direction: column;
    }
    .security-form .security-list {
      padding: 0;
    }
    .security-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 0;
      border-bottom: 1px solid #f5f0e8;
    }
    .security-row:last-child {
      border-bottom: none;
    }
    .security-row--stack {
      align-items: stretch;
      flex-direction: column;
    }
    .sec-left {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .sec-label {
      font-size: .88rem;
      font-weight: 600;
      color: var(--dark);
    }
    .sec-hint {
      font-size: .76rem;
      color: #999;
    }
    .sec-hint--off {
      color: #e05a47;
    }
    .pwd-strength {
      padding-top: 4px;
    }
    .pwd-strength .bar {
      height: 4px;
      background: rgba(0,0,0,.06);
      border-radius: 4px;
      overflow: hidden;
    }
    .pwd-strength .fill {
      height: 100%;
      transition: width 300ms ease;
      border-radius: 4px;
    }
    .pwd-strength .fill.lvl-1 { background: #e05555; }
    .pwd-strength .fill.lvl-2 { background: #f0a030; }
    .pwd-strength .fill.lvl-3 { background: #5bd49a; }
    .pwd-strength .fill.lvl-4 { background: #1a7a4a; }

    .password-msg {
      margin: 8px 0 0;
      font-size: .78rem;
      font-weight: 700;
    }
    .password-msg--error   { color: #e05a47; }
    .password-msg--success { color: #2da96a; }

    .panel-actions {
      display: flex;
      justify-content: flex-end;
      padding: 0 24px 24px;
    }
    .security-form .panel-actions {
      padding: 18px 0 0;
    }
    .btn-sec {
      padding: 9px 18px;
      border-radius: 999px;
      border: 1.5px solid #e8dfd5;
      background: transparent;
      color: var(--dark);
      font-size: .8rem;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 180ms ease;
    }
    .btn-sec:hover:not(:disabled) {
      border-color: var(--dark);
      background: var(--dark);
      color: #fff;
    }
    .btn-sec--enable {
      border-color: #2da96a;
      color: #2da96a;
    }
    .btn-sec--enable:hover:not(:disabled) {
      background: #2da96a;
      color: #fff;
    }
    .btn-sec:disabled {
      opacity: .45;
      cursor: not-allowed;
    }

    .theme-toggle {
      display: flex;
      gap: 4px;
      background: #f5f1ea;
      padding: 4px;
      border-radius: 999px;
    }
    .t-btn {
      padding: 7px 14px;
      border-radius: 999px;
      border: none;
      background: transparent;
      color: #777;
      font-size: 12px;
      font-weight: 800;
      cursor: pointer;
      transition: background 160ms ease, color 160ms ease;
    }
    .t-btn.on {
      background: var(--dark);
      color: var(--yellow);
    }
    @media (max-width: 900px) {
      .body-grid {
        grid-template-columns: 1fr;
      }
      .hero-section {
        align-items: flex-start;
        flex-direction: column;
      }
      .saved-toast {
        position: static;
        align-self: flex-start;
      }
    }

    @media (max-width: 560px) {
      .hero-section {
        padding: 28px 24px;
      }
      .hero-name {
        font-size: 1.55rem;
      }
      .stats-grid {
        grid-template-columns: 1fr;
      }
      .security-row {
        align-items: stretch;
        flex-direction: column;
      }
      .theme-toggle {
        align-self: flex-start;
      }
    }
  `]
})
export class ProfileComponent implements OnInit {
  private auth = inject(AuthService);
  private dashboard = inject(DashboardService);
  private themeService = inject(ThemeService);
  private users = inject(UserService);

  user = this.auth.currentUser;
  summary?: DashboardSummary;
  savedToast = signal(false);
  theme = this.themeService.theme;

  form: ProfileForm = {
    firstName: this.deriveFirstName(),
    lastName: this.deriveLastName(),
    email: this.user?.email || '',
  };

  pwd: PasswordForm = { current: '', next: '', confirm: '' };
  passwordError = '';
  passwordSaving = signal(false);
  passwordSuccess = signal('');

  themes: Array<{ l: string; v: UserTheme }> = [
    { l: 'Clair', v: 'light' },
    { l: 'Sombre', v: 'dark' },
  ];

  userView = computed(() => ({
    ...this.user,
    firstName: this.form.firstName,
    lastName: this.form.lastName,
    email: this.form.email,
    name: `${this.form.firstName} ${this.form.lastName}`.trim(),
  }));

  ngOnInit(): void {
    this.dashboard.getSummary().subscribe(s => this.summary = s);
  }

  displayName(): string {
    return this.userView().name || this.user?.name || 'Utilisateur';
  }

  initials(): string {
    return this.displayName()
      .split(' ')
      .filter(Boolean)
      .map(part => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U';
  }

  identityError = signal('');

  async saveIdentity(): Promise<void> {
    this.identityError.set('');
    try {
      // POST sur le backend : firstName + lastName + email -> table users
      const updated: any = await firstValueFrom(
        this.users.update(
          this.form.firstName.trim(),
          this.form.lastName.trim(),
          this.form.email.trim(),
        )
      );

      // Synchronise l'AuthService (localStorage + signal + observable)
      this.auth.setUser({
        firstName: updated.firstName ?? this.form.firstName,
        lastName:  updated.lastName  ?? this.form.lastName,
        email:     updated.email     ?? this.form.email.trim().toLowerCase(),
        name: `${this.form.firstName} ${this.form.lastName}`.trim(),
      } as any);

      // Recharge le user local du composant
      this.user = this.auth.currentUser;

      this.flashSaved();
    } catch (e: any) {
      const raw = e?.error?.message || e?.error;
      if (e?.status === 409 || (typeof raw === 'string' && raw.toLowerCase().includes('email'))) {
        this.identityError.set('Cet email est deja utilise.');
      } else if (typeof raw === 'string' && raw.length < 200) {
        this.identityError.set(raw);
      } else {
        this.identityError.set('Impossible de sauvegarder les informations.');
      }
    }
  }

  get canChangePwd(): boolean {
    return !!this.pwd.current && !!this.pwd.next && this.pwd.next === this.pwd.confirm && this.pwd.next.length >= 8;
  }

  async changePassword(): Promise<void> {
    this.passwordError = '';
    this.passwordSuccess.set('');
    if (!this.pwd.current) { this.passwordError = 'Mot de passe actuel requis.'; return; }
    if (this.pwd.next.length < 8) { this.passwordError = 'Minimum 8 caracteres.'; return; }
    if (this.pwd.next !== this.pwd.confirm) { this.passwordError = 'La confirmation ne correspond pas.'; return; }

    this.passwordSaving.set(true);
    try {
      // Appel API reel : POST /api/users/me/password
      // - Le backend verifie l'ancien mot de passe avec BCrypt
      // - Si OK, encode le nouveau et le sauvegarde dans la table users
      await firstValueFrom(this.users.changePassword(this.pwd.current, this.pwd.next));
      this.pwd = { current: '', next: '', confirm: '' };
      this.passwordSuccess.set('Mot de passe mis a jour en base.');
      this.flashSaved();
      setTimeout(() => this.passwordSuccess.set(''), 3000);
    } catch (e: any) {
      const status = e?.status;
      const raw = e?.error?.message || e?.error;
      if (status === 401 || status === 403) {
        this.passwordError = 'Mot de passe actuel incorrect.';
      } else if (typeof raw === 'string' && raw.length < 200) {
        this.passwordError = raw;
      } else {
        this.passwordError = 'Impossible de modifier le mot de passe.';
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
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/\d/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return Math.max(1, s) as 1 | 2 | 3 | 4;
  }

  pwdStrengthLabel(): string {
    return ['faible', 'moyenne', 'bonne', 'excellente'][this.pwdStrengthLvl() - 1];
  }

  setTheme(theme: UserTheme) {
    this.themeService.setTheme(theme);
  }

  private flashSaved() {
    this.savedToast.set(true);
    setTimeout(() => this.savedToast.set(false), 3000);
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
}
