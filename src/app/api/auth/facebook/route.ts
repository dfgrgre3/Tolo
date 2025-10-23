
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState } from '@/lib/oauth';

export async function GET(request: NextRequest) {
  try {
    // Generate a random state for CSRF protection
    const state = generateState();

    // Store state in a cookie for later verification
    const response = NextResponse.redirect(
      `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${oauthConfig.facebook.clientId}&` +
      `redirect_uri=${encodeURIComponent(oauthConfig.facebook.redirectUri)}&` +
      `response_type=code&` +
      `scope=email,public_profile&` +
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

    return response;
  } catch (error) {
    console.error('Error initiating Facebook OAuth:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed`
    );
  }
}
