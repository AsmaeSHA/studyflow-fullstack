import { Routes } from '@angular/router';

export const routes: Routes = [
  // Redirection par défaut
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },

  // ---------- AUTH ----------
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/login/login.component').then(m => m.LoginComponent),
      },
      {
        path: 'register',
        loadComponent: () =>
          import('./features/auth/register/register.component').then(m => m.RegisterComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () =>
          import('./features/auth/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
      {
        path: 'oauth-callback',
        loadComponent: () =>
          import('./features/auth/oauth-callback/oauth-callback.component').then(m => m.OAuthCallbackComponent),
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' },
    ],
  },

  // ---------- APP (utilisateur connecté) ----------
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  {
    path: 'sessions',
    loadComponent: () =>
      import('./features/sessions/sessions.component').then(m => m.SessionsComponent),
  },
  {
    path: 'calendar',
    loadComponent: () =>
      import('./features/calendar/calendar.component').then(m => m.CalendarComponent),
  },
  {
    path: 'subjects',
    loadComponent: () =>
      import('./features/subjects/subjects.component').then(m => m.SubjectsComponent),
  },
  {
    path: 'groups',
    loadComponent: () =>
      import('./features/groups/groups.component').then(m => m.GroupsComponent),
  },
  {
    path: 'goals',
    loadComponent: () =>
      import('./features/goals/goals.component').then(m => m.GoalsComponent),
  },
  {
    path: 'planning',
    loadComponent: () =>
      import('./features/planning/planning.component').then(m => m.PlanningComponent),
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('./features/notifications/notifications.component').then(m => m.NotificationsComponent),
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./features/profile/profile.component').then(m => m.ProfileComponent),
  },
  {
    path: 'chat/:groupId',
    loadComponent: () =>
      import('./features/chat/chat.component').then(m => m.ChatComponent),
  },
  {
    path: 'collaborative/:sessionId',
    loadComponent: () =>
      import('./features/collaborative-session/collaborative-session.component').then(m => m.CollaborativeSessionComponent),
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./features/analytics/analytics.component').then(m => m.AnalyticsComponent),
  },

  // ---------- ADMIN ----------
  {
    path: 'admin',
    loadComponent: () =>
      import('./features/admin/admin.component').then(m => m.AdminComponent),
    children: [
      { path: '', redirectTo: 'stats', pathMatch: 'full' },
      {
        path: 'stats',
        loadComponent: () =>
          import('./features/admin/admin-stats/admin-stats.component').then(m => m.AdminStatsComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/admin-users/admin-users.component').then(m => m.AdminUsersComponent),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/admin/admin-profile/admin-profile.component').then(m => m.AdminProfileComponent),
      },
    ],
  },

  // ---------- FALLBACK ----------
  { path: '**', redirectTo: '/dashboard' },
];
