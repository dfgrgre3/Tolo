import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { setAuthCookies } from '@/app/api/auth/_helpers';

/**
 * POST /api/auth/two-factor/totp/verify-login
 * التحقق من رمز TOTP أثناء تسجيل الدخول
 */
export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const body = await req.json();
      const { loginAttemptId, code } = body;

      if (!loginAttemptId) {
        return NextResponse.json(
          { error: 'معرف محاولة تسجيل الدخول مطلوب' },
          { status: 400 }
        );
      }

      if (!code) {
        return NextResponse.json(
          { error: 'رمز التحقق مطلوب' },
          { status: 400 }
        );
      }

      // Get IP and User Agent
      const ip = authService.getClientIP(req);
      const userAgent = authService.getUserAgent(req);

      // Verify using AuthService
      // loginAttemptId is the tempToken returned by login
      const result = await authService.verify2FALogin(loginAttemptId, code, userAgent, ip);

      if (!result.isValid || !result.accessToken || !result.refreshToken || !result.sessionId) {
        return NextResponse.json(
          { error: result.error || 'رمز التحقق غير صحيح' },
          { status: 401 }
        );
      }

      const response = NextResponse.json({
        message: 'تم تسجيل الدخول بنجاح',
        token: result.accessToken,
        refreshToken: result.refreshToken,
        sessionId: result.sessionId,
        user: result.user,
      });

      // Set cookies
      setAuthCookies(response, result.accessToken, result.refreshToken, false);

      return response;

    } catch (error) {
      logger.error('TOTP login verify error:', error);
      return NextResponse.json(
        { error: 'حدث خطأ أثناء التحقق' },
        { status: 500 }
      );
    }
  });
}
