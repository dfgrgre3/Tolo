
import { SubjectType, TaskStatus } from './enums';
import { DateString } from './api/common';
export { SubjectType, TaskStatus };

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  subjectId?: string | null;
  status: TaskStatus;
  dueAt?: DateString | null;
  priority: string; // MEDIUM, HIGH, LOW - matches backend string type
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  createdAt?: DateString;
  updatedAt?: DateString;
}
