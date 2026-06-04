export interface UserDetails {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  avatar: string | null;
  role: string;
  emailVerified: boolean | null;
  phone: string | null;
  phoneVerified: boolean | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLogin: string | null;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  pomodoroSessions: number;
  deepWorkSessions: number;
  studyXP: number;
  taskXP: number;
  examXP: number;
  challengeXP: number;
  questXP: number;
  seasonXP: number;
  gradeLevel: string | null;
  educationType: string | null;
  section: string | null;
  interestedSubjects: string[];
  studyGoal: string | null;
  bio: string | null;
  school: string | null;
  country: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  _count: {
    tasks: number;
    studySessions: number;
    achievements: number;
    notifications: number;
    examResults: number;
    subjectEnrollments: number;
    customGoals: number;
    reminders: number;
    sessions: number;
  };
  achievements: Array<{
    id: string;
    earnedAt: string;
    achievement: {
      title: string;
      icon: string;
      xpReward: number;
    };
  }>;
  examResults: Array<{
    id: string;
    score: number;
    takenAt: string;
    exam: {
      title: string;
      subject: {
        name: string;
      };
    };
  }>;
  studySessions: Array<{
    id: string;
    startTime: string;
    endTime: string;
    durationMin: number;
    focusScore: number;
    subject: {
      name: string;
    } | null;
  }>;
}

export const roleColors: Record<string, string> = {
  ADMIN: "bg-danger shadow-danger/20 text-white",
  TEACHER: "bg-primary shadow-primary/20 text-white",
  STUDENT: "bg-success shadow-success/20 text-white",
  MODERATOR: "bg-warning shadow-warning/20 text-white",
  USER: "bg-secondary shadow-secondary/20 text-white"
};

export const roleLabels: Record<string, string> = {
  ADMIN: "مدير",
  TEACHER: "معلم",
  STUDENT: "طالب",
  MODERATOR: "مشرف",
  USER: "مستخدم"
};

export const gradeLabels: Record<string, string> = {
  "GRADE_1": "الصف الأول",
  "GRADE_2": "الصف الثاني",
  "GRADE_3": "الصف الثالث",
  "GRADE_4": "الصف الرابع",
  "GRADE_5": "الصف الخامس",
  "GRADE_6": "الصف السادس",
  "PREP_1": "الأول الإعدادي",
  "PREP_2": "الثاني الإعدادي",
  "PREP_3": "الثالث الإعدادي",
  "SEC_1": "الأول الثانوي",
  "SEC_2": "الثاني الثانوي",
  "SEC_3": "الثالث الثانوي"
};
