import { NextRequest, NextResponse } from 'next/server';
import { createAndSendMagicLink } from '@/lib/passwordless/magic-link-service';
import { authService } from '@/lib/services/auth-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { createErrorResponse, createSuccessResponse, parseRequestBody, magicLinkSchema } from '@/app/api/auth/_helpers';

/**
 * POST /api/auth/magic-link
 * طلب رابط سحري لتسجيل الدخول
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const bodyResult = await parseRequestBody<{ email: string }>(req, { required: true });

      if (!bodyResult.success) {
        return bodyResult.error;
      }

      // Use Zod schema for validation
      const parsed = magicLinkSchema.safeParse(bodyResult.data.email);
      if (!parsed.success) {
        const firstError = parsed.error.issues[0]?.message || 'البريد الإلكتروني غير صحيح';
        return createErrorResponse(firstError, firstError, 400);
      }

      const email = parsed.data;
      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);

      const result = await createAndSendMagicLink(email, ip, userAgent);

      // Always return success to prevent email enumeration
      return createSuccessResponse({
        expiresIn: result.expiresIn,
        message: 'إذا كان البريد مسجلاً لدينا، ستتلقى رابط تسجيل الدخول.',
      });
    } catch (error) {
      logger.error('Magic link error:', error);
      return createErrorResponse(error, 'حدث خطأ أثناء إرسال رابط تسجيل الدخول', 500);
    }
  });
}
