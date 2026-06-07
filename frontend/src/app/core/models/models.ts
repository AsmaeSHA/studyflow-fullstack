// ─── models.ts ─────────────────────────────────────────────────────
// Entités alignées sur le diagramme de classes UML du projet
// Backend: Spring Boot (PostgreSQL + MongoDB)

// ──────────────────────────────────────────
// ENUMERATIONS
// ──────────────────────────────────────────

export type Role            = 'USER' | 'ADMIN';
export type SessionStatus   = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type NotificationType = 'SESSION_REMINDER' | 'GROUP_INVITATION' | 'GOAL_ACHIEVED' | 'NEW_MESSAGE' | 'SESSION_SHARED' | 'GROUP_JOINED';
export type MemberRole      = 'OWNER' | 'MEMBER' | 'MODERATOR';
export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED';

// ──────────────────────────────────────────
// AUTH & UTILISATEURS [PostgreSQL]
// ──────────────────────────────────────────

/** Correspond à User (PostgreSQL) */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  /** Champ calculé frontend */
  name?: string;
  role: Role;
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
  updatedAt?: string;
  avatarUrl?: string;
  // Champs étendus frontend (non persistés en DB)
  university?: string;
  level?: string;
  streak?: number;
  sessionsCount?: number;
}

/** Correspond à Subject (PostgreSQL) - défini par l'utilisateur */
export interface Subject {
  id: string;
  name: string;
  color: string;
  priority: 1 | 2 | 3 | 4 | 5;
  weeklyGoalHours: number;      // Float - objectif hebdomadaire en heures
  description?: string;
  maxSessionDuration: number;   // en minutes
  completionRate?: number;      // calculé: getCompletionRate()
  createdAt?: string;
}

/** Correspond à WeeklyGoal (PostgreSQL) */
export interface WeeklyGoal {
  id: string;
  subjectId?: string;
  title: string;
  weekStart: string;            // Date ISO
  weekEnd: string;              // Date ISO
  targetHours: number;          // Float
  achievedHours: number;        // Float
  isAchieved: boolean;
  /** Compat ancien champ */
  actualHours?: number;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
}

/** Correspond à Availability (PostgreSQL) */
export interface Availability {
  id: string;
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string;            // HH:mm
  endTime: string;              // HH:mm
  isRecurring: boolean;
  validFrom?: string;
  validUntil?: string;
}

// ──────────────────────────────────────────
// SESSIONS D'ÉTUDE [PostgreSQL]
// ──────────────────────────────────────────

/** Correspond à StudySession (PostgreSQL) */
export interface StudySession {
  id: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  title: string;
  startDateTime: string;        // DateTime ISO
  endDateTime: string;          // DateTime ISO
  status: SessionStatus;
  isShared: boolean;
  plannedDuration: number;      // en minutes
  actualDuration?: number;      // en minutes, rempli à la fin
  startedAt?: string;
  notes?: string;
  createdAt?: string;
  /** Compat anciens champs */
  startTime?: string;
  endTime?: string;
}

// ──────────────────────────────────────────
// COLLABORATION [PostgreSQL]
// ──────────────────────────────────────────

/** Correspond à StudyGroup (PostgreSQL) */
/** Correspond à StudyGroup (PostgreSQL) */
export interface StudyGroup {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  privateGroup?: boolean;
  maxMembers: number;
  createdAt: string;
  memberCount?: number;
  ownerId?: string;
  ownerName?: string;
  imageUrl?: string;
  color?: string;
  subject?: string;
  isActive?: boolean;
  coverImage?: string;  // URL de l'image de couverture (uploadée)
  avatarImage?: string; // Logo du groupe (optionnel)
}

/** Correspond à GroupMembership (PostgreSQL) */
export interface GroupMembership {
  id: string;
  groupId: string;
  userId: string;
  userName: string;
  fullName?: string;
  userAvatar?: string;
  role: MemberRole;
  joinedAt: string;
  isActive: boolean;
  active?: boolean;
  
}

/** Correspond à GroupInvitation (PostgreSQL) */
export interface GroupInvitation {
  id: string;
  groupId: string;
  groupName?: string;
  senderId: string;
  senderName?: string;
  recipientId: string;
  message?: string;
  status: InvitationStatus;
  sentAt: string;
  respondedAt?: string;
  expiresAt: string;
}

/** Correspond à SharedSession (PostgreSQL) */
export interface SharedSession {
  id: string;
  groupId: string;
  sessionId: string;
  sessionTitle?: string;
  title?: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  startDateTime?: string;
  endDateTime?: string;
  plannedDuration?: number;
  actualDuration?: number;
  status?: SessionStatus;
  ownerId?: string;
  ownerName?: string;
  sharedById?: string;
  sharedBy?: string;
  sharedAt: string;
  message?: string;
  sharedByCurrentUser?: boolean;
  acceptedByCurrentUser?: boolean;
  declinedByCurrentUser?: boolean;
  personalSessionId?: string;
  decision?: 'PENDING' | 'ACCEPTED' | 'DECLINED';
}

export interface SharedSessionDecisionResponse {
  sharedSession: SharedSession;
  decision: 'ACCEPTED' | 'DECLINED';
  personalSessionId?: string;
  message?: string;
}

// ──────────────────────────────────────────
// MESSAGERIE & NOTIFICATIONS [MongoDB]
// ──────────────────────────────────────────

/** Correspond à ChatRoom (MongoDB) */
export interface ChatRoom {
  id: string;                   // ObjectId
  groupId: string;
  createdAt: string;
  isActive: boolean;
}

/** Correspond à ChatMessage (MongoDB) */
export interface ChatMessage {
  id: string;                   // ObjectId
  roomId: string;
  authorId: string;
  authorName?: string;
  senderId?: string;
  senderName?: string;
  authorAvatar?: string;
  content: string;
  sentAt: string;
  isEdited: boolean;
  edited?: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deleted?: boolean;
  isMe?: boolean;               // champ frontend uniquement
}

export interface GroupChatRoom {
  id: string;
  groupId: string;
  createdAt: string;
  active: boolean;
}

export interface GroupPresence {
  userId: string;
  groupId: string;
  status: 'ONLINE' | 'OFFLINE';
  lastSeen: string;
}

export interface GroupRealtimeEvent<T = unknown> {
  type:
    | 'GROUP_UPDATED'
    | 'SHARED_SESSION_CREATED'
    | 'SHARED_SESSION_ACCEPTED'
    | 'SHARED_SESSION_DECLINED'
    | 'SHARED_SESSION_COMMENT_ADDED'
    | 'sharedSessionCreated'
    | 'sharedSessionCommentAdded'
    | 'sharedSessionAccepted'
    | 'sharedSessionDeclined'
    | string;
  groupId: string;
  actorId?: string;
  sharedSessionId?: string;
  sessionId?: string;
  payload?: T;
  metadata?: Record<string, string>;
  sentAt?: string;
}

export interface GroupPresenceSummary {
  groupId: string;
  onlineCount: number;
  members: GroupPresence[];
}

export interface GroupSessionItem {
  id: string;
  userId: string;
  userName: string;
  subjectId?: string;
  subjectName?: string;
  title: string;
  startDateTime: string;
  endDateTime: string;
  status: SessionStatus;
  plannedDuration?: number;
  actualDuration?: number;
  notes?: string;
}

export interface GroupSessionStats {
  totalSessions: number;
  completedSessions: number;
  plannedSessions: number;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  sessionsBySubject: Record<string, number>;
  minutesByMember: Record<string, number>;
}

export interface GroupSessionsDashboard {
  sessions: GroupSessionItem[];
  stats: GroupSessionStats;
}

/** Correspond à Notification (MongoDB) */
export interface Notification {
  id: string;                   // ObjectId
  userId: string;
  type: NotificationType;
  title?: string;
  message: string;
  isRead: boolean;
  read?: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

/** Correspond à Comment (MongoDB) */
export interface Comment {
  id: string;                   // ObjectId
  sessionId: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  isEdited: boolean;
}

// ──────────────────────────────────────────
// PRODUCTIVITY & DASHBOARD VALUE OBJECTS
// ──────────────────────────────────────────

/** Correspond à ProductivityStat (MongoDB) */
export interface ProductivityStat {
  id: string;
  userId?: string;
  weekStart: string;
  weekEnd: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  completionRate: number;        // backend: 0..1
  /** subjectId -> minutesStudied */
  subjectBreakdown: Record<string, number>;
  sessionsCount: number;
  createdAt?: string;
}

/** ValueObject DashboardSummary du diagramme de classes */
export interface DashboardSummary {
  totalStudiedHours: number;
  currentWeekHours: number;
  longestSession?: number;        // compat ancien frontend, minutes
  currentStreak?: number;         // compat ancien frontend, jours
  longestSessionMinutes?: number; // backend actuel, minutes
  currentStreakDays?: number;     // backend actuel, jours
  topSubject: string | null;
  globalCompletionRate: number;   // backend actuel: 0..1
  totalSessions?: number;
  completedSessions?: number;
}
