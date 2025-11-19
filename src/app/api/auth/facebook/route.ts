
import { NextRequest, NextResponse } from 'next/server';
import { oauthConfig, generateState } from '@/lib/oauth';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';
import { getSecureCookieOptions } from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
  return opsWrapper(request, async (req) => {
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

    // Security: Use centralized secure cookie settings
    // Set state cookie
    response.cookies.set('oauth_state', state, {
      ...getSecureCookieOptions({ maxAge: 600 }), // 10 minutes
    });

      return response;
    } catch (error) {
      logger.error('Error initiating Facebook OAuth:', error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/login?error=oauth_failed`
      );
    }
  });
}
