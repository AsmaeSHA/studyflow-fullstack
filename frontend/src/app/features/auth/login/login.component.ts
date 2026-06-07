import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AdminUserService } from '../../../core/services/admin-user.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-scene">
      <!-- Animated wave background -->
      <svg class="wave-layer" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
        <!-- Original waves -->
        <path class="wave wave-coral"
          d="M-100 550 Q200 450 500 550 T1100 550 T1700 550">
          <animate attributeName="d" dur="10s" repeatCount="indefinite"
            values="
              M-100 550 Q200 450 500 550 T1100 550 T1700 550;
              M-100 550 Q200 650 500 550 T1100 550 T1700 550;
              M-100 550 Q200 450 500 550 T1100 550 T1700 550" />
        </path>
        <path class="wave wave-gold"
          d="M-100 580 Q200 680 500 580 T1100 580 T1700 580">
          <animate attributeName="d" dur="12s" repeatCount="indefinite"
            values="
              M-100 580 Q200 680 500 580 T1100 580 T1700 580;
              M-100 580 Q200 480 500 580 T1100 580 T1700 580;
              M-100 580 Q200 680 500 580 T1100 580 T1700 580" />
        </path>
        <path class="wave wave-dark"
          d="M-100 520 Q200 420 500 520 T1100 520 T1700 520">
          <animate attributeName="d" dur="14s" repeatCount="indefinite"
            values="
              M-100 520 Q200 420 500 520 T1100 520 T1700 520;
              M-100 520 Q200 620 500 520 T1100 520 T1700 520;
              M-100 520 Q200 420 500 520 T1100 520 T1700 520" />
        </path>
        
        <!-- New larger center waves with full width -->
        <path class="wave wave-center-coral"
          d="M-100 350 Q400 200 800 350 T1700 350">
          <animate attributeName="d" dur="15s" repeatCount="indefinite"
            values="
              M-100 350 Q400 200 800 350 T1700 350;
              M-100 350 Q400 500 800 350 T1700 350;
              M-100 350 Q400 200 800 350 T1700 350;
              M-100 350 Q400 300 800 350 T1700 350;
              M-100 350 Q400 200 800 350 T1700 350" />
        </path>
        
        <path class="wave wave-center-gold"
          d="M-100 420 Q400 280 800 420 T1700 420">
          <animate attributeName="d" dur="18s" repeatCount="indefinite"
            values="
              M-100 420 Q400 280 800 420 T1700 420;
              M-100 420 Q400 560 800 420 T1700 420;
              M-100 420 Q400 280 800 420 T1700 420;
              M-100 420 Q400 380 800 420 T1700 420;
              M-100 420 Q400 280 800 420 T1700 420" />
        </path>
      </svg>

      <div class="auth-frame">
        <header class="scene-header">
          <a class="brand" routerLink="/auth/login">StudyFlow</a>
        </header>

        <main class="auth-layout">
          <section class="scene-copy">
            <h1 class="main-title animate-slide-up">
              Study in a<br />
              softer rhythm.
            </h1>

            <p class="subtitle animate-fade-loop">
              Learn calmly, stay focused, and keep your study flow organized.
            </p>
          </section>

          <article class="auth-card animate-fade-in-delayed" [class.shake]="shakeForm">
            <div class="form-header">
              <h2 class="welcome-title">Welcome Back.</h2>
              <p class="form-subtitle">Sign in to your account</p>
            </div>

            <form class="login-form" (ngSubmit)="login()">

              <!-- Email field -->
              <div class="field-group">
                <label for="email">Email</label>
                <div class="field-control"
                     [class.field-valid]="emailValid === true"
                     [class.field-invalid]="emailValid === false">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 21c1.6-4.2 5-6.2 8-6.2s6.4 2 8 6.2" />
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    [(ngModel)]="email"
                    (ngModelChange)="validateEmail()"
                    placeholder="Enter your email"
                    autocomplete="email"
                  />
                  <!-- Validation icon -->
                  <span class="validation-icon" *ngIf="emailValid !== null">
                    <svg *ngIf="emailValid" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    <svg *ngIf="!emailValid" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2.5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </span>
                </div>
              </div>

              <!-- Password field -->
              <div class="field-group">
                <label for="password">Password</label>
                <div class="field-control">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <rect x="5" y="10" width="14" height="10" rx="2" />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    id="password"
                    name="password"
                    [type]="showPassword ? 'text' : 'password'"
                    [(ngModel)]="password"
                    placeholder="Enter your password"
                    autocomplete="current-password"
                  />
                  <button
                    type="button"
                    class="icon-button"
                    (click)="togglePassword()"
                    [attr.aria-label]="showPassword ? 'Hide password' : 'Show password'"
                  >
                    <svg *ngIf="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <path d="M2.5 12s3.6-6.5 9.5-6.5S21.5 12 21.5 12s-3.6 6.5-9.5 6.5S2.5 12 2.5 12Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg *ngIf="showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7">
                      <path d="M3 3l18 18" />
                      <path d="M10.7 5.7c.4-.1.8-.2 1.3-.2 5.9 0 9.5 6.5 9.5 6.5a17.7 17.7 0 0 1-2.5 3.4" />
                      <path d="M6.2 6.8C3.8 8.6 2.5 12 2.5 12s3.6 6.5 9.5 6.5c1.7 0 3.2-.5 4.5-1.2" />
                    </svg>
                  </button>
                </div>
              </div>

              <!-- Remember me + Forgot password -->
              <div class="form-row">
                <label class="remember-label">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    [(ngModel)]="rememberMe"
                    class="remember-checkbox"
                  />
                  <span class="remember-text">Remember me</span>
                </label>
                <a class="forgot-link" routerLink="/auth/forgot-password">Mot de passe oublié ?</a>
              </div>

              <!-- Global error -->
              <p *ngIf="errorMessage" class="error-text" role="alert">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {{ errorMessage }}
              </p>

              <!-- Submit button with spinner -->
              <button type="submit" class="sign-btn" [disabled]="isLoading">
                <span class="spinner" *ngIf="isLoading"></span>
                <span>{{ isLoading ? 'Signing in…' : 'Sign in' }}</span>
              </button>

              <div class="divider"><span>or</span></div>

              <!-- Google OAuth -->
              <button type="button" class="google-btn" (click)="continueWithGoogle()">
                <svg viewBox="0 0 24 24" width="18" height="18">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <p class="signup-text">
                Don't have an account?
                <a routerLink="/auth/register">Sign up</a>
              </p>
            </form>
          </article>
        </main>
      </div>
    </section>
  `,
  styles: [`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Inter:wght@300;400;500;600&display=swap');

    :host {
      display: block;
      min-height: 100vh;
    }

    /* ─── Scene ─────────────────────────────────────── */
    .auth-scene {
      --beige: #eee5d7;
      --ink: #171717;
      --circle-dark: #171717;
      --circle-coral: #ff8177;
      --circle-gold: #ffd83d;
      position: relative;
      min-height: 100vh;
      display: grid;
      place-items: center;
      overflow: hidden;
      background:
        radial-gradient(circle at 28% 20%, rgba(255, 129, 119, 0.15), transparent 20%),
        radial-gradient(circle at 72% 14%, rgba(255, 216, 61, 0.15), transparent 22%),
        var(--beige);
      color: var(--ink);
    }

    /* ─── Waves ─────────────────────────────────────── */
    .wave-layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }

    .wave {
      fill: none;
      stroke-width: 3.2;
      stroke-linecap: round;
      opacity: 0.7;
      vector-effect: non-scaling-stroke;
    }

    .wave-dark  { stroke: var(--circle-dark);  filter: drop-shadow(0 8px 6px rgba(23,23,23,.18)); }
    .wave-gold  { stroke: var(--circle-gold);  filter: drop-shadow(0 8px 6px rgba(255,216,61,.35)); }
    .wave-coral { stroke: var(--circle-coral); filter: drop-shadow(0 8px 6px rgba(255,129,119,.32)); }
    
    /* New larger center waves with full width */
    .wave-center-coral { 
      stroke: var(--circle-coral); 
      filter: drop-shadow(0 12px 12px rgba(255,129,119,.45));
      stroke-width: 4.5;
      opacity: 0.85;
    }
    
    .wave-center-gold { 
      stroke: var(--circle-gold); 
      filter: drop-shadow(0 12px 12px rgba(255,216,61,.45));
      stroke-width: 4.5;
      opacity: 0.85;
    }

    /* ─── Layout ─────────────────────────────────────── */
    .auth-frame {
      position: relative;
      z-index: 2;
      width: min(1400px, calc(100vw - 80px));
      min-height: 100vh;
      display: grid;
      grid-template-rows: auto 1fr;
      padding: 20px 50px 24px;
    }

    .scene-copy {
      max-width: 760px;
      padding-top: 60px;
    }
    
    .brand {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--ink);
      text-decoration: none;
    }

    .auth-layout {
      display: grid;
      grid-template-columns: 1fr 480px;
      align-items: start;
      gap: clamp(40px, 6vw, 100px);
      padding: 0;
      min-height: auto;
    }

    .main-title {
      font-family: 'Inter', sans-serif;
      margin: 0;
      font-size: clamp(52px, 5.4vw, 76px);
      line-height: 1.02;
      letter-spacing: -0.045em;
      font-weight: 800;
      color: #1f2937;
      white-space: normal;
      text-shadow:
        0 0 40px rgba(255, 216, 61, 0.22),
        0 0 80px rgba(255, 129, 119, 0.16);
    }

    /* ─── Animations ─────────────────────────────────── */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-20px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(40px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    @keyframes shake {
      0%,100% { transform: translateX(0); }
      15%      { transform: translateX(-8px); }
      30%      { transform: translateX(7px); }
      45%      { transform: translateX(-5px); }
      60%      { transform: translateX(4px); }
      75%      { transform: translateX(-2px); }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .animate-slide-up {
      animation: slideUp 1s ease-out 0.2s forwards;
      opacity: 0;
    }

    .animate-fade-in-delayed {
      animation: fadeIn 0.8s ease-out 0.4s forwards;
      opacity: 0;
    }

    .shake {
      animation: shake 0.45s ease;
      opacity: 1;
    }

    /* ─── Card ───────────────────────────────────────── */
    .auth-card {
      width: 480px;
      justify-self: end;
      border: 1.5px solid rgba(23, 23, 23, 0.12);
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.85);
      box-shadow:
        0 30px 70px rgba(23, 23, 23, 0.1),
        0 0 0 1px rgba(255, 255, 255, 0.5) inset;
      backdrop-filter: blur(20px);
      overflow: hidden;
    }

    .form-header {
      text-align: center;
      padding: 20px 40px 16px;
      border-bottom: 1px solid rgba(23, 23, 23, 0.08);
    }

    .welcome-title {
      font-family: 'Playfair Display', serif;
      margin: 0 0 6px;
      font-size: 28px;
      line-height: 1.2;
      font-weight: 600;
      color: var(--ink);
    }

    .form-subtitle {
      font-family: 'Inter', sans-serif;
      margin: 0;
      font-size: 15px;
      color: var(--ink);
      opacity: 0.7;
    }

    /* ─── Form ───────────────────────────────────────── */
    .login-form {
      display: flex;
      flex-direction: column;
      padding: 20px 36px 24px;
    }

    .field-group {
      display: flex;
      flex-direction: column;
      gap: 7px;
      margin-bottom: 14px;
    }

    label {
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
    }

    /* ─── Field control ──────────────────────────────── */
    .field-control {
      min-height: 52px;
      display: flex;
      align-items: center;
      border: 1.5px solid rgba(23, 23, 23, 0.12);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.9);
      transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
    }

    .field-control:focus-within {
      border-color: var(--circle-gold);
      background: rgba(255, 255, 255, 1);
      box-shadow: 0 0 0 4px rgba(255, 216, 61, 0.12);
    }

    .field-control.field-valid {
      border-color: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.1);
    }

    .field-control.field-invalid {
      border-color: #ef4444;
      box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.08);
    }

    .field-icon,
    .icon-button {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      color: var(--ink);
      flex: 0 0 auto;
    }

    .field-icon svg,
    .icon-button svg {
      width: 20px;
      height: 20px;
    }

    .validation-icon {
      width: 36px;
      height: 36px;
      display: grid;
      place-items: center;
      flex-shrink: 0;
    }

    .validation-icon svg {
      width: 16px;
      height: 16px;
    }

    input[type="email"],
    input[type="password"],
    input[type="text"] {
      min-width: 0;
      flex: 1;
      border: 0;
      outline: 0;
      background: transparent;
      color: var(--ink);
      font-family: 'Inter', sans-serif;
      font-size: 16px;
      padding: 0 12px 0 0;
    }

    input::placeholder {
      color: rgba(23, 23, 23, 0.4);
    }

    .icon-button {
      border: 0;
      border-radius: 50%;
      background: transparent;
      cursor: pointer;
      transition: background 160ms ease, transform 160ms ease;
    }

    .icon-button:hover {
      background: rgba(23, 23, 23, 0.07);
      transform: translateY(-1px);
    }

    /* ─── Hints ──────────────────────────────────────── */
    .field-hint {
      font-family: 'Inter', sans-serif;
      font-size: 12.5px;
      font-weight: 500;
      padding-left: 2px;
      color: #ef4444;
    }

    .field-hint.hint-ok   { color: #16a34a; }
    .field-hint.hint-warn { color: #d97706; }
    .field-hint.hint-err  { color: #ef4444; }

    /* ─── Remember me + forgot ───────────────────────── */
    .form-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .remember-label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      font-weight: 400 !important;
    }

    .remember-checkbox {
      accent-color: var(--ink);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }

    .remember-text {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      color: var(--ink);
      opacity: 0.75;
      font-weight: 400;
    }

    .forgot-link {
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      color: var(--ink);
      opacity: 0.8;
      text-decoration: none;
      border-bottom: 1px dashed rgba(23, 23, 23, 0.35);
      transition: opacity 150ms;
    }

    .forgot-link:hover {
      opacity: 1;
    }

    /* ─── Error message ──────────────────────────────── */
    .error-text {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      color: #dc2626;
      font-family: 'Inter', sans-serif;
      font-size: 14px;
      font-weight: 500;
      background: rgba(220, 38, 38, 0.06);
      border: 1px solid rgba(220, 38, 38, 0.15);
      border-radius: 10px;
      padding: 10px 14px;
    }

    .error-text svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    /* ─── Buttons ────────────────────────────────────── */
    .sign-btn,
    .outline-btn,
    .google-btn {
      width: 100%;
      min-height: 52px;
      border-radius: 12px;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 180ms ease, box-shadow 180ms ease, opacity 180ms ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
    }

    .sign-btn {
      border: 1.5px solid var(--ink);
      background: var(--ink);
      color: var(--circle-gold);
      box-shadow: 0 16px 24px rgba(23, 23, 23, 0.18);
    }

    .sign-btn:hover:not(:disabled) { transform: translateY(-2px); }
    .sign-btn:disabled { opacity: 0.6; cursor: not-allowed; }

    /* Spinner inside sign-btn */
    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 216, 61, 0.3);
      border-top-color: var(--circle-gold);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
      flex-shrink: 0;
    }

    /* Google button */
    .google-btn {
      border: 1.5px solid rgba(23, 23, 23, 0.15);
      background: rgba(255, 255, 255, 0.7);
      color: var(--ink);
      font-weight: 500;
      margin-bottom: 0;
    }

    .google-btn:hover {
      transform: translateY(-2px);
      background: rgba(255, 255, 255, 0.95);
      border-color: rgba(23, 23, 23, 0.25);
    }
    .google-btn[disabled] {
      opacity: .55;
      cursor: not-allowed;
      pointer-events: none;
    }

    .forgot-link.disabled {
      opacity: .55;
      cursor: not-allowed;
      text-decoration: line-through;
    }

    /* Outline button */
    .outline-btn {
      border: 1.5px solid rgba(23, 23, 23, 0.18);
      background: rgba(255, 255, 255, 0.6);
      color: var(--ink);
      margin-top: 8px;
    }

    .outline-btn:hover { transform: translateY(-2px); }

    /* ─── Divider ─────────────────────────────────────── */
    .divider {
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      align-items: center;
      gap: 16px;
      margin: 14px 0 14px;
      font-family: 'Inter', sans-serif;
      font-size: 13px;
      font-weight: 500;
      color: var(--ink);
      opacity: 0.6;
    }

    .divider::before,
    .divider::after {
      content: "";
      height: 1px;
      background: rgba(23, 23, 23, 0.15);
    }

    /* ─── Sign up link ───────────────────────────────── */
    .signup-text {
      font-family: 'Inter', sans-serif;
      margin: 14px 0 0;
      text-align: center;
      font-size: 14px;
      color: var(--ink);
      opacity: 0.8;
      font-weight: 400;
    }

    .signup-text a {
      margin-left: 6px;
      font-weight: 600;
      color: var(--ink);
      text-decoration: none;
      border-bottom: 1.5px solid rgba(23, 23, 23, 0.3);
    }

    .subtitle {
      margin-top: 22px;
      max-width: 560px;
      font-family: 'Inter', sans-serif;
      font-size: 20px;
      line-height: 1.55;
      color: rgba(31, 41, 55, 0.68);
    }

    /* Animation douce */
    @keyframes fadeLoop {
      0%   { opacity: 0; transform: translateY(10px); }
      18%  { opacity: 1; transform: translateY(0); }
      82%  { opacity: 1; transform: translateY(0); }
      100% { opacity: 0; transform: translateY(-8px); }
    }

    .animate-fade-loop {
      animation: fadeLoop 6s ease-in-out infinite;
    }

    /* ─── Responsive ─────────────────────────────────── */
    @media (max-width: 1100px) {
      .auth-layout {
        grid-template-columns: 1fr;
        gap: 32px;
        padding: 0 0 25px;
      }
      
      .scene-copy {
        max-width: 520px;
        padding-top: 0;
        display: flex;
        align-items: center;
        align-self: center;
      }

      .main-title { font-size: clamp(42px, 5vw, 56px); }

      .auth-card {
        width: min(480px, 100%);
        justify-self: center;
      }
    }

    @media (max-width: 640px) {
      .auth-frame {
        min-height: 100vh;
        padding: 16px 20px 24px;
      }

      .scene-header {
        display: flex;
        align-items: center;
        justify-content: flex-start;
        margin-bottom: 50px;
      }
      
      .brand { font-size: 22px; }
      .main-title { font-size: 28px; white-space: normal; }

      .form-header {
        padding: 20px 28px 16px;
      }

      .welcome-title { font-size: 26px; }

      .login-form {
        padding: 20px 24px 24px;
      }
    }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly analytics = inject(AnalyticsService);
  private readonly adminUsers = inject(AdminUserService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Form fields
  email = '';
  password = '';
  rememberMe = false;

  // UI state
  isLoading = false;
  errorMessage = '';
  showPassword = false;
  shakeForm = false;

  // Validation state
  emailValid: boolean | null = null;
  trigger: any;

  validateEmail(): void {
    if (!this.email) {
      this.emailValid = null;
      return;
    }
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    this.emailValid = re.test(this.email.trim());
  }

  private triggerShake(): void {
    this.shakeForm = true;
    setTimeout(() => (this.shakeForm = false), 500);
  }

  /** Redirige vers Spring qui declenche le flow OAuth2 Google. */
  continueWithGoogle(): void {
    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
  }

  async login(): Promise<void> {
    if (this.isLoading) return;  // anti double-soumission

    if (!this.email.trim() || !this.password.trim()) {
      this.errorMessage = 'Veuillez saisir email et mot de passe.';
      this.triggerShake();
      return;
    }
    if (this.emailValid === false) {
      this.errorMessage = 'Email invalide.';
      this.triggerShake();
      return;
    }

    this.errorMessage = '';
    this.isLoading = true;
    this.cdr.markForCheck();

    try {
      const res = await firstValueFrom(this.auth.login(this.email, this.password));
      if (res?.user?.role === 'ADMIN') {
        this.adminUsers.listUsers().subscribe();
        try {
          await firstValueFrom(this.analytics.refreshAdminStats());
        } catch {
          console.warn('[login] Impossible de precharger les statistiques admin');
        }
        await this.router.navigate(['/admin']);
      } else {
        await this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.error?.message;
      if (status === 401) {
        this.errorMessage = msg || 'Email ou mot de passe incorrect.';
      } else if (status === 0) {
        this.errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
      } else {
        this.errorMessage = msg || 'Une erreur est survenue. Veuillez réessayer.';
      }
      this.triggerShake();
    } finally {
      this.isLoading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();   // force le re-render immediat de "Sign in"
    }
  }
    
      togglePassword(): void {
        this.showPassword = !this.showPassword;
      }
    
      loginWithGoogle(): void {
        // TODO: Implement Google OAuth login
      }
    
      fillDemoAdmin(): void {
        this.email = 'admin@example.com';
        this.password = 'DemoPassword123!';
        this.validateEmail();
      }
    }
    
