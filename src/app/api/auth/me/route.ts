import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { withAuth, handleApiError } from '@/lib/api-utils';

/**
 * GET /api/auth/me
 * 
 * Returns the currently authenticated user's profile.
 * Uses the withAuth wrapper which extracts userId from middleware-injected headers.
 * 
 * This endpoint is called by the AuthContext on mount to restore user state.
 */
export async function GET(req: NextRequest) {
    return withAuth(req, async ({ userId }) => {
        try {
            const user = await AuthService.getCurrentUser(userId);

            if (!user) {
                return NextResponse.json(
                    { error: 'User not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({ user }, { status: 200 });
        } catch (error) {
            return handleApiError(error);
        }
    });
}
