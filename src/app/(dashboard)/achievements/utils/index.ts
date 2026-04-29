import {
	Achievement,
	AchievementCategory,
	AchievementDifficulty,
	AchievementRarity,
	AchievementStats,
	AchievementFilters,
} from '../types';

/**
 * Get category label in Arabic
 */
export const getCategoryLabel = (category: AchievementCategory): string => {
	const labels: Record<AchievementCategory, string> = {
		study: 'الدراسة',
		tasks: 'المهام',
		exams: 'الامتحانات',
		time: 'الوقت',
		streak: 'الاستمرارية',
	};
	return labels[category] || category;
};

/**
 * Get category icon
 */
export const getCategoryIcon = (category: AchievementCategory): string => {
	const icons: Record<AchievementCategory, string> = {
		study: '📚',
		tasks: '✅',
		exams: '📊',
		time: '⏱️',
		streak: '🔥',
	};
	return icons[category] || '🏆';
};

/**
 * Get difficulty label in Arabic
 */
export const getDifficultyLabel = (difficulty: AchievementDifficulty): string => {
	const labels: Record<AchievementDifficulty, string> = {
		easy: 'سهل',
		medium: 'متوسط',
		hard: 'صعب',
		expert: 'خبير',
	};
	return labels[difficulty] || difficulty;
};

/**
 * Get difficulty color class
 */
export const getDifficultyColor = (difficulty: AchievementDifficulty): string => {
	const colors: Record<AchievementDifficulty, string> = {
		easy: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		medium: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		hard: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
		expert: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
	};
	return colors[difficulty] || '';
};

/**
 * Get rarity color class
 */
export const getRarityColor = (rarity: AchievementRarity): string => {
	const colors: Record<AchievementRarity, string> = {
		common: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
		rare: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		epic: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
		legendary: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
	};
	return colors[rarity] || '';
};

/**
 * Get rarity label in Arabic
 */
export const getRarityLabel = (rarity: AchievementRarity): string => {
	const labels: Record<AchievementRarity, string> = {
		common: 'عادي',
		rare: 'نادر',
		epic: 'أسطوري',
		legendary: 'مميز',
	};
	return labels[rarity] || rarity;
};

/**
 * Determine rarity based on XP reward
 */
export const getRarityByXP = (xpReward: number): AchievementRarity => {
	if (xpReward >= 300) return 'legendary';
	if (xpReward >= 150) return 'epic';
	if (xpReward >= 75) return 'rare';
	return 'common';
};

/**
 * Filter achievements based on filters
 */
export const filterAchievements = (
	achievements: Achievement[],
	filters: AchievementFilters
): Achievement[] => {
	let filtered = [...achievements];

	// Search filter
	if (filters.search.trim()) {
		const searchLower = filters.search.toLowerCase();
		filtered = filtered.filter(
			(ach) =>
				ach.title.toLowerCase().includes(searchLower) ||
				ach.description.toLowerCase().includes(searchLower)
		);
	}

	// Category filter
	if (filters.category !== 'all') {
		filtered = filtered.filter((ach) => ach.category === filters.category);
	}

	// Difficulty filter
	if (filters.difficulty !== 'all') {
		filtered = filtered.filter((ach) => ach.difficulty === filters.difficulty);
	}

	// Status filter
	if (filters.status === 'earned') {
		filtered = filtered.filter((ach) => ach.isEarned);
	} else if (filters.status === 'locked') {
		filtered = filtered.filter((ach) => !ach.isEarned);
	}

	// Sort
	filtered.sort((a, b) => {
		switch (filters.sortBy) {
			case 'earnedAt':
				if (!a.earnedAt && !b.earnedAt) return 0;
				if (!a.earnedAt) return 1;
				if (!b.earnedAt) return -1;
				return new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime();
			case 'title':
				return a.title.localeCompare(b.title, 'ar');
			case 'xpReward':
				return b.xpReward - a.xpReward;
			case 'difficulty':
				const difficultyOrder: Record<AchievementDifficulty, number> = {
					easy: 1,
					medium: 2,
					hard: 3,
					expert: 4,
				};
				return difficultyOrder[b.difficulty] - difficultyOrder[a.difficulty];
			default:
				return 0;
		}
	});

	return filtered;
};

/**
 * Calculate achievement statistics
 */
export const calculateStats = (achievements: Achievement[]): AchievementStats => {
	const stats: AchievementStats = {
		total: achievements.length,
		earned: achievements.filter((a) => a.isEarned).length,
		locked: achievements.filter((a) => !a.isEarned).length,
		byCategory: {
			study: 0,
			tasks: 0,
			exams: 0,
			time: 0,
			streak: 0,
		},
		byDifficulty: {
			easy: 0,
			medium: 0,
			hard: 0,
			expert: 0,
		},
		totalXP: 0,
		completionPercentage: 0,
	};

	achievements.forEach((ach) => {
		stats.byCategory[ach.category]++;
		stats.byDifficulty[ach.difficulty]++;
		if (ach.isEarned) {
			stats.totalXP += ach.xpReward;
		}
	});

	if (stats.total > 0) {
		stats.completionPercentage = Math.round((stats.earned / stats.total) * 100);
	}

	return stats;
};

/**
 * Format date in Arabic
 */
export const formatArabicDate = (dateString: string): string => {
	const date = new Date(dateString);
	return date.toLocaleDateString('ar-SA', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
};

/**
 * Format relative time in Arabic
 */
export const formatRelativeTime = (dateString: string): string => {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'اليوم';
	if (diffDays === 1) return 'أمس';
	if (diffDays < 7) return `منذ ${diffDays} أيام`;
	if (diffDays < 30) return `منذ ${Math.floor(diffDays / 7)} أسابيع`;
	if (diffDays < 365) return `منذ ${Math.floor(diffDays / 30)} أشهر`;
	return `منذ ${Math.floor(diffDays / 365)} سنوات`;
};

