export type AchievementCategory = 'study' | 'tasks' | 'exams' | 'time' | 'streak';
export type AchievementDifficulty = 'easy' | 'medium' | 'hard' | 'expert';
export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';
export type SortOption = 'earnedAt' | 'title' | 'xpReward' | 'difficulty';

export interface Achievement {
	id: string;
	key: string;
	title: string;
	description: string;
	icon: string;
	category: AchievementCategory;
	difficulty: AchievementDifficulty;
	xpReward: number;
	requirements: Record<string, any>;
	isSecret?: boolean;
	isEarned?: boolean;
	earnedAt?: string | null;
	progress?: number;
	maxProgress?: number;
	rarity?: AchievementRarity;
}

export interface UserProgress {
	totalXP: number;
	level: number;
	achievementsCount: number;
	totalAchievements: number;
}

export interface AchievementFilters {
	search: string;
	category: AchievementCategory | 'all';
	difficulty: AchievementDifficulty | 'all';
	status: 'all' | 'earned' | 'locked';
	sortBy: SortOption;
}

export interface AchievementStats {
	total: number;
	earned: number;
	locked: number;
	byCategory: Record<AchievementCategory, number>;
	byDifficulty: Record<AchievementDifficulty, number>;
	totalXP: number;
	completionPercentage: number;
}

