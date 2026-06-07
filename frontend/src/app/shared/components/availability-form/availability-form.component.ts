import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Availability } from '../../../core/models/models';

const DAY_LABELS = ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'];

/**
 * Formulaire d'ajout d'un créneau de disponibilité.
 * Émet (save) avec un Omit<Availability,'id'>.
 */
@Component({
  selector: 'app-availability-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <form class="af" (submit)="$event.preventDefault(); submit()">
      <label class="field">
        <span>Jour</span>
        <select [(ngModel)]="form.dayOfWeek" name="day">
          <option *ngFor="let d of dayLabels; let i = index" [ngValue]="i">{{ d }}</option>
        </select>
      </label>

      <div class="row-2">
        <label class="field">
          <span>Début</span>
          <input type="time" [(ngModel)]="form.startTime" name="start" />
        </label>
        <label class="field">
          <span>Fin</span>
          <input type="time" [(ngModel)]="form.endTime" name="end" />
        </label>
      </div>

      <label class="check">
        <input type="checkbox" [(ngModel)]="form.isRecurring" name="recurring" />
        <span>Créneau récurrent (chaque semaine)</span>
      </label>

      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="af-actions">
        <button type="button" class="btn-ghost" (click)="cancel.emit()">Annuler</button>
        <button type="submit" class="btn-accent">Ajouter</button>
      </div>
    </form>
  `,
  styles: [`
    :host { display:block; }
    .af { display:flex; flex-direction:column; gap:12px; }
    .row-2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field span { font-size:.75rem; font-weight:700; color:#777; text-transform:uppercase; letter-spacing:.06em; }
    .field input, .field select {
      padding:11px 14px; border-radius:12px;
      border:1.5px solid #e8dfd5; background:#faf8f5;
      font-size:.93rem; outline:none; transition:border 200ms;
    }
    .field input:focus, .field select:focus { border-color:#F5C518; background:#fff; }
    .check { display:flex; align-items:center; gap:8px; font-size:13px; color:#1A1A1A; cursor:pointer; }
    .error { background:rgba(255,107,91,.12); color:#C04A3A; padding:8px 12px; border-radius:10px; font-size:12px; }
    .af-actions { display:flex; justify-content:flex-end; gap:10px; margin-top:6px; }
    .btn-ghost { background:#f5f1ea; padding:10px 18px; border-radius:999px; border:none; font-weight:600; cursor:pointer; color:#1A1A1A; }
    .btn-accent {
      background:#1A1A1A; color:#F5C518; padding:10px 22px; border-radius:999px;
      border:none; font-weight:700; cursor:pointer;
    }
  `]
})
export class AvailabilityFormComponent {
  dayLabels = DAY_LABELS;
  error = '';

  @Output() save = new EventEmitter<Omit<Availability, 'id'>>();
  @Output() cancel = new EventEmitter<void>();

  @Input() set initial(a: Partial<Availability> | null | undefined) {
    if (a) this.form = { ...this.form, ...a };
  }

  form: Omit<Availability, 'id'> = {
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    isRecurring: true,
  };

  submit() {
    this.error = '';
    if (this.form.startTime >= this.form.endTime) {
      this.error = 'L\'heure de fin doit être après l\'heure de début.';
      return;
    }
    this.save.emit({ ...this.form });
  }
}
