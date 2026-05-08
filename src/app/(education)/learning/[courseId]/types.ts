export type Attachment = {
  id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
};

export type LessonQuestion = {
  id: string;
  content: string;
  createdAt: string;
  user?: {
    name?: string | null;
  };
};

export type Lesson = {
  id: string;
  name: string;
  description: string | null;
  content: string | null;
  videoUrl: string | null;
  type: "VIDEO" | "ARTICLE" | "QUIZ" | "FILE" | "ASSIGNMENT";
  completed: boolean;
  order: number;
  durationMinutes: number;
  isFree: boolean;
  locked: boolean;
  attachments: Attachment[];
  examId?: string | null;
  interactiveQuestions?: {
    id: string;
    time: number;
    question: string;
    options: string[];
    correctOptionIndex: number;
    explanation?: string;
  }[];
};

export type Chapter = {
  id: string;
  name: string;
  order: number;
  subTopics: Lesson[];
};

export type Course = {
  id: string;
  title: string;
  instructor: string;
  rating: number;
  thumbnailUrl?: string | null;
};

export type TabKey = "content" | "resources" | "qna" | "notes" | "ai";
