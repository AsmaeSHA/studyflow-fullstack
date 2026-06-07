import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './shared/components/sidebar/sidebar.component';
import { TopbarComponent } from './shared/components/topbar/topbar.component';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="app-shell" [class.is-auth]="isAuthRoute" [class.theme-dark]="isUserDarkTheme">
      <ng-container *ngIf="!isAuthRoute">
        <ng-container *ngIf="!isAdminRoute; else adminRoute">
          <app-sidebar></app-sidebar>
          <div class="main">
            <app-topbar *ngIf="isDashboardRoute"></app-topbar>
            <main class="page">
              <router-outlet></router-outlet>
            </main>
          </div>
        </ng-container>
      </ng-container>

      <ng-container *ngIf="isAuthRoute">
        <router-outlet></router-outlet>
      </ng-container>

      <ng-template #adminRoute>
        <router-outlet></router-outlet>
      </ng-template>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #F5F1EA;
    }
    .app-shell {
      display: flex;
      min-height: 100vh;
      background: #F5F1EA;
      color: #1A1A1A;
      transition: background 220ms ease, color 220ms ease;
    }
    .app-shell.theme-dark {
      background: #11100f;
      color: #f7f0e8;
    }
    .app-shell.is-auth { display: block; }
    .main {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
    }
    .page {
      flex: 1;
      padding-bottom: 32px;
    }
  `]
})
export class AppComponent {
  private router = inject(Router);
  private themeService = inject(ThemeService);
  isAuthRoute = false;
  isAdminRoute = false;
  isDashboardRoute = false;

  get isUserDarkTheme(): boolean {
    return !this.isAuthRoute && !this.isAdminRoute && this.themeService.theme() === 'dark';
  }

  constructor() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        const currentUrl = e.urlAfterRedirects || e.url || '';
        this.updateRouteState(currentUrl);
      });
    this.updateRouteState(this.router.url);
  }

  private updateRouteState(url: string): void {
    const path = url.split(/[?#]/)[0];
    this.isAuthRoute = path.startsWith('/auth');
    this.isAdminRoute = path.startsWith('/admin');
    this.isDashboardRoute = path === '/dashboard';
  }
}
