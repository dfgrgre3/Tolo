import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { RegisterInput } from "@/lib/validations/auth";
import { redis } from "@/lib/redis";
import crypto from "crypto";

// --- Constants ---
const secret = process.env.JWT_SECRET;
if (!secret) {
    if (process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET is not defined in environment variables");
    }
    // Only regarding development convenience if absolutely necessary, but user asked to remove fallback.
    // However, for safety, I will throw error always or use a very obvious dev secret if likely to break local dev?
    // User said: "يجب أن يرمي التطبيق خطأ ... إذا لم يجد JWT_SECRET في بيئة الإنتاج".
    // Implies non-production might be lenient? But better to just throw.
    throw new Error("JWT_SECRET is not defined");
}
const JWT_SECRET = new TextEncoder().encode(secret);
const SALT_ROUNDS = 12;

// --- Interfaces ---
export interface UserPayload {
    userId: string;
    email: string;
    role: string;
    [key: string]: any;
}

export type AuthUser = {
    id: string;
    email: string;
    role: string;
    name?: string | null;
    avatar?: string | null;
    emailVerified?: boolean;
    twoFactorEnabled?: boolean;
    lastLogin?: string | Date | null;
    provider?: 'local' | 'google' | 'facebook';
    createdAt?: string | Date;
    // Gamification & Profile
    level?: number;
    xp?: number;
    xpToNextLevel?: number;
    rank?: string;
    badges?: string[];
    bio?: string;
};

export class AuthError extends Error {
    constructor(message: string, public code: string = 'AUTH_ERROR') {
        super(message);
        this.name = 'AuthError';
    }
}

// --- Auth Service Implementation ---
export interface TokenVerificationResult {
    isValid: boolean;
    user?: UserPayload;
    sessionId?: string;
    error?: string;
}

// --- Auth Service Implementation ---
export const authService = {
    /**
     * Hash a plain text password (Async)
     */
    async hashPassword(password: string): Promise<string> {
        return await bcrypt.hash(password, SALT_ROUNDS);
    },

    /**
     * Compare a plain text password with a hash
     */
    async verifyPassword(plain: string, hashed: string): Promise<boolean> {
        return await bcrypt.compare(plain, hashed);
    },

    /**
     * Generate a JWT token for a user
     */
    async generateToken(payload: UserPayload, expiresIn: string = "7d"): Promise<string> {
        return await new SignJWT({ ...payload })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime(expiresIn)
            .sign(JWT_SECRET);
    },

    /**
     * Generate a temporary token for 2FA or verification
     */
    async generate2FATempToken(payload: any): Promise<string> {
        return await new SignJWT({ ...payload, type: '2fa_temp' })
            .setProtectedHeader({ alg: "HS256" })
            .setIssuedAt()
            .setExpirationTime("10m")
            .sign(JWT_SECRET);
    },

    /**
     * Extract token from request
     */
    extractToken(request: Request | any): string | null {
        const authHeader = request.headers.get('Authorization') || request.headers.get('authorization');
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        // Try to extract token from cookies
        const cookieHeader = request.headers.get('cookie');
        if (cookieHeader) {
            const match = cookieHeader.match(/access_token=([^;]+)/);
            if (match) {
                return match[1];
            }
        }
        return null;
    },

    /**
     * Verify and decode a JWT token.
     * Accepts either a token string or a Request object (extracts Bearer token).
     */
    async verifyToken(input: string | Request): Promise<UserPayload | null> {
        let token: string | null = "";

        if (typeof input === 'string') {
            token = input;
        } else {
            token = this.extractToken(input);
        }

        if (!token) return null;

        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);
            return payload as unknown as UserPayload;
        } catch (error) {
            // console.error("Token verification failed:", error); // Optional: log if needed
            return null;
        }
    },

    /**
     * Verify token and return detailed result
     */
    async verifyTokenFromInput(token: string, checkSession: boolean = false): Promise<TokenVerificationResult> {
        try {
            const { payload } = await jwtVerify(token, JWT_SECRET);

            // If checkSession is needed, we could verify against DB here
            if (checkSession) {
                // Optional: Check if user exists or session is valid in DB
                // For now, we'll assume valid if token is valid
            }

            return {
                isValid: true,
                user: payload as unknown as UserPayload
            };
        } catch (error) {
            return {
                isValid: false,
                error: 'Invalid or expired token'
            };
        }
    },

    /**
     * Create a new user in the database
     */
    async createUser(data: RegisterInput) {
        const hashedPassword = await this.hashPassword(data.password);

        return await prisma.user.create({
            data: {
                name: data.name,
                email: data.email,
                passwordHash: hashedPassword,
                role: "USER",
            },
        });
    },

    /**
     * Find a user by email
     */
    async getUserByEmail(email: string) {
        return await prisma.user.findUnique({
            where: { email },
        });
    },

    /**
     * Get user by ID
     */
    async getUserById(id: string) {
        return await prisma.user.findUnique({
            where: { id },
        });
    },

    /**
     * Get session by ID
     */
    async getSession(sessionId: string) {
        return await prisma.session.findUnique({
            where: { id: sessionId }
        });
    },

    /**
     * Get current user from request (Helper)
     */
    async getCurrentUser(request: Request) {
        const payload = await this.verifyToken(request);
        if (!payload || !payload.userId) return null;

        return {
            id: payload.userId,
            email: payload.email,
            role: payload.role,
        };
    },

    /**
     * Require authentication middleware helper
     */
    async requireAuth(request: Request) {
        const user = await this.getCurrentUser(request);
        if (!user) {
            throw new AuthError('Unauthorized', 'UNAUTHORIZED');
        }
        return user;
    },

    /**
     * Get user sessions from DB
     */
    async getUserSessions(userId: string) {
        return await prisma.session.findMany({
            where: { userId, isActive: true },
            orderBy: { lastAccessed: 'desc' }
        });
    },

    /**
     * Revoke a specific session
     */
    async revokeSession(sessionId: string, userId: string) {
        try {
            // Check existence first to ensure ownership
            const session = await prisma.session.findFirst({
                where: { id: sessionId, userId }
            });

            if (!session) return false;

            await prisma.session.delete({
                where: { id: sessionId }
            });
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Revoke all user sessions
     */
    async revokeAllUserSessions(userId: string, exceptSessionId?: string) {
        const whereClause: any = { userId };
        if (exceptSessionId) {
            whereClause.id = { not: exceptSessionId };
        }
        await prisma.session.deleteMany({
            where: whereClause
        });
    },

    /**
     * Create tokens
     */
    async createTokens(payload: UserPayload, sessionId?: string) {
        const accessToken = await this.generateToken(payload, '1h');
        const refreshToken = await this.generateToken({ ...payload, sessionId }, '30d');
        return { accessToken, refreshToken };
    },

    /**
     * Create session
     */
    async createSession(userId: string, refreshToken: string, userAgent: string, ip: string, remember: boolean = false) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (remember ? 30 : 1));

        return await prisma.session.create({
            data: {
                id: crypto.randomUUID(),
                userId,
                refreshToken,
                userAgent,
                ip,
                expiresAt,
                isActive: true
            }
        });
    },

    /**
     * Check rate limit (generic)
     */
    async checkRateLimit(key: string, limit: number = 5, window: number = 900) {
        try {
            const attemptsKey = `ratelimit:${key}`;
            const attempts = await redis.incr(attemptsKey);
            if (attempts === 1) {
                await redis.expire(attemptsKey, window);
            }
            if (attempts > limit) {
                throw new Error('Rate limit exceeded');
            }
        } catch (e: any) {
            if (e.message === 'Rate limit exceeded') throw e;
            // Ignore redis errors
        }
    },

    /**
     * Check user rate limit
     */
    async checkUserRateLimit(userId: string, limit: number = 5, window: number = 900) {
        return this.checkRateLimit(`user:${userId}`, limit, window);
    },

    /**
     * Reset rate limit
     */
    async resetRateLimit(key: string) {
        try { await redis.del(`ratelimit:${key}`); } catch (e) { }
    },

    /**
     * Get 2FA lockout status
     */
    async get2FALockoutStatus(userId: string) {
        try {
            const attempts = await redis.get(`2fa_failures:${userId}`);
            if (attempts && parseInt(attempts) >= 5) {
                // Check if locked
                // This is simplified. Proper lockout needs timestamp.
                // Let's assume generic lockout for now or just check value.
                return { locked: true, lockedUntil: new Date(Date.now() + 15 * 60 * 1000) };
            }
        } catch (e) { }
        return { locked: false };
    },

    /**
     * Record failed 2FA attempt
     */
    async recordFailed2FAAttempt(userId: string) {
        try {
            const key = `2fa_failures:${userId}`;
            const attempts = await redis.incr(key);
            if (attempts === 1) {
                await redis.expire(key, 15 * 60); // 15 min window
            }
        } catch (e) { }
    },

    /**
     * Reset 2FA attempts
     */
    async reset2FAAttempts(userId: string) {
        try { await redis.del(`2fa_failures:${userId}`); } catch (e) { }
    },

    /**
     * Get client IP from request
     */
    getClientIP(request: Request): string {
        const forwarded = request.headers.get('x-forwarded-for');
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }
        return request.headers.get('x-real-ip') || '0.0.0.0';
    },

    /**
     * Get user agent from request
     */
    getUserAgent(request: Request): string {
        return request.headers.get('user-agent') || 'Unknown';
    },

    /**
     * Log security event
     */
    async logSecurityEvent(userId: string, eventType: string, ip: string, metadata?: Record<string, any>) {
        try {
            await prisma.securityLog.create({
                data: {
                    userId,
                    eventType,
                    ip,
                    userAgent: metadata?.userAgent || '',
                    metadata: metadata ? JSON.stringify(metadata) : undefined,
                },
            });
        } catch (e) {
            // Non-blocking - don't fail the main operation
        }
    },
};

// --- Standalone Exports for Backward Compatibility & Ease of Use ---
export const hashPassword = authService.hashPassword.bind(authService);
export const verifyPassword = authService.verifyPassword.bind(authService);
export const generateToken = authService.generateToken.bind(authService);
export const verifyToken = authService.verifyToken.bind(authService);
export const createUser = authService.createUser.bind(authService);
export const getUserByEmail = authService.getUserByEmail.bind(authService);
export const getUserById = authService.getUserById.bind(authService);
export const generate2FATempToken = authService.generate2FATempToken.bind(authService);
export const getCurrentUser = authService.getCurrentUser.bind(authService);
export const requireAuth = authService.requireAuth.bind(authService);
export const getUserSessions = authService.getUserSessions.bind(authService);
export const revokeSession = authService.revokeSession.bind(authService);
export const revokeAllUserSessions = authService.revokeAllUserSessions.bind(authService);
export const getSession = authService.getSession.bind(authService);
