import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { extractClientInfo, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const resetPasswordSchema = z.object({
    token: z.string().min(1, 'Token is required'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent } = extractClientInfo(req);
        const body = await req.json();
        const validation = resetPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: validation.error.errors[0].message },
                { status: 400 }
            );
        }

        const { token, password } = validation.data;

        const result = await AuthService.resetPassword(token, password, ip, userAgent);

        if (!result.success) {
            return NextResponse.json(
                { error: result.error || 'Failed to reset password' },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { message: 'Password has been reset successfully. You can now log in.' },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
