import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authService } from '@/lib/auth-service';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { setAuthCookies, clearAuthCookies, createErrorResponse, isConnectionError } from '../_helpers';
import { logger } from '@/lib/logger';

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'رمز التحديث مطلوب').optional(),
});

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
  const ip = authService.getClientIP(req);
  const userAgent = authService.getUserAgent(req);

  try {
    // Get refresh token from cookie or request body
    let refreshToken = req.cookies.get('refresh_token')?.value;
    
    if (!refreshToken) {
      try {
        const body = await req.json().catch(() => ({}));
        const parsed = refreshTokenSchema.safeParse(body);
        
        if (parsed.success && parsed.data.refreshToken) {
          refreshToken = parsed.data.refreshToken;
        }
      } catch {
        // No body or invalid JSON
      }
    }

    if (!refreshToken) {
      await authService.logSecurityEvent(null, 'refresh_token_missing', ip, {
        userAgent,
      });

      const response = NextResponse.json(
        {
          error: 'رمز التحديث مطلوب.',
          code: 'REFRESH_TOKEN_MISSING',
        },
        { status: 400 }
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
      await authService.logSecurityEvent(null, 'refresh_token_error', ip, {
        userAgent,
        error: tokenError instanceof Error ? tokenError.message : 'Unknown error',
      });

      const response = NextResponse.json(
        {
          error: 'رمز التحديث غير صالح أو منتهي الصلاحية.',
          code: 'INVALID_OR_EXPIRED_REFRESH_TOKEN',
        },
        { status: 401 }
      );
      
      // Clear refresh token cookie
      clearAuthCookies(response);
      
      return response;
    }
    
    if (!tokens.isValid || !tokens.accessToken || !tokens.refreshToken) {
      await authService.logSecurityEvent(null, 'refresh_token_invalid', ip, {
        userAgent,
      });

      const response = NextResponse.json(
        {
          error: 'رمز التحديث غير صالح أو منتهي الصلاحية.',
          code: 'INVALID_OR_EXPIRED_REFRESH_TOKEN',
        },
        { status: 401 }
      );
      
      // Clear refresh token cookie
      clearAuthCookies(response);
      
      return response;
    }

    // Log successful token refresh
    try {
      const verification = await authService.verifyToken(tokens.accessToken);
      if (verification.isValid && verification.user) {
        await authService.logSecurityEvent(verification.user.id, 'token_refreshed', ip, {
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

    return response;
  } catch (error) {
    logger.error('Token refresh error:', error);
    
    // Log security event safely
    try {
      await authService.logSecurityEvent(null, 'refresh_token_error', ip, {
        userAgent,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } catch (logError) {
      logger.error('Failed to log security event:', logError);
    }

    const response = createErrorResponse(
      error,
      'حدث خطأ غير متوقع أثناء معالجة طلب تحديث الرمز. حاول مرة أخرى لاحقاً.'
    );
    
    // Clear cookies on error
    clearAuthCookies(response);
    
    return response;
  }
  });
}