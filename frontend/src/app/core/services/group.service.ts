import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environements/environment';
import { StudyGroup, StudySession, GroupMembership, GroupInvitation, SharedSession, SharedSessionDecisionResponse, MemberRole, Comment as MongoComment, GroupPresenceSummary, GroupSessionsDashboard } from '../models/models';
import { MemberSession, MemberSessionComment } from '../models/member-session.model';

export interface GroupPayload {
  name: string;
  description?: string;
  privateGroup?: boolean;
  maxMembers?: number;
  imageUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class GroupService {
  private readonly base = environment.apiUrl + '/groups';
  private http = inject(HttpClient);

  readonly groups            = signal<StudyGroup[]>([]);
  readonly userGroups        = signal<StudyGroup[]>([]);
  readonly memberships       = signal<GroupMembership[]>([]);
  readonly shared            = signal<SharedSession[]>([]);
  readonly pendingInvitations = signal<GroupInvitation[]>([]);

  /** Cache local pour les member sessions (mappage SharedSession -> MemberSession) */
  private readonly memberSessionsCache = signal<Map<string, MemberSession[]>>(new Map());
  private readonly commentsCache       = signal<Map<string, MemberSessionComment[]>>(new Map());

  // --- groupes ---
  list(): Observable<StudyGroup[]> {
    return this.http.get<StudyGroup[]>(this.base)
      .pipe(tap(g => { this.groups.set(g); this.userGroups.set(g); }));
  }
  listPublic(): Observable<StudyGroup[]> { return this.http.get<StudyGroup[]>(`${this.base}/public`); }
  get(id: string): Observable<StudyGroup> { return this.http.get<StudyGroup>(`${this.base}/${id}`); }
  create(body: GroupPayload): Observable<StudyGroup> {
    return this.http.post<StudyGroup>(this.base, body)
      .pipe(tap(g => { this.groups.update(l => [...l, g]); this.userGroups.update(l => [...l, g]); }));
  }
  createGroup(body: GroupPayload): Observable<StudyGroup> { return this.create(body); }
  update(id: string, body: GroupPayload): Observable<StudyGroup> { return this.http.put<StudyGroup>(`${this.base}/${id}`, body); }
  delete(id: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}`); }
  uploadGroupImage(file: File): Observable<{ imageUrl: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imageUrl: string }>(`${this.base}/upload-image`, formData);
  }

  // --- membres ---
  members(id: string): Observable<GroupMembership[]> {
    return this.http.get<GroupMembership[]>(`${this.base}/${id}/members`)
      .pipe(tap(m => this.memberships.set(m)));
  }
  getMembersOf(_groupId: string): GroupMembership[] { return this.memberships(); }
  leave(id: string): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/leave`, {})
      .pipe(tap(() => {
        this.groups.update(list => list.filter(group => group.id !== id));
        this.userGroups.update(list => list.filter(group => group.id !== id));
      }));
  }
  leaveGroup(id: string): Observable<void> { return this.leave(id); }
  removeMember(id: string, userId: string): Observable<void> { return this.http.delete<void>(`${this.base}/${id}/members/${userId}`); }
  changeRole(id: string, userId: string, role: MemberRole): Observable<void> {
    return this.http.post<void>(`${this.base}/${id}/members/${userId}/role`, { role });
  }

  // --- invitations ---
  invite(id: string, recipientEmail: string, message?: string): Observable<GroupInvitation> {
    return this.http.post<GroupInvitation>(`${this.base}/${id}/invitations`, { recipientEmail, message });
  }
  sendInvitation(groupId: string, recipientEmail: string, message?: string): Observable<GroupInvitation> {
    return this.invite(groupId, recipientEmail, message);
  }
  fetchPendingInvitations(): Observable<GroupInvitation[]> {
    return this.http.get<GroupInvitation[]>(`${this.base}/invitations/pending`)
      .pipe(tap(i => this.pendingInvitations.set(i)));
  }
  getPendingInvitations(): GroupInvitation[] { return this.pendingInvitations(); }
  acceptInvitation(invitationId: string): Observable<GroupInvitation> {
    return this.http.post<GroupInvitation>(`${this.base}/invitations/${invitationId}/accept`, {});
  }
  declineInvitation(invitationId: string): Observable<GroupInvitation> {
    return this.http.post<GroupInvitation>(`${this.base}/invitations/${invitationId}/decline`, {});
  }
  respondToInvitation(invitationId: string, accept: boolean): Observable<GroupInvitation> {
    return accept ? this.acceptInvitation(invitationId) : this.declineInvitation(invitationId);
  }

  // --- sessions partagees ---
  shareSession(id: string, sessionId: string, message?: string): Observable<SharedSession> {
    return this.http.post<SharedSession>(`${this.base}/${id}/shared-sessions`, { sessionId, message });
  }
  listSharedSessions(id: string): Observable<SharedSession[]> {
    return this.http.get<SharedSession[]>(`${this.base}/${id}/shared-sessions`)
      .pipe(tap(s => this.shared.set(s)));
  }

  listShareableSessions(id: string): Observable<StudySession[]> {
    return this.http.get<StudySession[]>(`${this.base}/${id}/shareable-sessions`);
  }

  acceptSharedSession(groupId: string, sharedSessionId: string): Observable<SharedSessionDecisionResponse> {
    return this.http.post<SharedSessionDecisionResponse>(`${this.base}/${groupId}/shared-sessions/${sharedSessionId}/accept`, {});
  }

  declineSharedSession(groupId: string, sharedSessionId: string): Observable<SharedSessionDecisionResponse> {
    return this.http.post<SharedSessionDecisionResponse>(`${this.base}/${groupId}/shared-sessions/${sharedSessionId}/decline`, {});
  }

  listGroupSessions(id: string, filters: { memberId?: string; subjectId?: string; start?: string; end?: string } = {}): Observable<GroupSessionsDashboard> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params = params.set(key, value);
    });
    return this.http.get<GroupSessionsDashboard>(`${this.base}/${id}/sessions`, { params });
  }

  presence(id: string): Observable<GroupPresenceSummary> {
    return this.http.get<GroupPresenceSummary>(`${this.base}/${id}/presence`);
  }

  markOnline(id: string) {
    return this.http.post(`${this.base}/${id}/presence/online`, {});
  }

  markOffline(id: string) {
    return this.http.post(`${this.base}/${id}/presence/offline`, {});
  }

  /** Compat ancienne API : retourne MemberSession[] synchrone (depuis le cache local). */
  getMemberSessions(groupId: string, userId: string): MemberSession[] {
    return this.memberSessionsCache().get(`${groupId}:${userId}`) ?? [];
  }

  /** Stocke des MemberSession dans le cache local. Utile pour la compat UI. */
  setMemberSessions(groupId: string, userId: string, list: MemberSession[]): void {
    this.memberSessionsCache.update(m => {
      const next = new Map(m);
      next.set(`${groupId}:${userId}`, list);
      return next;
    });
  }

  // --- commentaires (relais via /api/chat/sessions/{id}/comments) ---
  /** Compat synchrone : retourne le cache local (vide tant qu'on n'a pas appele fetchSessionComments). */
  getSessionComments(sessionId: string): MemberSessionComment[] {
    return this.commentsCache().get(sessionId) ?? [];
  }

  /** Recupere les commentaires REST puis les met dans le cache. */
  fetchSessionComments(sessionId: string): Observable<MongoComment[]> {
    return this.http.get<MongoComment[]>(`${environment.apiUrl}/chat/sessions/${sessionId}/comments`)
      .pipe(tap(list => {
        const adapted: MemberSessionComment[] = list.map(c => ({
          id: c.id,
          memberSessionId: sessionId,
          authorId: c.authorId,
          authorName: c.authorName ?? '',
          content: c.content,
          createdAt: c.createdAt
        }));
        this.commentsCache.update(m => {
          const next = new Map(m);
          next.set(sessionId, adapted);
          return next;
        });
      }));
  }

  addCommentToSession(sessionId: string, content: string): Observable<MongoComment> {
    return this.http.post<MongoComment>(`${environment.apiUrl}/chat/sessions/${sessionId}/comments`, { content })
      .pipe(tap(c => {
        const adapted: MemberSessionComment = {
          id: c.id,
          memberSessionId: sessionId,
          authorId: c.authorId,
          authorName: c.authorName ?? '',
          content: c.content,
          createdAt: c.createdAt
        };
        this.upsertSessionComment(sessionId, adapted);
      }));
  }

  upsertSessionComment(sessionId: string, comment: MemberSessionComment): void {
    this.commentsCache.update(m => {
      const next = new Map(m);
      const existing = next.get(sessionId) ?? [];
      next.set(sessionId, existing.some(c => c.id === comment.id)
        ? existing.map(c => c.id === comment.id ? comment : c)
        : [...existing, comment]);
      return next;
    });
  }

  deleteComment(commentId: string) {
    return this.http.delete(`${environment.apiUrl}/comments/${commentId}`);
  }
}
