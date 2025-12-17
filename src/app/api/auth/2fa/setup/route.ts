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

    const { secret, qrCodeUrl } = await authService.generateTwoFactorSecret(
      authResult.user.id,
      authResult.user.email
    );

    const response = NextResponse.json({
      secret,
      qrCodeUrl,
      message: 'Scan the QR code with your authenticator app'
    });

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('2FA setup error:', error);
    return createStandardErrorResponse(error, 'Failed to setup 2FA');
  }
}
