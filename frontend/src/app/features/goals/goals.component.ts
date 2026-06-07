import { Component, inject, signal, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MockDataService } from '../../core/services/mock-data.service';
import { Goal } from '../../core/models/stats.model';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
<section class="page">

  <!-- ── Header ── -->
  <header class="page-head">
    <div>
      <p class="eyebrow">Semaine en cours</p>
      <h2>Achievement Forge</h2>
    </div>
    <button class="btn-accent" (click)="openCreate()">
      <span class="plus">+</span> Nouvel objectif
    </button>
  </header>

  <!-- ── Summary podium ── -->
  <div class="podium">
    <div class="pod pod--green">
      <div class="pod-icon">🏆</div>
      <strong class="pod-val">{{ completedCount }}</strong>
      <span class="pod-label">Atteints</span>
    </div>
    <div class="pod pod--yellow pod--tall">
      <div class="pod-icon">⚡</div>
      <strong class="pod-val">{{ totalAchieved }}h</strong>
      <span class="pod-label">Heures réalisées</span>
    </div>
    <div class="pod pod--blue">
      <div class="pod-icon">🎯</div>
      <strong class="pod-val">{{ inProgressCount }}</strong>
      <span class="pod-label">En cours</span>
    </div>
    <div class="pod pod--red">
      <div class="pod-icon">⚠️</div>
      <strong class="pod-val">{{ missedCount }}</strong>
      <span class="pod-label">Manqués</span>
    </div>
  </div>

  <!-- ── Goals list ── -->
  <div class="goals-list">
    <article class="forge-card" *ngFor="let g of goals; let i = index"
             [class.forge-done]="g.status === 'COMPLETED'"
             [class.forge-missed]="g.status === 'MISSED'"
             [style.--gi]="i">

      <!-- Shine overlay for completed -->
      <div class="shine" *ngIf="g.status === 'COMPLETED'"></div>

      <!-- Left accent -->
      <div class="card-accent" [class.acc-done]="g.status==='COMPLETED'" [class.acc-miss]="g.status==='MISSED'"></div>

      <div class="card-body">
        <div class="card-top">
          <div class="card-info">
            <h3>{{ g.title }}</h3>
            <span class="week-chip">Sem. {{ g.weekStart | date:'d MMM':'':'fr' }}</span>
          </div>
          <div class="status-emblem" [class.em-done]="g.status==='COMPLETED'" [class.em-miss]="g.status==='MISSED'">
            <span *ngIf="g.status==='COMPLETED'">✓</span>
            <span *ngIf="g.status==='MISSED'">✗</span>
            <span *ngIf="g.status==='IN_PROGRESS'">{{ pct(g) }}%</span>
          </div>
        </div>

        <!-- Liquid progress bar -->
        <div class="liquid-wrap">
          <div class="liquid-track">
            <div class="liquid-fill"
                 [class.liq-done]="g.status==='COMPLETED'"
                 [class.liq-miss]="g.status==='MISSED'"
                 [style.width.%]="pct(g)"
                 [style.--pct]="pct(g)">
              <div class="liquid-shine"></div>
              <div class="liquid-bubbles">
                <span class="bubble" *ngFor="let b of [1,2,3]" [style.--bi]="b"></span>
              </div>
            </div>
          </div>
          <div class="hours-label">
            <span class="achieved">{{ g.actualHours }}h</span>
            <span class="sep">/</span>
            <span class="target">{{ g.targetHours }}h</span>
          </div>
        </div>

        <!-- Confetti burst for 100% -->
        <div class="confetti-row" *ngIf="g.status === 'COMPLETED'">
          <span class="cf" *ngFor="let c of confettiItems" [style.--ci]="c.i" [style.--cc]="c.color" [style.--cx]="c.x">●</span>
        </div>

        <div class="card-footer">
          <button class="del-btn" (click)="deleteGoal(g.id)">Supprimer</button>
        </div>
      </div>
    </article>

    <div class="empty-forge" *ngIf="goals.length === 0">
      <div class="empty-icon">🔨</div>
      <p class="muted">Aucun objectif cette semaine. Forgez-en un !</p>
    </div>
  </div>

  <!-- ── MODAL ── -->
  <div class="overlay" *ngIf="showModal()" (click)="closeModal()">
    <div class="modal" (click)="$event.stopPropagation()">
      <div class="modal-head">
        <h3>Nouvel objectif</h3>
        <button class="close-btn" (click)="closeModal()">✕</button>
      </div>
      <div class="form-body">
        <div class="field"><label>Titre *</label><input [(ngModel)]="form.title" placeholder="ex : Finir cours ML"/></div>
        <div class="field-row">
          <div class="field"><label>Heures cibles</label><input type="number" [(ngModel)]="form.targetHours" min="0.5" step="0.5"/></div>
          <div class="field"><label>Heures réalisées</label><input type="number" [(ngModel)]="form.actualHours" min="0" step="0.5"/></div>
        </div>
        <div class="field"><label>Début de semaine</label><input type="date" [(ngModel)]="form.weekStart"/></div>
      </div>
      <div class="modal-actions">
        <button class="btn-ghost" (click)="closeModal()">Annuler</button>
        <button class="btn-accent" (click)="save()" [disabled]="!form.title.trim()">Créer</button>
      </div>
    </div>
  </div>

</section>
  `,
  styles: [`
    :host { display:block; padding:0 32px 48px; color:#1A1A1A; font-family:'Plus Jakarta Sans',sans-serif; }

    .page-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:24px; flex-wrap:wrap; gap:14px; }
    .eyebrow { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:#aaa; margin:0 0 4px; }
    h2 { font-size:2rem; font-weight:900; letter-spacing:-.04em; margin:0; }
    .muted { color:#7A7A7A; }
    .btn-accent { display:inline-flex; align-items:center; gap:8px; background:#1A1A1A; color:#F5C518; padding:11px 22px; border-radius:999px; font-weight:700; font-size:14px; border:none; cursor:pointer; transition:all 220ms cubic-bezier(.34,1.56,.64,1); }
    .btn-accent:hover { transform:translateY(-2px); box-shadow:0 10px 28px rgba(0,0,0,.18); }
    .btn-accent:disabled { opacity:.5; cursor:not-allowed; transform:none; }
    .plus { width:22px;height:22px;border-radius:50%;background:#F5C518;color:#1A1A1A;display:inline-flex;align-items:center;justify-content:center;font-size:15px;font-weight:900; }

    /* Podium */
    .podium { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-bottom:28px; align-items:end; }
    @media(max-width:900px){ .podium{grid-template-columns:repeat(2,1fr)} }
    .pod {
      border-radius:20px; padding:22px 18px; text-align:center;
      border:1px solid rgba(0,0,0,.06);
      animation:pod-rise 500ms cubic-bezier(.22,1,.36,1) both;
    }
    .pod--tall { padding-top:32px; padding-bottom:32px; }
    @keyframes pod-rise { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    .pod-icon { font-size:1.6rem; margin-bottom:8px; }
    .pod-val   { display:block; font-size:1.8rem; font-weight:900; letter-spacing:-.04em; }
    .pod-label { font-size:.75rem; font-weight:600; opacity:.7; }
    .pod--yellow { background:#1A1A1A; color:#F5C518; }
    .pod--green  { background:#EDFAF4; color:#1a7a4a; }
    .pod--blue   { background:#EEF2FF; color:#3951D3; }
    .pod--red    { background:#FFF0EE; color:#c0392b; }

    /* Goals list */
    .goals-list { display:flex; flex-direction:column; gap:14px; }

    .forge-card {
      position:relative; overflow:hidden;
      display:grid; grid-template-columns:5px 1fr;
      background:#fff; border-radius:22px;
      border:1px solid rgba(0,0,0,.06);
      box-shadow:0 2px 8px rgba(0,0,0,.04);
      animation:forge-enter 450ms cubic-bezier(.22,1,.36,1) both;
      animation-delay:calc(var(--gi,0) * 60ms);
      transition:transform 250ms cubic-bezier(.34,1.56,.64,1), box-shadow 250ms;
    }
    @keyframes forge-enter { from{opacity:0;transform:translateX(-16px)} to{opacity:1;transform:translateX(0)} }
    .forge-card:hover { transform:translateX(5px); box-shadow:0 8px 30px rgba(0,0,0,.09); }
    .forge-done { background:linear-gradient(135deg,#fff,#f0fdf6); border-color:rgba(91,212,154,.25); }
    .forge-missed { opacity:.65; }

    /* Shine overlay */
    .shine {
      position:absolute; inset:0; pointer-events:none; z-index:1;
      background:linear-gradient(105deg,transparent 40%,rgba(255,255,255,.6) 50%,transparent 60%);
      animation:shine-sweep 3s ease-in-out infinite 1s;
    }
    @keyframes shine-sweep { 0%,100%{transform:translateX(-100%)} 50%{transform:translateX(200%)} }

    .card-accent { width:5px; border-radius:22px 0 0 22px; background:#e8dfd5; }
    .acc-done { background:linear-gradient(to bottom,#5BD49A,#2da96a); }
    .acc-miss { background:#FFB0A0; }

    .card-body { padding:20px 22px; position:relative; z-index:2; }
    .card-top { display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:16px; }
    .card-info h3 { font-size:1rem; font-weight:800; margin:0 0 4px; }
    .week-chip { font-size:.72rem; color:#aaa; font-weight:600; }

    /* Status emblem */
    .status-emblem {
      width:44px; height:44px; border-radius:50%; flex-shrink:0;
      display:grid; place-items:center;
      font-size:1rem; font-weight:900;
      background:#f5f1ea; color:#aaa;
      border:2px solid transparent;
      transition:all 300ms;
    }
    .em-done { background:#EDFAF4; color:#2da96a; border-color:#5BD49A; }
    .em-miss { background:#FFF0EE; color:#c0392b; border-color:#FFB0A0; }

    /* Liquid progress */
    .liquid-wrap { margin-bottom:12px; }
    .liquid-track { height:20px; background:#f5f1ea; border-radius:10px; overflow:hidden; margin-bottom:6px; }
    .liquid-fill {
      height:100%; border-radius:10px; position:relative; overflow:hidden;
      background:linear-gradient(90deg, #F5C518, #FFB547);
      transition:width 1.2s cubic-bezier(.16,1,.3,1);
      min-width:0;
    }
    .liq-done { background:linear-gradient(90deg,#5BD49A,#2da96a); }
    .liq-miss  { background:linear-gradient(90deg,#FFB0A0,#FF8E7E); }
    .liquid-shine {
      position:absolute; top:0; left:-50%; width:40%; height:100%;
      background:linear-gradient(90deg,transparent,rgba(255,255,255,.4),transparent);
      animation:liq-shimmer 2s ease-in-out infinite;
    }
    @keyframes liq-shimmer { 0%{left:-50%} 100%{left:150%} }
    .liquid-bubbles { position:absolute; bottom:2px; left:8px; display:flex; gap:4px; }
    .bubble { font-size:8px; color:rgba(255,255,255,.6); animation:bubble-rise 2s ease-in-out infinite; animation-delay:calc(var(--bi,1) * 0.4s); }
    @keyframes bubble-rise { 0%{transform:translateY(0);opacity:.6} 100%{transform:translateY(-12px);opacity:0} }
    .hours-label { display:flex; align-items:center; gap:4px; font-size:.82rem; }
    .achieved { font-weight:800; font-size:1rem; }
    .sep { color:#ddd; }
    .target { color:#aaa; }

    /* Confetti */
    .confetti-row { display:flex; gap:4px; margin-bottom:8px; overflow:hidden; height:18px; }
    .cf {
      font-size:10px; color:var(--cc);
      animation:cf-burst 600ms cubic-bezier(.22,1,.36,1) both;
      animation-delay:calc(var(--ci,0) * 40ms);
    }
    @keyframes cf-burst { from{transform:translateY(20px) rotate(0deg);opacity:0} to{transform:translateY(-4px) rotate(180deg);opacity:1} }

    .card-footer { display:flex; justify-content:flex-end; }
    .del-btn { background:none; border:none; font-size:12px; color:#ccc; cursor:pointer; padding:4px 8px; border-radius:8px; transition:all 160ms; }
    .del-btn:hover { background:#FFF0EE; color:#FF6B5B; }

    .empty-forge { background:#fff; border-radius:22px; padding:48px; text-align:center; border:1px dashed rgba(0,0,0,.1); }
    .empty-icon { font-size:2.5rem; margin-bottom:10px; }

    /* Modal */
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,.35);backdrop-filter:blur(6px);display:grid;place-items:center;z-index:100;animation:fo 200ms ease both}
    @keyframes fo{from{opacity:0}to{opacity:1}}
    .modal{background:#fff;border-radius:28px;width:min(480px,94vw);box-shadow:0 40px 100px rgba(0,0,0,.22);animation:su 260ms cubic-bezier(.22,1,.36,1) both;overflow:hidden}
    @keyframes su{from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1}}
    .modal-head{display:flex;justify-content:space-between;align-items:center;padding:20px 24px 16px;border-bottom:1px solid rgba(0,0,0,.07)}
    .modal-head h3{font-size:17px;font-weight:800;margin:0}
    .close-btn{background:none;border:none;font-size:18px;cursor:pointer;color:#999;border-radius:8px;padding:4px}
    .close-btn:hover{background:#f5f1ea;color:#1A1A1A}
    .form-body{padding:20px 24px;display:flex;flex-direction:column;gap:14px}
    .field{display:flex;flex-direction:column;gap:6px}
    .field label{font-size:.75rem;font-weight:700;color:#777;text-transform:uppercase;letter-spacing:.06em}
    .field input{padding:11px 14px;border-radius:12px;border:1.5px solid #e8dfd5;background:#faf8f5;font-size:.93rem;color:#1A1A1A;outline:none;transition:border 200ms,box-shadow 200ms}
    .field input:focus{border-color:#F5C518;box-shadow:0 0 0 4px rgba(245,197,24,.12);background:#fff}
    .field-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .modal-actions{display:flex;justify-content:flex-end;gap:10px;padding:14px 24px 20px;border-top:1px solid rgba(0,0,0,.07)}
    .btn-ghost{padding:10px 20px;border-radius:999px;font-weight:600;font-size:14px;background:#f5f1ea;border:none;cursor:pointer;color:#1A1A1A}
    .btn-ghost:hover{background:#e8dfd5}
  `]
})
export class GoalsComponent implements OnInit {
  private mock = inject(MockDataService);
  goals: Goal[] = [];
  showModal = signal(false);
  form = { title:'', targetHours:5, actualHours:0, weekStart: new Date().toISOString().slice(0,10) };

  confettiItems = Array.from({length:12}, (_,i) => ({
    i, x: Math.random()*80+10,
    color: ['#F5C518','#5BD49A','#FF6B5B','#6C8EEF','#FFB547'][i%5]
  }));

  ngOnInit() { this.goals = this.mock.goals; }

  pct(g: Goal) { return Math.min(100, Math.round(((g.actualHours??0) / g.targetHours)*100)); }
  get completedCount()  { return this.goals.filter(g => g.status==='COMPLETED').length; }
  get inProgressCount() { return this.goals.filter(g => g.status==='IN_PROGRESS').length; }
  get missedCount()     { return this.goals.filter(g => g.status==='MISSED').length; }
  get totalAchieved()   { return this.goals.reduce((s,g) => s+(g.actualHours??0),0); }

  openCreate() { this.showModal.set(true); }
  closeModal() { this.showModal.set(false); }
  save() {
    if (!this.form.title.trim()) return;
    const pct = this.form.actualHours >= this.form.targetHours;
    this.goals = [...this.goals, {
      id:'g'+Date.now(), title:this.form.title, weekStart:this.form.weekStart, weekEnd:this.form.weekStart,
      targetHours:this.form.targetHours, actualHours:this.form.actualHours,
      status: pct ? 'COMPLETED' : 'IN_PROGRESS'
    } as Goal];
    this.closeModal();
  }
  deleteGoal(id: string) { this.goals = this.goals.filter(g => g.id !== id); }
}
