import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { extractClientInfo, handleApiError } from '@/lib/api-utils';
import { cookies } from 'next/headers';

/**
 * POST /api/auth/2fa/verify
 *
 * Verifies 2FA token during login flow and sets auth cookies.
 */
export async function POST(req: NextRequest) {
  try {
    const { ip, userAgent, location: _location } = extractClientInfo(req);
    const body = await req.json();
    const { userId, token, rememberMe } = body;

    if (!userId || !token) {
      return NextResponse.json({ error: 'User ID and token are required' }, { status: 400 });
    }

    const result = await AuthService.verify2FA(userId, token, ip, userAgent, rememberMe ?? false, _location);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode || 401 });
    }

    const cookieStore = await cookies();
    const isProduction = process.env.NODE_ENV === 'production';
    const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;

    if (result.accessToken) {
      cookieStore.set('access_token', result.accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: 15 * 60,
        path: '/'
      });
    }

    if (result.refreshToken) {
      cookieStore.set('refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: refreshMaxAge,
        path: '/'
      });
    }

    if (result.sessionId) {
      cookieStore.set('session_id', result.sessionId, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        maxAge: refreshMaxAge,
        path: '/'
      });
    }

    return NextResponse.json({ success: true, user: result.user }, { status: 200 });
  } catch (error) {
    return handleApiError(error);
  }
}