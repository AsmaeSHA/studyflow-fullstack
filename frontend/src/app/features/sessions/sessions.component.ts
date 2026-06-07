import {
  Component,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { finalize, forkJoin, Observable, of, switchMap } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { SessionService } from '../../core/services/session.service';
import { SubjectService } from '../../core/services/subject.service';
import { GroupService } from '../../core/services/group.service';
import { StudySession, SessionStatus, StudyGroup } from '../../core/models/models';

type FilterStatus = 'ALL' | SessionStatus;

// Images de couverture pour les groupes (comme dans groups.component.ts)
const COVER_IMAGES: Record<string, string> = {
  '#F5C518': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
  '#FF6B5B': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=80',
  '#6B8BFF': 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600&q=80',
  '#5BD49A': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
};
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80';

// Données mockées des groupes (comme dans groups.component.ts)
const MOCK_GROUPS: StudyGroup[] = [
  {
    id: 'g1',
    name: 'Algo Team',
    color: '#6B8BFF',
    memberCount: 6,
    isActive: true,
    description: 'Algorithmes et structures de données',
    isPrivate: false,
    maxMembers: 10,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g2',
    name: 'Math S4',
    color: '#F5C518',
    memberCount: 6,
    isActive: false,
    description: 'Mathématiques Semestre 4',
    isPrivate: true,
    maxMembers: 8,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g3',
    name: 'BDD Lab',
    color: '#FF6B5B',
    memberCount: 5,
    isActive: false,
    description: 'Bases de données et SQL',
    isPrivate: false,
    maxMembers: 12,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'g4',
    name: 'Réseau & Sys',
    color: '#5BD49A',
    memberCount: 5,
    isActive: true,
    description: "Réseaux et systèmes d'exploitation",
    isPrivate: false,
    maxMembers: 15,
    createdAt: new Date().toISOString(),
  },
];

@Component({
  selector: 'app-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="page">
      <!-- ══ LIVE HERO AVEC TIMER-LINE MODERN REDESIGN ══ -->
      <div
        class="live-hero"
        *ngIf="liveSession"
        [style.--lc]="liveSession.subjectColor || '#5BD49A'"
      >
        <div class="hero-glow"></div>
        <div class="hero-glow2"></div>

        <div class="hero-content">
          <div class="live-badge">
            <div class="live-dot"></div>
            EN COURS
          </div>

          <h2 class="hero-title">{{ liveSession.title }}</h2>
          <p class="hero-sub">
            {{ liveSession.subjectName }} · démarré il y a {{ elapsedLabelDetailed }}
          </p>

          <!-- Timer Core Modern -->
          <div class="timer-core">
            <!-- Arc + stats principaux -->
            <div class="arc-row">
              <div class="arc-wrap">
                <svg class="arc-svg" viewBox="0 0 120 120">
                  <circle class="arc-track" cx="60" cy="60" r="47" />
                  <circle
                    class="arc-fill"
                    cx="60"
                    cy="60"
                    r="47"
                    [style.stroke]="isOvertime ? '#FF6B5B' : liveSession.subjectColor || '#5BD49A'"
                    [style.stroke-dashoffset]="arcOffset"
                  />
                  <circle
                    class="arc-overtime"
                    cx="60"
                    cy="60"
                    r="47"
                    [style.stroke-dashoffset]="overtimeArcOffset"
                    [style.opacity]="isOvertime ? 1 : 0"
                  />
                </svg>
                <div class="arc-center">
                  <span class="arc-time">{{ elapsedTimeFormatted }}</span>
                  <span class="arc-label">ÉCOULÉ</span>
                </div>
              </div>

              <div class="arc-stats">
                <div class="stat-item">
                  <span class="stat-key">PROGRESSION</span>
                  <span class="stat-val"
                    >{{ timerPercentActual }}<span style="font-size:0.8rem;">%</span></span
                  >
                  <span class="stat-sub"
                    >de la durée prévue ({{ liveSession.plannedDuration }} min)</span
                  >
                </div>
                <div class="stat-item">
                  <span class="stat-key">RESTANT</span>
                  <span class="stat-val" [style.color]="isOvertime ? '#FF6B5B' : '#5BD49A'">{{
                    isOvertime ? 'Dépassé' : remainLabel
                  }}</span>
                  <span class="stat-sub">{{
                    isOvertime ? 'au-delà de la durée' : 'avant la fin prévue'
                  }}</span>
                </div>
              </div>
            </div>

            <!-- Barre segmentée stylisée -->
            <div class="seg-bar-wrap">
              <div class="seg-bar-labels">
                <span class="seg-label active">{{
                  liveSession.startDateTime | date: 'HH:mm'
                }}</span>
                <span class="seg-label">TIMELINE</span>
                <span class="seg-label">{{ liveSession.endDateTime | date: 'HH:mm' }}</span>
              </div>
              <div class="seg-track">
                <div
                  class="seg-fill"
                  [style.width.%]="Math.min(100, timerPercentActual)"
                  [style.background]="
                    isOvertime ? '#FF6B5B' : liveSession.subjectColor || '#5BD49A'
                  "
                >
                  <div
                    class="seg-thumb"
                    [style.background]="
                      isOvertime ? '#FF6B5B' : liveSession.subjectColor || '#5BD49A'
                    "
                  >
                    <div class="thumb-tag">{{ currentTimeDisplay }}</div>
                  </div>
                </div>
              </div>
              <div class="seg-markers">
                <span class="seg-marker-val">Début</span>
                <span class="seg-marker-val live">▲ Maintenant</span>
                <span class="seg-marker-val">Fin prévue</span>
              </div>
            </div>
          </div>

          <!-- Chips stats -->
          <div class="stats-row">
            <div class="stat-chip">
              <span class="chip-key">DÉMARRÉ</span>
              <span class="chip-val">{{ (liveSession.startedAt || liveSession.startDateTime) | date: 'HH:mm' }}</span>
              <span class="chip-sub">heure de début</span>
            </div>
            <div class="stat-chip">
              <span class="chip-key">FIN PRÉVUE</span>
              <span class="chip-val yellow">{{ liveSession.endDateTime | date: 'HH:mm' }}</span>
              <span class="chip-sub">durée {{ liveSession.plannedDuration }} min</span>
            </div>
            <div class="stat-chip">
              <span class="chip-key">ÉCOULÉ</span>
              <span class="chip-val" [class.green]="!isOvertime" [class.red]="isOvertime">{{
                elapsedLabelDetailed
              }}</span>
              <span class="chip-sub">{{
                isOvertime ? 'dépassement' : remainLabel + ' restantes'
              }}</span>
            </div>
          </div>

          <!-- CTA -->
          <div class="cta-row">
            <button
              class="btn-done"
              (click)="completeSession(liveSession!)"
              [disabled]="isBusy(liveSession!.id)"
            >
              <svg class="check-icon" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
              Terminer la session
            </button>
            <span class="pct-badge"
              >Session <span>{{ timerPercentActual }}%</span> complète</span
            >
          </div>
        </div>
      </div>

      <!-- ── Header ── -->
      <header class="page-head">
        <div>
          <p class="eyebrow">Planning d'étude</p>
          <h2>Mission Log</h2>
        </div>
        <div class="head-actions">
          <button class="btn-accent" (click)="openCreate()">
            <span class="plus">+</span> Nouvelle session
          </button>
        </div>
      </header>

      <!-- ── Stats strip ── -->
      <div class="stats-strip">
        <div class="sc sc--yellow">
          <span>{{ countByStatus('PLANNED') }}</span>
          <p>Planifiées</p>
        </div>
        <div class="sc sc--blue">
          <span>{{ countByStatus('IN_PROGRESS') }}</span>
          <p>En cours</p>
        </div>
        <div class="sc sc--green">
          <span>{{ countByStatus('COMPLETED') }}</span>
          <p>Complétées</p>
        </div>
        <div class="sc sc--grey">
          <span>{{ countByStatus('CANCELLED') }}</span>
          <p>Annulées</p>
        </div>
        <div class="sc sc--dark">
          <span>{{ totalMin }}m</span>
          <p>Planifiées</p>
        </div>
      </div>

      <!-- ── Filters ── -->
      <div class="feedback success" *ngIf="successMessage()">{{ successMessage() }}</div>
      <div class="feedback error" *ngIf="errorMessage()">{{ errorMessage() }}</div>

      <div class="filters">
        <div class="filter-tabs">
          <button
            *ngFor="let f of filterOpts"
            class="tab"
            [class.active]="filterStatus() === f.v"
            (click)="filterStatus.set(f.v)"
          >
            {{ f.l }}
          </button>
        </div>
        <select
          class="fsel"
          [ngModel]="filterSubjectId()"
          (ngModelChange)="filterSubjectId.set($event)"
        >
          <option value="">Toutes les matières</option>
          <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }}</option>
        </select>
      </div>

      <!-- ── Timeline ── -->
      <div class="timeline">
        <div class="tl-track"></div>

        <div
          class="tl-item"
          *ngFor="let s of filteredSessions(); let i = index"
          [style.--i]="i"
          [class.tl-live]="s.status === 'IN_PROGRESS'"
          [class.tl-done]="s.status === 'COMPLETED'"
          [class.tl-cancelled]="s.status === 'CANCELLED'"
          [class.tl-selected]="s.id === highlightedSessionId()"
        >
          <div
            class="tl-node"
            [style.background]="s.status === 'CANCELLED' ? '#e0e0e0' : s.subjectColor || '#ccc'"
          >
            <span class="node-pulse" *ngIf="s.status === 'IN_PROGRESS'"></span>
          </div>

          <div class="tl-card">
            <div class="tl-beam" [style.background]="s.subjectColor || '#ccc'"></div>
            <div class="tl-card-inner">
              <div class="tl-head">
                <div class="tl-left">
                  <span
                    class="subj-pill"
                    [style.background]="(s.subjectColor || '#ccc') + '22'"
                    [style.color]="s.subjectColor || '#666'"
                  >
                    {{ s.subjectName }}
                  </span>
                  <span class="tl-time">
                    {{ s.startDateTime | date: 'EEE d MMM · HH:mm' : localTimezone : 'fr' }}
                    – {{ s.endDateTime | date: 'HH:mm' }}
                  </span>
                </div>
                <div class="tl-badges">
                  <span class="shared-badge" *ngIf="s.isShared" title="Partagée">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                    >
                      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                      <polyline points="16 6 12 2 8 6" />
                      <line x1="12" y1="2" x2="12" y2="15" />
                    </svg>
                  </span>
                  <span
                    class="status-pip"
                    [class]="'sp-' + s.status"
                    [class.sp-missed]="isMissed(s)"
                  >{{ displayStatusLabel(s) }}</span>
                </div>
              </div>

              <h3 class="tl-title">{{ s.title }}</h3>
              <p class="tl-notes" *ngIf="s.notes">{{ s.notes }}</p>

              <div class="tl-footer">
                <span class="dur-chip">
                  ⏱ {{ s.plannedDuration }}min prévues{{
                    s.actualDuration ? ' · ' + s.actualDuration + 'min réelles' : ''
                  }}
                </span>
                <div class="tl-acts">
                  <button
                    class="act play"
                    *ngIf="canStart(s)"
                    (click)="startSession(s)"
                    [disabled]="isBusy(s.id)"
                    title="Démarrer"
                  >
                    <svg viewBox="0 0 24 24" fill="currentColor" width="13" height="13">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                  </button>
                  <button
                    class="act edit"
                    *ngIf="!isMissed(s) && (s.status === 'PLANNED' || s.status === 'IN_PROGRESS')"
                    (click)="openEdit(s)"
                    [disabled]="isBusy(s.id)"
                    title="Modifier"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="13"
                      height="13"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    class="act stop"
                    *ngIf="s.status === 'PLANNED' || s.status === 'IN_PROGRESS'"
                    (click)="cancelSession(s)"
                    [disabled]="isBusy(s.id)"
                    title="Annuler"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      width="13"
                      height="13"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="15" y1="9" x2="9" y2="15" />
                      <line x1="9" y1="9" x2="15" y2="15" />
                    </svg>
                  </button>
                  <button class="act del" (click)="deleteSession(s)" [disabled]="isBusy(s.id)" title="Supprimer">
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      width="13"
                      height="13"
                    >
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="tl-empty" *ngIf="filteredSessions().length === 0">
          <div class="empty-icon">📅</div>
          <p class="muted">Aucune session trouvée. Créez-en une ou ajustez vos filtres.</p>
        </div>
      </div>

      <!-- ══ MODAL ══ -->
      <div class="overlay" *ngIf="showModal()" (click)="closeModal()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-head">
            <h3>{{ editId() ? 'Modifier la session' : 'Nouvelle session' }}</h3>
            <button class="close-btn" (click)="closeModal()">✕</button>
          </div>

          <div class="overlap-warn" *ngIf="overlapError">
            ⚠ Ce créneau chevauche une session existante. Choisissez un autre horaire.
          </div>

          <div class="form-body">
            <div class="field">
              <label>Titre *</label>
              <input [(ngModel)]="form.title" placeholder="ex : Révision chapitre 4" />
            </div>
            <div class="field">
              <label>Matière *</label>
              <select [(ngModel)]="form.subjectId">
                <option value="">— Choisir —</option>
                <option *ngFor="let s of subjects()" [value]="s.id">{{ s.name }}</option>
              </select>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Début</label>
                <input
                  type="datetime-local"
                  [(ngModel)]="form.startDateTime"
                  (change)="onTimeChange()"
                />
              </div>
              <div class="field">
                <label>Fin</label>
                <input
                  type="datetime-local"
                  [(ngModel)]="form.endDateTime"
                  (change)="onTimeChange()"
                />
              </div>
            </div>
            <div class="field-row">
              <div class="field">
                <label>Durée prévue (min)</label>
                <input
                  type="number"
                  [(ngModel)]="form.plannedDuration"
                  min="15"
                  step="15"
                  (change)="onDurationChange()"
                />
              </div>
              <div class="field">
                <label>Statut</label>
                <input [value]="statusL(form.status)" disabled />
                <!--
                <select [(ngModel)]="form.status">
                  <option value="PLANNED">Planifiée</option>
                  <option value="IN_PROGRESS">En cours</option>
                  <option value="COMPLETED">Complétée</option>
                  <option value="CANCELLED">Annulée</option>
                </select>
                -->
              </div>
            </div>
            <div class="field">
              <label>Notes</label>
              <input [(ngModel)]="form.notes" placeholder="Objectifs, remarques..." />
            </div>

            <div class="field-check">
              <label class="chk-label">
                <input type="checkbox" [(ngModel)]="form.isShared" (change)="onShareToggle()" />
                <span class="chk-box" [class.checked]="form.isShared">
                  <svg
                    *ngIf="form.isShared"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="3"
                    stroke-linecap="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
                Partager avec mes groupes
              </label>
            </div>

            <div class="groups-grid" *ngIf="form.isShared">
              <p class="groups-hint">Sélectionnez les groupes avec lesquels partager :</p>
              <div class="group-tiles">
                <div
                  class="group-tile"
                  *ngFor="let g of availableGroups"
                  [class.selected]="isGroupSelected(g.id)"
                  [style.--gc]="g.color"
                  (click)="toggleGroup(g.id)"
                >
                  <!-- Cover image (comme dans groups.component) -->
                  <div class="gt-cover">
                    <img class="gt-cover-img" [src]="getGroupCoverImage(g)" [alt]="g.name" />
                    <div class="gt-overlay"></div>
                    <!-- Initiales avatar positionné sur l'image -->
                    <div class="gt-avatar" [style.background]="g.color">
                      {{ groupInitials(g.name) }}
                    </div>
                    <!-- Badge privé -->
                    <span class="gt-priv" *ngIf="g.isPrivate">
                      <svg viewBox="0 0 16 16" fill="currentColor" width="9" height="9">
                        <path
                          fill-rule="evenodd"
                          d="M8 1a3 3 0 00-3 3v1H4a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0
                 001-1V6a1 1 0 00-1-1h-1V4a3 3 0 00-3-3zm0 2a1 1 0 00-1 1v1h2V4
                 a1 1 0 00-1-1zm0 6a1 1 0 100 2 1 1 0 000-2z"
                          clip-rule="evenodd"
                        />
                      </svg>
                      Privé
                    </span>
                    <!-- Check sélection -->
                    <div class="gt-check" *ngIf="isGroupSelected(g.id)">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  </div>

                  <!-- Infos sous la cover -->
                  <div class="gt-body">
                    <div class="gt-top">
                      <span class="gt-name">{{ g.name }}</span>
                      <span class="gt-members">{{ g.memberCount || 0 }} membres</span>
                    </div>
                    <p class="gt-desc" *ngIf="g.description">{{ g.description }}</p>
                    <!-- Barre de remplissage -->
                    <div class="gt-slot-bar">
                      <div
                        class="gt-slot-fill"
                        [style.width.%]="((g.memberCount || 1) / (g.maxMembers || 10)) * 100"
                        [style.background]="g.color"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              <p class="groups-none" *ngIf="selectedGroupIds.length === 0 && form.isShared">
                ⚠ Sélectionnez au moins un groupe.
              </p>
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn-ghost" (click)="closeModal()">Annuler</button>
            <button
              class="btn-accent"
              (click)="save()"
              [disabled]="
                !form.title.trim() ||
                !form.subjectId ||
                overlapError ||
                invalidRange() ||
                isPlanningInPast() ||
                isSubmitting() ||
                (form.isShared && selectedGroupIds.length === 0)
              "
            >
              {{ editId() ? 'Enregistrer' : 'Créer' }}
            </button>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: 0 32px 32px;
        --yellow: #f5c518;
        --yellow-soft: #ffe066;
        --yellow-deep: #d4a90e;
        --coral: #ff6b5b;
        --coral-soft: #ff9588;
        --dark: #1a1a1a;
        --green: #2da96a;
        --green-soft: #5bd49a;
        --cream: #fffaf1;
        --warm-card: linear-gradient(145deg, #fffaf1 0%, #f3e8d6 100%);
        --sand: #e8dfd0;
        --text: #1a1a1a;
        --text-muted: #82776a;
        --border: rgba(92, 66, 32, 0.09);
        --radius-lg: 18px;
        --shadow-sm: 0 8px 24px rgba(88, 62, 25, 0.08);
        --shadow-md: 0 18px 44px rgba(88, 62, 25, 0.13);
        --shadow-warm: 0 22px 50px rgba(214, 137, 92, 0.16), 0 8px 22px rgba(245, 197, 24, 0.1);
        color: var(--text);
        font-family: 'Plus Jakarta Sans', sans-serif;
      }
      @keyframes fadeRise {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(91, 212, 154, .55); }
        70% { box-shadow: 0 0 0 12px rgba(91, 212, 154, 0); }
      }
      @keyframes spin { to { transform: rotate(360deg); } }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes shimmer {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(420%); }
      }
      .page {
        display: flex;
        flex-direction: column;
        gap: 22px;
        animation: fadeRise 520ms cubic-bezier(.22,1,.36,1) both;
      }

      /* ═════════ LIVE HERO ═════════ */
      .live-hero {
        position: relative;
        background: linear-gradient(145deg, #1a1a1a 0%, #232017 55%, #1a1a1a 100%);
        border-radius: var(--radius-lg);
        padding: 30px 32px 28px;
        color: #fff;
        overflow: hidden;
        box-shadow: 0 18px 44px rgba(0, 0, 0, 0.32);
      }
      .hero-glow {
        position: absolute;
        width: 320px;
        height: 320px;
        background: radial-gradient(circle, rgba(245, 197, 24, 0.22), transparent 65%);
        top: -120px;
        right: -80px;
        border-radius: 50%;
        pointer-events: none;
        animation: float 7s ease-in-out infinite;
      }
      .hero-glow2 {
        position: absolute;
        width: 220px;
        height: 220px;
        background: radial-gradient(circle, rgba(255, 107, 91, 0.18), transparent 65%);
        bottom: -60px;
        left: -40px;
        border-radius: 50%;
        pointer-events: none;
        animation: float 9s ease-in-out infinite -2s;
      }
      .hero-content { position: relative; z-index: 1; }
      .live-badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 6px 14px;
        border-radius: 999px;
        background: rgba(91, 212, 154, 0.16);
        border: 1px solid rgba(91, 212, 154, 0.4);
        color: #9ff0c5;
        font-size: 0.72rem;
        font-weight: 800;
        letter-spacing: 0.1em;
      }
      .live-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #5bd49a;
        animation: pulse 1.6s ease-in-out infinite;
      }
      .hero-title {
        margin: 14px 0 4px;
        font-size: 1.75rem;
        font-weight: 800;
        letter-spacing: -0.03em;
        color: #fff;
      }
      .hero-sub {
        margin: 0 0 20px;
        color: rgba(255, 255, 255, 0.6);
        font-size: 0.9rem;
      }
      .timer-core {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(245, 197, 24, 0.16);
        border-radius: 16px;
        padding: 22px 24px;
        margin-bottom: 18px;
      }
      .arc-row {
        display: flex;
        align-items: center;
        gap: 28px;
        flex-wrap: wrap;
      }
      .arc-wrap {
        position: relative;
        width: 130px;
        height: 130px;
        flex-shrink: 0;
      }
      .arc-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
      .arc-track {
        fill: none;
        stroke: rgba(255, 255, 255, 0.08);
        stroke-width: 8;
      }
      .arc-fill {
        fill: none;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 295.31;
        transition: stroke-dashoffset 600ms cubic-bezier(.22,1,.36,1);
        filter: drop-shadow(0 0 8px rgba(91, 212, 154, 0.45));
      }
      .arc-overtime {
        fill: none;
        stroke: #ff6b5b;
        stroke-width: 8;
        stroke-linecap: round;
        stroke-dasharray: 295.31;
        transition: stroke-dashoffset 600ms cubic-bezier(.22,1,.36,1);
      }
      .arc-center {
        position: absolute;
        inset: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .arc-time {
        font-size: 1.5rem;
        font-weight: 800;
        color: #fff;
        line-height: 1;
        letter-spacing: -0.02em;
      }
      .arc-label {
        margin-top: 4px;
        font-size: 0.62rem;
        font-weight: 800;
        color: var(--yellow);
        letter-spacing: 0.12em;
      }
      .arc-stats {
        display: flex;
        gap: 22px;
        flex: 1;
        min-width: 0;
      }
      .stat-item { display: flex; flex-direction: column; gap: 3px; }
      .stat-key {
        font-size: 0.62rem;
        font-weight: 900;
        color: rgba(245, 197, 24, 0.85);
        letter-spacing: 0.1em;
      }
      .stat-val {
        font-size: 1.4rem;
        font-weight: 800;
        color: #fff;
        line-height: 1;
        letter-spacing: -0.02em;
      }
      .stat-sub {
        font-size: 0.72rem;
        color: rgba(255, 255, 255, 0.48);
      }
      .seg-bar-wrap { margin-top: 18px; }
      .seg-bar-labels {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
      }
      .seg-label {
        font-size: 0.68rem;
        font-weight: 700;
        color: rgba(255, 255, 255, 0.45);
        letter-spacing: 0.08em;
      }
      .seg-label.active { color: var(--yellow); }
      .seg-track {
        position: relative;
        height: 10px;
        background: rgba(255, 255, 255, 0.06);
        border-radius: 999px;
        overflow: visible;
        box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
      }
      .seg-fill {
        height: 100%;
        border-radius: inherit;
        position: relative;
        transition: width 600ms cubic-bezier(.22,1,.36,1);
        box-shadow: 0 0 14px rgba(245, 197, 24, 0.35);
      }
      .seg-thumb {
        position: absolute;
        right: -6px;
        top: 50%;
        transform: translateY(-50%);
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 3px solid #1a1a1a;
        box-shadow: 0 0 12px currentColor;
      }
      .thumb-tag {
        position: absolute;
        top: -34px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff;
        color: #1a1a1a;
        font-size: 0.62rem;
        font-weight: 800;
        padding: 4px 8px;
        border-radius: 6px;
        white-space: nowrap;
      }
      .seg-markers {
        display: flex;
        justify-content: space-between;
        margin-top: 8px;
      }
      .seg-marker-val {
        font-size: 0.66rem;
        color: rgba(255, 255, 255, 0.42);
        font-weight: 700;
      }
      .seg-marker-val.live { color: var(--yellow); font-weight: 800; }

      .stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-bottom: 18px;
      }
      .stat-chip {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(245, 197, 24, 0.14);
        border-radius: 12px;
        padding: 11px 14px;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .chip-key {
        font-size: 0.62rem;
        font-weight: 800;
        color: rgba(255, 255, 255, 0.5);
        letter-spacing: 0.1em;
      }
      .chip-val { font-size: 1rem; font-weight: 800; color: #fff; line-height: 1; }
      .chip-val.yellow { color: var(--yellow); }
      .chip-val.green { color: #5bd49a; }
      .chip-val.red { color: #ff8e7e; }
      .chip-sub { font-size: 0.66rem; color: rgba(255, 255, 255, 0.42); }

      .cta-row {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
      }
      .btn-done {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 24px;
        border-radius: 999px;
        background: linear-gradient(135deg, var(--yellow-soft), var(--yellow));
        color: #1a1a1a;
        font-weight: 800;
        font-size: 0.92rem;
        border: none;
        cursor: pointer;
        box-shadow: 0 10px 28px rgba(245, 197, 24, 0.35);
        transition: transform 200ms ease, box-shadow 200ms ease;
      }
      .btn-done:hover:not(:disabled) {
        transform: translateY(-2px);
        box-shadow: 0 14px 32px rgba(245, 197, 24, 0.45);
      }
      .btn-done:disabled { opacity: 0.55; cursor: not-allowed; }
      .check-icon { width: 16px; height: 16px; fill: none; stroke: currentColor; stroke-width: 3; stroke-linecap: round; stroke-linejoin: round; }
      .pct-badge {
        font-size: 0.78rem;
        color: rgba(255, 255, 255, 0.6);
        font-weight: 700;
      }
      .pct-badge span { color: var(--yellow); font-weight: 800; }

      /* ═════════ PAGE HEAD ═════════ */
      .page-head {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
      }
      .eyebrow {
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: var(--text-muted);
        margin: 0 0 4px;
      }
      .page-head h2 {
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        margin: 0;
        color: var(--text);
      }
      .head-actions { display: flex; gap: 10px; }
      .btn-accent {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 12px 22px;
        border-radius: 999px;
        background: var(--dark);
        color: var(--yellow);
        border: none;
        font-weight: 800;
        font-size: 0.9rem;
        cursor: pointer;
        transition: transform 200ms ease, box-shadow 200ms ease;
        box-shadow: 0 8px 22px rgba(0, 0, 0, 0.22);
      }
      .btn-accent:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3);
      }
      .plus {
        background: var(--yellow);
        color: #1a1a1a;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-weight: 900;
      }

      /* ═════════ STATS STRIP ═════════ */
      .stats-strip {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 14px;
      }
      .sc {
        background: var(--warm-card);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 16px 18px;
        box-shadow: var(--shadow-sm);
        position: relative;
        overflow: hidden;
        transition: transform 250ms cubic-bezier(.22,1,.36,1), box-shadow 250ms ease;
      }
      .sc::before {
        content: '';
        position: absolute;
        inset: 0;
        background: radial-gradient(circle at 100% 0%, currentColor, transparent 60%);
        opacity: 0.08;
        pointer-events: none;
      }
      .sc:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
      }
      .sc span {
        display: block;
        font-size: 1.75rem;
        font-weight: 900;
        letter-spacing: -0.04em;
        line-height: 1;
        margin-bottom: 4px;
        color: var(--text);
      }
      .sc p {
        margin: 0;
        font-size: 0.72rem;
        font-weight: 800;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .sc--yellow { color: #d4a90e; border-color: rgba(245, 197, 24, 0.3); }
      .sc--blue   { color: #5b7fef; border-color: rgba(108, 142, 239, 0.3); }
      .sc--green  { color: var(--green); border-color: rgba(45, 169, 106, 0.3); }
      .sc--grey   { color: #8a8175; }
      .sc--dark {
        background: var(--dark);
        border-color: rgba(245, 197, 24, 0.25);
        color: var(--yellow);
      }
      .sc--dark span { color: var(--yellow); text-shadow: 0 0 12px rgba(245, 197, 24, 0.4); }
      .sc--dark p { color: rgba(255, 255, 255, 0.6); }

      /* ═════════ FEEDBACK ═════════ */
      .feedback {
        padding: 12px 16px;
        border-radius: 14px;
        font-size: 0.88rem;
        font-weight: 700;
        animation: fadeRise 280ms ease both;
      }
      .feedback.success {
        background: rgba(45, 169, 106, 0.12);
        color: #1a7a4a;
        border: 1px solid rgba(45, 169, 106, 0.28);
      }
      .feedback.error {
        background: rgba(255, 107, 91, 0.12);
        color: #c04a3a;
        border: 1px solid rgba(255, 107, 91, 0.28);
      }

      /* ═════════ FILTERS ═════════ */
      .filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 16px;
        flex-wrap: wrap;
      }
      .filter-tabs {
        display: flex;
        gap: 6px;
        padding: 5px;
        background: rgba(255, 255, 255, 0.6);
        border: 1px solid var(--border);
        border-radius: 999px;
        backdrop-filter: blur(4px);
      }
      .tab {
        padding: 8px 16px;
        border-radius: 999px;
        background: transparent;
        border: none;
        color: var(--text-muted);
        font-size: 0.82rem;
        font-weight: 800;
        cursor: pointer;
        transition: all 200ms ease;
      }
      .tab:hover { color: var(--text); background: rgba(245, 197, 24, 0.08); }
      .tab.active {
        background: var(--dark);
        color: var(--yellow);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
      }
      .fsel {
        padding: 10px 14px;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: var(--cream);
        font-size: 0.88rem;
        font-weight: 700;
        color: var(--text);
        outline: none;
        cursor: pointer;
        transition: all 180ms ease;
      }
      .fsel:focus {
        border-color: var(--yellow);
        background: #fff;
        box-shadow: 0 0 0 4px rgba(245, 197, 24, 0.12);
      }

      /* ═════════ TIMELINE ═════════ */
      .timeline {
        position: relative;
        padding: 10px 0 20px;
      }
      .tl-track {
        position: absolute;
        top: 0;
        bottom: 0;
        left: 30px;
        width: 2px;
        background: linear-gradient(180deg,
          transparent 0%,
          rgba(245, 197, 24, 0.25) 8%,
          rgba(245, 197, 24, 0.25) 92%,
          transparent 100%);
        border-radius: 999px;
      }
      .tl-item {
        position: relative;
        display: flex;
        align-items: flex-start;
        gap: 24px;
        margin-bottom: 18px;
        padding-left: 8px;
        animation: fadeRise 480ms cubic-bezier(.22,1,.36,1) both;
        animation-delay: calc(var(--i, 0) * 70ms);
      }
      .tl-node {
        position: relative;
        flex-shrink: 0;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        margin-top: 18px;
        margin-left: 19px;
        z-index: 1;
        box-shadow: 0 0 0 4px var(--cream), 0 0 14px currentColor;
        transition: transform 280ms ease;
      }
      .tl-item:hover .tl-node { transform: scale(1.15); }
      .node-pulse {
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: inherit;
        animation: pulse 1.8s ease-in-out infinite;
      }
      .tl-card {
        flex: 1;
        position: relative;
        background: var(--warm-card);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: var(--shadow-sm);
        overflow: hidden;
        transition: transform 320ms cubic-bezier(.22,1,.36,1), box-shadow 320ms ease, border-color 320ms ease;
      }
      .tl-card:hover {
        transform: translateY(-3px);
        box-shadow: var(--shadow-md);
        border-color: rgba(245, 197, 24, 0.25);
      }
      .tl-beam {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        width: 4px;
        border-radius: 999px 0 0 999px;
        box-shadow: 0 0 14px currentColor;
      }
      .tl-card-inner { padding: 16px 20px 16px 22px; }
      .tl-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 12px;
        flex-wrap: wrap;
      }
      .tl-left { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
      .subj-pill {
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 0.74rem;
        font-weight: 800;
        letter-spacing: 0.02em;
        border: 1px solid currentColor;
      }
      .tl-time {
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 700;
      }
      .tl-badges { display: flex; gap: 8px; align-items: center; }
      .shared-badge {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: rgba(245, 197, 24, 0.14);
        color: #d4a90e;
      }
      .shared-badge svg { width: 13px; height: 13px; }
      .status-pip {
        padding: 4px 11px;
        border-radius: 999px;
        font-size: 0.7rem;
        font-weight: 800;
        letter-spacing: 0.04em;
      }
      .sp-PLANNED      { background: #fff3d9; color: #8b6e00; }
      .sp-IN_PROGRESS  { background: #d8f7e6; color: #1a7a4a; }
      .sp-COMPLETED    { background: #e6f4f1; color: #2da96a; }
      .sp-CANCELLED    { background: #f0ece4; color: #8a8175; }
      .sp-missed       { background: #ffe5e0; color: #c04a3a; }
      .tl-title {
        margin: 8px 0 4px;
        font-size: 1.05rem;
        font-weight: 800;
        color: var(--text);
        letter-spacing: -0.01em;
      }
      .tl-notes {
        margin: 0 0 8px;
        font-size: 0.84rem;
        color: var(--text-muted);
      }
      .tl-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        margin-top: 6px;
        padding-top: 10px;
        border-top: 1px dashed var(--border);
      }
      .dur-chip {
        font-size: 0.74rem;
        color: var(--text-muted);
        font-weight: 700;
      }
      .tl-acts { display: flex; gap: 6px; }
      .act {
        width: 30px;
        height: 30px;
        border-radius: 9px;
        border: 1.5px solid var(--border);
        background: #fff;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 180ms ease;
      }
      .act:hover:not(:disabled) {
        transform: scale(1.06);
        border-color: var(--text);
      }
      .act:disabled { opacity: 0.4; cursor: not-allowed; }
      .act.play { color: var(--green); border-color: rgba(45, 169, 106, 0.3); }
      .act.play:hover { background: var(--green); color: #fff; border-color: var(--green); }
      .act.edit { color: #d4a90e; border-color: rgba(245, 197, 24, 0.3); }
      .act.edit:hover { background: var(--yellow); color: #1a1a1a; border-color: var(--yellow); }
      .act.stop { color: #c04a3a; border-color: rgba(192, 74, 58, 0.3); }
      .act.stop:hover { background: var(--coral); color: #fff; border-color: var(--coral); }
      .act.del { color: #8a8175; }
      .act.del:hover { background: var(--coral); color: #fff; border-color: var(--coral); }
      .tl-live .tl-card { border-color: rgba(45, 169, 106, 0.32); }
      .tl-done .tl-card { opacity: 0.85; }
      .tl-done .tl-title { color: var(--text-muted); }
      .tl-cancelled .tl-card { opacity: 0.65; }
      .tl-cancelled .tl-title { text-decoration: line-through; color: var(--text-muted); }
      .tl-selected .tl-card {
        border-color: var(--yellow);
        box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.18), var(--shadow-md);
      }

      .tl-empty {
        text-align: center;
        padding: 60px 24px;
        background: var(--warm-card);
        border-radius: var(--radius-lg);
        border: 1px dashed var(--border);
      }
      .empty-icon { font-size: 3rem; margin-bottom: 12px; }
      .muted { color: var(--text-muted); font-size: 0.9rem; }

      /* ═════════ MODAL ═════════ */
      .overlay {
        position: fixed;
        inset: 0;
        background: rgba(26, 26, 26, 0.55);
        backdrop-filter: blur(6px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        animation: fadeRise 240ms ease both;
        padding: 24px;
      }
      .modal {
        background: #fff;
        border-radius: 22px;
        max-width: 580px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 32px 80px rgba(0, 0, 0, 0.4);
        animation: fadeRise 360ms cubic-bezier(.22,1,.36,1) both;
      }
      .modal-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 22px 26px 16px;
        border-bottom: 1px solid var(--border);
      }
      .modal-head h3 {
        margin: 0;
        font-size: 1.2rem;
        font-weight: 800;
        letter-spacing: -0.02em;
        color: var(--text);
      }
      .close-btn {
        width: 32px;
        height: 32px;
        border-radius: 10px;
        background: #f5f0e8;
        border: none;
        cursor: pointer;
        font-size: 1rem;
        color: var(--text-muted);
        transition: all 180ms ease;
      }
      .close-btn:hover {
        background: var(--coral);
        color: #fff;
        transform: rotate(90deg);
      }
      .overlap-warn {
        margin: 14px 26px 0;
        padding: 10px 14px;
        background: #ffe5e0;
        color: #c04a3a;
        border-radius: 12px;
        font-size: 0.82rem;
        font-weight: 700;
        border: 1px solid rgba(192, 74, 58, 0.2);
      }
      .form-body {
        padding: 20px 26px 16px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .field { display: flex; flex-direction: column; gap: 6px; }
      .field label {
        font-size: 0.74rem;
        font-weight: 800;
        color: var(--text-muted);
        text-transform: uppercase;
        letter-spacing: 0.06em;
      }
      .field input, .field select {
        padding: 11px 14px;
        border-radius: 12px;
        border: 1.5px solid var(--border);
        background: #faf8f5;
        font-size: 0.9rem;
        color: var(--text);
        outline: none;
        transition: all 180ms ease;
        font-family: inherit;
      }
      .field input:focus, .field select:focus {
        border-color: var(--yellow);
        background: #fff;
        box-shadow: 0 0 0 4px rgba(245, 197, 24, 0.12);
      }
      .field input:disabled {
        background: #f5f0e8;
        color: var(--text-muted);
      }
      .field-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .field-check { margin-top: 4px; }
      .chk-label {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text);
      }
      .chk-label input { display: none; }
      .chk-box {
        width: 22px;
        height: 22px;
        border-radius: 7px;
        border: 2px solid var(--border);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: all 200ms ease;
      }
      .chk-box svg {
        width: 14px;
        height: 14px;
        color: #fff;
      }
      .chk-box.checked {
        background: var(--yellow);
        border-color: var(--yellow);
      }

      /* === Groups grid === */
      .groups-grid {
        background: var(--cream);
        border: 1px solid var(--border);
        border-radius: 14px;
        padding: 14px;
        animation: fadeRise 280ms ease both;
      }
      .groups-hint {
        margin: 0 0 12px;
        font-size: 0.78rem;
        color: var(--text-muted);
        font-weight: 700;
      }
      .group-tiles {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
        gap: 12px;
      }
      .group-tile {
        background: #fff;
        border: 2px solid var(--border);
        border-radius: 14px;
        cursor: pointer;
        overflow: hidden;
        transition: all 240ms cubic-bezier(.22,1,.36,1);
        --gc: var(--yellow);
      }
      .group-tile:hover {
        transform: translateY(-3px);
        box-shadow: 0 14px 30px rgba(0, 0, 0, 0.1);
        border-color: var(--gc);
      }
      .group-tile.selected {
        border-color: var(--gc);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--gc) 30%, transparent), 0 12px 28px rgba(0, 0, 0, 0.12);
      }
      .gt-cover {
        position: relative;
        aspect-ratio: 16/9;
        overflow: hidden;
      }
      .gt-cover-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }
      .gt-overlay {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, transparent 40%, rgba(0, 0, 0, 0.55) 100%);
      }
      .gt-avatar {
        position: absolute;
        bottom: 10px;
        left: 10px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        background: var(--gc);
        color: #fff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.7rem;
        font-weight: 900;
        border: 2px solid #fff;
      }
      .gt-priv {
        position: absolute;
        top: 8px;
        right: 8px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 3px 7px;
        background: rgba(0, 0, 0, 0.6);
        color: #fff;
        border-radius: 999px;
        font-size: 0.62rem;
        font-weight: 800;
        backdrop-filter: blur(4px);
      }
      .gt-check {
        position: absolute;
        top: 8px;
        left: 8px;
        width: 26px;
        height: 26px;
        background: var(--gc);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        animation: fadeRise 200ms ease both;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      }
      .gt-check svg { width: 14px; height: 14px; }
      .gt-body { padding: 10px 12px 12px; }
      .gt-top {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 6px;
      }
      .gt-name {
        font-size: 0.86rem;
        font-weight: 800;
        color: var(--text);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .gt-members {
        font-size: 0.66rem;
        color: var(--text-muted);
        font-weight: 700;
        white-space: nowrap;
      }
      .gt-desc {
        margin: 4px 0 8px;
        font-size: 0.7rem;
        color: var(--text-muted);
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .gt-slot-bar {
        height: 4px;
        background: rgba(0, 0, 0, 0.06);
        border-radius: 999px;
        overflow: hidden;
      }
      .gt-slot-fill {
        height: 100%;
        border-radius: inherit;
        transition: width 600ms cubic-bezier(.22,1,.36,1);
      }
      .groups-none {
        margin: 10px 0 0;
        padding: 8px 12px;
        background: #ffe5e0;
        color: #c04a3a;
        border-radius: 8px;
        font-size: 0.78rem;
        font-weight: 700;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        padding: 16px 26px 22px;
        border-top: 1px solid var(--border);
      }
      .btn-ghost {
        padding: 11px 22px;
        border-radius: 999px;
        background: #f5f0e8;
        color: var(--text);
        border: none;
        font-weight: 700;
        font-size: 0.88rem;
        cursor: pointer;
        transition: all 180ms ease;
      }
      .btn-ghost:hover { background: var(--sand); }

      /* ═════════ RESPONSIVE ═════════ */
      @media (max-width: 900px) {
        :host { padding: 0 20px 28px; }
        .stats-strip { grid-template-columns: repeat(2, 1fr); }
        .sc--dark { grid-column: span 2; }
        .filters { flex-direction: column; align-items: stretch; }
        .filter-tabs { overflow-x: auto; }
        .stats-row { grid-template-columns: 1fr; }
        .arc-stats { width: 100%; }
        .field-row { grid-template-columns: 1fr; }
      }
      @media (max-width: 600px) {
        :host { padding: 0 14px 24px; }
        .page-head { flex-direction: column; align-items: flex-start; }
        .tl-track { display: none; }
        .tl-item { padding-left: 0; gap: 12px; }
        .tl-node { margin-left: 0; }
        .stats-strip { grid-template-columns: 1fr 1fr; }
        .live-hero { padding: 22px 20px; }
        .hero-title { font-size: 1.4rem; }
      }
    `,
  ],
})
export class SessionsComponent implements OnInit, OnDestroy {
  svc = inject(SessionService);
  subjSvc = inject(SubjectService);
  groupSvc = inject(GroupService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  subjects = this.subjSvc.subjects;
  filterStatus = signal<FilterStatus>('ALL');
  filterSubjectId = signal<string>('');
  showModal = signal(false);
  editId = signal<string | null>(null);
  form = this.emptyForm();
  overlapError = false;
  successMessage = signal('');
  errorMessage = signal('');
  isSubmitting = signal(false);
  busyIds = signal<Set<string>>(new Set());
  highlightedSessionId = signal<string | null>(null);

  // Timer state
  elapsedLabel = '';
  elapsedLabelDetailed = '';
  remainLabel = '';
  timerPercent = 0;
  timerPercentActual = 0;
  normalPercent = 0;
  overtimePercent = 0;
  isOvertime = false;
  overtimeAmount = '';
  overtimePercentLabel = '';
  lostTimeLabel = '0 min';
  overtimeEndTime: Date | null = null;
  currentTimeDisplay = '';
  elapsedTimeFormatted = '';
  arcOffset = 295;
  overtimeArcOffset = 295;
  private timerRef: ReturnType<typeof setInterval> | null = null;
  private autoCompletingIds = new Set<string>();

  availableGroups: StudyGroup[] = [];
  selectedGroupIds: string[] = [];
  localTimezone: string | undefined = undefined;

  filterOpts = [
    { l: 'Toutes', v: 'ALL' as FilterStatus },
    { l: 'Planifiées', v: 'PLANNED' as FilterStatus },
    { l: 'En cours', v: 'IN_PROGRESS' as FilterStatus },
    { l: 'Complétées', v: 'COMPLETED' as FilterStatus },
    { l: 'Annulées', v: 'CANCELLED' as FilterStatus },
  ];

  Math = Math;
  CIRCUMFERENCE = 2 * Math.PI * 47;

  get liveSession() {
    return this.svc.sessions().find((s) => s.status === 'IN_PROGRESS') || null;
  }

  get nextSession() {
    const now = new Date();
    return (
      this.svc
        .sessions()
        .filter((s) => {
          const start = this.sessionDate(s.startDateTime);
          return s.status === 'PLANNED' && !!start && start > now;
        })
        .sort((a, b) => a.startDateTime.localeCompare(b.startDateTime))[0] || null
    );
  }

  countdownLabel = '';
  countdownPercent = 0;

  isNextSession(s: StudySession): boolean {
    return !!this.nextSession && this.nextSession.id === s.id;
  }

  filteredSessions = computed(() => {
    let list = this.svc.sessions();
    if (this.filterStatus() !== 'ALL') list = list.filter((s) => s.status === this.filterStatus());
    const subj = this.filterSubjectId();
    if (subj) list = list.filter((s) => s.subjectId === subj);
    return list.sort((a, b) => a.startDateTime.localeCompare(b.startDateTime));
  });

  countByStatus(st: SessionStatus) {
    return this.svc.sessions().filter((s) => s.status === st).length;
  }

  get totalMin() {
    return this.svc.sessions()
      .filter((s) => s.status === 'PLANNED')
      .reduce((a, s) => a + (s.plannedDuration || this.durationFromDates(s)), 0);
  }

  statusL(s: SessionStatus) {
    return {
      PLANNED: 'Planifiée',
      IN_PROGRESS: 'En cours',
      COMPLETED: 'Complétée',
      CANCELLED: 'Annulée',
    }[s];
  }

  displayStatusLabel(s: StudySession): string {
    if (this.isMissed(s)) return 'Session manquee';
    return this.statusL(s.status);
  }

  canStart(s: StudySession): boolean {
    const now = new Date();
    const start = this.sessionDate(s.startDateTime);
    const end = this.sessionDate(s.endDateTime);
    return s.status === 'PLANNED'
      && !!start
      && !!end
      && now >= start
      && now < end;
  }

  isBusy(id: string): boolean {
    return this.busyIds().has(id);
  }

  invalidRange(): boolean {
    if (!this.form.startDateTime || !this.form.endDateTime) return true;
    return new Date(this.form.startDateTime).getTime() >= new Date(this.form.endDateTime).getTime();
  }

  isPlanningInPast(): boolean {
    if (!this.form.startDateTime) return true;
    return new Date(this.form.startDateTime).getTime() <= Date.now();
  }

  isMissed(s: StudySession): boolean {
    const end = this.sessionDate(s.endDateTime);
    return s.status === 'PLANNED' && !!end && new Date() >= end;
  }

  private durationFromDates(s: Pick<StudySession, 'startDateTime' | 'endDateTime'>): number {
    const start = this.sessionDate(s.startDateTime);
    const end = this.sessionDate(s.endDateTime);
    if (!start || !end) return 0;
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }

  private sessionDate(value?: string): Date | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private minutesLabel(minutes: number): string {
    const safe = Math.max(0, minutes);
    if (safe < 60) return `${safe} min`;
    const h = Math.floor(safe / 60);
    const m = safe % 60;
    return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
  }

  // Nouvelle méthode pour l'image de couverture d'un groupe
  getGroupCoverImage(group: StudyGroup): string {
    return COVER_IMAGES[group.color || ''] || DEFAULT_COVER;
  }

  // Vérifier si un groupe est sélectionné
  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupIds.includes(groupId);
  }

  ngOnInit() {
    this.highlightedSessionId.set(this.route.snapshot.queryParamMap.get('sessionId'));
    // GET /api/sessions + /api/subjects au montage
    this.svc.list().subscribe();
    this.subjSvc.list().subscribe();
    this.groupSvc.list().subscribe({
      next: groups => this.availableGroups = [...groups].sort((a, b) => a.name.localeCompare(b.name)),
      error: err => {
        console.error('Erreur chargement groupes:', err);
        this.availableGroups = [];
      }
    });

    setTimeout(() => this.cdr.detectChanges(), 0);
    this.updateTimer();
    this.timerRef = setInterval(() => {
      this.updateTimer();
      this.cdr.detectChanges();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timerRef) clearInterval(this.timerRef);
  }

  private formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  private updateTimer() {
    const now = Date.now();

    const next = this.nextSession;
    if (next) {
      const msUntil = new Date(next.startDateTime).getTime() - now;
      const minUntil = Math.ceil(msUntil / 60000);
      if (minUntil < 60) {
        this.countdownLabel = `${minUntil} min`;
      } else {
        const h = Math.floor(minUntil / 60);
        const m = minUntil % 60;
        this.countdownLabel = m > 0 ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
      }
      const windowMs = 24 * 60 * 60 * 1000;
      this.countdownPercent = Math.round(Math.min(100, (msUntil / windowMs) * 100));
    } else {
      this.countdownLabel = '';
      this.countdownPercent = 0;
    }

    const live = this.liveSession;
    if (!live) {
      this.elapsedLabel = '';
      this.remainLabel = '';
      this.timerPercent = 0;
      return;
    }
    const scheduledStart = new Date(live.startDateTime).getTime();
    const scheduledEnd = new Date(live.endDateTime).getTime();
    const start = new Date(live.startedAt || this.svc.getStartedAt(live.id) || new Date().toISOString()).getTime();
    const plannedMs = Math.max(1, (live.plannedDuration || this.durationFromDates(live) || 60) * 60 * 1000);
    const timerEnd = scheduledEnd;
    const effectiveNow = Math.min(now, timerEnd);
    const elapsedMs = Math.max(0, effectiveNow - start);
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const lostMs = Math.max(0, start - scheduledStart);
    this.lostTimeLabel = this.minutesLabel(Math.floor(lostMs / 60000));

    this.elapsedTimeFormatted = this.formatTime(elapsedSec);
    const rawElapsedPercent = (elapsedMs / plannedMs) * 100;
    const elapsedPercent = Math.min(100, rawElapsedPercent);
    this.timerPercentActual = Math.round(rawElapsedPercent);
    this.isOvertime = now >= timerEnd;

    if (!this.isOvertime) {
      this.normalPercent = elapsedPercent;
      this.overtimePercent = 0;
      const remainingMs = Math.max(0, timerEnd - now);
      const remainingMin = Math.ceil(remainingMs / 60000);
      this.remainLabel =
        remainingMin < 60
          ? `${remainingMin} min`
          : `${Math.floor(remainingMin / 60)}h${String(remainingMin % 60).padStart(2, '0')}`;
      this.timerPercent = 100 - elapsedPercent;
      this.overtimeAmount = '';
      this.overtimePercentLabel = '';
      this.overtimeEndTime = null;
      this.arcOffset = this.CIRCUMFERENCE - (elapsedPercent / 100) * this.CIRCUMFERENCE;
    } else {
      this.normalPercent = 100;
      const overtimeMs = Math.max(0, now - timerEnd);
      const overtimeMin = Math.floor(overtimeMs / 60000);
      const overtimeHours = Math.floor(overtimeMin / 60);
      const overtimeMins = overtimeMin % 60;
      this.overtimeAmount =
        overtimeHours > 0
          ? `${overtimeHours}h${String(overtimeMins).padStart(2, '0')}`
          : `${overtimeMin} min`;
      const overtimePercentValue = Math.min(100, Math.round((overtimeMs / plannedMs) * 100));
      this.overtimePercent = overtimePercentValue;
      this.overtimePercentLabel = `+${overtimePercentValue}%`;
      this.remainLabel = 'Dépassé';
      this.timerPercent = 0;
      this.overtimeEndTime = new Date(now);
      this.arcOffset = 0;
      this.overtimeArcOffset =
        this.CIRCUMFERENCE - (overtimePercentValue / 100) * this.CIRCUMFERENCE;
      this.remainLabel = '00:00';
      this.autoCompleteLiveSession(live);
    }

    const elapsedMin = Math.floor(elapsedMs / 60000);
    const elapsedHours = Math.floor(elapsedMin / 60);
    const elapsedMins = elapsedMin % 60;

    if (elapsedHours > 0) {
      this.elapsedLabel = `${elapsedHours}h${String(elapsedMins).padStart(2, '0')}`;
      this.elapsedLabelDetailed = `${elapsedHours}h${String(elapsedMins).padStart(2, '0')}`;
    } else {
      this.elapsedLabel = `${elapsedMin} min`;
      this.elapsedLabelDetailed = `${elapsedMin} min`;
    }

    const nowDate = new Date(now);
    this.currentTimeDisplay = `${String(nowDate.getHours()).padStart(2, '0')}:${String(nowDate.getMinutes()).padStart(2, '0')}`;
  }

  openCreate() {
    this.form = this.emptyForm();
    this.editId.set(null);
    this.selectedGroupIds = [];
    this.overlapError = false;
    this.showModal.set(true);
  }

  openEdit(s: StudySession) {
    this.form = {
      title: s.title,
      subjectId: s.subjectId,
      status: s.status,
      startDateTime: this.formatDateTimeLocal(new Date(s.startDateTime)),
      endDateTime: this.formatDateTimeLocal(new Date(s.endDateTime)),
      plannedDuration: s.plannedDuration,
      notes: s.notes || '',
      isShared: s.isShared,
    };
    this.selectedGroupIds = [];
    this.overlapError = false;
    this.editId.set(s.id);
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  onTimeChange() {
    const start = this.form.startDateTime;
    const end = this.form.endDateTime;
    if (!start || !end) {
      this.overlapError = false;
      return;
    }
    const newStart = new Date(start).getTime();
    const newEnd = new Date(end).getTime();
    if (newStart >= newEnd) {
      this.overlapError = false;
      return;
    }
    this.form.plannedDuration = Math.max(0, Math.round((newEnd - newStart) / 60000));
    const currentId = this.editId();

    this.overlapError = this.svc.sessions().some((s) => {
      if (s.id === currentId) return false;
      if (s.status === 'CANCELLED') return false;
      const sStart = new Date(s.startDateTime).getTime();
      const sEnd = new Date(s.endDateTime).getTime();
      return newStart < sEnd && newEnd > sStart;
    });
  }

  onDurationChange(): void {
    const minutes = Number(this.form.plannedDuration);
    if (!this.form.startDateTime || !Number.isFinite(minutes) || minutes <= 0) return;
    const start = new Date(this.form.startDateTime);
    const end = new Date(start.getTime() + minutes * 60000);
    this.form.endDateTime = this.formatDateTimeLocal(end);
    this.onTimeChange();
  }

  onShareToggle() {
    if (!this.form.isShared) this.selectedGroupIds = [];
  }

  toggleGroup(id: string) {
    const idx = this.selectedGroupIds.indexOf(id);
    if (idx === -1) this.selectedGroupIds = [...this.selectedGroupIds, id];
    else this.selectedGroupIds = this.selectedGroupIds.filter((g) => g !== id);
  }

  groupInitials(name: string): string {
    return name
      .split(' ')
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  save() {
    if (!this.form.title.trim() || !this.form.subjectId) return;
    if (this.invalidRange()) {
      this.showError("L'heure de fin doit etre apres l'heure de debut.");
      return;
    }
    if (this.isPlanningInPast()) {
      this.showError('Impossible de planifier une session dans le passé.');
      return;
    }
    if (this.overlapError) return;
    if (this.form.isShared && this.selectedGroupIds.length === 0) return;

    const subj = this.subjects().find((x) => x.id === this.form.subjectId);
    const p = {
      ...this.form,
      startDateTime: this.toApiDateTime(this.form.startDateTime),
      endDateTime: this.toApiDateTime(this.form.endDateTime),
      subjectName: subj?.name,
      subjectColor: subj?.color,
      plannedDuration: Number(this.form.plannedDuration),
      sharedGroupIds: this.form.isShared ? this.selectedGroupIds : [],
    };
    this.isSubmitting.set(true);
    this.clearMessages();
    if (this.editId()) {
      this.svc.update(this.editId()!, p)
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => {
            this.showSuccess('Session modifiee.');
            this.closeModal();
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => this.showError(this.errorText(err)),
        });
    } else {
      this.svc
        .add(p as Omit<StudySession, 'id' | 'createdAt'>)
        .pipe(switchMap(created => {
          if (!this.form.isShared || this.selectedGroupIds.length === 0) return of(created);
          return forkJoin(this.selectedGroupIds.map(groupId => this.groupSvc.shareSession(groupId, created.id))).pipe(
            switchMap(() => of(created))
          );
        }))
        .pipe(finalize(() => this.isSubmitting.set(false)))
        .subscribe({
          next: () => {
            this.showSuccess('Session creee.');
            this.closeModal();
            this.cdr.detectChanges();
          },
          error: (err: HttpErrorResponse) => this.showError(this.errorText(err)),
        });
    }
  }

  startSession(session: StudySession): void {
    this.runSessionAction(session.id, () => this.svc.start(session.id), 'Session demarree.');
  }

  completeSession(session: StudySession): void {
    const actualDuration = this.actualDurationFor(session);
    this.runSessionAction(session.id, () => this.svc.complete(session.id, actualDuration), 'Session terminee.');
  }

  cancelSession(session: StudySession): void {
    this.runSessionAction(session.id, () => this.svc.cancel(session.id), 'Session annulee.');
  }

  deleteSession(session: StudySession) {
    const id = session.id;
    if (confirm('Supprimer cette session ?')) {
      this.runSessionAction(id, () => this.svc.delete(id), 'Session supprimee.');
    }
  }

  private runSessionAction<T>(id: string, action: () => Observable<T>, success: string): void {
    if (this.isBusy(id)) return;
    this.setBusy(id, true);
    this.clearMessages();
    action()
      .pipe(finalize(() => this.setBusy(id, false)))
      .subscribe({
        next: () => {
          this.showSuccess(success);
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.showError(this.errorText(err)),
      });
  }

  private autoCompleteLiveSession(session: StudySession): void {
    if (this.autoCompletingIds.has(session.id)) return;
    this.autoCompletingIds.add(session.id);
    this.svc.complete(session.id, this.actualDurationFor(session))
      .pipe(finalize(() => this.autoCompletingIds.delete(session.id)))
      .subscribe({
        next: () => {
          this.showSuccess('Session terminee automatiquement.');
          this.cdr.detectChanges();
        },
        error: (err: HttpErrorResponse) => this.showError(this.errorText(err)),
      });
  }

  private setBusy(id: string, busy: boolean): void {
    this.busyIds.update((current) => {
      const next = new Set(current);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  private actualDurationFor(session: StudySession): number {
    const startedAt = session.startedAt || this.svc.getStartedAt(session.id);
    if (!startedAt) return session.actualDuration ?? 0;
    const endedAt = Math.min(Date.now(), new Date(session.endDateTime).getTime());
    return Math.max(0, Math.round((endedAt - new Date(startedAt).getTime()) / 60000));
  }

  private clearMessages(): void {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set('');
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set('');
  }

  private errorText(err: HttpErrorResponse): string {
    if (err.status === 401) return 'Vous devez etre connecte pour effectuer cette action.';
    if (err.status === 403) return 'Vous n’avez pas le droit d’effectuer cette action.';
    if (err.error?.message) return err.error.message;
    if (err.status >= 500) return 'Erreur serveur. Reessayez dans un instant.';
    return 'Action impossible pour le moment.';
  }

  private emptyForm() {
    const n = new Date();
    n.setMinutes(0, 0, 0);
    n.setHours(n.getHours() + 1);
    const end = new Date(n.getTime() + 60 * 60000);
    return {
      title: '',
      subjectId: '',
      status: 'PLANNED' as SessionStatus,
      startDateTime: this.formatDateTimeLocal(n),
      endDateTime: this.formatDateTimeLocal(end),
      plannedDuration: 60,
      notes: '',
      isShared: false,
    };
  }

  private formatDateTimeLocal(date: Date): string {
    const pad = (x: number) => String(x).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }

  private toApiDateTime(localDateTime: string): string {
    return new Date(localDateTime).toISOString();
  }
}
