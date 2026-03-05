import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth/auth-service';
import { SecurityLogger } from '@/lib/auth/security-logger';
import { z } from 'zod';
import { cookies } from 'next/headers';
import {
    extractClientInfo,
    RateLimiter,
    handleApiError,
} from '@/lib/api-utils';

const loginSchema = z.object({
    email: z
        .string()
        .trim()
        .email('Invalid email format')
        .transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(1, 'Password is required')
        .max(256, 'Password is too long'),
    rememberMe: z.boolean().optional().default(false),
});

const ipRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 20,
    lockoutMs: 30 * 60 * 1000,
});

const credentialRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    lockoutMs: 30 * 60 * 1000,
});

function buildIpRateLimitKey(ip: string): string {
    return `login:ip:${ip}`;
}

function buildCredentialRateLimitKey(ip: string, email: string): string {
    return `login:credential:${ip}:${email}`;
}

function createRateLimitResponse(remainingMinutes?: number): NextResponse {
    const retryAfterSeconds = Math.max(60, (remainingMinutes || 15) * 60);
    return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        {
            status: 429,
            headers: {
                'Retry-After': retryAfterSeconds.toString(),
            },
        }
    );
}

export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent, location } = extractClientInfo(req);
        const ipRateLimitKey = buildIpRateLimitKey(ip);

        const ipLimitResult = await ipRateLimiter.checkRateLimit(ipRateLimitKey);
        if (!ipLimitResult.allowed) {
            await SecurityLogger.logRateLimitExceeded(ip, userAgent, '/api/auth/login');
            return createRateLimitResponse(ipLimitResult.remainingTime);
        }

        const body = await req.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        const { email, password, rememberMe } = validation.data;
        const credentialRateLimitKey = buildCredentialRateLimitKey(ip, email);

        const credentialLimitResult = await credentialRateLimiter.checkRateLimit(credentialRateLimitKey);
        if (!credentialLimitResult.allowed) {
            await SecurityLogger.logRateLimitExceeded(ip, userAgent, '/api/auth/login');
            return createRateLimitResponse(credentialLimitResult.remainingTime);
        }

        const result = await AuthService.login({
            email,
            password,
            rememberMe,
            ip,
            userAgent,
            location,
        });

        if (!result.success) {
            await Promise.all([
                ipRateLimiter.incrementAttempts(ipRateLimitKey),
                credentialRateLimiter.incrementAttempts(credentialRateLimitKey),
            ]);

            return NextResponse.json(
                { error: result.error },
                { status: result.statusCode || 401 }
            );
        }

        const cookieStore = await cookies();
        // rememberMe=true → 30 days, default → 7 days (ensures sessions survive browser restarts)
        const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60;
        const isProduction = process.env.NODE_ENV === 'production';

        cookieStore.set('access_token', result.accessToken!, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: 15 * 60,
            path: '/',
        });

        cookieStore.set('refresh_token', result.refreshToken!, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: refreshMaxAge,
            path: '/',
        });

        cookieStore.set('session_id', result.sessionId!, {
            httpOnly: true,
            secure: isProduction,
            sameSite: 'lax',
            maxAge: refreshMaxAge,
            path: '/',
        });

        await Promise.all([
            ipRateLimiter.resetAttempts(ipRateLimitKey),
            credentialRateLimiter.resetAttempts(credentialRateLimitKey),
        ]);

        return NextResponse.json(
            {
                user: result.user,
                message: 'Logged in successfully',
            },
            { status: 200 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
