import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { withAuth, handleApiError } from '@/lib/api-utils';

/**
 * POST /api/auth/change-password
 * 
 * Securely updates the user's password after verifying the current one.
 */
export async function POST(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const { currentPassword, newPassword } = await req.json();

            if (!currentPassword || !newPassword) {
                return NextResponse.json(
                    { error: 'Current and new passwords are required' },
                    { status: 400 }
                );
            }

            const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
            const userAgent = req.headers.get('user-agent') || 'unknown';

            await AuthService.changePassword(userId, currentPassword, newPassword, ip, userAgent);

            return NextResponse.json({
                success: true,
                message: 'Password changed successfully'
            }, { status: 200 });
        } catch (error: any) {
            return NextResponse.json(
                { error: error.message || 'Internal server error' },
                { status: 400 }
            );
        }
    });
}
