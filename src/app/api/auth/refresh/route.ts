import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/db';
import { TokenService, TokenPayload } from '@/services/auth/token-service';
import { SecurityLogger, SecurityEventType } from '@/services/auth/security-logger';
import { SessionService } from '@/services/auth/session-service';
import { extractClientInfo, handleApiError } from '@/lib/api-utils';

/**
 * POST /api/auth/refresh
 * 
 * Refreshes the Access Token using the Refresh Token.
 * Implements Refresh Token Rotation for enhanced security.
 * 
 * Security Flow:
 * 1. Extract refresh token from HttpOnly cookie
 * 2. Verify JWT signature and expiration
 * 3. Validate session in database (active + not expired)
 * 4. CHECK FOR REPLAY ATTACK: Compare token with stored value
 * 5. Generate new Access Token AND new Refresh Token (rotation)
 * 6. Update session with new refresh token
 * 7. Set new cookies
 * 
 * Replay Attack Detection:
 * If a previously used refresh token is reused, it means either:
 * - Token theft occurred (attacker using stolen token)
 * - Client bug (shouldn't happen with proper implementation)
 * In both cases, we immediately revoke the session for security.
 */
export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent } = extractClientInfo(req);
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        if (!refreshToken) {
            return NextResponse.json(
                { error: 'Refresh token missing' },
                { status: 401 }
            );
        }

        // 1. Verify Refresh Token JWT
        const payload = await TokenService.verifyToken<TokenPayload>(refreshToken);

        if (!payload || payload.type !== 'refresh' || !payload.sessionId) {
            clearAuthCookies(cookieStore);
            return NextResponse.json(
                { error: 'Invalid refresh token' },
                { status: 401 }
            );
        }

        // 2. Validate Session in Database
        const session = await prisma.session.findUnique({
            where: {
                id: payload.sessionId,
            },
            include: { user: true },
        });

        if (!session || !session.isActive || session.expiresAt < new Date()) {
            clearAuthCookies(cookieStore);
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 403 }
            );
        }

        // 3. CRITICAL: Replay Attack Detection
        // If stored refreshToken doesn't match the one being used,
        // it means an old token is being reused → potential theft
        const refreshTokenHash = SessionService.hashRefreshToken(refreshToken);
        if (session.refreshToken !== refreshTokenHash) {
            // Check for grace period: was this token recently rotated?
            const recentlyRotated = await SessionService.isRecentlyRotated(refreshTokenHash, session.id);
            if (recentlyRotated) {
                // Return success as this is likely a concurrent request race condition
                return NextResponse.json(
                    { message: 'Session already refreshed' },
                    { status: 200 }
                );
            }

            // Immediately revoke the session (nuclear option for safety)
            await SessionService.revokeSession(session.id);
            await SecurityLogger.logReplayAttack(session.userId, ip, userAgent, session.id);
            clearAuthCookies(cookieStore);

            return NextResponse.json(
                { error: 'Security violation detected. Session terminated.' },
                { status: 403 }
            );
        }

        // 4. Generate New Token Pair (Refresh Token Rotation)
        const newAccessToken = await TokenService.generateAccessToken({
            userId: session.user.id,
            role: session.user.role,
            sessionId: session.id,
        });

        const newRefreshToken = await TokenService.generateRefreshToken(
            session.user.id,
            session.id
        );

        const remainingSessionSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
        if (remainingSessionSeconds <= 0) {
            clearAuthCookies(cookieStore);
            return NextResponse.json(
                { error: 'Session expired. Please login again.' },
                { status: 403 }
            );
        }

        // 5. Update Session with New Refresh Token
        await prisma.session.update({
            where: { id: session.id },
            data: {
                refreshToken: SessionService.hashRefreshToken(newRefreshToken),
                lastAccessed: new Date(),
            },
        });

        // 5b. Mark old token as recently rotated (grace period)
        await SessionService.markTokenAsRotated(refreshTokenHash, session.id);

        // 6. Set New Cookies
        const isProduction = process.env.NODE_ENV === 'production';

        cookieStore.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: Math.min(15 * 60, remainingSessionSeconds),
            path: '/',
        });

        cookieStore.set('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: remainingSessionSeconds,
            path: '/',
        });

        cookieStore.set('session_id', session.id, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: remainingSessionSeconds,
            path: '/',
        });

        // 7. Log Refresh Event (non-blocking)
        SecurityLogger.log({
            userId: session.userId,
            eventType: SecurityEventType.TOKEN_REFRESH,
            ip,
            userAgent,
            metadata: { sessionId: session.id },
        }).catch(() => { /* fire and forget */ });

        return NextResponse.json(
            { message: 'Tokens refreshed successfully' },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}

function clearAuthCookies(cookieStore: Awaited<ReturnType<typeof cookies>>) {
    cookieStore.delete('access_token');
    cookieStore.delete('refresh_token');
    cookieStore.delete('session_id');
}
