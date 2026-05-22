export type AnalyticsEventType =
  | 'lesson_progress'
  | 'lesson_complete'
  | 'exam_submit'
  | 'study_session'
  | 'video_heartbeat'
  | 'gamification_xp'
  | 'page_view';

export interface AnalyticsEvent<T = Record<string, unknown>> {
  id: string;
  type: AnalyticsEventType;
  userId: string;
  timestamp: number;
  payload: T;
}

export interface LessonProgressPayload {
  subTopicId: string;
  timeSpentSeconds: number;
  completed: boolean;
  position: number;
}

export interface ExamSubmitPayload {
  examId: string;
  answers: Record<string, string>;
  score: number;
  passed: boolean;
}

export interface StudySessionPayload {
  durationMinutes: number;
  subjectId?: string;
  focusScore?: number;
}

export interface VideoHeartbeatPayload {
  subTopicId: string;
  position: number;
  duration: number;
  playbackRate: number;
}

export interface XPEventPayload {
  xpType: string;
  amount: number;
  source: string;
  sourceId?: string;
}
