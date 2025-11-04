export type SubjectType = "MATH" | "PHYSICS" | "CHEMISTRY" | "ARABIC" | "ENGLISH";

export interface Schedule {
  id: string;
  userId: string;
  planJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubjectEnrollment {
  id: string;
  userId: string;
  subject: SubjectType;
  createdAt: string;
}

export interface SubTask {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subject?: SubjectType;
  dueAt?: string;
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  estimatedTime?: number;
  actualTime?: number;
  tags?: string[];
  subtasks?: SubTask[];
  attachments?: string[];
  notes?: string;
  completedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudySession {
  id: string;
  userId: string;
  taskId?: string;
  durationMin: number;
  startTime: string;
  endTime: string;
  subject?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  message?: string;
  remindAt: string;
  type?: 'TASK' | 'BREAK' | 'STUDY' | 'MEETING' | 'PERSONAL' | 'MEDICINE' | 'EXERCISE' | 'MEAL' | 'SLEEP' | 'CUSTOM';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRecurring?: boolean;
  recurringPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'CUSTOM';
  recurringInterval?: number;
  recurringDays?: number[];
  recurringEndDate?: string;
  isCompleted?: boolean;
  completedAt?: string;
  isSnoozed?: boolean;
  snoozeUntil?: string;
  soundEnabled?: boolean;
  notificationEnabled?: boolean;
  tags?: string[];
  color?: string;
  location?: string;
  attachments?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TimeTrackerTask {
  id: string;
  title: string;
  status: string;
}

export interface TimeStats {
  completedTasks: number;
  pendingTasks: number;
  studyHours: number;
  upcomingReminders: number;
  dailyGoalProgress: number;
  weeklyGoalProgress: number;
  streakDays: number;
  focusScore: number;
}

