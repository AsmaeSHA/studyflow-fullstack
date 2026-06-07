import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from './components/admin-sidebar.component';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterOutlet, AdminSidebarComponent],
  template: `
    <div class="admin-shell">
      <app-admin-sidebar></app-admin-sidebar>

      <section class="admin-main">
        <main class="admin-page">
          <router-outlet></router-outlet>
        </main>
      </section>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-height: 100vh;
      background: #ede8df;
      color: #1a1a1a;
    }

    .admin-shell {
      min-height: 100vh;
    }

    .admin-main {
      min-width: 0;
      width: calc(100vw - 140px);
      margin-left: 112px;
      padding: 24px 24px 32px 12px;
      box-sizing: border-box;
    }

    .admin-page {
      min-height: calc(100vh - 140px);
      width: 100%;
    }

    @media (max-width: 900px) {
      .admin-main {
        width: 100%;
        margin-left: 0;
        padding: 16px;
      }

    }
  `],
})
export class AdminComponent {}
