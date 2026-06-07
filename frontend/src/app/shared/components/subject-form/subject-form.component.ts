import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from '../../../core/models/models';

const PRESET_COLORS = [
  '#6C8EEF', '#4CAF82', '#F0A030', '#9B72EF',
  '#3DC9B0', '#F5C518', '#FF6B5B', '#E67E8A',
];

/**
 * Formulaire compact d'ajout / édition de matière.
 * Émet (save) avec un Omit<Subject,'id'|'createdAt'|'completionRate'>.
 */
@Component({
  selector: 'app-subject-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="sf" (submit)="$event.preventDefault(); submit()">
      <div class="sf-row sf-row--2">
        <label class="field">
          <span>Nom *</span>
          <input type="text" [(ngModel)]="form.name" name="name" placeholder="ex: Algorithmique" required />
        </label>
        <label class="field">
          <span>Priorité</span>
          <select [(ngModel)]="form.priority" name="priority">
            <option [ngValue]="5">5 — critique</option>
            <option [ngValue]="4">4 — élevée</option>
            <option [ngValue]="3">3 — normale</option>
            <option [ngValue]="2">2 — faible</option>
            <option [ngValue]="1">1 — secondaire</option>
          </select>
        </label>
      </div>

      <div class="sf-row sf-row--2">
        <label class="field">
          <span>Objectif hebdo (h)</span>
          <input type="number" min="1" step="0.5" [(ngModel)]="form.weeklyGoalHours" name="weeklyGoalHours" />
        </label>
        <label class="field">
          <span>Durée max session (min)</span>
          <input type="number" min="15" step="15" [(ngModel)]="form.maxSessionDuration" name="maxSessionDuration" />
        </label>
      </div>

      <label class="field">
        <span>Description</span>
        <input type="text" [(ngModel)]="form.description" name="description" placeholder="Notes ou thèmes" />
      </label>

      <div class="field">
        <span>Couleur</span>
        <div class="swatches">
          <button type="button"
                  *ngFor="let c of presetColors"
                  class="swatch"
                  [class.on]="form.color === c"
                  [style.background]="c"
                  (click)="form.color = c"
                  [attr.aria-label]="c"></button>
        </div>
      </div>

      <div class="sf-actions">
        <button type="button" class="btn-ghost" (click)="cancel.emit()">Annuler</button>
        <button type="submit" class="btn-accent" [disabled]="!valid()">
          {{ initial?.id ? 'Enregistrer' : 'Créer' }}
        </button>
      </div>
    </form>
  `,
  styles: [`
    :host { display:block; }
    .sf { display:flex; flex-direction:column; gap:14px; }
    .sf-row { display:grid; gap:12px; }
    .sf-row--2 { grid-template-columns: 1fr 1fr; }
    @media(max-width:520px){ .sf-row--2 { grid-template-columns: 1fr; } }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field span { font-size:.75rem; font-weight:700; color:#777; text-transform:uppercase; letter-spacing:.06em; }
    .field input, .field select {
      padding:11px 14px; border-radius:12px;
      border:1.5px solid #e8dfd5; background:#faf8f5;
      font-size:.93rem; color:#1A1A1A; outline:none;
      transition:border 200ms,box-shadow 200ms;
    }
    .field input:focus, .field select:focus {
      border-color:#F5C518; box-shadow:0 0 0 4px rgba(245,197,24,.12); background:#fff;
    }
    .swatches { display:flex; gap:8px; flex-wrap:wrap; }
    .swatch {
      width:28px; height:28px; border-radius:50%; border:2px solid #fff;
      box-shadow:0 0 0 2px rgba(0,0,0,.06); cursor:pointer; transition:transform 160ms;
    }
    .swatch:hover { transform:scale(1.12); }
    .swatch.on { box-shadow:0 0 0 2px #1A1A1A; }
    .sf-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:6px; }
    .btn-ghost { background:#f5f1ea; padding:10px 18px; border-radius:999px; border:none; font-weight:600; cursor:pointer; color:#1A1A1A; }
    .btn-ghost:hover { background:#e8dfd5; }
    .btn-accent {
      background:#1A1A1A; color:#F5C518; padding:10px 22px; border-radius:999px;
      border:none; font-weight:700; cursor:pointer; transition:transform 180ms;
    }
    .btn-accent:hover:not(:disabled) { transform:translateY(-1px); }
    .btn-accent:disabled { opacity:.5; cursor:not-allowed; }
  `]
})
export class SubjectFormComponent {
  presetColors = PRESET_COLORS;

  @Input() set initial(s: Subject | null | undefined) {
    this._initial = s || null;
    this.form = s ? { ...s } as any : this.empty();
  }
  get initial(): Subject | null { return this._initial; }
  private _initial: Subject | null = null;

  @Output() save = new EventEmitter<Omit<Subject, 'id' | 'createdAt' | 'completionRate'>>();
  @Output() cancel = new EventEmitter<void>();

  form: any = this.empty();

  private empty() {
    return { name: '', color: PRESET_COLORS[0], priority: 3, weeklyGoalHours: 4, maxSessionDuration: 60, description: '' };
  }

  valid(): boolean {
    return !!this.form?.name?.trim() && this.form.weeklyGoalHours > 0 && this.form.maxSessionDuration >= 15;
  }

  submit() {
    if (!this.valid()) return;
    this.save.emit({
      name: this.form.name.trim(),
      color: this.form.color,
      priority: this.form.priority as 1|2|3|4|5,
      weeklyGoalHours: Number(this.form.weeklyGoalHours),
      maxSessionDuration: Number(this.form.maxSessionDuration),
      description: this.form.description?.trim() || undefined,
    });
  }
}
