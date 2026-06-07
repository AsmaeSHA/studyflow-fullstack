import { Component, inject, signal, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { GroupService } from '../../core/services/group.service';
import { NotificationService } from '../../core/services/notification.service';
import { StudyGroup, GroupInvitation } from '../../core/models/models';

type Tab = 'groups' | 'invitations';

/** Image de couverture par défaut selon la couleur/sujet du groupe */
const COVER_IMAGES: Record<string, string> = {
  '#F5C518': 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=600&q=80',
  '#FF6B5B': 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=600&q=80',
  '#6B8BFF': 'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=600&q=80',
  '#5BD49A': 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=600&q=80',
};
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=600&q=80';

@Component({
  selector: 'app-groups',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="constellation-root">

      <!-- Drifting stars -->
      <div class="stars-layer" aria-hidden="true">
        <span *ngFor="let s of stars" class="star"
              [style.left]="s.x + '%'" [style.top]="s.y + '%'"
              [style.width]="s.r + 'px'" [style.height]="s.r + 'px'"
              [style.animation-delay]="s.d + 's'" [style.animation-duration]="s.dur + 's'">
        </span>
      </div>

      <!-- â”€â”€ HERO BAR â”€â”€ -->
      <header class="hero-bar">
        <div class="hero-left">
          <div class="hero-icon">
            <svg viewBox="0 0 32 32" fill="none">
              <circle cx="16" cy="16" r="3" fill="#f5c518"/>
              <circle cx="5"  cy="8"  r="2" fill="#ff8e7e" opacity=".8"/>
              <circle cx="27" cy="9"  r="2" fill="#f5c518" opacity=".6"/>
              <circle cx="26" cy="24" r="2" fill="#ff8e7e" opacity=".7"/>
              <circle cx="6"  cy="23" r="2" fill="#f5c518" opacity=".5"/>
              <line x1="16" y1="16" x2="5"  y2="8"  stroke="#f5c518" stroke-width=".6" opacity=".4"/>
              <line x1="16" y1="16" x2="27" y2="9"  stroke="#f5c518" stroke-width=".6" opacity=".4"/>
              <line x1="16" y1="16" x2="26" y2="24" stroke="#f5c518" stroke-width=".6" opacity=".4"/>
              <line x1="16" y1="16" x2="6"  y2="23" stroke="#f5c518" stroke-width=".6" opacity=".4"/>
            </svg>
          </div>
          <div>
            <h2 class="hero-title">Constellations</h2>
            <p class="hero-sub">
              {{ groupsList().length }} groupes &nbsp;·&nbsp;
              {{ pendingCount }} invitation{{ pendingCount !== 1 ? 's' : '' }}
            </p>
          </div>
        </div>

        <div class="hero-actions">
          <div class="tab-cluster">
            <button class="tab-btn" [class.on]="activeTab() === 'groups'"
                    (click)="activeTab.set('groups')">Mes groupes</button>
            <button class="tab-btn" [class.on]="activeTab() === 'invitations'"
                    (click)="activeTab.set('invitations')">
              Invitations
              <span class="inv-badge" *ngIf="pendingCount > 0">{{ pendingCount }}</span>
            </button>
          </div>
          <button class="btn-create" (click)="openCreate()">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
            </svg>
            Créer
          </button>
        </div>
      </header>

      <!-- â•â•â•â• TAB: GROUPES â•â•â•â• -->
      <ng-container *ngIf="activeTab() === 'groups'">
        <div class="cst-grid">
          <article class="cst-card"
                   *ngFor="let g of groupsList(); let i = index; trackBy: trackByGroupId"
                   [style.--gi]="i"
                   [style.--gc]="g.color || '#f5c518'">
            
            <!-- Cover image -->
            <div class="cst-cover">
              <img class="cover-img"
                   [src]="g.imageUrl || coverImage(g)"
                   [alt]="g.name"
                   loading="lazy"
                   (error)="$event.target.src = defaultCoverUrl" />
              <div class="cover-overlay"></div>
              <span class="priv-badge" *ngIf="g.isPrivate">
                <svg viewBox="0 0 16 16" fill="currentColor">
                  <path fill-rule="evenodd"
                    d="M8 1a3 3 0 00-3 3v1H4a1 1 0 00-1 1v7a1 1 0 001 1h8a1 1 0 001-1V6a1 1 0
                       00-1-1h-1V4a3 3 0 00-3-3zm0 2a1 1 0 00-1 1v1h2V4a1 1 0 00-1-1zm0 6a1 1 0
                       100-2 1 1 0 000 2z" clip-rule="evenodd"/>
                </svg>
                Privé
              </span>
              <!-- Avatar cluster -->
              <div class="avatar-cluster">
                <div class="av" *ngFor="let av of getMemberAvatars(g); let ai = index"
                     [style.--ai]="ai" [style.z-index]="5 - ai">
                  {{ av }}
                </div>
                <div class="av av--more" *ngIf="(g.memberCount || 1) > 3" [style.--ai]="3">
                  +{{ (g.memberCount || 1) - 3 }}
                </div>
              </div>
            </div>

            <!-- Body -->
            <div class="cst-body">
              <div class="cst-subject" *ngIf="g.subject">{{ g.subject }}</div>
              <h3 class="cst-name">{{ g.name }}</h3>
              <p class="cst-desc" *ngIf="g.description">{{ g.description }}</p>

              <div class="cst-footer">
                <div class="slot-bar">
                  <div class="slot-fill" [style.width]="slotPct(g) + '%'"></div>
                </div>
                <span class="slot-label">{{ g.memberCount || 1 }}/{{ g.maxMembers }}</span>
              </div>

              <div class="cst-actions">
                <button class="btn-open" type="button" (click)="openGroupChat(g.id)">Ouvrir</button>
                <button class="btn-outline" (click)="openInvite(g)">Inviter</button>
                <button class="btn-danger-sm" (click)="leaveGroup(g.id)">Quitter</button>
              </div>
            </div>
          </article>

          <div class="empty-state" *ngIf="groupsList().length === 0">
            <div class="empty-icon"></div>
            <p>Aucun groupe pour l'instant.</p>
            <button class="btn-create" (click)="openCreate()">
              Créer votre première constellation
            </button>
          </div>
        </div>
      </ng-container>

      <!-- â•â•â•â• TAB: INVITATIONS â•â•â•â• -->
      <ng-container *ngIf="activeTab() === 'invitations'">
        <div class="inv-list">
          <div class="empty-state" *ngIf="invitations.length === 0">
            <div class="empty-icon"></div>
            <p>Aucune invitation en attente.</p>
          </div>
          <article class="inv-card"
                   *ngFor="let inv of invitations; let i = index; trackBy: trackByInvitationId"
                   [style.--ii]="i">
            <div class="inv-glow"></div>
            <div class="inv-meta">
              <span class="inv-chip">Invitation de groupe</span>
              <span class="inv-date">{{ formatDate(inv.sentAt) }}</span>
            </div>
            <p class="inv-msg">
              Vous avez été invité(e) à rejoindre le groupe
              <strong>#{{ inv.groupId }}</strong>
            </p>
            <div class="inv-actions">
              <button class="btn-accept" (click)="respond(inv, 'ACCEPTED')">Accepter</button>
              <button class="btn-decline" (click)="respond(inv, 'DECLINED')">Refuser</button>
            </div>
          </article>
        </div>
      </ng-container>

      <!-- â•â•â•â• CREATE MODAL â•â•â•â• -->
      <div class="modal-backdrop" *ngIf="showCreate()" (click)="closeCreate()">
        <div class="modal modal-create" (click)="$event.stopPropagation()">
          
          <div class="modal-header">
            <h3>Créer une constellation</h3>
            <button class="modal-close" (click)="closeCreate()">x</button>
          </div>

          <div class="modal-cover-preview" [class.has-image]="!!form.coverPreview">
            <img *ngIf="form.coverPreview" class="mcp-bg-img" [src]="form.coverPreview" alt="Aperçu du groupe" />
            <div class="mcp-overlay"></div>
            <label class="cover-upload-zone" [class.has-cover]="!!form.coverPreview">
              <input type="file" accept="image/*" hidden (change)="onCoverSelected($event)" />
              <span class="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </span>
              <span class="upload-label">{{ form.coverPreview ? 'Changer l’image' : 'Ajouter une image' }}</span>
              <span class="upload-hint">{{ uploadingCover ? 'Upload en cours...' : 'Preview immédiat' }}</span>
            </label>
            <div class="cover-actions" *ngIf="form.coverPreview">
              <span class="cover-success">{{ selectedImageUrl ? 'Image prête' : 'Image sélectionnée' }}</span>
              <button type="button" class="cover-remove-btn" (click)="removeCover()">Retirer</button>
            </div>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">
                <span class="label-text">Nom du groupe</span>
                <span class="label-required">*</span>
              </label>
              <input type="text" 
                     class="form-input"
                     [(ngModel)]="form.name" 
                     placeholder="ex: Math Avancé, Algo Team..." />
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea class="form-textarea"
                        [(ngModel)]="form.description" 
                        rows="3"
                        placeholder="Objectifs, sujets traités..."></textarea>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Matière principale</label>
                <input type="text" 
                       class="form-input"
                       [(ngModel)]="form.subject" 
                       placeholder="ex: Mathématiques" />
              </div>
              <div class="form-group">
                <label class="form-label">Membres max</label>
                <input type="number" 
                       class="form-input"
                       [(ngModel)]="form.maxMembers" 
                       min="2" 
                       max="50" />
              </div>
            </div>

            <div class="form-group form-checkbox">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="form.isPrivate" />
                <span class="checkbox-custom"></span>
                <span class="checkbox-text">Groupe privé (visible sur invitation uniquement)</span>
              </label>
            </div>

            <div class="form-group">
              <label class="form-label">Couleur du groupe</label>
              <div class="color-picker-row">
                <button
                  *ngFor="let c of palette"
                  type="button"
                  class="color-swatch"
                  [class.active]="form.color === c"
                  [style.background]="c"
                  (click)="form.color = c"
                  [title]="c">
                </button>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeCreate()">Annuler</button>
            <button type="button" class="btn-primary" (click)="createGroup()" [disabled]="!form.name.trim() || uploadingCover">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
              Créer le groupe
            </button>
          </div>
        </div>
      </div>

      <!-- â•â•â•â• INVITE MODAL â•â•â•â• -->
      <div class="modal-backdrop" *ngIf="showInvite()" (click)="closeInvite()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h3>Inviter dans {{ inviteTarget()?.name }}</h3>
            <button class="modal-close" (click)="closeInvite()">x</button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label class="form-label">Email de l'utilisateur</label>
              <input type="email" class="form-input" [(ngModel)]="inviteEmail" placeholder="ami@studyflow.app"/>
            </div>
            <div class="form-group">
              <label class="form-label">Message (facultatif)</label>
              <textarea class="form-textarea" [(ngModel)]="inviteMessage" rows="3"
                        placeholder="Rejoins-nous pour étudier ensemble !"></textarea>
            </div>
            <div class="invite-hint">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              Statut initial : <strong>PENDING</strong> · expire dans 7 jours.
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn-secondary" (click)="closeInvite()">Annuler</button>
            <button class="btn-primary" (click)="sendInvite()" [disabled]="!inviteEmail">
              Envoyer l'invitation
            </button>
          </div>
        </div>
      </div>

    </div>
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral:  #ff8e7e;
      --dark:   #1a1a1a;
      --cream:  #ede8df;
      --white:  #ffffff;
      --border: rgba(0,0,0,.07);
      --shadow: 0 8px 32px rgba(0,0,0,.07);
      display: block;
      padding: 0 0 48px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #e8dfd0;
    }

    .constellation-root { position: relative; min-height: 100vh; overflow-x: hidden; }

    .stars-layer { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
    .star {
      position: absolute; border-radius: 50%;
      background: #c8bfb0; opacity: 0;
      animation: star-drift linear infinite;
    }
    @keyframes star-drift {
      0%   { opacity:0; transform: translateY(0) scale(1); }
      20%  { opacity:.45; }
      80%  { opacity:.45; }
      100% { opacity:0; transform: translateY(-60px) scale(1.3); }
    }

    .hero-bar {
      position: relative; z-index: 2;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 16px; padding: 28px 32px 24px 32px;
    }
    .hero-left { display: flex; align-items: center; gap: 14px; }
    .hero-icon {
      width: 48px; height: 48px; border-radius: 16px;
      background: var(--dark); display: grid; place-items: center; flex-shrink: 0;
    }
    .hero-icon svg { width: 28px; height: 28px; }
    .hero-title { margin:0; font-size:1.6rem; font-weight:800; color:var(--dark); }
    .hero-sub   { margin:0; font-size:.82rem; color:#888; }
    .hero-actions { display: flex; align-items: center; gap: 12px; }

    .tab-cluster {
      display: flex; background: rgba(255,255,255,.8);
      border-radius: 999px; border: 1px solid var(--border);
      padding: 3px; gap: 2px;
    }
    .tab-btn {
      display: flex; align-items: center; gap: 6px;
      padding: 7px 18px; border-radius: 999px; border: none;
      background: transparent; font-size: .85rem; font-weight: 600;
      color: #888; cursor: pointer;
      transition: background 200ms, color 200ms;
    }
    .tab-btn.on { background: var(--dark); color: #fff; }
    .inv-badge {
      display: inline-flex; align-items: center; justify-content: center;
      width: 18px; height: 18px; border-radius: 50%;
      background: var(--coral); color: #fff;
      font-size: .68rem; font-weight: 800;
    }

    .btn-create {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 10px 20px; border-radius: 999px;
      background: var(--dark); color: #fff;
      font-weight: 700; font-size: .88rem; border: none;
      cursor: pointer;
      transition: transform 180ms, box-shadow 180ms;
    }
    .btn-create svg { width: 16px; height: 16px; }
    .btn-create:hover { transform: translateY(-2px); box-shadow: 0 10px 24px rgba(26,26,26,.22); }

    .cst-grid {
      position: relative; z-index: 2;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 24px;
      padding: 0 32px;
    }

    .cst-card {
      position: relative; border-radius: 24px;
      background: var(--white); border: 1px solid var(--border);
      box-shadow: var(--shadow); overflow: hidden;
      transition: transform 260ms, box-shadow 260ms;
    }
    .cst-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 24px 60px rgba(0,0,0,.11);
    }

    .cst-cover {
      position: relative; height: 160px; overflow: hidden;
    }
    .cover-img {
      width: 100%; height: 100%;
      object-fit: cover;
      transition: transform 400ms ease;
    }
    .cst-card:hover .cover-img { transform: scale(1.05); }
    .cover-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,.08) 0%, rgba(0,0,0,.35) 100%);
    }

    .priv-badge {
      position: absolute; top: 10px; right: 10px;
      display: inline-flex; align-items: center; gap: 4px;
      padding: 3px 10px; border-radius: 999px;
      background: rgba(255,255,255,.22);
      backdrop-filter: blur(6px);
      color: #fff; font-size: .68rem; font-weight: 700;
    }
    .priv-badge svg { width: 10px; height: 10px; }

    .avatar-cluster {
      position: absolute; bottom: 10px; right: 10px;
      display: flex; flex-direction: row-reverse; z-index: 2;
    }
    .av {
      width: 30px; height: 30px; border-radius: 50%;
      background: linear-gradient(135deg, var(--yellow), var(--coral));
      color: var(--dark); font-size: .65rem; font-weight: 800;
      display: grid; place-items: center;
      border: 2px solid #fff; margin-left: -8px;
      transition: transform 200ms;
    }
    .av--more { background: rgba(0,0,0,.4); color:#fff; backdrop-filter: blur(4px); }
    .av:hover { transform: translateY(-4px) scale(1.15); }

    .cst-body { padding: 18px 20px 20px; }
    .cst-subject {
      display: inline-block; padding: 3px 12px; border-radius: 999px;
      background: rgba(245,197,24,.12); border: 1px solid rgba(245,197,24,.3);
      color: #8b6e00; font-size: .7rem; font-weight: 700;
      letter-spacing: .04em; margin-bottom: 8px;
    }
    .cst-name  { margin:0 0 6px; font-size:1.1rem; font-weight:800; color:var(--dark); }
    .cst-desc  { margin:0 0 14px; font-size:.8rem; color:#888; line-height:1.45; }

    .cst-footer { display:flex; align-items:center; gap:10px; margin-bottom:16px; }
    .slot-bar {
      flex:1; height:5px; border-radius:3px;
      background: rgba(0,0,0,.08); overflow:hidden;
    }
    .slot-fill {
      height:100%; border-radius:3px;
      background: var(--gc, var(--yellow));
      transition: width 600ms cubic-bezier(.22,1,.36,1);
    }
    .slot-label { font-size:.75rem; color:#888; font-weight:600; white-space:nowrap; }

    .cst-actions { display:flex; gap:10px; }
    .btn-open {
      flex:1; display:inline-flex; align-items:center; justify-content:center;
      padding:10px 14px; border-radius:12px;
      background:#1A1A1A; color:#F5C518;
      font-weight:700; font-size:.85rem; text-decoration:none;
      border:none; cursor:pointer;
    }
    .btn-open:hover { transform:translateY(-1px); }
    .btn-outline {
      flex:1; padding:10px; border-radius:12px;
      border: 1.5px solid var(--border);
      background: transparent; color:var(--dark);
      font-size:.85rem; font-weight:700; cursor:pointer;
    }
    .btn-outline:hover { border-color:var(--dark); background:var(--dark); color:#fff; }
    .btn-danger-sm {
      padding:10px 14px; border-radius:12px;
      border: 1.5px solid rgba(224,90,71,.35);
      background: transparent; color:#e05a47;
      font-size:.85rem; font-weight:700; cursor:pointer;
    }
    .btn-danger-sm:hover { background:#e05a47; color:#fff; border-color:#e05a47; }

    .inv-list { 
      position: relative; 
      z-index: 2; 
      display: flex; 
      flex-direction: column; 
      gap: 14px; 
      padding: 0 32px;
    }

    .inv-card {
      position:relative; background:var(--white); border-radius:20px;
      padding:20px 22px; border: 1px solid var(--border); box-shadow: var(--shadow);
      overflow:hidden;
    }
    .inv-glow {
      position:absolute; top:0; left:0; right:0; height:3px;
      background: linear-gradient(90deg, var(--yellow), var(--coral));
      border-radius:20px 20px 0 0;
    }
    .inv-meta { display:flex; align-items:center; gap:10px; margin-bottom:8px; }
    .inv-chip {
      padding:3px 10px; border-radius:999px;
      background:rgba(245,197,24,.12); border:1px solid rgba(245,197,24,.3);
      color:#8b6e00; font-size:.7rem; font-weight:700;
    }
    .inv-date { font-size:.75rem; color:#aaa; }
    .inv-msg  { margin:0 0 14px; font-size:.9rem; color:var(--dark); line-height:1.5; }
    .inv-actions { display:flex; gap:10px; }
    .btn-accept {
      padding:9px 22px; border-radius:999px; background:#2da96a; color:#fff;
      border:none; font-size:.85rem; font-weight:700; cursor:pointer;
    }
    .btn-accept:hover { background:#23905a; transform:translateY(-1px); }
    .btn-decline {
      padding:9px 22px; border-radius:999px; background:transparent; color:#e05a47;
      border:1.5px solid rgba(224,90,71,.4); font-size:.85rem; font-weight:700;
      cursor:pointer;
    }
    .btn-decline:hover { background:#e05a47; color:#fff; border-color:#e05a47; }

    .empty-state { 
      grid-column:1/-1; 
      text-align:center; 
      padding:80px 20px; 
      color:#999; 
      background: transparent;
    }
    .empty-icon  { font-size:4rem; margin-bottom:16px; opacity:0.5; }
    .empty-state p { font-size:1rem; margin-bottom:20px; }

    .modal-backdrop {
      position:fixed; inset:0; background:rgba(0,0,0,.5);
      display:grid; place-items:center; z-index:100;
      backdrop-filter:blur(6px);
      animation:fade-in 200ms ease both;
    }
    @keyframes fade-in { from{opacity:0} }

    .modal, .modal-create {
      background: #fff;
      border-radius: 28px;
      width: min(540px, 92vw);
      box-shadow: 0 32px 80px rgba(0,0,0,.25);
      animation: modal-pop 300ms cubic-bezier(.22,1,.36,1) both;
      overflow: hidden;
    }
    @keyframes modal-pop {
      from{opacity:0;transform:scale(.96) translateY(16px)}
    }

    .modal-cover-preview {
      position: relative;
      height: 160px;
      background: linear-gradient(135deg, #2a2a2a, #1a1a1a);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      transition: height 320ms cubic-bezier(.22,1,.36,1);
    }
    .modal-cover-preview.has-image { height: 200px; }

    .mcp-bg-img {
      position: absolute; inset: 0;
      width: 100%; height: 100%;
      object-fit: cover;
    }

    .mcp-overlay {
      position: absolute; inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,.3) 0%, rgba(0,0,0,.6) 100%);
      z-index: 1;
    }

    .mcp-top {
      position: relative; z-index: 2;
      display: flex; justify-content: space-between; align-items: center;
      padding: 18px 20px 0;
    }
    .mcp-title {
      margin: 0;
      font-size: 1.1rem; font-weight: 800;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,.4);
    }

    .modal-close {
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: rgba(255,255,255,.15);
      color: #fff; cursor: pointer; font-size: 1rem;
      backdrop-filter: blur(6px);
      transition: background 180ms;
      flex-shrink: 0; z-index: 2;
    }
    .modal-close:hover { background: rgba(255,255,255,.3); }

    .cover-upload-zone {
      position: relative; z-index: 2;
      margin: 12px 18px 16px;
      border-radius: 16px;
      border: 2px dashed rgba(255,255,255,.4);
      background: rgba(255,255,255,.1);
      backdrop-filter: blur(10px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 14px;
      cursor: pointer;
      transition: all 200ms;
      min-height: 80px;
    }
    .cover-upload-zone:hover {
      border-color: rgba(255,255,255,.7);
      background: rgba(255,255,255,.18);
    }
    .cover-upload-zone.has-cover {
      flex-direction: row;
      padding: 10px 16px;
      min-height: auto;
      border-style: solid;
      border-color: rgba(255,255,255,.25);
    }

    .upload-icon {
      width: 40px; height: 40px;
      background: rgba(255,255,255,.12);
      border-radius: 12px;
      display: grid; place-items: center;
    }
    .upload-icon svg {
      width: 20px; height: 20px;
      stroke: rgba(255,255,255,.9);
    }
    .upload-label {
      margin: 0;
      font-size: .85rem; font-weight: 700;
      color: rgba(255,255,255,.95);
    }
    .upload-hint {
      margin: 0;
      font-size: .7rem;
      color: rgba(255,255,255,.55);
    }

    .cover-actions {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
    }
    .cover-success {
      color: #5bd49a;
      font-size: .8rem;
      font-weight: 600;
      margin-right: 5px;
    }
    .cover-change-btn, .cover-remove-btn {
      display: inline-flex; align-items: center; gap: 6px;
      padding: 6px 14px; border-radius: 999px;
      font-size: .75rem; font-weight: 700;
      cursor: pointer; border: none;
      transition: all 180ms;
    }
    .cover-change-btn {
      background: rgba(255,255,255,.2);
      color: #fff;
      backdrop-filter: blur(4px);
    }
    .cover-change-btn:hover { background: rgba(255,255,255,.35); }
    .cover-remove-btn {
      background: rgba(224,90,71,.3);
      color: #ffc4bb;
    }
    .cover-remove-btn:hover { background: rgba(224,90,71,.5); color: #fff; }

    .modal-body {
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 22px 24px 16px;
      border-bottom: 1px solid var(--border);
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-label {
      font-size: 0.75rem;
      font-weight: 800;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .label-text {
      color: #888;
    }

    .label-required {
      color: #e05a47;
      font-size: 1rem;
    }

    .form-input, .form-textarea {
      width: 100%;
      padding: 12px 16px;
      border-radius: 14px;
      border: 1.5px solid #e8dfd5;
      background: #faf8f5;
      font-size: 0.9rem;
      font-family: inherit;
      color: #1a1a1a;
      transition: all 200ms;
    }

    .form-input:focus, .form-textarea:focus {
      outline: none;
      border-color: #f5c518;
      box-shadow: 0 0 0 3px rgba(245, 197, 24, 0.12);
      background: #fff;
    }

    .form-textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-checkbox {
      flex-direction: row;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 12px;
      cursor: pointer;
      font-size: 0.85rem;
      font-weight: 500;
      color: #666;
    }

    .checkbox-label input {
      display: none;
    }

    .checkbox-custom {
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 2px solid #e8dfd5;
      background: #faf8f5;
      transition: all 200ms;
      position: relative;
    }

    .checkbox-label input:checked + .checkbox-custom {
      background: #1a1a1a;
      border-color: #1a1a1a;
    }

    .checkbox-label input:checked + .checkbox-custom::after {
      content: '✓';
      position: absolute;
      color: #f5c518;
      font-size: 12px;
      font-weight: bold;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }

    .checkbox-text {
      color: #666;
    }

    .invite-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.75rem;
      color: #999;
      padding: 10px 12px;
      background: #faf8f5;
      border-radius: 12px;
    }

    .invite-hint svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding: 16px 24px 24px;
      border-top: 1px solid var(--border);
    }

    .btn-primary, .btn-secondary {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 11px 24px;
      border-radius: 999px;
      font-size: 0.85rem;
      font-weight: 700;
      cursor: pointer;
      transition: all 180ms;
      border: none;
    }

    .btn-primary {
      background: #1a1a1a;
      color: #f5c518;
    }

    .btn-primary:hover:not(:disabled) {
      background: #333;
      transform: translateY(-1px);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f5f0e8;
      color: #666;
    }

    .btn-secondary:hover {
      background: #e8dfd0;
    }

    .color-picker-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      padding: 4px 0;
    }
    .color-swatch {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 3px solid transparent;
      cursor: pointer;
      transition: transform 150ms, border-color 150ms, box-shadow 150ms;
      flex-shrink: 0;
      outline: none;
    }
    .color-swatch:hover { transform: scale(1.18); }
    .color-swatch.active {
      border-color: #1a1a1a;
      box-shadow: 0 0 0 2px rgba(0,0,0,.18);
      transform: scale(1.2);
    }

    @media (max-width: 640px) {
      .form-row {
        grid-template-columns: 1fr;
        gap: 16px;
      }
      
      .cst-grid, .inv-list {
        padding: 0 16px;
      }
      
      .hero-bar {
        padding: 20px 16px;
      }
      
      .modal, .modal-create {
        width: 95vw;
      }
    }
  `]
})
export class GroupsComponent implements OnInit {
  readonly groupSvc = inject(GroupService);
  private readonly notifSvc = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  activeTab    = signal<Tab>('groups');
  showCreate   = signal(false);
  showInvite   = signal(false);
  inviteTarget = signal<StudyGroup | null>(null);
  inviteEmail  = '';
  inviteMessage = '';
  invitations: GroupInvitation[] = [];
  
  // Liste locale des groupes
  private groups: StudyGroup[] = [];
  
  // Exposer les groupes via un signal
  groupsList = signal<StudyGroup[]>([]);

  // Variable publique pour le template
  defaultCoverUrl = DEFAULT_COVER;

  stars = Array.from({ length: 28 }, () => ({
    x: Math.random() * 100, y: Math.random() * 100,
    r: 1.5 + Math.random() * 2.5,
    d: Math.random() * 8, dur: 10 + Math.random() * 14,
  }));

  palette = ['#F5C518','#FF6B5B','#5BD49A','#6C8EEF','#9B72EF','#F0A030','#4CAF82','#FF8E7E','#7EB8F7','#1A1A1A'];

  form = {
    name: '',
    description: '',
    subject: '',
    maxMembers: 10,
    isPrivate: false,
    color: '#F5C518',
    imageUrl: '',
    coverPreview: ''
  };
  uploadingCover = false;
  selectedImageUrl = '';
  private coverUploadRun = 0;

  get pendingCount(): number { 
    return this.invitations.length; 
  }

  ngOnInit(): void {
    if (this.route.snapshot.queryParamMap.get('tab') === 'invitations') {
      this.activeTab.set('invitations');
    }
    // GET /api/groups + /api/groups/invitations/pending au montage
    this.groupSvc.list().subscribe(() => this.loadGroups());
    this.groupSvc.fetchPendingInvitations().subscribe(invs => {
      this.invitations = invs;
      this.cdr.detectChanges();
    });
  }

  loadGroups(): void {
    // Synchronise les signals locaux avec le cache du service
    this.groups = [...this.groupSvc.userGroups()];
    this.groupsList.set(this.groups);
    this.cdr.detectChanges();
  }

  refreshGroups(): void {
    this.groupSvc.list().subscribe(() => {
      this.groups = [...this.groupSvc.userGroups()];
      this.groupsList.set(this.groups);
      this.cdr.detectChanges();
    });
  }

  coverImage(g: StudyGroup): string {
    return COVER_IMAGES[g.color || ''] || DEFAULT_COVER;
  }

  slotPct(g: StudyGroup): number {
    return Math.round(((g.memberCount || 1) / g.maxMembers) * 100);
  }

  getMemberAvatars(g: StudyGroup): string[] {
    const count = Math.min(g.memberCount || 1, 3);
    return Array(count).fill('·');
  }

  trackByGroupId(_index: number, group: StudyGroup): string {
    return group.id;
  }

  trackByInvitationId(_index: number, invitation: GroupInvitation): string {
    return invitation.id;
  }

  openCreate() { 
    this.resetForm();
    this.showCreate.set(true); 
    this.cdr.detectChanges();
  }
  
  closeCreate() {
    this.showCreate.set(false);
    this.resetForm();
    // refreshGroups() retiré : l'update optimiste dans createGroup() suffit
  }
  
  openInvite(g: StudyGroup) { 
    this.inviteTarget.set(g); 
    this.showInvite.set(true); 
  }
  
  closeInvite() {
    this.showInvite.set(false); 
    this.inviteEmail = '';
    this.inviteMessage = ''; 
    this.inviteTarget.set(null);
  }

  openGroupChat(id: string): void {
    this.router.navigate(['/chat', id]);
  }

  createGroup(): void {
    if (!this.form.name.trim()) return;
    const payload = {
      name: this.form.name.trim(),
      description: this.form.description || '',
      privateGroup: !!this.form.isPrivate,
      maxMembers: this.form.maxMembers,
      imageUrl: this.selectedImageUrl || undefined
    };

    this.showCreate.set(false);
    this.persistGroup(payload);
  }

  private persistGroup(payload: {
    name: string;
    description?: string;
    privateGroup: boolean;
    maxMembers: number;
    imageUrl?: string;
  }): void {
    this.groupSvc.createGroup(payload).subscribe({
      next: (created) => {
        this.groups = [created, ...this.groups];
        this.groupsList.set([...this.groups]);
        this.resetForm();
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Erreur creation groupe:', err);
        alert(err?.error?.message || 'Impossible de creer le groupe.');
        this.showCreate.set(true);
        this.cdr.detectChanges();
      }
    });
  }

  sendInvite(): void {
    const g = this.inviteTarget();
    if (!g || !this.inviteEmail) return;
    this.groupSvc.sendInvitation(g.id, this.inviteEmail, this.inviteMessage || '').subscribe({
      next: () => {
        this.closeInvite();
        this.inviteEmail = '';
        this.inviteMessage = '';
      },
      error: err => {
        console.error('Erreur envoi invitation:', err);
        alert(err?.error?.message || "Impossible d'envoyer l'invitation.");
      }
    });
  }

  private resetForm(): void {
    this.coverUploadRun++;
    this.form = {
      name: '',
      description: '',
      subject: '',
      maxMembers: 10,
      isPrivate: false,
      color: '#F5C518',
      imageUrl: '',
      coverPreview: ''
    };
    this.selectedImageUrl = '';
    this.uploadingCover = false;
    this.inviteEmail = '';
    this.inviteMessage = '';
  }

  leaveGroup(groupId: string): void {
    if (!confirm('Quitter ce groupe ?')) return;
    this.groupSvc.leave(groupId).subscribe(() => this.groupSvc.list().subscribe());
  }

  formatDate(d?: string): string {
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  respond(inv: any, status: 'ACCEPTED' | 'DECLINED'): void {
    this.groupSvc.respondToInvitation(inv.id, status === 'ACCEPTED').subscribe(() => {
      this.groupSvc.fetchPendingInvitations().subscribe();
      this.groupSvc.list().subscribe();
    });
  }

  onCoverSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez choisir une image.');
      input.value = '';
      return;
    }

    const maxSizeMb = 5;
    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`Image trop lourde. Maximum ${maxSizeMb} Mo.`);
      input.value = '';
      return;
    }

    this.selectedImageUrl = '';
    this.uploadingCover = true;
    const uploadRun = ++this.coverUploadRun;

    const reader = new FileReader();
    reader.onload = () => {
      if (uploadRun !== this.coverUploadRun) return;
      this.form.coverPreview = String(reader.result || '');
      this.cdr.detectChanges();
    };
    reader.readAsDataURL(file);

    this.groupSvc.uploadGroupImage(file).subscribe({
      next: ({ imageUrl }) => {
        if (uploadRun !== this.coverUploadRun) return;
        this.selectedImageUrl = imageUrl;
        this.form.imageUrl = imageUrl;
        this.uploadingCover = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        if (uploadRun !== this.coverUploadRun) return;
        console.error('Erreur upload image groupe:', err);
        this.selectedImageUrl = '';
        this.form.imageUrl = '';
        this.form.coverPreview = '';
        this.uploadingCover = false;
        alert(err?.error?.message || err?.error || "Impossible d'uploader l'image.");
        this.cdr.detectChanges();
      }
    });
  }

  removeCover(): void {
    this.coverUploadRun++;
    this.form.coverPreview = '';
    this.form.imageUrl = '';
    this.selectedImageUrl = '';
    this.uploadingCover = false;
    this.cdr.detectChanges();
  }
}
