/**
 * Exam types — synced with backend `internal/models/exam.go`
 * Last sync: 2026-06-29
 */

export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';
export type ExamType = 'QUIZ' | 'MIDTERM' | 'FINAL';
export type QuestionType = 'MCQ' | 'TRUE_FALSE' | 'TEXT';

// ────────────────────────────────────────────────────────────
// Question
// ────────────────────────────────────────────────────────────

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

/**
 * Question as stored in DB.
 * `options` in Go is stored as JSON string; the API serializes it to an array.
 */
export interface Question {
  id: string;
  examId: string;
  text: string;
  type: QuestionType;
  /** `options` is the parsed JSON array from the DB text column */
  options?: QuestionOption[];
  /** Points for this question — derived from exam maxScore / questionCount */
  points?: number;
  explanation?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** User's answer for a single question (submit exam payload) */
export interface UserAnswer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect?: boolean;
}

// ────────────────────────────────────────────────────────────
// Exam
// ────────────────────────────────────────────────────────────

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  type: ExamType;
  difficulty: string;
  /** `duration` in Go (minutes); aliased as `durationMinutes` for clarity */
  duration: number;
  durationMinutes?: number;
  /** `maxScore` in Go */
  maxScore: number;
  /** Total questions count — virtual field in Go */
  questionCount?: number;
  isActive: boolean;
  questions?: Question[];
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// ExamResult
// ────────────────────────────────────────────────────────────

export interface ExamResult {
  id: string;
  examId: string;
  exam?: Exam;
  userId: string;
  score: number;
  passed: boolean;
  /** JSON string in Go — parsed to UserAnswer[] by the API */
  answers?: UserAnswer[];
  takenAt: string;
  createdAt: string;
  updatedAt: string;
}

// ────────────────────────────────────────────────────────────
// Submit exam payload (POST /api/exams/:id/submit)
// ────────────────────────────────────────────────────────────

export interface SubmitExamPayload {
  answers: UserAnswer[];
  timeSpentSeconds?: number;
}

export interface SubmitExamResponse {
  result: ExamResult;
  passed: boolean;
  score: number;
  maxScore: number;
  percentage: number;
}
