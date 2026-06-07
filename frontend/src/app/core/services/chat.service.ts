import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environements/environment';
import { ChatMessage, Comment, GroupChatRoom } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ChatService {
  private readonly base = environment.apiUrl + '/chat';
  private http = inject(HttpClient);

  // --- messages ---
  roomForGroup(groupId: string): Observable<GroupChatRoom> {
    return this.http.get<GroupChatRoom>(`${this.base}/groups/${groupId}/room`);
  }

  history(roomId: string, page = 0, size = 50): Observable<ChatMessage[]> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<ChatMessage[]>(`${this.base}/rooms/${roomId}/messages`, { params });
  }
  send(roomId: string, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.base}/rooms/${roomId}/messages`, { content });
  }
  edit(messageId: string, content: string): Observable<ChatMessage> {
    return this.http.put<ChatMessage>(`${this.base}/messages/${messageId}`, { content });
  }
  delete(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/messages/${messageId}`);
  }
  unreadCount(roomId: string, since: string): Observable<{ unreadCount: number }> {
    const params = new HttpParams().set('since', since);
    return this.http.get<{ unreadCount: number }>(`${this.base}/rooms/${roomId}/unread`, { params });
  }

  // --- commentaires sur sessions ---
  listComments(sessionId: string): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.base}/sessions/${sessionId}/comments`);
  }
  addComment(sessionId: string, content: string): Observable<Comment> {
    return this.http.post<Comment>(`${this.base}/sessions/${sessionId}/comments`, { content });
  }
  deleteComment(commentId: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/comments/${commentId}`);
  }
}
