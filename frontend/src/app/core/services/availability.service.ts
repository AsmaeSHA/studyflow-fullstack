import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { Availability } from '../models/models';

/**
 * Payload accepte par add(). Accepte les 2 noms (isRecurring | recurring)
 * et les 2 conventions dayOfWeek (0..6 frontend ou 1..7 backend).
 */
export interface AvailabilityInput {
  dayOfWeek: number;            // 0..6 (JS) ou 1..7 (backend)
  startTime: string;            // 'HH:mm' ou 'HH:mm:ss'
  endTime: string;
  isRecurring?: boolean;
  recurring?: boolean;
  validFrom?: string;
  validUntil?: string;
}

@Injectable({ providedIn: 'root' })
export class AvailabilityService {
  private readonly base = environment.apiUrl + '/users/me/availabilities';
  private http = inject(HttpClient);

  readonly slots = signal<Availability[]>([]);

  list(): Observable<Availability[]> {
    return this.http.get<Availability[]>(this.base).pipe(tap(s => this.slots.set(s)));
  }
  refresh(): void { this.list().subscribe(); }

  add(input: AvailabilityInput): Observable<Availability> {
    // Backend exige dayOfWeek 1..7 (lundi..dimanche) et clef "recurring"
    // Frontend utilise JS-like 0..6 (dimanche..samedi) et "isRecurring"
    const dayOfWeek = input.dayOfWeek === 0 ? 7 : input.dayOfWeek; // 0 (dim) -> 7
    const startTime = input.startTime.length === 5 ? input.startTime + ':00' : input.startTime;
    const endTime   = input.endTime.length === 5   ? input.endTime + ':00'   : input.endTime;
    const recurring = input.recurring ?? input.isRecurring ?? true;

    const payload = { dayOfWeek, startTime, endTime, recurring, validFrom: input.validFrom, validUntil: input.validUntil };
    return this.http.post<Availability>(this.base, payload)
      .pipe(tap(s => this.slots.update(l => [...l, s])));
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`)
      .pipe(tap(() => this.slots.update(l => l.filter(x => x.id !== id))));
  }
}
