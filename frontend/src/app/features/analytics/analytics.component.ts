import { Component, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

type Period = 'week' | 'month' | 'all';

interface SubjectStat { name: string; color: string; planned: number; done: number; }
interface DayStat     { day: string; planned: number; done: number; }
interface MonthStat   { month: string; hours: number; }

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  template: `
<!-- ══════════════════ PULSE BOARD ══════════════════ -->
<div class="pulse-root">

  <!-- Floating blobs -->
  <div class="blob blob--1" aria-hidden="true"></div>
  <div class="blob blob--2" aria-hidden="true"></div>

  <!-- ── HERO HEADER ── -->
  <header class="pb-hero">
    <div class="pb-hero-left">
      <div class="hero-badge">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
      </div>
      <div>
        <h2 class="hero-title">Tableau de bord analytique</h2>
        <p class="hero-sub">Visualisez votre progression et votre productivité</p>
      </div>
    </div>
    <!-- Period tabs -->
    <div class="period-tabs">
      <button class="ptab" [class.on]="period() === 'week'"  (click)="period.set('week')">Semaine</button>
      <button class="ptab" [class.on]="period() === 'month'" (click)="period.set('month')">Mois</button>
      <button class="ptab" [class.on]="period() === 'all'"   (click)="period.set('all')">Tout</button>
    </div>
  </header>

  <!-- ── KPI STRIP ── -->
  <div class="kpi-strip">

    <div class="kpi" [style.--ki]="0">
      <div class="kpi-icon" style="background:rgba(245,197,24,.12);color:#8b6e00">⏱</div>
      <div class="kpi-body">
        <div class="kpi-val">{{ kpis().totalHours }}<span class="kpi-unit">h</span></div>
        <div class="kpi-lbl">Heures totales</div>
      </div>
      <div class="kpi-delta up">↑ {{ kpis().hoursGrowth }}%</div>
      <div class="kpi-glow" style="background:#f5c518"></div>
    </div>

    <div class="kpi" [style.--ki]="1">
      <div class="kpi-icon" style="background:rgba(91,212,154,.12);color:#1a7a4a">✓</div>
      <div class="kpi-body">
        <div class="kpi-val">{{ kpis().completed }}</div>
        <div class="kpi-lbl">Sessions terminées</div>
      </div>
      <div class="kpi-delta up">↑ {{ kpis().completedGrowth }}%</div>
      <div class="kpi-glow" style="background:#5bd49a"></div>
    </div>

    <!-- Completion ring KPI -->
    <div class="kpi kpi--ring" [style.--ki]="2">
      <div class="kpi-ring-wrap">
        <svg viewBox="0 0 56 56" class="ring-svg">
          <circle cx="28" cy="28" r="22" stroke="rgba(0,0,0,.06)" stroke-width="5" fill="none"/>
          <circle cx="28" cy="28" r="22" stroke="#f5c518" stroke-width="5" fill="none"
                  stroke-linecap="round"
                  [attr.stroke-dasharray]="138"
                  [attr.stroke-dashoffset]="138 - (138 * kpis().completionRate / 100)"
                  class="ring-fill"
                  transform="rotate(-90 28 28)"/>
        </svg>
        <div class="ring-val">{{ kpis().completionRate }}%</div>
      </div>
      <div class="kpi-body">
        <div class="kpi-lbl kpi-lbl--lg">Taux de complétion</div>
        <div class="kpi-sub">{{ kpis().completed }} / {{ kpis().planned }} sessions</div>
      </div>
      <div class="kpi-glow" style="background:#f5c518"></div>
    </div>

    <div class="kpi" [style.--ki]="3">
      <div class="kpi-icon" style="background:rgba(255,142,126,.12);color:#c04a3a">⚠</div>
      <div class="kpi-body">
        <div class="kpi-val">{{ kpis().missed }}</div>
        <div class="kpi-lbl">Sessions manquées</div>
      </div>
      <div class="kpi-delta down">↓ {{ kpis().missedDrop }}</div>
      <div class="kpi-glow" style="background:#ff8e7e"></div>
    </div>

  </div>

  <!-- ── ROW 1: Bar Chart + Trend ── -->
  <div class="row-2col">

    <!-- Planned vs Done bars -->
    <div class="chart-card chart-card--wide">
      <div class="chart-head">
        <h3 class="chart-title">Sessions prévues vs réalisées</h3>
        <div class="chart-legend">
          <span class="leg"><span class="leg-dot" style="background:rgba(0,0,0,.12)"></span>Prévu</span>
          <span class="leg"><span class="leg-dot" style="background:var(--yellow)"></span>Réalisé</span>
        </div>
      </div>
      <div class="bar-chart">
        <div class="bar-group" *ngFor="let d of weekData(); let i = index" [style.--bi]="i">
          <div class="bar-col">
            <!-- Planned (ghost) -->
            <div class="bar bar--planned"
                 [style.height]="barPct(d.planned, maxWeek()) + '%'"
                 [title]="'Prévu: ' + d.planned + 'h'">
            </div>
            <!-- Done (solid) -->
            <div class="bar bar--done"
                 [style.height]="barPct(d.done, maxWeek()) + '%'"
                 [title]="'Réalisé: ' + d.done + 'h'">
              <span class="bar-val" *ngIf="d.done > 0">{{ d.done }}h</span>
            </div>
          </div>
          <span class="bar-label">{{ d.day }}</span>
        </div>
      </div>
    </div>

    <!-- Monthly trend SVG polyline -->
    <div class="chart-card">
      <div class="chart-head">
        <h3 class="chart-title">Tendance mensuelle</h3>
      </div>
      <div class="trend-wrap">
        <svg viewBox="0 0 300 160" class="trend-svg" preserveAspectRatio="none">
          <!-- Gradient fill area -->
          <defs>
            <linearGradient id="trend-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stop-color="#f5c518" stop-opacity=".25"/>
              <stop offset="100%" stop-color="#f5c518" stop-opacity="0"/>
            </linearGradient>
          </defs>
          <!-- Fill polygon -->
          <polygon [attr.points]="trendAreaPoints()" fill="url(#trend-grad)"/>
          <!-- Line -->
          <polyline [attr.points]="trendLinePoints()"
                    fill="none" stroke="#f5c518" stroke-width="2.5"
                    stroke-linejoin="round" stroke-linecap="round"
                    class="trend-line"/>
          <!-- Dots -->
          <ng-container *ngFor="let p of trendPoints(); let i = index">
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4"
                    fill="#fff" stroke="#f5c518" stroke-width="2.5"
                    class="trend-dot" [style.animation-delay]="(i * 0.1) + 's'"/>
          </ng-container>
        </svg>
        <!-- X labels -->
        <div class="trend-labels">
          <span *ngFor="let d of monthlyTrend()">{{ d.month }}</span>
        </div>
      </div>
    </div>

  </div>

  <!-- ── ROW 2: Subject progress ── -->
  <div class="chart-card chart-card--full">
    <div class="chart-head">
      <h3 class="chart-title">Progression par matière — Prévu vs Réalisé</h3>
    </div>
    <div class="subject-list">
      <div class="subj-row" *ngFor="let s of subjects(); let i = index" [style.--sri]="i">
        <div class="subj-left">
          <span class="subj-dot" [style.background]="s.color"></span>
          <span class="subj-name">{{ s.name }}</span>
        </div>
        <div class="subj-track">
          <!-- Ghost (planned) -->
          <div class="subj-bar-bg" [style.width]="barPct(s.planned, maxSubj()) + '%'"></div>
          <!-- Fill (done) -->
          <div class="subj-bar-fill" [style.width]="barPct(s.done, maxSubj()) + '%'" [style.background]="s.color">
            <div class="subj-shine"></div>
          </div>
        </div>
        <div class="subj-stats">
          <span class="subj-done" [style.color]="s.color">{{ s.done }}h</span>
          <span class="subj-sep">/</span>
          <span class="subj-planned">{{ s.planned }}h</span>
          <span class="subj-pct" [style.color]="s.color">{{ pct(s.done, s.planned) }}%</span>
        </div>
      </div>
    </div>
  </div>

  <!-- ── ROW 3: Heatmap + Goals ── -->
  <div class="row-2col">

    <!-- Productivity heatmap -->
    <div class="chart-card">
      <div class="chart-head">
        <h3 class="chart-title">Productivité par jour</h3>
      </div>
      <div class="heatmap">
        <div class="hm-cell"
             *ngFor="let d of weekData(); let i = index"
             [style.--hi]="i"
             [style.--intensity]="d.done / maxWeek()"
             [class.hm-zero]="d.done === 0"
             [title]="d.day + ': ' + d.done + 'h réalisées'">
          <span class="hm-day">{{ d.day }}</span>
          <span class="hm-hours">{{ d.done > 0 ? d.done + "h" : "—" }}</span>
          <!-- Intensity fill -->
          <div class="hm-fill" [style.opacity]="d.done / maxWeek()"></div>
        </div>
      </div>
    </div>

    <!-- Circular goal rings per subject -->
    <div class="chart-card">
      <div class="chart-head">
        <h3 class="chart-title">Objectifs hebdomadaires</h3>
      </div>
      <div class="goals-grid">
        <div class="goal-item" *ngFor="let s of subjects(); let i = index" [style.--gi]="i">
          <div class="goal-ring-wrap">
            <svg viewBox="0 0 44 44" class="goal-svg">
              <circle cx="22" cy="22" r="17" stroke="rgba(0,0,0,.06)" stroke-width="4" fill="none"/>
              <circle cx="22" cy="22" r="17" [attr.stroke]="s.color" stroke-width="4" fill="none"
                      stroke-linecap="round"
                      [attr.stroke-dasharray]="107"
                      [attr.stroke-dashoffset]="107 - (107 * pct(s.done, s.planned) / 100)"
                      class="goal-ring-fill"
                      transform="rotate(-90 22 22)"/>
            </svg>
            <span class="goal-pct" [style.color]="s.color">{{ pct(s.done, s.planned) }}</span>
          </div>
          <div class="goal-info">
            <span class="goal-name">{{ s.name }}</span>
            <span class="goal-status">
              {{ pct(s.done, s.planned) >= 100 ? "🏆 Atteint" : pct(s.done, s.planned) >= 70 ? "🔥 En bonne voie" : "📈 À compléter" }}
            </span>
          </div>
        </div>
      </div>
    </div>

  </div>
</div><!-- /pulse-root -->
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral:  #ff8e7e;
      --dark:   #1a1a1a;
      --cream:  #ede8df;
      --white:  #ffffff;
      --border: rgba(0,0,0,.07);
      --shadow: 0 6px 24px rgba(0,0,0,.06);
      display: block;
      padding: 0 0 56px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      position: relative;
    }

    /* ── BLOBS ─────────────────────────────── */
    .blob {
      position: fixed;
      border-radius: 50%;
      filter: blur(90px);
      pointer-events: none; z-index: 0;
    }
    .blob--1 {
      width: 500px; height: 500px;
      top: -80px; right: -100px;
      background: radial-gradient(circle, rgba(245,197,24,.09), transparent 70%);
      animation: blob-drift1 14s ease-in-out infinite alternate;
    }
    .blob--2 {
      width: 360px; height: 360px;
      bottom: 100px; left: -60px;
      background: radial-gradient(circle, rgba(255,142,126,.07), transparent 70%);
      animation: blob-drift2 18s ease-in-out infinite alternate;
    }
    @keyframes blob-drift1 { from{transform:translate(0,0)} to{transform:translate(-30px,40px)} }
    @keyframes blob-drift2 { from{transform:translate(0,0)} to{transform:translate(30px,-30px)} }

    /* ── HERO HEADER ───────────────────────── */
    .pb-hero {
      position: relative; z-index: 2;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px;
      padding: 24px 0 20px;
      animation: hero-in 500ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes hero-in { from{opacity:0;transform:translateY(-12px)} to{opacity:1;transform:translateY(0)} }
    .pb-hero-left { display:flex; align-items:center; gap:14px; }
    .hero-badge {
      width:48px; height:48px; border-radius:16px;
      background:var(--dark); color:var(--yellow);
      display:grid; place-items:center; flex-shrink:0;
    }
    .hero-badge svg { width:24px; height:24px; }
    .hero-title { margin:0; font-size:1.55rem; font-weight:800; color:var(--dark); }
    .hero-sub   { margin:0; font-size:.82rem; color:#999; }

    /* Period tabs */
    .period-tabs {
      display:flex; gap:3px;
      background:rgba(255,255,255,.8);
      border-radius:999px;
      border:1px solid var(--border);
      padding:3px;
    }
    .ptab {
      padding:7px 20px; border-radius:999px; border:none;
      background:transparent; color:#888;
      font-size:.83rem; font-weight:600;
      cursor:pointer; transition:all 200ms ease;
    }
    .ptab.on {
      background:var(--dark); color:#fff;
      box-shadow:0 4px 12px rgba(0,0,0,.18);
    }

    /* ══ KPI STRIP ══════════════════════════ */
    .kpi-strip {
      position:relative; z-index:2;
      display:grid; grid-template-columns:repeat(4,1fr); gap:14px;
      margin-bottom:18px;
    }
    @media(max-width:900px){ .kpi-strip { grid-template-columns:repeat(2,1fr); } }

    .kpi {
      position:relative;
      background:var(--white);
      border:1px solid var(--border);
      border-radius:22px;
      padding:20px;
      overflow:hidden;
      display:flex; align-items:center; gap:14px;
      animation: kpi-pop 500ms cubic-bezier(.22,1,.36,1) calc(var(--ki,0) * 80ms) both;
      transition:transform 220ms ease, box-shadow 220ms ease;
    }
    @keyframes kpi-pop {
      from { opacity:0; transform:translateY(18px) scale(.97); }
      to   { opacity:1; transform:translateY(0) scale(1); }
    }
    .kpi:hover { transform:translateY(-4px); box-shadow:0 16px 40px rgba(0,0,0,.1); }
    .kpi-glow {
      position:absolute; bottom:-24px; right:-24px;
      width:80px; height:80px; border-radius:50%;
      opacity:.08; filter:blur(16px); pointer-events:none;
    }
    .kpi-icon {
      width:42px; height:42px; border-radius:14px;
      display:grid; place-items:center;
      font-size:1.3rem; flex-shrink:0;
    }
    .kpi-body { flex:1; min-width:0; }
    .kpi-val  {
      font-size:1.7rem; font-weight:800; color:var(--dark);
      line-height:1.1; letter-spacing:-.03em;
    }
    .kpi-unit { font-size:1rem; font-weight:600; opacity:.5; }
    .kpi-lbl  { font-size:.72rem; color:#999; font-weight:600; margin-top:2px; }
    .kpi-delta {
      align-self:flex-start;
      padding:3px 9px; border-radius:999px;
      font-size:.7rem; font-weight:800; white-space:nowrap;
    }
    .up   { background:rgba(91,212,154,.12); color:#1a7a4a; }
    .down { background:rgba(255,142,126,.12); color:#c04a3a; }

    /* Ring KPI */
    .kpi--ring { flex-wrap:wrap; }
    .kpi-ring-wrap {
      position:relative; width:56px; height:56px; flex-shrink:0;
    }
    .ring-svg { width:56px; height:56px; }
    .ring-fill {
      transition:stroke-dashoffset 1s cubic-bezier(.22,1,.36,1);
      animation:ring-draw 1.2s cubic-bezier(.22,1,.36,1) .3s both;
    }
    @keyframes ring-draw { from{stroke-dashoffset:138} }
    .ring-val {
      position:absolute; inset:0;
      display:grid; place-items:center;
      font-size:.72rem; font-weight:800; color:var(--dark);
    }
    .kpi-lbl--lg { font-size:.82rem; font-weight:700; color:var(--dark); margin-bottom:2px; }
    .kpi-sub     { font-size:.72rem; color:#aaa; }

    /* ══ LAYOUT ══════════════════════════════ */
    .row-2col {
      position:relative; z-index:2;
      display:grid; grid-template-columns:1.55fr 1fr; gap:16px;
      margin-bottom:16px;
    }
    @media(max-width:1100px){ .row-2col { grid-template-columns:1fr; } }

    /* ══ CHART CARDS ════════════════════════ */
    .chart-card {
      position:relative; z-index:2;
      background:var(--white);
      border:1px solid var(--border);
      border-radius:22px;
      padding:22px 24px;
      box-shadow:var(--shadow);
      margin-bottom:16px;
      transition:box-shadow 220ms ease;
      animation: card-rise 500ms cubic-bezier(.22,1,.36,1) 200ms both;
    }
    @keyframes card-rise { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
    .chart-card:hover { box-shadow:0 18px 50px rgba(0,0,0,.09); }
    .chart-card--full { width:100%; margin-bottom:16px; }
    .chart-head {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:20px;
    }
    .chart-title { margin:0; font-size:.98rem; font-weight:800; color:var(--dark); }
    .chart-legend { display:flex; gap:14px; }
    .leg { display:inline-flex; align-items:center; gap:6px; font-size:.75rem; color:#999; }
    .leg-dot { width:10px; height:10px; border-radius:50%; }

    /* ══ BAR CHART ══════════════════════════ */
    .bar-chart {
      display:flex; align-items:flex-end; gap:8px;
      height:180px;
    }
    .bar-group {
      flex:1;
      display:flex; flex-direction:column; align-items:center; gap:6px;
      animation: bg-rise 500ms cubic-bezier(.22,1,.36,1) calc(var(--bi,0) * 60ms + 300ms) both;
    }
    @keyframes bg-rise { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
    .bar-col {
      flex:1; width:100%;
      display:flex; align-items:flex-end; justify-content:center;
      gap:4px;
    }
    .bar {
      width:100%; max-width:26px;
      border-radius:8px 8px 0 0;
      position:relative;
      transition:height 800ms cubic-bezier(.22,1,.36,1);
      animation:bar-up 800ms cubic-bezier(.22,1,.36,1) calc(var(--bi,0) * 60ms + 400ms) both;
    }
    @keyframes bar-up { from{height:0!important} }
    .bar--planned {
      background:rgba(0,0,0,.07);
      min-height:4px;
    }
    .bar--done {
      background:linear-gradient(180deg, var(--yellow), #e8b200);
      min-height:4px; cursor:default;
    }
    .bar-val {
      position:absolute; top:-20px; left:50%; transform:translateX(-50%);
      font-size:.66rem; font-weight:800; color:var(--dark); white-space:nowrap;
    }
    .bar-label {
      font-size:.72rem; font-weight:700; color:#aaa;
    }

    /* ══ TREND SVG ═══════════════════════════ */
    .trend-wrap { display:flex; flex-direction:column; gap:8px; }
    .trend-svg {
      width:100%; height:160px;
      overflow:visible;
    }
    .trend-line {
      stroke-dasharray: 1000;
      stroke-dashoffset: 1000;
      animation:line-draw 1.4s cubic-bezier(.22,1,.36,1) .4s forwards;
    }
    @keyframes line-draw { to{stroke-dashoffset:0} }
    .trend-dot {
      animation:dot-pop 400ms cubic-bezier(.34,1.56,.64,1) both;
    }
    @keyframes dot-pop { from{r:0;opacity:0} to{r:4;opacity:1} }
    .trend-labels {
      display:flex; justify-content:space-between;
      font-size:.68rem; color:#bbb; font-weight:600;
      padding:0 4px;
    }

    /* ══ SUBJECT PROGRESS ═══════════════════ */
    .subject-list { display:flex; flex-direction:column; gap:16px; }
    .subj-row {
      display:grid;
      grid-template-columns:180px 1fr auto;
      align-items:center; gap:16px;
      animation:subj-in 450ms cubic-bezier(.22,1,.36,1) calc(var(--sri,0) * 70ms + 300ms) both;
    }
    @keyframes subj-in { from{opacity:0;transform:translateX(-12px)} to{opacity:1;transform:translateX(0)} }
    .subj-left { display:flex; align-items:center; gap:10px; }
    .subj-dot  { width:10px; height:10px; border-radius:50%; flex-shrink:0; }
    .subj-name { font-size:.85rem; font-weight:700; color:var(--dark); }
    .subj-track {
      position:relative; height:8px; border-radius:4px;
      background:rgba(0,0,0,.06); overflow:visible;
    }
    .subj-bar-bg {
      position:absolute; top:0; left:0; height:100%;
      border-radius:4px; background:rgba(0,0,0,.07);
    }
    .subj-bar-fill {
      position:absolute; top:0; left:0; height:100%;
      border-radius:4px; overflow:hidden;
      transition:width 1s cubic-bezier(.22,1,.36,1);
      animation:fill-grow 1s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes fill-grow { from{width:0!important} }
    .subj-shine {
      position:absolute; inset:0;
      background:linear-gradient(90deg,transparent 0%,rgba(255,255,255,.4) 50%,transparent 100%);
      animation:shine-sweep 2.5s ease-in-out infinite;
    }
    @keyframes shine-sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
    .subj-stats {
      display:flex; align-items:center; gap:4px;
      font-size:.78rem; white-space:nowrap;
    }
    .subj-done    { font-weight:800; }
    .subj-sep     { color:#ccc; }
    .subj-planned { color:#aaa; }
    .subj-pct     { font-weight:800; margin-left:4px; }

    /* ══ HEATMAP ════════════════════════════ */
    .heatmap {
      display:grid; grid-template-columns:repeat(7,1fr); gap:10px;
    }
    .hm-cell {
      position:relative;
      border-radius:14px;
      padding:14px 10px;
      border:1px solid var(--border);
      overflow:hidden;
      display:flex; flex-direction:column; align-items:center; gap:4px;
      cursor:default;
      animation:hm-pop 400ms cubic-bezier(.22,1,.36,1) calc(var(--hi,0) * 60ms + 400ms) both;
      transition:transform 200ms ease, box-shadow 200ms ease;
    }
    @keyframes hm-pop { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
    .hm-cell:hover { transform:scale(1.08); box-shadow:0 8px 20px rgba(0,0,0,.1); }
    .hm-zero { opacity:.5; }
    .hm-fill {
      position:absolute; inset:0;
      background:var(--yellow);
      pointer-events:none;
      transition:opacity 600ms ease;
    }
    .hm-day {
      position:relative; z-index:1;
      font-size:.65rem; font-weight:800; color:#aaa; letter-spacing:.06em;
    }
    .hm-hours {
      position:relative; z-index:1;
      font-size:.82rem; font-weight:800; color:var(--dark);
    }

    /* ══ GOAL RINGS ═════════════════════════ */
    .goals-grid { display:flex; flex-direction:column; gap:14px; }
    .goal-item {
      display:flex; align-items:center; gap:14px;
      animation:goal-in 400ms cubic-bezier(.22,1,.36,1) calc(var(--gi,0) * 70ms + 350ms) both;
    }
    @keyframes goal-in { from{opacity:0;transform:translateX(14px)} to{opacity:1;transform:translateX(0)} }
    .goal-ring-wrap {
      position:relative; width:44px; height:44px; flex-shrink:0;
    }
    .goal-svg { width:44px; height:44px; }
    .goal-ring-fill {
      transition:stroke-dashoffset 1s cubic-bezier(.22,1,.36,1);
      animation:ring-draw-sm 1s cubic-bezier(.22,1,.36,1) .5s both;
    }
    @keyframes ring-draw-sm { from{stroke-dashoffset:107} }
    .goal-pct {
      position:absolute; inset:0;
      display:grid; place-items:center;
      font-size:.62rem; font-weight:900;
    }
    .goal-info { display:flex; flex-direction:column; gap:2px; }
    .goal-name   { font-size:.83rem; font-weight:700; color:var(--dark); }
    .goal-status { font-size:.73rem; color:#aaa; }
  `]
})
export class AnalyticsComponent implements OnInit {

  period = signal<Period>('week');

  // ── Data ────────────────────────────────────────────
  private weekDataMap: Record<Period, DayStat[]> = {
    week: [
      { day:'Lun', planned:3, done:2.5 },
      { day:'Mar', planned:2, done:1.0 },
      { day:'Mer', planned:4, done:3.0 },
      { day:'Jeu', planned:3, done:2.0 },
      { day:'Ven', planned:4, done:4.0 },
      { day:'Sam', planned:2, done:0   },
      { day:'Dim', planned:1, done:0   },
    ],
    month: [
      { day:'S1',  planned:14, done:11 },
      { day:'S2',  planned:12, done:10 },
      { day:'S3',  planned:16, done:14 },
      { day:'S4',  planned:10, done:8  },
      { day:'S5',  planned:8,  done:5  },
      { day:'S6',  planned:12, done:9  },
      { day:'S7',  planned:6,  done:4  },
    ],
    all: [
      { day:'Jan', planned:40, done:32 },
      { day:'Fév', planned:35, done:28 },
      { day:'Mar', planned:42, done:38 },
      { day:'Avr', planned:38, done:30 },
      { day:'Mai', planned:45, done:40 },
      { day:'Jun', planned:30, done:22 },
      { day:'Jul', planned:28, done:18 },
    ],
  };

  private subjectDataMap: Record<Period, SubjectStat[]> = {
    week: [
      { name:'Mathématiques',  color:'#6C8EEF', planned:8,  done:6   },
      { name:'Algorithmique',  color:'#4CAF82', planned:6,  done:4.5 },
      { name:'Bases de données', color:'#F0A030', planned:5, done:4  },
      { name:'Réseau',         color:'#9B72EF', planned:4,  done:2   },
    ],
    month: [
      { name:'Mathématiques',  color:'#6C8EEF', planned:30, done:22  },
      { name:'Algorithmique',  color:'#4CAF82', planned:24, done:19  },
      { name:'Bases de données', color:'#F0A030', planned:20, done:15 },
      { name:'Réseau',         color:'#9B72EF', planned:16, done:8   },
    ],
    all: [
      { name:'Mathématiques',  color:'#6C8EEF', planned:60, done:48  },
      { name:'Algorithmique',  color:'#4CAF82', planned:50, done:38  },
      { name:'Bases de données', color:'#F0A030', planned:40, done:29 },
      { name:'Réseau',         color:'#9B72EF', planned:30, done:14  },
    ],
  };

  private monthTrendData: MonthStat[] = [
    { month:'Oct', hours:28 },
    { month:'Nov', hours:34 },
    { month:'Déc', hours:22 },
    { month:'Jan', hours:40 },
    { month:'Fév', hours:35 },
    { month:'Mar', hours:48 },
    { month:'Avr', hours:42 },
  ];

  // ── Computed ─────────────────────────────────────────
  weekData    = computed<DayStat[]>(() => this.weekDataMap[this.period()]);
  subjects    = computed<SubjectStat[]>(() => this.subjectDataMap[this.period()]);
  monthlyTrend = computed<MonthStat[]>(() => this.monthTrendData);

  maxWeek  = computed(() => Math.max(...this.weekData().map(d => d.planned), 1));
  maxSubj  = computed(() => Math.max(...this.subjects().map(s => s.planned), 1));
  maxMonth = computed(() => Math.max(...this.monthTrendData.map(d => d.hours), 1));

  kpis = computed(() => {
    const wd = this.weekData();
    const totalPlanned  = wd.reduce((s,d) => s + d.planned, 0);
    const totalDone     = wd.reduce((s,d) => s + d.done,    0);
    const missed = wd.filter(d => d.planned > 0 && d.done < d.planned).length;
    return {
      totalHours:      Math.round(totalDone * 10) / 10,
      hoursGrowth:     18,
      completed:       wd.filter(d => d.done >= d.planned && d.planned > 0).length,
      completedGrowth: 12,
      planned:         wd.filter(d => d.planned > 0).length,
      completionRate:  totalPlanned > 0 ? Math.round(totalDone / totalPlanned * 100) : 0,
      missed,
      missedDrop:      3,
    };
  });

  // ── SVG trend ────────────────────────────────────────
  trendPoints = computed(() => {
    const data = this.monthlyTrend();
    const W = 300, H = 150, padX = 10, padY = 10;
    const maxH = this.maxMonth();
    return data.map((d, i) => ({
      x: padX + (i / (data.length - 1)) * (W - padX * 2),
      y: H - padY - (d.hours / maxH) * (H - padY * 2),
    }));
  });

  trendLinePoints = computed(() =>
    this.trendPoints().map(p => p.x + ',' + p.y).join(' ')
  );

  trendAreaPoints = computed(() => {
    const pts = this.trendPoints();
    if (!pts.length) return '';
    const H = 150;
    const first = pts[0], last = pts[pts.length - 1];
    return pts.map(p => p.x + ',' + p.y).join(' ')
      + ' ' + last.x + ',' + H
      + ' ' + first.x + ',' + H;
  });

  // ── Helpers ──────────────────────────────────────────
  barPct(val: number, max: number): number {
    return max > 0 ? Math.round((val / max) * 100) : 0;
  }

  pct(done: number, planned: number): number {
    return planned > 0 ? Math.min(100, Math.round((done / planned) * 100)) : 0;
  }

  ngOnInit(): void {}
}
