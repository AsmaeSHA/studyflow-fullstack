import { Component, inject, OnDestroy, OnInit, signal, NgZone } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GroupService } from '../../core/services/group.service';
import { ChatService } from '../../core/services/chat.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { AuthService } from '../../core/services/auth.service';
import { ChatBoxComponent } from '../../shared/components/chat-box/chat-box.component';
import { MemberSessionsPanelComponent } from '../../shared/components/member-sessions-panel/member-sessions-panel.component';
import { SidebarComponent } from '../../shared/components/sidebar/sidebar.component';
import { ChatMessage, GroupMembership, SharedSession, StudySession, Comment as SessionComment, GroupRealtimeEvent } from '../../core/models/models';
import { catchError, finalize, forkJoin, of, Subscription, switchMap } from 'rxjs';

const SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: 'm1', roomId: 'r1', authorId: 'u2', authorName: 'Karim Mouhib',
    content: "Hey la team, prêts pour aujourd'hui ?",
    sentAt: new Date(Date.now() - 26 * 60_000).toISOString(),
    isEdited: false, isDeleted: false,
  },
  {
    id: 'm2', roomId: 'r1', authorId: 'u-001', authorName: 'Amanda Bentley', isMe: true,
    content: "Oui ! J'ai déjà revu le chapitre 4.",
    sentAt: new Date(Date.now() - 22 * 60_000).toISOString(),
    isEdited: false, isDeleted: false,
  },
  {
    id: 'm3', roomId: 'r1', authorId: 'u3', authorName: 'Sara El Fassi',
    content: 'On commence à 14h pétantes',
    sentAt: new Date(Date.now() - 18 * 60_000).toISOString(),
    isEdited: false, isDeleted: false,
  },
];

/** Photos Unsplash par userId (fallback sur couleur générée) */
const MEMBER_PHOTOS: Record<string, string> = {
  'u-001': 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80', // Amanda
  'u2':    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80', // Karim
  'u3':    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=80', // Sara
};

type SharedCommentMap = Record<string, SessionComment[]>;

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    ChatBoxComponent, MemberSessionsPanelComponent, SidebarComponent,
  ],
  template: `
    <div class="page-content" [class.blurred]="selectedMember()">
      @if (loading()) {
        <div class="loading-panel">
          <div class="loading-spinner"></div>
          <span>Chargement du groupe...</span>
        </div>
      }

      <!-- TOPBAR -->
      <header class="topbar">
        <div class="topbar-left">
          <h1 class="page-title">{{ group?.name || groupFallback }}</h1>
          <p class="page-sub">{{ group?.description || 'Espace de collaboration du groupe.' }}</p>
        </div>
        <div class="topbar-right">
          <a [routerLink]="['/groups']" class="btn-back" aria-label="Retour aux groupes">
            <span aria-hidden="true">?</span>
            <span>Groupes</span>
          </a>
        </div>
      </header>

      <!-- GRILLE -->
      <div class="main-grid">

        <!-- Colonne gauche -->
        <aside class="left-col">

          <!-- Card Membres -->
          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0
                            016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5
                            5 0 01 19 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"/>
                  </svg>
                 Membres ({{ members.length }})
                </h2>
                <p class="card-sub">Activité et rôles</p>
              </div>
              <div class="count-pill">
                <span class="count-num">{{ members.length }}</span>
                <span class="count-lbl">total</span>
              </div>
            </div>

            <div class="members-list">
             @for (m of members; track m.userId) {
                <div class="member-row" [class.inactive]="!m.isActive">
                  <!-- Photo ou initiales -->
                  <div class="m-avatar-wrap">
                    <img *ngIf="memberPhoto(m.userId)"
                        class="m-photo"
                        [src]="memberPhoto(m.userId)"
                        [alt]="m.userName" />
                    <div *ngIf="!memberPhoto(m.userId)"
                        class="m-avatar"
                        [style.background]="avatarColor(m.userId)">
                      {{ initials(m.userName) }}
                    </div>
                  </div>

                  <div class="m-info">
                    <span class="m-name">{{ m.userName || 'Anonyme' }}</span>
                    <div class="m-tags">
                      <span class="role-tag" [ngClass]="'role-' + m.role">
                       {{ roleLabel(m.role) }}
                      </span>
                    </div>
                  </div>

                  <button class="sessions-btn" (click)="openMemberSessions(m)">
                    <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                      <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/>
                    </svg>
                   Sessions
                  </button>
                </div>
             }
             @if (members.length === 0) {
                <p class="empty-msg">Aucun membre</p>
             }
            </div>
          </div>

          <!-- Card Sessions actuelles -->
          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.553.894l3 1.5a1 1 0 10.894-1.788L11 9.382V6z" clip-rule="evenodd"/>
                  </svg>
                  Sessions actuelles ({{ currentSharedSessions().length }})
                </h2>
                <p class="card-sub">En cours maintenant</p>
              </div>
            </div>

            <div class="current-session-list">
              @for (s of currentSharedSessions(); track s.id) {
                <div class="current-session-row">
                  <div class="current-session-dot"></div>
                  <div class="current-session-body">
                    <span class="current-session-title">{{ s.title || s.sessionTitle || 'Session en cours' }}</span>
                    <span class="current-session-meta">
                      {{ s.ownerName || s.sharedBy || 'Membre' }} · {{ formatDateTime(s.startDateTime) }}
                    </span>
                    <button class="comment-toggle" type="button" (click)="toggleShared(s)">
                      Commentaires ({{ commentsFor(s.sessionId).length }})
                    </button>
                    @if (expandedSharedId() === s.id) {
                      <div class="shared-details active-comments">
                        <div class="comments-mini">
                          @if (loadingCommentSessionIds.has(s.sessionId)) {
                            <p class="empty-msg compact">Chargement des commentaires...</p>
                          }
                          @for (comment of commentsFor(s.sessionId); track comment.id) {
                            <div class="comment-mini" [class.mine]="isMyComment(comment)">
                              <div class="comment-avatar">{{ commentInitials(comment) }}</div>
                              <div class="comment-bubble">
                                <div class="comment-head">
                                  <strong>{{ comment.authorName || 'Membre' }}</strong>
                                  <span>{{ relativeCommentTime(comment.createdAt) }}</span>
                                </div>
                                <p>{{ comment.content }}</p>
                              </div>
                            </div>
                          } @empty {
                            <p class="empty-msg compact">Aucun commentaire pour cette session.</p>
                          }
                        </div>
                        <div class="comment-form-mini">
                          <textarea
                            [(ngModel)]="commentDrafts[s.sessionId]"
                            [ngModelOptions]="{standalone: true}"
                            (keydown.enter)="submitSharedComment($event, s)"
                            rows="1"
                            placeholder="Commenter cette session active"></textarea>
                          <button type="button" class="tiny-btn icon-send" title="Envoyer" (click)="addSharedComment(s)" [disabled]="!commentDrafts[s.sessionId]?.trim() || submittingCommentSessionIds.has(s.sessionId)">
                            &gt;
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
              } @empty {
                <p class="empty-msg compact">Aucune session en cours</p>
              }
            </div>
          </div>

          <!-- Card Sessions partagées -->
          <div class="card">
            <div class="card-header">
              <div>
                <h2 class="card-title">
                  <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969
                            7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5
                             14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255
                            0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                  </svg>
                 Sessions partagées ({{ shared.length }})
                </h2>
                <p class="card-sub">Ressources du groupe</p>
              </div>
              <div class="count-pill">
                <span class="count-num">{{ shared.length }}</span>
                <span class="count-lbl">sessions</span>
              </div>
            </div>

            <form class="share-form" (ngSubmit)="shareSelectedSession()">
              <select [(ngModel)]="selectedSessionId" name="sessionId" [disabled]="mySessions.length === 0 || loadingShareableSessions">
                <option value="">Partager une de mes sessions</option>
                @for (session of mySessions; track session.id) {
                  <option [value]="session.id">{{ session.title }} · {{ formatDateTime(session.startDateTime) }}</option>
                }
              </select>
              @if (!loadingShareableSessions && mySessions.length === 0) {
                <p class="share-empty">Aucune session planifiée future à partager.</p>
              }
              <textarea
                [(ngModel)]="shareMessage"
                name="shareMessage"
                rows="2"
                placeholder="Message facultatif">
              </textarea>
              <button class="share-btn" type="submit" [disabled]="!selectedSessionId || sharing">
                {{ sharing ? 'Partage...' : 'Partager' }}
              </button>
            </form>

            <div class="shared-list">
             @for (sh of shared; track sh.id) {
                <div class="shared-row" [class.expanded]="expandedSharedId() === sh.id">
                  <div class="shared-dot"></div>
                  <div class="shared-body">
                    <span class="shared-title">
                     {{ sh.title || sh.sessionTitle || 'Session #' + sh.sessionId }}
                    </span>
                    <div class="shared-meta-grid">
                      <span>{{ sh.subjectName || 'Matière non renseignée' }}</span>
                      <span>{{ formatDateTime(sh.startDateTime || sh.sharedAt) }}</span>
                      <span>{{ durationLabel(sh) }}</span>
                      <span>{{ sh.status || 'PLANNED' }}</span>
                      <span>par {{ sh.ownerName || sh.sharedBy || 'membre' }}</span>
                    </div>
                   @if (sh.message) {
                      <p class="shared-msg">{{ sh.message }}</p>
                   }
                    @if (sh.description) {
                      <p class="shared-msg">{{ sh.description }}</p>
                    }
                    <div class="shared-actions">
                      @if (canDecideShared(sh)) {
                        <button class="tiny-btn" type="button" (click)="acceptSharedSession(sh)" [disabled]="decidingSharedIds.has(sh.id)">
                          Accepter
                        </button>
                        <button class="tiny-btn ghost" type="button" (click)="declineSharedSession(sh)" [disabled]="decidingSharedIds.has(sh.id)">
                          Refuser
                        </button>
                      }
                      @if (sh.decision === 'ACCEPTED' || sh.acceptedByCurrentUser) {
                        <span class="decision-pill accepted">Acceptée</span>
                      }
                      <button class="tiny-btn ghost" type="button" (click)="toggleShared(sh)">
                        {{ expandedSharedId() === sh.id ? 'Masquer' : 'Détails' }}
                      </button>
                    </div>
                    @if (expandedSharedId() === sh.id) {
                      <div class="shared-details">
                        <div class="shared-by-line">
                          <strong>Partagé par</strong>
                          <span>{{ sh.sharedBy || sh.ownerName || 'Membre' }}</span>
                        </div>
                        <div class="comments-mini">
                          @if (loadingCommentSessionIds.has(sh.sessionId)) {
                            <p class="empty-msg compact">Chargement des commentaires...</p>
                          }
                          @for (comment of commentsFor(sh.sessionId); track comment.id) {
                            <div class="comment-mini" [class.mine]="isMyComment(comment)">
                              <div class="comment-avatar">{{ commentInitials(comment) }}</div>
                              <div class="comment-bubble">
                                <div class="comment-head">
                                  <strong>{{ comment.authorName || 'Membre' }}</strong>
                                  <span>{{ relativeCommentTime(comment.createdAt) }}</span>
                                </div>
                                <p>{{ comment.content }}</p>
                              </div>
                            </div>
                          } @empty {
                            <p class="empty-msg compact">Aucun commentaire pour cette session.</p>
                          }
                        </div>
                        <div class="comment-form-mini">
                          <textarea
                            [(ngModel)]="commentDrafts[sh.sessionId]"
                            [ngModelOptions]="{standalone: true}"
                            (keydown.enter)="submitSharedComment($event, sh)"
                            rows="1"
                            placeholder="Commenter cette session"></textarea>
                          <button type="button" class="tiny-btn icon-send" title="Envoyer" (click)="addSharedComment(sh)" [disabled]="!commentDrafts[sh.sessionId]?.trim() || submittingCommentSessionIds.has(sh.sessionId)">
                            &gt;
                          </button>
                        </div>
                      </div>
                    }
                  </div>
                </div>
             }
             @if (shared.length === 0) {
                <p class="empty-msg">Aucune session partagée</p>
             }
            </div>
          </div>
        </aside>

        <!-- Colonne droite : Chat -->
        <div class="right-col">
          <div class="card card-chat">
            <div class="card-header">
              <div>
                <h2 class="card-title">
                 Discussion du groupe
                </h2>
                <p class="card-sub">
                 {{ messages().length }} message{{ messages().length !== 1 ? 's' : '' }}
                </p>
              </div>
            
            </div>
            <div class="chat-body">
              <app-chat-box 
                [messages]="messages()" 
                [memberPhotos]="memberPhotosMap"
                [avatarColors]="avatarColorsMap"
                (send)="onSend($event)" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL sessions membre -->
   @if (selectedMember()) {
      <div class="modal-overlay" (click)="closeMemberSessions()">
        <div class="modal-box" (click)="$event.stopPropagation()">
          <app-member-sessions-panel
           [member]="selectedMember()!"
           [groupId]="groupId"
           (panelClose)="closeMemberSessions()"
         />
        </div>
      </div>
   }
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral:  #ff8e7e;
      --dark:   #1a1a1a;
      --bg:     #f0ece3;
      --white:  #ffffff;
      --card-bg:#faf7f2;
      --border: rgba(0,0,0,.07);
      --shadow: 0 2px 16px rgba(0,0,0,.06);
      --radius: 18px;
      --font:   'Plus Jakarta Sans','Segoe UI',sans-serif;
      display: block;
      font-family: var(--font);
    }
    /* Shell */
    .page-shell { display:flex; min-height:100%; background:var(--bg); }
    .page-content {
      flex:1; min-width:0; min-height:0;
      padding:28px 32px 28px 0;
      display:flex; flex-direction:column; gap:20px;
      transition:filter 300ms;
    }
    .page-content.blurred { filter:blur(5px) brightness(.97); pointer-events:none; user-select:none; }
    .loading-panel {
      display:flex; align-items:center; gap:10px;
      padding:12px 16px; border-radius:14px;
      background:#fff; border:1px solid var(--border);
      color:#817a73; font-size:.82rem; font-weight:800;
      box-shadow:var(--shadow);
    }
    .loading-spinner {
      width:16px; height:16px; border-radius:50%;
      border:2px solid rgba(0,0,0,.12); border-top-color:var(--dark);
      animation:spin .8s linear infinite;
    }
    @keyframes spin { to { transform:rotate(360deg); } }

    /* Topbar */
    .topbar {
      display:flex; align-items:flex-start; justify-content:space-between;
      flex-wrap:wrap; gap:16px;
    }
    .page-title { margin:0; font-size:1.9rem; font-weight:900; color:var(--dark); letter-spacing:-.03em; line-height:1.1; }
    .page-sub   { margin:5px 0 0; font-size:.82rem; color:#9e9890; font-weight:500; }
    .topbar-right { display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
    .btn-back {
      display:inline-flex; align-items:center; gap:6px;
      padding:9px 18px; border-radius:999px;
      background:var(--dark); color:var(--white);
      font-size:.8rem; font-weight:700; text-decoration:none;
      transition:opacity 150ms, transform 150ms;
    }
    .btn-back:hover { opacity:.85; transform:translateY(-1px); }
    .notif-btn {
      width:38px; height:38px; border-radius:50%;
      background:var(--white); border:1px solid var(--border);
      display:grid; place-items:center; color:#bbb;
      box-shadow:var(--shadow); cursor:pointer;
    }
    .notif-btn svg { width:17px; height:17px; }

    /* Grid */
    .main-grid {
      display:flex;
      gap:32px;
      align-items:stretch;
      flex:1 1 auto;
      min-height:0;
      height:calc(100dvh - 128px);
      overflow:visible;
    }
    @media(max-width:1050px) {
      .main-grid { flex-direction:column; gap:20px; height:auto; }
      .page-content { padding:20px 16px 32px 0; }
    }
    .left-col {
      flex:0 0 460px;
      width:460px;
      max-width:460px;
      display:flex; flex-direction:column; gap:20px;
      margin-left:-10px;
      min-height:0; max-height:100%;
      overflow-y:auto; overflow-x:hidden;
      padding-right:8px;
    }
    .left-col .card { flex:0 0 auto; }
    .right-col {
      flex:1 1 0;
      min-width:0;
      display:flex;
      flex-direction:column;
      min-height:0;
    }
    @media(max-width:1050px) {
      .left-col {
        flex:0 0 auto;
        width:100%;
        max-width:none;
        max-height:none;
        margin-left:0;
        overflow:visible;
        padding-right:0;
      }
    }

    /* Cards */
    .card {
      background:var(--card-bg); border-radius:var(--radius);
      border:1px solid var(--border); box-shadow:var(--shadow);
      overflow:hidden; width:100%;
    }
    .card-chat {
      display:flex; flex-direction:column; flex:1 1 auto; min-height:0; overflow:hidden;
    }
    .card-header {
      display:flex; justify-content:space-between; align-items:flex-start;
      padding:18px 22px 14px; border-bottom:1px solid var(--border);
    }
    .card-title {
      display:flex; align-items:center; gap:6px;
      margin:0; font-size:.95rem; font-weight:800; color:var(--dark); letter-spacing:-.01em;
    }
    .card-sub { margin:3px 0 0; font-size:.72rem; color:#a09890; font-weight:500; }
    .count-pill { text-align:right; line-height:1; }
    .count-num  { display:block; font-size:1.35rem; font-weight:900; color:var(--dark); }
    .count-lbl  { font-size:.58rem; color:#bbb; font-weight:700; text-transform:uppercase; letter-spacing:.05em; }
    .online-pill {
      display:inline-flex; align-items:center; gap:6px;
      padding:5px 12px; background:rgba(45,169,106,.1);
      color:#1d8a50; border-radius:999px; font-size:.7rem; font-weight:700;
    }
    .online-dot {
      width:6px; height:6px; border-radius:50%;
      background:#2da96a; box-shadow:0 0 5px #2da96a;
      animation:pulse 2s ease-in-out infinite;
    }
    @keyframes pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.5);opacity:.6} }

    /* Membres */
    .members-list { padding:8px 18px 14px; }

    .member-row {
      display:flex; align-items:center; gap:12px;
      padding:10px 0; /* Plus d'espace vertical */
    }
    .member-row.inactive { opacity:.5; }

    /* Photo + ring */
    .m-avatar-wrap { position:relative; flex-shrink:0; }
    .m-photo {
      width:42px; height:42px; /* Un peu plus grand */
      border-radius:50%;
      object-fit:cover;
      border:2px solid var(--white);
      box-shadow:0 2px 8px rgba(0,0,0,.12);
    }
    .m-avatar {
      width:42px; height:42px; border-radius:50%;
      display:grid; place-items:center;
      color:#fff; font-weight:800; font-size:.75rem;
      border:2px solid var(--white);
      box-shadow:0 2px 8px rgba(0,0,0,.12);
    }
    
    /* Point de statut sur l'avatar */
    .status-dot {
      position:absolute; bottom:1px; right:1px;
      width:10px; height:10px; border-radius:50%;
      background:#ccc; border:2px solid var(--white);
      transition: background 0.3s;
    }
    .status-dot.on { background:#2da96a; box-shadow:0 0 4px #2da96a; }

    .m-info { flex:1; min-width:0; }
    .m-name {
      display:block; font-size:.88rem; font-weight:700; color:var(--dark);
      margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .m-tags { display:flex; align-items:center; gap:6px; flex-wrap:wrap; }
    .role-tag {
      font-size:.6rem; font-weight:800; padding:2px 8px;
      border-radius:20px; text-transform:uppercase; letter-spacing:.04em;
    }
    .role-OWNER     { background:rgba(245,197,24,.18); color:#7a5e00; }
    .role-MODERATOR { background:rgba(126,184,247,.22); color:#1a5a99; }
    .role-MEMBER    { background:rgba(0,0,0,.06); color:#777; }
    .status-txt { font-size:.65rem; color:#a09890; font-weight:500; }

    /* Sessions button */
    .sessions-btn {
      display:inline-flex; align-items:center; gap:5px;
      padding:6px 13px; border-radius:999px;
      background:var(--dark); color:var(--yellow);
      border:none; font-size:.68rem; font-weight:800;
      cursor:pointer; white-space:nowrap; letter-spacing:.02em;
      font-family:var(--font);
      transition:opacity 150ms, transform 150ms;
      flex-shrink:0;
    }
    .sessions-btn:hover { opacity:.82; transform:translateY(-1px); }

    .current-session-list {
      padding:10px 18px 14px;
      display:flex; flex-direction:column; gap:8px;
    }
    .current-session-row {
      display:flex; gap:10px; align-items:flex-start;
      padding:9px 0;
      border-bottom:1px solid rgba(0,0,0,.05);
    }
    .current-session-row:last-child { border-bottom:none; }
    .current-session-dot {
      width:8px; height:8px; border-radius:50%;
      background:#2da96a; margin-top:6px;
      box-shadow:0 0 0 3px rgba(45,169,106,.14);
      flex-shrink:0;
    }
    .current-session-body { min-width:0; display:flex; flex-direction:column; gap:3px; }
    .current-session-title {
      font-size:.8rem; font-weight:800; color:var(--dark);
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .current-session-meta {
      font-size:.66rem; font-weight:600; color:#9f978e;
      white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }

    /* Sessions partagées */
    .share-form {
      display:flex; flex-direction:column; gap:8px;
      padding:14px 18px 8px;
      border-bottom:1px solid var(--border);
    }
    .share-form select, .share-form textarea {
      width:100%; border:1px solid rgba(0,0,0,.1);
      border-radius:12px; background:#fff; color:var(--dark);
      padding:9px 11px; font:inherit; font-size:.76rem;
      outline:none;
    }
    .share-form textarea { resize:vertical; min-height:54px; }
    .share-btn, .tiny-btn {
      border:none; border-radius:999px; background:var(--dark); color:var(--yellow);
      padding:8px 13px; font-size:.72rem; font-weight:800; cursor:pointer;
      transition:opacity 150ms, transform 150ms;
    }
    .share-btn:disabled, .tiny-btn:disabled { opacity:.45; cursor:default; }
    .share-btn:not(:disabled):hover, .tiny-btn:not(:disabled):hover { opacity:.88; transform:translateY(-1px); }
    .tiny-btn.ghost { background:rgba(0,0,0,.07); color:var(--dark); }
    .decision-pill {
      display:inline-flex; align-items:center; border-radius:999px;
      padding:7px 11px; font-size:.68rem; font-weight:800;
      background:rgba(45,169,106,.12); color:#1d8a50;
    }
    .shared-list { padding:8px 22px 16px; display:flex; flex-direction:column; gap:2px; }
    .shared-row {
      display:flex; gap:12px; padding:10px 0;
      border-bottom:1px solid rgba(0,0,0,.05);
    }
    .shared-row:last-child { border-bottom:none; }
    .shared-row.expanded { border-bottom-color:rgba(0,0,0,.12); }
    .shared-dot {
      width:7px; height:7px; border-radius:50%;
      background:var(--yellow); margin-top:5px; flex-shrink:0;
      box-shadow:0 0 0 3px rgba(245,197,24,.18);
    }
    .shared-body { flex:1; min-width:0; }
    .shared-title {
      display:block; font-size:.82rem; font-weight:700; color:var(--dark);
      margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;
    }
    .shared-meta-grid {
      display:grid; grid-template-columns:1fr 1fr; gap:3px 10px;
      font-size:.62rem; color:#9f978e; font-weight:600; margin-bottom:4px;
    }
    .shared-msg  { font-size:.72rem; color:#a09890; margin:4px 0 0; line-height:1.4; }
    .shared-actions { display:flex; gap:8px; flex-wrap:wrap; margin-top:10px; }
    .shared-details {
      margin-top:10px; padding:10px; border-radius:12px;
      background:rgba(255,255,255,.65); border:1px solid var(--border);
    }
    .shared-by-line { display:flex; flex-direction:column; gap:3px; font-size:.72rem; color:#817a73; margin-bottom:8px; }
    .shared-by-line strong { color:var(--dark); font-size:.7rem; }
    .comments-mini { display:flex; flex-direction:column; gap:8px; max-height:190px; overflow:auto; margin-bottom:10px; padding-right:2px; }
    .comment-mini { display:flex; align-items:flex-start; gap:8px; font-size:.72rem; }
    .comment-mini.mine { flex-direction:row-reverse; }
    .comment-avatar {
      width:28px; height:28px; border-radius:50%; flex:0 0 auto;
      display:grid; place-items:center; background:#f5c518; color:var(--dark);
      font-size:.62rem; font-weight:900; box-shadow:0 4px 12px rgba(0,0,0,.08);
    }
    .comment-mini.mine .comment-avatar { background:var(--dark); color:#fff; }
    .comment-bubble {
      min-width:0; max-width:82%; background:#fff; border:1px solid rgba(0,0,0,.05);
      border-radius:14px; padding:8px 10px; box-shadow:0 4px 14px rgba(0,0,0,.04);
    }
    .comment-mini.mine .comment-bubble { background:rgba(26,24,20,.92); color:#fff; }
    .comment-head { display:flex; gap:8px; align-items:center; justify-content:space-between; margin-bottom:4px; }
    .comment-head strong { color:var(--dark); font-size:.68rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .comment-head span { color:#aaa39b; font-size:.6rem; flex:0 0 auto; }
    .comment-mini.mine .comment-head strong, .comment-mini.mine .comment-head span { color:rgba(255,255,255,.78); }
    .comment-bubble p { margin:0; line-height:1.35; white-space:pre-wrap; word-break:break-word; }
    .comment-form-mini { display:flex; gap:8px; align-items:flex-end; }
    .comment-form-mini textarea {
      min-width:0; flex:1; border:1px solid rgba(0,0,0,.1);
      border-radius:14px; padding:9px 11px; font:inherit; font-size:.72rem;
      resize:vertical; max-height:110px; background:#fff;
    }
    .icon-send {
      width:34px; min-width:34px; height:34px; border-radius:50%;
      padding:0; display:grid; place-items:center; font-size:.9rem;
    }
    .compact { padding:6px 0; }
    .comment-toggle {
      align-self:flex-start; margin-top:6px; border:none;
      border-radius:999px; padding:4px 10px;
      background:rgba(26,24,20,.08); color:var(--dark);
      font-size:.68rem; font-weight:800; cursor:pointer;
    }
    .active-comments { margin-top:8px; }

    /* Chat */
    .chat-body { flex:1 1 auto; display:flex; flex-direction:column; min-height:0; overflow:hidden; background:rgba(255,255,255,.35); }
    .chat-body ::ng-deep app-chat-box { display:flex; flex-direction:column; flex:1 1 auto; min-height:0; }
    .chat-body ::ng-deep .cb {
      border:none; border-radius:0; background:transparent; box-shadow:none;
      flex:1 1 auto; min-height:0; display:flex; flex-direction:column;
    }
    .chat-body ::ng-deep .cb-stream { background:transparent; flex:1 1 auto; min-height:0; overflow-y:auto; }
    .chat-body ::ng-deep .cb-bubble  { background:rgba(0,0,0,.05); }
    .chat-body ::ng-deep .cb-msg.me .cb-bubble { background:var(--dark); color:#fff; }
    .chat-body ::ng-deep .cb-form {
      background:rgba(0,0,0,.04); border-top:1px solid var(--border);
      flex-shrink:0; margin-top:auto;
    } 
    .chat-body ::ng-deep .cb-form input { background:var(--white); }

    /* Modal overlay */
    .modal-overlay {
      position:fixed; inset:0; z-index:300;
      display:flex; align-items:center; justify-content:center;
      background:rgba(15,13,10,.4);
      animation:overlay-in 220ms ease both;
    }
    @keyframes overlay-in { from{opacity:0} }
    .modal-box {
      position:relative;
      width:min(560px,92vw); height:min(680px,88vh);
      border-radius:24px; overflow:hidden; background:#fff;
      box-shadow:0 40px 100px rgba(0,0,0,.25), 0 12px 32px rgba(0,0,0,.15);
      animation:modal-in 280ms cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes modal-in { from{opacity:0;transform:scale(.93) translateY(16px)} }
    .modal-box ::ng-deep app-member-sessions-panel {
       position:absolute !important; inset:0 !important;
      z-index:1 !important; display:block !important;
    }
    .modal-box ::ng-deep .backdrop { display:none !important; }
    .modal-box ::ng-deep .panel {
      position:absolute !important; inset:0 !important;
      width:100% !important; height:100% !important;
      max-width:unset !important; box-shadow:none !important;
      border-radius:0 !important; animation:none !important;
    }

    /* Utils */
    .empty-msg { text-align:center; color:#c5bfb6; font-size:.78rem; padding:20px 0; font-weight:500; }
  `]
})
export class ChatComponent implements OnInit, OnDestroy {
  private route    = inject(ActivatedRoute);
  private groupSvc = inject(GroupService);
  private chatSvc  = inject(ChatService);
  private ws       = inject(WebSocketService);
  private auth     = inject(AuthService);
  private cdr      = inject(ChangeDetectorRef);
  private zone     = inject(NgZone);
  groupId       = this.route.snapshot.paramMap.get('groupId') || 'g1';
  groupFallback = "Groupe d'étude";
  group?: { id: string; name?: string; description?: string };
  members: GroupMembership[] = [];
  shared: SharedSession[] = [];
  mySessions: StudySession[] = [];
  loadingShareableSessions = false;
  selectedSessionId = '';
  shareMessage = '';
  sharing = false;
  commentDrafts: Record<string, string> = {};
  sharedComments: SharedCommentMap = {};
  decidingSharedIds = new Set<string>();
  submittingCommentSessionIds = new Set<string>();
  loadingCommentSessionIds = new Set<string>();
  messages       = signal<ChatMessage[]>([]);
  loading        = signal(true);
  selectedMember = signal<GroupMembership | null>(null);
  expandedSharedId = signal<string | null>(null);
  private roomId = '';
  private subs: Subscription[] = [];
  private handledGroupEventKeys = new Set<string>();
  
  // Maps pour les photos et couleurs des membres (pour le chat)
  memberPhotosMap: Record<string, string | null> = {};
  avatarColorsMap: Record<string, string> = {};

  ngOnInit(): void {
    this.loading.set(true);
    forkJoin({
      group: this.groupSvc.get(this.groupId).pipe(catchError(() => of(this.groupSvc.groups().find(g => g.id === this.groupId)))),
      members: this.groupSvc.members(this.groupId).pipe(catchError(err => {
        console.error('Erreur chargement membres du groupe:', err);
        return of([]);
      })),
      shared: this.groupSvc.listSharedSessions(this.groupId).pipe(catchError(err => {
        console.error('Erreur chargement sessions partagees:', err);
        return of([]);
      })),
      sessions: this.groupSvc.listShareableSessions(this.groupId).pipe(catchError(err => {
        console.error('Erreur chargement sessions partageables:', err);
        return of([]);
      })),
      room: this.chatSvc.roomForGroup(this.groupId)
    }).pipe(
      switchMap(data => {
        this.group = data.group;
        this.members = data.members;
        this.shared = data.shared
          .map(item => this.applyStoredDecision(item))
          .filter(item => item.decision !== 'DECLINED');
        this.mySessions = data.sessions;
        this.roomId = data.room.id;
        this.syncMemberSessionCache(this.shared);
        this.initMemberMaps();
        this.openRequestedSharedSession();
        return this.chatSvc.history(data.room.id, 0, 50).pipe(catchError(err => {
          console.error('Erreur chargement historique chat:', err);
          return of([]);
        }));
      }),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: history => {
        this.messages.set([...history].reverse().map(m => this.normalizeMessage(m)));
        this.initMemberMaps();
        this.subscribeRealtimeChat();
      },
      error: err => {
        console.error('Erreur ouverture chat groupe:', err);
        this.loading.set(false);
        alert("Impossible d'ouvrir le chat de ce groupe.");
      }
    });
    this.listenGroupEvents();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    if (this.roomId) this.ws.unsubscribeRoom(this.roomId);
    this.ws.unsubscribeGroupEvents(this.groupId);
  }

  private subscribeRealtimeChat(): void {
    if (!this.roomId) return;
    this.ws.connect();
    // Les callbacks STOMP arrivent HORS de la NgZone Angular -> on les ramene
    // dans la zone pour declencher la change detection (sinon les nouveaux
    // messages n'apparaissent qu'apres un refresh manuel).
    this.subs.push(this.ws.subscribeRoom(this.roomId).subscribe(msg => {
      this.zone.run(() => {
        const normalized = this.normalizeMessage(msg);
        this.messages.update(list =>
          list.some(m => m.id === normalized.id) ? list : [...list, normalized]
        );
        this.cdr.detectChanges();
      });
    }));
  }

  private listenGroupEvents(): void {
    this.ws.connect();
    this.subs.push(this.ws.subscribeGroupEvents(this.groupId).subscribe(event => {
      this.zone.run(() => {
        this.handleGroupEvent(event);
        this.cdr.detectChanges();
      });
    }));
  }

  private loadSharedSessions(): void {
    this.groupSvc.listSharedSessions(this.groupId).subscribe({
      next: list => {
        this.shared = list
          .map(item => this.applyStoredDecision(item))
          .filter(item => item.decision !== 'DECLINED');
        this.syncMemberSessionCache(this.shared);
        this.openRequestedSharedSession();
      },
      error: err => {
        console.error('Erreur chargement sessions partagees:', err);
        this.shared = [];
      }
    });
  }

  private initMemberMaps(): void {
    // Pour chaque membre, déterminer sa photo et sa couleur d'avatar
    this.members.forEach(member => {
      const userId = member.userId;
      this.memberPhotosMap[userId] = MEMBER_PHOTOS[userId] ?? null;
      this.avatarColorsMap[userId] = this.avatarColor(userId);
    });
    
    // Ajouter également pour les auteurs de messages qui ne seraient pas dans members
    const messagesList = this.messages();
    messagesList.forEach(msg => {
      if (!this.memberPhotosMap[msg.authorId]) {
        this.memberPhotosMap[msg.authorId] = MEMBER_PHOTOS[msg.authorId] ?? null;
      }
      if (!this.avatarColorsMap[msg.authorId]) {
        this.avatarColorsMap[msg.authorId] = this.avatarColor(msg.authorId);
      }
    });
  }

  onSend(text: string): void {
    if (!this.roomId || !text.trim()) return;
    if (!this.ws.connected()) {
      this.chatSvc.send(this.roomId, text.trim()).subscribe({
        next: saved => {
          const normalized = this.normalizeMessage(saved);
          this.messages.update(list => list.some(m => m.id === normalized.id) ? list : [...list, normalized]);
        },
        error: err => {
          console.error('Erreur envoi message:', err);
          alert("Impossible d'envoyer le message.");
        }
      });
      return;
    }
    this.ws.sendMessage(this.roomId, text);
  }

  shareSelectedSession(): void {
    if (!this.selectedSessionId || this.sharing) return;
    const sharedSessionId = this.selectedSessionId;
    this.sharing = true;
    this.groupSvc.shareSession(this.groupId, this.selectedSessionId, this.shareMessage.trim() || undefined)
      .pipe(finalize(() => this.sharing = false))
      .subscribe({
      next: shared => {
        const item = this.applyStoredDecision(shared);
        this.shared = item.decision === 'DECLINED'
          ? this.shared.filter(existing => existing.id !== item.id)
          : [item, ...this.shared.filter(existing => existing.id !== item.id)];
        this.syncMemberSessionCache(this.shared);
        this.mySessions = this.mySessions.filter(session => session.id !== sharedSessionId);
        this.selectedSessionId = '';
        this.shareMessage = '';
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Erreur partage session:', err);
        alert(err?.error?.message || 'Impossible de partager cette session.');
      },
    });
  }

  acceptSharedSession(shared: SharedSession): void {
    if (this.decidingSharedIds.has(shared.id)) return;
    this.decidingSharedIds.add(shared.id);
    this.groupSvc.acceptSharedSession(this.groupId, shared.id)
      .pipe(finalize(() => this.decidingSharedIds.delete(shared.id)))
      .subscribe({
        next: result => {
          this.storeDecision(shared.id, 'ACCEPTED');
          this.shared = this.shared.map(item => item.id === shared.id
            ? {
                ...item,
                ...result.sharedSession,
                decision: 'ACCEPTED',
                acceptedByCurrentUser: true,
                personalSessionId: result.personalSessionId
              }
            : item);
          this.syncMemberSessionCache(this.shared);
          this.loadShareableSessions();
          this.cdr.detectChanges();
        },
        error: err => {
          alert(err?.error?.message || "Impossible d'accepter cette session.");
        }
      });
  }

  private loadShareableSessions(): void {
    this.loadingShareableSessions = true;
    this.groupSvc.listShareableSessions(this.groupId)
      .pipe(finalize(() => this.loadingShareableSessions = false))
      .subscribe({
        next: sessions => this.mySessions = sessions,
        error: err => {
          console.error('Erreur chargement sessions partageables:', err);
          this.mySessions = [];
        }
      });
  }

  declineSharedSession(shared: SharedSession): void {
    if (this.decidingSharedIds.has(shared.id)) return;
    this.decidingSharedIds.add(shared.id);
    this.groupSvc.declineSharedSession(this.groupId, shared.id)
      .pipe(finalize(() => this.decidingSharedIds.delete(shared.id)))
      .subscribe({
        next: () => {
          this.storeDecision(shared.id, 'DECLINED');
          this.shared = this.shared.filter(item => item.id !== shared.id);
          this.syncMemberSessionCache(this.shared);
        },
        error: err => {
          alert(err?.error?.message || 'Impossible de refuser cette session.');
        }
      });
  }

  toggleShared(shared: SharedSession): void {
    const next = this.expandedSharedId() === shared.id ? null : shared.id;
    this.expandedSharedId.set(next);
    if (next) {
      this.loadingCommentSessionIds.add(shared.sessionId);
      this.chatSvc.listComments(shared.sessionId).pipe(
        finalize(() => {
          this.loadingCommentSessionIds.delete(shared.sessionId);
          this.cdr.detectChanges();
        })
      ).subscribe({
        next: comments => {
          this.sharedComments = { ...this.sharedComments, [shared.sessionId]: this.mergeComments(shared.sessionId, comments) };
        },
        error: err => console.error('Erreur chargement commentaires:', err)
      });
    }
  }

  addSharedComment(shared: SharedSession): void {
    const content = this.commentDrafts[shared.sessionId]?.trim();
    if (!content || this.submittingCommentSessionIds.has(shared.sessionId)) return;
    this.submittingCommentSessionIds.add(shared.sessionId);
    this.chatSvc.addComment(shared.sessionId, content)
      .pipe(finalize(() => this.submittingCommentSessionIds.delete(shared.sessionId)))
      .subscribe({
      next: comment => {
        this.addCommentToState(comment);
        this.commentDrafts[shared.sessionId] = '';
        this.cdr.detectChanges();
      },
      error: err => {
        console.error('Erreur ajout commentaire:', err);
        alert(err?.error?.message || "Impossible d'ajouter le commentaire.");
      }
    });
  }

  submitSharedComment(event: Event, shared: SharedSession): void {
    if (event instanceof KeyboardEvent && event.shiftKey) return;
    event.preventDefault();
    this.addSharedComment(shared);
  }

  commentsFor(sessionId: string): SessionComment[] {
    return this.sharedComments[sessionId] ?? [];
  }

  isMyComment(comment: SessionComment): boolean {
    return !!this.auth.currentUser?.id && comment.authorId === this.auth.currentUser.id;
  }

  commentInitials(comment: SessionComment): string {
    const name = (comment.authorName || 'Membre').trim();
    return name.split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'M';
  }

  relativeCommentTime(date?: string): string {
    if (!date) return '';
    const diffMs = Date.now() - new Date(date).getTime();
    const minutes = Math.max(0, Math.floor(diffMs / 60_000));
    if (minutes < 1) return 'maintenant';
    if (minutes < 60) return `il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `il y a ${hours} h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `il y a ${days} j`;
    return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
  }

  currentSharedSessions(): SharedSession[] {
    return this.shared.filter(shared => this.isSharedSessionCurrent(shared));
  }

  durationLabel(shared: SharedSession): string {
    const minutes = shared.plannedDuration ?? 0;
    if (!minutes) return 'Durée non renseignée';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h${m ? ` ${m}min` : ''}` : `${m}min`;
  }

  formatDateTime(date?: string): string {
    if (!date) return 'Date non renseignée';
    return new Date(date).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  private syncMemberSessionCache(list: SharedSession[]): void {
    const byOwner = new Map<string, SharedSession[]>();
    list.forEach(shared => {
      if (!this.isSharedSessionCurrent(shared)) return;
      const ownerId = shared.ownerId || shared.sharedById;
      if (!ownerId) return;
      byOwner.set(ownerId, [...(byOwner.get(ownerId) ?? []), shared]);
    });
    this.members.forEach(member => this.groupSvc.setMemberSessions(this.groupId, member.userId, []));
    byOwner.forEach((sessions, userId) => {
      this.groupSvc.setMemberSessions(this.groupId, userId, sessions.map(shared => ({
        id: shared.sessionId,
        userId,
        userName: shared.ownerName || shared.sharedBy || 'Membre',
        groupId: this.groupId,
        sessionTitle: shared.title || shared.sessionTitle || 'Session partagée',
        description: shared.description || shared.message || '',
        createdAt: shared.startDateTime || shared.sharedAt,
        updatedAt: shared.endDateTime || shared.sharedAt,
        comments: [],
      })));
    });
  }

  private isSharedSessionCurrent(shared: SharedSession): boolean {
    if (!shared.startDateTime || !shared.endDateTime) return false;
    const now = Date.now();
    return new Date(shared.startDateTime).getTime() <= now
      && new Date(shared.endDateTime).getTime() >= now;
  }

  private normalizeMessage(msg: ChatMessage): ChatMessage {
    const senderId = msg.senderId || msg.authorId || '';
    const senderName = msg.senderName || msg.authorName || 'Utilisateur';
    const currentUserId = this.auth.currentUser?.id;
    return {
      ...msg,
      senderId,
      senderName,
      authorId: senderId,
      authorName: senderName,
      isEdited: msg.isEdited ?? msg.edited ?? false,
      isDeleted: msg.isDeleted ?? msg.deleted ?? false,
      isMe: !!currentUserId && senderId === currentUserId,
    };
  }

  private handleGroupEvent(event: GroupRealtimeEvent): void {
    if (event.groupId !== this.groupId) return;
    if (this.hasHandledGroupEvent(event)) return;

    if (event.type === 'GROUP_UPDATED') {
      if (event.payload) this.group = event.payload as { id: string; name?: string; description?: string };
      else this.groupSvc.get(this.groupId).subscribe({ next: group => this.group = group });
      this.groupSvc.members(this.groupId).subscribe({
        next: members => {
          this.members = members;
          this.initMemberMaps();
          this.syncMemberSessionCache(this.shared);
          this.cdr.detectChanges();
        }
      });
      return;
    }

    if (event.type === 'SHARED_SESSION_CREATED' || event.type === 'sharedSessionCreated') {
      const shared = event.payload as SharedSession | undefined;
      if (!shared?.id) {
        this.loadSharedSessions();
        return;
      }
      const item = this.applyStoredDecision(shared);
      if (item.decision !== 'DECLINED') {
        this.shared = [item, ...this.shared.filter(existing => existing.id !== item.id)];
        this.syncMemberSessionCache(this.shared);
        this.cdr.detectChanges();
      }
      return;
    }

    if (event.type === 'SHARED_SESSION_COMMENT_ADDED' || event.type === 'sharedSessionCommentAdded') {
      const comment = event.payload as SessionComment | undefined;
      if (comment?.id) {
        this.addCommentToState(comment);
        this.cdr.detectChanges();
      }
      return;
    }

    if ((event.type === 'SHARED_SESSION_ACCEPTED'
        || event.type === 'SHARED_SESSION_DECLINED'
        || event.type === 'sharedSessionAccepted'
        || event.type === 'sharedSessionDeclined')
        && event.sharedSessionId) {
      const decision = event.type === 'SHARED_SESSION_ACCEPTED' || event.type === 'sharedSessionAccepted' ? 'ACCEPTED' : 'DECLINED';
      const isCurrentUserDecision = event.actorId === this.auth.currentUser?.id;
      if (isCurrentUserDecision) this.storeDecision(event.sharedSessionId, decision);
      if (decision === 'DECLINED' && isCurrentUserDecision) {
        this.shared = this.shared.filter(item => item.id !== event.sharedSessionId);
      } else {
        const payload = event.payload as SharedSession | undefined;
        this.shared = this.shared.map(item => item.id === event.sharedSessionId
          ? {
              ...item,
              ...(payload?.id ? payload : {}),
              decision: isCurrentUserDecision ? decision : item.decision,
              acceptedByCurrentUser: isCurrentUserDecision && decision === 'ACCEPTED' ? true : item.acceptedByCurrentUser,
              declinedByCurrentUser: isCurrentUserDecision && decision === 'DECLINED' ? true : item.declinedByCurrentUser
            }
          : item);
      }
      this.syncMemberSessionCache(this.shared);
      this.cdr.detectChanges();
    }
  }

  private addCommentToState(comment: SessionComment): void {
    const current = this.sharedComments[comment.sessionId] ?? [];
    this.groupSvc.upsertSessionComment(comment.sessionId, {
      id: comment.id,
      memberSessionId: comment.sessionId,
      authorId: comment.authorId,
      authorName: comment.authorName ?? '',
      content: comment.content,
      createdAt: comment.createdAt
    });
    if (current.some(item => item.id === comment.id)) return;
    this.sharedComments = {
      ...this.sharedComments,
      [comment.sessionId]: [...current, comment]
    };
  }

  private mergeComments(sessionId: string, incoming: SessionComment[]): SessionComment[] {
    const byId = new Map<string, SessionComment>();
    [...(this.sharedComments[sessionId] ?? []), ...incoming].forEach(comment => byId.set(comment.id, comment));
    return [...byId.values()].sort((a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }

  private hasHandledGroupEvent(event: GroupRealtimeEvent): boolean {
    const key = [
      (event as any).id ?? '',
      (event as any).payload?.id ?? '',
    ].join('|');
    if (this.handledGroupEventKeys.has(key)) return true;
    this.handledGroupEventKeys.add(key);
    return false;
  }

  private applyStoredDecision(item: SharedSession): SharedSession {
    const key = 'shared-decision:' + item.id;
    const stored = localStorage.getItem(key);
    return stored ? { ...item, decision: stored as any } : item;
  }

  private storeDecision(item: SharedSession | string, decision: string): void {
    localStorage.setItem('shared-decision:' + (typeof item === 'string' ? item : item.id), decision);
  }

  private openRequestedSharedSession(): void {
    // Stub : ouverture differee d'une session partagee
  }

  avatarColor(userId: string): string {
    const colors = ['#f5c518', '#ff6b5b', '#5bd49a', '#6b8bff', '#9b72ef', '#3dc9b0'];
    let hash = 0;
    for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
    return colors[Math.abs(hash) % colors.length];
  }

  memberPhoto(userId: string): string | null {
    return this.memberPhotosMap[userId] ?? MEMBER_PHOTOS[userId] ?? null;
  }

  initials(name?: string): string {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  roleLabel(role?: string): string {
    const labels: Record<string, string> = { OWNER: 'Proprietaire', MODERATOR: 'Moderateur', MEMBER: 'Membre' };
    return labels[role ?? ''] ?? 'Membre';
  }

  openMemberSessions(member: GroupMembership): void {
    this.selectedMember.set(member);
  }

  closeMemberSessions(): void {
    this.selectedMember.set(null);
  }

  canDecideShared(sh: SharedSession): boolean {
    return sh.decision !== 'ACCEPTED' && sh.decision !== 'DECLINED';
  }
}
