import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface PvAItem {
  label: string;
  planned: number;
  actual: number;
  color?: string;
}

/**
 * Comparaison Planned vs Actual (par matière par défaut).
 * Présentation horizontale empilée pour économiser la place.
 */
@Component({
  selector: 'app-planned-vs-actual-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pva-wrap">
      <div class="pva-legend">
        <span class="leg"><i class="dot ghost"></i>Prévu</span>
        <span class="leg"><i class="dot solid" [style.background]="accent"></i>Réalisé</span>
      </div>

      <div class="pva-row" *ngFor="let r of items">
        <div class="pva-label">
          <span class="dot" [style.background]="r.color || accent"></span>
          {{ r.label }}
        </div>
        <div class="pva-bars">
          <div class="ghost">
            <div class="ghost-fill"
                 [style.width.%]="pct(r.planned)"></div>
          </div>
          <div class="solid">
            <div class="solid-fill"
                 [style.width.%]="pct(r.actual)"
                 [style.background]="r.color || accent"></div>
          </div>
        </div>
        <div class="pva-meta">
          <span>{{ r.actual }}/{{ r.planned }} {{ unit }}</span>
        </div>
      </div>

      <div class="pva-empty" *ngIf="!items?.length">Aucune donnée</div>
    </div>
  `,
  styles: [`
    :host { display:block; }
    .pva-wrap { display:flex; flex-direction:column; gap:12px; }
    .pva-legend { display:flex; gap:14px; font-size:12px; color:#7A7A7A; margin-bottom:4px; }
    .leg { display:inline-flex; align-items:center; gap:6px; }
    .leg .dot { width:10px; height:10px; border-radius:3px; display:inline-block; }
    .leg .dot.ghost { background:rgba(0,0,0,.10); }
    .leg .dot.solid { background:#F5C518; }

    .pva-row {
      display:grid;
      grid-template-columns: 130px 1fr 80px;
      align-items:center;
      gap:12px;
    }
    .pva-label {
      display:inline-flex; align-items:center; gap:8px;
      font-size:13px; font-weight:700; color:#1A1A1A;
    }
    .pva-label .dot { width:10px; height:10px; border-radius:50%; }
    .pva-bars { display:flex; flex-direction:column; gap:5px; }
    .ghost, .solid { position:relative; height:6px; border-radius:6px; background:rgba(0,0,0,.05); overflow:hidden; }
    .ghost-fill { height:100%; background:rgba(0,0,0,.18); border-radius:6px; transition: width 600ms cubic-bezier(.16,1,.3,1); }
    .solid-fill { height:100%; border-radius:6px; transition: width 600ms cubic-bezier(.16,1,.3,1); }
    .pva-meta { font-size:11px; color:#7A7A7A; text-align:right; font-weight:600; }
    .pva-empty { padding:24px; text-align:center; color:#999; font-size:13px; }

    @media (max-width: 640px) {
      .pva-row { grid-template-columns: 1fr; }
      .pva-meta { text-align:left; }
    }
  `]
})
export class PlannedVsActualChartComponent {
  @Input() items: PvAItem[] = [];
  @Input() max?: number;
  @Input() unit = 'h';
  @Input() accent = '#F5C518';

  pct(v: number): number {
    const m = this.max ?? Math.max(...this.items.flatMap(i => [i.planned, i.actual]), 1);
    return Math.max(2, Math.min(100, (v / m) * 100));
  }
}
