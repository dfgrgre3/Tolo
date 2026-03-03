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

/**
 * Login Schema - Validates incoming login data.
 * Minimal validation here since AuthService handles the business logic.
 */
const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional().default(false),
});

/**
 * Login Rate Limiter Configuration.
 * 5 failed attempts per 15 minutes, with 30-minute lockout.
 * This prevents brute-force attacks while remaining user-friendly.
 */
const loginRateLimiter = new RateLimiter({
    windowMs: 15 * 60 * 1000,     // 15-minute window
    maxAttempts: 5,                 // 5 attempts allowed
    lockoutMs: 30 * 60 * 1000,     // 30-minute lockout after exceeding
});

/**
 * POST /api/auth/login
 * 
 * Authenticates a user with email and password.
 * 
 * Security layers:
 * 1. Rate limiting (Redis-backed sliding window)
 * 2. Input validation (Zod schema)
 * 3. Credential verification (bcrypt constant-time compare)
 * 4. Session creation with device tracking
 * 5. HttpOnly cookie storage (no token exposure to JS)
 * 6. Security event logging
 */
export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent, clientId } = extractClientInfo(req);

        // 1. Rate Limiting Check (Redis-backed)
        const rateLimitResult = await loginRateLimiter.checkRateLimit(clientId);

        if (!rateLimitResult.allowed) {
            await SecurityLogger.logRateLimitExceeded(ip, userAgent, '/api/auth/login');

            const retryAfter = rateLimitResult.remainingTime || 15;
            return NextResponse.json(
                { error: 'Too many login attempts. Please try again later.' },
                {
                    status: 429,
                    headers: {
                        'Retry-After': (retryAfter * 60).toString(),
                    },
                }
            );
        }

        // 2. Parse and validate request body
        const body = await req.json();
        const validation = loginSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                { error: 'Invalid request data' },
                { status: 400 }
            );
        }

        const { email, password, rememberMe } = validation.data;

        // 3. Authenticate via AuthService (Clean Architecture)
        const result = await AuthService.login({
            email,
            password,
            rememberMe,
            ip,
            userAgent,
        });

        if (!result.success) {
            // Increment rate limiter on failed attempt
            await loginRateLimiter.incrementAttempts(clientId);

            return NextResponse.json(
                { error: result.error },
                { status: result.statusCode || 401 }
            );
        }

        // 4. Set HttpOnly cookies (tokens never exposed to JavaScript)
        const cookieStore = await cookies();
        const refreshMaxAge = rememberMe ? 7 * 24 * 60 * 60 : 24 * 60 * 60;

        cookieStore.set('access_token', result.accessToken!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60, // 15 minutes
            path: '/',
        });

        cookieStore.set('refresh_token', result.refreshToken!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: refreshMaxAge,
            path: '/',
        });

        cookieStore.set('session_id', result.sessionId!, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: refreshMaxAge,
            path: '/',
        });

        // 5. Reset rate limiter on successful login
        await loginRateLimiter.resetAttempts(clientId);

        // 6. Return user data (no tokens in response body - they're in cookies)
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
