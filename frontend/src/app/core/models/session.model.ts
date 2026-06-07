export type { StudySession, SessionStatus, SharedSession } from './models';

/** Alias compat — anciens composants attendaient un type `Session` avec startTime/endTime. */
export interface Session {
  id: string;
  subjectId: string;
  subjectName?: string;
  subjectColor?: string;
  title: string;
  startTime: string;
  endTime: string;
  status: 'PLANNED' | 'COMPLETED' | 'CANCELLED' | 'IN_PROGRESS';
  notes?: string;
}

export interface SessionComment {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  content: string;
  timestamp: Date;
}
