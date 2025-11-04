
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState } from '@/lib/oauth';

export async function GET(request: NextRequest) {
  try {
    // Generate a random state for CSRF protection
    const state = generateState();
    
    // Get redirect parameter from query string to preserve after OAuth
    const { searchParams } = new URL(request.url);
    const redirectParam = searchParams.get('redirect');
    const redirectPath = redirectParam || '/';

    // Store state in a cookie for later verification
    const response = NextResponse.redirect(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${oauthConfig.google.clientId}&` +
      `redirect_uri=${encodeURIComponent(oauthConfig.google.redirectUri)}&` +
      `response_type=code&` +
      `scope=openid email profile&` +
      `state=${state}`
    );

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
