
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/prisma';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
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
      const savedState = req.cookies.get('oauth_state')?.value;
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
    const token = await generateToken(user.id, user.email, user.name || undefined);

    // Create response with redirect
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`
    );

    // Security: Use centralized secure cookie settings
    // Set token in cookie - use access_token for consistency with login route
    response.cookies.set('access_token', token, {
      ...getSecureCookieOptions({ maxAge: 7 * 24 * 60 * 60 }), // 7 days
    });

    // Clear state cookie
    response.cookies.set('oauth_state', '', {
      ...getSecureCookieOptions({ maxAge: 0 }),
    });

      return response;
    } catch (error) {
      logger.error('Error in Facebook OAuth callback:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=server_error`
      );
    }
  });
}
