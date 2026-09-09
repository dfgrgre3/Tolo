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

/** Student transport contract: grading metadata must never cross this boundary. */
export type StudentQuizOption = Omit<QuizOption, 'isCorrect' | 'matchTarget'>;

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

export type StudentQuizQuestion = Omit<QuizQuestion, 'options' | 'referenceAnswer' | 'gradingMethod' | 'blanks' | 'matchPairs' | 'orderItems'> & {
  options: StudentQuizOption[];
};

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
  required: boolean;
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

export type StudentCourseQuiz = Omit<CourseQuiz, 'questions'> & {
  questions: StudentQuizQuestion[];
};

/**
 * The answer as the client submits it — student input only.
 * NEVER carries grading metadata; the server (or an explicit graded view)
 * owns `isCorrect` / `pointsEarned`.
 */
export interface QuizSubmissionAnswer {
  questionId: string;
  selectedOptionIds?: string[];          // MCQ_SINGLE / MCQ_MULTIPLE / TRUE_FALSE
  textAnswer?: string;                   // SHORT_ANSWER / ESSAY
  matches?: Record<string, string>;      // leftOptionId -> rightOptionId
  orderedItemIds?: string[];             // ORDERING selection ids
  blankAnswers?: Record<number, string>; // FILL_BLANK blankIndex -> answer
  answeredAt?: string;
}

/**
 * A graded answer — what the backend (or a grading service) returns.
 * Extends the submission with grading metadata that clients must never forge.
 */
export interface QuizGradedAnswer extends QuizSubmissionAnswer {
  isCorrect?: boolean;
  pointsEarned?: number;
  pointsPossible: number;
  gradedBy?: GradingMethod;
  graderNotes?: string;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  courseId: string;
  userId: string;
  /** Answers returned by the server, including grading metadata when available. */
  answers: QuizGradedAnswer[];
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
  answer?: QuizGradedAnswer;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback?: string;
}

export interface QuizCompletionUpdate {
  lessonCompleted: boolean;
  courseProgress: number;
  courseCompleted: boolean;
  certificateEligible: boolean;
}

export interface QuizResult {
  attempt: QuizAttempt;
  quiz: CourseQuiz;
  items: QuizResultItem[];
  /** Server-authoritative progress transition produced by this submission. */
  completion?: QuizCompletionUpdate;
}

export interface QuizResultsSummary {
  attempts: QuizAttempt[];
  attemptsUsed: number;
  attemptsRemaining: number;
  canRetake: boolean;
  hasPassed: boolean;
  latestAttempt?: QuizAttempt;
  bestAttempt?: QuizAttempt;
}

export interface CreateQuizPayload {
  lessonId?: string;
  required?: boolean;
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
  questions: InstructorQuizQuestionInput[];
}

export type InstructorQuizOptionInput = Omit<QuizOption, 'id'>;
export type InstructorQuizQuestionInput = Omit<QuizQuestion, 'id' | 'quizId'>;

export interface SubmitQuizPayload {
  attemptId: string;
  answers: QuizSubmissionAnswer[];
  timeSpentSeconds: number;
}

export interface StartQuizResponse {
  attemptId: string;
  startedAt: string;
  deadline?: string;
}
