export interface MemberSession {
  id: string;
  userId: string;
  userName: string;
  groupId: string;
  sessionTitle: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  comments: MemberSessionComment[];
}

export interface MemberSessionComment {
  id: string;
  memberSessionId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}
