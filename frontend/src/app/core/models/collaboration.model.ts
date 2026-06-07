
import { User } from './user.model';
import {SessionComment} from "./session.model"
export interface StudyGroup {
  id: string;
  name: string;
  description: string;
  members: User[];
  creatorId: string;
}

export interface StudySession {
  id: string;
  groupId: string;
  title: string;
  startTime: Date;
  duration: number; // in minutes
  topic: string;
  comments?: SessionComment[];
}

export interface ChatMessage {
  id: string;
  groupId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: Date;
}

export interface Invitation {
  id: string;
  groupId: string;
  groupName: string;
  senderName: string;
  status: 'pending' | 'accepted' | 'declined';
}