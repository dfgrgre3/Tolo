type AchievementCategory = 'study' | 'tasks' | 'exams' | 'time' | 'streak' | 'general';
type AchievementDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface ProgressSummary {
  totalMinutes: number;
  averageFocus: number;
  tasksCompleted: number;
  streakDays: number;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  difficulty: AchievementDifficulty;
  xpReward: number;
  requirements: Record<string, unknown>;
  isSecret?: boolean;
  isEarned?: boolean;
  earnedAt?: string | null;
  progress?: number;
  maxProgress?: number;
  rarity?: AchievementRarity;
}

export interface UserProgress {
  id: string;
  userId: string;
  totalXP: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  totalStudyTime?: number; // in minutes
  achievements: string[]; // Array of achievement keys or IDs
  customGoals: CustomGoal[];
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardEntry {
  userId: string;
  name: string;
  username?: string;
  avatar?: string;
  totalXP: number;
  level: number;
  rank: number;
  isCurrentUser?: boolean;
  badge?: string;
}

export interface CustomGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  type: string;
  isCompleted: boolean;
  deadline?: string;
  createdAt: string;
  completedAt?: string;
}
