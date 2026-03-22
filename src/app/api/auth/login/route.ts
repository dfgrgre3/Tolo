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
        { code: 'RATE_LIMITED', retryAfterSeconds },
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
            return NextResponse.json({ code: 'PAYLOAD_TOO_LARGE' }, { status: 413 });
        }

        let body: any;
        try {
            body = rawBody ? JSON.parse(rawBody) : {};
        } catch {
            return NextResponse.json({ code: 'INVALID_JSON' }, { status: 400 });
        }

        const emailRaw = typeof body?.email === 'string' ? body.email : '';
        const passwordRaw = typeof body?.password === 'string' ? body.password : '';

        if (!emailRaw) {
            return NextResponse.json({ code: 'MISSING_EMAIL' }, { status: 400 });
        }

        if (!passwordRaw) {
            return NextResponse.json({ code: 'MISSING_PASSWORD' }, { status: 400 });
        }

        // Keep explicit length checks aligned with E2E expectations.
        if (emailRaw.length > 254) {
            return NextResponse.json({ code: 'EMAIL_TOO_LONG' }, { status: 400 });
        }

        const validation = loginSchema.safeParse(body);
        if (!validation.success) {
            // Map Zod failures to expected codes.
            const issues = validation.error.issues || [];
            const emailIssue = issues.find(i => i.path?.[0] === 'email');
            const passwordIssue = issues.find(i => i.path?.[0] === 'password');

            if (emailIssue) {
                return NextResponse.json({ code: 'INVALID_EMAIL_FORMAT' }, { status: 400 });
            }
            if (passwordIssue) {
                const passwordLen = passwordRaw.length;
                if (passwordLen < 8) return NextResponse.json({ code: 'PASSWORD_TOO_SHORT' }, { status: 400 });
                return NextResponse.json({ code: 'INVALID_PARAMETER' }, { status: 400 });
            }

            return NextResponse.json({ code: 'INVALID_PARAMETER' }, { status: 400 });
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
    } catch (error) {
        return handleApiError(error);
    }
}
