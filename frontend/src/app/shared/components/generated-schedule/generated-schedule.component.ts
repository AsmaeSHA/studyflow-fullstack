import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StudySession } from '../../../core/models/models';

/**
 * Affichage des sessions générées par le planificateur.
 * Deux modes:
 *   - 'list'     : timeline simple
 *   - 'calendar' : grille hebdomadaire 7 jours
 */
@Component({
  selector: 'app-generated-schedule',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gs-wrap">
      <div class="gs-head">
        <div class="gs-stats">
          <span class="chip">{{ sessions.length }} session{{ sessions.length !== 1 ? 's' : '' }}</span>
          <span class="chip">{{ totalHours }}h prévues</span>
        </div>
        <div class="gs-modes">
          <button class="mode" [class.on]="mode === 'calendar'" (click)="mode = 'calendar'">Calendrier</button>
          <button class="mode" [class.on]="mode === 'list'" (click)="mode = 'list'">Liste</button>
        </div>
      </div>

      <!-- ── CALENDAR ── -->
      <div class="gs-calendar" *ngIf="mode === 'calendar'">
        <div class="gs-day" *ngFor="let day of weekDays; let i = index">
          <div class="gs-day-head">{{ day.label }}<small>{{ day.date | date:'d MMM':'':'fr' }}</small></div>
          <div class="gs-slots">
            <div class="gs-slot"
                 *ngFor="let s of sessionsByDay(i)"
                 [style.background]="(s.subjectColor || '#ccc') + '18'"
                 [style.border-left-color]="s.subjectColor || '#ccc'">
              <div class="gs-slot-time">{{ s.startDateTime | date:'HH:mm' }} – {{ s.endDateTime | date:'HH:mm' }}</div>
              <div class="gs-slot-title">{{ s.title }}</div>
              <div class="gs-slot-subj" [style.color]="s.subjectColor">{{ s.subjectName }}</div>
              <div class="gs-slot-meta">
                <span class="prio">P{{ priorityOf(s) }}</span>
                <span>· {{ s.plannedDuration }} min</span>
              </div>
            </div>
            <div class="gs-empty-day" *ngIf="sessionsByDay(i).length === 0">—</div>
          </div>
        </div>
      </div>

      <!-- ── LIST ── -->
      <div class="gs-list" *ngIf="mode === 'list'">
        <div class="gs-row" *ngFor="let s of sortedSessions">
          <div class="dot" [style.background]="s.subjectColor || '#ccc'"></div>
          <div class="info">
            <div class="title">{{ s.title }}</div>
            <div class="when">
              {{ s.startDateTime | date:'EEE d MMM · HH:mm':'':'fr' }} – {{ s.endDateTime | date:'HH:mm' }}
              <span class="dur">· {{ s.plannedDuration }} min</span>
            </div>
          </div>
          <div class="meta">
            <span class="subj-pill"
                  [style.background]="(s.subjectColor || '#ccc') + '22'"
                  [style.color]="s.subjectColor">
              {{ s.subjectName }}
            </span>
            <span class="status status-{{ s.status }}">{{ statusLabel(s.status) }}</span>
            <span class="prio">P{{ priorityOf(s) }}</span>
          </div>
        </div>

        <div class="gs-empty" *ngIf="!sessions.length">
          <div class="empty-icon">📅</div>
          <p>Aucune session générée. Cliquez sur "Générer le planning".</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .gs-wrap { display:flex; flex-direction:column; gap:14px; }
    .gs-head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
    .chip {
      display:inline-block; padding:4px 12px; border-radius:999px;
      font-size:11.5px; font-weight:700; color:#1A1A1A;
      background:#fff; border:1px solid rgba(0,0,0,.06); margin-right:6px;
    }
    .gs-modes { display:flex; gap:6px; background:#f5f1ea; padding:4px; border-radius:999px; }
    .mode {
      padding:6px 14px; border-radius:999px; border:none; background:transparent;
      font-size:12.5px; font-weight:600; cursor:pointer; color:#7A7A7A;
    }
    .mode.on { background:#1A1A1A; color:#fff; }

    /* Calendar */
    .gs-calendar { display:grid; grid-template-columns:repeat(7,1fr); gap:8px; }
    @media(max-width:900px){ .gs-calendar { grid-template-columns:repeat(2,1fr); } }
    .gs-day { background:#fff; border-radius:14px; border:1px solid rgba(0,0,0,.05); padding:10px; min-height:150px; }
    .gs-day-head { font-size:12px; font-weight:800; color:#1A1A1A; padding-bottom:8px; border-bottom:1px solid rgba(0,0,0,.05); margin-bottom:8px; }
    .gs-day-head small { display:block; font-size:10.5px; font-weight:500; color:#999; }
    .gs-slots { display:flex; flex-direction:column; gap:6px; }
    .gs-slot {
      padding:7px 9px; border-radius:8px;
      border-left:3px solid #ccc;
      transition:transform 160ms;
    }
    .gs-slot:hover { transform:translateX(2px); }
    .gs-slot-time { font-size:11px; color:#7A7A7A; font-weight:600; }
    .gs-slot-title { font-size:12.5px; font-weight:700; color:#1A1A1A; line-height:1.2; margin-top:2px; }
    .gs-slot-subj { font-size:11px; font-weight:600; margin-top:2px; }
    .gs-slot-meta { font-size:10.5px; color:#999; margin-top:4px; display:flex; gap:6px; }
    .gs-empty-day { text-align:center; color:#bbb; font-size:13px; padding:8px; }

    /* List */
    .gs-list { display:flex; flex-direction:column; gap:8px; }
    .gs-row {
      display:grid; grid-template-columns:14px 1fr auto; align-items:center; gap:14px;
      padding:12px 14px; background:#fff; border:1px solid rgba(0,0,0,.05); border-radius:14px;
      transition:transform 200ms,box-shadow 200ms;
    }
    .gs-row:hover { transform:translateY(-1px); box-shadow:0 6px 18px rgba(0,0,0,.05); }
    .dot { width:14px; height:14px; border-radius:50%; }
    .title { font-weight:700; font-size:13.5px; color:#1A1A1A; }
    .when { font-size:11.5px; color:#999; }
    .dur { color:#bbb; }
    .meta { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .subj-pill { padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; }
    .status { padding:3px 10px; border-radius:999px; font-size:11px; font-weight:700; }
    .status-PLANNED     { background:#FFFBDD; color:#8B6E00; }
    .status-IN_PROGRESS { background:#EEF2FF; color:#3951D3; }
    .status-COMPLETED   { background:#EDFAF4; color:#1a7a4a; }
    .status-CANCELLED   { background:#f5f1ea; color:#aaa; }
    .prio {
      padding:3px 8px; border-radius:6px; background:#f5f1ea;
      font-size:10.5px; font-weight:800; color:#7A7A7A;
    }
    .gs-empty { text-align:center; padding:36px; color:#999; }
    .empty-icon { font-size:48px; margin-bottom:8px; }
  `]
})
export class GeneratedScheduleComponent {
  @Input() sessions: StudySession[] = [];
  @Input() priorities: Record<string, number> = {};

  mode: 'calendar' | 'list' = 'calendar';

  /** Lundi → Dimanche pour la semaine courante */
  get weekDays() {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const labels = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday); d.setDate(monday.getDate() + i);
      return { label: labels[i], date: d };
    });
  }

  sessionsByDay(idx: number) {
    const day = this.weekDays[idx].date;
    const ds = day.toISOString().slice(0, 10);
    return this.sessions
      .filter(s => s.startDateTime.slice(0, 10) === ds)
      .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  }

  get sortedSessions(): StudySession[] {
    return [...this.sessions].sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  }

  get totalHours(): number {
    const min = this.sessions.reduce((a, s) => a + (s.plannedDuration || 0), 0);
    return Math.round((min / 60) * 10) / 10;
  }

  priorityOf(s: StudySession): number {
    return this.priorities[s.subjectId] ?? 3;
  }

  statusLabel(s: StudySession['status']): string {
    return ({ PLANNED: 'Planifiée', IN_PROGRESS: 'En cours', COMPLETED: 'Complétée', CANCELLED: 'Annulée' } as const)[s];
  }
}
