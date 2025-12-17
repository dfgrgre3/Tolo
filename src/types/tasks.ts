
import { SubjectType, TaskStatus } from './enums';
import { DateString } from './api/common';
export { SubjectType, TaskStatus };

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  subject?: SubjectType | null;
  status: TaskStatus;
  dueAt?: DateString | null;
  priority: number;
}
