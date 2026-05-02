export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface Question {
  id: string;
  examId: string;
  text: string;
  type: string;
  difficulty: DifficultyLevel;
  points: number;
  explanation?: string;
  options?: any; // JSON object for choices
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  type: string;
  durationMinutes: number;
  totalPoints: number;
  passingScore: number;
  isActive: boolean;
  questions?: Question[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface ExamResult {
  id: string;
  examId: string;
  exam?: Exam;
  userId: string;
  score: number;
  passed: boolean;
  timeSpentSeconds: number;
  answers?: any; // JSON object containing user's answers
  createdAt: Date | string;
  updatedAt: Date | string;
}
