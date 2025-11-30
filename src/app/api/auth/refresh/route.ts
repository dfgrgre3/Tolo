import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/auth-service';
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
      // Get refresh token from cookie or request body
      let refreshToken = req.cookies.get('refresh_token')?.value;
      
      if (!refreshToken) {
        const bodyResult = await parseRequestBody<{
          refreshToken?: string;
        }>(req, {
          maxSize: 512,
          required: false,
        });

        if (bodyResult.success && bodyResult.data.refreshToken) {
          refreshToken = bodyResult.data.refreshToken;
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
      
      // Clear refresh token cookie
      clearAuthCookies(response);
      
      return response;
    }

    // Verify refresh token using authService
    let tokens;
    try {
      tokens = await authService.refreshAccessToken(refreshToken, userAgent, ip);
    } catch (tokenError) {
      logger.error('Token refresh error:', tokenError);
      
      // Log failed refresh attempt
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
      
      // Clear refresh token cookie
      clearAuthCookies(response);
      
      return response;
    }
    
    if (!tokens.isValid || !tokens.accessToken || !tokens.refreshToken) {
      await logSecurityEventSafely(null, 'refresh_token_invalid', {
        ip,
        userAgent,
      });

      const response = createStandardErrorResponse(
        new Error('INVALID_OR_EXPIRED_REFRESH_TOKEN'),
        'رمز التحديث غير صالح أو منتهي الصلاحية.',
        401
      );
      
      // Clear refresh token cookie
      clearAuthCookies(response);
      
      return response;
    }

    // Log successful token refresh
    try {
      const verification = await authService.verifyTokenFromInput(tokens.accessToken);
      if (verification.isValid && verification.user) {
        await logSecurityEventSafely(verification.user.id, 'token_refreshed', {
          ip,
          userAgent,
        });
      }
    } catch (logError) {
      // Don't fail if logging fails
      logger.warn('Failed to log token refresh event:', logError);
    }

    const response = NextResponse.json({
      message: 'تم تحديث الرمز بنجاح.',
      token: tokens.accessToken,
      success: true,
    });

    // Set new tokens in cookies
    setAuthCookies(response, tokens.accessToken, tokens.refreshToken, true);

    // Add security headers
    return addSecurityHeaders(response);
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    // Log security event safely
    await logSecurityEventSafely(null, 'refresh_token_error', {
      ip,
      userAgent,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    const response = createStandardErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب تحديث الرمز. حاول مرة أخرى لاحقاً.'
    );
    
    // Clear cookies on error
    clearAuthCookies(response);
    
    return response;
  }
  });
}