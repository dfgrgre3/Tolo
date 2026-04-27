import { UserProgress, Achievement, LeaderboardEntry, CustomGoal } from '@/types/gamification';
import apiClient from './api-client';
import { apiRoutes } from './routes';

export async function fetchUserProgress(userId: string): Promise<UserProgress | null> {
    return apiClient.get<UserProgress>(`${apiRoutes.gamification.progress}?userId=${userId}`);
}

export async function fetchAchievements(): Promise<Achievement[]> {
    const data = await apiClient.get<{ achievements: Achievement[] }>(apiRoutes.gamification.achievements);
    return data.achievements || [];
}

export async function fetchLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 50): Promise<LeaderboardEntry[]> {
    const data = await apiClient.get<{ leaderboard: LeaderboardEntry[] } | LeaderboardEntry[]>(`${apiRoutes.gamification.leaderboard}?type=${type}&limit=${limit}`);

    if (Array.isArray(data)) {
        return data;
    }
    return data.leaderboard || [];
}

export async function updateUserProgress(userId: string, action: string, data?: Record<string, any>): Promise<UserProgress> {
    return apiClient.post<UserProgress>(apiRoutes.gamification.progress, { userId, action, data });
}

export async function createCustomGoal(
    userId: string,
    goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>
): Promise<CustomGoal> {
    return apiClient.post<CustomGoal>(apiRoutes.gamification.goals, { userId, ...goalData });
}

export async function updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    return apiClient.patch<CustomGoal>(`${apiRoutes.gamification.goals}/${goalId}`, { currentValue });
}
