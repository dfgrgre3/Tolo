import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/lib/auth-service';
import { opsWrapper } from "@/lib/middleware/ops-middleware";
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  return opsWrapper(request, async (req) => {
    try {
      const { enable, userId } = await req.json();

      if (!userId) {
        return NextResponse.json(
          { error: 'User ID is required' },
          { status: 400 }
        );
      }

      // Verify authorization
      const verification = await authService.verifyTokenFromRequest(req);
      if (!verification.isValid || !verification.user || verification.user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!enable) {
        await authService.disableTwoFactor(userId);
        return NextResponse.json({
          message: 'Two-factor authentication disabled successfully',
          user: {
            id: userId,
            twoFactorEnabled: false,
          },
        });
      }

      // If enabling, we should not do it here directly without verification.
      // The client should use /api/auth/two-factor/totp/setup and /verify
      return NextResponse.json(
        { error: 'To enable 2FA, please use the TOTP setup flow' },
        { status: 400 }
      );

    } catch (error) {
      logger.error('Error updating two-factor authentication:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
  });
}