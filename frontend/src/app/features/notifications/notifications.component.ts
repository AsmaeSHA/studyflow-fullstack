import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { NotificationService } from '../../core/services/notification.service';
import { GroupService } from '../../core/services/group.service';
import { Notification, NotificationType, GroupInvitation, StudyGroup } from '../../core/models/models';

interface TypeMeta {
  icon: string;
  label: string;
  shortLabel: string;
  accent: string;
  soft: string;
}

const TYPE_META: Record<NotificationType, TypeMeta> = {
  SESSION_REMINDER: { icon: 'clock',   label: 'Rappel de session',    shortLabel: 'Rappels',     accent: '#f5c518',  soft: 'rgba(245,197,24,.12)'  },
  GROUP_INVITATION: { icon: 'users',   label: 'Invitation de groupe', shortLabel: 'Invitations', accent: '#ff8e7e',  soft: 'rgba(255,142,126,.12)' },
  GOAL_ACHIEVED:    { icon: 'target',  label: 'Objectif atteint',     shortLabel: 'Objectifs',   accent: '#f5c518',  soft: 'rgba(245,197,24,.10)'  },
  NEW_MESSAGE:      { icon: 'message', label: 'Nouveau message',      shortLabel: 'Messages',    accent: '#ff8e7e',  soft: 'rgba(255,142,126,.10)' },
  SESSION_SHARED:   { icon: 'share',   label: 'Session partagée',     shortLabel: 'Partages',    accent: '#1a1814',  soft: 'rgba(26,24,20,.07)'    },
  GROUP_JOINED:      { icon: 'users',   label: 'Nouveau membre',       shortLabel: 'Membres',     accent: '#5bd49a',  soft: 'rgba(91,212,154,.12)'  },
};

interface NotifGroup { key: string; label: string; items: Notification[]; }

// Données d'aperçu d'une invitation enrichie avec les infos du groupe
export interface InvitationPreview {
  notification: Notification;
  invitation: GroupInvitation | null;
  group: StudyGroup | null;
}

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent {
  readonly notifSvc  = inject(NotificationService);
  readonly groupSvc  = inject(GroupService);
  private  router    = inject(Router);

  constructor() {
    // GET /api/notifications + /api/groups/invitations/pending au montage.
    this.notifSvc.list().subscribe();
    this.groupSvc.fetchPendingInvitations().subscribe();
    this.groupSvc.list().subscribe();
  }

  activeFilter   = signal<NotificationType | null>(null);
  showUnreadOnly = signal(false);

  // ── Modal d'aperçu invitation ──────────────────
  invitationPreview = signal<InvitationPreview | null>(null);

  typeList: NotificationType[] = [
    'SESSION_REMINDER',
    'GROUP_INVITATION',
    'GOAL_ACHIEVED',
    'NEW_MESSAGE',
  ];

  filtered = computed<Notification[]>(() => {
    const all = this.notifSvc.notifications();
    const f = this.activeFilter();
    let list = f ? all.filter(n => n.type === f) : all;
    if (this.showUnreadOnly()) list = list.filter(n => !n.isRead);
    return [...list].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  });

  grouped = computed<NotifGroup[]>(() => {
    const groups: Record<string, NotifGroup> = {};
    const now = new Date();
    const todayStart     = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86400000;
    const weekStart      = todayStart - 6 * 86400000;

    const ensure = (key: string, label: string) => {
      if (!groups[key]) groups[key] = { key, label, items: [] };
      return groups[key];
    };

    this.filtered().forEach(n => {
      const t = new Date(n.createdAt).getTime();
      if      (t >= todayStart)     ensure('today', "Aujourd'hui").items.push(n);
      else if (t >= yesterdayStart) ensure('yest',  'Hier').items.push(n);
      else if (t >= weekStart)      ensure('week',  'Cette semaine').items.push(n);
      else                          ensure('older', 'Plus ancien').items.push(n);
    });

    return ['today','yest','week','older'].filter(k => groups[k]).map(k => groups[k]);
  });

  countByType(t: NotificationType): number {
    return this.notifSvc.notifications().filter(n => n.type === t).length;
  }

  meta(type: NotificationType): TypeMeta { return TYPE_META[type]; }

  read(n: Notification): void {
    if (!n.isRead) this.notifSvc.markAsRead(n.id).subscribe();
    if (n.type === 'GROUP_INVITATION') {
      this.router.navigate(['/groups'], { queryParams: { tab: 'invitations' } });
    } else if (n.type === 'SESSION_REMINDER') {
      this.goSession(n);
    } else if (n.type === 'NEW_MESSAGE' || n.type === 'SESSION_SHARED') {
      this.goChat(n);
    }
  }

  remove(ev: Event, id: string): void {
    ev.stopPropagation();
    this.notifSvc.delete(id).subscribe();
  }

  isStale(n: Notification): boolean {
    if (!n.isRead) return false;
    return Date.now() - new Date(n.createdAt).getTime() > 86400000;
  }

  // ── Modal invitation ──────────────────────────

  /** Ouvre le modal avec les détails du groupe avant d'accepter/refuser */
  openInvitationPreview(ev: Event, n: Notification): void {
    ev.stopPropagation();
    if (!n.isRead) this.notifSvc.markAsRead(n.id).subscribe();

    const groupId  = (n.metadata as any)?.groupId as string | undefined;
    const invId    = (n.metadata as any)?.invitationId as string | undefined;

    // Cherche l'invitation dans le GroupService
    const invitation = invId
      ? this.groupSvc.getPendingInvitations().find(i => i.id === invId) ?? null
      : this.groupSvc.getPendingInvitations().find(i => i.groupId === groupId) ?? null;

    // Cherche le groupe dans le GroupService
    const group = groupId
      ? (this.groupSvc.groups().find(g => g.id === groupId) ?? null)
      : null;

    this.invitationPreview.set({ notification: n, invitation, group });
  }

  closePreview(): void { this.invitationPreview.set(null); }

  /** Accepte depuis le modal */
  acceptFromPreview(): void {
    const preview = this.invitationPreview();
    if (!preview) return;
    const inv = preview.invitation;
    if (inv) {
      this.groupSvc.respondToInvitation(inv.id, true).subscribe();
    }
    this.notifSvc.delete(preview.notification.id).subscribe();
    this.closePreview();
  }

  /** Refuse depuis le modal */
  declineFromPreview(): void {
    const preview = this.invitationPreview();
    if (!preview) return;
    const inv = preview.invitation;
    if (inv) {
      this.groupSvc.respondToInvitation(inv.id, false).subscribe();
    }
    this.notifSvc.delete(preview.notification.id).subscribe();
    this.closePreview();
  }

  // Anciens accept/decline directs (gardés pour compatibilité)
  accept(n: Notification): void { this.openInvitationPreview(new Event('click'), n); }
  decline(n: Notification): void { this.notifSvc.delete(n.id).subscribe(); }

  goCalendar():  void { this.router.navigate(['/calendar']); }
  goAnalytics(): void { this.router.navigate(['/analytics']); }

  goSession(n: Notification): void {
    const sessionId = (n.metadata as any)?.sessionId;
    this.router.navigate(['/sessions'], sessionId ? { queryParams: { sessionId } } : undefined);
  }

  goChat(n: Notification): void {
    const metadata = n.metadata as any;
    const groupId = metadata?.groupId;
    const queryParams: Record<string, string> = {};
    if (metadata?.sessionId) queryParams['sessionId'] = metadata.sessionId;
    if (metadata?.sharedSessionId) queryParams['sharedSessionId'] = metadata.sharedSessionId;
    if (groupId) this.router.navigate(['/chat', groupId], { queryParams });
    else         this.router.navigate(['/chat']);
  }

  // ── Helpers modal ─────────────────────────────

  /** Barre de remplissage membres */
  slotPct(group: StudyGroup): number {
    return Math.round(((group.memberCount || 1) / group.maxMembers) * 100);
  }

  /** Initiales depuis un nom */
  initials(name: string | undefined): string {
  if (!name) return '?';
  return name.split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase();
}

  /** Membres du groupe pour l'aperçu */
  groupMembers(groupId: string) {
    return this.groupSvc.getMembersOf(groupId).slice(0, 5);
  }

  /** Date d'expiration lisible */
  expiresIn(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - Date.now();
    const days = Math.ceil(diff / 86400000);
    if (days <= 0)  return 'expirée';
    if (days === 1) return 'expire demain';
    return `expire dans ${days} jours`;
  }

  timeAgo(date: Date | string): string {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return "à l'instant";
    if (m < 60) return `il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `il y a ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 30) return `il y a ${d}j`;
    return `il y a ${Math.floor(d / 30)} mois`;
  }

  absoluteDate(date: Date | string): string {
    return new Date(date).toLocaleString('fr-FR', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  }
}
