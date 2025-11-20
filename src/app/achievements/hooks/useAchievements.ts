import { useState, useEffect, useCallback } from 'react';
import { ensureUser } from '@/lib/user-utils';
import { Achievement, UserProgress, AchievementFilters, AchievementRarity } from '../types';
import { filterAchievements, calculateStats, getRarityByXP } from '../utils';

import { logger } from '@/lib/logger';

interface AchievementsApiResponse {
	achievements?: unknown[];
	userProgress?: UserProgress | null;
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

			const url = new URL('/api/gamification/achievements', window.location.origin);
			if (userId && userId.trim() !== '') {
				url.searchParams.set('userId', userId);
			}

			// Add filters to API call if needed
			if (filters.category !== 'all') {
				url.searchParams.set('category', filters.category);
			}
			if (filters.difficulty !== 'all') {
				url.searchParams.set('difficulty', filters.difficulty);
			}

			const res = await fetch(url.toString());

			// Even if response is not ok, try to parse it for fallback data
			let data: AchievementsApiResponse | null = null;
			if (!res.ok) {
				try {
					data = await res.json() as AchievementsApiResponse;
					// If API returned fallback data, use it
					if (data.achievements && Array.isArray(data.achievements)) {
						const fetchedAchievements: Achievement[] = data.achievements.map(
							(ach: unknown) => {
								const achievement = ach as Partial<Achievement> & { xpReward?: number };
								return {
									...achievement,
									rarity: (achievement.rarity || getRarityByXP(achievement.xpReward || 0)) as AchievementRarity,
								} as Achievement;
							}
						);
						setAchievements(fetchedAchievements);
						setUserProgress(data.userProgress || null);
						// Show warning but don't set as error
						setError(null);
						return;
					}
				} catch (parseError: unknown) {
					// If we can't parse the error response, throw original error
				}
				throw new Error(data?.error || `فشل في تحميل الإنجازات (${res.status})`);
			}

			data = await res.json() as AchievementsApiResponse;

			// Validate response structure
			if (!data || !Array.isArray(data.achievements)) {
				throw new Error('استجابة غير صحيحة من الخادم');
			}

			const fetchedAchievements: Achievement[] = data.achievements.map(
				(ach: unknown) => {
					const achievement = ach as Partial<Achievement> & { xpReward?: number };
					return {
						...achievement,
						rarity: (achievement.rarity || getRarityByXP(achievement.xpReward || 0)) as AchievementRarity,
					} as Achievement;
				}
			);

			setAchievements(fetchedAchievements);
			setUserProgress(data.userProgress || null);
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
