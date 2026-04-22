import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { SessionService } from '@/services/auth/session-service';
import { SecurityLogger } from '@/services/auth/security-logger';
import { TokenService, TokenPayload } from '@/services/auth/token-service';
import { extractClientInfo, handleApiError } from '@/lib/api-utils';

/**
 * POST /api/auth/logout
 * 
 * Logout the current user. Supports two modes:
 * - Single device logout (default): Revokes current session only
 * - All devices logout (?all=true): Revokes ALL user sessions
 * 
 * Process:
 * 1. Extract session ID from cookie
 * 2. Revoke session(s) in database
 * 3. Clear all auth cookies
 * 4. Log security event
 */
export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent } = extractClientInfo(req);
        const cookieStore = await cookies();
        const sessionId = cookieStore.get('session_id')?.value;
        const accessToken = cookieStore.get('access_token')?.value;

        // Determine if this is an "all devices" logout
        const { searchParams } = new URL(req.url);
        const logoutAll = searchParams.get('all') === 'true';

        let userId: string | null = null;

        // Try to extract userId from access token for logging
        if (accessToken) {
            const payload = await TokenService.verifyToken<TokenPayload>(accessToken);
            userId = payload?.userId || null;
        }

        if (logoutAll && userId) {
            // Revoke ALL sessions for this user
            const revokedCount = await SessionService.revokeAllSessions(userId);
            await SecurityLogger.logLogout(userId, ip, userAgent, true);

            // Clear cookies
            clearAuthCookies(cookieStore);

            return NextResponse.json(
                {
                    message: `Logged out from all devices. ${revokedCount} session(s) revoked.`,
                },
                { status: 200 }
            );
        }

        // Single device logout
        if (sessionId) {
            await SessionService.revokeSession(sessionId);
        }

        if (userId) {
            await SecurityLogger.logLogout(userId, ip, userAgent, false);
        }

        // Clear cookies
        clearAuthCookies(cookieStore);

        return NextResponse.json(
            { message: 'Logged out successfully' },
            { status: 200 }
        );
    } catch (error) {
        // Even if logout fails internally, still clear cookies
        try {
            const cookieStore = await cookies();
            clearAuthCookies(cookieStore);
        } catch {
            // Ignore cookie clearing errors
        }

        return handleApiError(error);
    }
}

/**
 * Helper to clear all authentication cookies.
 * Using delete() ensures cookies are removed regardless of their original settings.
 */
function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('session_id');
}
