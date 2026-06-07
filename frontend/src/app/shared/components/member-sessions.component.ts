import { Component, inject, signal, computed, OnInit, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { GroupService } from '../../core/services/group.service';
import { MemberSession, MemberSessionComment } from '../../core/models/member-session.model';

@Component({
  selector: 'app-member-sessions',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="member-sessions-wrapper">
      <!-- Header -->
      <div class="sessions-header">
        <button class="back-btn" (click)="goBack()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Retour
        </button>
        <h2>Sessions de {{ selectedMember()?.userName }}</h2>
      </div>

      <!-- Main content -->
      <div class="sessions-content">
        <!-- Sessions list -->
        <div class="sessions-list">
          <div *ngIf="memberSessions().length === 0" class="empty-state">
            <p>Aucune session partagée</p>
          </div>

          <div *ngFor="let session of memberSessions()" class="session-card">
            <!-- Session header -->
            <div class="session-header">
              <div class="session-info">
                <h3 class="session-title">{{ session.sessionTitle }}</h3>
                <p class="session-date">{{ formatDate(session.createdAt) }}</p>
              </div>
              <div class="comment-count">
                <span class="count-badge">{{ getCommentCount(session.id) }}</span>
                <span class="comment-label">commentaire{{ getCommentCount(session.id) !== 1 ? 's' : '' }}</span>
              </div>
            </div>

            <!-- Session description -->
            <p *ngIf="session.description" class="session-description">
              {{ session.description }}
            </p>

            <!-- Comments section -->
            <div class="comments-section">
              <div class="comments-header">
                <h4>Commentaires</h4>
              </div>

              <!-- Comments list -->
              <div class="comments-container">
                <div *ngFor="let comment of getSessionComments(session.id)" class="comment-item">
                  <div class="comment-meta">
                    <strong class="comment-author">{{ comment.authorName }}</strong>
                    <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                  </div>
                  <p class="comment-text">{{ comment.content }}</p>
                  <button *ngIf="comment.authorId === currentUserId"
                          class="delete-comment-btn"
                          (click)="deleteComment(comment.id)"
                          title="Supprimer">
                    ✕
                  </button>
                </div>

                <div *ngIf="getSessionComments(session.id).length === 0" class="no-comments">
                  Aucun commentaire pour le moment
                </div>
              </div>

              <!-- Add comment form -->
              <div class="add-comment-form">
                <textarea
                  [(ngModel)]="commentContent[session.id]"
                  placeholder="Ajouter un commentaire..."
                  class="comment-textarea"
                ></textarea>
                <button
                  (click)="addComment(session.id)"
                  [disabled]="!commentContent[session.id]?.trim()"
                  class="submit-comment-btn"
                >
                  Commenter
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .member-sessions-wrapper {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: #f8f9fa;
    }

    .sessions-header {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border-bottom: 1px solid #e9ecef;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .back-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: #f0f2f5;
      border: none;
      cursor: pointer;
      transition: all 0.2s;
      color: #495057;
    }

    .back-btn:hover {
      background: #dee2e6;
    }

    .back-btn svg {
      width: 18px;
      height: 18px;
    }

    .sessions-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #212529;
    }

    .sessions-content {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .sessions-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 200px;
      color: #6c757d;
      font-size: 14px;
    }

    .session-card {
      background: white;
      border-radius: 10px;
      padding: 16px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
      border: 1px solid #e9ecef;
    }

    .session-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
      gap: 12px;
    }

    .session-info {
      flex: 1;
    }

    .session-title {
      margin: 0;
      font-size: 15px;
      font-weight: 600;
      color: #212529;
    }

    .session-date {
      margin: 4px 0 0 0;
      font-size: 12px;
      color: #6c757d;
    }

    .comment-count {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: #495057;
      background: #f0f2f5;
      padding: 6px 10px;
      border-radius: 6px;
      white-space: nowrap;
    }

    .count-badge {
      font-weight: 600;
      font-size: 13px;
    }

    .session-description {
      margin: 0 0 12px 0;
      font-size: 13px;
      color: #495057;
      line-height: 1.5;
    }

    .comments-section {
      border-top: 1px solid #e9ecef;
      padding-top: 12px;
      margin-top: 12px;
    }

    .comments-header {
      margin-bottom: 10px;
    }

    .comments-header h4 {
      margin: 0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      color: #6c757d;
      letter-spacing: 0.5px;
    }

    .comments-container {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 12px;
      max-height: 200px;
      overflow-y: auto;
    }

    .comment-item {
      background: #f8f9fa;
      padding: 10px 12px;
      border-radius: 6px;
      font-size: 13px;
      position: relative;
      border-left: 3px solid #e9ecef;
    }

    .comment-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .comment-author {
      font-size: 13px;
      color: #212529;
    }

    .comment-time {
      font-size: 11px;
      color: #6c757d;
    }

    .comment-text {
      margin: 0;
      color: #495057;
      word-wrap: break-word;
      line-height: 1.4;
    }

    .delete-comment-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      color: #dc3545;
      cursor: pointer;
      font-size: 16px;
      padding: 0;
      width: 20px;
      height: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
    }

    .delete-comment-btn:hover {
      color: #c82333;
    }

    .no-comments {
      font-size: 12px;
      color: #6c757d;
      padding: 12px 8px;
      text-align: center;
      font-style: italic;
    }

    .add-comment-form {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .comment-textarea {
      min-height: 70px;
      padding: 10px 12px;
      border: 1px solid #dee2e6;
      border-radius: 6px;
      font-family: inherit;
      font-size: 13px;
      resize: vertical;
      transition: border-color 0.2s;
    }

    .comment-textarea:focus {
      outline: none;
      border-color: #80c956;
      box-shadow: 0 0 0 3px rgba(128, 201, 86, 0.1);
    }

    .submit-comment-btn {
      padding: 8px 12px;
      background: #50c878;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .submit-comment-btn:hover:not(:disabled) {
      background: #45a868;
    }

    .submit-comment-btn:disabled {
      background: #dee2e6;
      cursor: not-allowed;
      color: #6c757d;
    }
  `]
})
export class MemberSessionsComponent implements OnInit {
  private groupSvc = inject(GroupService);
  private router = inject(Router);

  selectedMemberId = signal<string>('u2');
  groupId = signal<string>('g1');

  selectedMember = computed(() => {
    const memberships = this.groupSvc.memberships();
    return memberships.find(m => m.userId === this.selectedMemberId());
  });

  memberSessions = computed(() => {
    return this.groupSvc.getMemberSessions(this.groupId(), this.selectedMemberId());
  });

  commentContent: { [key: string]: string } = {};
  currentUserId = 'u-001';

  ngOnInit(): void {}

  getSessionComments(sessionId: string): MemberSessionComment[] {
    return this.groupSvc.getSessionComments(sessionId);
  }

  getCommentCount(sessionId: string): number {
    return this.getSessionComments(sessionId).length;
  }

  addComment(sessionId: string): void {
    const content = this.commentContent[sessionId]?.trim();
    if (!content) return;

    this.groupSvc.addCommentToSession(sessionId, content).subscribe(() => {
      this.commentContent[sessionId] = '';
    });
  }

  deleteComment(commentId: string): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce commentaire ?')) {
      this.groupSvc.deleteComment(commentId).subscribe();
    }
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatTime(date: string): string {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  goBack(): void {
    this.router.navigate(['/chat', this.groupId()]);
  }
}
