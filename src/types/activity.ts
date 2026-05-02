import { Subject } from './subject';

export type ActivityStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
export type PriorityLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface StudySession {
  id: string;
  userId: string;
  subjectId?: string;
  subject?: Subject;
  topic?: string;
  startTime: Date | string;
  endTime?: Date | string;
  durationSeconds: number;
  focusScore?: number;
  notes?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Schedule {
  id: string;
  userId: string;
  title: string;
  description?: string;
  subjectId?: string;
  subject?: Subject;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  isRecurring: boolean;
  color?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Reminder {
  id: string;
  userId: string;
  title: string;
  description?: string;
  dueDate: Date | string;
  isCompleted: boolean;
  priority: PriorityLevel;
  relatedType?: string;
  relatedId?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
