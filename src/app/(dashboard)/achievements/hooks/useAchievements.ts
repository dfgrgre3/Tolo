import { useState, useEffect, useCallback } from 'react';
import { ensureUser } from '@/lib/user-utils';
import { Achievement, UserProgress, AchievementFilters, AchievementRarity } from '../types';
import { filterAchievements, calculateStats, getRarityByXP } from '../utils';
import apiClient from '@/lib/api/api-client';

import { logger } from '@/lib/logger';

interface AchievementsApiResponse {
	data: {
		achievements?: unknown[];
		userProgress?: UserProgress | null;
	};
	error?: string;
}

interface UseAchievementsReturn {
	achievements: Achievement[];
	filteredAchievements: Achievement[];
	userProgress: UserProgress | null;
	stats: ReturnType<typeof calculateStats> | null;
	loading: boolean;
	error: string | null;
	filters: AchievementFilters;
	setFilters: (filters: Partial<AchievementFilters>) => void;
	refetch: () => Promise<void>;
}

const defaultFilters: AchievementFilters = {
	search: '',
	category: 'all',
	difficulty: 'all',
	status: 'all',
	sortBy: 'earnedAt',
};

export function useAchievements(): UseAchievementsReturn {
	const [achievements, setAchievements] = useState<Achievement[]>([]);
	const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [filters, setFiltersState] = useState<AchievementFilters>(defaultFilters);

	const fetchAchievements = useCallback(async () => {
		try {
			setLoading(true);
			setError(null);

			const userId = await ensureUser();

			// If no userId, try to continue with empty data
			if (!userId || userId.trim() === '') {
				logger.warn('No user ID available, loading achievements without user progress');
			}

			// Build query parameters
			const params = new URLSearchParams();
			if (userId && userId.trim() !== '') {
				params.set('userId', userId);
			}
			if (filters.category !== 'all') {
				params.set('category', filters.category);
			}
			if (filters.difficulty !== 'all') {
				params.set('difficulty', filters.difficulty);
			}

			const endpoint = `/gamification/achievements${params.toString() ? `?${params.toString()}` : ''}`;

			// Use apiClient which handles authentication properly
			const data = await apiClient.get<AchievementsApiResponse>(endpoint);

			// Validate response structure
			if (!data || !data.data || !Array.isArray(data.data.achievements)) {
				throw new Error('استجابة غير صحيحة من الخادم');
			}

			const fetchedAchievements: Achievement[] = data.data.achievements.map(
				(ach: unknown) => {
					const achievement = ach as Partial<Achievement> & { xpReward?: number };
					return {
						...achievement,
						rarity: (achievement.rarity || getRarityByXP(achievement.xpReward || 0)) as AchievementRarity,
					} as Achievement;
				}
			);

			setAchievements(fetchedAchievements);
			setUserProgress(data.data.userProgress || null);
			setError(null);
		} catch (err: unknown) {
			logger.error('Error fetching achievements:', err);
			const errorMessage = err instanceof Error ? err.message : 'حدث خطأ غير متوقع';
			setError(errorMessage);
			// Don't set achievements on error - let the UI show the error state
		} finally {
			setLoading(false);
		}
	}, [filters.category, filters.difficulty]); // Only refetch when API-affecting filters change

	useEffect(() => {
		fetchAchievements();
	}, [fetchAchievements]);

	// Calculate filtered achievements and stats
	const filteredAchievements = filterAchievements(achievements, filters);
	const stats = achievements.length > 0 ? calculateStats(achievements) : null;

	const setFilters = (newFilters: Partial<AchievementFilters>) => {
		setFiltersState((prev) => ({ ...prev, ...newFilters }));
	};

	return {
		achievements,
		filteredAchievements,
		userProgress,
		stats,
		loading,
		error,
		filters,
		setFilters,
		refetch: fetchAchievements,
	};
}
