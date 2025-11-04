
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState } from '@/lib/oauth';

export async function GET(request: NextRequest) {
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
      
      console.error('Google OAuth: Missing configuration', { missingFields });
      
      const errorMessage = missingFields.length > 0
        ? `إعدادات Google OAuth غير مكتملة. المتغيرات المفقودة: ${missingFields.join(', ')}. يرجى إضافة هذه المتغيرات إلى ملف .env.local`
        : 'إعدادات Google OAuth غير مكتملة. يرجى التحقق من إعدادات الخادم.';
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent(errorMessage)}`
      );
    }

    // Validate redirect URI
    if (!oauthConfig.google.redirectUri || oauthConfig.google.redirectUri.trim() === '') {
      console.error('Google OAuth: Redirect URI is not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_not_configured&message=${encodeURIComponent('عنوان إعادة التوجيه غير مُعد بشكل صحيح.')}`
      );
    }

    // Generate a random state for CSRF protection
    const state = generateState();
    
    // Get redirect parameter from query string to preserve after OAuth
    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect');
    const redirectPath = redirectParam || '/';

    // Log configuration for debugging
    console.log('Google OAuth Configuration:', {
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
    console.log('Google OAuth URL:', authUrl.replace(/client_secret=[^&]+/g, 'client_secret=***'));

    // Store state in a cookie for later verification
    const response = NextResponse.redirect(authUrl);

    // Set state cookie
    response.cookies.set('oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    });
    
    // Store redirect path in cookie (validate it's a relative path)
    if (redirectPath.startsWith('/') && !redirectPath.startsWith('//')) {
      response.cookies.set('oauth_redirect', redirectPath, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
      });
    }

    return response;
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed`
    );
  }
}
