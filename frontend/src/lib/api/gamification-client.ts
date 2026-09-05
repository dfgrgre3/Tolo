import { UserProgress, Achievement, LeaderboardEntry, CustomGoal } from '@/types/gamification';
import apiClient from './api-client';
import { apiRoutes } from './routes';

/**
 * Gamification API client — session-scoped.
 *
 * None of these calls send a userId: the backend derives identity from the
 * JWT session (see resolveGamificationUserID in gamification_handler.go) and
 * the client-supplied ?userId=/body override was removed there, so sending
 * one would only invite IDOR/BOLA-style mistakes.
 */

/** Gamification progress of the authenticated user (GET /gamification/progress). */
export async function fetchMyProgress(): Promise<UserProgress | null> {
    return apiClient.get<UserProgress>(apiRoutes.gamification.progress, {
        retries: 0
    });
}

export async function fetchAchievements(): Promise<Achievement[]> {
    const data = await apiClient.get<{ achievements: Achievement[] }>(apiRoutes.gamification.achievements);
    return data.achievements || [];
}

export async function fetchLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 50): Promise<LeaderboardEntry[]> {
    const data = await apiClient.get<{ leaderboard: LeaderboardEntry[] } | LeaderboardEntry[]>(`${apiRoutes.gamification.leaderboard}?type=${type}&limit=${limit}`);

    const entries = Array.isArray(data) ? data : data.leaderboard || [];
    return entries.map((entry) => ({
        ...entry,
        userId: entry.userId || entry.id || '',
        username: entry.username || entry.name
    }));
}

export async function createCustomGoal(
    goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>
): Promise<CustomGoal> {
    return apiClient.post<CustomGoal>(apiRoutes.gamification.goals, goalData);
}

export async function updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    return apiClient.patch<CustomGoal>(`${apiRoutes.gamification.goals}/${goalId}`, { currentValue });
}
