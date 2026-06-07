import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WeeklyPoint {
  week: string;
  planned: number;
  actual: number;
}

/**
 * Mini-bar-chart hebdomadaire (planned vs actual hours).
 * Pure SVG — pas de dépendance externe.
 */
@Component({
  selector: 'app-weekly-productivity-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="wpc-wrap">
      <div class="wpc-legend">
        <span class="leg"><i class="dot dot--planned"></i>Prévu</span>
        <span class="leg"><i class="dot dot--actual"></i>Réalisé</span>
      </div>
      <div class="wpc-chart">
        <div class="wpc-bar-group" *ngFor="let p of data; let i = index" [style.--i]="i">
          <div class="bars">
            <div class="bar bar--planned"
                 [style.height.%]="pct(p.planned)"
                 [title]="'Prévu: ' + p.planned + 'h'"></div>
            <div class="bar bar--actual"
                 [style.height.%]="pct(p.actual)"
                 [title]="'Réalisé: ' + p.actual + 'h'"></div>
          </div>
          <div class="lbl">{{ p.week }}</div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .wpc-wrap { display:flex; flex-direction:column; gap:12px; }
    .wpc-legend { display:flex; gap:14px; font-size:12px; color:#7A7A7A; }
    .leg { display:inline-flex; align-items:center; gap:6px; }
    .dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
    .dot--planned { background:rgba(0,0,0,.18); }
    .dot--actual  { background:#F5C518; }
    .wpc-chart { display:flex; align-items:flex-end; justify-content:space-between; gap:10px; height:170px; padding-top:8px; }
    .wpc-bar-group { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; min-width:0; }
    .bars { display:flex; align-items:flex-end; gap:3px; height:140px; width:100%; justify-content:center; }
    .bar { width:14px; min-height:6px; border-radius:6px 6px 2px 2px; transition: height 700ms cubic-bezier(.16,1,.3,1); }
    .bar--planned { background:rgba(0,0,0,.18); }
    .bar--actual  { background:linear-gradient(180deg,#F5C518 0%,#E0A800 100%); box-shadow:0 4px 14px rgba(245,197,24,.22); }
    .lbl { font-size:11px; color:#7A7A7A; font-weight:600; }
  `]
})
export class WeeklyProductivityChartComponent {
  @Input() data: WeeklyPoint[] = [];
  @Input() max = 40;

  pct(v: number): number {
    if (!this.max) return 0;
    return Math.max(4, Math.min(100, (v / this.max) * 100));
  }
}
