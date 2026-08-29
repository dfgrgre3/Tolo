/**
 * Course Quiz / Assignment Engine types.
 * Interactive quizzes & assignments attached to course lessons.
 * NOTE: distinct from the school-exam types in `types/exam.ts`.
 */

export type QuizQuestionType =
  | 'MCQ_SINGLE'
  | 'MCQ_MULTIPLE'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'ESSAY'
  | 'MATCHING'
  | 'ORDERING'
  | 'FILL_BLANK';

export type QuizStatus = 'draft' | 'published' | 'archived';
export type QuizAttemptStatus = 'in_progress' | 'submitted' | 'graded' | 'expired';
export type GradingMethod = 'auto' | 'manual' | 'ai';

export interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
  matchTarget?: string;   // For MATCHING (right-side target)
  orderIndex?: number;    // For ORDERING
}

export interface QuizMatchPair {
  left: string;
  right: string;
}

export interface QuizQuestion {
  id: string;
  quizId: string;
  type: QuizQuestionType;
  text: string;
  explanation?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video' | 'audio';
  points: number;
  order: number;
  options: QuizOption[];
  // FILL_BLANK — the text is rendered with blanks marked like ___ and these are the accepted answers in order
  blanks?: string[];
  caseSensitive?: boolean;
  partialCredit?: boolean;
  required?: boolean;
  // Matching pairs (a list of left→right pairs)
  matchPairs?: QuizMatchPair[];
  // Ordering items (the correct order)
  orderItems?: string[];
  // Free text reference answer (for ESSAY / SHORT_ANSWER grading)
  referenceAnswer?: string;
  gradingMethod?: GradingMethod;
}

export interface CourseQuiz {
  id: string;
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number;
  passingScore: number;          // percentage 0-100
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  status: QuizStatus;
  questions: QuizQuestion[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  // computed
  totalPoints: number;
  questionCount: number;
}

export interface QuizAnswer {
  questionId: string;
  selectedOptionIds?: string[];          // MCQ_SINGLE / MCQ_MULTIPLE / TRUE_FALSE
  textAnswer?: string;                   // SHORT_ANSWER / ESSAY
  matches?: Record<string, string>;      // leftOptionId -> rightOptionId
  orderedItemIds?: string[];             // ORDERING selection ids
  blankAnswers?: Record<number, string>; // FILL_BLANK blankIndex -> answer
  // grading meta
  isCorrect?: boolean;
  pointsEarned?: number;
  pointsPossible: number;
  gradedBy?: GradingMethod;
  graderNotes?: string;
  answeredAt?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  courseId: string;
  userId: string;
  answers: QuizAnswer[];
  score?: number;
  maxScore: number;
  percentage?: number;
  passed?: boolean;
  status: QuizAttemptStatus;
  startedAt: string;
  submittedAt?: string;
  gradedAt?: string;
  timeSpentSeconds: number;
}

export interface QuizResultItem {
  question: QuizQuestion;
  answer?: QuizAnswer;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback?: string;
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: CourseQuiz;
  items: QuizResultItem[];
}

export interface CreateQuizPayload {
  courseId: string;
  lessonId?: string;
  title: string;
  description?: string;
  instructions?: string;
  timeLimitMinutes?: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  questions: Omit<QuizQuestion, 'id' | 'quizId'>[];
}

export interface SubmitQuizPayload {
  answers: Omit<QuizAnswer, 'isCorrect' | 'pointsEarned' | 'pointsPossible' | 'gradedBy'>[];
  timeSpentSeconds: number;
}

/** Client-side auto-grading result for immediately-gradable questions */
export interface AutoGradeResult {
  answer: QuizAnswer;
  isCorrect: boolean;
  pointsEarned: number;
  feedback?: string;
}
