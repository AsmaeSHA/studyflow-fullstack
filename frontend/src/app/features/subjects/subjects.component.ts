import { Component, inject, signal, computed, AfterViewInit, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SubjectService } from '../../core/services/subject.service';
import { Subject } from '../../core/models/models';

const COLORS = ['#6C8EEF','#4CAF82','#F0A030','#9B72EF','#3DC9B0','#F5C518','#FF6B5B','#E67E8A','#5BD49A','#B794F4'];

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<section class="page">

  <!-- ── Header ── -->
  <header class="page-head">
    <div class="head-text">
      <p class="eyebrow">Mes matières</p>
      <h2>Chromatic Lab</h2>
    </div>
    <div class="head-meta">
      <div class="meta-pill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
        <strong>{{ totalGoalHours }}h</strong>/sem
      </div>
      <div class="meta-pill meta-pill--yellow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <strong>{{ avgCompletion }}%</strong> moy.
      </div>
      <button class="btn-accent" (click)="openCreate()">
        <span class="plus">+</span> Nouvelle matière
      </button>
    </div>
  </header>

  <!-- ── Cards grid ── -->
  <div class="lab-grid">
    <article class="lab-card" *ngFor="let s of subjectsSorted(); let i = index"
             [style.--hue]="s.color"
             [style.--i]="i"
             [style.--cr]="(s.completionRate || 0)"
             [attr.data-color]="s.color">

      <!-- Colored top bar -->
      <div class="card-beam" [style.background]="s.color"></div>

      <!-- Glow blob -->
      <div class="card-glow" [style.background]="s.color"></div>

      <!-- Arc ring -->
      <div class="arc-wrap">
        <svg class="arc-svg" viewBox="0 0 80 80">
          <circle class="arc-track" cx="40" cy="40" r="32"/>
          <circle class="arc-fill"  cx="40" cy="40" r="32"
                  [style.stroke]="s.color"
                  [style.stroke-dashoffset]="arcOffset(s.completionRate || 0)"/>
        </svg>
        <div class="arc-inner">
          <strong>{{ s.completionRate || 0 }}%</strong>
          <span>complété</span>
        </div>
      </div>

      <!-- Content -->
      <div class="card-content">
        <div class="card-top-row">
          <h3>{{ s.name }}</h3>
          <div class="action-cluster">
            <button class="ic-btn" (click)="openEdit(s)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="ic-btn ic-btn--del" (click)="deleteSubject(s.id)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M9 6V4h6v2"/>
              </svg>
            </button>
          </div>
        </div>

        <p class="desc" *ngIf="s.description">{{ s.description }}</p>

        <!-- Priority stars -->
        <div class="priority-row">
          <span class="pr-label">Priorité</span>
          <div class="stars">
            <span *ngFor="let star of [1,2,3,4,5]"
                  class="star" [class.lit]="star <= s.priority"
                  [style.color]="star <= s.priority ? s.color : '#e8dfd5'"
                  [style.--si]="star">★</span>
          </div>
        </div>

        <!-- Footer chips -->
        <div class="card-chips">
          <span class="chip">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            {{ s.weeklyGoalHours }}h / sem
          </span>
          <span class="chip">⏱ {{ s.maxSessionDuration }}min max</span>
        </div>
      </div>
    </article>

    <div class="empty-card" *ngIf="subjects().length === 0">
      <p class="muted">Aucune matière. Créez-en une pour commencer.</p>
    </div>
  </div>

  <!-- ── MODAL ── -->
  <div class="overlay" *ngIf="showModal()" (click)="closeModal()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-head">
        <h3>{{ editId() ? 'Modifier' : 'Nouvelle matière' }}</h3>
        <button class="close-btn" (click)="closeModal()">✕</button>
      </div>
      <div class="form-body">
        <div class="field"><label>Nom *</label>
          <input [(ngModel)]="form.name" placeholder="ex : Mathématiques"/>
        </div>
        <div class="field"><label>Description</label>
          <input [(ngModel)]="form.description" placeholder="ex : Analyse, algèbre..."/>
        </div>
        <div class="field-row">
          <div class="field"><label>Priorité</label>
            <select [(ngModel)]="form.priority">
              <option [value]="1">1 — Basse</option><option [value]="2">2</option>
              <option [value]="3">3 — Moyenne</option><option [value]="4">4</option>
              <option [value]="5">5 — Haute</option>
            </select>
          </div>
          <div class="field"><label>Objectif (h/sem)</label>
            <input type="number" [(ngModel)]="form.weeklyGoalHours" min="0.5" max="40" step="0.5"/>
          </div>
        </div>
        <div class="field"><label>Durée max / session (min)</label>
          <input type="number" [(ngModel)]="form.maxSessionDuration" min="15" max="240" step="15"/>
        </div>
        <div class="field"><label>Couleur</label>
          <div class="color-picker">
            <div *ngFor="let c of colors" class="cp-dot"
                 [style.background]="c" [class.sel]="form.color === c"
                 (click)="form.color = c"></div>
          </div>
        </div>
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" (click)="closeModal()">Annuler</button>
        <button class="btn-accent" (click)="save()" [disabled]="!form.name.trim()">
          {{ editId() ? 'Enregistrer' : 'Créer' }}
        </button>
      </div>
    </div>
  </div>
</section>
  `,
  styles: [`
    :host {
      display: block;
      padding: 0 32px 48px;
      color: #1A1A1A;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    /* ── Header ── */
    .page-head {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-bottom: 28px; flex-wrap: wrap; gap: 16px;
    }
    .eyebrow {
      font-size: .72rem; font-weight: 700; text-transform: uppercase;
      letter-spacing: .12em; color: #aaa; margin: 0 0 4px;
    }
    h2 { font-size: 2rem; font-weight: 900; letter-spacing: -.04em; margin: 0; }
    .head-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .meta-pill {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 8px 16px; border-radius: 999px;
      background: #fff; border: 1px solid rgba(0,0,0,.08);
      font-size: .82rem; color: #555;
    }
    .meta-pill svg { width: 13px; height: 13px; }
    .meta-pill--yellow { background: #FFFBDD; border-color: rgba(245,197,24,.3); color: #8B6E00; }
    .btn-accent {
      display: inline-flex; align-items: center; gap: 8px;
      background: #1A1A1A; color: #F5C518;
      padding: 11px 22px; border-radius: 999px;
      font-weight: 700; font-size: 14px; border: none; cursor: pointer;
      transition: all 220ms cubic-bezier(.34,1.56,.64,1);
    }
    .btn-accent:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 10px 30px rgba(0,0,0,.18); }
    .btn-accent:disabled { opacity: .5; cursor: not-allowed; transform: none; }
    .plus {
      width: 22px; height: 22px; border-radius: 50%;
      background: #F5C518; color: #1A1A1A;
      display: inline-flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 900;
    }

    /* ── Lab Grid ── */
    .lab-grid {
      display: grid; gap: 22px;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    }

    /* ── Lab Card ── */
    .lab-card {
      position: relative; overflow: hidden;
      background: #fff; border-radius: 28px;
      border: 1px solid rgba(0,0,0,.06);
      padding: 0;
      animation: card-enter 520ms cubic-bezier(.22,1,.36,1) both;
      animation-delay: calc(var(--i, 0) * 70ms);
      transition: transform 300ms cubic-bezier(.34,1.56,.64,1), box-shadow 300ms ease;
    }
    @keyframes card-enter {
      from { opacity: 0; transform: translateY(24px) scale(.97); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .lab-card:hover {
      transform: translateY(-6px) scale(1.01);
      box-shadow: 0 20px 50px rgba(0,0,0,.1), 0 0 0 1px rgba(0,0,0,.04);
    }

    /* Colored beam top */
    .card-beam {
      height: 5px; width: 100%;
      transition: height 300ms ease;
    }
    .lab-card:hover .card-beam { height: 7px; }

    /* Glow blob */
    .card-glow {
      position: absolute; top: -60px; right: -60px;
      width: 160px; height: 160px; border-radius: 50%;
      opacity: 0; filter: blur(40px);
      transition: opacity 400ms ease;
      pointer-events: none; z-index: 0;
    }
    .lab-card:hover .card-glow { opacity: .18; }

    /* Arc ring */
    .arc-wrap {
      position: absolute; top: 16px; right: 16px;
      width: 72px; height: 72px;
      z-index: 2;
    }
    .arc-svg {
      width: 100%; height: 100%;
      transform: rotate(-90deg);
    }
    .arc-track {
      fill: none; stroke: #f5f1ea; stroke-width: 6;
    }
    .arc-fill {
      fill: none; stroke-width: 6; stroke-linecap: round;
      stroke-dasharray: 201; /* 2π * 32 ≈ 201 */
      transition: stroke-dashoffset 1s cubic-bezier(.16,1,.3,1);
    }
    .arc-inner {
      position: absolute; inset: 0;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
    }
    .arc-inner strong { font-size: .78rem; font-weight: 800; color: #1A1A1A; line-height: 1; }
    .arc-inner span   { font-size: .55rem; color: #aaa; font-weight: 500; }

    /* Card content */
    .card-content {
      padding: 12px 20px 20px;
      position: relative; z-index: 1;
    }
    .card-top-row {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 8px; margin-bottom: 6px; padding-right: 76px; /* space for arc */
    }
    h3 { font-size: 1.05rem; font-weight: 800; margin: 0; letter-spacing: -.02em; }
    .desc { font-size: .78rem; color: #888; margin: 0 0 10px; line-height: 1.5; }

    /* Action buttons */
    .action-cluster { display: flex; gap: 5px; opacity: 0; transition: opacity 200ms; }
    .lab-card:hover .action-cluster { opacity: 1; }
    .ic-btn {
      width: 28px; height: 28px; border-radius: 8px; border: none;
      background: #f5f1ea; display: grid; place-items: center; cursor: pointer;
      transition: all 180ms;
    }
    .ic-btn svg { width: 12px; height: 12px; }
    .ic-btn:hover { background: #1A1A1A; }
    .ic-btn:hover svg { stroke: #fff; }
    .ic-btn--del:hover { background: #FF6B5B; }

    /* Priority stars */
    .priority-row { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
    .pr-label { font-size: .7rem; font-weight: 700; color: #bbb; text-transform: uppercase; letter-spacing: .06em; }
    .stars { display: flex; gap: 2px; }
    .star {
      font-size: 14px; cursor: default;
      transition: transform 300ms cubic-bezier(.34,1.56,.64,1);
      animation: star-pop 400ms cubic-bezier(.34,1.56,.64,1) both;
      animation-delay: calc(var(--si, 1) * 60ms + 300ms);
    }
    @keyframes star-pop {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }
    .star.lit:hover { transform: scale(1.3) rotate(10deg); }

    /* Chips */
    .card-chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 10px; border-radius: 999px;
      background: #f5f1ea; font-size: .72rem; font-weight: 600; color: #666;
    }
    .chip svg { width: 11px; height: 11px; }

    /* Empty */
    .empty-card {
      background: #fff; border-radius: 28px; padding: 48px; text-align: center;
      border: 1px dashed rgba(0,0,0,.1); grid-column: 1/-1;
    }
    .muted { color: #7A7A7A; }

    /* ── Modal ── */
    .overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,.35); backdrop-filter: blur(6px);
      display: grid; place-items: center; z-index: 100;
      animation: fo 200ms ease both;
    }
    @keyframes fo { from{opacity:0} to{opacity:1} }
    .modal {
      background: #fff; border-radius: 28px;
      width: min(520px, 94vw); box-shadow: 0 40px 100px rgba(0,0,0,.22);
      animation: su 260ms cubic-bezier(.22,1,.36,1) both; overflow: hidden;
    }
    @keyframes su { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
    .modal-head { display:flex; justify-content:space-between; align-items:center; padding:20px 24px 16px; border-bottom:1px solid rgba(0,0,0,.07); }
    .modal-head h3 { font-size:17px; font-weight:800; margin:0; }
    .close-btn { background:none; border:none; font-size:18px; cursor:pointer; color:#999; border-radius:8px; padding:4px; }
    .close-btn:hover { background:#f5f1ea; color:#1A1A1A; }
    .form-body { padding:20px 24px; display:flex; flex-direction:column; gap:14px; }
    .field { display:flex; flex-direction:column; gap:6px; }
    .field label { font-size:.75rem; font-weight:700; color:#777; text-transform:uppercase; letter-spacing:.06em; }
    .field input, .field select { padding:11px 14px; border-radius:12px; border:1.5px solid #e8dfd5; background:#faf8f5; font-size:.93rem; color:#1A1A1A; outline:none; transition:border 200ms, box-shadow 200ms; }
    .field input:focus, .field select:focus { border-color:#F5C518; box-shadow:0 0 0 4px rgba(245,197,24,.12); background:#fff; }
    .field-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .color-picker { display:flex; flex-wrap:wrap; gap:8px; }
    .cp-dot { width:30px; height:30px; border-radius:50%; cursor:pointer; border:3px solid transparent; transition:transform 180ms,box-shadow 180ms; }
    .cp-dot:hover { transform:scale(1.15); }
    .cp-dot.sel { border-color:#1A1A1A; transform:scale(1.18); box-shadow:0 0 0 2px #fff inset; }
    .modal-actions { display:flex; justify-content:flex-end; gap:10px; padding:14px 24px 20px; border-top:1px solid rgba(0,0,0,.07); }
    .btn-ghost { padding:10px 20px; border-radius:999px; font-weight:600; font-size:14px; background:#f5f1ea; border:none; cursor:pointer; color:#1A1A1A; }
    .btn-ghost:hover { background:#e8dfd5; }
  `]
})
export class SubjectsComponent {
  private svc = inject(SubjectService);

  constructor() {
    // GET /api/subjects au montage → remplit le signal `subjects`.
    this.svc.list().subscribe();
  }

  subjects       = this.svc.subjects;
  subjectsSorted = computed(() => [...this.subjects()].sort((a,b) => b.priority - a.priority));
  colors         = COLORS;
  showModal      = signal(false);
  editId         = signal<string | null>(null);
  form           = this.emptyForm();

  get totalGoalHours() { return this.subjects().reduce((s,x) => s + (x.weeklyGoalHours||0), 0); }
  get avgCompletion()  { const s = this.subjects(); return s.length ? Math.round(s.reduce((a,x) => a+(x.completionRate||0),0)/s.length) : 0; }

  /** stroke-dashoffset for arc: 201 = 2π*32. 0% → 201 (empty), 100% → 0 (full) */
  arcOffset(pct: number): number { return 201 - (201 * Math.min(100, pct) / 100); }

  openCreate() { this.form = this.emptyForm(); this.editId.set(null); this.showModal.set(true); }
  openEdit(s: Subject) {
    this.form = { name:s.name, description:s.description||'', color:s.color,
                  priority:s.priority, weeklyGoalHours:s.weeklyGoalHours, maxSessionDuration:s.maxSessionDuration };
    this.editId.set(s.id); this.showModal.set(true);
  }
  closeModal() { this.showModal.set(false); }
  save() {
    if (!this.form.name.trim()) return;
    const p = { name:this.form.name.trim(), description:this.form.description, color:this.form.color,
                priority:Number(this.form.priority) as 1|2|3|4|5,
                weeklyGoalHours:Number(this.form.weeklyGoalHours),
                maxSessionDuration:Number(this.form.maxSessionDuration) };
    this.editId() ? this.svc.update(this.editId()!, p).subscribe() : this.svc.add(p).subscribe();
    this.closeModal();
  }
  deleteSubject(id: string) { if (confirm('Supprimer ?')) this.svc.delete(id).subscribe(); }
  private emptyForm() { return { name:'', description:'', color:COLORS[0], priority:3 as 1|2|3|4|5, weeklyGoalHours:5, maxSessionDuration:60 }; }
}
