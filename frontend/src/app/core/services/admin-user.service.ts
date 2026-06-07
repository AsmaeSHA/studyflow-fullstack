import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AdminUserService {
  private readonly base = environment.apiUrl + '/admin';
  private http = inject(HttpClient);

  readonly users = signal<User[]>([]);
  private loaded = false;
  private loadedAt = 0;
  private readonly USERS_TTL_MS = 30_000;

  /** Cache encore frais ? */
  isFresh(): boolean {
    return this.loaded && (Date.now() - this.loadedAt) < this.USERS_TTL_MS;
  }

  /** Charge les users si cache vide ou expire. Idempotent. */
  ensureLoaded(): void {
    if (this.isFresh()) return;
    this.http.get<User[]>(`${this.base}/users`).subscribe({
      next: list => {
        this.users.set(list);
        this.loaded = true;
        this.loadedAt = Date.now();
      },
      error: () => { this.loaded = false; }
    });
  }

  listUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.base}/users`).pipe(tap(u => {
      this.users.set(u);
      this.loaded = true;
      this.loadedAt = Date.now();
    }));
  }
  refresh(): void { this.listUsers().subscribe(); }

  promote(userId: string): Observable<User> {
    return this.http.post<User>(`${this.base}/users/${userId}/promote`, {})
      .pipe(tap(u => this.users.update(l => l.map(x => x.id === userId ? u : x))));
  }
  demote(userId: string): Observable<User> {
    return this.http.post<User>(`${this.base}/users/${userId}/demote`, {})
      .pipe(tap(u => this.users.update(l => l.map(x => x.id === userId ? u : x))));
  }
  deleteUser(userId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/users/${userId}`)
      .pipe(tap(() => this.users.update(l => l.filter(x => x.id !== userId))));
  }
  stats(): Observable<{ totalUsers: number; totalGroups: number; totalSessions: number; }> {
    return this.http.get<any>(`${this.base}/stats`);
  }

  disableUser(userId: string): Observable<User | null> {
    this.users.update(l => l.map(x => x.id === userId ? { ...x, status: 'DISABLED' } : x));
    return of(null);
  }
  enableUser(userId: string): Observable<User | null> {
    this.users.update(l => l.map(x => x.id === userId ? { ...x, status: 'ACTIVE' } : x));
    return of(null);
  }
  changeRole(userId: string, newRole: 'USER' | 'ADMIN'): Observable<User> {
    return newRole === 'ADMIN' ? this.promote(userId) : this.demote(userId);
  }
}
