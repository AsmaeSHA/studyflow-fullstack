export interface DashboardStats {
  studyTimeToday: number;
  studyTimeGoalDaily: number;
  sessionsCompletedToday: number;
  sessionsPlannedToday: number;
  caloriesMode?: number;
  weeklyProgress: number;
  weeklyGoalHours: number;
  weeklyActualHours: number;
  streakDays: number;
  focusScore: number;
}

export interface DayActivity {
  day: string;
  date: number;
  status: 'none' | 'done' | 'scheduled' | 'current';
}

export interface Habit {
  id: string;
  title: string;
  trainer: string;
  avatarUrl?: string;
  completed: number;
  total: number;
  color?: string;
}

export interface Goal {
  id: string;
  title: string;
  subjectId?: string;
  targetHours: number;
  actualHours: number;
  weekStart: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'MISSED';
}

// Modeles ADMIN alignes sur le diagramme de classes

// ProductivityStat - stocke dans MongoDB (cf. diagramme)
// subjectBreakdown = { "subjectId": minutesStudied, ... }
export interface ProductivityStat {
  id: string;
  weekStart: string;
  weekEnd: string;
  totalPlannedMinutes: number;
  totalActualMinutes: number;
  completionRate: number;
  subjectBreakdown: Record<string, number>;
  sessionsCount: number;
  createdAt: string;
}

// DashboardSummary - ValueObject du diagramme (version admin = agregat global)
export interface GlobalDashboardSummary {
  totalStudiedHours: number;
  currentWeekHours: number;
  longestSession: number;
  currentStreak: number;
  topSubject: string;
  globalCompletionRate: number;
}

// AdminGlobalStats - agregation pour le tableau de bord admin
// Correspond a GET /api/admin/stats/global cote backend
export interface AdminGlobalStats {
  // Utilisateurs (PostgreSQL -> User)
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  disabledUsers: number;
  newUsersThisWeek: number;

  // Sessions (PostgreSQL -> StudySession + SessionStatus)
  totalSessions: number;
  completedSessions: number;
  plannedSessions: number;
  cancelledSessions: number;
  globalCompletionRate: number;

  // Collaboration (PostgreSQL -> StudyGroup, MongoDB -> ChatMessage)
  totalGroups: number;
  totalMessages: number;

  // Productivite globale calculee depuis les sessions terminees
  totalStudiedHours: number;
  avgSessionDurationMin: number;
  longestSessionMin: number;

  // Tendance hebdomadaire
  weeklyData: Array<{
    week: string;
    sessions: number;
    completionRate: number;
    totalMinutes: number;
  }>;

  // Top matieres calcule depuis StudySession + Subject
  topSubjects: Array<{
    name: string;
    minutes: number;
    color: string;
    completionRate: number;
  }>;
}
