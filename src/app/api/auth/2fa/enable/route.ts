import { NextRequest, NextResponse } from 'next/server';
import { withAuth, handleApiError } from '@/lib/api-utils';
import { TwoFactorService } from '@/services/auth/two-factor-service';

import { extractClientInfo } from '@/lib/api-utils';

/**
 * POST /api/auth/2fa/enable
 * 
 * Verifies the first token and enables 2FA for the user.
 */
export async function POST(req: NextRequest) {
  return withAuth(req, async ({ userId }) => {
    try {
      const { ip: _ip, userAgent: _userAgent } = extractClientInfo(req);
      const body = await req.json();
      const { secret, token } = body;

      if (!secret || !token) {
        return NextResponse.json({ error: 'Secret and token are required' }, { status: 400 });
      }

      const success = await TwoFactorService.enable2FA(userId, secret, token);

      if (!success) {
        return NextResponse.json({ error: 'Invalid verification token' }, { status: 400 });
      }

      // TODO: Log 2FA enabled event
      // await SecurityLogger.logEvent(userId, '2FA_ENABLED', ip, userAgent);

      return NextResponse.json({ success: true });
    } catch (error) {
      return handleApiError(error);
    }
  });
}