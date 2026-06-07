import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { DashboardSummary, StudySession, Subject } from '../../core/models/models';
import { AnalyticsService } from '../../core/services/analytics.service';
import { SessionService } from '../../core/services/session.service';
import { SubjectService } from '../../core/services/subject.service';
import { ChartCardComponent } from '../../shared/components/chart-card/chart-card.component';

interface SubjectSummaryRow {
  subject: Subject;
  achievedHours: number;
  progress: number;
}

interface WeeklyProductivityDay {
  day: string;
  date: string;
  plannedHours: number;
  completedHours: number;
}

interface WeekRange {
  start: Date;
  end: Date;
  displayStart: string;
  displayEnd: string;
}

const EMPTY_DASHBOARD_SUMMARY: DashboardSummary = {
  totalStudiedHours: 0,
  currentWeekHours: 0,
  longestSessionMinutes: 0,
  currentStreakDays: 0,
  topSubject: null,
  globalCompletionRate: 0,
  totalSessions: 0,
  completedSessions: 0,
};

const WEEK_DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    ChartCardComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  private analyticsService = inject(AnalyticsService);
  private subjectService   = inject(SubjectService);
  private sessionService   = inject(SessionService);

  readonly weekRange = signal<WeekRange>(this.getCurrentWeekRange());
  readonly subjects  = signal<Subject[]>([]);
  readonly sessions  = signal<StudySession[]>([]);
  readonly summary   = signal<DashboardSummary>(EMPTY_DASHBOARD_SUMMARY);

  readonly currentWeekSessions = computed(() =>
    this.sessions().filter(session => this.isInCurrentWeek(session)),
  );

  readonly weeklyProductivity = computed<WeeklyProductivityDay[]>(() =>
    this.buildWeeklyProductivity(this.currentWeekSessions()),
  );

  readonly plannedStudyMinutes = computed(() =>
    this.currentWeekSessions()
      .filter(session => session.status !== 'CANCELLED')
      .reduce((total, session) => total + this.plannedMinutes(session), 0),
  );

  readonly sessionCompletedMinutes = computed(() =>
    this.currentWeekSessions()
      .reduce((total, session) => total + this.completedMinutes(session), 0),
  );

  readonly completedStudyHours = computed(() => {
    const summaryHours = this.toFiniteNumber(this.summary().currentWeekHours);
    return summaryHours > 0
      ? this.roundToTenth(summaryHours)
      : this.minutesToHours(this.sessionCompletedMinutes());
  });

  readonly completedStudyMinutes = computed(() =>
    Math.round(this.completedStudyHours() * 60),
  );

  readonly plannedStudyHours = computed(() =>
    this.minutesToHours(this.plannedStudyMinutes()),
  );

  readonly weeklyGoalTargetHours = computed(() => {
    const target = this.subjects()
      .reduce((total, subject) => total + this.toFiniteNumber(subject.weeklyGoalHours), 0);

    return this.roundToTenth(target || this.plannedStudyHours());
  });

  readonly displayPlannedStudyHours = computed(() =>
    this.plannedStudyHours() || this.weeklyGoalTargetHours(),
  );

  readonly displayPlannedStudyMinutes = computed(() =>
    Math.round(this.displayPlannedStudyHours() * 60),
  );

  readonly weeklyGoalAchievedHours = computed(() =>
    this.completedStudyHours(),
  );

  readonly weeklyGoalProgress = computed(() =>
    this.percent(this.weeklyGoalAchievedHours(), this.weeklyGoalTargetHours()),
  );

  readonly remainingWeeklyHours = computed(() =>
    this.roundToTenth(this.weeklyGoalTargetHours() - this.weeklyGoalAchievedHours()),
  );

  readonly weeklyCompletionRate = computed(() =>
    this.percent(this.completedStudyMinutes(), this.displayPlannedStudyMinutes()),
  );

  readonly streakDays = computed(() =>
    this.toFiniteNumber(this.summary().currentStreakDays ?? this.summary().currentStreak),
  );

  readonly streakProgress = computed(() =>
    this.percent(this.streakDays(), 14),
  );

  readonly longestSessionTargetMinutes = computed(() => Math.max(
    ...this.subjects().map(subject => this.toFiniteNumber(subject.maxSessionDuration)),
    1,
  ));

  readonly longestSessionMinutes = computed(() =>
    this.toFiniteNumber(this.summary().longestSessionMinutes ?? this.summary().longestSession),
  );

  readonly longestSessionProgress = computed(() =>
    this.percent(this.longestSessionMinutes(), this.longestSessionTargetMinutes()),
  );

  readonly maxDailyHours = computed(() => Math.max(
    ...this.weeklyProductivity().flatMap(day => [day.plannedHours, day.completedHours]),
    1,
  ));

  readonly dashboardCompletionRate = computed(() =>
    this.normalizePercentage(this.summary().globalCompletionRate),
  );

  readonly subjectRows = computed<SubjectSummaryRow[]>(() =>
    this.subjects()
      .slice()
      .sort((a, b) => b.priority - a.priority)
      .map(subject => {
        const achievedHours = this.achievedHoursFor(subject.id);

        return {
          subject,
          achievedHours,
          progress: this.percent(achievedHours, subject.weeklyGoalHours),
        };
      }),
  );

  ngOnInit(): void {
    const range = this.weekRange();

    this.analyticsService.dashboard().subscribe({
      next: summary => this.summary.set(summary),
      error: error => console.warn('[dashboard] dashboard() echec', error),
    });

    this.subjectService.list().subscribe({
      next: subjects => this.subjects.set(subjects ?? []),
      error: error => console.warn('[dashboard] subjects() echec', error),
    });

    this.sessionService.list(range.start.toISOString(), range.end.toISOString()).subscribe({
      next: sessions => this.sessions.set(sessions ?? []),
      error: error => console.warn('[dashboard] sessions() echec', error),
    });
  }

  get plannedSessionsCount(): number {
    return this.currentWeekSessions().filter(session => session.status !== 'CANCELLED').length;
  }

  get completedSessionsCount(): number {
    return this.currentWeekSessions().filter(session => session.status === 'COMPLETED').length;
  }

  get sessionCompletionRate(): number {
    return this.percent(this.completedSessionsCount, this.plannedSessionsCount);
  }

  get topSubjectProgress(): number {
    const top = this.subjectRows()[0];
    return top?.progress ?? 0;
  }

  achievedHoursFor(subjectId: string): number {
    const minutes = this.currentWeekSessions()
      .filter(session => session.subjectId === subjectId)
      .reduce((total, session) => total + this.completedMinutes(session), 0);

    return this.minutesToHours(minutes);
  }

  dailyBarHeight(hours: number): number {
    return Math.max(4, this.percent(hours, this.maxDailyHours()));
  }

  formatHours(hours: number): string {
    return `${this.trimNumber(hours)}h`;
  }

  minutesToHours(minutes: number): number {
    return this.roundToTenth(minutes / 60);
  }

  percent(value: number, max: number): number {
    return max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  }

  priorityLabel(priority: Subject['priority']): string {
    return `P${priority}`;
  }

  private buildWeeklyProductivity(sessions: StudySession[]): WeeklyProductivityDay[] {
    const range = this.weekRange();

    return WEEK_DAY_LABELS.map((day, index) => {
      const date = new Date(range.start);
      date.setDate(range.start.getDate() + index);
      const dateKey = this.toLocalDateKey(date);
      const daySessions = sessions.filter(session => {
        const sessionDate = this.sessionDate(session);
        return !!sessionDate && this.toLocalDateKey(sessionDate) === dateKey;
      });

      const plannedMinutes = daySessions
        .filter(session => session.status !== 'CANCELLED')
        .reduce((total, session) => total + this.plannedMinutes(session), 0);
      const completedMinutes = daySessions
        .reduce((total, session) => total + this.completedMinutes(session), 0);

      return {
        day,
        date: dateKey,
        plannedHours: this.minutesToHours(plannedMinutes),
        completedHours: this.minutesToHours(completedMinutes),
      };
    });
  }

  private plannedMinutes(session: StudySession): number {
    return this.toFiniteNumber(session.plannedDuration || this.durationFromDates(session));
  }

  private completedMinutes(session: StudySession): number {
    if (session.status !== 'COMPLETED') return 0;
    return this.toFiniteNumber(session.actualDuration || session.plannedDuration || this.durationFromDates(session));
  }

  private durationFromDates(session: StudySession): number {
    const start = new Date(session.startDateTime).getTime();
    const end = new Date(session.endDateTime).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.round((end - start) / 60000);
  }

  private isInCurrentWeek(session: StudySession): boolean {
    const date = this.sessionDate(session);
    const range = this.weekRange();
    return !!date && date >= range.start && date < range.end;
  }

  private sessionDate(session: StudySession): Date | null {
    const date = new Date(session.startDateTime);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private getCurrentWeekRange(): WeekRange {
    const start = new Date();
    const daysSinceMonday = (start.getDay() + 6) % 7;
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysSinceMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    const displayEnd = new Date(end);
    displayEnd.setDate(end.getDate() - 1);

    return {
      start,
      end,
      displayStart: this.toLocalDateKey(start),
      displayEnd: this.toLocalDateKey(displayEnd),
    };
  }

  private normalizePercentage(value: number): number {
    const n = this.toFiniteNumber(value);
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  }

  private trimNumber(value: number): string {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  private roundToTenth(value: number): number {
    return Math.max(0, Math.round(value * 10) / 10);
  }

  private toFiniteNumber(value: number | null | undefined): number {
    return Number.isFinite(Number(value)) ? Number(value) : 0;
  }
}
