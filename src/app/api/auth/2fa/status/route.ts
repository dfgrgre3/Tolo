import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-utils';
import prisma from '@/lib/prisma';

/**
 * GET /api/auth/2fa/status
 * 
 * Returns the current 2FA status for the authenticated user.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: userId },
                select: { 
                    twoFactorEnabled: true,
                    recoveryCodes: true 
                }
            });

            if (!user) {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }

            return NextResponse.json({ 
                enabled: user.twoFactorEnabled,
                hasRecoveryCodes: !!user.recoveryCodes
            });
        } catch (error) {
            console.error('[2FA_STATUS_ERROR]', error);
            return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
    });
}
