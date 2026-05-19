import { User } from './user';
import { Subject, Topic, SubTopic } from './subject';

export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'DROPPED';

export interface SubjectEnrollment {
  id: string;
  userId: string;
  user?: User;
  subjectId: string;
  subject?: Subject;
  status: EnrollmentStatus;
  progressPercentage: number;
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

export interface TopicProgress {
  id: string;
  userId: string;
  topicId?: string;
  topic?: Topic;
  subTopicId?: string;
  subTopic?: SubTopic;
  status: ProgressStatus;
  timeSpentSeconds: number;
  lastPosition?: number;
  score?: number; // E.g., for quizzes
  completedAt?: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}
