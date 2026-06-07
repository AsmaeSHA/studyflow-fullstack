import {
  Component, inject, signal, computed, OnInit, OnDestroy, effect
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { PlanningStateService } from '../../core/services/planning-state.service';
import { StudySession } from '../../core/models/models';

interface CalDay {
  date: number; iso: string;
  sessions: StudySession[];
  isToday: boolean; isOtherMonth: boolean;
}
type ViewMode = 'day' | 'week';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
})
export class CalendarComponent implements OnInit, OnDestroy {
  private sessionSvc = inject(SessionService);
  private route      = inject(ActivatedRoute);
  private router     = inject(Router);
  private planSvc    = inject(PlanningStateService);

  weekDayShort = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];

  viewYear  = signal(new Date().getFullYear());
  viewMonth = signal(new Date().getMonth());

  today = new Date();
  todayIso = this.isoDate(this.today);

  selectedIso = signal(this.todayIso);
  weekAnchor  = signal<string>(this.todayIso);
  slideDir: 'left' | 'right' | '' = '';

  mode = signal<ViewMode>('day');
  fromPlanning = false;

  allSessions = signal<StudySession[]>([]);

  nowLineTop = 0;
  weekNowTop = signal(0);
  private nowInterval?: ReturnType<typeof setInterval>;

  monthNames = ['Janvier','Février','Mars','Avril','Mai','Juin',
                'Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  get monthLabel() { return this.monthNames[this.viewMonth()]; }

  // Refresh sessions when planning service updates
  private planEffect = effect(() => {
    this.planSvc.generated();
    this.refreshSessions();
  });

  ngOnInit(): void {
    this.refreshSessions();
    this.route.queryParams.subscribe(qp => {
      if (qp['source'] === 'planning') {
        this.fromPlanning = true;
      }
      if (qp['mode'] === 'day') {
        this.mode.set('day');
      } else if (qp['mode'] === 'week') {
        this.mode.set('week');
      }
    });
    this.updateNowLine();
    this.nowInterval = setInterval(() => this.updateNowLine(), 60000);
  }

  ngOnDestroy(): void {
    if (this.nowInterval) clearInterval(this.nowInterval);
  }

  private refreshSessions(): void {
    this.sessionSvc.getSessions().subscribe(sessions => {
      const generated = this.planSvc.generated();
      const map = new Map<string, StudySession>();
      [...sessions, ...generated].forEach(s => map.set(s.id, s));
      this.allSessions.set(Array.from(map.values()));
    });
  }

  combinedSessions = computed<StudySession[]>(() => {
    // Depend des deux signals (sessions persistees + plan en cours de generation)
    const persisted = this.allSessions();
    const generated = this.planSvc.generated();
    const map = new Map<string, StudySession>();
    [...persisted, ...generated].forEach(s => map.set(s.id, s));
    return Array.from(map.values());
  });

  calDays = computed<CalDay[]>(() => {
    const y = this.viewYear();
    const m = this.viewMonth();
    const firstDay = new Date(y, m, 1);
    const lastDay  = new Date(y, m + 1, 0);
    let startDow = (firstDay.getDay() + 6) % 7;
    const days: CalDay[] = [];
    const sessions = this.combinedSessions();

    const prevLast = new Date(y, m, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevLast - i;
      const date = new Date(y, m - 1, d);
      days.push({ date: d, iso: this.isoDate(date), sessions: [], isToday: false, isOtherMonth: true });
    }
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const date = new Date(y, m, d);
      const iso = this.isoDate(date);
      const ds = sessions.filter(s => s.startDateTime.startsWith(iso));
      days.push({ date: d, iso, sessions: ds, isToday: iso === this.todayIso, isOtherMonth: false });
    }
    const rem = 42 - days.length;
    for (let d = 1; d <= rem; d++) {
      const date = new Date(y, m + 1, d);
      days.push({ date: d, iso: this.isoDate(date), sessions: [], isToday: false, isOtherMonth: true });
    }
    return days;
  });

  selectedSessions = computed<StudySession[]>(() => {
    const iso = this.selectedIso();
    return this.combinedSessions()
      .filter(s => s.startDateTime.startsWith(iso))
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  });

  weekDays = computed(() => {
    const anchor = new Date(this.weekAnchor() + 'T12:00');
    const monday = new Date(anchor);
    monday.setDate(anchor.getDate() - ((anchor.getDay() + 6) % 7));
    const labels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    const fullLabels = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
    const sessions = this.combinedSessions();

    return labels.map((label, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      const iso = this.isoDate(d);
      const ds = sessions.filter(s => s.startDateTime.startsWith(iso))
                         .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
      return { label, full: fullLabels[i], dayNum: d.getDate(), iso, sessions: ds };
    });
  });

  weekSessions = computed(() => this.weekDays().flatMap(d => d.sessions));
  weekHours = computed(() =>
    Math.round(this.weekSessions().reduce((a, s) => a + (s.plannedDuration || 0), 0) / 60 * 10) / 10
  );
  totalSessions = computed(() => this.weekSessions().length);

  subjectLegend = computed(() => {
    const map = new Map<string, { name: string; color: string; count: number }>();
    this.weekSessions().forEach(s => {
      const key = s.subjectId || s.subjectName || '?';
      const e = map.get(key);
      if (e) e.count++;
      else map.set(key, { name: s.subjectName || 'Sans nom', color: s.subjectColor || '#f5c518', count: 1 });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  });

  weekLabel = computed(() => {
    const days = this.weekDays();
    if (!days.length) return '';
    const a = new Date(days[0].iso + 'T12:00');
    const b = new Date(days[6].iso + 'T12:00');
    const month = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' });
    if (a.getMonth() === b.getMonth()) return `Semaine du ${a.getDate()} au ${b.getDate()} ${month(b)}`;
    return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)}`;
  });

  hourRange(): number[] { return Array.from({ length: 15 }, (_, i) => 8 + i); }

  blockTop(s: StudySession): number {
    const t = s.startDateTime.slice(11, 16);
    const [h, m] = t.split(':').map(Number);
    return Math.max(0, (h - 8) * 64 + Math.round(m * 64 / 60));
  }
  blockHeight(s: StudySession): number {
    const dur = s.plannedDuration || 60;
    return Math.max(32, Math.round(dur * 64 / 60));
  }

  get selectedDayLabel(): string {
    const d = new Date(this.selectedIso() + 'T12:00');
    return d.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
  }

  isSelectedToday(): boolean { return this.selectedIso() === this.todayIso; }

  selectDay(day: CalDay): void {
    if (day.isOtherMonth) return;
    this.selectedIso.set(day.iso);
    this.weekAnchor.set(day.iso);
  }
  selectDayIso(iso: string): void {
    this.selectedIso.set(iso);
    this.weekAnchor.set(iso);
  }

  prevMonth(): void {
    this.slideDir = 'right';
    setTimeout(() => { this.slideDir = ''; }, 260);
    if (this.viewMonth() === 0) { this.viewMonth.set(11); this.viewYear.update(y => y - 1); }
    else this.viewMonth.update(m => m - 1);
  }
  nextMonth(): void {
    this.slideDir = 'left';
    setTimeout(() => { this.slideDir = ''; }, 260);
    if (this.viewMonth() === 11) { this.viewMonth.set(0); this.viewYear.update(y => y + 1); }
    else this.viewMonth.update(m => m + 1);
  }
  prevWeek(): void {
    const d = new Date(this.weekAnchor() + 'T12:00');
    d.setDate(d.getDate() - 7);
    this.weekAnchor.set(this.isoDate(d));
  }
  nextWeek(): void {
    const d = new Date(this.weekAnchor() + 'T12:00');
    d.setDate(d.getDate() + 7);
    this.weekAnchor.set(this.isoDate(d));
  }
  goToday(): void {
    this.selectedIso.set(this.todayIso);
    this.weekAnchor.set(this.todayIso);
    this.viewYear.set(new Date().getFullYear());
    this.viewMonth.set(new Date().getMonth());
  }
  openSession(s: StudySession): void {
    this.selectedIso.set(s.startDateTime.slice(0, 10));
    this.mode.set('day');
  }

  isoDate(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  }
  formatTime(dt: string): string {
    if (!dt) return '';
    const parts = dt.split('T');
    if (parts.length < 2) return '';
    return parts[1].substring(0, 5);
  }
  statusLabel(s: string): string {
    const m: Record<string,string> = {
      COMPLETED:'Terminé', IN_PROGRESS:'En cours', PLANNED:'Planifié', CANCELLED:'Annulé'
    };
    return m[s] || s;
  }
  progressPct(s: StudySession): number {
    const start = new Date(s.startDateTime).getTime();
    const end   = new Date(s.endDateTime).getTime();
    const now   = Date.now();
    if (now <= start) return 0;
    if (now >= end)   return 100;
    return Math.round((now - start) / (end - start) * 100);
  }
  addNew(): void { this.router.navigate(['/sessions']); }

  updateNowLine(): void {
    const now = new Date();
    const startOfDay = 8 * 60;
    const endOfDay   = 23 * 60;
    const current    = now.getHours() * 60 + now.getMinutes();
    const pct = Math.max(0, Math.min(1, (current - startOfDay) / (endOfDay - startOfDay)));
    this.nowLineTop = 60 + pct * (15 * 64);
    const minutesSince8 = (now.getHours() - 8) * 60 + now.getMinutes();
    this.weekNowTop.set(Math.max(0, Math.round(minutesSince8 * 64 / 60)));
  }
}
