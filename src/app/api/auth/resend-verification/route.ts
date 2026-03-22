import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { extractClientInfo, RateLimiter, handleApiError } from '@/lib/api-utils';
import { z } from 'zod';

const resendSchema = z.object({
    email: z.string().email('Invalid email format'),
});

const resendRateLimiter = new RateLimiter({
    windowMs: 60 * 60 * 1000,
    maxAttempts: 3,
    lockoutMs: 24 * 60 * 60 * 1000, // 24 hours lockout for too many resends
});

export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent, clientId } = extractClientInfo(req);

        // Rate Limiting
        const rateLimitResult = await resendRateLimiter.checkRateLimit(clientId);
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again tomorrow.' },
                { status: 429 }
            );
        }

        const body = await req.json();
        const validation = resendSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid email address' },
                { status: 400 }
            );
        }

        const { email } = validation.data;

        await AuthService.resendVerification(email, ip, userAgent);

        return NextResponse.json(
            { message: 'If your email is not verified, a new link has been sent.' },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
