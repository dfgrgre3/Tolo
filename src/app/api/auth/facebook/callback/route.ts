
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle errors from Facebook
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
    const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${oauthConfig.facebook.clientId}&` +
      `client_secret=${oauthConfig.facebook.clientSecret}&` +
      `redirect_uri=${encodeURIComponent(oauthConfig.facebook.redirectUri)}&` +
      `code=${code}`
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=token_error`
      );
    }

    // Get user info from Facebook
    const userResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?` +
      `fields=id,name,email&` +
      `access_token=${tokenData.access_token}`
    );

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
    const token = generateToken(user.id, user.email, user.name || undefined);

    // Create response with redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`
    );

    // Set token in cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Clear state cookie
    response.cookies.set('oauth_state', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Error in Facebook OAuth callback:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=server_error`
    );
  }
}
