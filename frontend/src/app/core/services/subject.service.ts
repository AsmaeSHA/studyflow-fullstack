import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { Subject } from '../models/models';

export interface SubjectPayload {
  name: string;
  color?: string;
  priority?: number;
  weeklyGoalHours?: number;
  /** Duree max d'une session (minutes) pour cette matiere. Utilise par le Scheduler. */
  maxSessionDuration?: number;
  description?: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly base = environment.apiUrl + '/subjects';
  private http = inject(HttpClient);

  /** Cache des matieres (signal). Rempli par refresh() ou list(). */
  readonly subjects = signal<Subject[]>([]);

  list(): Observable<Subject[]> {
    return this.http.get<Subject[]>(this.base).pipe(tap(s => this.subjects.set(s)));
  }
  refresh(): void { this.list().subscribe(); }
  get(id: string): Observable<Subject> { return this.http.get<Subject>(`${this.base}/${id}`); }

  create(body: SubjectPayload): Observable<Subject> {
    return this.http.post<Subject>(this.base, body).pipe(tap(s => this.subjects.update(l => [...l, s])));
  }
  /** Alias compat ancienne API */
  add(body: SubjectPayload): Observable<Subject> { return this.create(body); }

  update(id: string, body: SubjectPayload): Observable<Subject> {
    return this.http.put<Subject>(`${this.base}/${id}`, body)
      .pipe(tap(s => this.subjects.update(l => l.map(x => x.id === id ? s : x))));
  }
  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`)
      .pipe(tap(() => this.subjects.update(l => l.filter(x => x.id !== id))));
  }
}
