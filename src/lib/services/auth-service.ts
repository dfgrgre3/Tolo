import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { RegisterInput } from "@/lib/validations/auth";
import { redis } from "@/lib/redis";
import crypto from "crypto";
import { rateLimitingService } from "@/lib/services/rate-limiting-service";

import { getJWTSecret } from "@/lib/env-validation";

// --- Constants ---
const JWT_SECRET = new TextEncoder().encode(getJWTSecret());
const SALT_ROUNDS = 12;


// --- Interfaces ---
export interface UserPayload {
    userId: string;
    email: string;
    role: string;
    [key: string]: unknown;
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

export type DecodedToken = UserPayload;

export class AuthError extends Error {
    constructor(message: string, public code: string = 'AUTH_ERROR') {
        super(message);
        this.name = 'AuthError';
    }
}

export interface TokenVerificationResult {
    isValid: boolean;
    user?: UserPayload;
    sessionId?: string;
    error?: string;
}

// --- Standalone Functions (Exported directly to avoid binding issues) ---

/**
 * Hash a plain text password (Async)
 */
export async function hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hash
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
    return await bcrypt.compare(plain, hashed);
}

/**
 * Alias for verifyPassword to match legacy usages
 */
export async function comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return verifyPassword(plain, hashed);
}

/**
 * Generate a JWT token for a user
 */
export async function generateToken(payload: UserPayload, expiresIn: string = "7d"): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiresIn)
        .sign(JWT_SECRET);
}

/**
 * Generate a temporary token for 2FA or verification
 */
export async function generate2FATempToken(payload: any): Promise<string> {
    return await new SignJWT({ ...payload, type: '2fa_temp' })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("10m")
        .sign(JWT_SECRET);
}

/**
 * Extract token from request
 */
export function extractToken(request: Request | any): string | null {
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
}

/**
 * Verify and decode a JWT token.
 * Accepts either a token string or a Request object (extracts Bearer token).
 */
export async function verifyToken(input: string | Request): Promise<UserPayload | null> {
    let token: string | null = "";

    if (typeof input === 'string') {
        token = input;
    } else {
        token = extractToken(input);
    }

    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, JWT_SECRET);
        return payload as unknown as UserPayload;
    } catch (error) {
        // console.error("Token verification failed:", error); // Optional: log if needed
        return null;
    }
}

/**
 * Verify token and return detailed result
 */
export async function verifyTokenFromInput(token: string, checkSession: boolean = false): Promise<TokenVerificationResult> {
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
}

/**
 * Verify token from request (extracts token and verifies)
 * Accepts optional options for session checking
 */
export async function verifyTokenFromRequest(
    req: Request | any,
    options?: { checkSession?: boolean }
): Promise<TokenVerificationResult> {
    const token = extractToken(req);
    if (!token) {
        return { isValid: false, error: 'No token provided' };
    }
    return verifyTokenFromInput(token, options?.checkSession);
}

/**
 * Create a new user in the database
 */
export async function createUser(data: RegisterInput) {
    const hashedPassword = await hashPassword(data.password);

    return await prisma.user.create({
        data: {
            name: data.name,
            email: data.email,
            passwordHash: hashedPassword,
            role: "USER",
        },
        select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            createdAt: true,
        },
    });
}

/**
 * Find a user by email
 */
export async function getUserByEmail(email: string) {
    return await prisma.user.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            name: true,
            username: true,
            phone: true,
            passwordHash: true,
            role: true,
            avatar: true,
            emailVerified: true,
            twoFactorEnabled: true,
            lastLogin: true,
            createdAt: true,
            level: true,
            totalXP: true,
        },
    });
}

/**
 * Get user by ID
 */
export async function getUserById(id: string) {
    return await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            email: true,
            name: true,
            username: true,
            phone: true,
            role: true,
            avatar: true,
            emailVerified: true,
            twoFactorEnabled: true,
            lastLogin: true,
            createdAt: true,
            level: true,
            totalXP: true,
        },
    });
}

/**
 * Get session by ID
 */
export async function getSession(sessionId: string) {
    return await prisma.session.findUnique({
        where: { id: sessionId }
    });
}

/**
 * Get current user from request (Helper)
 */
export async function getCurrentUser(request: Request) {
    const payload = await verifyToken(request);
    if (!payload || !payload.userId) return null;

    return {
        id: payload.userId,
        email: payload.email,
        role: payload.role,
    };
}

/**
 * Require authentication middleware helper
 */
export async function requireAuth(request: Request) {
    const user = await getCurrentUser(request);
    if (!user) {
        throw new AuthError('Unauthorized', 'UNAUTHORIZED');
    }
    return user;
}

/**
 * Get user sessions from DB
 */
export async function getUserSessions(userId: string) {
    return await prisma.session.findMany({
        where: { userId, isActive: true },
        orderBy: { lastAccessed: 'desc' }
    });
}

/**
 * Revoke a specific session
 */
export async function revokeSession(sessionId: string, userId: string) {
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
}

/**
 * Revoke all user sessions
 */
export async function revokeAllUserSessions(userId: string, exceptSessionId?: string) {
    const whereClause: any = { userId };
    if (exceptSessionId) {
        whereClause.id = { not: exceptSessionId };
    }
    await prisma.session.deleteMany({
        where: whereClause
    });
}

/**
 * Create tokens
 */
export async function createTokens(payload: UserPayload, sessionId?: string) {
    const accessToken = await generateToken(payload, '1h');
    const refreshToken = await generateToken({ ...payload, sessionId }, '30d');
    return { accessToken, refreshToken };
}

/**
 * Create session
 */
export async function createSession(userId: string, refreshToken: string, userAgent: string, ip: string, remember: boolean = false) {
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
}

/**
 * Check rate limit (generic)
 */
export async function checkRateLimit(key: string, limit: number = 5, window: number = 900) {
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
}

/**
 * Check user rate limit
 */
export async function checkUserRateLimit(userId: string, limit: number = 5, window: number = 900) {
    return checkRateLimit(`user:${userId}`, limit, window);
}

/**
 * Reset rate limit
 */
export async function resetRateLimit(key: string) {
    try { await redis.del(`ratelimit:${key}`); } catch (e) { }
}

/**
 * Get 2FA lockout status
 */
export async function get2FALockoutStatus(userId: string) {
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
}

/**
 * Record failed 2FA attempt
 */
export async function recordFailed2FAAttempt(userId: string) {
    try {
        const key = `2fa_failures:${userId}`;
        const attempts = await redis.incr(key);
        if (attempts === 1) {
            await redis.expire(key, 15 * 60); // 15 min window
        }
    } catch (e) { }
}

/**
 * Reset 2FA attempts
 */
export async function reset2FAAttempts(userId: string) {
    try { await redis.del(`2fa_failures:${userId}`); } catch (e) { }
}

/**
 * Get client IP from request
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || '0.0.0.0';
}

/**
 * Get user agent from request
 */
export function getUserAgent(request: Request): string {
    return request.headers.get('user-agent') || 'Unknown';
}

/**
 * Log security event
 */
export async function logSecurityEvent(userId: string, eventType: string, ip: string, metadata?: Record<string, any>) {
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
}

/**
 * Get remaining recovery codes count for a user
 */
export async function getRemainingRecoveryCodesCount(userId: string): Promise<number> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { recoveryCodes: true },
        });
        if (!user?.recoveryCodes) return 0;
        const codes = JSON.parse(user.recoveryCodes) as string[];
        return codes.length;
    } catch {
        return 0;
    }
}

/**
 * Regenerate recovery codes for a user
 */
export async function regenerateRecoveryCodes(userId: string, count: number = 10): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
        const code = crypto.randomBytes(5).toString('hex').toUpperCase();
        codes.push(code);
    }
    const hashedCodes = await Promise.all(
        codes.map((code) => hashPassword(code))
    );
    await prisma.user.update({
        where: { id: userId },
        data: { recoveryCodes: JSON.stringify(hashedCodes) },
    });
    return codes;
}

/**
 * Update last login timestamp for a user
 */
export async function updateLastLogin(userId: string): Promise<void> {
    await prisma.user.update({
        where: { id: userId },
        data: { lastLogin: new Date() },
    });
}

/**
 * Record a failed attempt
 */
export async function recordFailedAttempt(identifier: string) {
    await rateLimitingService.recordFailedAttempt(identifier);
}

/**
 * Verify email address
 */
export async function verifyEmail(token: string, ip: string, userAgent: string): Promise<void> {
    const user = await prisma.user.findFirst({
        where: {
            emailVerificationToken: token,
            emailVerificationExpires: { gt: new Date() }
        },
        select: { id: true }
    });

    if (!user) {
        throw new AuthError('Invalid or expired verification token');
    }

    await prisma.user.update({
        where: { id: user.id },
        data: {
            emailVerified: true,
            emailVerificationToken: null,
            emailVerificationExpires: null
        }
    });

    await logSecurityEvent(user.id, 'email_verified', ip, { userAgent });
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
    try {
        // Verify token signature first
        // Note: jwtVerify throws if signature invalid or expired
        const { payload } = await jwtVerify(refreshToken, JWT_SECRET);

        // Check if it's a refresh token by checking sessionId (or type)
        const sessionId = payload.sessionId as string;
        if (!sessionId) {
            // If no session ID, maybe it's an old token or malicious
            // But for now, we require session based auth for refresh
            throw new Error('Invalid token payload: missing sessionId');
        }

        const session = await prisma.session.findUnique({
            where: { id: sessionId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        role: true,
                    }
                }
            }
        });

        if (!session || session.refreshToken !== refreshToken) {
            // Potential reuse! Revoke all
            if (session) {
                await revokeAllUserSessions(session.userId);
            }
            throw new Error('Invalid session or token reuse detected');
        }

        if (session.expiresAt < new Date()) {
            await revokeSession(sessionId, session.userId);
            throw new Error('Session expired');
        }

        // Generate new tokens
        const user = session.user;
        const userPayload: UserPayload = {
            userId: user.id,
            email: user.email,
            role: user.role || 'USER',
            name: user.name || undefined
        };

        // Create new pair
        const tokens = await createTokens(userPayload, sessionId);

        // Update session with new refresh token (Rotation)
        await prisma.session.update({
            where: { id: sessionId },
            data: { refreshToken: tokens.refreshToken }
        });

        return {
            tokens,
            user: userPayload
        };

    } catch (error) {
        // logger.error('Token refresh failed', error);
        throw new Error('Token refresh failed');
    }
}

// --- Auth Service Object (For backward compatibility and grouping) ---
// Export singleton instance matching the AuthService type
// Moved to end of file


// --- AuthService Class (For static access requirements) ---
export class AuthService {
    // Instance methods (delegates)
    hashPassword = hashPassword;
    verifyPassword = verifyPassword;
    comparePasswords = comparePasswords;
    generateToken = generateToken;
    generate2FATempToken = generate2FATempToken;
    extractToken = extractToken;
    verifyToken = verifyToken;
    verifyTokenFromInput = verifyTokenFromInput;
    verifyTokenFromRequest = verifyTokenFromRequest;
    createUser = createUser;
    getUserByEmail = getUserByEmail;
    getUserById = getUserById;
    getSession = getSession;
    getCurrentUser = getCurrentUser;
    requireAuth = requireAuth;
    getUserSessions = getUserSessions;
    revokeSession = revokeSession;
    revokeAllUserSessions = revokeAllUserSessions;
    createTokens = createTokens;
    createSession = createSession;
    checkRateLimit = checkRateLimit;
    checkUserRateLimit = checkUserRateLimit;
    resetRateLimit = resetRateLimit;
    get2FALockoutStatus = get2FALockoutStatus;
    recordFailed2FAAttempt = recordFailed2FAAttempt;
    reset2FAAttempts = reset2FAAttempts;
    getClientIP = getClientIP;
    getUserAgent = getUserAgent;
    logSecurityEvent = logSecurityEvent;
    getRemainingRecoveryCodesCount = getRemainingRecoveryCodesCount;
    regenerateRecoveryCodes = regenerateRecoveryCodes;
    updateLastLogin = updateLastLogin;
    recordFailedAttempt = recordFailedAttempt;
    verifyEmail = verifyEmail;
    refreshAccessToken = refreshAccessToken;

    // Static methods (delegates)
    static hashPassword = hashPassword;
    static verifyPassword = verifyPassword;
    static comparePasswords = comparePasswords;
    static generateToken = generateToken;
    static generate2FATempToken = generate2FATempToken;
    static extractToken = extractToken;
    static verifyToken = verifyToken;
    static verifyTokenFromInput = verifyTokenFromInput;
    static verifyTokenFromRequest = verifyTokenFromRequest;
    static createUser = createUser;
    static getUserByEmail = getUserByEmail;
    static getUserById = getUserById;
    static getSession = getSession;
    static getCurrentUser = getCurrentUser;
    static requireAuth = requireAuth;
    static getUserSessions = getUserSessions;
    static revokeSession = revokeSession;
    static revokeAllUserSessions = revokeAllUserSessions;
    static createTokens = createTokens;
    static createSession = createSession;
    static checkRateLimit = checkRateLimit;
    static checkUserRateLimit = checkUserRateLimit;
    static resetRateLimit = resetRateLimit;
    static get2FALockoutStatus = get2FALockoutStatus;
    static recordFailed2FAAttempt = recordFailed2FAAttempt;
    static reset2FAAttempts = reset2FAAttempts;
    static getClientIP = getClientIP;
    static getUserAgent = getUserAgent;
    static logSecurityEvent = logSecurityEvent;
    static getRemainingRecoveryCodesCount = getRemainingRecoveryCodesCount;
    static regenerateRecoveryCodes = regenerateRecoveryCodes;
    static updateLastLogin = updateLastLogin;
    static recordFailedAttempt = recordFailedAttempt;
    static verifyEmail = verifyEmail;
    static refreshAccessToken = refreshAccessToken;

    // Singleton instance helper if needed
    private static instance: AuthService;
    public static getInstance(): AuthService {
        if (!AuthService.instance) {
            AuthService.instance = new AuthService();
        }
        return AuthService.instance;
    }
}

// Export singleton instance matching the AuthService type
export const authService = AuthService.getInstance();
