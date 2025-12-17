
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState, validateRedirectUri } from '@/lib/oauth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      // Validate OAuth configuration
      if (!oauthConfig.facebook.isConfigured()) {
        const missingFields: string[] = [];
        if (!oauthConfig.facebook.clientId || oauthConfig.facebook.clientId.trim() === '') {
          missingFields.push('FACEBOOK_CLIENT_ID');
        }
        if (!oauthConfig.facebook.clientSecret || oauthConfig.facebook.clientSecret.trim() === '') {
          missingFields.push('FACEBOOK_CLIENT_SECRET');
        }

        logger.error('Facebook OAuth: Missing configuration', { missingFields });

        const errorMessage = missingFields.length > 0
          ? `إعدادات Facebook OAuth غير مكتملة. المتغيرات المفقودة: ${missingFields.join(', ')}. يرجى إضافة هذه المتغيرات إلى ملف .env.local`
          : 'إعدادات Facebook OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.';

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent(errorMessage)}`
        );
      }

      // Validate redirect URI format
      if (!oauthConfig.facebook.redirectUri || oauthConfig.facebook.redirectUri.trim() === '') {
        logger.error('Facebook OAuth: Redirect URI is not configured');
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('عنوان إعادة التوجيه غير مُعد بشكل صحيح.')}`
        );
      }

      const redirectUriValidation = validateRedirectUri(oauthConfig.facebook.redirectUri);
      if (!redirectUriValidation.valid) {
        logger.error('Facebook OAuth: Invalid redirect URI format', {
          redirectUri: oauthConfig.facebook.redirectUri,
          error: redirectUriValidation.error,
        });

        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_redirect_uri&message=${encodeURIComponent(`عنوان إعادة التوجيه غير صحيح: ${redirectUriValidation.error}`)}`
        );
      }

      // Generate a random state for CSRF protection
      const state = generateState();

      // Get redirect parameter from query string
      const { searchParams } = new URL(req.url);
      const redirectParam = searchParams.get('redirect');
      const redirectPath = redirectParam || '/';

      // Build OAuth URL
      const authParams = new URLSearchParams({
        client_id: oauthConfig.facebook.clientId,
        redirect_uri: oauthConfig.facebook.redirectUri,
        response_type: 'code',
        scope: 'email,public_profile',
        state: state,
      });

      const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?${authParams.toString()}`;

      // Store state in a cookie for later verification
      const response = NextResponse.redirect(authUrl);

      // Security: Use centralized secure cookie settings
      response.cookies.set('oauth_state', state, {
        ...getSecureCookieOptions({ maxAge: 600 }), // 10 minutes
      });

      // Store redirect path in cookie
      if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
        response.cookies.set('oauth_redirect', redirectPath, {
          ...getSecureCookieOptions({ maxAge: 600 }),
        });
      }

      return response;
    } catch (error) {
      logger.error('Error initiating Facebook OAuth:', error);
      const errorMessage = error instanceof Error
        ? `حدث خطأ أثناء بدء عملية تسجيل الدخول بفيسبوك: ${error.message}`
        : 'حدث خطأ أثناء بدء عملية تسجيل الدخول بفيسبوك. يرجى المحاولة مرة أخرى.';

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`
      );
    }
  });
}
