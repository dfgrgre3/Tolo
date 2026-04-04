import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { SecurityLogger } from '@/services/auth/security-logger';
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
        .min(8, 'Password is too short')
        .max(256, 'Password is too long'),
    rememberMe: z.boolean().optional().default(false),
});

const ipRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 20,
    lockoutMs: 30 * 60 * 1000,
    failClosed: process.env.NODE_ENV === 'production' // Security first for IP-based login limits in prod
});

const credentialRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,
    maxAttempts: 5,
    lockoutMs: 30 * 60 * 1000,
    failClosed: process.env.NODE_ENV === 'production' // Security first for credential-based login limits in prod
});

function buildIpRateLimitKey(ip: string): string {
    return `login:ip:v2:${ip}`;
}

function buildCredentialRateLimitKey(ip: string, email: string): string {
    return `login:credential:v2:${ip}:${email}`;
}

function createRateLimitResponse(remainingMinutes?: number): NextResponse {
    const retryAfterSeconds = Math.max(60, (remainingMinutes || 15) * 60);
    return NextResponse.json(
        { 
            error: 'Too many login attempts. Please try again later.',
            code: 'RATE_LIMITED', 
            retryAfterSeconds 
        },
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

        // Enforce a simple payload size guard to avoid reaching auth logic with huge bodies.
        // (E2E expects large bodies to yield 400/413/500 instead of 401.)
        const rawBody = await req.text();
        const MAX_BODY_CHARS = 8000;
        if (rawBody.length > MAX_BODY_CHARS) {
            return NextResponse.json({ error: 'Payload too large', code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
        }

        let body: unknown;
        try {
            body = JSON.parse(rawBody);
        } catch {
            return NextResponse.json({ error: 'Invalid JSON', code: 'INVALID_JSON' }, { status: 400 });
        }

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            const issues = validation.error.issues;
            const emailIssue = issues.find(i => i.path?.[0] === 'email');
            const passwordIssue = issues.find(i => i.path?.[0] === 'password');

            if (emailIssue) {
                if (emailIssue.code === 'too_big') return NextResponse.json({ error: 'Email is too long', code: 'EMAIL_TOO_LONG' }, { status: 400 });
                return NextResponse.json({ error: 'Invalid email format', code: 'INVALID_EMAIL_FORMAT' }, { status: 400 });
            }
            if (passwordIssue) {
                if (passwordIssue.code === 'too_small') return NextResponse.json({ error: 'Password is too short', code: 'PASSWORD_TOO_SHORT' }, { status: 400 });
                return NextResponse.json({ error: 'Invalid password', code: 'INVALID_PARAMETER' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Invalid parameter', code: 'INVALID_PARAMETER' }, { status: 400 });
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
                { success: false, error: result.error },
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
                success: true,
                user: result.user,
                token: result.accessToken,
                message: 'Logged in successfully',
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        return handleApiError(error);
    }
}
