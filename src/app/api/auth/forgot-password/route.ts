import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { extractClientInfo, RateLimiter, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const forgotPasswordSchema = z.object({
    email: z.string().email('Invalid email format'),
});

const forgotPasswordRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5, // 5 attempts per 15 minutes
    lockoutMs: 60 * 60 * 1000,
});

export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent, clientId } = extractClientInfo(req);

        // Rate Limiting - check AND record the attempt
        const rateLimitResult = await forgotPasswordRateLimiter.checkRateLimit(clientId);
        if (!rateLimitResult.allowed) {
            console.warn(`[FORGOT_PASSWORD] Rate limited: ${clientId}`);
            return NextResponse.json(
                { error: 'Too many requests. Please try again after an hour.' },
                { status: 429 }
            );
        }

        // Record this attempt in rate limiter
        await forgotPasswordRateLimiter.incrementAttempts(clientId);

        const body = await req.json();
        const validation = forgotPasswordSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        await AuthService.forgotPassword(email, ip, userAgent);

        // Always return success to prevent email enumeration
        return NextResponse.json(
            { message: 'If an account exists with this email, a reset link has been sent.' },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
