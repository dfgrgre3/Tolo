import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { cookies } from 'next/headers';
import { extractClientInfo } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
        return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    const { ip, userAgent, location } = extractClientInfo(request);

    const result = await AuthService.verifyMagicLink(token, ip, userAgent, location);

    if (!result.success || !result.refreshToken) {
        return NextResponse.redirect(
            new URL(`/login?error=${encodeURIComponent(result.error || 'invalid_token')}`, request.url)
        );
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const refreshMaxAge = 30 * 24 * 60 * 60; // 30 days for magic links (persistent by default)

    if (result.accessToken) {
        cookieStore.set('access_token', result.accessToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/',
        });
    }

    cookieStore.set('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: refreshMaxAge,
        path: '/',
    });

    if (result.sessionId) {
        cookieStore.set('session_id', result.sessionId, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: refreshMaxAge,
            path: '/',
        });
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
}
