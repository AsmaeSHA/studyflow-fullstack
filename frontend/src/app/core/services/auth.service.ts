import { Injectable, signal, inject, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap, of } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../../environements/environment';
import { User } from '../models/models';
import { AuthCredentials, AuthResponse, RegisterPayload } from '../models/user.model';

const ACCESS_KEY  = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY    = 'currentUser';

/**
 * Service d'authentification connecte au backend Spring (POST /api/auth/*).
 * Persiste les tokens dans localStorage et expose:
 *   - signal `user`
 *   - signal `isAuthenticated`
 *   - observable currentUser$ (compat)
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly base = environment.apiUrl + '/auth';
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.readUser());
  readonly isAuthenticated = signal<boolean>(!!localStorage.getItem(ACCESS_KEY));
  readonly isAdminSig = computed(() => this.user()?.role === 'ADMIN');

  private currentUserSubject = new BehaviorSubject<User | null>(this.readUser());
  public currentUser$ = this.currentUserSubject.asObservable();

  login(email: string, password: string): Observable<AuthResponse> {
    const body: AuthCredentials = { email, password };
    return this.http.post<AuthResponse>(`${this.base}/login`, body)
      .pipe(tap(r => this.persist(r)));
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    const [firstName, ...rest] = (payload.firstName ?? payload.name ?? '').split(' ');
    const lastName = payload.lastName ?? rest.join(' ') ?? '';
    const body = {
      email: payload.email,
      firstName: firstName || payload.email.split('@')[0],
      lastName: lastName || 'User',
      password: payload.password
    };
    return this.http.post<AuthResponse>(`${this.base}/register`, body)
      .pipe(tap(r => this.persist(r)));
  }

  refresh(): Observable<AuthResponse | null> {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    if (!refreshToken) return of(null);
    return this.http.post<AuthResponse>(`${this.base}/refresh`, { refreshToken })
      .pipe(tap(r => this.persist(r)));
  }

  persistOauthTokens(accessToken: string, refreshToken: string, role: 'USER' | 'ADMIN' = 'USER'): void {
    localStorage.setItem(ACCESS_KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, refreshToken);
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]));
      const user: User = {
        id: payload.uid,
        email: payload.sub,
        firstName: (payload.name ?? '').split(' ')[0] ?? '',
        lastName: (payload.name ?? '').split(' ').slice(1).join(' ') ?? '',
        role: (payload.role ?? role) as any,
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        name: payload.name
      };
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      this.currentUserSubject.next(user);
      this.user.set(user);
      this.isAuthenticated.set(true);
    } catch (e) {
      console.warn('Impossible de decoder le JWT OAuth2', e);
    }
  }

  forgotPassword(email: string): Observable<void> {
    return this.http.post<void>(`${this.base}/forgot-password`, { email });
  }

  resetPassword(token: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/reset-password`, { token, newPassword });
  }

  logout(): void {
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const cleanup = () => {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
      localStorage.removeItem(USER_KEY);
      this.currentUserSubject.next(null);
      this.user.set(null);
      this.isAuthenticated.set(false);
      this.router.navigate(['/auth/login']);
    };
    if (refreshToken) {
      this.http.post(`${this.base}/logout`, { refreshToken }).subscribe({ complete: cleanup, error: cleanup });
    } else cleanup();
  }

  /**
   * Met a jour le user en memoire (signal + BehaviorSubject + localStorage)
   * apres une modification reussie du profil cote backend.
   */
  setUser(updated: Partial<User>): void {
    const current = this.currentUserSubject.value || {} as User;
    const merged = this.enrichUser({ ...current, ...updated });
    localStorage.setItem(USER_KEY, JSON.stringify(merged));
    this.currentUserSubject.next(merged);
    this.user.set(merged);
  }

  get currentUser(): User | null { return this.currentUserSubject.value; }
  get isLoggedIn(): boolean { return !!this.currentUser; }
  get isAdmin(): boolean { return this.currentUser?.role === 'ADMIN'; }

  private persist(r: AuthResponse) {
    if (!r) return;
    localStorage.setItem(ACCESS_KEY,  r.accessToken);
    localStorage.setItem(REFRESH_KEY, r.refreshToken);
    const user = this.enrichUser(r.user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.user.set(user);
    this.isAuthenticated.set(true);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  private enrichUser(u: any): User {
    return {
      ...u,
      name: u.name ?? `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim(),
      status: u.status ?? 'ACTIVE'
    };
  }
}
