import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { addSecurityHeaders, createStandardErrorResponse, parseRequestBody } from '@/app/api/auth/_helpers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authService.getCurrentUser();
    if (!authResult.isValid || !authResult.user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    const bodyResult = await parseRequestBody<{ token: string }>(request);
    if (!bodyResult.success) return bodyResult.error;

    const { token } = bodyResult.data;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required', code: 'MISSING_FIELDS' },
        { status: 400 }
      );
    }

    const result = await authService.enableTwoFactor(authResult.user.id, token);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Invalid verification code', code: 'INVALID_CODE' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({
      success: true,
      recoveryCodes: result.recoveryCodes,
      message: 'Two-factor authentication enabled successfully'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('2FA enable error:', error);
    return createStandardErrorResponse(error, 'Failed to enable 2FA');
  }
}
