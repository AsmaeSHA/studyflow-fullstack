import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="auth-scene">
      <div class="auth-card">
        <a class="brand" routerLink="/auth/login">StudyFlow</a>
        <h1 class="title">Mot de passe oublié ?</h1>
        <p class="subtitle">
          Saisis ton email, on t'envoie un lien pour choisir un nouveau mot de passe (valable 30 min).
        </p>

        <form (ngSubmit)="submit()" autocomplete="off">
          <label class="field">
            <span class="field-label">Email</span>
            <input type="email" [(ngModel)]="email" name="email"
                   placeholder="ton@email.com" required [disabled]="loading"/>
          </label>

          <p *ngIf="errorMessage" class="error-text" role="alert">{{ errorMessage }}</p>

          <p *ngIf="successMessage" class="success-text" role="status">
             {{ successMessage }}
          </p>

          <button type="submit" class="primary-btn" [disabled]="loading">
            <span class="spinner" *ngIf="loading"></span>
            {{ loading ? 'Envoi…' : 'M\\'envoyer le lien' }}
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
    .field input { padding: 12px 14px; border-radius: 12px; border: 1.5px solid #e2dccb;
                   font-size: 1rem; background: #fffdf7; transition: border .15s; }
    .field input:focus { outline: none; border-color: #f5c518; }
    .field input:disabled { background: #f4efe0; }
    .error-text { background: #fde2e0; color: #c54a3a; padding: 10px 12px; border-radius: 10px;
                  font-size: .88rem; margin: 12px 0 0; }
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
export class ForgotPasswordComponent {
  private auth = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  loading = false;
  errorMessage = '';
  successMessage = '';

  async submit(): Promise<void> {
    if (this.loading) return;
    if (!this.email.trim()) {
      this.errorMessage = 'Veuillez saisir votre email.';
      return;
    }
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;
    this.cdr.markForCheck();

    try {
      await firstValueFrom(this.auth.forgotPassword(this.email.trim().toLowerCase()));
      // On affiche un message generique pour ne pas reveler si l'email existe
      this.successMessage = "Si un compte existe avec cet email, un lien de réinitialisation a été envoyé. Vérifie ta boîte de réception (et les spams).";
    } catch (err: any) {
      this.errorMessage = err?.error?.message || "Une erreur est survenue. Réessaie plus tard.";
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
      this.cdr.detectChanges();
    }
  }
}
