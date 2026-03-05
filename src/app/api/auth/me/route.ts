import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { handleApiError } from '@/lib/api-utils';
import { cookies } from 'next/headers';
import { TokenService, TokenPayload } from '@/lib/auth/token-service';
import { SessionService } from '@/lib/auth/session-service';
import prisma from '@/lib/db';

/**
 * GET /api/auth/me
 *
 * Returns the currently authenticated user's profile.
 * Supports two modes:
 *   1. Valid access_token → reads userId from X-User-ID header (set by middleware).
 *   2. Expired access_token + valid refresh_token → silently refreshes tokens then returns user.
 *
 * This endpoint is called by the AuthContext on mount to restore user state
 * across page reloads.
 */
export async function GET(req: NextRequest) {
    try {
        // ── Priority 1: middleware already validated the access token ────────────
        const userIdFromHeader = req.headers.get('x-user-id');

        if (userIdFromHeader) {
            const user = await AuthService.getCurrentUser(userIdFromHeader);
            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
            return NextResponse.json({ user }, { status: 200 });
        }

        // ── Priority 2: Access token missing/expired — try silent refresh ────────
        const cookieStore = await cookies();
        const refreshToken = cookieStore.get('refresh_token')?.value;

        if (!refreshToken) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify refresh token JWT
        const payload = await TokenService.verifyToken<TokenPayload>(refreshToken);
        if (!payload || payload.type !== 'refresh' || !payload.sessionId) {
            cookieStore.delete('access_token');
            cookieStore.delete('refresh_token');
            cookieStore.delete('session_id');
            return NextResponse.json({ error: 'Invalid refresh token' }, { status: 401 });
        }

        // Validate session in DB
        const session = await prisma.session.findFirst({
            where: {
                id: payload.sessionId as string,
                isActive: true,
            },
            include: { user: true },
        });

        if (!session || session.expiresAt < new Date()) {
            cookieStore.delete('access_token');
            cookieStore.delete('refresh_token');
            cookieStore.delete('session_id');
            return NextResponse.json({ error: 'Session expired' }, { status: 401 });
        }

        // Replay-attack guard: compare stored hash
        const refreshTokenHash = SessionService.hashRefreshToken(refreshToken);
        if (session.refreshToken !== refreshTokenHash) {
            await SessionService.revokeSession(session.id);
            cookieStore.delete('access_token');
            cookieStore.delete('refresh_token');
            cookieStore.delete('session_id');
            return NextResponse.json({ error: 'Security violation. Session terminated.' }, { status: 403 });
        }

        // Issue new token pair (rotation)
        const newAccessToken = await TokenService.generateAccessToken({
            userId: session.user.id,
            role: session.user.role,
            sessionId: session.id,
        });

        const newRefreshToken = await TokenService.generateRefreshToken(session.user.id, session.id);

        const remainingSeconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);

        // Persist new refresh token hash
        await prisma.session.update({
            where: { id: session.id },
            data: {
                refreshToken: SessionService.hashRefreshToken(newRefreshToken),
                lastAccessed: new Date(),
            },
        });

        // Fetch full user profile
        const user = await AuthService.getCurrentUser(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Build response and attach new cookies
        const response = NextResponse.json({ user }, { status: 200 });

        const isProduction = process.env.NODE_ENV === 'production';
        const accessMaxAge = Math.min(15 * 60, remainingSeconds);

        response.cookies.set('access_token', newAccessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: accessMaxAge,
            path: '/',
        });

        response.cookies.set('refresh_token', newRefreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: remainingSeconds,
            path: '/',
        });

        response.cookies.set('session_id', session.id, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: remainingSeconds,
            path: '/',
        });

        return response;
    } catch (error) {
        return handleApiError(error);
    }
}
