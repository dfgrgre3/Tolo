import { UserProgress, Achievement, LeaderboardEntry, CustomGoal } from '@/lib/services/gamification-service';

/**
 * Helper function for API requests with error handling
 */
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(endpoint, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
        credentials: 'include', // Ensure cookies are sent
    });

    if (!res.ok) {
        let errorMessage = 'An error occurred';
        try {
            const errorData = await res.json();
            errorMessage = errorData.error || errorData.message || res.statusText;
        } catch (e) {
            errorMessage = res.statusText;
        }
        throw new Error(errorMessage);
    }

    // Handle 204 No Content
    if (res.status === 204) {
        return {} as T;
    }

    return res.json();
}

/**
 * Fetch user progress
 */
export async function fetchUserProgress(userId: string): Promise<UserProgress | null> {
    return apiFetch<UserProgress>(`/api/gamification/progress?userId=${userId}`);
}

/**
 * Fetch all achievements
 */
export async function fetchAchievements(): Promise<Achievement[]> {
    const data = await apiFetch<{ achievements: Achievement[] }>(`/api/gamification/achievements`);
    return data.achievements || [];
}

/**
 * Fetch leaderboard
 */
export async function fetchLeaderboard(type: 'global' | 'friends' = 'global', limit: number = 50): Promise<LeaderboardEntry[]> {
    const data = await apiFetch<{ leaderboard: LeaderboardEntry[] } | LeaderboardEntry[]>(`/api/gamification/leaderboard?type=${type}&limit=${limit}`);

    if (Array.isArray(data)) {
        return data;
    }
    return data.leaderboard || [];
}

/**
 * Update user progress
 */
export async function updateUserProgress(userId: string, action: string, data?: Record<string, any>): Promise<UserProgress> {
    return apiFetch<UserProgress>(`/api/gamification/progress`, {
        method: 'POST',
        body: JSON.stringify({ userId, action, data })
    });
}

/**
 * Create custom goal
 */
export async function createCustomGoal(
    userId: string,
    goalData: Omit<CustomGoal, 'id' | 'userId' | 'isCompleted' | 'createdAt' | 'completedAt'>
): Promise<CustomGoal> {
    return apiFetch<CustomGoal>(`/api/gamification/goals`, {
        method: 'POST',
        body: JSON.stringify({ userId, ...goalData })
    });
}

/**
 * Update custom goal
 */
export async function updateCustomGoal(goalId: string, currentValue: number): Promise<CustomGoal> {
    return apiFetch<CustomGoal>(`/api/gamification/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ currentValue })
    });
}
