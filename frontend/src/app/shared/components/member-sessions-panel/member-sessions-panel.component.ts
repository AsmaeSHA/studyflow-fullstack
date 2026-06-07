import {
  Component,
  Input,
  Output,
  OnChanges,
  SimpleChanges,
  signal,
  inject,
  EventEmitter
} from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GroupService } from '../../../core/services/group.service';
import { AuthService } from '../../../core/services/auth.service';
import { MemberSession, MemberSessionComment } from '../../../core/models/member-session.model';
import { GroupMembership } from '../../../core/models/models';

@Component({
  selector: 'app-member-sessions-panel',
  standalone: true,
  imports: [CommonModule, FormsModule, DatePipe],
  template: `
    <!-- Backdrop -->
    <div class="backdrop" (click)="panelClose.emit()"></div>

    <!-- Panel -->
    <aside class="panel">

      <!-- ── Header dark ── -->
      <div class="panel-header">
        <div class="member-info">
          <div class="member-av">{{ initials() }}</div>
          <div>
            <h2 class="member-name">{{ member.userName }}</h2>
            <span class="role-badge" [class]="'role-' + member.role.toLowerCase()">
              {{ member.role }}
            </span>
          </div>
        </div>
        <button class="close-btn" (click)="panelClose.emit()">
          <svg viewBox="0 0 20 20" fill="currentColor" width="15" height="15">
            <path fill-rule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0
                 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10
                 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293
                 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
          </svg>
        </button>
      </div>

      <!-- ── Sub-header ── -->
      <div class="panel-subheader">
        <span class="sessions-count">
          <svg viewBox="0 0 16 16" fill="currentColor" width="12" height="12">
            <path d="M2 3a1 1 0 011-1h10a1 1 0 011 1v7a1 1 0 01-1 1H9l-3 3v-3H3a1 1 0 01-1-1V3z"/>
          </svg>
          {{ sessions().length }} session{{ sessions().length !== 1 ? 's' : '' }} partagée{{ sessions().length !== 1 ? 's' : '' }}
        </span>
      </div>

      <!-- ── Body ── -->
      <div class="panel-body">

        @if (sessions().length === 0) {
          <div class="empty-state">
            <div class="empty-icon">🌌</div>
            <p>{{ member.userName }} n'a encore partagé aucune session dans ce groupe.</p>
          </div>
        }

        @for (session of sessions(); track session.id) {
          <div class="session-card" [class.expanded]="expandedId() === session.id">

            <!-- Row -->
            <div class="session-row" (click)="toggleExpand(session.id)">
              <div class="session-dot"></div>
              <div class="session-info">
                <p class="session-title">{{ session.sessionTitle }}</p>
                <p class="session-desc">{{ session.description }}</p>
                <p class="session-date">
                  {{ session.createdAt | date:'dd MMM yyyy · HH:mm' }}
                </p>
              </div>
              <div class="session-right">
                <span class="comment-pill">💬 {{ commentCount(session.id) }}</span>
                <svg class="chevron" [class.open]="expandedId() === session.id"
                     viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                  <path fill-rule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0
                       111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clip-rule="evenodd"/>
                </svg>
              </div>
            </div>

            <!-- Comments -->
            @if (expandedId() === session.id) {
              <div class="comments-section">

                <div class="comments-list">
                  @for (c of commentsFor(session.id); track c.id) {
                    <div class="comment-item" [class.own]="c.authorId === currentUserId">
                      <div class="comment-meta">
                        <span class="comment-author">{{ c.authorName }}</span>
                        <span class="comment-time">{{ c.createdAt | date:'dd/MM · HH:mm' }}</span>
                        @if (c.authorId === currentUserId) {
                          <button class="delete-btn" (click)="deleteComment(c.id)" title="Supprimer">
                            <svg viewBox="0 0 16 16" fill="currentColor" width="11" height="11">
                              <path fill-rule="evenodd"
                                d="M9 2H7a1 1 0 00-1 1H4a1 1 0 000 2h8a1 1 0 000-2h-2a1 1 0
                                   00-1-1zM5 6v6a1 1 0 001 1h4a1 1 0 001-1V6H5z"
                                clip-rule="evenodd"/>
                            </svg>
                          </button>
                        }
                      </div>
                      <div class="comment-bubble">{{ c.content }}</div>
                    </div>
                  } @empty {
                    <p class="no-comments">Aucun commentaire · Soyez le premier !</p>
                  }
                </div>

                <!-- Input -->
                <div class="add-comment">
                  <textarea
                    [(ngModel)]="newComments[session.id]"
                    placeholder="Votre commentaire…"
                    rows="2"
                    (keydown.enter)="submitCommentFromKeyboard($event, session.id)"
                  ></textarea>
                  <button
                    class="btn-send"
                    [disabled]="!newComments[session.id]?.trim() || submittingComments.has(session.id)"
                    (click)="submitComment(session.id)">
                    <svg viewBox="0 0 20 20" fill="currentColor" width="13" height="13">
                      <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0
                               001.169 1.409l5-1.429A1 1 0 009 15.571V11a1
                               1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1
                               0 001.17-1.408l-7-14z"/>
                    </svg>
                    Envoyer
                  </button>
                </div>

              </div>
            }

          </div>
        }
      </div>
    </aside>
  `,
  styles: [`
    :host {
      --yellow: #f5c518;
      --coral:  #ff8e7e;
      --dark:   #1a1a1a;
      --cream:  #ede8df;
      --border: rgba(0,0,0,.07);
      position: fixed;
      inset: 0;
      z-index: 200;
      display: flex;
      justify-content: flex-end;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    .backdrop {
      position: absolute; inset: 0;
      background: rgba(0,0,0,.5);
      backdrop-filter: blur(3px);
      animation: fade-in .2s ease both;
    }
    @keyframes fade-in { from { opacity: 0; } }

    /* ── Panel ── */
    .panel {
      position: relative;
      width: min(460px, 95vw);
      height: 100%;
      background: #fff;
      display: flex; flex-direction: column;
      box-shadow: -8px 0 40px rgba(0,0,0,.14);
      animation: slide-in .28s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes slide-in { from { transform: translateX(100%); } }

    /* ── Header ── */
    .panel-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 22px 20px 16px;
      background: var(--dark);
      flex-shrink: 0;
    }
    .member-info { display: flex; align-items: center; gap: 12px; }
    .member-av {
      width: 44px; height: 44px; border-radius: 14px;
      background: var(--yellow);
      color: var(--dark); font-size: .85rem; font-weight: 900;
      display: grid; place-items: center; flex-shrink: 0;
      border: 2px solid rgba(255,255,255,.12);
    }
    .member-name { margin: 0 0 4px; font-size: 1rem; font-weight: 800; color: #fff; }
    .role-badge {
      font-size: .62rem; font-weight: 800;
      padding: 2px 8px; border-radius: 999px;
      text-transform: uppercase; letter-spacing: .05em;
    }
    .role-owner     { background: rgba(245,197,24,.22); color: var(--yellow); }
    .role-moderator { background: rgba(126,184,247,.2);  color: #7eb8f7; }
    .role-member    { background: rgba(255,255,255,.1);  color: rgba(255,255,255,.7); }

    .close-btn {
      width: 32px; height: 32px; border-radius: 50%;
      border: none; background: rgba(255,255,255,.1);
      color: rgba(255,255,255,.8); cursor: pointer;
      display: grid; place-items: center;
      transition: background .15s ease;
    }
    .close-btn:hover { background: rgba(255,255,255,.2); }

    /* ── Sub-header ── */
    .panel-subheader {
      padding: 10px 18px;
      background: #faf8f5;
      border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .sessions-count {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: .7rem; font-weight: 800; color: #888;
      text-transform: uppercase; letter-spacing: .06em;
    }

    /* ── Body ── */
    .panel-body {
      flex: 1; overflow-y: auto;
      padding: 14px;
      display: flex; flex-direction: column; gap: 10px;
    }

    /* Empty */
    .empty-state { text-align: center; padding: 60px 20px; color: #aaa; }
    .empty-icon  { font-size: 2.8rem; margin-bottom: 12px; }
    .empty-state p { font-size: .88rem; line-height: 1.5; margin: 0; }

    /* ── Session card ── */
    .session-card {
      border-radius: 16px;
      border: 1.5px solid var(--border);
      background: #fff;
      overflow: hidden;
      transition: box-shadow .2s ease, border-color .2s ease;
    }
    .session-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,.06); }
    .session-card.expanded {
      border-color: var(--dark);
      box-shadow: 0 6px 24px rgba(26,26,26,.1);
    }

    .session-row {
      display: flex; align-items: flex-start; gap: 10px;
      padding: 12px 14px; cursor: pointer; user-select: none;
      transition: background .15s ease;
    }
    .session-row:hover { background: #faf8f5; }

    .session-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background: var(--yellow); flex-shrink: 0; margin-top: 5px;
      box-shadow: 0 0 0 3px rgba(245,197,24,.2);
    }
    .session-info { flex: 1; min-width: 0; }
    .session-title {
      font-size: .88rem; font-weight: 800; color: var(--dark);
      margin: 0 0 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .session-desc { font-size: .76rem; color: #888; margin: 0 0 5px; line-height: 1.4; }
    .session-date { font-size: .68rem; color: #bbb; font-weight: 600; margin: 0; }
    .session-right {
      display: flex; flex-direction: column; align-items: flex-end;
      gap: 6px; flex-shrink: 0;
    }
    .comment-pill {
      font-size: .66rem; font-weight: 800;
      color: var(--dark);
      background: rgba(245,197,24,.15);
      border: 1px solid rgba(245,197,24,.3);
      padding: 2px 8px; border-radius: 999px;
    }
    .chevron { color: #bbb; transition: transform .2s ease; }
    .chevron.open { transform: rotate(180deg); }

    /* ── Comments section ── */
    .comments-section {
      border-top: 1.5px solid var(--dark);
      background: #faf8f5;
      padding: 14px;
    }
    .comments-list {
      display: flex; flex-direction: column; gap: 8px;
      margin-bottom: 12px; max-height: 260px; overflow-y: auto;
    }
    .no-comments {
      text-align: center; padding: 14px;
      font-size: .76rem; color: #bbb; font-weight: 600;
    }

    .comment-item {
      display: flex; flex-direction: column; gap: 3px;
      align-items: flex-start;
    }
    .comment-item.own { align-items: flex-end; }

    .comment-meta {
      display: flex; align-items: center; gap: 6px;
    }
    .comment-author { font-size: .68rem; font-weight: 800; color: #666; }
    .comment-time   { font-size: .62rem; color: #bbb; }
    .delete-btn {
      background: none; border: none; cursor: pointer;
      color: #ccc; padding: 0; display: flex; align-items: center;
      transition: color .15s ease;
    }
    .delete-btn:hover { color: #e05a47; }

    .comment-bubble {
      max-width: 85%;
      padding: 8px 12px; border-radius: 12px;
      font-size: .8rem; line-height: 1.45;
      color: var(--dark);
      background: #fff; border: 1px solid var(--border);
      box-shadow: 0 1px 4px rgba(0,0,0,.04);
    }
    .comment-item.own .comment-bubble {
      background: var(--dark);
      color: var(--yellow);
      border-color: transparent;
      box-shadow: 0 2px 8px rgba(26,26,26,.18);
    }

    /* ── Add comment ── */
    .add-comment { display: flex; gap: 8px; align-items: flex-end; }
    .add-comment textarea {
      flex: 1; border: 1.5px solid #e8dfd5; border-radius: 12px;
      padding: 9px 12px; font-size: .82rem; resize: none;
      outline: none; font-family: inherit;
      background: #fff; color: var(--dark);
      transition: border-color .2s ease, box-shadow .2s ease;
    }
    .add-comment textarea:focus {
      border-color: var(--dark);
      box-shadow: 0 0 0 3px rgba(26,26,26,.08);
    }
    .btn-send {
      display: inline-flex; align-items: center; gap: 5px;
      background: var(--dark); color: var(--yellow);
      border: none; border-radius: 12px;
      padding: 9px 14px; font-size: .78rem; font-weight: 800;
      cursor: pointer; white-space: nowrap;
      transition: opacity .15s ease, transform .15s ease;
    }
    .btn-send:disabled { opacity: .35; cursor: default; }
    .btn-send:not(:disabled):hover { opacity: .88; transform: translateY(-1px); }
  `]
})
export class MemberSessionsPanelComponent implements OnChanges {
  @Input({ required: true }) member!: GroupMembership;
  @Input({ required: true }) groupId!: string;
  @Output() panelClose = new EventEmitter<void>();

  private readonly groupService = inject(GroupService);
  private readonly auth = inject(AuthService);
  readonly currentUserId = this.auth.currentUser?.id ?? '';

  sessions   = signal<MemberSession[]>([]);
  expandedId = signal<string | null>(null);
  newComments: Record<string, string> = {};
  submittingComments = new Set<string>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['member'] || changes['groupId']) {
      this.sessions.set(this.currentSessionsForMember());
      this.expandedId.set(null);
      this.newComments = {};
    }
  }

  initials(): string {
    return this.member.userName
      .split(' ')
      .map(w => w[0] ?? '')
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  commentsFor(sessionId: string): MemberSessionComment[] {
    return this.groupService.getSessionComments(sessionId);
  }

  commentCount(sessionId: string): number {
    return this.commentsFor(sessionId).length;
  }

  toggleExpand(id: string): void {
    const next = this.expandedId() === id ? null : id;
    this.expandedId.set(next);
    if (next) {
      this.groupService.fetchSessionComments(id).subscribe();
    }
  }

  submitComment(sessionId: string): void {
    const content = (this.newComments[sessionId] ?? '').trim();
    if (!content || this.submittingComments.has(sessionId)) return;
    this.submittingComments.add(sessionId);
    this.groupService.addCommentToSession(sessionId, content).subscribe({
      next: () => {
      this.newComments[sessionId] = '';
      this.sessions.set(this.currentSessionsForMember());
      },
      error: err => {
        this.submittingComments.delete(sessionId);
        console.error('Erreur ajout commentaire:', err);
        alert(err?.error?.message || "Impossible d'ajouter le commentaire.");
      },
      complete: () => this.submittingComments.delete(sessionId)
    });
  }

  submitCommentFromKeyboard(event: Event, sessionId: string): void {
    if (event instanceof KeyboardEvent && event.shiftKey) return;
    event.preventDefault();
    this.submitComment(sessionId);
  }

  private currentSessionsForMember(): MemberSession[] {
    const now = Date.now();
    return this.groupService.getMemberSessions(this.groupId, this.member.userId).filter(session => {
      const start = new Date(session.createdAt).getTime();
      const end = new Date(session.updatedAt).getTime();
      return start <= now && end >= now;
    });
  }

  deleteComment(commentId: string): void {
    this.groupService.deleteComment(commentId).subscribe();
  }
}
