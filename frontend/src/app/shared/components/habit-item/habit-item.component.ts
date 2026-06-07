import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Habit } from '../../../core/models/stats.model';

@Component({
  selector: 'app-habit-item',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="habit">
      <img class="avatar" [src]="habit.avatarUrl || fallback" [alt]="habit.trainer"/>
      <div class="info">
        <div class="title">{{ habit.title }}</div>
        <div class="trainer">{{ habit.trainer }}</div>
      </div>
      <div class="progress">
        <div class="label">Sessions: {{ habit.completed }}/{{ habit.total }}</div>
        <div class="bars">
          <span *ngFor="let _ of barsArray; let i = index"
                class="bar"
                [class.on]="i < habit.completed"
                [style.background]="i < habit.completed ? habit.color : ''"></span>
        </div>
      </div>
      <button class="more" aria-label="More">⋯</button>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .habit {
      display: grid;
      grid-template-columns: 48px 1fr auto auto;
      gap: 16px;
      align-items: center;
      padding: 14px 16px;
      border-radius: var(--radius-md);
      transition: background 200ms;
    }
    .habit:hover { background: var(--surface-alt); }
    .avatar { width: 40px; height: 40px; border-radius: 50%; object-fit: cover; background: var(--surface-alt); }
    .title { font-weight: 700; font-size: 14px; }
    .trainer { font-size: 12px; color: var(--text-muted); }
    .progress { text-align: right; }
    .label { font-size: 12px; color: var(--text-muted); margin-bottom: 6px; }
    .bars { display: inline-flex; gap: 3px; }
    .bar {
      width: 4px; height: 16px; border-radius: 2px;
      background: rgba(0,0,0,.08);
      transition: background 200ms;
    }
    .bar.on { background: var(--coral); }
    .more { width: 32px; height: 32px; border-radius: 50%; color: var(--text-muted); font-size: 16px; }
    .more:hover { background: rgba(0,0,0,.05); color: var(--text); }
  `]
})
export class HabitItemComponent {
  @Input() habit!: Habit;
  fallback = 'https://i.pravatar.cc/64';
  get barsArray() { return Array.from({ length: this.habit?.total || 0 }); }
}
