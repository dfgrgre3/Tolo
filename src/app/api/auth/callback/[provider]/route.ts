import { NextRequest, NextResponse } from 'next/server';
import { OAuthService, OAuthUser } from '@/services/auth/oauth-service';
import { cookies } from 'next/headers';
import { extractClientInfo } from '@/lib/api-utils';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ provider: string }> }
) {
    const { provider } = await params;
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/auth/callback/${provider}`;

    if (!code) {
        return NextResponse.redirect(new URL('/login?error=no_code', request.url));
    }

    let socialUser: OAuthUser | null = null;

    if (provider === 'google') {
        socialUser = await OAuthService.getGoogleUser(code, redirectUri);
    } else if (provider === 'github') {
        socialUser = await OAuthService.getGithubUser(code);
    }

    if (!socialUser) {
        return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
    }

    const { ip, userAgent, location } = extractClientInfo(request);

    const result = await OAuthService.handleSocialAuth(
        provider as 'google' | 'github',
        socialUser,
        ip,
        userAgent,
        location
    );

    if (!result.success || !result.refreshToken) {
        return NextResponse.redirect(new URL(`/login?error=${result.error || 'auth_failed'}`, request.url));
    }

    // Set Refresh Token Cookie
    const response = NextResponse.redirect(new URL('/dashboard', request.url));
    const cookieStore = await cookies();

    cookieStore.set('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    if (result.accessToken) {
        cookieStore.set('access_token', result.accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 15 * 60, // 15 minutes
        });
    }

    return response;
}
