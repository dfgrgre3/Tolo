
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState, validateRedirectUri } from '@/lib/oauth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '../_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
    // Validate OAuth configuration
    if (!oauthConfig.google.isConfigured()) {
      const missingFields: string[] = [];
      if (!oauthConfig.google.clientId || oauthConfig.google.clientId.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_ID');
      }
      if (!oauthConfig.google.clientSecret || oauthConfig.google.clientSecret.trim() === '') {
        missingFields.push('GOOGLE_CLIENT_SECRET');
      }
      
      logger.error('Google OAuth: Missing configuration', { missingFields });
      
      const errorMessage = missingFields.length > 0
        ? `إعدادات Google OAuth غير مكتملة. المتغيرات المفقودة: ${missingFields.join(', ')}. يرجى إضافة هذه المتغيرات إلى ملف .env.local`
        : 'إعدادات Google OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.';
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Validate redirect URI format and configuration
    if (!oauthConfig.google.redirectUri || oauthConfig.google.redirectUri.trim() === '') {
      logger.error('Google OAuth: Redirect URI is not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('عنوان إعادة التوجيه غير مُعد بشكل صحيح.')}`
      );
    }

    // Validate redirect URI format (catches common mistakes)
    const redirectUriValidation = validateRedirectUri(oauthConfig.google.redirectUri);
    if (!redirectUriValidation.valid) {
      logger.error('Google OAuth: Invalid redirect URI format', {
        redirectUri: oauthConfig.google.redirectUri,
        error: redirectUriValidation.error,
        baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      });
      
      const errorMessage = `عنوان إعادة التوجيه غير صحيح: ${redirectUriValidation.error}

⚠️ يجب أن يكون العنوان بالضبط:
${oauthConfig.google.redirectUri}

📝 خطوات الإصلاح:
1. افتح Google Cloud Console: https://console.cloud.google.com/
2. انتقل إلى: APIs & Services → Credentials
3. اختر OAuth 2.0 Client ID الخاص بك
4. أضف هذا العنوان بالضبط في "Authorized redirect URIs":
   ${oauthConfig.google.redirectUri}
5. تأكد من التطابق التام: نفس البروتوكول (http/https)، نفس النطاق، نفس المنفذ، نفس المسار

💡 نصيحة: استخدم الأمر "npm run check:oauth" للتحقق من الإعدادات.`;
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_redirect_uri&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Generate a random state for CSRF protection
    const state = generateState();
    
      // Get redirect parameter from query string to preserve after OAuth
      const { searchParams } = new URL(req.url);
    const redirectParam = searchParams.get('redirect');
    const redirectPath = redirectParam || '/';

    // Log configuration for debugging (with redirect URI validation reminder)
    logger.info('Google OAuth Configuration:', {
      clientId: oauthConfig.google.clientId.substring(0, 20) + '...',
      redirectUri: oauthConfig.google.redirectUri,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
      redirectUriValid: redirectUriValidation.valid,
      note: 'Make sure this redirect_uri matches exactly in Google Cloud Console',
    });

    // Build OAuth URL with proper encoding
    // redirect_uri is the complete URI stored in oauthConfig (e.g., http://localhost:3000/api/auth/google/callback)
    // This must match exactly what is configured in Google Cloud Console
    const authParams = new URLSearchParams({
      client_id: oauthConfig.google.clientId,
      redirect_uri: oauthConfig.google.redirectUri, // Complete redirect URI from oauthConfig
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${authParams.toString()}`;
    logger.info('Google OAuth URL:', authUrl.replace(/client_secret=[^&]+/g, 'client_secret=***'));

    // Store state in a cookie for later verification
    const response = NextResponse.redirect(authUrl);

    // Security: Use centralized secure cookie settings
    // Set state cookie
    response.cookies.set('oauth_state', state, {
      ...getSecureCookieOptions({ maxAge: 600 }), // 10 minutes
    });
    
    // Store redirect path in cookie (validate it's a relative path)
    if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      response.cookies.set('oauth_redirect', redirectPath, {
        ...getSecureCookieOptions({ maxAge: 600 }), // 10 minutes
      });
    }

      return response;
    } catch (error) {
      logger.error('Error initiating Google OAuth:', error);
      const errorMessage = error instanceof Error 
        ? `حدث خطأ أثناء بدء عملية تسجيل الدخول بجوجل: ${error.message}. يرجى المحاولة مرة أخرى أو التحقق من الإعدادات باستخدام "npm run check:oauth".`
        : 'حدث خطأ أثناء بدء عملية تسجيل الدخول بجوجل. يرجى المحاولة مرة أخرى.';
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed&message=${encodeURIComponent(errorMessage)}`
      );
    }
  });
}
