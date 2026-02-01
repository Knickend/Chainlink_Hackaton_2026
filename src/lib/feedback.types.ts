export type FeedbackType = 'bug' | 'feature';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';
export type FeedbackStatus = 'new' | 'in_progress' | 'resolved' | 'declined';
export type AppRole = 'admin' | 'moderator' | 'user';

export interface Feedback {
  id: string;
  user_id: string;
  type: FeedbackType;
  title: string;
  description: string;
  priority: FeedbackPriority;
  status: FeedbackStatus;
  admin_notes: string | null;
  attachments: string[];
  created_at: string;
  updated_at: string;
}

export interface FeedbackInsert {
  type: FeedbackType;
  title: string;
  description: string;
  priority?: FeedbackPriority;
  attachments?: string[];
}

export interface FeedbackUpdate {
  status?: FeedbackStatus;
  admin_notes?: string;
  priority?: FeedbackPriority;
}

export interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
}
