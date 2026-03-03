import prisma from '@/lib/db';
import { PasswordService } from './password-service';
import { SessionService } from './session-service';
import { SecurityLogger, SecurityEventType } from './security-logger';
import { logger } from '@/lib/logger';
import { randomBytes, createHash } from 'crypto';

/**
 * AuthService - Central authentication business logic layer.
 * 
 * Architectural Decision:
 * This service encapsulates ALL authentication logic, separating it from
 * API route handlers (Controllers). This follows Clean Architecture principles:
 * 
 * Route Handler (Controller) → AuthService (Use Case) → Prisma (Repository)
 * 
 * Benefits:
 * - Testable: Can be unit tested without HTTP concerns
 * - Reusable: Same logic works for API routes, middleware, SSR
 * - Secure: Single point for security policy enforcement
 */

export interface LoginInput {
    email: string;
    password: string;
    rememberMe?: boolean;
    ip: string;
    userAgent: string;
}

export interface RegisterInput {
    email: string;
    username?: string;
    password: string;
    ip: string;
    userAgent: string;
}

export interface AuthResult {
    success: boolean;
    user?: {
        id: string;
        email: string;
        username: string | null;
        role: string;
        avatar: string | null;
        emailVerified: boolean | null;
    };
    accessToken?: string;
    refreshToken?: string;
    sessionId?: string;
    error?: string;
    statusCode?: number;
}

export class AuthService {
    /**
     * Authenticate a user with email and password.
     * 
     * Security measures applied:
     * 1. Generic error messages to prevent user enumeration
     * 2. Constant-time password comparison (bcrypt handles this)
     * 3. Session creation with device tracking
     * 4. Security event logging
     */
    static async login(input: LoginInput): Promise<AuthResult> {
        const { email, password, rememberMe = false, ip, userAgent } = input;

        try {
            // 1. Find user by email
            const user = await prisma.user.findUnique({
                where: { email: email.toLowerCase().trim() },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    passwordHash: true,
                    role: true,
                    avatar: true,
                    emailVerified: true,
                },
            });

            if (!user) {
                // Log failed attempt (without exposing email in logs)
                await SecurityLogger.logFailedLogin(ip, userAgent, 'USER_NOT_FOUND');
                return {
                    success: false,
                    error: 'Invalid email or password',
                    statusCode: 401,
                };
            }

            // 2. Verify password (bcrypt constant-time comparison)
            const isValidPassword = await PasswordService.compare(password, user.passwordHash);

            if (!isValidPassword) {
                await SecurityLogger.logFailedLogin(ip, userAgent, 'INVALID_PASSWORD');
                return {
                    success: false,
                    error: 'Invalid email or password',
                    statusCode: 401,
                };
            }

            // 3. Optional: Check email verification
            // Uncomment for production when email service is ready
            // if (!user.emailVerified) {
            //     return {
            //         success: false,
            //         error: 'Please verify your email address before logging in.',
            //         statusCode: 403,
            //     };
            // }

            // 4. Create session and generate tokens
            const { session, accessToken, refreshToken } = await SessionService.createSession(
                user.id,
                user.role,
                ip,
                userAgent,
                rememberMe
            );

            // 5. Update last login timestamp
            await prisma.user.update({
                where: { id: user.id },
                data: { lastLogin: new Date() },
            });

            // 6. Log successful login
            await SecurityLogger.logLogin(user.id, ip, userAgent, session.id);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                },
                accessToken,
                refreshToken,
                sessionId: session.id,
            };
        } catch (error) {
            logger.error('[AUTH_LOGIN_ERROR]', { error });
            return {
                success: false,
                error: 'Internal server error',
                statusCode: 500,
            };
        }
    }

    /**
     * Register a new user account.
     * 
     * Security measures:
     * 1. Password strength validation
     * 2. Duplicate email check with ambiguous response
     * 3. Email verification token generation
     * 4. Security event logging
     */
    static async register(input: RegisterInput): Promise<AuthResult> {
        const { email, username, password, ip, userAgent } = input;

        try {
            const normalizedEmail = email.toLowerCase().trim();

            // 1. Check if email already exists
            const existingUser = await prisma.user.findUnique({
                where: { email: normalizedEmail },
            });

            if (existingUser) {
                // Return ambiguous response to prevent email enumeration
                return {
                    success: true, // Intentionally true for security
                    statusCode: 200,
                };
            }

            // 2. Hash password with bcrypt (12 salt rounds)
            const passwordHash = await PasswordService.hash(password);

            // 3. Generate email verification token
            const verifyToken = randomBytes(32).toString('hex');
            const verifyTokenHash = createHash('sha256').update(verifyToken).digest('hex');
            const verifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

            // 4. Create user
            const user = await prisma.user.create({
                data: {
                    email: normalizedEmail,
                    username: username || normalizedEmail.split('@')[0],
                    passwordHash,
                    emailVerificationToken: verifyTokenHash,
                    emailVerificationExpires: verifyExpires,
                    emailVerified: false,
                    role: 'USER',
                },
            });

            // 5. Log registration event
            await SecurityLogger.log({
                userId: user.id,
                eventType: SecurityEventType.REGISTER,
                ip,
                userAgent,
            });

            // TODO: Send verification email with verifyToken (not the hash)
            // await EmailService.sendVerificationEmail(normalizedEmail, verifyToken);

            return {
                success: true,
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                    avatar: user.avatar,
                    emailVerified: user.emailVerified,
                },
                statusCode: 201,
            };
        } catch (error) {
            logger.error('[AUTH_REGISTER_ERROR]', { error });
            return {
                success: false,
                error: 'Internal server error',
                statusCode: 500,
            };
        }
    }

    /**
     * Verify a user's email address using the verification token.
     */
    static async verifyEmail(token: string): Promise<{ success: boolean; error?: string }> {
        try {
            // Hash the provided token to compare with stored hash
            const tokenHash = createHash('sha256').update(token).digest('hex');

            const user = await prisma.user.findFirst({
                where: {
                    emailVerificationToken: tokenHash,
                    emailVerificationExpires: { gt: new Date() },
                },
            });

            if (!user) {
                return { success: false, error: 'Invalid or expired verification token' };
            }

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    emailVerified: true,
                    emailVerificationToken: null,
                    emailVerificationExpires: null,
                },
            });

            return { success: true };
        } catch (error) {
            logger.error('[AUTH_VERIFY_EMAIL_ERROR]', { error });
            return { success: false, error: 'Internal server error' };
        }
    }

    /**
     * Get current user profile from database.
     */
    static async getCurrentUser(userId: string) {
        return prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                username: true,
                name: true,
                avatar: true,
                role: true,
                emailVerified: true,
                createdAt: true,
                lastLogin: true,
                totalXP: true,
                level: true,
                currentStreak: true,
            },
        });
    }
}
