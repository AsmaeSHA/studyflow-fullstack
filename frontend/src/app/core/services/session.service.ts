import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { StudySession } from '../models/models';

export interface SessionPayload {
  subjectId?: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  plannedDuration?: number;
  notes?: string;
}

export interface GeneratePlanPayload {
  weekStart: string;
  maxSessionDuration?: number;
  minSessionDuration?: number;
  breakBetweenMinutes?: number;
  replaceExisting?: boolean;
}

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly base = environment.apiUrl + '/sessions';
  private http = inject(HttpClient);

  readonly sessions = signal<StudySession[]>([]);

  list(from?: string, to?: string): Observable<StudySession[]> {
    let params = new HttpParams();
    if (from) params = params.set('from', from);
    if (to)   params = params.set('to', to);
    return this.http.get<StudySession[]>(this.base, { params })
      .pipe(tap(s => this.sessions.set(s.map(session => this.withRuntimeStart(session)))));
  }
  /** Alias compat ancienne API */
  getSessions(): Observable<StudySession[]> { return this.list(); }
  refresh(): void { this.list().subscribe(); }

  get(id: string): Observable<StudySession> { return this.http.get<StudySession>(`${this.base}/${id}`); }

  create(body: SessionPayload): Observable<StudySession> {
    return this.http.post<StudySession>(this.base, body)
      .pipe(tap(s => this.sessions.update(l => [...l, this.withRuntimeStart(s)])));
  }
  /** Alias compat */
  add(body: SessionPayload): Observable<StudySession> { return this.create(body); }

  update(id: string, body: SessionPayload): Observable<StudySession> {
    return this.http.put<StudySession>(`${this.base}/${id}`, body)
      .pipe(tap(s => this.sessions.update(l => l.map(x => x.id === id ? this.withRuntimeStart(s) : x))));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`)
      .pipe(tap(() => {
        this.clearStartedAt(id);
        this.sessions.update(l => l.filter(x => x.id !== id));
      }));
  }

  complete(id: string, actualDuration?: number, notes?: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/${id}/complete`, { actualDuration, notes })
      .pipe(tap(s => {
        this.clearStartedAt(id);
        this.sessions.update(l => l.map(x => x.id === id ? this.withRuntimeStart(s) : x));
      }));
  }
  /** Alias compat */
  markCompleted(id: string): Observable<StudySession> { return this.complete(id); }

  start(id: string): Observable<StudySession> {
    const startedAt = new Date().toISOString();
    return this.http.post<StudySession>(`${this.base}/${id}/start`, {})
      .pipe(tap(s => {
        this.storeStartedAt(id, startedAt);
        this.sessions.update(l => l.map(x => x.id === id ? { ...this.withRuntimeStart(s), startedAt } : x));
      }));
  }
  /** Alias compat */
  markInProgress(id: string): Observable<StudySession> { return this.start(id); }

  reschedule(id: string, newStartDateTime: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/${id}/reschedule`, { newStartDateTime })
      .pipe(tap(s => this.sessions.update(l => l.map(x => x.id === id ? s : x))));
  }

  cancel(id: string): Observable<StudySession> {
    return this.http.post<StudySession>(`${this.base}/${id}/cancel`, {})
      .pipe(tap(s => {
        this.clearStartedAt(id);
        this.sessions.update(l => l.map(x => x.id === id ? this.withRuntimeStart(s) : x));
      }));
  }

  generatePlan(body: GeneratePlanPayload): Observable<StudySession[]> {
    return this.http.post<StudySession[]>(`${this.base}/generate-plan`, body)
      .pipe(tap(s => this.sessions.update(l => [...l, ...s.map(session => this.withRuntimeStart(session))])));
  }

  getStartedAt(id: string): string | null {
    return localStorage.getItem(this.startedAtKey(id));
  }

  private withRuntimeStart(session: StudySession): StudySession {
    if (session.status !== 'IN_PROGRESS') return session;
    const stored = this.getStartedAt(session.id);
    if (stored) return { ...session, startedAt: stored };
    const startedAt = new Date().toISOString();
    this.storeStartedAt(session.id, startedAt);
    return { ...session, startedAt };
  }

  private storeStartedAt(id: string, startedAt: string): void {
    localStorage.setItem(this.startedAtKey(id), startedAt);
  }

  private clearStartedAt(id: string): void {
    localStorage.removeItem(this.startedAtKey(id));
  }

  private startedAtKey(id: string): string {
    return `studyflow:session-started-at:${id}`;
  }
}
