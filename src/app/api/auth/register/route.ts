import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth/auth-service';
import { z } from 'zod';
import { cookies } from 'next/headers';
import {
    extractClientInfo,
    RateLimiter,
    handleApiError,
} from '@/lib/api-utils';
import { SecurityLogger } from '@/services/auth/security-logger';

/**
 * Registration Schema with strong password policy.
 * 
 * Password Requirements:
 * - Minimum 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 number
 * - At least 1 special character
 * - Must match confirmPassword
 */
const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string()
        .min(8, 'Password must be at least 8 characters')
        .refine((val) => /[A-Z]/.test(val), 'Must contain an uppercase letter')
        .refine((val) => /[a-z]/.test(val), 'Must contain a lowercase letter')
        .refine((val) => /[0-9]/.test(val), 'Must contain a number')
        .refine((val) => /[!@#$%^&*(),.?":{}|<>]/.test(val), 'Must contain a special character'),
    confirmPassword: z.string().optional(),
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    role: z.enum(['STUDENT', 'TEACHER']).default('STUDENT'),
    country: z.string().optional(),
    dateOfBirth: z.string().datetime().optional().nullable(),
    gender: z.string().optional(),
    phone: z.string().optional(),
    alternativePhone: z.string().optional(),
    gradeLevel: z.string().optional(),
    educationType: z.string().optional(),
    section: z.string().optional(),
    interestedSubjects: z.array(z.string()).optional(),
    studyGoal: z.string().optional(),
    subjectsTaught: z.array(z.string()).optional(),
    classesTaught: z.array(z.string()).optional(),
    experienceYears: z.string().optional(),
}).refine((data) => {
    // Only validate confirmPassword if it's provided
    if (data.confirmPassword !== undefined) {
        return data.password === data.confirmPassword;
    }
    return true;
}, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

/**
 * Registration Rate Limiter.
 * More restrictive than login: 3 attempts per 30 minutes.
 * Prevents mass account creation (spam/abuse).
 */
const registerRateLimiter = new RateLimiter({
    windowMs: 30 * 60 * 1000,     // 30-minute window
    maxAttempts: 3,                 // 3 registrations allowed
    lockoutMs: 60 * 60 * 1000,     // 1-hour lockout
});

/**
 * POST /api/auth/register
 * 
 * Registers a new user account.
 * 
 * Security measures:
 * 1. Rate limiting to prevent mass account creation
 * 2. Strong password validation
 * 3. Ambiguous response for duplicate emails (prevents enumeration)
 * 4. Email verification token generation
 */
export async function POST(req: NextRequest) {
    try {
        const { ip, userAgent, clientId, location } = extractClientInfo(req);

        // 1. Rate limiting
        const rateLimitResult = await registerRateLimiter.checkRateLimit(`register:${clientId}`);

        if (!rateLimitResult.allowed) {
            await SecurityLogger.logRateLimitExceeded(ip, userAgent, '/api/auth/register');
            return NextResponse.json(
                { error: 'Too many registration attempts. Please try again later.' },
                { status: 429 }
            );
        }

        // 2. Parse and validate request body
        const body = await req.json();
        const validation = registerSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json(
                {
                    error: 'Invalid data',
                    details: validation.error.errors.map(e => e.message),
                },
                { status: 400 }
            );
        }

        const {
            email, password, username, role, country, dateOfBirth, gender,
            phone, alternativePhone, gradeLevel, educationType, section,
            interestedSubjects, studyGoal, subjectsTaught, classesTaught, experienceYears
        } = validation.data;

        // 3. Register via AuthService
        const result = await AuthService.register({
            email,
            username,
            password,
            role,
            country,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender,
            phone,
            alternativePhone,
            gradeLevel,
            educationType,
            section,
            interestedSubjects,
            studyGoal,
            subjectsTaught,
            classesTaught,
            experienceYears,
            ip,
            userAgent,
            location,
        });

        if (!result.success) {
            return NextResponse.json(
                { error: result.error },
                { status: result.statusCode || 500 }
            );
        }

        // Increment rate limiter
        await registerRateLimiter.incrementAttempts(`register:${clientId}`);

        // For brand-new accounts, attempt immediate session creation to avoid
        // forcing an extra login step on the client.
        const isNewAccount = result.statusCode === 201 && !!result.user;
        if (isNewAccount) {
            const loginResult = await AuthService.login({
                email,
                password,
                rememberMe: false,
                ip,
                userAgent,
                location,
            });

            if (loginResult.success && loginResult.accessToken && loginResult.refreshToken && loginResult.sessionId) {
                const cookieStore = await cookies();
                const isProduction = process.env.NODE_ENV === 'production';
                const refreshMaxAge = 7 * 24 * 60 * 60; // 7 days default

                cookieStore.set('access_token', loginResult.accessToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: 15 * 60,
                    path: '/',
                });

                cookieStore.set('refresh_token', loginResult.refreshToken, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: refreshMaxAge,
                    path: '/',
                });

                cookieStore.set('session_id', loginResult.sessionId, {
                    httpOnly: true,
                    secure: isProduction,
                    sameSite: 'lax',
                    maxAge: refreshMaxAge,
                    path: '/',
                });

                return NextResponse.json(
                    {
                        success: true,
                        autoLoggedIn: true,
                        user: loginResult.user,
                        message: 'Registration successful! You are now signed in.',
                    },
                    { status: 201 }
                );
            }
        }

        // 4. Return success (ambiguous for duplicate emails)
        return NextResponse.json(
            {
                success: true,
                autoLoggedIn: false,
                user: result.user ?? null,
                message: 'Registration successful! Please check your email to verify your account.',
            },
            { status: result.statusCode || 201 }
        );
    } catch (error) {
        return handleApiError(error);
    }
}
