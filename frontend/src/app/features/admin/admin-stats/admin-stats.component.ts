import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ChartConfiguration, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AnalyticsService } from '../../../core/services/analytics.service';
import { AdminGlobalStats } from '../../../core/models/stats.model';

@Component({
  selector: 'app-admin-stats',
  standalone: true,
  imports: [CommonModule, BaseChartDirective],
  template: `
    <section class="stats-page">

      <!-- Hero -->
      <div class="hero-grid">
        <article class="hero-card hero-card--main">
          <div class="particle-field"></div>
          <div class="hero-copy">
            <p class="eyebrow">Vue globale</p>
            <h2>Tableau de bord administrateur</h2>
            <p>Vue d'ensemble des utilisateurs, sessions, groupes et messages de la plateforme.</p>
          </div>
          <div class="hero-blobs">
            <div class="blob blob-dark">
              <strong>{{ stats.activeUsers }}</strong>
              <span>actifs</span>
            </div>
            <div class="blob blob-coral">
              <strong>{{ stats.totalGroups }}</strong>
              <span>groupes</span>
            </div>
            <div class="blob blob-yellow">
              <strong>{{ stats.totalSessions }}</strong>
              <span>sessions</span>
            </div>
          </div>
        </article>

        <article class="hero-card hero-card--side">
          <p class="eyebrow">Productivite globale</p>
          <div class="completion-wrap">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
            <h3>{{ animCompletion() }}<span class="pct-sign">%</span></h3>
          </div>
          <p class="side-note">Taux de completion des sessions sur la plateforme.</p>
          <div class="side-kpis">
            <div class="side-kpi">
              <span>{{ animStudiedHours() | number:'1.0-1' }} h</span>
              <small>Total etudie</small>
            </div>
            <div class="side-kpi">
              <span>{{ stats.avgSessionDurationMin }} min</span>
              <small>Duree moy.</small>
            </div>
            <div class="side-kpi">
              <span>{{ stats.longestSessionMin }} min</span>
              <small>Plus longue</small>
            </div>
          </div>
        </article>
      </div>

      <!-- KPI cards -->
      <section class="kpi-grid">
        <article class="kpi-card kpi-1">
          <div class="icon-wrap icon-users">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div>
            <p>Utilisateurs totaux</p>
            <h3>{{ animTotalUsers() }}</h3>
            <small>{{ stats.newUsersThisWeek }} nouveaux · {{ stats.disabledUsers }} desactives</small>
          </div>
          <div class="kpi-glow"></div>
        </article>

        <article class="kpi-card kpi-2">
          <div class="icon-wrap icon-sessions">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
          </div>
          <div>
            <p>Sessions totales</p>
            <h3>{{ animSessions() }}</h3>
            <small>{{ stats.completedSessions }} completees · {{ stats.plannedSessions }} planifiees</small>
          </div>
          <div class="kpi-glow"></div>
        </article>

        <article class="kpi-card kpi-3">
          <div class="icon-wrap icon-groups">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <circle cx="9" cy="12" r="4"/>
              <circle cx="19" cy="8" r="3"/>
              <circle cx="19" cy="16" r="3"/>
              <line x1="13" y1="11" x2="16.5" y2="9.5"/>
              <line x1="13" y1="13" x2="16.5" y2="14.5"/>
            </svg>
          </div>
          <div>
            <p>Groupes de travail</p>
            <h3>{{ animGroups() }}</h3>
            <small>Espaces collaboratifs actifs</small>
          </div>
          <div class="kpi-glow"></div>
        </article>

        <article class="kpi-card kpi-4">
          <div class="icon-wrap icon-messages">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" width="22" height="22">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <div>
            <p>Messages echanges</p>
            <h3>{{ animMessages() | number }}</h3>
            <small>Messages partages dans les groupes</small>
          </div>
          <div class="kpi-glow"></div>
        </article>
      </section>

      <!-- Charts -->
      <section class="charts-grid">
        <article class="panel chart-panel chart-panel--line">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Activite · 7 dernieres semaines</p>
              <h3>Sessions et taux de completion</h3>
            </div>
            <span class="badge">{{ stats.weeklyData.length }} semaines</span>
          </div>
          <div class="chart-wrap">
            <canvas *ngIf="hasWeeklyChartData(); else noWeeklyData"
                    baseChart
                    [type]="'line'"
                    [data]="sessionChartData"
                    [options]="sessionChartOptions"></canvas>
            <ng-template #noWeeklyData>
              <div class="chart-empty">Aucune session sur les 7 dernieres semaines</div>
            </ng-template>
          </div>
          <div class="panel-shine"></div>
        </article>

        <article class="panel chart-panel chart-panel--bar">
          <div class="panel-head">
            <div>
              <p class="eyebrow">Matieres · temps etudie</p>
              <h3>Top matieres par heures etudiees</h3>
            </div>
          </div>
          <div class="chart-wrap">
            <canvas *ngIf="hasSubjectChartData(); else noSubjectData"
                    baseChart
                    [type]="'bar'"
                    [data]="subjectChartData"
                    [options]="subjectChartOptions"></canvas>
            <ng-template #noSubjectData>
              <div class="chart-empty">Aucune matiere avec sessions completees</div>
            </ng-template>
          </div>
          <div class="panel-shine"></div>
        </article>
      </section>

      <!-- Bottom -->
      <section class="bottom-grid">
        <article class="panel status-panel">
          <p class="eyebrow">Sessions · repartition</p>
          <h3>Repartition des sessions</h3>
          <div class="status-rows">
            <div class="status-row">
              <span class="dot dot-green"></span>
              <span>Completees</span>
              <strong>{{ stats.completedSessions }}</strong>
              <div class="bar-track">
                <div class="bar-fill bar-fill--green" [style.width.%]="pct(stats.completedSessions, stats.totalSessions)">
                  <span class="bar-shimmer"></span>
                </div>
              </div>
              <em>{{ pct(stats.completedSessions, stats.totalSessions) | number:'1.0-0' }}%</em>
            </div>
            <div class="status-row">
              <span class="dot dot-yellow"></span>
              <span>Planifiees</span>
              <strong>{{ stats.plannedSessions }}</strong>
              <div class="bar-track">
                <div class="bar-fill bar-fill--yellow" [style.width.%]="pct(stats.plannedSessions, stats.totalSessions)">
                  <span class="bar-shimmer"></span>
                </div>
              </div>
              <em>{{ pct(stats.plannedSessions, stats.totalSessions) | number:'1.0-0' }}%</em>
            </div>
            <div class="status-row">
              <span class="dot dot-red"></span>
              <span>Annulees</span>
              <strong>{{ stats.cancelledSessions }}</strong>
              <div class="bar-track">
                <div class="bar-fill bar-fill--red" [style.width.%]="pct(stats.cancelledSessions, stats.totalSessions)">
                  <span class="bar-shimmer"></span>
                </div>
              </div>
              <em>{{ pct(stats.cancelledSessions, stats.totalSessions) | number:'1.0-0' }}%</em>
            </div>
          </div>
        </article>

        <article class="panel resume-panel">
          <p class="eyebrow">Vue administrateur</p>
          <h3>Lecture rapide</h3>
          <div class="resume-list">
            <div class="resume-item">
              <strong>{{ bestWeek().week }}</strong>
              <span>Meilleure semaine ({{ bestWeek().sessions }} sessions)</span>
            </div>
            <div class="resume-item">
              <strong>{{ avgSessionsPerWeek() }}</strong>
              <span>Sessions moyennes par semaine</span>
            </div>
            <div class="resume-item">
              <strong>{{ topSubjectName() }}</strong>
              <span>Matiere la plus etudiee</span>
            </div>
            <div class="resume-item">
              <strong>{{ stats.adminUsers }}</strong>
              <span>Administrateurs actifs</span>
            </div>
          </div>
        </article>
      </section>

    </section>
  `,
  styles: [`
    :host { display: block; }
    .stats-page { display: flex; flex-direction: column; gap: 22px; width: 100%; }

    /* Grids */
    .hero-grid   { display: grid; gap: 20px; grid-template-columns: minmax(0,1.65fr) minmax(300px,1fr); }
    .kpi-grid    { display: grid; gap: 20px; grid-template-columns: repeat(4, minmax(0,1fr)); }
    .charts-grid { display: grid; gap: 20px; grid-template-columns: repeat(2, minmax(0,1fr)); }
    .bottom-grid { display: grid; gap: 20px; grid-template-columns: minmax(0,1.3fr) 1fr; }

    /* Cards */
    .hero-card, .kpi-card, .panel {
      border-radius: 26px;
      border: 1px solid rgba(26,26,26,.05);
      background: #fff;
      box-shadow: 0 18px 34px rgba(26,26,26,.06);
      overflow: hidden;
    }

    .hero-card, .panel { padding: 24px; }

    /* Hero main */
    .hero-card--main {
      display: flex; justify-content: space-between; gap: 18px;
      min-height: 300px; background: #e8dfd0;
      position: relative;
    }

    /* Particle field */
    .particle-field {
      position: absolute; inset: 0; pointer-events: none;
      background-image:
        radial-gradient(circle, rgba(26,26,26,.07) 1.5px, transparent 1.5px),
        radial-gradient(circle, rgba(26,26,26,.04) 1px, transparent 1px);
      background-size: 38px 38px, 18px 18px;
      background-position: 0 0, 9px 9px;
      animation: particle-drift 25s linear infinite;
      border-radius: 26px;
    }

    @keyframes particle-drift {
      0%   { background-position: 0 0, 9px 9px; }
      100% { background-position: 38px 38px, 27px 27px; }
    }

    /* Hero side */
    .hero-card--side {
      display: flex; flex-direction: column; gap: 14px;
      background: radial-gradient(circle at top left, rgba(245,197,24,.24), transparent 32%), #fff;
      position: relative; overflow: hidden;
    }

    /* Typography */
    .eyebrow { margin: 0 0 8px; font-size: .74rem; text-transform: uppercase; letter-spacing: .16em; color: #7a7a7a; }
    h2, h3 { margin: 0; color: #1a1a1a; letter-spacing: -.04em; }
    h2 { font-size: clamp(1.8rem,3vw,2.4rem); line-height: 1.04; margin-bottom: 10px; max-width: 14ch; }
    h3 { font-size: clamp(1.4rem,2vw,1.9rem); }

    .hero-copy p, .side-note, .kpi-card p, .kpi-card small, .resume-item span { color: #6d6d6d; line-height: 1.6; }
    .hero-copy { max-width: 280px; position: relative; z-index: 1; }

    /* Morphing blobs */
    .hero-blobs { position: relative; flex: 1; min-height: 240px; z-index: 1; }

    .blob {
      position: absolute;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center;
      box-shadow: 0 18px 30px rgba(26,26,26,.12);
    }

    .blob strong { font-size: 1.5rem; line-height: 1; letter-spacing: -.03em; }
    .blob span   { margin-top: 6px; font-size: .8rem; opacity: .85; }

    .blob-dark {
      width: 100px; height: 100px; top: 60px; left: 4%;
      background: #1a1a1a; color: #fff;
      animation: morph-a 9s ease-in-out infinite, drift-a 6s ease-in-out infinite;
    }

    .blob-coral {
      width: 118px; height: 118px; top: 115px; left: 34%;
      background: #ff8e7e; color: #fff;
      animation: morph-b 11s ease-in-out infinite, drift-b 7s ease-in-out -2s infinite;
    }

    .blob-yellow {
      width: 165px; height: 165px; top: 18px; right: 3%;
      background: #f5c518; color: #1a1a1a;
      animation: morph-c 13s ease-in-out infinite, drift-c 8s ease-in-out -4s infinite;
    }

    @keyframes morph-a {
      0%,100% { border-radius: 60% 40% 30% 70% / 60% 30% 70% 40%; }
      25%     { border-radius: 30% 60% 70% 40% / 50% 60% 30% 60%; }
      50%     { border-radius: 50% 30% 60% 40% / 40% 70% 60% 30%; }
      75%     { border-radius: 40% 60% 30% 60% / 70% 40% 60% 30%; }
    }
    @keyframes morph-b {
      0%,100% { border-radius: 30% 70% 60% 40% / 50% 40% 60% 50%; }
      33%     { border-radius: 60% 40% 40% 60% / 60% 60% 40% 40%; }
      66%     { border-radius: 40% 60% 70% 30% / 30% 50% 70% 50%; }
    }
    @keyframes morph-c {
      0%,100% { border-radius: 50% 50% 30% 70% / 70% 30% 50% 50%; }
      40%     { border-radius: 70% 30% 50% 50% / 40% 60% 40% 60%; }
      80%     { border-radius: 30% 70% 60% 40% / 60% 40% 70% 30%; }
    }

    @keyframes drift-a {
      0%,100% { transform: translateY(0); }
      50%     { transform: translateY(-10px); }
    }
    @keyframes drift-b {
      0%,100% { transform: translateY(0) translateX(0); }
      50%     { transform: translateY(-8px) translateX(4px); }
    }
    @keyframes drift-c {
      0%,100% { transform: translateY(0) rotate(0deg); }
      50%     { transform: translateY(-12px) rotate(3deg); }
    }

    /* Pulsing rings on completion rate */
    .completion-wrap {
      position: relative;
      display: inline-flex; align-items: center; justify-content: center;
      align-self: flex-start;
    }

    .ring {
      position: absolute;
      border-radius: 50%;
      border: 1.5px solid rgba(245,197,24,.45);
      width: 80px; height: 80px;
      animation: ring-expand 2.8s ease-out infinite;
    }

    .ring-2 { animation-delay: -.93s; border-color: rgba(245,197,24,.3); }
    .ring-3 { animation-delay: -1.86s; border-color: rgba(245,197,24,.15); }

    @keyframes ring-expand {
      0%   { transform: scale(0.6); opacity: .9; }
      100% { transform: scale(2.2); opacity: 0; }
    }

    .hero-card--side h3 {
      font-size: clamp(2.4rem,5vw,3.4rem); line-height: 1;
      position: relative; z-index: 1;
    }

    .pct-sign { font-size: 55%; vertical-align: super; opacity: .7; }

    /* Side KPIs */
    .side-kpis { display: flex; gap: 10px; flex-wrap: wrap; margin-top: auto; }
    .side-kpi { flex: 1; min-width: 80px; padding: 12px 14px; border-radius: 18px; background: #f5f1ea; text-align: center; transition: transform 200ms ease; }
    .side-kpi:hover { transform: translateY(-3px); }
    .side-kpi span { display: block; font-size: 1.15rem; font-weight: 800; color: #1a1a1a; }
    .side-kpi small { display: block; font-size: .72rem; color: #7a7a7a; margin-top: 4px; }

    /* KPI cards with staggered entrance */
    .kpi-card {
      padding: 18px; display: flex; align-items: center; gap: 14px;
      position: relative; overflow: hidden;
      animation: slide-up .55s cubic-bezier(.34,1.56,.64,1) both;
      transition: transform 220ms ease, box-shadow 220ms ease;
    }

    .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 28px 50px rgba(26,26,26,.1); }

    .kpi-1 { animation-delay: .08s; }
    .kpi-2 { animation-delay: .16s; }
    .kpi-3 { animation-delay: .24s; }
    .kpi-4 { animation-delay: .32s; }

    @keyframes slide-up {
      from { opacity: 0; transform: translateY(28px) scale(.96); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    .icon-wrap {
      width: 54px; height: 54px; border-radius: 50%;
      display: grid; place-items: center; flex-shrink: 0;
      transition: transform 220ms ease;
    }

    .kpi-card:hover .icon-wrap { transform: scale(1.12) rotate(-6deg); }

    .icon-users    { background: linear-gradient(135deg, #f5e5be, #f9f2df); }
    .icon-sessions { background: linear-gradient(135deg, #ffe4de, #fff2ee); }
    .icon-groups   { background: linear-gradient(135deg, #ede8df, #f7f4ef); }
    .icon-messages { background: linear-gradient(135deg, #f5eec0, #fff8dd); }

    .icon-wrap svg { stroke: #3a3230; }

    .kpi-card p  { margin: 0 0 4px; font-size: .92rem; }
    .kpi-card h3 { font-size: 1.55rem; margin-bottom: 4px; }
    .kpi-card small { font-size: .78rem; }

    /* KPI glow overlay */
    .kpi-glow {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(circle at 80% 20%, rgba(245,197,24,.08), transparent 60%);
      opacity: 0; transition: opacity 300ms ease;
    }

    .kpi-card:hover .kpi-glow { opacity: 1; }

    /* Chart panels */
    .panel {
      animation: slide-up .55s cubic-bezier(.34,1.56,.64,1) .35s both;
      position: relative; overflow: hidden;
    }

    .panel-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 14px; margin-bottom: 18px; }

    .badge {
      display: inline-flex; padding: 8px 14px; border-radius: 18px;
      background: #f5f1ea; color: #6a6a6a; font-size: .85rem; font-weight: 700;
      white-space: nowrap;
    }

    .chart-wrap { position: relative; height: 260px; }
    .chart-wrap canvas { width: 100% !important; height: 100% !important; }
    .chart-empty {
      height: 100%;
      display: grid;
      place-items: center;
      border-radius: 18px;
      background: #f7f4ef;
      color: #8a8175;
      font-weight: 700;
      font-size: .9rem;
      text-align: center;
      padding: 18px;
    }

    /* Panel shine effect */
    .panel-shine {
      position: absolute; top: -50%; left: -60%;
      width: 40%; height: 200%;
      background: linear-gradient(105deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%);
      transform: skewX(-15deg);
      transition: left 700ms ease;
      pointer-events: none;
    }

    .panel:hover .panel-shine { left: 130%; }

    /* Status rows */
    .status-rows { display: flex; flex-direction: column; gap: 18px; margin-top: 18px; }
    .status-row { display: grid; grid-template-columns: 12px auto 52px 1fr 44px; align-items: center; gap: 12px; }

    .dot { width: 10px; height: 10px; border-radius: 50%; }
    .dot-green  { background: #1a1a1a; }
    .dot-yellow { background: #f5c518; }
    .dot-red    { background: #ff6b5b; }

    .status-row span  { font-size: .88rem; color: #4a4a4a; }
    .status-row strong { font-size: 1rem; font-weight: 800; }
    .status-row em    { font-size: .82rem; color: #7a7a7a; text-align: right; }

    .bar-track { height: 8px; border-radius: 4px; background: #f0ece4; overflow: hidden; }

    .bar-fill {
      height: 100%; border-radius: 4px; position: relative; overflow: hidden;
      transform-origin: left;
      animation: bar-scale-in 1.2s cubic-bezier(.34,1.56,.64,1) .6s both;
    }

    @keyframes bar-scale-in {
      from { transform: scaleX(0); }
      to   { transform: scaleX(1); }
    }

    .bar-fill--green  { background: linear-gradient(90deg, #2b2b2b, #1a1a1a); }
    .bar-fill--yellow { background: linear-gradient(90deg, #ffe27a, #f5c518); }
    .bar-fill--red    { background: linear-gradient(90deg, #ffb09d, #ff6b5b); }

    .bar-shimmer {
      position: absolute; inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,.45), transparent);
      animation: shimmer 2.5s ease-in-out 1.8s infinite;
    }

    @keyframes shimmer {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(300%); }
    }

    /* Resume panel */
    .resume-panel { display: flex; flex-direction: column; gap: 4px; }
    .resume-list { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
    .resume-item {
      padding: 14px 18px; border-radius: 20px; background: #f7f4ef;
      transition: transform 200ms ease, background 200ms ease;
    }

    .resume-item:hover { transform: translateX(6px); background: #f0ece4; }
    .resume-item strong { display: block; font-size: 1.3rem; color: #1a1a1a; letter-spacing: -.02em; margin-bottom: 4px; }

    /* Responsive */
    @media (max-width: 1200px) {
      .hero-grid, .charts-grid, .bottom-grid { grid-template-columns: 1fr; }
      .kpi-grid { grid-template-columns: repeat(2, 1fr); }
    }
    @media (max-width: 700px) {
      .hero-card--main { flex-direction: column; }
      .hero-blobs { min-height: 260px; }
      .kpi-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class AdminStatsComponent implements OnInit {
  private readonly analyticsService = inject(AnalyticsService);
  readonly stats: AdminGlobalStats = this.analyticsService.getAdminStats();

  // Animated counter signals
  readonly animCompletion   = signal(0);
  readonly animStudiedHours = signal(0);
  readonly animTotalUsers   = signal(0);
  readonly animSessions     = signal(0);
  readonly animGroups       = signal(0);
  readonly animMessages     = signal(0);

  ngOnInit(): void {
    // Si les stats sont deja fraiches en cache, on lance directement les animations
    // (cas le plus frequent : navigation /admin/users -> /admin/stats apres login)
    if (this.analyticsService.isAdminStatsFresh()) {
      this.runAnimations();
      return;
    }

    // Sinon on attend le HTTP avant d'animer les vraies valeurs
    this.analyticsService.refreshAdminStats().subscribe({
      next: () => this.runAnimations(),
      error: () => console.warn('[admin-stats] Impossible de charger les statistiques')
    });
  }

  private runAnimations(): void {
    this.animateValue(this.stats.globalCompletionRate, v => this.animCompletion.set(v),   1200, 1);
    this.animateValue(this.stats.totalStudiedHours,    v => this.animStudiedHours.set(v), 1600, 1);
    this.animateValue(this.stats.totalUsers,           v => this.animTotalUsers.set(v),   1400);
    this.animateValue(this.stats.totalSessions,        v => this.animSessions.set(v),     1800);
    this.animateValue(this.stats.totalGroups,          v => this.animGroups.set(v),       1000);
    this.animateValue(this.stats.totalMessages,        v => this.animMessages.set(v),     2000);

    // Re-construit les datasets Chart.js avec les vraies donnees.
    this.sessionChartData = this.buildSessionChartData();
    this.subjectChartData = this.buildSubjectChartData();
  }

  private animateValue(target: number, setter: (v: number) => void, duration = 1500, decimals = 0): void {
    const steps = 80;
    const stepMs = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = Math.min(step / steps, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = eased * target;
      setter(decimals > 0 ? Number(value.toFixed(decimals)) : Math.round(value));
      if (step >= steps) clearInterval(timer);
    }, stepMs);
  }

  sessionChartData: ChartConfiguration<'line'>['data'] = this.buildSessionChartData();

  readonly sessionChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          boxWidth: 12,
          color: '#5f574e',
          usePointStyle: true,
          font: { size: 12, weight: 'bold' },
        },
      },
    },
    scales: {
      x:  { grid: { display: false }, ticks: { color: '#8a8175' } },
      y:  { beginAtZero: true, ticks: { color: '#8a8175' }, grid: { color: 'rgba(140,100,50,.11)' },
            title: { display: true, text: 'Sessions', color: '#8a8175' } },
      y1: { position: 'right', beginAtZero: true, max: 100,
            ticks: { color: '#ff6b5b', callback: (v: string | number) => v + '%' },
            grid: { display: false }, title: { display: true, text: 'Completion', color: '#ff6b5b' } },
    },
  };

  subjectChartData: ChartConfiguration<'bar'>['data'] = this.buildSubjectChartData();

  readonly subjectChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#f5c518',
        bodyColor: '#fffaf1',
        borderColor: 'rgba(245,197,24,.35)',
        borderWidth: 1,
        callbacks: { label: (ctx: any) => ' ' + ctx.parsed.x + ' h etudiees' },
      },
    },
    scales: {
      x: { beginAtZero: true,
           ticks: { color: '#8a8175', callback: (v: string | number) => v + 'h' },
           grid: { color: 'rgba(140,100,50,.10)' },
           border: { color: '#eadfce' } },
      y: { ticks: { color: '#3a322b', font: { weight: 'bold' as const } },
           grid: { display: false },
           border: { color: '#eadfce' } },
    },
  };

  pct(part: number, total: number): number {
    return total ? Math.round((part / total) * 100) : 0;
  }

  bestWeek(): { week: string; sessions: number } {
    return this.stats.weeklyData.reduce(
      (best, w) => w.sessions > best.sessions ? w : best,
      { week: '-', sessions: 0 }
    );
  }

  avgSessionsPerWeek(): string {
    if (!this.stats.weeklyData.length) return '0';
    const total = this.stats.weeklyData.reduce((sum, w) => sum + w.sessions, 0);
    return Math.round(total / this.stats.weeklyData.length).toString();
  }

  topSubjectName(): string {
    return this.stats.topSubjects[0]?.name || '-';
  }

  hasWeeklyChartData(): boolean {
    return this.stats.weeklyData.some(w => w.sessions > 0 || w.completionRate > 0 || w.totalMinutes > 0);
  }

  hasSubjectChartData(): boolean {
    return this.stats.topSubjects.some(s => s.minutes > 0);
  }

  private buildSessionChartData(): ChartConfiguration<'line'>['data'] {
    return {
      labels: this.stats.weeklyData.map(w => w.week),
      datasets: [
        {
          data: this.stats.weeklyData.map(w => w.sessions),
          label: 'Sessions',
          tension: 0.42,
          fill: true,
          borderWidth: 3,
          borderColor: '#1a1a1a',
          backgroundColor: 'rgba(245,197,24,.18)',
          pointBackgroundColor: '#f5c518',
          pointBorderColor: '#1a1a1a',
          pointHoverBackgroundColor: '#ff8e7e',
          pointHoverBorderColor: '#1a1a1a',
          pointRadius: 5,
          pointHoverRadius: 8,
          yAxisID: 'y',
        },
        {
          data: this.stats.weeklyData.map(w => w.completionRate),
          label: 'Completion (%)',
          tension: 0.42,
          fill: false,
          borderWidth: 2,
          borderDash: [6, 3],
          borderColor: '#ff6b5b',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#ff8e7e',
          pointBorderColor: '#fffaf1',
          pointRadius: 4,
          yAxisID: 'y1',
        },
      ],
    };
  }

  private buildSubjectChartData(): ChartConfiguration<'bar'>['data'] {
    const fills = [
      'rgba(245,197,24,.92)',
      'rgba(26,26,26,.90)',
      'rgba(255,107,91,.86)',
      'rgba(255,142,126,.78)',
      'rgba(138,129,117,.70)',
      'rgba(245,197,24,.62)',
    ];
    const borders = ['#f5c518', '#1a1a1a', '#ff6b5b', '#ff8e7e', '#8a8175', '#d6b21a'];
    const hoverFills = [
      'rgba(245,197,24,1)',
      'rgba(26,26,26,1)',
      'rgba(255,107,91,1)',
      'rgba(255,142,126,.94)',
      'rgba(138,129,117,.86)',
      'rgba(245,197,24,.80)',
    ];

    return {
      labels: this.stats.topSubjects.map(s => s.name),
      datasets: [
        {
          data: this.stats.topSubjects.map(s => Math.round(s.minutes / 60)),
          label: 'Heures etudiees',
          backgroundColor: this.stats.topSubjects.map((_, i) => fills[i % fills.length]),
          borderColor: this.stats.topSubjects.map((_, i) => borders[i % borders.length]),
          hoverBackgroundColor: this.stats.topSubjects.map((_, i) => hoverFills[i % hoverFills.length]),
          hoverBorderColor: this.stats.topSubjects.map((_, i) => borders[i % borders.length]),
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
          categoryPercentage: 0.72,
          barPercentage: 0.82,
        },
      ],
    };
  }
}
