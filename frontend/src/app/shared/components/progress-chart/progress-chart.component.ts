import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressChartItem {
  label: string;
  color: string;
  value: number;        // 0..max
  max: number;
  meta?: string;        // ex: "12h / 16h"
}

/**
 * Barres de progression horizontales — réutilisé par
 * dashboard (avancement par matière) & analytics.
 */
@Component({
  selector: 'app-progress-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pc-wrap">
      <div class="pc-row" *ngFor="let it of items">
        <div class="pc-head">
          <span class="pc-dot" [style.background]="it.color"></span>
          <span class="pc-label">{{ it.label }}</span>
          <span class="pc-meta" *ngIf="it.meta">{{ it.meta }}</span>
          <span class="pc-pct">{{ percent(it) }}%</span>
        </div>
        <div class="pc-track">
          <div class="pc-fill"
               [style.width.%]="percent(it)"
               [style.background]="it.color"></div>
        </div>
      </div>
      <div class="pc-empty" *ngIf="!items?.length">Aucune donnée</div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .pc-wrap { display:flex; flex-direction:column; gap:14px; }
    .pc-head { display:flex; align-items:center; gap:8px; font-size:13px; margin-bottom:6px; }
    .pc-dot { width:10px; height:10px; border-radius:50%; flex:none; }
    .pc-label { font-weight:700; color:#1A1A1A; flex:1; }
    .pc-meta { color:#7A7A7A; font-size:12px; }
    .pc-pct { font-weight:700; font-size:12px; color:#7A7A7A; min-width:42px; text-align:right; }
    .pc-track { position:relative; height:8px; border-radius:8px; background:rgba(0,0,0,.06); overflow:hidden; }
    .pc-fill {
      height:100%; border-radius:8px;
      transition: width 600ms cubic-bezier(.16,1,.3,1);
    }
    .pc-empty { padding:24px; text-align:center; color:#999; font-size:13px; }
  `]
})
export class ProgressChartComponent {
  @Input() items: ProgressChartItem[] = [];

  percent(it: ProgressChartItem): number {
    if (!it.max) return 0;
    return Math.min(100, Math.round((it.value / it.max) * 100));
  }
}
