import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/services/auth-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { createStandardErrorResponse, createSuccessResponse } from '@/app/api/auth/_helpers';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { enable, userId } = await req.json();

      if (!userId) {
        return createStandardErrorResponse(
          { error: 'User ID is required' },
          'معرف المستخدم مطلوب',
          400
        );
      }

      // Verify authorization
      const verification = await authService.verifyTokenFromRequest(req);
      if (!verification.isValid || !verification.user || verification.user.id !== userId) {
        return createStandardErrorResponse(
          { error: 'Unauthorized' },
          'غير مصرح',
          401
        );
      }

      if (!enable) {
        await authService.disableTwoFactor(userId);
        return createSuccessResponse({
          user: {
            id: userId,
            twoFactorEnabled: false,
          },
        }, 'تم تعطيل المصادقة الثنائية بنجاح');
      }

      // If enabling, we should not do it here directly without verification.
      // The client should use /api/auth/two-factor/totp/setup and /verify
      return createStandardErrorResponse(
        { error: 'To enable 2FA, please use the TOTP setup flow' },
        'لتفعيل المصادقة الثنائية، يرجى استخدام مسار إعداد TOTP',
        400
      );

    } catch (error) {
      logger.error('Error updating two-factor authentication:', error);
      return createStandardErrorResponse(error, 'خطأ في الخادم الداخلي', 500);
    }
  });
}