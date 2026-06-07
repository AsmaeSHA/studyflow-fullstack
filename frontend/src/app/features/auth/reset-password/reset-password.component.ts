import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-scene">
      <div class="auth-card">
        <a class="brand" routerLink="/auth/login">StudyFlow</a>
        <h1 class="title">Nouveau mot de passe</h1>
        <p class="subtitle">Choisis un nouveau mot de passe pour ton compte.</p>

        <p *ngIf="!token" class="error-text" role="alert">
          Lien invalide ou expiré. Demande un nouveau lien sur la page <a routerLink="/auth/forgot-password">mot de passe oublié</a>.
        </p>

        <form *ngIf="token" (ngSubmit)="submit()" autocomplete="off">
          <label class="field">
            <span class="field-label">Nouveau mot de passe</span>
            <input [type]="showPwd ? 'text' : 'password'" [(ngModel)]="password" name="password"
                   minlength="8" required [disabled]="loading"/>
            <small class="hint">Au moins 8 caractères.</small>
          </label>
          <label class="field">
            <span class="field-label">Confirmer</span>
            <input [type]="showPwd ? 'text' : 'password'" [(ngModel)]="confirmPassword" name="confirm"
                   required [disabled]="loading"/>
          </label>

          <label class="show-pwd">
            <input type="checkbox" [(ngModel)]="showPwd" name="show"/> Afficher les mots de passe
          </label>

          <p *ngIf="errorMessage" class="error-text" role="alert">{{ errorMessage }}</p>
          <p *ngIf="successMessage" class="success-text" role="status"> {{ successMessage }}</p>

          <button type="submit" class="primary-btn" [disabled]="loading || !!successMessage">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Réinitialisation…' : 'Réinitialiser' }}
          </button>
        </form>

        <p class="back-link">
          <a routerLink="/auth/login">← Retour à la connexion</a>
        </p>
      </div>
    </section>
  `,
  styles: [`
    .auth-scene { min-height: 100vh; display: flex; align-items: center; justify-content: center;
                  padding: 24px; background: linear-gradient(135deg, #fdf6e3 0%, #f8eedd 100%); }
    .auth-card { background: #fff; border-radius: 24px; padding: 40px;
                 max-width: 460px; width: 100%; box-shadow: 0 24px 60px rgba(0,0,0,.10); }
    .brand { display: inline-block; font-weight: 800; font-size: 1.3rem; margin-bottom: 24px;
             color: #1f232b; text-decoration: none; }
    .title { font-size: 1.6rem; font-weight: 800; margin: 0 0 8px; color: #1f232b; }
    .subtitle { color: #555; font-size: .95rem; margin: 0 0 26px; line-height: 1.45; }
    .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
    .field-label { font-weight: 600; font-size: .85rem; color: #1f232b; }
    .hint { color: #888; font-size: .8rem; }
    .field input { padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e2dccb;
                   font-size: 1rem; background: #fffdf7; transition: border .15s; }
    .field input:focus { outline: none; border-color: #f5c518; }
    .field input:disabled { background: #f4efe0; }
    .show-pwd { display: flex; align-items: center; gap: 8px; font-size: .85rem;
                color: #555; margin: 8px 0 0; }
    .error-text { background: #fde2e0; color: #c54a3a; padding: 10px 12px; border-radius: 10px;
                  font-size: .88rem; margin: 12px 0 0; }
    .error-text a { color: #c54a3a; font-weight: 600; }
    .success-text { background: #def7e2; color: #1f7a3d; padding: 10px 12px; border-radius: 10px;
                    font-size: .9rem; margin: 12px 0 0; }
    .primary-btn { width: 100%; padding: 14px; border: none; border-radius: 14px;
                   background: #1f232b; color: #fff; font-weight: 700; font-size: 1rem;
                   cursor: pointer; margin-top: 20px; display: flex; align-items: center;
                   justify-content: center; gap: 10px;
                   transition: transform 150ms; }
    .primary-btn:hover:not(:disabled) { transform: translateY(-1px); }
    .primary-btn:disabled { opacity: .6; cursor: not-allowed; }
    .spinner { width: 16px; height: 16px; border: 2.5px solid rgba(255,255,255,.3);
               border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .back-link { text-align: center; margin-top: 22px; font-size: .88rem; }
    .back-link a { color: #1f232b; text-decoration: none; font-weight: 600; }
    .back-link a:hover { text-decoration: underline; }
  `]
})
export class ResetPasswordComponent implements OnInit {
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  token = '';
  password = '';
  confirmPassword = '';
  showPwd = false;
  loading = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
  }

  async submit(): Promise<void> {
    if (this.loading) return;

    if (this.password.length < 8) {
      this.errorMessage = 'Le mot de passe doit faire au moins 8 caractères.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Les mots de passe ne correspondent pas.';
      return;
    }

    this.errorMessage = '';
    this.loading = true;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.auth.resetPassword(this.token, this.password));
      this.successMessage = "Mot de passe réinitialisé. Tu vas être redirigé(e) vers la connexion…";
      setTimeout(() => this.router.navigate(['/auth/login']), 2000);
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) {
        this.errorMessage = "Lien expiré ou déjà utilisé. Demande un nouveau lien.";
      } else {
        this.errorMessage = err?.error?.message || "Une erreur est survenue.";
      }
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }
}
