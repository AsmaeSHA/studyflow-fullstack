import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AvailabilityService } from '../../core/services/availability.service';
import { Availability } from '../../core/models/models';

const DAY_NAMES = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
const HOURS = Array.from({length:14}, (_,i) => `${String(i+7).padStart(2,'0')}:00`);

@Component({
  selector: 'app-availabilities',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page-body">

      <div class="page-header">
        <div>
          <h1>Disponibilités</h1>
          <p>Définissez vos créneaux horaires disponibles pour l'étude</p>
        </div>
        <button class="btn btn-primary" (click)="openModal()">➕ Ajouter un créneau</button>
      </div>

      <div class="layout">
        <!-- Weekly grid -->
        <div class="card grid-panel">
          <div class="grid-header">
            <div class="hour-col"></div>
            <div *ngFor="let d of days; let i=index" class="day-col">
              <span class="day-name" [class.today]="i===todayDow()">{{d}}</span>
            </div>
          </div>
          <div class="grid-body">
            <div *ngFor="let h of hours" class="grid-row">
              <div class="hour-label">{{h}}</div>
              <div *ngFor="let d of [0,1,2,3,4,5,6]" class="time-cell"
                [class.available]="isCovered(d, h)"
                [style.background]="isCovered(d,h) ? 'rgba(108,142,239,0.18)' : ''"
                [style.border-color]="isCovered(d,h) ? 'rgba(108,142,239,0.35)' : ''"
                (click)="cellClick(d, h)">
              </div>
            </div>
          </div>
        </div>

        <!-- Slots list -->
        <div class="card slots-panel">
          <h3 style="margin-bottom:14px;font-size:14px">Créneaux définis</h3>
          <div *ngFor="let s of slotsSorted()" class="slot-item">
            <div class="slot-day">{{DAY_NAMES[s.dayOfWeek]}}</div>
            <div class="slot-time">{{s.startTime}} – {{s.endTime}}</div>
            <div class="slot-badges">
              <span class="badge badge-info" *ngIf="s.isRecurring">Récurrent</span>
            </div>
            <button class="icon-btn danger" (click)="avSvc.delete(s.id)">✕</button>
          </div>
          <div *ngIf="avSvc.slots().length===0" class="empty-state">
            Aucun créneau défini
          </div>
        </div>
      </div>

      <!-- Error toast -->
      <div class="toast" *ngIf="error()" (click)="error.set('')">
        ⚠️ {{error()}}
      </div>

      <!-- Modal -->
      <div class="modal-overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <h3>Nouveau créneau</h3>
          <div class="form-group">
            <label>Jour de la semaine</label>
            <select [(ngModel)]="form.dayOfWeek">
              <option *ngFor="let d of days; let i=index" [value]="i">{{d}}</option>
            </select>
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label>Heure début</label>
              <input type="time" [(ngModel)]="form.startTime" />
            </div>
            <div class="form-group">
              <label>Heure fin</label>
              <input type="time" [(ngModel)]="form.endTime" />
            </div>
          </div>
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" [(ngModel)]="form.isRecurring" />
              Répétition hebdomadaire
            </label>
          </div>
          <div class="modal-actions">
            <button class="btn btn-secondary" (click)="closeModal()">Annuler</button>
            <button class="btn btn-primary" (click)="save()">Ajouter</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    @use 'styles/variables' as *;

    .layout { display: grid; grid-template-columns: 1fr 260px; gap: 16px; align-items: start; }

    .grid-panel { padding: 0; overflow: hidden; }
    .grid-header { display: flex; border-bottom: 1px solid $border-subtle; background: $bg-surface; }
    .hour-col { width: 48px; flex-shrink: 0; }
    .day-col {
      flex: 1; text-align: center; padding: 10px 4px;
      font-size: 11px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase;
      color: $text-muted;
      .day-name.today { color: $accent; }
    }

    .grid-body { }
    .grid-row { display: flex; border-bottom: 1px solid $border-subtle; }
    .hour-label {
      width: 48px; flex-shrink: 0; padding: 0 8px;
      font-size: 10px; color: $text-muted;
      display: flex; align-items: center;
      font-family: 'JetBrains Mono', monospace;
    }
    .time-cell {
      flex: 1; height: 32px;
      border-left: 1px solid $border-subtle;
      cursor: pointer; transition: $transition;
      &:hover { background: rgba($accent, 0.1) !important; }
      &.available { }
    }

    .slots-panel h3 { }
    .slot-item {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 0; border-bottom: 1px solid $border-subtle;
      &:last-child { border: none; }
    }
    .slot-day {
      width: 32px; text-align: center;
      background: rgba($accent, 0.12); color: $accent;
      border-radius: $radius-sm; padding: 3px 0;
      font-size: 11px; font-weight: 700;
    }
    .slot-time { flex: 1; font-size: 13px; color: $text-primary; font-family: 'JetBrains Mono', monospace; }
    .slot-badges { }
    .icon-btn {
      background: transparent; border: none; cursor: pointer;
      font-size: 13px; color: $text-muted; padding: 4px;
      border-radius: 4px; transition: $transition;
      &.danger:hover { color: $danger; background: rgba($danger, 0.1); }
    }

    .toast {
      position: fixed; bottom: 20px; right: 20px;
      background: rgba($danger, 0.9); color: #fff;
      padding: 10px 18px; border-radius: $radius;
      font-size: 13px; cursor: pointer;
      animation: slideUp 0.2s ease;
      z-index: 2000;
    }

    .checkbox-label {
      display: flex !important; align-items: center; gap: 8px;
      cursor: pointer;
      input { width: auto; }
    }

    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; color: $text-muted; font-size: 13px; padding: 20px; }
  `]
})
export class AvailabilitiesComponent {
  avSvc = inject(AvailabilityService);

  constructor() {
    // GET /api/users/me/availabilities → remplit le signal `slots`.
    this.avSvc.list().subscribe();
  }

  showModal = signal(false);
  error = signal('');

  days = DAY_NAMES;
  hours = HOURS;
  DAY_NAMES = DAY_NAMES;

  form: Omit<Availability,'id'> = {
    dayOfWeek: 1, startTime: '08:00', endTime: '10:00', isRecurring: true
  };

  todayDow = computed(() => new Date().getDay());

  slotsSorted = computed(() =>
    [...this.avSvc.slots()].sort((a,b) => a.dayOfWeek-b.dayOfWeek || a.startTime.localeCompare(b.startTime))
  );

  isCovered(dow: number, hour: string) {
    const toMin = (t: string) => { const [h,m]=t.split(':').map(Number); return h*60+m; };
    const hMin = toMin(hour);
    return this.avSvc.slots().some(s =>
      s.dayOfWeek===dow && hMin >= toMin(s.startTime) && hMin < toMin(s.endTime)
    );
  }

  cellClick(dow: number, hour: string) {
    this.form.dayOfWeek = dow as any;
    this.form.startTime = hour;
    const [h] = hour.split(':').map(Number);
    this.form.endTime = `${String(h+1).padStart(2,'0')}:00`;
    this.showModal.set(true);
  }

  openModal() { this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }

  save() {
    try {
      this.avSvc.add({ ...this.form, dayOfWeek: Number(this.form.dayOfWeek) as any });
      this.closeModal();
    } catch(e: any) {
      this.error.set(e.message);
      setTimeout(() => this.error.set(''), 4000);
      this.closeModal();
    }
  }
}
