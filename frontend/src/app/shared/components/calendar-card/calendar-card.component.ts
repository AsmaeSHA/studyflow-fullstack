import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardService } from '../../../core/services/dashboard.service';
import { DayActivity } from '../../../core/models/stats.model';

/**
 * "Your Training Days" - calendrier sombre avec dots jaunes/corail.
 */
@Component({
  selector: 'app-calendar-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="cal">
      <div class="head">
        <h3>{{ title }}</h3>
        <button class="month">{{ currentMonth }} ▾</button>
      </div>

      <div class="grid head-row">
        <div class="col" *ngFor="let d of weekdays">{{ d }}</div>
      </div>

      <div class="grid body">
        <div *ngFor="let day of days"
             class="day"
             [class.done]="day.status === 'done'"
             [class.scheduled]="day.status === 'scheduled'"
             [class.current]="day.status === 'current'">
          {{ day.date }}
        </div>
      </div>

      <div class="legend">
        <span class="lg"><i class="dot current"></i>Today</span>
        <span class="lg"><i class="dot done"></i>Done</span>
        <span class="lg"><i class="dot scheduled"></i>Scheduled</span>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cal {
      background: #1A1A1A;
      color: #fff;
      border-radius: var(--radius-lg);
      padding: 24px;
      min-height: 340px;
    }
    .head { display: flex; justify-content: space-between; align-items: center; }
    .head h3 { font-size: 18px; font-weight: 700; }
    .month {
      background: transparent; color: rgba(255,255,255,.85);
      padding: 6px 10px; border-radius: 8px;
      font-weight: 600; font-size: 13px;
    }
    .month:hover { background: rgba(255,255,255,.08); }
    .grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 8px;
    }
    .head-row { margin: 16px 0 10px; }
    .head-row .col {
      font-size: 11px; color: rgba(255,255,255,.45);
      text-align: center; font-weight: 600; letter-spacing: .08em;
    }
    .day {
      aspect-ratio: 1;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 600;
      color: rgba(255,255,255,.75);
      border-radius: 50%;
      transition: transform 200ms, background 200ms;
      cursor: pointer;
    }
    .day:hover { background: rgba(255,255,255,.08); transform: scale(1.05); }
    .day.done {
      background: #F5C518; color: #1A1A1A;
      box-shadow: 0 4px 18px rgba(245,197,24,.35);
    }
    .day.current {
      background: #FF6B5B; color: #fff;
      box-shadow: 0 4px 18px rgba(255,107,91,.35);
    }
    .day.scheduled {
      background: rgba(255,255,255,.10);
      border: 1px solid rgba(255,255,255,.15);
    }
    .legend {
      display: flex; gap: 16px; flex-wrap: wrap;
      margin-top: 18px;
      font-size: 11px; color: rgba(255,255,255,.6);
    }
    .lg { display: inline-flex; align-items: center; gap: 6px; }
    .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .dot.current { background: #FF6B5B; }
    .dot.done { background: #F5C518; }
    .dot.scheduled { background: rgba(255,255,255,.3); }
  `]
})
export class CalendarCardComponent implements OnInit {
  @Input() title = 'Your Study Days';
  currentMonth = new Date().toLocaleString('en', { month: 'long' });
  weekdays = ['M','T','W','T','F','S','S'];
  days: DayActivity[] = [];

  private dashboard = inject(DashboardService);

  ngOnInit() {
    this.dashboard.getMonthActivity().subscribe(d => this.days = d);
  }
}
