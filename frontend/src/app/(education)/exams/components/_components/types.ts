export interface Exam {
  id: string;
  title: string;
  subject: string;
  year: number;
  type?: string;
}

export interface ExamsResponse {
  exams: Exam[];
}

export interface ExamResult {
  id: string;
  exam: Exam;
  score: number;
  takenAt: string;
  teacherId?: string;
  teacher?: {
    id: string;
    name: string;
  };
}

export interface UserGrade {
  id: string;
  subject: string;
  grade: number;
  maxGrade: number;
  date: string;
  notes?: string;
  isOnline: boolean;
  assignmentType: string;
  teacherId?: string;
  teacher?: {
    id: string;
    name: string;
  };
  examResultId?: string;
}

export interface SubjectAverage {
  subject: string;
  _avg: {
    grade: number;
  };
}
