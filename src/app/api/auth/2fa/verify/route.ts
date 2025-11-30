import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { addSecurityHeaders, createStandardErrorResponse, parseRequestBody, setAuthCookies } from '@/app/api/auth/_helpers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const bodyResult = await parseRequestBody<{ tempToken: string; code: string }>(request);
    if (!bodyResult.success) return bodyResult.error;

    const { tempToken, code } = bodyResult.data;

    if (!tempToken || !code) {
      return NextResponse.json(
        { error: 'Temporary token and code are required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const ip = authService.getClientIP(request);
    const userAgent = authService.getUserAgent(request);

    const result = await authService.verify2FALogin(tempToken, code, userAgent, ip);

    if (!result.isValid) {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code', code: 'INVALID_CODE' },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken,
      sessionId: result.sessionId,
      message: 'Login successful'
    });

    if (result.accessToken && result.refreshToken) {
      setAuthCookies(response, result.accessToken, result.refreshToken, false);
    }

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('2FA verify error:', error);
    return createStandardErrorResponse(error, 'Failed to verify 2FA');
  }
}
