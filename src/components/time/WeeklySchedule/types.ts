export interface Schedule {
  id: string;
  userId: string;
  planJson: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeBlock {
  id: string;
  title: string;
  description?: string;
  startTime: string; // HH:mm format
  endTime: string;   // HH:mm format
  day: number;       // 0-6 (Sunday-Saturday)
  color: string;
  type: 'STUDY' | 'BREAK' | 'TASK' | 'MEETING' | 'PERSONAL' | 'EXERCISE' | 'MEAL' | 'SLEEP' | 'ENTERTAINMENT' | 'WORK';
  subject?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  isRecurring?: boolean;
  recurringPattern?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  reminders?: number[]; // minutes before event
  location?: string;
  notes?: string;
  isCompleted?: boolean;
  completedAt?: string;
}

export interface WeeklyScheduleProps {
  schedule: Schedule | null;
  subjects: string[];
  userId: string;
  onScheduleUpdate?: (schedule: Schedule) => void;
}

export interface WeekStats {
  totalBlocks: number;
  studyHours: number;
  breakHours: number;
  completedBlocks: number;
  upcomingBlocks: number;
  mostBusyDay: string;
  averageBlockDuration: number;
}

