import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Anneau de progression SVG - style inspiration "Steps for Today".
 */
@Component({
  selector: 'app-progress-ring',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="ring-wrap" [style.--size.px]="size">
      <svg [attr.width]="size" [attr.height]="size" class="ring">
        <circle
          class="bg"
          [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius"
          stroke-width="10" fill="none"/>
        <circle
          class="fg"
          [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius"
          stroke-width="10" fill="none"
          [style.stroke]="color"
          [attr.stroke-dasharray]="circumference"
          [attr.stroke-dashoffset]="offset"
          stroke-linecap="round"
          [attr.transform]="'rotate(-90 ' + size/2 + ' ' + size/2 + ')'"/>
      </svg>
      <div class="center">
        <div class="label" *ngIf="label">{{ label }}</div>
        <div class="value">{{ value | number:'1.0-0' }}</div>
        <div class="sub" *ngIf="subLabel">{{ subLabel }}</div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: inline-block; }
    .ring-wrap {
      position: relative;
      width: var(--size, 180px);
      height: var(--size, 180px);
    }
    .ring { display: block; }
    .bg { stroke: rgba(0,0,0,0.06); }
    .fg {
      transition: stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1);
      filter: drop-shadow(0 4px 12px rgba(245, 197, 24, 0.3));
    }
    .center {
      position: absolute;
      inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      text-align: center;
    }
    .label { font-size: 11px; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: .06em;}
    .value { font-size: 28px; font-weight: 800; letter-spacing: -.02em; }
    .sub { font-size: 11px; color: var(--text-muted); }
  `]
})
export class ProgressRingComponent {
  @Input() value = 8500;
  @Input() max = 10000;
  @Input() size = 180;
  @Input() color = '#F5C518';
  @Input() label?: string = 'Goal';
  @Input() subLabel?: string;

  get radius() { return this.size / 2 - 10; }
  get circumference() { return 2 * Math.PI * this.radius; }
  get offset() {
    const pct = Math.min(1, this.value / this.max);
    return this.circumference * (1 - pct);
  }
}
