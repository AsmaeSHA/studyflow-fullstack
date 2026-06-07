// chat-box.component.ts
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatMessage } from '../../../core/models/models';

@Component({
  selector: 'app-chat-box',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="cb">
      <div class="cb-stream" #messageContainer>
        @for (msg of messages; track msg.id) {
          <div class="cb-msg" [class.me]="msg.isMe">
            <!-- Avatar -->
            <div class="cb-avatar">
              <img *ngIf="getMemberPhoto(msg.authorId)"
                   class="cb-avatar-img"
                   [src]="getMemberPhoto(msg.authorId)"
                   [alt]="msg.authorName" />
              <div *ngIf="!getMemberPhoto(msg.authorId)"
                   class="cb-avatar-fallback"
                   [style.backgroundColor]="getAvatarColor(msg.authorId)">
                {{ getInitials(msg.authorName) }}
              </div>
            </div>
            
            <div class="cb-bubble">
              <div class="cb-meta">
                <span class="cb-author">{{ msg.authorName || 'Anonyme' }}</span>
                <span class="cb-time">{{ formatTime(msg.sentAt) }}</span>
              </div>
              <div class="cb-content">{{ msg.content }}</div>
            </div>
          </div>
        }
        @if (messages.length === 0) {
          <div class="cb-empty">
            <p>Aucun message pour l'instant</p>
            <p class="cb-empty-sub">Soyez le premier à écrire un message !</p>
          </div>
        }
      </div>
      
      <div class="cb-form">
        <input type="text"
               [(ngModel)]="newMessage"
               (keyup.enter)="sendMessage()"
               placeholder="Écrire un message..."
               class="cb-input" />
        <button (click)="sendMessage()"
                [disabled]="!newMessage.trim()"
                class="cb-send">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  `,
  styles: [`
    .cb {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      background: transparent;
    }
    
    .cb-stream {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      padding: 20px;
      display: flex;
      flex-direction: column;
      gap: 16px;
      scroll-behavior: smooth;
    }
    
    .cb-msg {
      display: flex;
      gap: 12px;
      animation: fadeIn 0.3s ease;
    }
    
    .cb-msg.me {
      flex-direction: row-reverse;
    }
    
    .cb-avatar {
      flex-shrink: 0;
    }
    
    .cb-avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      object-fit: cover;
    }
    
    .cb-avatar-fallback {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 14px;
      color: white;
      text-transform: uppercase;
    }
    
    .cb-bubble {
      max-width: 70%;
      padding: 10px 14px;
      border-radius: 18px;
      background: #f0f0f0;
    }
    
    .cb-msg.me .cb-bubble {
      background: #1a1a1a;
      color: white;
    }
    
    .cb-meta {
      display: flex;
      gap: 8px;
      align-items: baseline;
      margin-bottom: 4px;
      font-size: 0.75rem;
    }
    
    .cb-author {
      font-weight: 700;
      color: #666;
    }
    
    .cb-msg.me .cb-author {
      color: rgba(255, 255, 255, 0.8);
    }
    
    .cb-time {
      font-size: 0.7rem;
      color: #999;
    }
    
    .cb-msg.me .cb-time {
      color: rgba(255, 255, 255, 0.6);
    }
    
    .cb-content {
      font-size: 0.9rem;
      line-height: 1.4;
      word-wrap: break-word;
    }
    
    .cb-empty {
      text-align: center;
      color: #999;
      padding: 40px 20px;
    }
    
    .cb-empty-sub {
      font-size: 0.8rem;
      margin-top: 8px;
    }
    
    .cb-form {
      display: flex;
      gap: 12px;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.04);
      border-top: 1px solid rgba(0, 0, 0, 0.07);
      flex-shrink: 0;
      position: sticky;
      bottom: 0;
      z-index: 2;
    }
    
    .cb-input {
      flex: 1;
      padding: 12px 16px;
      border: none;
      border-radius: 24px;
      background: white;
      font-family: inherit;
      font-size: 0.9rem;
      outline: none;
      transition: box-shadow 0.2s;
    }
    
    .cb-input:focus {
      box-shadow: 0 0 0 2px rgba(245, 197, 24, 0.3);
    }
    
    .cb-send {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: none;
      background: #1a1a1a;
      color: #f5c518;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, opacity 0.2s;
    }
    
    .cb-send:hover:not(:disabled) {
      transform: scale(1.05);
      opacity: 0.9;
    }
    
    .cb-send:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    
    .cb-send svg {
      width: 18px;
      height: 18px;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ChatBoxComponent implements AfterViewInit, OnChanges {
  @ViewChild('messageContainer') private messageContainer?: ElementRef<HTMLDivElement>;
  @Input() messages: ChatMessage[] = [];
  @Input() memberPhotos: Record<string, string | null> = {};
  @Input() avatarColors: Record<string, string> = {};
  @Output() send = new EventEmitter<string>();
  
  newMessage = '';

  ngAfterViewInit(): void {
    this.scrollToBottom(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['messages']) {
      this.scrollToBottom();
    }
  }
  
  getMemberPhoto(userId: string): string | null {
    return this.memberPhotos[userId] || null;
  }
  
  getAvatarColor(userId: string): string {
    return this.avatarColors[userId] || '#f5c518';
  }
  
  getInitials(name?: string): string {
    if (!name) return '?';
    return name.split(' ')
      .map(word => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  
  formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (minutes < 1440) return `Il y a ${Math.floor(minutes / 60)}h`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  sendMessage(): void {
    if (this.newMessage.trim()) {
      this.send.emit(this.newMessage.trim());
      this.newMessage = '';
      this.scrollToBottom();
    }
  }

  private scrollToBottom(smooth = true): void {
    setTimeout(() => {
      const el = this.messageContainer?.nativeElement;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  }
}
