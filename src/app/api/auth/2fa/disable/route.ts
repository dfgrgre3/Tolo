import { NextRequest, NextResponse } from 'next/server';
import { withAuth, handleApiError } from '@/lib/api-utils';
import { TwoFactorService } from '@/lib/auth/two-factor-service';

/**
 * POST /api/auth/2fa/disable
 * 
 * Disables 2FA for the authenticated user.
 */
export async function POST(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            await TwoFactorService.disable2FA(userId);
            return NextResponse.json({ success: true });
        } catch (error) {
            return handleApiError(error);
        }
    });
}
