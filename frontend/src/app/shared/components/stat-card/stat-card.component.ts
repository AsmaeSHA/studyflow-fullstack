import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-stat-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="stat" [class.dark]="dark">
      <div class="header">
        <div class="label">{{ label }}</div>
        <div class="icon" *ngIf="icon" [innerHTML]="icon"></div>
      </div>
      <div class="value">
        {{ value }}<span class="unit" *ngIf="unit">{{ unit }}</span>
      </div>
      <div class="delta" *ngIf="delta !== undefined" [class.up]="delta >= 0">
        <span class="arrow">{{ delta >= 0 ? '↑' : '↓' }}</span>
        {{ delta >= 0 ? '+' : '' }}{{ delta }}% vs last week
      </div>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .stat {
      background: var(--surface);
      border-radius: var(--radius-lg);
      padding: 24px;
      border: 1px solid var(--border);
      box-shadow: var(--shadow-sm);
      transition: transform 250ms cubic-bezier(0.4,0,0.2,1), box-shadow 250ms;
      display: flex; flex-direction: column; gap: 12px;
      min-height: 140px;
    }
    .stat:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
    .stat.dark { background: var(--surface-dark); color: #fff; border-color: rgba(255,255,255,0.08); }
    .header { display: flex; justify-content: space-between; align-items: flex-start; }
    .label { font-size: 13px; color: var(--text-muted); font-weight: 600; }
    .stat.dark .label { color: rgba(255,255,255,.6); }
    .value { font-size: 32px; font-weight: 800; letter-spacing: -0.02em; line-height: 1; }
    .unit { font-size: 14px; font-weight: 500; color: var(--text-muted); margin-left: 4px; }
    .delta { font-size: 12px; color: var(--coral); font-weight: 600; }
    .delta.up { color: var(--success); }
    .icon {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--accent); color: #1A1A1A;
    }
  `]
})
export class StatCardComponent {
  @Input() label!: string;
  @Input() value: string | number = 0;
  @Input() unit?: string;
  @Input() delta?: number;
  @Input() icon?: string;
  @Input() dark = false;
}
