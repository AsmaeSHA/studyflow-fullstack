import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Carte "Workout Results" de l'inspiration : blobs flous, chiffres au centre.
 */
@Component({
  selector: 'app-chart-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-card">
      <div class="head">
        <div>
          <div class="title">{{ title }}</div>
          <div class="sub">{{ subtitle }}</div>
        </div>
        <button class="more" aria-label="Options">⋯</button>
      </div>

      <div class="blobs">
        <div class="blob dark">
          <div class="num">{{ timeValue }}</div>
          <div class="lbl">hours</div>
        </div>
        <div class="blob coral">
          <div class="num">{{ burned }}</div>
          <div class="lbl">min</div>
        </div>
        <div class="blob yellow">
          <div class="num">{{ intake }}</div>
          <div class="lbl">min planned</div>
        </div>
      </div>

      <div class="legend">
        <div class="item"><span class="dot yellow"></span>Planned</div>
        <div class="item"><span class="dot coral"></span>Completed</div>
        <div class="item"><span class="dot dark"></span>Study time</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .chart-card {
      background: #E8DFD0;
      border-radius: var(--radius-lg);
      padding: 28px;
      position: relative;
      overflow: hidden;
      min-height: 340px;
    }
    .head { display: flex; justify-content: space-between; align-items: flex-start; }
    .title { font-size: 20px; font-weight: 700; line-height: 1.2; }
    .sub { font-size: 13px; color: var(--text-muted); margin-top: 2px; }
    .more {
      width: 32px; height: 32px; border-radius: 50%;
      background: var(--surface-dark); color: #fff;
      font-size: 16px;
    }
    .blobs {
      position: relative;
      height: 220px;
      margin-top: 20px;
    }
    .blob {
      position: absolute;
      border-radius: 50%;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      color: #fff;
      font-weight: 700;
      filter: blur(0);
      animation: float 6s ease-in-out infinite;
    }
    .blob::before {
      content: '';
      position: absolute; inset: -30px; border-radius: 50%;
      background: inherit; filter: blur(30px); opacity: 0.5;
      z-index: -1;
    }
    .blob .num { font-size: 22px; letter-spacing: -.01em; }
    .blob .lbl { font-size: 11px; opacity: .85; }
    .blob.dark {
      width: 100px; height: 100px;
      background: #1A1A1A;
      top: 40px; left: 20%;
    }
    .blob.coral {
      width: 120px; height: 120px;
      background: radial-gradient(circle at 30% 30%, #FF9588, #FF6B5B);
      top: 80px; left: 40%;
      animation-delay: -1s;
    }
    .blob.yellow {
      width: 170px; height: 170px;
      background: radial-gradient(circle at 30% 30%, #FFE066, #F5C518);
      top: 20px; right: 10%;
      color: #1A1A1A;
      animation-delay: -2s;
    }
    .blob.yellow .num { font-size: 26px; }
    .legend {
      display: flex; gap: 20px; flex-wrap: wrap;
      margin-top: 14px;
      font-size: 12px; color: var(--text-muted);
    }
    .item { display: inline-flex; align-items: center; gap: 8px; }
    .dot { width: 14px; height: 3px; border-radius: 2px; display: inline-block; }
    .dot.yellow { background: #F5C518; }
    .dot.coral  { background: #FF6B5B; }
    .dot.dark   { background: #1A1A1A; }
    @keyframes float {
      0%,100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
  `]
})
export class ChartCardComponent {
  @Input() title = 'Your Study Results for Today';
  @Input() subtitle = '';
  @Input() timeValue: string | number = '2.30';
  @Input() burned: string | number = '85';
  @Input() intake: string | number = '187';
}
