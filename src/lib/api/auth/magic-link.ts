/**
 * Magic Link API operations
 */

import { apiFetch } from './core';

/**
 * Send magic link
 */
export async function sendMagicLink(email: string): Promise<{
    message: string;
}> {
    return apiFetch<{ message: string }>('/magic-link', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
}

/**
 * Verify magic link
 */
export async function verifyMagicLink(token: string): Promise<{
    message: string;
    token?: string;
    user?: any;
}> {
    return apiFetch<{ message: string; token?: string; user?: any }>('/magic-link/verify', {
        method: 'POST',
        body: JSON.stringify({ token }),
    });
}
