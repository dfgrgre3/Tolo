import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { handleApiError } from '@/lib/api-utils';

/**
 * GET /api/auth/verify-email?token=xxx
 * 
 * Verifies a user's email address using the token sent via email.
 * The token in the URL is hashed and compared with the stored hash (sha256).
 * 
 * Security: The raw token is never stored in the database, only its hash.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { error: 'Verification token is required' },
                { status: 400 }
            );
        }

        const result = await AuthService.verifyEmail(token);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Email verified successfully! You can now log in.' },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
