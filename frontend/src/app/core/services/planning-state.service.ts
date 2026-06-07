import { Injectable, inject, signal, computed } from '@angular/core';
import { SessionService, GeneratePlanPayload } from './session.service';
import { StudySession } from '../models/models';
import { firstValueFrom } from 'rxjs';

export interface PlanningConstraints {
  maxSessionDuration: number;
  minSessionDuration: number;
  breakBetweenMinutes: number;
  /** Alias pour ancienne UI */
  breakBetweenMin: number;
  /** Limite quotidienne (utilise par l'UI legacy) */
  maxSessionsPerDay: number;
}

@Injectable({ providedIn: 'root' })
export class PlanningStateService {
  private sessionApi = inject(SessionService);

  readonly currentWeekStart = signal<string>(this.defaultWeekStart());
  readonly generated        = signal<StudySession[]>([]);
  readonly loading          = signal(false);
  readonly generatedAt      = signal<Date | null>(null);
  readonly constraints      = signal<PlanningConstraints>({
    maxSessionDuration: 90,
    minSessionDuration: 30,
    breakBetweenMinutes: 15,
    breakBetweenMin: 15,
    maxSessionsPerDay: 4
  });

  readonly hasPlan    = computed(() => this.generated().length > 0);
  readonly totalHours = computed(() =>
    Math.round((this.generated().reduce((acc, s) => acc + (s.plannedDuration || 0), 0) / 60) * 10) / 10
  );

  setWeek(weekStartISO: string)            { this.currentWeekStart.set(weekStartISO); }
  setConstraints(c: Partial<PlanningConstraints>) {
    this.constraints.update(prev => {
      const next = { ...prev, ...c };
      if (c.breakBetweenMin !== undefined)     next.breakBetweenMinutes = c.breakBetweenMin;
      if (c.breakBetweenMinutes !== undefined) next.breakBetweenMin     = c.breakBetweenMinutes;
      return next;
    });
  }
  setGenerated(list: StudySession[])       { this.generated.set(list); this.generatedAt.set(new Date()); }
  reset()                                  { this.generated.set([]); this.generatedAt.set(null); }

  async generate(opts: Partial<GeneratePlanPayload> = {}): Promise<StudySession[]> {
    this.loading.set(true);
    try {
      // Toujours recalculer a la generation pour ne jamais utiliser une date passee
      this.currentWeekStart.set(this.defaultWeekStart());

      const c = this.constraints();
      const payload: GeneratePlanPayload = {
        weekStart: this.currentWeekStart(),
        maxSessionDuration: opts.maxSessionDuration ?? c.maxSessionDuration,
        minSessionDuration: opts.minSessionDuration ?? c.minSessionDuration,
        breakBetweenMinutes: opts.breakBetweenMinutes ?? c.breakBetweenMinutes,
        replaceExisting: opts.replaceExisting ?? true
      };
      const res = await firstValueFrom(this.sessionApi.generatePlan(payload));
      this.setGenerated(res);
      return res;
    } finally {
      this.loading.set(false);
    }
  }

  async loadWeek(): Promise<StudySession[]> {
    const start = this.currentWeekStart();
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const res = await firstValueFrom(this.sessionApi.list(start + 'T00:00:00Z', end.toISOString()));
    this.setGenerated(res);
    return res;
  }

  /**
   * Debut de la fenetre de planification :
   *  - le lundi de la semaine courante s'il est aujourd'hui ou dans le futur
   *  - sinon (lundi deja passe), aujourd'hui (rolling 7 jours)
   *
   * Empeche le scheduler de generer sur des jours deja passes
   * (ex : si on est dimanche, on ne generait plus pour le lundi
   *  d'il y a 6 jours, mais bien pour le lundi qui arrive).
   */
  private defaultWeekStart(): string {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const monday = new Date(today);
    const day = monday.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    monday.setDate(monday.getDate() + diff);

    const start = monday < today ? today : monday;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
  }
}
