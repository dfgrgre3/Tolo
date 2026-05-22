export type DifficultyLevel = 'EASY' | 'MEDIUM' | 'HARD';

export interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

export interface UserAnswer {
  questionId: string;
  selectedOptionId?: string;
  textAnswer?: string;
  isCorrect?: boolean;
}

export interface Question {
  id: string;
  examId: string;
  text: string;
  type: 'MCQ' | 'TRUE_FALSE' | 'TEXT';
  difficulty: DifficultyLevel;
  points: number;
  explanation?: string;
  options?: QuestionOption[] | Record<string, any>; 
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Exam {
  id: string;
  subjectId: string;
  title: string;
  description?: string;
  type: 'QUIZ' | 'MIDTERM' | 'FINAL';
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
  answers?: UserAnswer[] | Record<string, UserAnswer>;
  createdAt: Date | string;
  updatedAt: Date | string;
}
