export interface Achievement {
  key: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category?: string;
  difficulty?: string;
}

export interface UserProgress {
  userId: string;
  totalXP: number;
  level: number;
  nextLevelXP?: number;
  progressToNextLevel?: number;
  achievements: string[];
  currentStreak: number;
  longestStreak: number;
  // Multi-layer XP
  studyXP?: number;
  taskXP?: number;
  examXP?: number;
  challengeXP?: number;
  questXP?: number;
  seasonXP?: number;
  // Stats
  totalStudyTime: number;
  tasksCompleted: number;
  examsPassed: number;
  customGoals: CustomGoal[];
}

export interface SeasonReward {
  type: string;
  value: number | string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface Season {
  id: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  rewards?: SeasonReward[];
}

export interface ChallengeRequirement {
  type: string;
  target: number;
  current?: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  category: 'study' | 'tasks' | 'exams' | 'streak' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  xpReward: number;
  requirements: Record<string, ChallengeRequirement>;
  startDate: Date;
  endDate: Date;
  subjectId?: string;
  levelRange?: [number, number];
}

export interface QuestChain {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  totalQuests: number;
  quests: Quest[];
}

export interface Quest {
  id: string;
  chainId: string;
  title: string;
  description: string;
  order: number;
  xpReward: number;
  requirements: Record<string, any>;
  prerequisites?: string[];
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  totalXP: number;
  level: number;
  rank: number;
  avatar?: string;
  // Optional advanced scores
  studyXP?: number;
  taskXP?: number;
  examXP?: number;
  challengeXP?: number;
  questXP?: number;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  type: 'virtual' | 'nft' | 'badge' | 'title';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  imageUrl?: string;
  metadata?: Record<string, any>;
}

export interface CustomGoal {
  id: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  category: string;
  xpReward: number;
  isCompleted: boolean;
  createdAt: Date;
  completedAt?: Date;
}
