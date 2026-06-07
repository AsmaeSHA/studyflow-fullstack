import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AdminUserService } from '../../../core/services/admin-user.service';

@Component({
  selector: 'app-oauth-callback',
  standalone: true,
  imports: [CommonModule],
  template: `
    <section class="oauth-scene">
      <div class="loader-box">
        <div class="loader"></div>
        <h2>Connexion en cours…</h2>
        <p>{{ message }}</p>
      </div>
    </section>
  `,
  styles: [`
    .oauth-scene { min-height: 100vh; display: flex; align-items: center; justify-content: center;
                   background: linear-gradient(135deg,#fdf6e3 0%,#f8eedd 100%); padding: 24px; }
    .loader-box { text-align: center; }
    .loader { width: 48px; height: 48px; border: 4px solid rgba(31,35,43,.15);
              border-top-color: #f5c518; border-radius: 50%; margin: 0 auto 18px;
              animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    h2 { margin: 0 0 6px; color: #1f232b; font-size: 1.25rem; font-weight: 700; }
    p  { color: #555; font-size: .9rem; }
  `]
})
export class OAuthCallbackComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private auth = inject(AuthService);
  private analytics = inject(AnalyticsService);
  private adminUsers = inject(AdminUserService);

  message = 'Récupération de votre session…';

  async ngOnInit(): Promise<void> {
    const qp = this.route.snapshot.queryParamMap;
    const accessToken  = qp.get('accessToken');
    const refreshToken = qp.get('refreshToken');
    const role         = qp.get('role') as 'ADMIN' | 'USER' | null;
    const error        = qp.get('error');

    if (error) {
      this.message = "Erreur d'authentification. Redirection…";
      setTimeout(() => this.router.navigate(['/auth/login'], { queryParams: { error } }), 1500);
      return;
    }

    if (!accessToken || !refreshToken) {
      this.message = "Lien invalide. Redirection vers la connexion…";
      setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      return;
    }

    // Persiste les tokens et reconstruit un objet user minimal pour AuthService
    this.auth.persistOauthTokens(accessToken, refreshToken, role ?? 'USER');

    // Prefetch + redirect selon le role
    if (role === 'ADMIN') {
      this.message = 'Chargement du tableau de bord admin...';
      this.adminUsers.listUsers().subscribe();
      try {
        await firstValueFrom(this.analytics.refreshAdminStats());
      } catch {
        console.warn('[oauth-callback] Impossible de precharger les statistiques admin');
      }
      await this.router.navigate(['/admin']);
    } else {
      await this.router.navigate(['/dashboard']);
    }
  }
}
