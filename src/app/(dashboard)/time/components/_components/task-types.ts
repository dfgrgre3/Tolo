import * as z from "zod";

export const SUBJECT_TYPE_VALUES = [
  "MATH",
  "PHYSICS",
  "CHEMISTRY",
  "ARABIC",
  "ENGLISH"
] as const;

export type SubjectType = typeof SUBJECT_TYPE_VALUES[number];

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

export const taskSchema = z.object({
  title: z.string().min(1, "العنوان مطلوب").max(100, "العنوان طويل جداً"),
  description: z.string().optional(),
  subject: z.enum(SUBJECT_TYPE_VALUES).optional(),
  dueAt: z.string().optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  estimatedTime: z.number().min(1).max(480).optional(),
  tags: z.string().optional(),
});

export interface TaskManagementProps {
  readonly initialTasks: Task[];
  readonly userId: string;
  readonly subjects: SubjectType[];
  readonly onTaskUpdate?: (task: Task) => void;
  readonly onTaskCreate?: (task: Task) => void;
  readonly onTaskDelete?: (taskId: string) => void;
}
