
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState } from '@/lib/oauth';
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

    // Validate redirect URI
    if (!oauthConfig.google.redirectUri || oauthConfig.google.redirectUri.trim() === '') {
      logger.error('Google OAuth: Redirect URI is not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('عنوان إعادة التوجيه غير مُعد بشكل صحيح.')}`
      );
    }

    // Generate a random state for CSRF protection
    const state = generateState();
    
      // Get redirect parameter from query string to preserve after OAuth
      const { searchParams } = new URL(req.url);
    const redirectParam = searchParams.get('redirect');
    const redirectPath = redirectParam || '/';

    // Log configuration for debugging
    logger.info('Google OAuth Configuration:', {
      clientId: oauthConfig.google.clientId.substring(0, 20) + '...',
      redirectUri: oauthConfig.google.redirectUri,
      baseUrl: process.env.NEXT_PUBLIC_BASE_URL,
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
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed`
      );
    }
  });
}
