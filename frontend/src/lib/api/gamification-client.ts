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

// The backend serializes CustomGoal.currentValue/targetValue as
// shopspring/decimal values, which encode to JSON as quoted strings (e.g.
// "12.0000"), not numbers. CustomGoal is typed as `number` for those fields,
// so every goal coming from the API is normalized here — the alternative is
// every call site remembering to Number() them before doing arithmetic (a
// mistake that previously broke goal progress updates).
function normalizeGoal(goal: CustomGoal): CustomGoal {
    return {
        ...goal,
        currentValue: Number(goal.currentValue),
        targetValue: Number(goal.targetValue)
    };
}

/** Gamification progress of the authenticated user (GET /gamification/progress). */
export async function fetchMyProgress(): Promise<UserProgress | null> {
    const progress = await apiClient.get<UserProgress>(apiRoutes.gamification.progress, {
        retries: 0
    });
    if (progress?.customGoals) {
        progress.customGoals = progress.customGoals.map(normalizeGoal);
    }
    return progress;
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
    const goal = await apiClient.post<CustomGoal>(apiRoutes.gamification.goals, goalData);
    return normalizeGoal(goal);
}

export async function updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    const goal = await apiClient.patch<CustomGoal>(`${apiRoutes.gamification.goals}/${goalId}`, { currentValue });
    return normalizeGoal(goal);
}
