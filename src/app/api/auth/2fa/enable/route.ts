import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import {
  addSecurityHeaders,
  createStandardErrorResponse,
  parseRequestBody,
  createSuccessResponse
} from '@/app/api/auth/_helpers';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const authResult = await authService.getCurrentUser();
    if (!authResult.isValid || !authResult.user) {
      return createStandardErrorResponse(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        'غير مصرح',
        401
      );
    }

    const bodyResult = await parseRequestBody<{ token: string }>(request);
    if (!bodyResult.success) return bodyResult.error;

    const { token } = bodyResult.data;

    if (!token) {
      return createStandardErrorResponse(
        { error: 'Token is required', code: 'MISSING_FIELDS' },
        'رمز التحقق مطلوب',
        400
      );
    }

    const result = await authService.enableTwoFactor(authResult.user.id, token);

    if (!result.success) {
      return createStandardErrorResponse(
        { error: result.error || 'Invalid verification code', code: 'INVALID_CODE' },
        'رمز التحقق غير صالح',
        400
      );
    }

    const response = createSuccessResponse({
      recoveryCodes: result.recoveryCodes,
    }, 'تم تفعيل المصادقة الثنائية بنجاح');

    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('2FA enable error:', error);
    return createStandardErrorResponse(error, 'فشل تفعيل المصادقة الثنائية');
  }
}
