import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import { TwoFactorService } from '@/services/auth/two-factor-service';
import prisma from '@/lib/prisma';

/**
 * GET /api/auth/2fa/setup
 * 
 * Generates a new 2FA secret and QR code for the authenticated user.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { email: true, twoFactorEnabled: true }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            if (user.twoFactorEnabled) {
                return NextResponse.json({ error: '2FA is already enabled' }, { status: 400 });
            }

            const { secret, otpauth } = TwoFactorService.generateSecret(user.email);
            const qrCode = await TwoFactorService.generateQRCode(otpauth);

            return NextResponse.json({ secret, qrCode });
        } catch (error) {
            console.error('[2FA_SETUP_ERROR]', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    });
}
