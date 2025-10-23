
export enum SubjectType {
  MATH = 'MATH',
  PHYSICS = 'PHYSICS',
  CHEMISTRY = 'CHEMISTRY',
  ARABIC = 'ARABIC',
  ENGLISH = 'ENGLISH',
}

export enum TaskStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  subject?: SubjectType | null;
  status: TaskStatus;
  dueAt?: string | null;
  priority: number;
}
