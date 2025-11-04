
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Google
    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${error}`
      );
    }

    // Verify state parameter to prevent CSRF attacks
    const savedState = request.cookies.get('oauth_state')?.value;
    if (!state || !savedState || !verifyState(state, savedState)) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=invalid_state`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=no_code`
      );
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: oauthConfig.google.clientId,
        client_secret: oauthConfig.google.clientSecret,
        code,
        redirect_uri: oauthConfig.google.redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error`
      );
    }

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();

    // Check if user exists in our database
    let user = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    // If user doesn't exist, create a new one
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          passwordHash: 'oauth_user', // OAuth users don't have a password
        },
      });
    }

    // Generate JWT token
    const token = await generateToken(user.id, user.email, user.name || undefined);

    // Get redirect path from cookie (set during OAuth initiation)
    const redirectPath = request.cookies.get('oauth_redirect')?.value || '/';
    
    // Validate redirect path (security measure)
    const safeRedirectPath = redirectPath.startsWith('/') && !redirectPath.startsWith('//') 
      ? redirectPath 
      : '/';

    // Create response with redirect
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const response = NextResponse.redirect(
      `${baseUrl}${safeRedirectPath}`
    );

    // Set token in cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear state and redirect cookies
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });
    response.cookies.set('oauth_redirect', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=server_error`
    );
  }
}
