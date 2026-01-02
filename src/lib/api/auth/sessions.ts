/**
 * Sessions and Security Logs API operations
 */

import { apiFetch } from './core';

/**
 * Get security logs
 */
export async function getSecurityLogs(params?: {
    page?: number;
    limit?: number;
}): Promise<{ logs: unknown[]; total: number }> {
    const queryParams = params
        ? `?${new URLSearchParams(params as Record<string, string>).toString()}`
        : '';
    return apiFetch<{ logs: unknown[]; total: number }>(
        `/security-logs${queryParams}`,
        {
            method: 'GET',
        }
    );
}

/**
 * Get sessions
 */
export async function getSessions(): Promise<{
    sessions: unknown[];
    currentSessionId?: string;
}> {
    return apiFetch<{ sessions: unknown[]; currentSessionId?: string }>('/sessions', {
        method: 'GET',
    });
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>(`/sessions/${sessionId}`, {
        method: 'DELETE',
    });
}

/**
 * Get OAuth status
 */
export async function getOAuthStatus(): Promise<{
    status: 'pending' | 'success' | 'error';
    user?: any;
    error?: string;
}> {
    return apiFetch<{
        status: 'pending' | 'success' | 'error';
        user?: any;
        error?: string;
    }>('/oauth/status', {
        method: 'GET',
    });
}
