import { NextRequest, NextResponse } from 'next/server';
import { refreshTokenSchema } from '@/lib/validations/auth';
import { authService } from '@/lib/services/auth-service';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import {
  setAuthCookies,
  clearAuthCookies,
  createStandardErrorResponse,
  parseRequestBody,
  extractRequestMetadata,
  logSecurityEventSafely,
  addSecurityHeaders
} from '@/app/api/auth/_helpers';

import { logger } from '@/lib/logger';


export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    const { ip, userAgent } = extractRequestMetadata(req);

    try {
      let refreshToken: string | undefined;

      // 1. Attempt to parse refresh token from cookie
      refreshToken = req.cookies.get('refresh_token')?.value;

      // 2. If not in cookie, attempt to parse from request body
      if (!refreshToken) {
        const bodyResult = await parseRequestBody(req, {
          maxSize: 512,
        });

        if (bodyResult.success) {
          const parseResult = refreshTokenSchema.safeParse(bodyResult.data);
          if (parseResult.success) {
            refreshToken = parseResult.data.refreshToken;
          }
        }
      }

      if (!refreshToken) {
        await logSecurityEventSafely(null, 'refresh_token_missing', {
          ip,
          userAgent,
        });

        const response = createStandardErrorResponse(
          new Error('REFRESH_TOKEN_MISSING'),
          'رمز التحديث مطلوب.',
          400
        );
        clearAuthCookies(response);
        return response;
      }

      // 3. Verify refresh token using authService
      let refreshResult;
      try {
        refreshResult = await authService.refreshAccessToken(refreshToken);
      } catch (tokenError) {
        logger.error('Token refresh error:', tokenError);

        await logSecurityEventSafely(null, 'refresh_token_error', {
          ip,
          userAgent,
          error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
        });

        const response = createStandardErrorResponse(
          tokenError,
          'رمز التحديث غير صالح أو منتهي الصلاحية.',
          401
        );
        clearAuthCookies(response);
        return response;
      }

      if (!refreshResult || !refreshResult.tokens || !refreshResult.tokens.accessToken) {
        await logSecurityEventSafely(null, 'refresh_token_invalid', {
          ip,
          userAgent,
        });

        const response = createStandardErrorResponse(
          new Error('INVALID_OR_EXPIRED_REFRESH_TOKEN'),
          'رمز التحديث غير صالح.',
          401
        );
        clearAuthCookies(response);
        return response;
      }

      // 4. Log successful token refresh
      try {
        const payload = await authService.verifyToken(refreshResult.tokens.accessToken);
        if (payload) {
          await logSecurityEventSafely(payload.userId as string, 'token_refreshed', {
            ip,
            userAgent,
          });
        }
      } catch (logError) {
        logger.warn('Failed to log token refresh event:', logError);
      }

      const response = NextResponse.json({
        message: 'تم تحديث الرمز بنجاح.',
        token: refreshResult.tokens.accessToken,
        success: true,
      });

      // 5. Set new tokens in cookies
      setAuthCookies(response, refreshResult.tokens.accessToken, refreshResult.tokens.refreshToken, true);

      return addSecurityHeaders(response);
    } catch (error) {
      logger.error('Token refresh error:', error);

      await logSecurityEventSafely(null, 'refresh_token_error', {
        ip,
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      const response = createStandardErrorResponse(
        error,
        'حدث خطأ غير متوقع أثناء معالجة طلب تحديث الرمز. حاول مرة أخرى لاحقاً.'
      );

      clearAuthCookies(response);
      return response;
    }
  });
}
