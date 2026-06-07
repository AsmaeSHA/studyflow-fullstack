import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty">
      <div class="art">{{ emoji }}</div>
      <h4>{{ title }}</h4>
      <p>{{ message }}</p>
      <ng-content></ng-content>
    </div>
  `,
  styles: [`
    .empty {
      text-align: center;
      padding: 40px 20px;
    }
    .art { font-size: 56px; margin-bottom: 12px; }
    h4 { font-size: 18px; font-weight: 700; margin-bottom: 6px; }
    p { color: var(--text-muted); font-size: 14px; }
  `]
})
export class EmptyStateComponent {
  @Input() title = 'Rien ici pour le moment';
  @Input() message = 'Reviens plus tard ou crée un nouvel élément.';
  @Input() emoji = '📭';
}
