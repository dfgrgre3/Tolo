import { NextRequest, NextResponse } from 'next/server';
import { opsWrapper } from '@/lib/middleware/ops-middleware';
import { logger } from '@/lib/logger';
import { authService } from '@/lib/services/auth-service';
import {
    createStandardErrorResponse,
    createSuccessResponse,
    extractRequestMetadata,
    logSecurityEventSafely,
    addSecurityHeaders
} from '@/app/api/auth/_helpers';

export async function GET(request: NextRequest) {
    return opsWrapper(request, async (req) => {
        const { ip, userAgent } = extractRequestMetadata(req);
        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return createStandardErrorResponse(
                new Error('Token missing'),
                'رابط التحقق غير صالح.',
                400
            );
        }

        try {
            await authService.verifyEmail(token, ip, userAgent);

            await logSecurityEventSafely(null, 'email_verified', {
                ip,
                userAgent,
            });

            // Redirect to login with success message
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            return NextResponse.redirect(`${baseUrl}/login?verified=true`);

        } catch (error) {
            logger.error('Email verification error:', error);

            // Redirect to login with error message
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
            return NextResponse.redirect(`${baseUrl}/login?error=verification_failed`);
        }
    });
}
