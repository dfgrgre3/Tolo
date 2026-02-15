
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { oauthConfig, verifyState, generateToken } from '@/lib/oauth';
import { prisma } from '@/lib/db';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import {
  getSecureCookieOptions,
  withRetry,
  isConnectionError,
  logSecurityEventSafely
} from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { searchParams } = new URL(req.url);
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Handle errors from Facebook
      if (error) {
        logger.error(`Facebook OAuth error: ${error}`);
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${encodeURIComponent(error)}`
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

      // Exchange authorization code for access token with retry
      const tokenData = await withRetry(async () => {
        const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?` +
          `client_id=${oauthConfig.facebook.clientId}&` +
          `client_secret=${oauthConfig.facebook.clientSecret}&` +
          `redirect_uri=${encodeURIComponent(oauthConfig.facebook.redirectUri)}&` +
          `code=${code}`
        );

        const data = await tokenResponse.json();

        if (data.error) {
          throw new Error(data.error.message || 'Token exchange failed');
        }

        return data;
      }, { maxAttempts: 3, delayMs: 1000 });

      // Get user info from Facebook with retry
      const userData = await withRetry(async () => {
        const userResponse = await fetch(
          `https://graph.facebook.com/v18.0/me?` +
          `fields=id,name,email&` +
          `access_token=${tokenData.access_token}`
        );

        const data = await userResponse.json();
        if (data.error) throw new Error(data.error.message || 'User info fetch failed');
        return data;
      }, { maxAttempts: 3 });

      if (!userData.email) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=email_permission_required`
        );
      }

      // Find or create user with retry logic for DB operations
      const user = await withRetry(async () => {
        // Check if user exists
        let existingUser = await prisma.user.findUnique({
          where: { email: userData.email },
        });

        // If user doesn't exist, create a new one
        if (!existingUser) {
          existingUser = await prisma.user.create({
            data: {
              email: userData.email,
              name: userData.name,
              passwordHash: uuidv4(), // Secure random "password" for OAuth users
              emailVerified: true, // Trusted provider
              createdAt: new Date(),
            },
          });

          await logSecurityEventSafely(existingUser.id, 'user_registered_oauth', {
            provider: 'facebook',
            ip: req.headers.get('x-forwarded-for') || undefined
          });
        }

        return existingUser;
      }, {
        maxAttempts: 3,
        shouldRetry: (err) => isConnectionError(err)
      });

      // Generate JWT token
      const token = await generateToken(user.id, user.email, user.name ?? undefined);

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

      await logSecurityEventSafely(user.id, 'login_success_oauth', {
        provider: 'facebook',
        ip: req.headers.get('x-forwarded-for') || undefined
      });

      return response;
    } catch (error) {
      logger.error('Error in Facebook OAuth callback:', error);

      let errorParam = 'server_error';
      if (isConnectionError(error)) {
        errorParam = 'database_error';
      }

      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=${errorParam}`
      );
    }
  });
}
