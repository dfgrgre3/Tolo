import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { addSecurityHeaders, createStandardErrorResponse } from '@/app/api/auth/_helpers';
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

    await authService.disableTwoFactor(authResult.user.id);

    const response = NextResponse.json({
      success: true,
      message: 'Two-factor authentication disabled successfully'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('2FA disable error:', error);
    return createStandardErrorResponse(error, 'Failed to disable 2FA');
  }
}
